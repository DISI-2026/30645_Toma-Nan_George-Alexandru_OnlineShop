"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, MapPin, FileText, CreditCard, AlertCircle, Loader2, Plus, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCart, type Cart } from "@/lib/api/cart"
import { createOrder, saveOrderIds, type CreateOrderRequest } from "@/lib/api/orders"
import { getAddresses, saveAddress, type SavedAddress } from "@/lib/addresses"
import { useCart } from "@/contexts/CartContext"
import { toast } from "sonner"
import Navbar from "@/components/Navbar"

export default function CheckoutPage() {
  const router = useRouter()
  const { refreshCart } = useCart()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newAddrName, setNewAddrName] = useState("")
  const [newAddrValue, setNewAddrValue] = useState("")
  const [customAddress, setCustomAddress] = useState("")
  const [notes, setNotes] = useState("")

  const deliveryAddress = (() => {
    if (selectedAddressId) return savedAddresses.find(a => a.id === selectedAddressId)?.address ?? ""
    if (addingNew) return newAddrValue
    return customAddress
  })()

  useEffect(() => {
    const addrs = getAddresses()
    setSavedAddresses(addrs)
    if (addrs.length > 0) setSelectedAddressId(addrs[0].id)
    loadCart()
  }, [])

  const loadCart = async () => {
    try {
      const data = await getCart()
      if (!data || data.items.length === 0) {
        toast.error("🛒 Coș gol", { description: "Adaugă produse înainte de a finaliza comanda.", duration: 3000 })
        setTimeout(() => router.push('/cart'), 1000)
        return
      }
      setCart(data)
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("⚠️ Autentificare necesară", { description: "Trebuie să fii autentificat.", duration: 3000 })
        setTimeout(() => router.push('/login'), 1000)
      } else {
        toast.error("❌ Eroare", { description: "Nu s-a putut încărca coșul", duration: 3000 })
        router.push('/cart')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNewAddress = () => {
    if (!newAddrName.trim() || !newAddrValue.trim()) {
      toast.error("Completează numele și adresa")
      return
    }
    const saved = saveAddress({ name: newAddrName.trim(), address: newAddrValue.trim() })
    const updated = getAddresses()
    setSavedAddresses(updated)
    setSelectedAddressId(saved.id)
    setAddingNew(false)
    setNewAddrName("")
    setNewAddrValue("")
    toast.success("✓ Adresă salvată", { duration: 2000 })
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deliveryAddress.trim()) {
      toast.error("⚠️ Adresă lipsă", { description: "Selectează sau introdu o adresă de livrare.", duration: 3000 })
      return
    }
    setSubmitting(true)
    toast.info("⏳ Se procesează comanda...", { description: "Te rugăm să aștepți", duration: 2000 })
    try {
      const orderData: CreateOrderRequest = {
        delivery_address: deliveryAddress.trim(),
        notes: notes.trim() || undefined,
      }
      const result = await createOrder(orderData)
      saveOrderIds(result.orders.map(o => o.id))
      await refreshCart()
      toast.success("✅ Comandă plasată cu succes!", {
        description: `${result.order_count} comandă/comenzi create. Te redirecționăm...`,
        duration: 3000,
      })
      setTimeout(() => router.push('/buyer/profile?tab=orders'), 1500)
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || "Nu s-a putut plasa comanda"
      toast.error("❌ Eroare la plasarea comenzii", { description: errorMessage, duration: 4000 })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-orange-400 animate-pulse" />
            <p className="text-gray-600">Se încarcă comanda...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) return null

  const subtotal = parseFloat(cart.total)
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <CreditCard className="w-7 h-7 text-orange-500" />
          <h1 className="text-3xl font-bold text-slate-900">Finalizare comandă</h1>
        </div>

        {cart.price_changed && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Unele prețuri s-au modificat. Te rugăm să verifici înainte de plasare.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmitOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

              {/* Adresă */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    Adresă de livrare
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {savedAddresses.map((addr) => (
                    <button key={addr.id} type="button"
                      onClick={() => { setSelectedAddressId(addr.id); setAddingNew(false) }}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${
                        selectedAddressId === addr.id && !addingNew
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 bg-white hover:border-orange-300"
                      }`}>
                      <CheckCircle2 className={`w-5 h-5 mt-0.5 shrink-0 ${selectedAddressId === addr.id && !addingNew ? "text-orange-500" : "text-gray-300"}`} />
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{addr.name}</p>
                        <p className="text-sm text-gray-500">{addr.address}</p>
                      </div>
                    </button>
                  ))}

                  {addingNew ? (
                    <div className="border-2 border-orange-500 bg-orange-50 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Adresă nouă</p>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Nume adresă (ex: Acasă, Birou)</Label>
                        <Input placeholder="Acasă" value={newAddrName} onChange={e => setNewAddrName(e.target.value)}
                          className="bg-white border-gray-300 focus:border-orange-500" autoFocus />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Adresă completă</Label>
                        <Input placeholder="Str. Victoriei 10, Cluj-Napoca" value={newAddrValue}
                          onChange={e => setNewAddrValue(e.target.value)}
                          className="bg-white border-gray-300 focus:border-orange-500" />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={handleSaveNewAddress}>Salvează și folosește</Button>
                        <Button type="button" size="sm" variant="outline"
                          onClick={() => { setAddingNew(false); if (savedAddresses.length > 0) setSelectedAddressId(savedAddresses[0].id) }}>
                          Anulează
                        </Button>
                      </div>
                    </div>
                  ) : (
                    savedAddresses.length === 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Adresă completă *</Label>
                        <Textarea placeholder="Strada, număr, bloc, apartament, oraș, județ..."
                          value={customAddress} onChange={(e) => setCustomAddress(e.target.value)}
                          rows={3} className="border-gray-300 focus:border-orange-500" />
                      </div>
                    )
                  )}

                  {!addingNew && (
                    <button type="button"
                      onClick={() => { setAddingNew(true); setSelectedAddressId(null) }}
                      className="w-full flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors text-sm">
                      <Plus className="w-4 h-4" />
                      Adaugă o adresă nouă
                    </button>
                  )}
                </CardContent>
              </Card>

              {/* Observații */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <FileText className="w-5 h-5 text-orange-500" />
                    Observații (opțional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <Textarea placeholder="Instrucțiuni speciale pentru livrare..." value={notes}
                    onChange={(e) => setNotes(e.target.value)} rows={3}
                    className="border-gray-300 focus:border-orange-500" />
                </CardContent>
              </Card>

              {/* Produse */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <ShoppingCart className="w-5 h-5 text-orange-500" />
                    Produse comandate ({itemCount})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{item.product_title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Cantitate: {item.quantity} × {item.unit_price} RON
                          {item.unit_price !== item.current_price && <span className="text-orange-600 ml-1">(preț modificat)</span>}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-900 text-sm">{item.subtotal} RON</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Sumar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-slate-900">Sumar comandă</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-slate-700">
                      <span>Subtotal ({itemCount} produse)</span>
                      <span className="font-medium">{subtotal.toFixed(2)} RON</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Livrare</span>
                      <span className="text-green-600 font-medium">Gratuită</span>
                    </div>
                    {deliveryAddress && (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                        <span className="font-medium text-slate-700">Livrare la: </span>{deliveryAddress}
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg text-slate-900">
                      <span>Total</span>
                      <span>{subtotal.toFixed(2)} RON</span>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    size="lg" disabled={submitting || !deliveryAddress.trim()}>
                    {submitting
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se plasează comanda...</>
                      : <><CreditCard className="w-4 h-4 mr-2" />Plasează comanda</>}
                  </Button>

                  <Button type="button" variant="outline"
                    className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                    onClick={() => router.push('/cart')} disabled={submitting}>
                    Înapoi la coș
                  </Button>

                  <p className="text-xs text-gray-400 text-center pt-1">
                    Prin plasarea comenzii, ești de acord cu termenii și condițiile noastre.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
