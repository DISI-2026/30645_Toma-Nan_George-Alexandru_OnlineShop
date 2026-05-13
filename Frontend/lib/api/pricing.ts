import { apiClient } from "./client"

export interface PriceSuggestion {
  product_id: string
  product_title: string
  current_price: number
  suggested_price: number
  change_percent: number
  direction: "increase" | "decrease" | "maintain"
  confidence: number
  reasoning: string
  demand_trend: "rising" | "declining" | "stable"
  data_period_days: number
  insufficient_data: boolean
}

export interface PriceSuggestionsResponse {
  suggestions: PriceSuggestion[]
}

/**
 * Obține sugestiile de preț pentru produsele vânzătorului
 * @param productId - ID-ul produsului (opțional). Dacă e omis, returnează top 100 produse după revenue
 */
export async function getPriceSuggestions(productId?: string): Promise<PriceSuggestionsResponse> {
  const params = productId ? { product_id: productId } : {}
  const response = await apiClient.get("/pricing/suggestions", { params })
  return response.data
}
