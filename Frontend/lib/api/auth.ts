/**
 * Servicii API pentru autentificare
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface RegisterData {
  email: string
  password: string
  role: string
  full_name: string
}

export interface RegisterResponse {
  id: string
  email: string
  role: string
  full_name: string
  created_at: string
}

/**
 * Înregistrează un utilizator nou
 * 
 * @param data - Datele de înregistrare (email, password, role, full_name)
 * @returns Promise cu răspunsul de la server
 * @throws Error dacă înregistrarea eșuează
 */
export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()

    if (!response.ok) {
      // Gestionăm erorile de la backend
      if (response.status === 409) {
        throw new Error("Email-ul este deja înregistrat")
      }
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
