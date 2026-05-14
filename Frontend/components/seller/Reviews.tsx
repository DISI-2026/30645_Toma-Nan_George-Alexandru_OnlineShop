"use client"

import React, { useState, useEffect } from "react"
import { MessageSquare, Star, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSellerReviews, replyToReview, type Review } from "@/lib/api/reviews"

// Mock data pentru testare - ȘTERGE DUPĂ IMPLEMENTAREA BACKEND-ULUI (Task #122)
const MOCK_REVIEWS: Review[] = [
  {
    id: 1,
    product_id: 101,
    product_title: "Wireless Headphones Pro",
    buyer_name: "Maria Popescu",
    rating: 5,
    comment: "Produsul este excelent! Calitatea sunetului este impresionantă și sunt foarte confortabile. Recomand cu încredere!",
    created_at: "2024-05-10T14:30:00Z",
    seller_reply: null
  },
  {
    id: 2,
    product_id: 102,
    product_title: "USB-C Cable 2m",
    buyer_name: "Ion Ionescu",
    rating: 4,
    comment: "Cablul este de calitate bună, dar aș fi preferat să fie puțin mai lung. În rest, funcționează perfect.",
    created_at: "2024-05-12T10:15:00Z",
    seller_reply: null
  },
  {
    id: 3,
    product_id: 103,
    product_title: "Phone Stand Adjustable",
    buyer_name: "Elena Dumitrescu",
    rating: 3,
    comment: "Produsul este ok, dar plasticul pare cam fragil. Sper să reziste în timp.",
    created_at: "2024-05-13T16:45:00Z",
    seller_reply: null
  },
  {
    id: 4,
    product_id: 104,
    product_title: "Laptop Sleeve 15\"",
    buyer_name: "Andrei Radu",
    rating: 5,
    comment: "Foarte mulțumit de achiziție! Materialul este de calitate premium și protejează laptopul perfect.",
    created_at: "2024-05-08T09:20:00Z",
    seller_reply: {
      comment: "Vă mulțumim pentru feedback-ul pozitiv! Ne bucurăm că produsul nostru vă protejează laptopul în siguranță. Vă așteptăm cu drag și la alte comenzi!",
      replied_at: "2024-05-09T11:30:00Z"
    }
  },
  {
    id: 5,
    product_id: 105,
    product_title: "Bluetooth Speaker Mini",
    buyer_name: "Cristina Vasile",
    rating: 2,
    comment: "Dezamăgitor. Sunetul este slab și bateria nu ține cât promite. Nu recomand.",
    created_at: "2024-05-14T13:00:00Z",
    seller_reply: null
  }
]

export default function SellerReviews() {
  // MOCK: Folosim date statice pentru testare
  // După implementarea backend-ului (Task #122), decomentează loadReviews() și șterge MOCK_REVIEWS
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS)
  const [isLoading, setIsLoading] = useState(false) // false pentru a afișa imediat mock data
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({})
  const [sendingReply, setSendingReply] = useState<{ [key: number]: boolean }>({})

  useEffect(() => {
    // MOCK: Comentat pentru testare
    // loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      setIsLoading(true)
      const response = await getSellerReviews()
      setReviews(response.data)
    } catch (error) {
      console.error("Eroare la încărcarea recenziilor:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReplyChange = (reviewId: number, text: string) => {
    setReplyText(prev => ({ ...prev, [reviewId]: text }))
  }

  const handleSendReply = async (reviewId: number) => {
    const comment = replyText[reviewId]?.trim()
    
    if (!comment) {
      alert("Te rog să scrii un răspuns înainte de a trimite.")
      return
    }

    if (comment.length > 1000) {
      alert("Răspunsul nu poate depăși 1000 de caractere.")
      return
    }

    try {
      setSendingReply(prev => ({ ...prev, [reviewId]: true }))
      
      // MOCK: Simulăm trimiterea răspunsului
      // După implementarea backend-ului (Task #122), decomentează linia de mai jos
      // const updatedReview = await replyToReview(reviewId, comment)
      
      // MOCK: Simulăm răspunsul de la server
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulăm delay de rețea
      
      const updatedReview: Review = {
        ...reviews.find(r => r.id === reviewId)!,
        seller_reply: {
          comment: comment,
          replied_at: new Date().toISOString()
        }
      }
      
      // Actualizează lista de recenzii cu răspunsul nou
      setReviews(prev =>
        prev.map(review =>
          review.id === reviewId ? updatedReview : review
        )
      )
      
      // Resetează câmpul de text
      setReplyText(prev => ({ ...prev, [reviewId]: "" }))
      
      alert("Răspunsul a fost trimis cu succes!")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Eroare la trimiterea răspunsului.")
    } finally {
      setSendingReply(prev => ({ ...prev, [reviewId]: false }))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-slate-300"
            }`}
          />
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white border rounded-xl shadow-sm p-8 text-center">
        <p className="text-slate-600">Se încarcă recenziile...</p>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white border rounded-xl shadow-sm p-8 text-center">
        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 text-lg font-medium">Nu există recenzii încă</p>
        <p className="text-slate-500 text-sm mt-2">
          Recenziile clienților vor apărea aici după ce produsele tale primesc feedback.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id} className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-slate-900">
                  {review.product_title}
                </CardTitle>
                <CardDescription className="flex items-center gap-3">
                  <span className="text-slate-600">{review.buyer_name}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 text-sm">
                    {formatDate(review.created_at)}
                  </span>
                </CardDescription>
              </div>
              {renderStars(review.rating)}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Comentariul clientului */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-700 leading-relaxed">{review.comment}</p>
            </div>

            {/* Răspunsul vânzătorului (dacă există) */}
            {review.seller_reply ? (
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-900">
                    Răspunsul tău
                  </span>
                  <span className="text-xs text-orange-600">
                    • {formatDate(review.seller_reply.replied_at)}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {review.seller_reply.comment}
                </p>
              </div>
            ) : (
              /* Formular pentru răspuns */
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">
                  Trimite un răspuns
                </label>
                <Textarea
                  placeholder="Scrie răspunsul tău aici... (max 1000 caractere)"
                  value={replyText[review.id] || ""}
                  onChange={(e) => handleReplyChange(review.id, e.target.value)}
                  className="min-h-[100px] resize-none"
                  maxLength={1000}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">
                    {replyText[review.id]?.length || 0} / 1000 caractere
                  </span>
                  <Button
                    onClick={() => handleSendReply(review.id)}
                    disabled={sendingReply[review.id] || !replyText[review.id]?.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {sendingReply[review.id] ? (
                      "Se trimite..."
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Trimite răspuns
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
