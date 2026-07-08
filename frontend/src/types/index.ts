export type Role = 'tenant' | 'landlord'

export type HouseType = 'Single' | 'Bedsitter' | '1-Bed' | '2-Bed' | '3-Bed' | 'Mansion'

export type ActiveStatus = 'PENDING_PAY' | 'ACTIVE' | 'FLAGGED' | 'INACTIVE'

export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'FAILED'

export interface User {
  id: number
  phone: string
  role: Role
  name: string
  business_name: string
  profile_picture: string
  created_at: string
}

export interface Property {
  id: number
  landlord_id: number
  house_type: HouseType
  rent: number
  deposit: number
  latitude: number
  longitude: number
  title: string
  description: string
  location_desc: string
  has_borehole: boolean
  is_tokens_meter: boolean
  has_hot_shower: boolean
  has_wifi: boolean
  gate_curfew_enabled: boolean
  water_rationing_active: boolean
  pets_allowed: boolean
  agreement_doc: string
  active_status: ActiveStatus
  created_at: string
  updated_at: string
}

export interface RepairRate {
  id: number
  property_id: number
  item_name: string
  cost: number
}

export interface Subscription {
  id: number
  user_id: number
  property_id?: number
  type: string
  status: SubscriptionStatus
  mpesa_checkout_id?: string
  mpesa_receipt?: string
  phone: string
  amount: number
  created_at: string
  expires_at?: string
}

export interface ContactUnlock {
  id: number
  tenant_id: number
  property_id: number
  timestamp: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface MpesaSTKPushResponse {
  checkout_request_id: string
  response_code: string
  response_desc: string
}

export interface AnalyticsResponse {
  house_type: HouseType
  average_rent_1km: number
  average_rent_2km: number
  average_rent_5km: number
  average_rent_30km: number
  sample_size_1km: number
  sample_size_2km: number
  sample_size_5km: number
  sample_size_30km: number
  property_rent: number
  deviation_1km: number
  deviation_2km: number
  deviation_5km: number
  deviation_30km: number
}

export interface TrafficStats {
  total_views: number
  total_unlocks: number
  unique_tenants: number
}

export interface ListingFormData {
  house_type: HouseType
  rent: number
  deposit: number
  latitude: number
  longitude: number
  title: string
  description: string
  location_desc: string
  has_borehole: boolean
  is_tokens_meter: boolean
  has_hot_shower: boolean
  has_wifi: boolean
  gate_curfew_enabled: boolean
  water_rationing_active: boolean
  pets_allowed: boolean
  agreement_doc: string
  repair_rates: { item_name: string; cost: number }[]
}

export interface PropertyBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface PropertyReview {
  id: number
  tenant_id: number
  property_id: number
  is_fraud: boolean
  is_occupied: boolean
  extra_fees: boolean
  comments: string
  created_at: string
}

export interface ReviewForm {
  is_fraud: boolean
  is_occupied: boolean
  extra_fees: boolean
  comments: string
}
