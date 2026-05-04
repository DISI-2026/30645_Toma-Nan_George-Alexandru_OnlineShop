"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Star, Heart, Share2, ShoppingCart, Truck, RotateCcw, Award, Search, LogOut, Menu } from "lucide-react"
import { logout, getUser } from "@/lib/auth-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useProduct } from "@/hooks/use-product"
import ReviewForm from "@/components/ReviewForm"
import ReviewList from "@/components/ReviewList"

import { isOutOfStock, getDiscountedPrice } from "@/lib/types/product"
import type { ProductImage } from "@/lib/types/product"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface Review {
  id: number
  rating: number
  comment: string | null
  buyer: { id: number; full_name: string | null; avatar_url: string | null }
  created_at: string
  seller_reply: string | null
}

async function fetchReviews(slug: string): Promise<{ data: Review[]; total: number }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/products/${slug}/reviews?page=1&page_size=10`)
    if (!res.ok) return { data: [], total: 0 }
    const json = await res.json()
    return { data: json.data ?? [], total: json.pagination?.total_items ?? 0 }
  } catch {
    return { data: [], total: 0 }
  }
}

function formatPrice(price: number | string, currency = "RON"): string {
  return `${Number(price).toFixed(2)} ${currency}`
}

function TrustBadge({ score }: { score: number }) {
  const getScoreData = (s: number) => {
    if (s >= 90) return { color: "bg-emerald-50 border-emerald-200 text-emerald-800", label: "Excellent", barColor: "bg-emerald-500" }
    if (s >= 80) return { color: "bg-blue-50 border-blue-200 text-blue-800", label: "Very Good", barColor: "bg-blue-500" }
    if (s >= 70) return { color: "bg-amber-50 border-amber-200 text-amber-800", label: "Good", barColor: "bg-amber-500" }
    return { color: "bg-red-50 border-red-200 text-red-800", label: "Poor", barColor: "bg-red-500" }
  }
  const d = getScoreData(score)
  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl border ${d.color}`}>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Trust Score</span>
          <span className="text-lg font-bold">{score}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full ${d.barColor}`} style={{ width: `${score}%` }} />
          </div>
          <span className="text-xs opacity-75">{d.label}</span>
        </div>
      </div>
    </div>
  )
}

function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-4 h-4" : "w-5 h-5"
  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`${cls} ${i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
      ))}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-600 text-lg">{message}</p>
      <Button onClick={onBack} variant="outline">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Înapoi
      </Button>
    </div>
  )
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { product, isLoading, error } = useProduct(id)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const router = useRouter()
  const user = getUser()

  useEffect(() => {
    if (!id) return
    setReviewsLoading(true)
    fetchReviews(id)
      .then(({ data, total }) => {
        setReviews(data)
        setReviewsTotal(total)
      })
      .finally(() => setReviewsLoading(false))
  }, [id])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (isLoading) return <LoadingSpinner />
  if (error || !product) return <ErrorState message={error ?? "Produsul nu a fost gasit."} onBack={() => window.history.back()} />

  const outOfStock = isOutOfStock(product)

  const sortedImages: ProductImage[] = [...product.images].sort((a, b) => {
    if (a.is_thumbnail && !b.is_thumbnail) return -1
    if (!a.is_thumbnail && b.is_thumbnail) return 1
    return a.order - b.order
  })

  const currentImageUrl = sortedImages[selectedImage]?.url ?? "/placeholder.svg"

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="md:hidden text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="w-5 h-5" />
              </Button>
              <Link href="/">
                <div className="text-xl font-bold cursor-pointer">
                  <span className="text-orange-500">Shop</span>
                  <span className="text-white">Verse</span>
                </div>
              </Link>
            </div>
            <div className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <Input placeholder="Cauta produse..." className="w-full pl-4 pr-12 py-2 rounded-md border-orange-500 text-slate-900" />
                <Button size="sm" className="absolute right-1 top-1 bg-orange-500 text-white">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center">
              <Link href="/" onClick={handleLogout}>
                <Button variant="outline" size="sm" className="border-red-500 text-red-500 hover:bg-orange-500 hover:text-white">
                  <LogOut className="w-4 h-4 mr-2" />Deconectare
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg p-4">
              <img src={currentImageUrl} alt={product.title} className="w-full h-full object-cover rounded-md" />
            </div>
            {sortedImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {sortedImages.map((img, index) => (
                  <button
                    key={`img-${img.id}-${index}`}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square bg-white rounded-md p-2 border-2 ${selectedImage === index ? "border-blue-500" : "border-gray-200"}`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover rounded" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{product.title}</h1>
              <div className="flex items-center gap-4 mb-4">
                <StarRating rating={product.avg_rating} />
                <span className="text-sm text-gray-600">
                  {Number(product.avg_rating).toFixed(1)} ({product.review_count} recenzii)
                </span>
              </div>
            </div>

            <TrustBadge score={Math.round(Number(product.seller.avg_rating) * 20)} />

            <div className="flex items-center gap-4">
              {product.discount_percent > 0 ? (
                <>
                  <span className="text-3xl font-bold text-red-600">
                    {formatPrice(getDiscountedPrice(product))}
                  </span>
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(product.price)}
                  </span>
                  <Badge className="bg-red-500 text-white text-sm px-2 py-1">
                    -{product.discount_percent}%
                  </Badge>
                </>
              ) : (
                <span className="text-3xl font-bold text-red-600">{formatPrice(product.price)}</span>
              )}
              {outOfStock && (
                <Badge className="bg-gray-200 text-gray-700 text-sm px-3 py-1">Out of stock</Badge>
              )}
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {product.seller.logo_url ? (
                      <img src={product.seller.logo_url} alt={product.seller.company_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {product.seller.company_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{product.seller.company_name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <StarRating rating={product.seller.avg_rating} size="sm" />
                        <span>{Number(product.seller.avg_rating).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View Store</Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 p-4 bg-white rounded-lg border">
              {!outOfStock && (
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Cantitate:</label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="border rounded px-3 py-1"
                  >
                    {[...Array(Math.min(product.stock, 10))].map((_, i) => (
                      <option key={`qty-${i + 1}`} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black text-lg py-3"
                  disabled={outOfStock}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {outOfStock ? "Out of stock" : "Adaugă în coș"}
                </Button>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-3"
                  disabled={outOfStock}
                >
                  Cumpără acum
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Heart className="w-4 h-4 mr-2" />Salvează
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />Distribuie
                </Button>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-green-600" /><span>Livrare gratuită</span></div>
              <div className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-blue-600" /><span>Returnare gratuită în 30 de zile</span></div>
              <div className="flex items-center gap-2"><Award className="w-4 h-4 text-purple-600" /><span>Garanție producător</span></div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="description">Descriere</TabsTrigger>
            <TabsTrigger value="reviews">Recenzii ({product.review_count})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
              {/* Summary */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-2">
                    <div className="text-4xl font-bold mb-2">{Number(product.avg_rating).toFixed(1)}</div>
                    <div className="flex justify-center mb-2"><StarRating rating={product.avg_rating} /></div>
                    <div className="text-sm text-gray-600">{reviewsTotal} recenzie(i)</div>
                  </div>
                </CardContent>
              </Card>

              {/* Form - only for logged in buyers */}
              {user?.role === "buyer" && (
                <ReviewForm
                  productId={product.id}
                  onReviewSubmitted={(review) => {
                    setReviews(prev => [review, ...prev])
                    setReviewsTotal(prev => prev + 1)
                  }}
                />
              )}

              {/* List */}
              {reviewsLoading ? (
                <div className="text-center py-8 text-gray-400">Se incarca recenziile...</div>
              ) : (
                <ReviewList reviews={reviews} totalCount={reviewsTotal} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
