const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''
const API_BASE = `${BACKEND_URL}/api/v1`

export function uploadUrl(path: string): string {
  if (!path || path.startsWith('http')) return path
  return `${BACKEND_URL}${path}`
}

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Request failed')
  }
  return data as T
}

export const api = {
  auth: {
    register: (phone: string, password: string, role: string, name?: string, businessName?: string) =>
      request<import('../types').AuthResponse>(
        `/auth/register?role=${role}`,
        { method: 'POST', body: JSON.stringify({ phone, password, name, business_name: businessName }) }
      ),
    login: (phone: string, password: string) =>
      request<import('../types').AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      }),
    me: () => request<import('../types').User>('/auth/me'),
  },

  properties: {
    list: (bounds: {
      north: number
      south: number
      east: number
      west: number
    }) =>
      request<import('../types').Property[]>(
        `/properties?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`
      ),
    get: (id: number) =>
      request<{
        property: import('../types').Property
        repair_rates: import('../types').RepairRate[]
        reviews: import('../types').PropertyReview[]
        photos: { id: number; property_id: number; url: string; is_primary: boolean }[]
      }>(`/properties/${id}`),
    create: (data: import('../types').ListingFormData) =>
      request<import('../types').Property>('/properties', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    myListings: () =>
      request<
        {
          property: import('../types').Property
          repair_rates: import('../types').RepairRate[]
          traffic: import('../types').TrafficStats
        }[]
    >('/properties/my/listings'),
    unlock: (id: number) =>
      request<{
        phone: string
        whatsapp_link: string
      }>(`/properties/${id}/unlock`, { method: 'POST' }),
    review: (id: number, data: import('../types').ReviewForm) =>
      request<{ status: string }>(`/properties/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    traffic: (id: number) =>
      request<import('../types').TrafficStats>(`/properties/${id}/traffic`),
  },

  payments: {
    payListing: (id: number) =>
      request<import('../types').MpesaSTKPushResponse>(
        `/payments/listing/${id}/pay`,
        { method: 'POST' }
      ),
    payUnlock: (id: number) =>
      request<import('../types').MpesaSTKPushResponse>(
        `/payments/unlock/${id}/pay`,
        { method: 'POST' }
      ),
    subscriptionStatus: (type?: string) =>
      request<{ active: boolean; subscription?: import('../types').Subscription }>(
        `/payments/subscription/status${type ? `?type=${type}` : ''}`
      ),
  },

  tenant: {
    profile: () =>
      request<{
        user: import('../types').User
        unlocks: {
          id: number
          property_id: number
          property_title: string
          house_type: string
          unlocked_at: string
        }[]
        reviews: {
          id: number
          property_id: number
          property_title: string
          house_type: string
          is_fraud: boolean
          is_occupied: boolean
          extra_fees: boolean
          comments: string
          created_at: string
        }[]
      }>('/tenant/profile'),
  },

  landlord: {
    profile: () =>
      request<{
        user: import('../types').User
        properties: import('../types').Property[]
      }>('/landlord/profile'),
  },

  upload: {
    propertyMedia: (id: number, files: File[], agreementFile?: File) => {
      const form = new FormData()
      files.forEach((f) => form.append('media', f))
      if (agreementFile) form.append('agreement_doc', agreementFile)
      return request<{ media: { url: string; type: string }[] }>(`/properties/${id}/media`, {
        method: 'POST',
        body: form,
        headers: {},
      })
    },
    profilePicture: (file: File) => {
      const form = new FormData()
      form.append('profile_picture', file)
      return request<{ profile_picture: string }>('/upload/profile-picture', {
        method: 'POST',
        body: form,
        headers: {},
      })
    },
  },

  analytics: {
    fairness: (id: number) =>
      request<import('../types').AnalyticsResponse>(`/analytics/fairness/${id}`),
  },
}
