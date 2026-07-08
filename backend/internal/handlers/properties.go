package handlers

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/skinyanju/nyumbadirect/internal/auth"
	"github.com/skinyanju/nyumbadirect/internal/database"
	"github.com/skinyanju/nyumbadirect/internal/models"
)

type PropertyHandler struct {
	db *database.DB
}

func NewPropertyHandler(db *database.DB) *PropertyHandler {
	return &PropertyHandler{db: db}
}

func (h *PropertyHandler) Create(w http.ResponseWriter, r *http.Request) {
	landlordID := auth.GetUserID(r)

	var req models.ListingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	validTypes := map[models.HouseType]bool{
		models.HouseSingle: true, models.HouseBedsitter: true,
		models.House1Bed: true, models.House2Bed: true,
		models.House3Bed: true, models.HouseMansion: true,
	}
	if !validTypes[req.HouseType] {
		writeError(w, "invalid house type", http.StatusBadRequest)
		return
	}
	if req.Rent <= 0 {
		writeError(w, "rent must be positive", http.StatusBadRequest)
		return
	}
	if req.Latitude < -90 || req.Latitude > 90 || req.Longitude < -180 || req.Longitude > 180 {
		writeError(w, "invalid coordinates", http.StatusBadRequest)
		return
	}

	prop, err := h.db.CreateProperty(landlordID, &req)
	if err != nil {
		writeError(w, "failed to create property: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, prop)
}

func (h *PropertyHandler) List(w http.ResponseWriter, r *http.Request) {
	north := parseFloat(r.URL.Query().Get("north"), 90)
	south := parseFloat(r.URL.Query().Get("south"), -90)
	east := parseFloat(r.URL.Query().Get("east"), 180)
	west := parseFloat(r.URL.Query().Get("west"), -180)

	props, err := h.db.ListPropertiesInBounds(north, south, east, west, models.StatusActive, models.StatusPending)
	if err != nil {
		writeError(w, "failed to fetch properties", http.StatusInternalServerError)
		return
	}
	if props == nil {
		props = []*models.Property{}
	}
	writeJSON(w, http.StatusOK, props)
}

func (h *PropertyHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, "invalid property id", http.StatusBadRequest)
		return
	}

	prop, err := h.db.GetProperty(id)
	if err != nil {
		writeError(w, "property not found", http.StatusNotFound)
		return
	}

	rates, _ := h.db.GetRepairRates(id)
	reviews, _ := h.db.GetPropertyReviews(id)
	photos, _ := h.db.GetPropertyPhotos(id)

	resp := map[string]interface{}{
		"property":    prop,
		"repair_rates": rates,
		"reviews":     reviews,
		"photos":      photos,
	}
	if rates == nil {
		resp["repair_rates"] = []*models.RepairRate{}
	}
	if reviews == nil {
		resp["reviews"] = []*models.PropertyReview{}
	}
	if photos == nil {
		resp["photos"] = []models.PropertyPhoto{}
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *PropertyHandler) MyListings(w http.ResponseWriter, r *http.Request) {
	landlordID := auth.GetUserID(r)
	props, err := h.db.GetLandlordProperties(landlordID)
	if err != nil {
		writeError(w, "failed to fetch listings", http.StatusInternalServerError)
		return
	}
	if props == nil {
		props = []*models.Property{}
	}

	var result []map[string]interface{}
	for _, p := range props {
		rates, _ := h.db.GetRepairRates(p.ID)
		stats, _ := h.db.GetTrafficStats(p.ID)
		item := map[string]interface{}{
			"property":     p,
			"repair_rates": rates,
			"traffic":      stats,
		}
		if rates == nil {
			item["repair_rates"] = []*models.RepairRate{}
		}
		result = append(result, item)
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *PropertyHandler) GetRepairRates(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, "invalid property id", http.StatusBadRequest)
		return
	}

	rates, err := h.db.GetRepairRates(id)
	if err != nil {
		writeError(w, "failed to fetch repair rates", http.StatusInternalServerError)
		return
	}
	if rates == nil {
		rates = []*models.RepairRate{}
	}
	writeJSON(w, http.StatusOK, rates)
}

func (h *PropertyHandler) UnlockContact(w http.ResponseWriter, r *http.Request) {
	tenantID := auth.GetUserID(r)
	propID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, "invalid property id", http.StatusBadRequest)
		return
	}

	prop, err := h.db.GetProperty(propID)
	if err != nil || prop.ActiveStatus != models.StatusActive {
		writeError(w, "property not found or not active", http.StatusNotFound)
		return
	}

	unlocked, _ := h.db.HasUnlockedProperty(tenantID, propID)
	if unlocked {
		landlord, err := h.db.GetLandlordByPropertyID(propID)
		if err != nil {
			writeError(w, "landlord not found", http.StatusInternalServerError)
			return
		}
		waLink := fmt.Sprintf("https://wa.me/%s?text=%s",
			strings.TrimPrefix(landlord.Phone, "+"),
			"Hi, I'm interested in your property listed on NyumbaDirect.",
		)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"phone":       landlord.Phone,
			"whatsapp_link": waLink,
		})
		return
	}

	sub, _ := h.db.GetUserSubscription(tenantID, "unlock")
	if sub == nil {
		writeError(w, "active unlock subscription required", http.StatusPaymentRequired)
		return
	}

	unlock, err := h.db.CreateContactUnlock(tenantID, propID)
	if err != nil {
		writeError(w, "failed to log unlock", http.StatusInternalServerError)
		return
	}

	landlord, err := h.db.GetLandlordByPropertyID(propID)
	if err != nil {
		writeError(w, "landlord not found", http.StatusInternalServerError)
		return
	}

	waLink := fmt.Sprintf("https://wa.me/%s?text=%s",
		strings.TrimPrefix(landlord.Phone, "+"),
		"Hi, I'm interested in your property listed on NyumbaDirect.",
	)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"unlock":       unlock,
		"phone":        landlord.Phone,
		"whatsapp_link": waLink,
	})
}

func (h *PropertyHandler) GetTrafficStats(w http.ResponseWriter, r *http.Request) {
	propID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, "invalid property id", http.StatusBadRequest)
		return
	}
	stats, err := h.db.GetTrafficStats(propID)
	if err != nil {
		writeError(w, "failed to fetch stats", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h *PropertyHandler) SubmitReview(w http.ResponseWriter, r *http.Request) {
	tenantID := auth.GetUserID(r)
	propID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, "invalid property id", http.StatusBadRequest)
		return
	}

	var req struct {
		IsFraud    bool   `json:"is_fraud"`
		IsOccupied bool   `json:"is_occupied"`
		ExtraFees  bool   `json:"extra_fees"`
		Comments   string `json:"comments"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	review := &models.PropertyReview{
		TenantID:   tenantID,
		PropertyID: propID,
		IsFraud:    req.IsFraud,
		IsOccupied: req.IsOccupied,
		ExtraFees:  req.ExtraFees,
		Comments:   req.Comments,
	}

	if err := h.db.CreateReview(review); err != nil {
		writeError(w, "failed to submit review", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"status": "submitted"})
}

func parseFloat(s string, def float64) float64 {
	if s == "" {
		return def
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return def
	}
	return f
}

func HaversineDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}
