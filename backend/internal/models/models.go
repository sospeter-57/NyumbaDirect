package models

import "time"

type Role string

const (
	RoleTenant  Role = "tenant"
	RoleLandlord Role = "landlord"
)

type HouseType string

const (
	HouseSingle    HouseType = "Single"
	HouseBedsitter HouseType = "Bedsitter"
	House1Bed      HouseType = "1-Bed"
	House2Bed      HouseType = "2-Bed"
	House3Bed      HouseType = "3-Bed"
	HouseMansion   HouseType = "Mansion"
)

type ActiveStatus string

const (
	StatusPending   ActiveStatus = "PENDING_PAY"
	StatusActive    ActiveStatus = "ACTIVE"
	StatusFlagged   ActiveStatus = "FLAGGED"
	StatusInactive  ActiveStatus = "INACTIVE"
)

type SubscriptionStatus string

const (
	SubPending    SubscriptionStatus = "PENDING"
	SubActive     SubscriptionStatus = "ACTIVE"
	SubExpired    SubscriptionStatus = "EXPIRED"
	SubFailed     SubscriptionStatus = "FAILED"
)

type User struct {
	ID             int64     `json:"id"`
	Phone          string    `json:"phone"`
	PasswordHash   string    `json:"-"`
	Role           Role      `json:"role"`
	Name           string    `json:"name"`
	BusinessName   string    `json:"business_name"`
	ProfilePicture string    `json:"profile_picture"`
	CreatedAt      time.Time `json:"created_at"`
}

type Property struct {
	ID                int64        `json:"id"`
	LandlordID        int64        `json:"landlord_id"`
	HouseType         HouseType    `json:"house_type"`
	Rent              float64      `json:"rent"`
	Deposit           float64      `json:"deposit"`
	Latitude          float64      `json:"latitude"`
	Longitude         float64      `json:"longitude"`
	Title             string       `json:"title"`
	Description       string       `json:"description"`
	LocationDesc      string       `json:"location_desc"`
	HasBorehole       bool         `json:"has_borehole"`
	IsTokensMeter     bool         `json:"is_tokens_meter"`
	HasHotShower      bool         `json:"has_hot_shower"`
	HasWiFi           bool         `json:"has_wifi"`
	GateCurfewEnabled bool         `json:"gate_curfew_enabled"`
	WaterRationing    bool         `json:"water_rationing_active"`
	PetsAllowed       bool         `json:"pets_allowed"`
	ActiveStatus      ActiveStatus `json:"active_status"`
	AgreementDoc      string       `json:"agreement_doc"`
	CreatedAt         time.Time    `json:"created_at"`
	UpdatedAt         time.Time    `json:"updated_at"`
}

type RepairRate struct {
	ID         int64   `json:"id"`
	PropertyID int64   `json:"property_id"`
	ItemName   string  `json:"item_name"`
	Cost       float64 `json:"cost"`
}

type Subscription struct {
	ID             int64              `json:"id"`
	UserID         int64              `json:"user_id"`
	PropertyID     *int64             `json:"property_id,omitempty"`
	Type           string             `json:"type"`
	Status         SubscriptionStatus `json:"status"`
	MpesaCheckoutID string            `json:"mpesa_checkout_id,omitempty"`
	MpesaReceipt   string             `json:"mpesa_receipt,omitempty"`
	Phone          string             `json:"phone"`
	Amount         float64            `json:"amount"`
	CreatedAt      time.Time          `json:"created_at"`
	ExpiresAt      *time.Time         `json:"expires_at,omitempty"`
}

type ContactUnlock struct {
	ID         int64     `json:"id"`
	TenantID   int64     `json:"tenant_id"`
	PropertyID int64     `json:"property_id"`
	Timestamp  time.Time `json:"timestamp"`
}

type PropertyReview struct {
	ID         int64     `json:"id"`
	TenantID   int64     `json:"tenant_id"`
	PropertyID int64     `json:"property_id"`
	IsFraud    bool      `json:"is_fraud"`
	IsOccupied bool      `json:"is_occupied"`
	ExtraFees  bool      `json:"extra_fees"`
	Comments   string    `json:"comments"`
	CreatedAt  time.Time `json:"created_at"`
}

type MoveInCertificate struct {
	PropertyID   int64             `json:"property_id"`
	TenantName   string            `json:"tenant_name"`
	LandlordName string            `json:"landlord_name"`
	PropertyAddr string            `json:"property_address"`
	Timestamp    time.Time         `json:"timestamp"`
	Items        []InspectionItem  `json:"items"`
}

type InspectionItem struct {
	Area        string `json:"area"`
	Condition   string `json:"condition"`
	PhotoURL    string `json:"photo_url,omitempty"`
	Notes       string `json:"notes,omitempty"`
}

type FairRefundCertificate struct {
	PropertyID    int64              `json:"property_id"`
	DepositAmount float64            `json:"deposit_amount"`
	TotalDeduction float64           `json:"total_deduction"`
	RefundAmount  float64            `json:"refund_amount"`
	Deductions    []RepairDeduction  `json:"deductions"`
}

type RepairDeduction struct {
	ItemName string  `json:"item_name"`
	Cost     float64 `json:"cost"`
	Applied  bool    `json:"applied"`
}

type PropertyPhoto struct {
	ID         int64  `json:"id"`
	PropertyID int64  `json:"property_id"`
	URL        string `json:"url"`
	IsPrimary  bool   `json:"is_primary"`
}

type MpesaCallbackPayload struct {
	Body struct {
		StkCallback struct {
			MerchantRequestID string `json:"MerchantRequestID"`
			CheckoutRequestID string `json:"CheckoutRequestID"`
			ResultCode        int    `json:"ResultCode"`
			ResultDesc        string `json:"ResultDesc"`
			CallbackMetadata  struct {
				Item []struct {
					Name  string      `json:"Name"`
					Value interface{} `json:"Value"`
				} `json:"Item"`
			} `json:"CallbackMetadata"`
		} `json:"stkCallback"`
	} `json:"Body"`
}

type ListingRequest struct {
	HouseType         HouseType `json:"house_type"`
	Rent              float64   `json:"rent"`
	Deposit           float64   `json:"deposit"`
	Latitude          float64   `json:"latitude"`
	Longitude         float64   `json:"longitude"`
	Title             string    `json:"title"`
	Description       string    `json:"description"`
	LocationDesc      string    `json:"location_desc"`
	HasBorehole       bool      `json:"has_borehole"`
	IsTokensMeter     bool      `json:"is_tokens_meter"`
	HasHotShower      bool      `json:"has_hot_shower"`
	HasWiFi           bool      `json:"has_wifi"`
	GateCurfewEnabled bool      `json:"gate_curfew_enabled"`
	WaterRationing    bool      `json:"water_rationing_active"`
	PetsAllowed       bool      `json:"pets_allowed"`
	AgreementDoc      string    `json:"agreement_doc"`
	RepairRates       []struct {
		ItemName string  `json:"item_name"`
		Cost     float64 `json:"cost"`
	} `json:"repair_rates,omitempty"`
}

type PropertyBounds struct {
	North float64 `json:"north"`
	South float64 `json:"south"`
	East  float64 `json:"east"`
	West  float64 `json:"west"`
}

type AuthRequest struct {
	Phone        string `json:"phone"`
	Password     string `json:"password"`
	Name         string `json:"name,omitempty"`
	BusinessName string `json:"business_name,omitempty"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type MpesaSTKPushRequest struct {
	Phone       string  `json:"phone"`
	Amount      float64 `json:"amount"`
	Reference   string  `json:"reference"`
	Description string  `json:"description"`
}

type MpesaSTKPushResponse struct {
	CheckoutRequestID string `json:"checkout_request_id"`
	ResponseCode      string `json:"response_code"`
	ResponseDesc      string `json:"response_desc"`
}

type AnalyticsResponse struct {
	HouseType       HouseType `json:"house_type"`
	AverageRent1km  float64   `json:"average_rent_1km"`
	AverageRent2km  float64   `json:"average_rent_2km"`
	AverageRent5km  float64   `json:"average_rent_5km"`
	AverageRent30km float64   `json:"average_rent_30km"`
	SampleSize1km   int       `json:"sample_size_1km"`
	SampleSize2km   int       `json:"sample_size_2km"`
	SampleSize5km   int       `json:"sample_size_5km"`
	SampleSize30km  int       `json:"sample_size_30km"`
	PropertyRent    float64   `json:"property_rent"`
	Deviation1km    float64   `json:"deviation_1km"`
	Deviation2km    float64   `json:"deviation_2km"`
	Deviation5km    float64   `json:"deviation_5km"`
	Deviation30km   float64   `json:"deviation_30km"`
}

type TrafficStats struct {
	TotalViews    int `json:"total_views"`
	TotalUnlocks  int `json:"total_unlocks"`
	UniqueTenants int `json:"unique_tenants"`
}

type FeedbackRequest struct {
	Message string `json:"message"`
}
