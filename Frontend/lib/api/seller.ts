export const API_BASE = "http://localhost:8000"

const getHeaders = () => ({
  "Content-Type": "application/json"
})

// SELLER
export const getSellerProfile = async () => {
  const res = await fetch(`${API_BASE}/api/v1/sellers/me`, {
    headers: getHeaders(),
    credentials: "include",
  })
  return res
}

export const createSellerProfile = async () => {
  const res = await fetch(`${API_BASE}/api/v1/sellers/me`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({
      company_name: "", phone: "", address: "", tax_id: "", description: "",
    }),
  })
  return res
}

export const updateSellerProfile = async (body: Record<string, string | null | File>) => {
  const formData = new FormData()
  
  // Adaugă doar câmpurile care nu sunt null
  Object.entries(body).forEach(([key, value]) => {
    if (value !== null) {
      if (value instanceof File) {
        formData.append(key, value)
      } else {
        formData.append(key, value)
      }
    }
  })

  const res = await fetch(`${API_BASE}/api/v1/sellers/me`, {
    method: "PATCH",
    credentials: "include",
    body: formData,
  })
  return res
}



// PRODUCTS 
export const createProduct = async (
    title: string,
    description: string,
    price: number,
    stock: number,
    categoryId: number,
    images: File[],
    imagesMetadata?: Array<{ display_order: number; is_thumbnail: boolean }>
  ) => {
    const formData = new FormData()
    
    formData.append("title", title)
    formData.append("description", description)
    formData.append("price", price.toString())
    formData.append("stock", stock.toString())
    formData.append("category_id", categoryId.toString())
    
    // Adaugă imaginile
    images.forEach((image) => {
      formData.append("images", image)
    })
    
    // Adaugă metadata pentru imagini (opțional)
    if (imagesMetadata && imagesMetadata.length > 0) {
      formData.append("images_metadata", JSON.stringify(imagesMetadata))
    }

    const res = await fetch(`${API_BASE}/api/v1/sellers/me/products`, {
      method: "POST",
      credentials: "include",
      body: formData,
    })
    return res
}

export const getCategories = async () => {
  const res = await fetch(`${API_BASE}/api/v1/categories?page=1&page_size=100`, {
    headers: getHeaders(),
    credentials: "include",
  })
  return res
}

export const updateProduct = async (productId: number, body: Record<string, string>) => {
  return await fetch(`${API_BASE}/api/v1/sellers/me/products/${productId}`, {
    method: "PATCH",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(body),
  })
}

export const deleteProduct = async (productId: number) => {
  return await fetch(`${API_BASE}/api/v1/sellers/me/products/${productId}`, {
    method: "DELETE",
    headers: getHeaders(),
    credentials: "include",
  })
}

// ORDERS 
export const getSellerOrders = async () => {
  const res = await fetch(`${API_BASE}/api/v1/sellers/me/orders`, {
    headers: getHeaders(),
    credentials: "include",
  })
  return res
}

export const updateOrderStatus = async (orderId: string, status: string) => {
  return await fetch(`${API_BASE}/api/v1/orders/${orderId}/status`, {
    method: "PATCH",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({ status }),
  })
}