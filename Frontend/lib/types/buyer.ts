export interface BuyerPreferences {
  favorite_categories: { id: string; name: string }[]
  price_range: { min: number; max: number }
}

export interface BuyerProfile {
  id: string
  full_name: string
  email: string
  phone: string
  address: string
  preferences: BuyerPreferences
  created_at: string
}

export interface BuyerUpdatePayload {
  full_name?: string
  phone?: string
  address?: string
  preferences?: {
    favorite_categories?: string[]
    price_range?: { min: number; max: number }
  }
}
