"use client"

import { useState, useEffect } from "react"
import { listProducts } from "@/lib/api/products"
import type { ProductListItem, ProductListPagination, ProductListQuery } from "@/lib/types/product"

interface UseProductsResult {
  products: ProductListItem[]
  pagination: ProductListPagination | null
  isLoading: boolean
  error: string | null
}

export function useProducts(query: ProductListQuery): UseProductsResult {
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [pagination, setPagination] = useState<ProductListPagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queryKey = JSON.stringify(query)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    listProducts(JSON.parse(queryKey))
      .then((data) => {
        if (!cancelled) {
          setProducts(data.data)
          setPagination(data.pagination)
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Eroare de rețea.")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [queryKey])

  return { products, pagination, isLoading, error }
}
