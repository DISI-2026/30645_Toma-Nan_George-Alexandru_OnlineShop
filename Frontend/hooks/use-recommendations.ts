import { useState, useEffect } from "react"
import { getRecommendations } from "@/lib/api/recommendations"
import type { RecommendationsResponse } from "@/lib/types/recommendations"

interface UseRecommendationsOptions {
  limit?: number
  enabled?: boolean // Permite dezactivarea fetch-ului
}

interface UseRecommendationsResult {
  data: RecommendationsResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook pentru gestionarea recomandărilor de produse
 * 
 * @param options - Opțiuni pentru fetch (limit, enabled)
 * @returns Obiect cu data, loading state, error și funcție refetch
 */
export function useRecommendations(
  options: UseRecommendationsOptions = {}
): UseRecommendationsResult {
  const { limit = 10, enabled = true } = options

  const [data, setData] = useState<RecommendationsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = async () => {
    if (!enabled) return

    try {
      setIsLoading(true)
      setError(null)
      const result = await getRecommendations(limit)
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Eroare necunoscută"
      setError(errorMessage)
      console.error("Error fetching recommendations:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [limit, enabled])

  return {
    data,
    isLoading,
    error,
    refetch: fetchRecommendations,
  }
}
