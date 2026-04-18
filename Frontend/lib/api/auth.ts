/**
 * Servicii API pentru autentificare
 * Backend: http://localhost:8000
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface BuyerRegisterData {
  email: string
  password: string
  role: "buyer"
  address: string | null
  preferred_category_ids: number[]
}

export interface SellerRegisterData {
  email: string
  password: string
  role: "seller"
  company_name: string
  description: string | null
  logo_url: string | null
}

export type RegisterData = BuyerRegisterData | SellerRegisterData

export interface RegisterResponse {
  user: {
    id: number
    email: string
    role: string
  }
}

/**
 * Înregistrează un utilizator nou
 * Endpoint: POST /auth/register
 */
export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error("Email-ul este deja înregistrat")
      }
      throw new Error(responseData.message || responseData.detail || "Eroare la înregistrare")
    }

    return responseData
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}
