import { ProductListItem } from "@/lib/types/product"

export interface RecommendationsResponse {
  recommendations: ProductListItem[]
  source: "personalized" | "popular"
}
