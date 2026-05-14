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

// DTO-uri pentru API
interface ReviewResponseDTO {
  id: number
  user_id: number
  product_id: number
  rating: number
  comment: string | null
  seller_reply: {
    comment: string
    replied_at: string
  } | null
  created_at: string
}

interface ProductDTO {
  id: number
  title: string
  slug: string
}

/**
 * Obține lista de produse ale seller-ului curent
 */
async function getSellerProducts(): Promise<ProductDTO[]> {
  try {
    // Obținem profilul seller-ului pentru a avea seller_id
    const profileResponse = await apiClient.get("/sellers/me")
    const sellerId = profileResponse.data.id
    
    console.log('Seller ID:', sellerId)

    // Obținem produsele seller-ului
    const productsResponse = await apiClient.get("/products", {
      params: {
        seller_id: sellerId,
        page: 1,
        page_size: 100, // Limită rezonabilă
      }
    })
    
    console.log('Products response:', productsResponse.data)

    return productsResponse.data.data || []
  } catch (error: any) {
    console.error('Error fetching seller products:', error)
    console.error('Error details:', error.response?.data)
    throw error
  }
}

/**
 * Obține reviews-urile pentru un produs specific
 * NOTĂ: Folosim fetch în loc de apiClient pentru că endpoint-ul este public
 * IMPORTANT: Trebuie să folosim ID numeric, nu slug, pentru a evita conflicte de routing
 */
async function getProductReviews(productId: number): Promise<ReviewResponseDTO[]> {
  try {
    console.log(`Fetching reviews for product ID: ${productId}`)
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    // Încercăm să folosim direct ID-ul numeric pentru a evita conflictele de routing
    const url = `${API_URL}/api/v1/products/${productId}/reviews`
    console.log(`Fetching from URL: ${url}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    console.log(`Response status for product ${productId}:`, response.status)
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`Failed to fetch reviews for product ${productId}: ${response.status}`, errorText)
      return []
    }
    
    const reviews = await response.json()
    console.log(`Reviews response for product ${productId}:`, reviews)
    
    // Backend returnează direct un array
    const reviewsArray = Array.isArray(reviews) ? reviews : []
    console.log(`Parsed ${reviewsArray.length} reviews for product ${productId}`)
    
    return reviewsArray
  } catch (error: any) {
    console.error(`Error fetching reviews for product ${productId}:`, error)
    return []
  }
}

/**
 * Obține toate reviews-urile pentru produsele seller-ului curent
 */
export async function getSellerReviews(): Promise<ReviewsListResponse> {
  try {
    // 1. Obținem lista de produse ale seller-ului
    const products = await getSellerProducts()
    
    console.log('Found products:', products.length)

    // 2. Pentru fiecare produs, obținem reviews-urile folosind ID
    const reviewsPromises = products.map(product =>
      getProductReviews(product.id)  // ← FOLOSIM ID
        .then(reviews => ({
          product,
          reviews
        }))
        .catch(error => {
          console.error(`Error fetching reviews for product ${product.id}:`, error)
          return { product, reviews: [] }
        })
    )

    const productsWithReviews = await Promise.all(reviewsPromises)
    
    console.log('Products with reviews:', productsWithReviews)

    // 3. Agregăm toate reviews-urile și adăugăm product_title
    const allReviews: Review[] = []

    for (const { product, reviews } of productsWithReviews) {
      for (const review of reviews) {
        allReviews.push({
          id: review.id,
          product_id: review.product_id,
          product_title: product.title,
          buyer_name: `User ${review.user_id}`, // TODO: Obține numele real al buyer-ului
          rating: review.rating,
          comment: review.comment || "",
          created_at: review.created_at,
          seller_reply: review.seller_reply
        })
      }
    }
    
    console.log('Total reviews found:', allReviews.length)

    // 4. Sortăm după dată (cele mai recente primele)
    allReviews.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return {
      data: allReviews,
      total: allReviews.length,
      page: 1,
      page_size: allReviews.length
    }
  } catch (error) {
    console.error("Error fetching seller reviews:", error)
    throw error
  }
}

/**
 * Trimite un răspuns la o recenzie
 * @param reviewId - ID-ul recenziei
 * @param comment - Textul răspunsului (max 1000 caractere)
 */
export async function replyToReview(reviewId: number, comment: string): Promise<Review> {
  const response = await apiClient.post(`/reviews/${reviewId}/reply`, {
    comment
  })

  const reviewDTO: ReviewResponseDTO = response.data

  // Transformăm în formatul nostru
  return {
    id: reviewDTO.id,
    product_id: reviewDTO.product_id,
    product_title: "", // Va fi actualizat din lista locală
    buyer_name: `User ${reviewDTO.user_id}`,
    rating: reviewDTO.rating,
    comment: reviewDTO.comment || "",
    created_at: reviewDTO.created_at,
    seller_reply: reviewDTO.seller_reply
  }
}
