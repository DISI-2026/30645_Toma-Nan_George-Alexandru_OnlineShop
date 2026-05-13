import { apiClient } from "./client"

export interface Review {
  id: number
  product_id: number
  product_title: string
  buyer_name: string
  rating: number
  comment: string
  created_at: string
  seller_reply?: {
    comment: string
    replied_at: string
  } | null
}

export interface ReviewsListResponse {
  data: Review[]
  total: number
  page: number
  page_size: number
}

/**
 * Obține lista de recenzii pentru produsele vânzătorului curent
 */
export async function getSellerReviews(page: number = 1, pageSize: number = 20): Promise<ReviewsListResponse> {
  // TODO: Implementare în task-ul #122 (backend)
  // const response = await apiClient.get(`/api/v1/reviews/seller`, {
  //   params: { page, page_size: pageSize }
  // })
  // return response.data
  
  // Mock data pentru dezvoltare
  return {
    data: [],
    total: 0,
    page: 1,
    page_size: pageSize
  }
}

/**
 * Trimite un răspuns la o recenzie
 * @param reviewId - ID-ul recenziei
 * @param comment - Textul răspunsului (max 1000 caractere)
 */
export async function replyToReview(reviewId: number, comment: string): Promise<Review> {
  // TODO: Implementare în task-ul #122 (backend)
  // const response = await apiClient.post(`/api/v1/reviews/${reviewId}/reply`, {
  //   comment
  // })
  // return response.data
  
  throw new Error("Funcționalitatea de răspuns la recenzii va fi implementată în task-ul #122")
}
