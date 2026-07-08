package payments

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/skinyanju/nyumbadirect/internal/models"
)

func (d *darajaClient) isDev() bool {
	return strings.HasPrefix(d.config.ConsumerKey, "test-")
}

type DarajaConfig struct {
	ConsumerKey    string
	ConsumerSecret string
	Passkey        string
	Shortcode      string
	Env            string
}

type darajaClient struct {
	config     *DarajaConfig
	httpClient *http.Client
	token      string
	tokenExp   time.Time
}

func NewDarajaClient(cfg *DarajaConfig) PaymentProvider {
	return &darajaClient{
		config:     cfg,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (d *darajaClient) getOAuthToken(ctx context.Context) (string, error) {
	if d.token != "" && time.Now().Before(d.tokenExp) {
		return d.token, nil
	}

	baseURL := "https://sandbox.safaricom.co.ke"
	if d.config.Env == "production" {
		baseURL = "https://api.safaricom.co.ke"
	}

	req, _ := http.NewRequestWithContext(ctx, "GET", baseURL+"/oauth/v1/generate?grant_type=client_credentials", nil)
	req.SetBasicAuth(d.config.ConsumerKey, d.config.ConsumerSecret)

	resp, err := d.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("oauth request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   string `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("oauth decode: %w", err)
	}

	d.token = result.AccessToken
	d.tokenExp = time.Now().Add(3500 * time.Second)
	return d.token, nil
}

func (d *darajaClient) generatePassword() string {
	timestamp := time.Now().Format("20060102150405")
	data := fmt.Sprintf("%s%s%s", d.config.Shortcode, d.config.Passkey, timestamp)
	return base64.StdEncoding.EncodeToString([]byte(data))
}

func (d *darajaClient) generateTimestamp() string {
	return time.Now().Format("20060102150405")
}

func (d *darajaClient) STKPush(ctx context.Context, req *PaymentRequest) (*PaymentResponse, error) {
	if d.isDev() {
		log.Printf("DEV MODE: mock STK push for %s (KES %.0f)", req.Phone, req.Amount)
		return &PaymentResponse{
			CheckoutRequestID: "MOCK-" + generateShortID(),
			ResponseCode:      "0",
			ResponseDesc:      "Success. Mock payment accepted.",
			Success:           true,
		}, nil
	}

	token, err := d.getOAuthToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("auth: %w", err)
	}

	baseURL := "https://sandbox.safaricom.co.ke"
	if d.config.Env == "production" {
		baseURL = "https://api.safaricom.co.ke"
	}

	timestamp := d.generateTimestamp()
	password := d.generatePassword()

	phone := req.Phone
	if strings.HasPrefix(phone, "+") {
		phone = phone[1:]
	}
	if strings.HasPrefix(phone, "0") {
		phone = "254" + phone[1:]
	}

	payload := map[string]interface{}{
		"BusinessShortCode": d.config.Shortcode,
		"Password":          password,
		"Timestamp":         timestamp,
		"TransactionType":   "CustomerPayBillOnline",
		"Amount":            fmt.Sprintf("%.0f", req.Amount),
		"PartyA":            phone,
		"PartyB":            d.config.Shortcode,
		"PhoneNumber":       phone,
		"CallBackURL":       req.CallbackURL,
		"AccountReference":  req.AccountRef,
		"TransactionDesc":   req.Description,
	}

	body, _ := json.Marshal(payload)

	apiReq, _ := http.NewRequestWithContext(ctx, "POST", baseURL+"/mpesa/stkpush/v1/processrequest", bytes.NewReader(body))
	apiReq.Header.Set("Authorization", "Bearer "+token)
	apiReq.Header.Set("Content-Type", "application/json")

	resp, err := d.httpClient.Do(apiReq)
	if err != nil {
		return nil, fmt.Errorf("stk push: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	var result struct {
		MerchantRequestID   string `json:"MerchantRequestID"`
		CheckoutRequestID   string `json:"CheckoutRequestID"`
		ResponseCode        string `json:"ResponseCode"`
		ResponseDescription string `json:"ResponseDescription"`
		ResultCode          string `json:"ResultCode"`
		ResultDesc          string `json:"ResultDesc"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("stk response decode: %w", err)
	}

	return &PaymentResponse{
		CheckoutRequestID: result.CheckoutRequestID,
		ResponseCode:      result.ResponseCode,
		ResponseDesc:      result.ResponseDescription,
		Success:           result.ResponseCode == "0",
	}, nil
}

func (d *darajaClient) ProcessCallback(payload []byte) (*PaymentStatusResult, error) {
	var cb models.MpesaCallbackPayload
	if err := json.Unmarshal(payload, &cb); err != nil {
		return nil, fmt.Errorf("callback decode: %w", err)
	}

	result := &PaymentStatusResult{
		ResultCode:        cb.Body.StkCallback.ResultCode,
		ResultDesc:        cb.Body.StkCallback.ResultDesc,
		CheckoutRequestID: cb.Body.StkCallback.CheckoutRequestID,
		Success:           cb.Body.StkCallback.ResultCode == 0,
	}

	if result.Success {
		for _, item := range cb.Body.StkCallback.CallbackMetadata.Item {
			switch item.Name {
			case "MpesaReceiptNumber":
				result.ReceiptNumber = toString(item.Value)
			case "PhoneNumber":
				result.PhoneNumber = toString(item.Value)
			case "Amount":
				result.Amount = toFloat64(item.Value)
			}
		}
	}

	log.Printf("M-Pesa callback: code=%d desc=%s receipt=%s",
		result.ResultCode, result.ResultDesc, result.ReceiptNumber)
	return result, nil
}

func toString(v interface{}) string {
	switch val := v.(type) {
	case string:
		return val
	case float64:
		return fmt.Sprintf("%.0f", val)
	default:
		return fmt.Sprintf("%v", val)
	}
}

func toFloat64(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case string:
		var f float64
		fmt.Sscanf(val, "%f", &f)
		return f
	default:
		return 0
	}
}

func generateShortID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}
