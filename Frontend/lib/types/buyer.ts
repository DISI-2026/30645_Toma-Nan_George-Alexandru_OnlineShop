export interface BuyerFavoriteCategory {
  category_id: number
  category_name: string
}

export interface BuyerPreferences {
  favorite_categories: BuyerFavoriteCategory[]
  price_range: { min: number | null; max: number | null }
}

export interface BuyerProfile {
  id: number
  full_name: string | null
  email: string
  phone: string | null
  address: string | null
  preferences: BuyerPreferences
  created_at: string
}

export interface BuyerUpdatePayload {
  full_name?: string
  phone?: string
  address?: string
  preferences?: {
    favorite_categories?: number[]   // list of category IDs (integers)
    price_range?: { min: number; max: number }
  }
}
