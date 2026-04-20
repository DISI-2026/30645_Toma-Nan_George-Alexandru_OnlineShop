"use client"

import React from "react"
import { X, Eye, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface Product {
  id: number
  title: string
  category: string
  price: string
  stock: string
  description: string
  images: string[]
}

interface ViewProductModalProps {
  product: Product
  currentImageIndex: number
  onImageSelect: (index: number) => void
  onClose: () => void
}

export default function ViewProductModal({
  product,
  currentImageIndex,
  onImageSelect,
  onClose,
}: ViewProductModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <CardHeader className="border-b flex flex-row items-center justify-between py-4 px-6 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-xl">Detalii Produs</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* afisare imagini */}
          <div className="space-y-3">
            <div className="w-full h-48 sm:h-64 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 min-h-[192px] sm:min-h-[256px]">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[currentImageIndex]}
                  alt={product.title}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <Package className="w-10 h-10 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Fără imagine</span>
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                {product.images.map((imgUrl: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => onImageSelect(idx)}
                    className={`w-16 h-16 shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                      currentImageIndex === idx
                        ? 'border-orange-500 ring-2 ring-orange-500/20 opacity-100'
                        : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-orange-300'
                    }`}
                  >
                    <img src={imgUrl} alt={`thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* afisare restul detaliilor */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Nume Produs</Label>
              <p className="text-lg font-semibold text-slate-900">{product.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Categorie</Label>
                <p className="text-sm font-medium text-slate-700">{product.category}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Stoc</Label>
                <p className="text-sm font-medium text-slate-700">{product.stock} bucăți</p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Preț</Label>
              <p className="text-xl font-bold text-orange-500">{product.price} RON</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Label className="text-xs text-slate-500 uppercase tracking-wider">Descriere Produs</Label>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="pt-6 border-t flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Închide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
