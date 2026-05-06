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

// List product item (returned by GET /api/v1/products)
export interface ProductListItem {
  id: number
  title: string
  slug: string
  price: number
  stock: number
  is_available: boolean
  thumbnail_url: string | null
  avg_rating: number | null
  review_count: number
  category: ProductCategory
  seller: Omit<ProductSeller, "avg_rating">
}

export interface ProductListPagination {
  page: number
  page_size: number
  total_items: number
  total_pages: number
}

export interface ProductListResponse {
  data: ProductListItem[]
  pagination: ProductListPagination
}

export interface ProductListQuery {
  q?: string
  category_id?: number
  seller_id?: number
  min_price?: number
  max_price?: number
  min_rating?: number
  sort?: "price_asc" | "price_desc" | "rating_desc" | "newest"
  page?: number
  page_size?: number
}
