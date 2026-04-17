"use client"

import { useState } from "react"
import { Star, ArrowLeft, Camera, Shield, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const product = {
  name: "Wireless Bluetooth Headphones",
  image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop",
  seller: "TechGear Pro",
}

export default function ReviewPage() {
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)

  const handleSubmit = () => {
    // Simulate AI analysis
    const analysis = {
      authenticityScore: 85,
      sentimentScore: 92,
      helpfulnessScore: 78,
      overallTrustScore: 85,
      feedback: "Your review appears authentic and helpful. It will be published immediately.",
    }
    setAiAnalysis(analysis)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">Review Submitted</h1>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Thank you for your review!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Analysis Results */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">AI Review Analysis</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Authenticity Score</span>
                      <span className="font-medium">{aiAnalysis.authenticityScore}%</span>
                    </div>
                    <Progress value={aiAnalysis.authenticityScore} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Sentiment Analysis</span>
                      <span className="font-medium">{aiAnalysis.sentimentScore}%</span>
                    </div>
                    <Progress value={aiAnalysis.sentimentScore} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Helpfulness Score</span>
                      <span className="font-medium">{aiAnalysis.helpfulnessScore}%</span>
                    </div>
                    <Progress value={aiAnalysis.helpfulnessScore} className="h-2" />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-white rounded border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-100 text-green-800">Trust Score: {aiAnalysis.overallTrustScore}%</Badge>
                  </div>
                  <p className="text-sm text-gray-700">{aiAnalysis.feedback}</p>
                </div>
              </div>

              {/* Review Summary */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Your Review</h3>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">for {product.name}</span>
                </div>
                <p className="text-sm text-gray-700">{reviewText}</p>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1">View Product</Button>
                <Button variant="outline" className="flex-1">
                  Write Another Review
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Product
            </Button>
            <h1 className="text-2xl font-bold">Write a Review</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Review Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <img
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div>
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-gray-600">by {product.seller}</p>
              </div>
            </div>

            {/* Rating */}
            <div>
              <Label className="text-base font-medium mb-3 block">Overall Rating</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className="transition-colors">
                    <Star className={`w-8 h-8 ${star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {rating === 0
                    ? "Click to rate"
                    : rating === 1
                      ? "Poor"
                      : rating === 2
                        ? "Fair"
                        : rating === 3
                          ? "Good"
                          : rating === 4
                            ? "Very Good"
                            : "Excellent"}
                </span>
              </div>
            </div>

            {/* Review Text */}
            <div>
              <Label htmlFor="review" className="text-base font-medium mb-3 block">
                Write Your Review
              </Label>
              <Textarea
                id="review"
                placeholder="Share your experience with this product. What did you like or dislike? How was the quality, shipping, and overall experience?"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="min-h-32"
              />
              <p className="text-xs text-gray-600 mt-2">
                Minimum 20 characters. Be specific and honest to help other buyers.
              </p>
            </div>

            {/* Photo Upload */}
            <div>
              <Label className="text-base font-medium mb-3 block">Add Photos (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload photos</p>
                <p className="text-xs text-gray-500">JPG, PNG up to 5MB each</p>
              </div>
            </div>

            {/* AI Trust Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">AI Review Verification</span>
              </div>
              <p className="text-sm text-blue-800">
                Our AI system will analyze your review for authenticity and helpfulness. High-quality reviews are
                published immediately and help build trust in our marketplace.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || reviewText.length < 20}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Submit Review
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
