/**
 * API client pentru gestionarea categoriilor
 * Backend: http://localhost:8000
 * Endpoint-uri: /api/v1/categories
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ==================== INTERFACES ====================

export interface Category {
  id: number
  name: string
  description: string | null
  slug: string
  product_count: number
  created_at: string
  updated_at: string
}

export interface CategoryListResponse {
  items: Category[]
  page: number
  page_size: number
  total: number
}

export interface CreateCategoryData {
  name: string
  description?: string | null
}

export interface UpdateCategoryData {
  name: string
  description?: string | null
}

export interface PatchCategoryData {
  name?: string
  description?: string | null
}

// ==================== API FUNCTIONS ====================

/**
 * Listează toate categoriile cu paginare
 * Endpoint: GET /api/v1/categories
 */
export async function listCategories(
  page: number = 1,
  pageSize: number = 100
): Promise<CategoryListResponse> {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/categories?page=${page}&page_size=${pageSize}`,
      {
        method: "GET",
        credentials: "include",
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || errorData.detail || "Eroare la încărcarea categoriilor")
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

/**
 * Obține o categorie după ID
 * Endpoint: GET /api/v1/categories/{id}
 */
export async function getCategory(id: number): Promise<Category> {
  try {
    const response = await fetch(`${API_URL}/api/v1/categories/${id}`, {
      method: "GET",
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || errorData.detail || "Categorie negăsită")
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

/**
 * Creează o categorie nouă (admin only)
 * Endpoint: POST /api/v1/categories
 */
export async function createCategory(data: CreateCategoryData): Promise<Category> {
  try {
    const response = await fetch(`${API_URL}/api/v1/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      if (response.status === 403) {
        throw new Error("Nu ai permisiunea să creezi categorii")
      }
      if (response.status === 409) {
        throw new Error("Categoria există deja")
      }
      throw new Error(errorData.message || errorData.detail || "Eroare la crearea categoriei")
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

/**
 * Actualizează complet o categorie (admin only)
 * Endpoint: PUT /api/v1/categories/{id}
 */
export async function updateCategory(id: number, data: UpdateCategoryData): Promise<Category> {
  try {
    const response = await fetch(`${API_URL}/api/v1/categories/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      if (response.status === 403) {
        throw new Error("Nu ai permisiunea să modifici categorii")
      }
      if (response.status === 404) {
        throw new Error("Categoria nu a fost găsită")
      }
      throw new Error(errorData.message || errorData.detail || "Eroare la actualizarea categoriei")
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

/**
 * Actualizează parțial o categorie (admin only)
 * Endpoint: PATCH /api/v1/categories/{id}
 */
export async function patchCategory(id: number, data: PatchCategoryData): Promise<Category> {
  try {
    const response = await fetch(`${API_URL}/api/v1/categories/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      if (response.status === 403) {
        throw new Error("Nu ai permisiunea să modifici categorii")
      }
      if (response.status === 404) {
        throw new Error("Categoria nu a fost găsită")
      }
      throw new Error(errorData.message || errorData.detail || "Eroare la actualizarea categoriei")
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

/**
 * Șterge o categorie (admin only)
 * Endpoint: DELETE /api/v1/categories/{id}
 */
export async function deleteCategory(id: number): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/v1/categories/${id}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (response.status === 403) {
        throw new Error("Nu ai permisiunea să ștergi categorii")
      }
      if (response.status === 404) {
        throw new Error("Categoria nu a fost găsită")
      }
      if (response.status === 409) {
        throw new Error("Categoria nu poate fi ștearsă deoarece conține produse")
      }
      throw new Error(errorData.message || errorData.detail || "Eroare la ștergerea categoriei")
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}
