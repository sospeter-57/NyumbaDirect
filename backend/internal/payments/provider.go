package payments

import "context"

type PaymentRequest struct {
	Phone       string
	Amount      float64
	AccountRef  string
	Description string
	CallbackURL string
}

type PaymentResponse struct {
	CheckoutRequestID string
	ResponseCode      string
	ResponseDesc      string
	Success           bool
}

type PaymentStatusResult struct {
	ResultCode        int
	ResultDesc        string
	CheckoutRequestID string
	ReceiptNumber     string
	PhoneNumber       string
	Amount            float64
	Success           bool
}

type PaymentProvider interface {
	STKPush(ctx context.Context, req *PaymentRequest) (*PaymentResponse, error)
	ProcessCallback(payload []byte) (*PaymentStatusResult, error)
}
