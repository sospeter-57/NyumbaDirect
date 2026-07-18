package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/skinyanju/nyumbadirect/internal/auth"
	"github.com/skinyanju/nyumbadirect/internal/database"
	"github.com/skinyanju/nyumbadirect/internal/models"
)

type LandlordHandler struct {
	db *database.DB
}

func NewLandlordHandler(db *database.DB) *LandlordHandler {
	return &LandlordHandler{db: db}
}

func (h *LandlordHandler) Profile(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)

	user, err := h.db.GetUser(userID)
	if err != nil {
		writeError(w, "user not found", http.StatusNotFound)
		return
	}

	props, err := h.db.GetLandlordProperties(userID)
	if err != nil {
		writeError(w, "failed to fetch properties", http.StatusInternalServerError)
		return
	}
	if props == nil {
		props = []*models.Property{}
	}

	avg, count, _ := h.db.GetLandlordRatingAverage(userID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user":            user,
		"properties":      props,
		"rating_average":  avg,
		"rating_count":    count,
	})
}

func (h *LandlordHandler) Rate(w http.ResponseWriter, r *http.Request) {
	tenantID := auth.GetUserID(r)
	landlordID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, "invalid landlord id", http.StatusBadRequest)
		return
	}

	var req struct {
		Rating  int    `json:"rating"`
		Comment string `json:"comment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		writeError(w, "rating must be between 1 and 5", http.StatusBadRequest)
		return
	}

	hasRated, _ := h.db.HasRatedLandlord(tenantID, landlordID)
	if hasRated {
		writeError(w, "you have already rated this landlord", http.StatusConflict)
		return
	}

	if err := h.db.CreateLandlordRating(tenantID, landlordID, req.Rating, req.Comment); err != nil {
		writeError(w, "failed to save rating", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"status": "submitted"})
}

func (h *LandlordHandler) Ratings(w http.ResponseWriter, r *http.Request) {
	landlordID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, "invalid landlord id", http.StatusBadRequest)
		return
	}

	ratings, err := h.db.GetLandlordRatings(landlordID)
	if err != nil {
		writeError(w, "failed to fetch ratings", http.StatusInternalServerError)
		return
	}
	if ratings == nil {
		ratings = []map[string]interface{}{}
	}

	avg, count, _ := h.db.GetLandlordRatingAverage(landlordID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ratings":        ratings,
		"rating_average": avg,
		"rating_count":   count,
	})
}
