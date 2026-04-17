"use client"

import { useState } from "react"
import { Search, ShoppingCart, User, Menu, Star, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"

// Mock data
const categories = ["Electronice", "Imbracaminte", "Casa & Gradina", "Sport", "Carti", "Jucarii", "Frumusete", "Auto"]

const products = [
  {
    id: 1,
    name: "Casti Wireless Bluetooth",
    price: 399.99,
    originalPrice: 499.99,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
    rating: 4.5,
    reviews: 1247,
    seller: "TechGear Pro",
    trustScore: 92,
    category: "Electronice",
  },
  {
    id: 2,
    name: "Tricou Premium din Bumbac",
    price: 124.99,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
    rating: 4.3,
    reviews: 856,
    seller: "Fashion Forward",
    trustScore: 85,
    category: "Imbracaminte",
  },
  {
    id: 3,
    name: "Camera Smart de Securitate",
    price: 749.99,
    originalPrice: 999.99,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    rating: 4.7,
    reviews: 2103,
    seller: "SecureHome Tech",
    trustScore: 96,
    category: "Electronice",
  },
  {
    id: 4,
    name: "Cafea Boabe Organica 1kg",
    price: 94.99,
    image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop",
    rating: 4.6,
    reviews: 743,
    seller: "Mountain Roasters",
    trustScore: 89,
    category: "Alimente",
  },
  {
    id: 5,
    name: "Saltea Yoga Premium",
    price: 199.99,
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
    rating: 4.4,
    reviews: 512,
    seller: "FitLife Essentials",
    trustScore: 83,
    category: "Sport",
  },
  {
    id: 6,
    name: "Lampa LED Birou cu USB",
    price: 174.99,
    originalPrice: 249.99,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    rating: 4.2,
    reviews: 328,
    seller: "Office Solutions",
    trustScore: 78,
    category: "Casa & Gradina",
  },
]

function TrustBadge({ score }: { score: number }) {
  const getScoreData = (score: number) => {
    if (score >= 90)
      return {
        color: "bg-emerald-50 border-emerald-200 text-emerald-800",
        icon: "🛡️",
        label: "Excellent",
        barColor: "bg-emerald-500",
      }
    if (score >= 80)
      return {
        color: "bg-blue-50 border-blue-200 text-blue-800",
        icon: "✅",
        label: "Very Good",
        barColor: "bg-blue-500",
      }
    if (score >= 70)
      return {
        color: "bg-amber-50 border-amber-200 text-amber-800",
        icon: "⚠️",
        label: "Good",
        barColor: "bg-amber-500",
      }
    return {
      color: "bg-red-50 border-red-200 text-red-800",
      icon: "❌",
      label: "Poor",
      barColor: "bg-red-500",
    }
  }

  const scoreData = getScoreData(score)

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${scoreData.color}`}>
      <span className="text-sm">{scoreData.icon}</span>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Trust Score</span>
          <span className="text-sm font-bold">{score}%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${scoreData.barColor} transition-all duration-300`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="text-xs opacity-75">{scoreData.label}</span>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product }: { product: (typeof products)[0] }) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="relative mb-3">
          <img
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-48 object-cover rounded-md"
          />
          {product.originalPrice && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white">
              Economisesti {(product.originalPrice - product.price).toFixed(2)} RON
            </Badge>
          )}
        </div>

        <h3 className="font-medium text-sm mb-2 line-clamp-2">{product.name}</h3>

        <div className="flex items-center mb-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600 ml-1">({product.reviews})</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg font-bold text-gray-900">{product.price} RON</span>
          {product.originalPrice && (
            <span className="text-sm text-gray-500 line-through">{product.originalPrice} RON</span>
          )}
        </div>

        <div className="text-xs text-gray-600 mb-3">
          de la <span className="text-orange-600 hover:underline">{product.seller}</span>
        </div>

        <div className="mb-3">
          <TrustBadge score={product.trustScore} />
        </div>

        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">Adauga in Cos</Button>
      </CardContent>
    </Card>
  )
}

export default function BuyerHomepage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState([0, 1000])
  const [trustScore, setTrustScore] = useState([70])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, category])
    } else {
      setSelectedCategories(selectedCategories.filter((c) => c !== category))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-white"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="text-xl font-bold">
                <span className="text-orange-500">Shop</span>
                <span className="text-white">Verse</span>
              </div>
            </div>

            <div className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <Input placeholder="Cauta produse..." className="w-full pl-4 pr-12 py-2 rounded-md border-orange-500 focus:border-orange-600" />
                <Button size="sm" className="absolute right-1 top-1 bg-orange-500 hover:bg-orange-600 text-white">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white hover:text-orange-400">
                <ShoppingCart className="w-5 h-5" />
                <span className="ml-1 hidden sm:inline">Cos (0)</span>
              </Button>
              <Button variant="outline" size="sm" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
                <User className="w-4 h-4 mr-1" />
                Login
              </Button>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                Register
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside
            className={`w-64 bg-white rounded-lg p-6 h-fit sticky top-24 border border-gray-200 shadow-sm ${sidebarOpen ? "block" : "hidden md:block"}`}
          >
            <h3 className="font-semibold mb-4 text-slate-900">Filtre</h3>

            {/* Categories */}
            <div className="mb-6">
              <h4 className="font-medium mb-3 text-slate-800">Categorii</h4>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                    />
                    <label htmlFor={category} className="text-sm">
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h4 className="font-medium mb-3 text-slate-800">Interval Pret</h4>
              <Slider value={priceRange} onValueChange={setPriceRange} max={2500} step={50} className="mb-2" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{priceRange[0]} RON</span>
                <span>{priceRange[1]} RON</span>
              </div>
            </div>

            {/* Trust Score */}
            <div className="mb-6">
              <h4 className="font-medium mb-3 text-slate-800">Scor Incredere Minim</h4>
              <Slider value={trustScore} onValueChange={setTrustScore} max={100} step={5} className="mb-2" />
              <div className="text-sm text-gray-600">{trustScore[0]}% si mai mult</div>
            </div>

            {/* Seller Rating */}
            <div className="mb-6">
              <h4 className="font-medium mb-3 text-slate-800">Rating Vanzator</h4>
              <div className="space-y-2">
                {[4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <Checkbox id={`rating-${rating}`} />
                    <label htmlFor={`rating-${rating}`} className="flex items-center text-sm">
                      <div className="flex">
                        {[...Array(rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <span className="ml-1">si mai mult</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-slate-900">Produse Recomandate</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">1-24 din 1,000+ rezultate</span>
                <select className="border border-orange-300 rounded-md px-3 py-1 text-sm focus:border-orange-500 focus:ring-orange-500">
                  <option>Cele mai relevante</option>
                  <option>Pret: Mic la Mare</option>
                  <option>Pret: Mare la Mic</option>
                  <option>Rating Clienti</option>
                  <option>Scor Incredere</option>
                </select>
              </div>
            </div>

            {/* Trust Score Info Banner */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-slate-900">Scor de Incredere AI</span>
              </div>
              <p className="text-sm text-slate-700">
                Sistemul nostru AI analizeaza istoricul vanzatorilor, autenticitatea produselor si calitatea recenziilor pentru a oferi scoruri de incredere. Scorurile mai mari indica vanzatori mai de incredere si produse autentice.
              </p>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Load More */}
            <div className="text-center mt-8">
              <Button variant="outline" className="px-8 border-orange-500 text-orange-600 hover:bg-orange-50">
                Incarca Mai Multe Produse
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
