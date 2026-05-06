import type { Product, ProductListQuery, ProductListResponse } from "@/lib/types/product"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface CreateProductPayload {
  title: string
  description: string
  price: string
  stock: string
  category_id: number
}

export interface ProductImage {
  id: number
  path: string
  is_thumbnail: boolean
  display_order: number
}

export async function listProducts(query: ProductListQuery = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.category_id) params.set("category_id", String(query.category_id))
  if (query.seller_id) params.set("seller_id", String(query.seller_id))
  if (query.min_price !== undefined) params.set("min_price", String(query.min_price))
  if (query.max_price !== undefined) params.set("max_price", String(query.max_price))
  if (query.min_rating !== undefined) params.set("min_rating", String(query.min_rating))
  if (query.sort) params.set("sort", query.sort)
  if (query.page) params.set("page", String(query.page))
  if (query.page_size) params.set("page_size", String(query.page_size))

  try {
    const response = await fetch(`${API_URL}/api/v1/products?${params.toString()}`)
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || data.detail || "Eroare la preluarea produselor")
    }
    return response.json() as Promise<ProductListResponse>
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de retea. Verifica conexiunea la internet.")
  }
}

export async function getProductById(slug: string): Promise<Product> {
  try {
    const response = await fetch(`${API_URL}/api/v1/products/${slug}`)

    if (response.status === 404) {
      throw new Error("Produsul nu a fost gasit sau a fost sters")
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || data.detail || "Eroare la preluarea produsului")
    }

    return response.json() as Promise<Product>
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de retea. Verifica conexiunea la internet.")
  }
}

//SELLER CREATE PRODUCT

export async function createProduct(
  payload: CreateProductPayload,
  images: File[]
): Promise<Product> {
  const formData = new FormData()
  
  formData.append("title", payload.title.trim())
  formData.append("description", payload.description.trim())
  formData.append("price", payload.price)
  formData.append("stock", payload.stock)
  formData.append("category_id", payload.category_id.toString())
  
  // Adaugă imaginile
  images.forEach((file) => {
    formData.append("images", file)
  })
  
  // Opțional: adaugă metadata pentru imagini (prima imagine = thumbnail)
  if (images.length > 0) {
    const metadata = images.map((_, index) => ({
      display_order: index,
      is_thumbnail: index === 0  // Prima imagine devine thumbnail
    }))
    formData.append("images_metadata", JSON.stringify(metadata))
  }

  const response = await fetch(`${API_URL}/api/v1/sellers/me/products`, {
    method: "POST",
    credentials: "include",
    body: formData,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const errorMessage = 
      data?.detail || 
      data?.error?.message || 
      "Nu am putut crea produsul."
    throw new Error(errorMessage)
  }

  return await response.json()
}