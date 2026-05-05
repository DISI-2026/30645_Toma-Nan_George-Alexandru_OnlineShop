import { apiClient } from "@/lib/api/client"
import type { BuyerProfile, BuyerUpdatePayload } from "@/lib/types/buyer"

export type { BuyerProfile, BuyerUpdatePayload } from "@/lib/types/buyer"

export async function getBuyerProfile(): Promise<BuyerProfile> {
  try {
    // GET /api/v1/me returns 
    const response = await apiClient.get("/me")
    const data = response.data
    const buyer = data.buyer ?? {}
    return {
      ...buyer,
      email: data.email,
    } as BuyerProfile
  } catch (error: any) {
    const msg = error.response?.data?.error?.message
      || error.response?.data?.detail
      || "Eroare la încărcarea profilului"
    throw new Error(msg)
  }
}

export async function updateBuyerProfile(payload: BuyerUpdatePayload): Promise<BuyerProfile> {
  try {
    const response = await apiClient.patch("/buyer/me", payload)
    return response.data
  } catch (error: any) {
    const msg = error.response?.data?.error?.message
      || error.response?.data?.detail
      || "Eroare la salvarea profilului"
    throw new Error(msg)
  }
}
