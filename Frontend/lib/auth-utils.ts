/**
 * Utilități pentru gestionarea autentificării
 * 
 * Token-ul JWT se gestionează prin HTTP-only cookies (setat de backend).
 * În localStorage salvăm doar informațiile utilizatorului (id, email, role)
 * pentru a ști rolul și a face redirect corect.
 */

const USER_KEY = "auth_user"

/**
 * Salvează informațiile utilizatorului în localStorage
 */
export function saveUser(user: { id: number; email: string; role: string }): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

/**
 * Obține informațiile utilizatorului din localStorage
 */
export function getUser(): { id: number; email: string; role: string } | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem(USER_KEY)
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
  }
  return null
}

/**
 * Șterge informațiile utilizatorului din localStorage
 */
export function removeUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_KEY)
  }
}

/**
 * Verifică dacă utilizatorul este autentificat
 */
export function isAuthenticated(): boolean {
  return getUser() !== null
}

/**
 * Logout complet - șterge user din localStorage
 * (cookie-ul se șterge prin API call la /api/v1/auth/logout)
 */
export function clearLocalAuth(): void {
  removeUser()
}

/**
 * Logout complet - apelează API și șterge datele locale
 */
export async function logout(): Promise<void> {
  // Import dinamic pentru a evita dependențe circulare
  const { logoutUser } = await import("./api/auth")
  await logoutUser()
  clearLocalAuth()
}

/**
 * Obține path-ul de redirect bazat pe rol
 */
export function getRedirectPath(role: string): string {
  switch (role.toLowerCase()) {
    case "seller":
      return "/seller"
    case "admin":
      return "/admin"
    case "buyer":
    default:
      return "/"
  }
}
