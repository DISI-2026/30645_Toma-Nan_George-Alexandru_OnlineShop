"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, ShoppingCart, User, Menu, Star, Shield, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { getUser, clearLocalAuth } from "@/lib/auth-utils"
import { logoutUser } from "@/lib/api/auth"
import { useProducts } from "@/hooks/use-products"
import type { ProductListItem, ProductListQuery } from "@/lib/types/product"

const SORT_OPTIONS = [
  { value: "newest", label: "Cele mai noi" },
  { value: "price_asc", label: "Pret: Mic la Mare" },
  { value: "price_desc", label: "Pret: Mare la Mic" },
  { value: "rating_desc", label: "Rating Clienti" },
]

function StarRating({ rating }: { rating: number | null }) {
  const r = Number(rating ?? 0)
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[...Array(5)].map((_, i) => {
          const fill = Math.min(Math.max(r - i, 0), 1) // 0 to 1
          return (
            <span key={i} className="relative inline-block w-4 h-4">
              {/* Empty star */}
              <Star className="w-4 h-4 text-gray-300 absolute inset-0" />
              {/* Filled star*/}
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
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

function TrustBadge({ score }: { score: number }) {
  const { color, label } = score >= 90
    ? { color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Excelent" }
    : score >= 80
    ? { color: "text-blue-600 bg-blue-50 border-blue-200", label: "Foarte bun" }
    : score >= 70
    ? { color: "text-amber-600 bg-amber-50 border-amber-200", label: "Bun" }
    : { color: "text-red-600 bg-red-50 border-red-200", label: "Slab" }
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${color}`}>
      <Shield className="w-3 h-3" />
      <span>Trust {score}%</span>
      <span className="opacity-70">· {label}</span>
    </div>
  )
}

function ProductCard({ product }: { product: ProductListItem }) {
  const isOutOfStock = product.stock === 0 || !product.is_available

  return (
    <Link href={`/product/${product.slug}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardContent className="p-4 flex flex-col h-full">
          <div className="relative mb-3">
            <img
              src={product.thumbnail_url || "/placeholder.svg"}
              alt={product.title}
              className="w-full h-48 object-cover rounded-md"
            />
            {isOutOfStock && (
              <Badge className="absolute top-2 left-2 bg-gray-500 text-white">Stoc epuizat</Badge>
            )}
          </div>

          <h3 className="font-medium text-sm mb-2 line-clamp-2 flex-1">{product.title}</h3>

          <div className="mb-2">
            <StarRating rating={product.avg_rating} />
            <span className="text-xs text-gray-500">{product.review_count} recenzii</span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold text-gray-900">{Number(product.price).toFixed(2)} RON</span>
          </div>

          <div className="text-xs text-gray-600 mb-2">
            de la <span className="text-orange-600">{product.seller.company_name}</span>
          </div>

          <div className="mb-3">
            <TrustBadge score={Math.min(100, Math.round(Number(product.avg_rating) * 20))} />
          </div>

          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-auto"
            disabled={isOutOfStock}
            onClick={(e) => e.preventDefault()}
          >
            {isOutOfStock ? "Stoc epuizat" : "Adaugă în Coș"}
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function BuyerHomepage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ id: number; email: string; role: string } | null>(null)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])

  // Filter state
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [priceRange, setPriceRange] = useState([0, 10000])
  const [appliedPriceRange, setAppliedPriceRange] = useState([0, 10000])
  const [minRating, setMinRating] = useState(0)
  const [sort, setSort] = useState<ProductListQuery["sort"]>("newest")
  const [page, setPage] = useState(1)

  const query: ProductListQuery = {
    ...(searchQuery ? { q: searchQuery } : {}),
    ...(selectedCategoryIds.length === 1 ? { category_id: selectedCategoryIds[0] } : {}),
    min_price: appliedPriceRange[0] > 0 ? appliedPriceRange[0] : undefined,
    max_price: appliedPriceRange[1] < 10000 ? appliedPriceRange[1] : undefined,
    ...(minRating > 0 ? { min_rating: minRating } : {}),
    sort,
    page,
    page_size: 20,
  }

  const { products, pagination, isLoading, error } = useProducts(query)

  useEffect(() => {
    setUser(getUser())
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    fetch(`${API_URL}/api/v1/categories`)
      .then((r) => r.json())
      .then((data) => setCategories(data.items ?? data.data ?? data))
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await logoutUser()
    clearLocalAuth()
    setUser(null)
    router.push("/login")
  }

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }, [searchInput])

  const handleCategoryChange = (id: number, checked: boolean) => {
    setPage(1)
    setSelectedCategoryIds((prev) =>
      checked ? [...prev, id] : prev.filter((c) => c !== id)
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="md:hidden text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div className="text-xl font-bold">
                <span className="text-orange-500">Shop</span>
                <span className="text-white">Verse</span>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <Input
                  placeholder="Cauta produse..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-4 pr-12 py-2 rounded-md border-orange-500 text-slate-900"
                />
                <Button type="submit" size="sm" className="absolute right-1 top-1 bg-orange-500 hover:bg-orange-600 text-white">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </form>

            <div className="flex items-center gap-2">
              <Link href="/checkout">
                <Button variant="ghost" size="sm" className="text-white hover:text-orange-400">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="ml-1 hidden sm:inline">Coș (0)</span>
                </Button>
              </Link>
              {user ? (
                <>
                  <Link href="/buyer/profile">
                    <Button variant="ghost" size="sm" className="text-orange-300 hover:text-orange-400 hidden sm:flex">
                      <User className="w-4 h-4 mr-1" />
                      {user.email}
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-1" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
                      <User className="w-4 h-4 mr-1" />Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">Register</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className={`w-64 shrink-0 bg-white rounded-lg p-6 h-fit sticky top-24 border border-gray-200 shadow-sm ${sidebarOpen ? "block" : "hidden md:block"}`}>
            <h3 className="font-semibold mb-4 text-slate-900">Filtre</h3>

            {/* Categories */}
            <div className="mb-6">
              <h4 className="font-medium mb-3 text-slate-800">Categorii</h4>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cat-${cat.id}`}
                      checked={selectedCategoryIds.includes(cat.id)}
                      onCheckedChange={(checked) => handleCategoryChange(cat.id, checked as boolean)}
                    />
                    <label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">{cat.name}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h4 className="font-medium mb-3 text-slate-800">Interval Preț</h4>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Min (RON)</label>
                  <input
                    type="number"
                    min={0}
                    max={priceRange[1]}
                    value={priceRange[0]}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setPriceRange([v, priceRange[1]])
                    }}
                    onBlur={() => { setAppliedPriceRange(priceRange); setPage(1) }}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Max (RON)</label>
                  <input
                    type="number"
                    min={priceRange[0]}
                    max={10000}
                    value={priceRange[1]}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setPriceRange([priceRange[0], v])
                    }}
                    onBlur={() => { setAppliedPriceRange(priceRange); setPage(1) }}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <Slider
                value={priceRange}
                onValueChange={(v) => setPriceRange(v)}
                onValueCommit={(v) => { setAppliedPriceRange(v); setPage(1) }}
                min={0}
                max={10000}
                step={50}
                className="mb-1"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0 RON</span>
                <span>10000 RON</span>
              </div>
            </div>

            {/* Min Rating */}
            <div className="mb-6">
              <h4 className="font-medium mb-3 text-slate-800">Rating minim</h4>
              <div className="space-y-2">
                {[4, 3, 2, 1].map((r) => (
                  <div key={r} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rating-${r}`}
                      checked={minRating === r}
                      onCheckedChange={(checked) => { setMinRating(checked ? r : 0); setPage(1) }}
                    />
                    <label htmlFor={`rating-${r}`} className="flex items-center text-sm cursor-pointer">
                      {[...Array(r)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                      <span className="ml-1">și mai mult</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset */}
            <Button
              variant="outline"
              size="sm"
              className="w-full border-orange-500 text-orange-600"
              onClick={() => {
                setSelectedCategoryIds([])
                setPriceRange([0, 10000])
                setAppliedPriceRange([0, 10000])
                setMinRating(0)
                setSearchInput("")
                setSearchQuery("")
                setSort("newest")
                setPage(1)
              }}
            >
              Resetează filtrele
            </Button>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-slate-900">
                {searchInput ? `Rezultate pentru "${searchInput}"` : "Produse"}
              </h2>
              <div className="flex items-center gap-4">
                {pagination && (
                  <span className="text-sm text-gray-600">
                    {pagination.total_items} rezultate
                  </span>
                )}
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value as ProductListQuery["sort"]); setPage(1) }}
                  className="border border-orange-300 rounded-md px-3 py-1 text-sm focus:border-orange-500"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Trust Banner */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-slate-900">Platformă verificată</span>
                <span className="text-sm text-slate-700 ml-2">Toți vânzătorii sunt verificați înainte de a lista produse.</span>
              </div>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <div className="text-center py-24 text-red-500">{error}</div>
            )}

            {/* Empty */}
            {!isLoading && !error && products.length === 0 && (
              <div className="text-center py-24 text-gray-500">Nu au fost găsite produse.</div>
            )}

            {/* Grid */}
            {!isLoading && !error && products.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.total_pages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="border-orange-500 text-orange-600"
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-gray-600">
                      Pagina {pagination.page} din {pagination.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === pagination.total_pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="border-orange-500 text-orange-600"
                    >
                      Următor
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
