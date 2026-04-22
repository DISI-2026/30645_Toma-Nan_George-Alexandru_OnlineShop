export interface ProductImage {
  id: number
  url: string
  is_thumbnail: boolean
  display_order: number
}

export interface ProductCategory {
  id: number
  name: string
}

export interface ProductSeller {
  id: number
  company_name: string
  logo_url: string | null
  avg_rating: number
}

export interface Product {
  id: number
  title: string
  slug: string
  description: string
  price: number
  discount_percent: number 
  stock: number
  is_available: boolean
  images: ProductImage[]
  avg_rating: number
  review_count: number
  category: ProductCategory
  seller: ProductSeller
  created_at: string
  updated_at: string
}

export function getDiscountedPrice(product: Pick<Product, "price" | "discount_percent">): number {
  if (!product.discount_percent || product.discount_percent <= 0) return product.price
  return product.price * (1 - product.discount_percent / 100)
}

export function isOutOfStock(product: Pick<Product, "stock" | "is_available">): boolean {
  return product.stock === 0 || !product.is_available
}
