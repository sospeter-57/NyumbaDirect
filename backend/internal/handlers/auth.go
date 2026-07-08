package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"github.com/skinyanju/nyumbadirect/internal/auth"
	"github.com/skinyanju/nyumbadirect/internal/database"
	"github.com/skinyanju/nyumbadirect/internal/models"
)

type AuthHandler struct {
	db    *database.DB
	jwt   *auth.JWTManager
}

func NewAuthHandler(db *database.DB, jwt *auth.JWTManager) *AuthHandler {
	return &AuthHandler{db: db, jwt: jwt}
}

var kenyanPhoneRegex = regexp.MustCompile(`^\+254[17]\d{8}$`)

func validateKenyanPhone(phone string) error {
	if !kenyanPhoneRegex.MatchString(phone) {
		return errors.New("phone must be in format +254XXXXXXXXX")
	}
	return nil
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req.Phone = strings.TrimSpace(req.Phone)
	if err := validateKenyanPhone(req.Phone); err != nil {
		writeError(w, err.Error(), http.StatusBadRequest)
		return
	}

	if len(req.Password) < 6 {
		writeError(w, "password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	existing, _ := h.db.GetUserByPhone(req.Phone)
	if existing != nil {
		writeError(w, "phone number already registered", http.StatusConflict)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, "failed to hash password", http.StatusInternalServerError)
		return
	}

	role := models.RoleTenant
	if r.URL.Query().Get("role") == "landlord" {
		role = models.RoleLandlord
	}

	user, err := h.db.CreateUser(req.Phone, string(hash), role, req.Name, req.BusinessName)
	if err != nil {
		writeError(w, "failed to create user", http.StatusInternalServerError)
		return
	}

	token, err := h.jwt.Generate(user.ID, user.Phone, string(user.Role))
	if err != nil {
		writeError(w, "failed to generate token", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, models.AuthResponse{Token: token, User: *user})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req.Phone = strings.TrimSpace(req.Phone)
	user, err := h.db.GetUserByPhone(req.Phone)
	if err != nil {
		writeError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		writeError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := h.jwt.Generate(user.ID, user.Phone, string(user.Role))
	if err != nil {
		writeError(w, "failed to generate token", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, models.AuthResponse{Token: token, User: *user})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	user, err := h.db.GetUser(userID)
	if err != nil {
		writeError(w, "user not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, user)
}
