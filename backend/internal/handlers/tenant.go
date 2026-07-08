package handlers

import (
	"net/http"

	"github.com/skinyanju/nyumbadirect/internal/auth"
	"github.com/skinyanju/nyumbadirect/internal/database"
)

type TenantHandler struct {
	db *database.DB
}

func NewTenantHandler(db *database.DB) *TenantHandler {
	return &TenantHandler{db: db}
}

func (h *TenantHandler) Profile(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)

	user, err := h.db.GetUser(userID)
	if err != nil {
		writeError(w, "user not found", http.StatusNotFound)
		return
	}

	unlocks, _ := h.db.GetTenantUnlocks(userID)
	reviews, _ := h.db.GetTenantReviews(userID)

	if unlocks == nil {
		unlocks = []map[string]interface{}{}
	}
	if reviews == nil {
		reviews = []map[string]interface{}{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user":    user,
		"unlocks": unlocks,
		"reviews": reviews,
	})
}
