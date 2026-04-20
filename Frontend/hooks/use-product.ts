"use client"

import { useState, useEffect } from "react"
import { getProductById } from "@/lib/api/products"
import type { Product } from "@/lib/types/product"

interface UseProductResult {
  product: Product | null
  isLoading: boolean
  error: string | null
}

export function useProduct(id: string): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function fetchProduct() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getProductById(id)
        if (!cancelled) setProduct(data)
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Eroare de rețea. Încearcă din nou.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchProduct()
    return () => { cancelled = true }
  }, [id])

  return { product, isLoading, error }
}
