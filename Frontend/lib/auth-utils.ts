/**
 * Utilități pentru gestionarea autentificării
 */

const TOKEN_KEY = "auth_token"
const USER_KEY = "auth_user"

/**
 * Salvează token-ul de autentificare în localStorage
 */
export function saveAuthToken(token: string): void {
    if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, token)
    }
}

/**
 * Obține token-ul de autentificare din localStorage
 */
export function getAuthToken(): string | null {
    if (typeof window !== "undefined") {
        return localStorage.getItem(TOKEN_KEY)
    }
    return null
}

/**
 * Șterge token-ul de autentificare din localStorage
 */
export function removeAuthToken(): void {
    if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY)
    }
}

/**
 * Salvează informațiile utilizatorului în localStorage
 */
export function saveUser(user: { id: string; email: string; role: string }): void {
    if (typeof window !== "undefined") {
        localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
}

/**
 * Obține informațiile utilizatorului din localStorage
 */
export function getUser(): { id: string; email: string; role: string } | null {
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
 * Logout complet - șterge token și user
 */
export function logout(): void {
    removeAuthToken()
    removeUser()
}

/**
 * Verifică dacă utilizatorul este autentificat
 */
export function isAuthenticated(): boolean {
    return getAuthToken() !== null
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
