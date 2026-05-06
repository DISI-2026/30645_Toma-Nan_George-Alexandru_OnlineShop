"use client"

import { useState } from "react"
import { Star, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ReviewResult {
  id: number
  rating: number
  comment: string | null
  buyer: { id: number; full_name: string | null; avatar_url: string | null }
  created_at: string
  seller_reply: string | null
}

interface ReviewFormProps {
  productSlug: string
  onReviewSubmitted: (review: ReviewResult) => void
}

export default function ReviewForm({ productSlug, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      toast.error("Selecteaza un rating intre 1 si 5 stele.")
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/products/${productSlug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 422) throw new Error("Poti recenzia doar produse pe care le-ai cumparat si livrat.")
        if (response.status === 409) throw new Error("Ai recenzat deja acest produs.")
        throw new Error(data.detail || data.message || "Eroare la trimiterea recenziei")
      }
      onReviewSubmitted(data)
      toast.success("Recenzie trimisa cu succes!")
      setRating(0)
      setComment("")
    } catch (err) {
      toast.error("Eroare", { description: err instanceof Error ? err.message : "Incearca din nou." })
    } finally {
      setLoading(false)
    }
  }

  const starLabel = ["", "Slab", "Acceptabil", "Bun", "Foarte bun", "Excelent"]

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Adauga o recenzie</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Rating *</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${star} stele`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hovered || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              {(hovered || rating) > 0 && (
                <span className="ml-2 text-sm text-gray-600 font-medium">
                  {starLabel[hovered || rating]}
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Comentariu <span className="text-gray-400 font-normal">(optional, max 2000 caractere)</span>
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Descrie experienta ta cu acest produs..."
              disabled={loading}
              className="w-full border border-gray-300 rounded-md p-3 text-sm resize-none focus:border-orange-500 focus:outline-none disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/2000</p>
          </div>

          <Button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se trimite...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Trimite recenzia</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
