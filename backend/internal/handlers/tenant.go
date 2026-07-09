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

func (h *TenantHandler) UnlockedIDs(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	rows, err := h.db.Query("SELECT property_id FROM contact_unlocks WHERE tenant_id = ?", userID)
	if err != nil {
		writeJSON(w, http.StatusOK, []int64{})
		return
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	if ids == nil {
		ids = []int64{}
	}
	writeJSON(w, http.StatusOK, ids)
}
