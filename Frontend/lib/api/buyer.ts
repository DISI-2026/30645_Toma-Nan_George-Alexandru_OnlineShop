import { getAuthToken } from "@/lib/auth-utils"
import type { BuyerProfile, BuyerUpdatePayload } from "@/lib/types/buyer"

export type { BuyerProfile, BuyerUpdatePayload } from "@/lib/types/buyer"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function authHeaders() {
  const token = getAuthToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const MOCK_BUYER: BuyerProfile = {
  id: "dummy-001",
  full_name: "Ion Popescu",
  email: "ion.popescu@example.com",
  phone: "0721 234 567",
  address: "Strada Memorandumului 12, Cluj-Napoca, Cluj, 400000, Romania",
  preferences: {
    favorite_categories: [
      { id: "cat-electronice", name: "Electronice" },
      { id: "cat-sport", name: "Sport" },
    ],
    price_range: { min: 50, max: 1500 },
  },
  created_at: "2024-01-01T00:00:00Z",
}

export async function getBuyerProfile(): Promise<BuyerProfile> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    await new Promise((r) => setTimeout(r, 400))
    return MOCK_BUYER
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/buyers/me`, {
      headers: authHeaders(),
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
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    await new Promise((r) => setTimeout(r, 400))
    return { ...MOCK_BUYER, ...payload } as BuyerProfile
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/buyers/me`, {
      method: "PATCH",
      headers: authHeaders(),
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
