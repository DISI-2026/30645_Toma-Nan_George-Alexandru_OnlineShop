/**
 * API Client pentru gestionarea asocierilor Seller-Categories
 * Backend: http://localhost:8000
 * Endpoint-uri: /api/v1/admin/sellers/...
 * Autentificare: Cookie-based (HTTP-only)
 * Autorizare: Admin role required
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ==================== INTERFACES ====================

export interface SellerAssignedCategory {
  id: number
  name: string
  slug: string
  assigned_at: string // ISO datetime
}

export interface SellerWithCategories {
  seller_id: number
  company_name: string
  categories: SellerAssignedCategory[]
}

export interface SellersListResponse {
  items: SellerWithCategories[]
  page: number
  page_size: number
  total: number
}

export interface AssignCategoryRequest {
  category_id: number
}

export interface AssignCategoryResponse {
  seller_id: number
  category_id: number
  assigned_at: string // ISO datetime
}

// ==================== API FUNCTIONS ====================

/**
 * Listează sellers cu categoriile lor asociate
 * Endpoint: GET /api/v1/admin/sellers
 * 
 * @param page - Numărul paginii (default: 1)
 * @param pageSize - Numărul de items per pagină (default: 20, max: 100)
 * @param categoryId - Filtrare după categorie (optional)
 */
export async function listSellers(
  page: number = 1,
  pageSize: number = 20,
  categoryId?: number
): Promise<SellersListResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    })

    if (categoryId !== undefined) {
      params.append("category_id", categoryId.toString())
    }

    const response = await fetch(`${API_URL}/api/v1/admin/sellers?${params}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || data.detail || "Eroare la încărcarea vânzătorilor")
    }

    return data
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

/**
 * Asociază un seller cu o categorie
 * Endpoint: POST /api/v1/admin/sellers/{seller_id}/categories
 * 
 * @param sellerId - ID-ul seller-ului
 * @param categoryId - ID-ul categoriei de asociat
 */
export async function assignSellerCategory(
  sellerId: number,
  categoryId: number
): Promise<AssignCategoryResponse> {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/admin/sellers/${sellerId}/categories`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category_id: categoryId }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error("Seller-ul este deja asociat cu această categorie")
      }
      if (response.status === 404) {
        throw new Error("Seller-ul sau categoria nu a fost găsită")
      }
      throw new Error(data.message || data.detail || "Eroare la asocierea categoriei")
    }

    return data
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}

/**
 * Șterge asocierea dintre un seller și o categorie
 * Endpoint: DELETE /api/v1/admin/sellers/{seller_id}/categories/{category_id}
 * 
 * @param sellerId - ID-ul seller-ului
 * @param categoryId - ID-ul categoriei de disociat
 */
export async function removeSellerCategory(
  sellerId: number,
  categoryId: number
): Promise<void> {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/admin/sellers/${sellerId}/categories/${categoryId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    )

    if (!response.ok) {
      const data = await response.json()
      
      if (response.status === 404) {
        throw new Error("Asocierea nu a fost găsită")
      }
      if (response.status === 422) {
        throw new Error(
          "Nu poți șterge asocierea. Seller-ul are produse active în această categorie."
        )
      }
      throw new Error(data.message || data.detail || "Eroare la ștergerea asocierii")
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}
