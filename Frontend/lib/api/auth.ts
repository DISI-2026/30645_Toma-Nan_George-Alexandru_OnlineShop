/**
 * Servicii API pentru autentificare
 * Backend: http://localhost:8000
 * Toate endpoint-urile: /api/v1/auth/...
 * Token-ul se setează ca HTTP-only cookie de backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ==================== INTERFACES ====================

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
}

export type RegisterData = BuyerRegisterData | SellerRegisterData

export interface RegisterResponse {
  user: {
    id: number
    email: string
    role: string
  }
}

export interface LoginData {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    id: number
    email: string
    role: string
  }
}

// ==================== API FUNCTIONS ====================

/**
 * Înregistrează un utilizator nou
 * Endpoint: POST /api/v1/auth/register
 */
export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
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
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

/**
 * Autentifică un utilizator
 * Endpoint: POST /api/v1/auth/login
 * Token-ul se setează automat ca HTTP-only cookie de backend
 */
export async function loginUser(data: LoginData): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    })

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(responseData.message || responseData.detail || "Email sau parolă incorectă")
    }

    return responseData
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

/**
 * Logout - backend-ul șterge cookie-ul
 * Endpoint: POST /api/v1/auth/logout
 */
export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    })
  } catch {
    // Chiar dacă request-ul eșuează, ștergem datele locale
  }
}

/**
 * Trimite cerere de resetare parolă
 * Endpoint: POST /api/v1/auth/forgot-password
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(responseData.message || responseData.detail || "Eroare la trimiterea email-ului")
    }

    return responseData
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

/**
 * Resetează parola cu token-ul primit pe email
 * Endpoint: POST /api/v1/auth/reset-password
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(responseData.message || responseData.detail || "Eroare la resetarea parolei")
    }

    return responseData
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}
