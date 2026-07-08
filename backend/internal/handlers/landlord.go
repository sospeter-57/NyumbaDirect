package handlers

import (
	"net/http"

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

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user":       user,
		"properties": props,
	})
}
