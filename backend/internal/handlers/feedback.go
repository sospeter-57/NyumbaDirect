package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/skinyanju/nyumbadirect/internal/auth"
	"github.com/skinyanju/nyumbadirect/internal/database"
	"github.com/skinyanju/nyumbadirect/internal/models"
)

type FeedbackHandler struct {
	db *database.DB
}

func NewFeedbackHandler(db *database.DB) *FeedbackHandler {
	return &FeedbackHandler{db: db}
}

func (h *FeedbackHandler) Submit(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)

	var req models.FeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		writeError(w, "message is required", http.StatusBadRequest)
		return
	}

	if err := h.db.CreateFeedback(userID, req.Message); err != nil {
		writeError(w, "failed to save feedback", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

func (h *FeedbackHandler) List(w http.ResponseWriter, r *http.Request) {
	feedback, err := h.db.GetFeedback()
	if err != nil {
		writeError(w, "failed to fetch feedback", http.StatusInternalServerError)
		return
	}
	if feedback == nil {
		feedback = []map[string]interface{}{}
	}
	writeJSON(w, http.StatusOK, feedback)
}

func (h *FeedbackHandler) Stats(w http.ResponseWriter, r *http.Request) {
	props, landlords, unlocks, err := h.db.GetStats()
	if err != nil {
		writeError(w, "failed to fetch stats", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"active_properties": props,
		"landlords":         landlords,
		"contact_unlocks":   unlocks,
	})
}
