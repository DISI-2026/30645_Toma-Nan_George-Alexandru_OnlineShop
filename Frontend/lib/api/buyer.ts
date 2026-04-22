import type { BuyerProfile, BuyerUpdatePayload } from "@/lib/types/buyer"

export type { BuyerProfile, BuyerUpdatePayload } from "@/lib/types/buyer"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function authHeaders() {
  return {
    "Content-Type": "application/json",
  }
}

export async function getBuyerProfile(): Promise<BuyerProfile> {
  try {
    const response = await fetch(`${API_URL}/api/v1/buyer/me`, {
      headers: authHeaders(),
      credentials: "include",
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || data.message || "Eroare la încărcarea profilului")
    }
    return data
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

export async function updateBuyerProfile(payload: BuyerUpdatePayload): Promise<BuyerProfile> {
  try {
    const response = await fetch(`${API_URL}/api/v1/buyer/me`, {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include", 
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || data.message || "Eroare la salvarea profilului")
    }
    return data
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}
