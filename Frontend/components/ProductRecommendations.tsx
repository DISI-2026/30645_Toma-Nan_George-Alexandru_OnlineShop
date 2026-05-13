"use client"

import React, { useRef } from "react"
import Link from "next/link"
import { Star, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getImageUrl } from "@/lib/utils"

interface ProductListCategory {
  id: number
  name: string
}

interface ProductListSeller {
  id: number
  company_name: string
  logo_url: string | null
}

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
  category: ProductListCategory
  seller: ProductListSeller
}

interface ProductRecommendationsProps {
  products: ProductListItem[]
  source: "personalized" | "popular"
  isLoading?: boolean
  error?: string | null
  title?: string
}

function StarRating({ rating }: { rating: number | null }) {
  const r = Number(rating ?? 0)
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[...Array(5)].map((_, i) => {
          const fill = Math.min(Math.max(r - i, 0), 1)
          return (
            <span key={i} className="relative inline-block w-3.5 h-3.5">
              <Star className="w-3.5 h-3.5 text-gray-300 absolute inset-0" />
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                </span>
              )}
            </span>
          )
        })}
      </div>
      <span className="text-xs text-gray-600">{r.toFixed(1)}</span>
    </div>
  )
}

export default function ProductRecommendations({
  products,
  source,
  isLoading = false,
  error = null,
  title,
}: ProductRecommendationsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft + (direction === "right" ? scrollAmount : -scrollAmount)
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      })
    }
  }

  // Titlu dinamic bazat pe sursa recomandărilor
  const displayTitle =
    title || (source === "personalized" ? "Recomandate pentru tine" : "Cele mai populare produse")

  // Loading state
  if (isLoading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="ml-2 text-gray-600">Se încarcă recomandările...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="py-8">
        <div className="text-center py-8 text-red-500">
          <p>Nu am putut încărca recomandările.</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (!products || products.length === 0) {
    return null // Nu afișăm nimic dacă nu sunt produse
  }

  return (
    <div className="py-8">
      {/* Header cu titlu și controale */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{displayTitle}</h2>
          {source === "personalized" && (
            <p className="text-sm text-gray-500 mt-1">Pe baza achizițiilor tale anterioare</p>
          )}
          {source === "popular" && (
            <p className="text-sm text-gray-500 mt-1">Produsele preferate de clienții noștri</p>
          )}
        </div>

        {/* Controale de navigare - doar pe desktop */}
        <div className="hidden md:flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            className="rounded-full border-gray-300 hover:border-orange-500 hover:text-orange-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            className="rounded-full border-gray-300 hover:border-orange-500 hover:text-orange-500"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Carusel cu produse */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-4"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="flex-none w-64 snap-start"
            >
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-4 flex flex-col h-full">
                  {/* Imagine produs */}
                  <div className="relative mb-3">
                    <img
                      src={getImageUrl(product.thumbnail_url)}
                      alt={product.title}
                      className="w-full h-40 object-cover rounded-md"
                    />
                    {!product.is_available && (
                      <div className="absolute inset-0 bg-black/40 rounded-md flex items-center justify-center">
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          Stoc epuizat
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Titlu produs */}
                  <h3 className="font-medium text-sm mb-2 line-clamp-2 flex-1 min-h-[2.5rem]">
                    {product.title}
                  </h3>

                  {/* Rating */}
                  <div className="mb-2">
                    <StarRating rating={product.avg_rating} />
                    <span className="text-xs text-gray-500 ml-1">({product.review_count})</span>
                  </div>

                  {/* Preț */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-gray-900">
                      {Number(product.price).toFixed(2)} RON
                    </span>
                    {product.is_available && product.stock <= 5 && product.stock > 0 && (
                      <span className="text-xs text-orange-600 font-medium">
                        Doar {product.stock}!
                      </span>
                    )}
                  </div>

                  {/* Vânzător */}
                  <div className="text-xs text-gray-600 mb-3">
                    de la <span className="text-orange-600 font-medium">{product.seller.company_name}</span>
                  </div>

                  {/* Buton */}
                  <Button
                    className={`w-full ${
                      product.is_available
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-gray-400 cursor-not-allowed"
                    } text-white`}
                    disabled={!product.is_available}
                    onClick={(e) => {
                      // Prevenim navigarea când se dă click pe buton
                      e.preventDefault()
                      if (product.is_available) {
                        window.location.href = `/product/${product.slug}`
                      }
                    }}
                  >
                    {product.is_available ? "Vezi detalii" : "Indisponibil"}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Gradient fade la margini - doar pe desktop */}
        <div className="hidden md:block absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none" />
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
      </div>

      {/* Indicator pentru scroll pe mobile */}
      <div className="md:hidden text-center mt-4">
        <p className="text-xs text-gray-500">← Derulează pentru mai multe produse →</p>
      </div>
    </div>
  )
}
