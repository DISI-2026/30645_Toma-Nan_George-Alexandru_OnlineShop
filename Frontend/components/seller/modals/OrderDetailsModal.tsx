"use client"

import React from "react"
import { X, ShoppingBag, MapPin, User, Calendar, Hash, CreditCard, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface OrderItem {
  productName: string
  quantity: number
  pricePerUnit: number
}

interface Order {
  id: string
  date: string
  customer: string
  address: string
  total: string
  status: string
  notes: string
  items: OrderItem[]
}

interface OrderDetailsModalProps {
  order: Order
  onClose: () => void
  getStatusColor: (status: string) => string
}

export default function OrderDetailsModal({ order, onClose, getStatusColor }: OrderDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* header */}
        <CardHeader className="border-b flex flex-row items-center justify-between py-4 px-6 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            <CardTitle className="text-xl">Detalii Comandă</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 space-y-6 overflow-y-auto flex-1">

          {/* info generala comanda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                <Hash className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Order ID</Label>
                <p className="text-sm font-semibold text-slate-900">{order.id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Dată</Label>
                <p className="text-sm font-semibold text-slate-900">{order.date}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Cumpărător</Label>
                <p className="text-sm font-semibold text-slate-900">{order.customer}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Adresă</Label>
                <p className="text-sm font-semibold text-slate-900">{order.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Total</Label>
                <p className="text-xl font-bold text-orange-500">{order.total}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                <ShoppingBag className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Status</Label>
                <span className={`inline-block mt-1 text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
            </div>

          </div>

          {/* produse din comanda */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-xs text-slate-500 uppercase tracking-wider">Produse Comandate</Label>
            
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              {/* header tabel produse */}
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span className="col-span-5">Produs</span>
                <span className="col-span-2 text-center">Cant.</span>
                <span className="col-span-3 text-right">Preț/buc</span>
                <span className="col-span-2 text-right">Subtotal</span>
              </div>

              {/* randuri produse */}
              <div className="divide-y divide-slate-100">
                {order.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 px-4 py-3 text-sm items-center hover:bg-slate-50/50 transition-colors">
                    <span className="col-span-5 font-medium text-slate-800">{item.productName}</span>
                    <span className="col-span-2 text-center text-slate-600">{item.quantity}</span>
                    <span className="col-span-3 text-right text-slate-600">{item.pricePerUnit.toFixed(2)} RON</span>
                    <span className="col-span-2 text-right font-semibold text-slate-900">
                      {(item.quantity * item.pricePerUnit).toFixed(2)} RON
                    </span>
                  </div>
                ))}
              </div>

              {/* total row */}
              <div className="grid grid-cols-12 px-4 py-3 bg-slate-50 border-t border-slate-200">
                <span className="col-span-10 text-right text-sm font-semibold text-slate-700">Total comandă:</span>
                <span className="col-span-2 text-right text-sm font-bold text-orange-500">{order.total}</span>
              </div>
            </div>
          </div>

          {/* note */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Note</Label>
            </div>
            <p className="text-sm text-slate-600 italic bg-slate-50 rounded-lg p-3 border border-slate-100">
              {order.notes || "Nicio notă adăugată."}
            </p>
          </div>

          {/* buton inchidere */}
          <div className="pt-2 border-t flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Închide
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
