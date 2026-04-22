import type { Product } from "@/lib/types/product"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Preia detaliile unui produs dupa ID.
// Endpoint public: GET /api/v1/products/{id}
export async function getProductById(id: string): Promise<Product> {
  try {
    const response = await fetch(`${API_URL}/api/v1/products/${id}`)

    if (response.status === 404) {
      throw new Error("Produsul nu a fost găsit sau a fost șters")
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || data.detail || "Eroare la preluarea produsului")
    }

    return response.json() as Promise<Product>
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}
