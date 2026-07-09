package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"github.com/skinyanju/nyumbadirect/internal/auth"
	"github.com/skinyanju/nyumbadirect/internal/database"
	"github.com/skinyanju/nyumbadirect/internal/handlers"
	"github.com/skinyanju/nyumbadirect/internal/payments"
)

func main() {
	godotenv.Load(".env")

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./nyumbadirect.db"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "change-me-in-production-nyumbadirect-2024"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	db, err := database.New(dbPath)
	if err != nil {
		log.Fatalf("database initialization failed: %v", err)
	}
	log.Println("database initialized successfully")

	jwtManager := auth.NewJWTManager(jwtSecret, 72*time.Hour)

	darajaCfg := &payments.DarajaConfig{
		ConsumerKey:    os.Getenv("DARAJA_CONSUMER_KEY"),
		ConsumerSecret: os.Getenv("DARAJA_CONSUMER_SECRET"),
		Passkey:        os.Getenv("DARAJA_PASSKEY"),
		Shortcode:      os.Getenv("DARAJA_SHORTCODE"),
		Env:            os.Getenv("DARAJA_ENV"),
	}
	if darajaCfg.ConsumerKey == "" {
		darajaCfg.ConsumerKey = "test-consumer-key"
		darajaCfg.ConsumerSecret = "test-consumer-secret"
		darajaCfg.Passkey = "test-passkey"
		darajaCfg.Shortcode = "174379"
		darajaCfg.Env = "sandbox"
		log.Println("WARNING: using M-Pesa sandbox default credentials")
	}

	paymentProvider := payments.NewDarajaClient(darajaCfg)

	authHandler := handlers.NewAuthHandler(db, jwtManager)
	propHandler := handlers.NewPropertyHandler(db)
	paymentHandler := handlers.NewPaymentHandler(db, paymentProvider)
	analyticsHandler := handlers.NewAnalyticsHandler(db)
	tenantHandler := handlers.NewTenantHandler(db)
	landlordHandler := handlers.NewLandlordHandler(db)
	uploadHandler := handlers.NewUploadHandler(db)

	r := chi.NewRouter()

	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RealIP)
	r.Use(chimw.Timeout(30 * time.Second))
	frontendURL := os.Getenv("FRONTEND_URL")
	allowedOrigins := []string{"http://localhost:5173", "http://localhost:3000"}
	if frontendURL != "" {
		allowedOrigins = append(allowedOrigins, frontendURL)
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	authMw := auth.AuthMiddleware(jwtManager)
	landlordMw := auth.RoleMiddleware("landlord")
	tenantMw := auth.RoleMiddleware("tenant")

	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)

			r.Group(func(r chi.Router) {
				r.Use(authMw)
				r.Get("/me", authHandler.Me)
			})
		})

		r.Route("/properties", func(r chi.Router) {
			r.Get("/", propHandler.List)
			r.Get("/{id}", propHandler.Get)

			r.Group(func(r chi.Router) {
				r.Use(authMw)

				r.Group(func(r chi.Router) {
					r.Use(landlordMw)
					r.Post("/", propHandler.Create)
					r.Get("/my/listings", propHandler.MyListings)
				})
				r.Get("/{id}/repair-rates", propHandler.GetRepairRates)
				r.Get("/{id}/traffic", propHandler.GetTrafficStats)
				r.Group(func(r chi.Router) {
					r.Use(tenantMw)
					r.Post("/{id}/unlock", propHandler.UnlockContact)
					r.Post("/{id}/review", propHandler.SubmitReview)
				})
			})
		})

		r.Route("/payments", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(authMw)
				r.Group(func(r chi.Router) {
					r.Use(landlordMw)
					r.Post("/listing/{id}/pay", paymentHandler.InitiateListingPayment)
				})
				r.Group(func(r chi.Router) {
					r.Use(tenantMw)
					r.Post("/unlock/{id}/pay", paymentHandler.InitiateUnlockPayment)
				})
				r.Get("/subscription/status", paymentHandler.CheckSubscriptionStatus)
			})

			r.Post("/mpesa/callback", paymentHandler.MpesaCallback)
		})

		r.Route("/tenant", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(authMw, tenantMw)
				r.Get("/profile", tenantHandler.Profile)
			})
		})

		r.Route("/landlord", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(authMw, landlordMw)
				r.Get("/profile", landlordHandler.Profile)
			})
		})

		r.With(authMw).Post("/upload/profile-picture", uploadHandler.ProfilePicture)
		r.With(authMw, landlordMw).Post("/properties/{id}/media", uploadHandler.PropertyMedia)

		r.Route("/analytics", func(r chi.Router) {
			r.Route("/fairness/{id}", func(r chi.Router) {
				r.Get("/", analyticsHandler.GetFairnessMetrics)
			})
			r.With(authMw, landlordMw).Post("/cache/clear", analyticsHandler.ClearCache)
		})
	})

	log.Printf("NyumbaDirect server starting on :%s", port)
	log.Printf("API base: http://localhost:%s/api/v1", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
