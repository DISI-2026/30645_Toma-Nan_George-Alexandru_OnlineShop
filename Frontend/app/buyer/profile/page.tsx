"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { User, Save, MapPin, Settings, Loader2, Plus, Trash2, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { getBuyerProfile, updateBuyerProfile, type BuyerProfile } from "@/lib/api/buyer"
import { getAddressesFromDB, addAddressToDB, deleteAddressFromDB, type SavedAddress } from "@/lib/addresses"
import Navbar from "@/components/Navbar"
import OrdersList from "@/components/buyer/OrdersList"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function BuyerProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') ?? 'personal'

  const [pageLoading, setPageLoading] = useState(true)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])

  const [personalLoading, setPersonalLoading] = useState(false)
  const [personal, setPersonal] = useState({ full_name: "", email: "", phone: "" })

  // Address book
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [newName, setNewName] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [addingAddress, setAddingAddress] = useState(false)

  const [prefsLoading, setPrefsLoading] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [priceRange, setPriceRange] = useState([0, 2500])

  useEffect(() => {
    getAddressesFromDB().then(setAddresses).catch(() => setAddresses([]))

    fetch(`${API_URL}/api/v1/categories`)
      .then(r => r.json())
      .then(data => setCategories(data.items ?? data.data ?? data))
      .catch(() => {})

    getBuyerProfile()
      .then((profile: BuyerProfile) => {
        setPersonal({
          full_name: profile.full_name ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
        })
        if (profile.preferences) {
          setSelectedCategoryIds(
            profile.preferences.favorite_categories?.map((c) => c.category_id) ?? []
          )
          if (profile.preferences.price_range) {
            setPriceRange([
              profile.preferences.price_range.min ?? 0,
              profile.preferences.price_range.max ?? 2500,
            ])
          }
        }
      })
      .catch((err) => {
        toast.error("Nu s-a putut încărca profilul", {
          description: err instanceof Error ? err.message : "Verifică conexiunea.",
        })
      })
      .finally(() => setPageLoading(false))
  }, [])

  const handleCategoryChange = (id: number, checked: boolean) => {
    setSelectedCategoryIds((prev) =>
      checked ? [...prev, id] : prev.filter((c) => c !== id)
    )
  }

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personal.full_name.trim()) {
      toast.error("Câmpuri obligatorii lipsă", { description: "Numele este obligatoriu." })
      return
    }
    setPersonalLoading(true)
    try {
      await updateBuyerProfile({ full_name: personal.full_name, phone: personal.phone })
      toast.success("Date personale salvate cu succes!")
    } catch (err) {
      toast.error("Eroare la salvare", { description: err instanceof Error ? err.message : "Încearcă din nou." })
    } finally {
      setPersonalLoading(false)
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newAddress.trim()) {
      toast.error("Câmpuri obligatorii", { description: "Completează numele și adresa." })
      return
    }
    try {
      const saved = await addAddressToDB({ name: newName.trim(), address: newAddress.trim() })
      const updated = await getAddressesFromDB()
      setAddresses(updated)
      setNewName("")
      setNewAddress("")
      setAddingAddress(false)
      toast.success("✓ Adresă adăugată", { description: `"${saved.name}" a fost salvată.`, duration: 2000 })
    } catch {
      toast.error("Eroare", { description: "Nu s-a putut salva adresa.", duration: 3000 })
    }
  }

  const handleDeleteAddress = async (id: string, name: string) => {
    try {
      await deleteAddressFromDB(id)
      const updated = await getAddressesFromDB()
      setAddresses(updated)
      toast.success("🗑️ Adresă ștearsă", { description: `"${name}" a fost eliminată.`, duration: 2000 })
    } catch {
      toast.error("Eroare", { description: "Nu s-a putut șterge adresa.", duration: 3000 })
    }
  }

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setPrefsLoading(true)
    try {
      await updateBuyerProfile({
        preferences: {
          favorite_categories: selectedCategoryIds,
          price_range: { min: priceRange[0], max: priceRange[1] },
        },
      })
      toast.success("Preferințe salvate cu succes!")
    } catch (err) {
      toast.error("Eroare la salvare", { description: err instanceof Error ? err.message : "Încearcă din nou." })
    } finally {
      setPrefsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
            <User className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Profilul meu</h1>
            <p className="text-sm text-gray-500">Gestionează datele contului tău</p>
          </div>
        </div>

        {pageLoading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <Tabs defaultValue={defaultTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Date personale</span>
                <span className="sm:hidden">Date</span>
              </TabsTrigger>
              <TabsTrigger value="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Adrese</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>Comenzi</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Preferințe</span>
                <span className="sm:hidden">Prefs</span>
              </TabsTrigger>
            </TabsList>

            {/*  Date personale  */}
            <TabsContent value="personal">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Date personale</CardTitle>
                  <CardDescription>Actualizează numele și numărul de telefon.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSavePersonal} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nume complet</Label>
                      <Input id="full_name" placeholder="Ion Popescu" value={personal.full_name}
                        onChange={(e) => setPersonal({ ...personal, full_name: e.target.value })}
                        disabled={personalLoading} className="border-gray-300 focus:border-orange-500" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email <span className="text-gray-400 text-xs">(doar vizualizare)</span></Label>
                      <Input id="email" type="email" value={personal.email} disabled className="bg-gray-50 text-gray-500" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon <span className="text-gray-400 text-xs">(opțional)</span></Label>
                      <Input id="phone" type="tel" placeholder="07xx xxx xxx" value={personal.phone}
                        onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                        disabled={personalLoading} className="border-gray-300 focus:border-orange-500" />
                    </div>
                    <Separator />
                    <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={personalLoading}>
                      {personalLoading
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se salvează...</>
                        : <><Save className="w-4 h-4 mr-2" />Salvează datele personale</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/*  Agenda de adrese  */}
            <TabsContent value="address">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Agenda de adrese</CardTitle>
                  <CardDescription>Adresele tale salvate pentru livrare. Le poți selecta rapid la checkout.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addresses.length === 0 && !addingAddress && (
                    <div className="text-center py-8 text-gray-400">
                      <MapPin className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Nu ai adrese salvate încă.</p>
                    </div>
                  )}

                  {addresses.map((addr) => (
                    <div key={addr.id} className="flex items-start justify-between gap-3 p-4 border border-gray-200 rounded-lg bg-white">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{addr.name}</p>
                        <p className="text-gray-500 text-sm mt-0.5">{addr.address}</p>
                      </div>
                      <Button variant="ghost" size="sm"
                        onClick={() => handleDeleteAddress(addr.id, addr.name)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {addingAddress ? (
                    <form onSubmit={handleAddAddress} className="border border-orange-200 rounded-lg p-4 bg-orange-50 space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Adresă nouă</p>
                      <div className="space-y-1">
                        <Label htmlFor="addr-name" className="text-xs text-gray-600">Nume adresă (ex: Acasă, Birou)</Label>
                        <Input id="addr-name" placeholder="Acasă" value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="border-gray-300 focus:border-orange-500 bg-white" autoFocus />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="addr-value" className="text-xs text-gray-600">Adresă completă</Label>
                        <Input id="addr-value" placeholder="Str. Victoriei 10, Cluj-Napoca, Cluj"
                          value={newAddress} onChange={(e) => setNewAddress(e.target.value)}
                          className="border-gray-300 focus:border-orange-500 bg-white" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button type="submit" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                          <Save className="w-4 h-4 mr-1" /> Salvează
                        </Button>
                        <Button type="button" size="sm" variant="outline"
                          onClick={() => { setAddingAddress(false); setNewName(""); setNewAddress("") }}>
                          Anulează
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button variant="outline" className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={() => setAddingAddress(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adaugă adresă nouă
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/*  Comenzi  */}
            <TabsContent value="orders">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-500" />
                    Istoricul comenzilor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrdersList />
                </CardContent>
              </Card>
            </TabsContent>

            {/*  Preferințe  */}
            <TabsContent value="preferences">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Preferințe</CardTitle>
                  <CardDescription>Personalizează experiența ta de cumpărare.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSavePreferences} className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-slate-800 mb-3 block">Categorii favorite</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {categories.map((cat) => (
                          <div key={cat.id} className="flex items-center space-x-2">
                            <Checkbox id={`cat-${cat.id}`} checked={selectedCategoryIds.includes(cat.id)}
                              onCheckedChange={(checked) => handleCategoryChange(cat.id, checked as boolean)}
                              disabled={prefsLoading} />
                            <label htmlFor={`cat-${cat.id}`} className="text-sm text-slate-700 cursor-pointer">{cat.name}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium text-slate-800 mb-3 block">Interval de preț preferat</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price_min" className="text-xs text-gray-500">Preț minim (RON)</Label>
                          <Input id="price_min" type="number" min={0} max={priceRange[1]} value={priceRange[0]}
                            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                            disabled={prefsLoading} className="border-gray-300 focus:border-orange-500" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="price_max" className="text-xs text-gray-500">Preț maxim (RON)</Label>
                          <Input id="price_max" type="number" min={priceRange[0]} max={50000} value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                            disabled={prefsLoading} className="border-gray-300 focus:border-orange-500" />
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={prefsLoading}>
                      {prefsLoading
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se salvează...</>
                        : <><Save className="w-4 h-4 mr-2" />Salvează preferințele</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
