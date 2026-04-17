"use client"

import { useState } from "react"
import { ArrowLeft, Star, Heart, Share2, ShoppingCart, Truck, RotateCcw, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

// Mock product data
const product = {
  id: 1,
  name: "Wireless Bluetooth Headphones - Premium Sound Quality",
  price: 79.99,
  originalPrice: 99.99,
  images: [
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&h=600&fit=crop",
  ],
  rating: 4.5,
  totalReviews: 1247,
  seller: {
    name: "TechGear Pro",
    rating: 4.7,
    totalSales: 15420,
  },
  trustScore: 92,
  inStock: true,
  features: [
    "Active Noise Cancellation",
    "30-hour battery life",
    "Quick charge: 5 min = 3 hours",
    "Premium leather comfort",
    "Bluetooth 5.0 connectivity",
  ],
  description:
    "Experience premium audio quality with our wireless Bluetooth headphones. Featuring advanced noise cancellation technology and exceptional battery life, these headphones are perfect for music lovers and professionals alike.",
  specifications: {
    Brand: "TechGear Pro",
    Model: "TG-WH500",
    Connectivity: "Bluetooth 5.0",
    "Battery Life": "30 hours",
    "Charging Time": "2 hours",
    Weight: "250g",
    Warranty: "2 years",
  },
}

const reviews = [
  {
    id: 1,
    user: "Sarah M.",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    date: "2024-01-15",
    verified: true,
    trustScore: 95,
    title: "Excellent sound quality!",
    content:
      "These headphones exceeded my expectations. The noise cancellation is fantastic and the battery life is exactly as advertised. Highly recommend!",
    helpful: 23,
  },
  {
    id: 2,
    user: "Mike R.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    rating: 4,
    date: "2024-01-10",
    verified: true,
    trustScore: 87,
    title: "Great value for money",
    content:
      "Good headphones for the price. Comfortable to wear for long periods. The only minor issue is that the touch controls can be a bit sensitive.",
    helpful: 18,
  },
  {
    id: 3,
    user: "Jennifer L.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    date: "2024-01-08",
    verified: true,
    trustScore: 92,
    title: "Perfect for work calls",
    content:
      "I use these for video calls all day and the microphone quality is excellent. Colleagues say I sound very clear.",
    helpful: 15,
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
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl border ${scoreData.color}`}>
      <span className="text-lg">{scoreData.icon}</span>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Trust Score</span>
          <span className="text-lg font-bold">{score}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
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

export default function ProductDetailPage() {
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Results
            </Button>
            <div className="text-sm text-gray-600">Electronics &gt; Audio &gt; Headphones &gt; Wireless</div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg p-4">
              <img
                src={product.images[selectedImage] || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover rounded-md"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square bg-white rounded-md p-2 border-2 ${
                    selectedImage === index ? "border-blue-500" : "border-gray-200"
                  }`}
                >
                  <img src={image || "/placeholder.svg"} alt="" className="w-full h-full object-cover rounded" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {product.rating} ({product.totalReviews} reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Trust Score - make it more prominent */}
            <div className="mb-6">
              <TrustBadge score={product.trustScore} />
            </div>

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-red-600">${product.price}</span>
              {product.originalPrice && (
                <span className="text-lg text-gray-500 line-through">${product.originalPrice}</span>
              )}
              {product.originalPrice && (
                <Badge className="bg-red-500 text-white">
                  Save ${(product.originalPrice - product.price).toFixed(2)}
                </Badge>
              )}
            </div>

            {/* Seller Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Sold by {product.seller.name}</div>
                    <div className="text-sm text-gray-600">
                      {product.seller.totalSales.toLocaleString()} sales • {product.seller.rating}★ rating
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Store
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Key Features */}
            <div>
              <h3 className="font-semibold mb-3">Key Features</h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Purchase Options */}
            <div className="space-y-4 p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Quantity:</label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="border rounded px-3 py-1"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black text-lg py-3">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-3">Buy Now</Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Heart className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-green-600" />
                <span>Free delivery by Thursday, Jan 25</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-blue-600" />
                <span>Free returns within 30 days</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span>2-year manufacturer warranty</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({product.totalReviews})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="font-medium">{key}</span>
                      <span className="text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
              {/* Review Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold mb-2">{product.rating}</div>
                      <div className="flex justify-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-gray-600">{product.totalReviews} total reviews</div>
                    </div>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="flex items-center gap-2">
                          <span className="text-sm w-8">{rating}★</span>
                          <Progress
                            value={rating === 5 ? 65 : rating === 4 ? 25 : rating === 3 ? 7 : rating === 2 ? 2 : 1}
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-600 w-8">
                            {rating === 5
                              ? "65%"
                              : rating === 4
                                ? "25%"
                                : rating === 3
                                  ? "7%"
                                  : rating === 2
                                    ? "2%"
                                    : "1%"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Reviews */}
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarImage src={review.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{review.user[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{review.user}</span>
                            {review.verified && (
                              <Badge className="bg-green-100 text-green-800 text-xs">Verified Purchase</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">{review.date}</span>
                          </div>
                          <h4 className="font-medium mb-2">{review.title}</h4>
                          <p className="text-gray-700 mb-3">{review.content}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <button className="hover:text-blue-600">Helpful ({review.helpful})</button>
                            <button className="hover:text-blue-600">Report</button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="text-center">
                <Button variant="outline">Load More Reviews</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
