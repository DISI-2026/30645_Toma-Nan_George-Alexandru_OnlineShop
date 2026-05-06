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

export interface Product {
  id: number
  seller_id: number
  category_id: number
  title: string
  slug: string
  description: string | null
  price: string
  stock: number
  is_available: boolean
  avg_rating: string | null
  review_count: number
  created_at: string
  updated_at: string
  images: ProductImage[]
}

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