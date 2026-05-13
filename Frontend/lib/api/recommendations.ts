import type { RecommendationsResponse } from "@/lib/types/recommendations"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/**
 * Obține recomandări de produse de la backend
 * 
 * Endpoint: GET /api/v1/recommendations/products
 * 
 * Logica backend:
 * - Dacă user este logat ca buyer și are comenzi → recomandări personalizate din Neo4j
 * - Altfel → produse populare (cele mai vândute)
 * 
 * @param limit - Numărul maxim de produse (1-20, default: 10)
 * @returns Promise cu recomandări și sursa (personalized/popular)
 */
export async function getRecommendations(
  limit: number = 10
): Promise<RecommendationsResponse> {
  const params = new URLSearchParams()
  params.set("limit", limit.toString())

  const response = await fetch(
    `${API_URL}/api/v1/recommendations/products?${params.toString()}`,
    {
      method: "GET",
      credentials: "include", // Include cookies pentru autentificare
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const errorMessage =
      errorData?.error?.message ||
      errorData?.detail ||
      "Nu am putut încărca recomandările"
    throw new Error(errorMessage)
  }

  const data = await response.json()
  return data as RecommendationsResponse
}
