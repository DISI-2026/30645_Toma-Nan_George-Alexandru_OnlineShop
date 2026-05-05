"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Plus, Minus, ShoppingCart, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCart, updateCartItem, removeCartItem, clearCart, type Cart } from "@/lib/api/cart"
import { toast } from "sonner"
import { useCart } from "@/contexts/CartContext"
import Navbar from "@/components/Navbar"

export default function CartPage() {
  const router = useRouter()
  const { refreshCart } = useCart()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = async () => {
    try {
      const data = await getCart()
      setCart(data)
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login')
      } else {
        toast.error("❌ Eroare", {
          description: "Nu s-a putut încărca coșul",
          duration: 3000,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateQuantity = async (itemId: number, newQuantity: number, productTitle: string) => {
    if (newQuantity < 1) return

    setUpdating(itemId)
    try {
      const updatedCart = await updateCartItem(itemId, { quantity: newQuantity })
      setCart(updatedCart)
      await refreshCart()
      toast.success("✓ Cantitate actualizată", {
        description: `${productTitle} - cantitate: ${newQuantity}`,
        duration: 2000,
      })
    } catch (error: any) {
      toast.error("❌ Eroare", {
        description: error.response?.data?.error?.message || "Nu s-a putut actualiza cantitatea",
        duration: 3000,
      })
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveItem = async (itemId: number, productTitle: string) => {
    setUpdating(itemId)
    try {
      await removeCartItem(itemId)
      await loadCart()
      await refreshCart()
      toast.success("🗑️ Produs eliminat", {
        description: `${productTitle} a fost eliminat din coș`,
        duration: 2000,
      })
    } catch (error: any) {
      toast.error("❌ Eroare", {
        description: "Nu s-a putut elimina produsul",
        duration: 3000,
      })
    } finally {
      setUpdating(null)
    }
  }

  const handleClearCart = async () => {
    if (!confirm("Ești sigur că vrei să golești coșul?")) return

    const itemCount = cart?.items.length || 0
    
    try {
      await clearCart()
      await loadCart()
      await refreshCart()
      toast.success("🧹 Coș golit", {
        description: `${itemCount} produse au fost eliminate din coș`,
        duration: 2000,
      })
    } catch (error: any) {
      toast.error("❌ Eroare", {
        description: "Nu s-a putut goli coșul",
        duration: 3000,
      })
    }
  }

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      toast.error("⚠️ Coș gol", {
        description: "Adaugă produse în coș înainte de a finaliza comanda",
        duration: 3000,
      })
      return
    }
    
    toast.info("🛒 Redirecționare...", {
      description: "Te redirecționăm către pagina de finalizare comandă",
      duration: 1500,
    })
    
    setTimeout(() => {
      router.push('/checkout')
    }, 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-600">Se încarcă coșul...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8 text-slate-900">Coșul de cumpărături</h1>
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2 text-slate-900">Coșul tău este gol</h2>
              <p className="text-gray-600 mb-6">Adaugă produse pentru a începe cumpărăturile!</p>
              <Button 
                onClick={() => router.push('/')}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Continuă cumpărăturile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const subtotal = parseFloat(cart.total)
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Coșul de cumpărături ({itemCount} produse)</h1>
          {cart.items.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleClearCart}
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              Golește coșul
            </Button>
          )}
        </div>

        {cart.price_changed && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Unele prețuri s-au modificat de când ai adăugat produsele în coș. Te rugăm să verifici înainte de finalizare.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1 text-slate-900">{item.product_title}</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-semibold text-slate-900">{item.unit_price} RON</span>
                          {item.unit_price !== item.current_price && (
                            <span className="text-sm text-orange-600">
                              (acum {item.current_price} RON)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-gray-300 rounded">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, item.product_title)}
                              disabled={updating === item.id || item.quantity <= 1}
                              className="hover:bg-gray-100"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="px-4 py-1 min-w-[3rem] text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, item.product_title)}
                              disabled={updating === item.id}
                              className="hover:bg-gray-100"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id, item.product_title)}
                            disabled={updating === item.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Elimină
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg text-slate-900">
                          {item.subtotal} RON
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 text-slate-900">Sumar comandă</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal ({itemCount} produse)</span>
                    <span className="font-medium">{subtotal.toFixed(2)} RON</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Livrare</span>
                    <span className="text-green-600 font-medium">Gratuită</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg text-slate-900">
                    <span>Total</span>
                    <span>{subtotal.toFixed(2)} RON</span>
                  </div>
                </div>
                <Button
                  className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white"
                  size="lg"
                  onClick={handleCheckout}
                >
                  Finalizează comanda
                </Button>
                <Button
                  variant="outline"
                  className="w-full mt-3 border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={() => router.push('/')}
                >
                  Continuă cumpărăturile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
