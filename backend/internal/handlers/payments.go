package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/skinyanju/nyumbadirect/internal/auth"
	"github.com/skinyanju/nyumbadirect/internal/database"
	"github.com/skinyanju/nyumbadirect/internal/models"
	"github.com/skinyanju/nyumbadirect/internal/payments"
)

type PaymentHandler struct {
	db       *database.DB
	provider payments.PaymentProvider
	baseURL  string
}

func NewPaymentHandler(db *database.DB, provider payments.PaymentProvider) *PaymentHandler {
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	return &PaymentHandler{db: db, provider: provider, baseURL: baseURL}
}

func (h *PaymentHandler) InitiateListingPayment(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	propIDStr := chi.URLParam(r, "id")
	propID, err := strconv.ParseInt(propIDStr, 10, 64)
	if err != nil {
		writeError(w, "invalid property id", http.StatusBadRequest)
		return
	}

	prop, err := h.db.GetProperty(propID)
	if err != nil {
		writeError(w, "property not found", http.StatusNotFound)
		return
	}
	if prop.ActiveStatus != models.StatusPending && prop.ActiveStatus != models.StatusActive {
		writeError(w, "property is not available for activation", http.StatusBadRequest)
		return
	}

	user, err := h.db.GetUser(userID)
	if err != nil {
		writeError(w, "user not found", http.StatusNotFound)
		return
	}

	amount := 299.0
	ref := fmt.Sprintf("LIST-%d", propID)

	sub, err := h.db.CreateSubscription(userID, &propID, "listing", user.Phone, amount)
	if err != nil {
		writeError(w, "failed to create subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	cbURL := fmt.Sprintf("%s/api/v1/payments/mpesa/callback", h.baseURL)
	resp, err := h.provider.STKPush(r.Context(), &payments.PaymentRequest{
		Phone:       user.Phone,
		Amount:      amount,
		AccountRef:  ref,
		Description: "NyumbaDirect - Listing Activation",
		CallbackURL: cbURL,
	})
	if err != nil {
		h.db.UpdateSubscriptionStatus(sub.ID, models.SubFailed)
		writeError(w, "payment request failed: "+err.Error(), http.StatusBadGateway)
		return
	}

	if resp.CheckoutRequestID != "" {
		h.db.UpdateSubscriptionCheckoutID(sub.ID, resp.CheckoutRequestID)
	}

	if strings.HasPrefix(resp.CheckoutRequestID, "MOCK-") {
		h.db.UpdateSubscriptionSuccess(sub.ID, resp.CheckoutRequestID, "MOCK"+strings.TrimPrefix(resp.CheckoutRequestID, "MOCK-"))
		if sub.Type == "listing" && sub.PropertyID != nil {
			h.db.UpdatePropertyStatus(*sub.PropertyID, models.StatusActive)
		}
	}

	writeJSON(w, http.StatusOK, models.MpesaSTKPushResponse{
		CheckoutRequestID: resp.CheckoutRequestID,
		ResponseCode:      resp.ResponseCode,
		ResponseDesc:      resp.ResponseDesc,
	})
}

func (h *PaymentHandler) InitiateUnlockPayment(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	propIDStr := chi.URLParam(r, "id")
	propID, err := strconv.ParseInt(propIDStr, 10, 64)
	if err != nil {
		writeError(w, "invalid property id", http.StatusBadRequest)
		return
	}

	prop, err := h.db.GetProperty(propID)
	if err != nil {
		writeError(w, "property not found", http.StatusNotFound)
		return
	}
	if prop.ActiveStatus != models.StatusActive && prop.ActiveStatus != models.StatusPending {
		writeError(w, "property is not available", http.StatusBadRequest)
		return
	}

	user, err := h.db.GetUser(userID)
	if err != nil {
		writeError(w, "user not found", http.StatusNotFound)
		return
	}

	amount := 99.0
	ref := fmt.Sprintf("UNLK-%d-%d", userID, propID)

	sub, err := h.db.CreateSubscription(userID, &propID, "unlock", user.Phone, amount)
	if err != nil {
		writeError(w, "failed to create subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	cbURL := fmt.Sprintf("%s/api/v1/payments/mpesa/callback", h.baseURL)
	resp, err := h.provider.STKPush(r.Context(), &payments.PaymentRequest{
		Phone:       user.Phone,
		Amount:      amount,
		AccountRef:  ref,
		Description: "NyumbaDirect - Contact Unlock",
		CallbackURL: cbURL,
	})
	if err != nil {
		h.db.UpdateSubscriptionStatus(sub.ID, models.SubFailed)
		writeError(w, "payment request failed: "+err.Error(), http.StatusBadGateway)
		return
	}

	if resp.CheckoutRequestID != "" {
		h.db.UpdateSubscriptionCheckoutID(sub.ID, resp.CheckoutRequestID)
	}

	if strings.HasPrefix(resp.CheckoutRequestID, "MOCK-") {
		h.db.UpdateSubscriptionSuccess(sub.ID, resp.CheckoutRequestID, "MOCK"+strings.TrimPrefix(resp.CheckoutRequestID, "MOCK-"))
	}

	writeJSON(w, http.StatusOK, models.MpesaSTKPushResponse{
		CheckoutRequestID: resp.CheckoutRequestID,
		ResponseCode:      resp.ResponseCode,
		ResponseDesc:      resp.ResponseDesc,
	})
}

func (h *PaymentHandler) MpesaCallback(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("callback read error: %v", err)
		writeError(w, "read error", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	result, err := h.provider.ProcessCallback(body)
	if err != nil {
		log.Printf("callback process error: %v", err)
		writeError(w, "processing error", http.StatusBadRequest)
		return
	}

	log.Printf("M-Pesa callback processed: code=%d receipt=%s", result.ResultCode, result.ReceiptNumber)

	if !result.Success {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "failed"})
		return
	}

	sub, err := h.db.GetSubscriptionByCheckoutID(result.CheckoutRequestID)
	if err != nil {
		log.Printf("subscription not found for checkout: %s", result.CheckoutRequestID)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "not_found"})
		return
	}

	if err := h.db.UpdateSubscriptionSuccess(sub.ID, result.CheckoutRequestID, result.ReceiptNumber); err != nil {
		log.Printf("failed to update subscription %d: %v", sub.ID, err)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "update_failed"})
		return
	}

	if sub.Type == "listing" && sub.PropertyID != nil {
		if err := h.db.UpdatePropertyStatus(*sub.PropertyID, models.StatusActive); err != nil {
			log.Printf("failed to activate property %d: %v", *sub.PropertyID, err)
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":       "success",
		"receipt":      result.ReceiptNumber,
	})
}

func (h *PaymentHandler) CheckSubscriptionStatus(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r)
	subType := r.URL.Query().Get("type")
	if subType == "" {
		subType = "unlock"
	}

	sub, _ := h.db.GetUserSubscription(userID, subType)
	if sub == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"active": false,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"active": true,
		"subscription": sub,
	})
}
