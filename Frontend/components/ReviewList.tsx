"use client"

import { Star, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
        />
      ))}
    </div>
  )
}

interface BuyerInfo {
  id: number
  full_name?: string | null
  avatar_url?: string | null
}

interface ReviewItem {
  id: number
  rating: number
  comment: string | null
  created_at: string
  seller_reply?: string | { comment: string; replied_at: string } | null
  buyer?: BuyerInfo
  buyer_name?: string
  user_id?: number
}

function Avatar({ buyer, buyerName, userId }: { buyer?: BuyerInfo; buyerName?: string; userId?: number }) {
  // Dacă avem buyer object
  if (buyer) {
    if (buyer.avatar_url) {
      return <img src={buyer.avatar_url} alt={buyer.full_name ?? "User"} className="w-9 h-9 rounded-full object-cover" />
    }
    const initials = (buyer.full_name ?? buyer.id.toString()).slice(0, 2).toUpperCase()
    return (
      <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold shrink-0">
        {initials}
      </div>
    )
  }
  
  // Dacă avem buyer_name sau user_id (pentru seller reviews)
  const displayName = buyerName || (userId ? `User ${userId}` : "User")
  const initials = displayName.slice(0, 2).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold shrink-0">
      {initials}
    </div>
  )
}

interface ReviewListProps {
  reviews: ReviewItem[]
  totalCount: number
}

export default function ReviewList({ reviews, totalCount }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p>Nicio recenzie inca. Fii primul care recenzeaza!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{totalCount} recenzie(i)</p>
      {reviews.map((review) => {
        const displayName = review.buyer?.full_name 
          || review.buyer_name 
          || (review.user_id ? `User ${review.user_id}` : "Utilizator anonim")
        
        return (
          <Card key={review.id} className="border border-gray-100 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar buyer={review.buyer} buyerName={review.buyer_name} userId={review.user_id} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium text-sm text-slate-800">
                      {displayName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString("ro-RO")}
                    </span>
                  </div>
                  <StarDisplay rating={review.rating} />
                  {review.comment && (
                    <p className="mt-2 text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                  )}
                  {review.seller_reply && (
                    <div className="mt-3 bg-orange-50 border border-orange-100 rounded-md p-3">
                      <p className="text-xs font-semibold text-orange-700 mb-1">Raspuns vanzator:</p>
                      <p className="text-sm text-gray-700">
                        {typeof review.seller_reply === 'string' 
                          ? review.seller_reply 
                          : review.seller_reply.comment}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
