/**
 * Servicii API pentru autentificare
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface RegisterData {
  email: string
  password: string
  role: string
}

export interface RegisterResponse {
  message: string
  user?: {
    id: string
    email: string
    role: string
  }
}

export interface LoginData {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: {
    id: string
    email: string
    role: string
  }
}

/**
 * Înregistrează un utilizator nou
 * 
 * @param data - Datele de înregistrare (email, password, role)
 * @returns Promise cu răspunsul de la server
 * @throws Error dacă înregistrarea eșuează
 */
export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()

    if (!response.ok) {
      // Gestionăm erorile de la backend
      throw new Error(responseData.message || responseData.detail || "Eroare la înregistrare")
    }

    return responseData
  } catch (error) {
    // Re-aruncăm eroarea pentru a fi gestionată în componenta
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

/**
 * Autentifică un utilizator
 * 
 * @param data - Datele de autentificare (email, password)
 * @returns Promise cu răspunsul de la server (token + user info)
 * @throws Error dacă autentificarea eșuează
 */
export async function loginUser(data: LoginData): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(responseData.message || responseData.detail || "Email sau parolă incorectă")
    }

    return responseData
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}
