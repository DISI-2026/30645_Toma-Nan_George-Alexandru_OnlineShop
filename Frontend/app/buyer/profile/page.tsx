"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User, Save, MapPin, Settings, Loader2, Search, LogOut, Menu } from "lucide-react"
import { logout } from "@/lib/auth-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { getBuyerProfile, updateBuyerProfile, type BuyerProfile } from "@/lib/api/buyer"

// Categorii statice până când BE expune /api/v1/categories
const STATIC_CATEGORIES = [
  { id: "cat-electronice", name: "Electronice" },
  { id: "cat-imbracaminte", name: "Imbracaminte" },
  { id: "cat-casa", name: "Casa & Gradina" },
  { id: "cat-sport", name: "Sport" },
  { id: "cat-carti", name: "Carti" },
  { id: "cat-jucarii", name: "Jucarii" },
  { id: "cat-frumusete", name: "Frumusete" },
  { id: "cat-auto", name: "Auto" },
  { id: "cat-alimente", name: "Alimente" },
  { id: "cat-sanatate", name: "Sanatate" },
]

export default function BuyerProfilePage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const [pageLoading, setPageLoading] = useState(true)

  
  const [personalLoading, setPersonalLoading] = useState(false)
  const [personal, setPersonal] = useState({ full_name: "", email: "", phone: "" })

  const [addressLoading, setAddressLoading] = useState(false)
  const [address, setAddress] = useState({
    street: "", city: "", county: "", postal_code: "", country: "Romania",
  })

  const [prefsLoading, setPrefsLoading] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState([0, 2500])

  useEffect(() => {
    getBuyerProfile()
      .then((profile: BuyerProfile) => {
        setPersonal({
          full_name: profile.full_name ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
        })
        if (profile.address) {
          // Parse address string back to fields
          const parts = profile.address.split(',').map(p => p.trim())
          setAddress({
            street: parts[0] || "",
            city: parts[1] || "",
            county: parts[2] || "",
            postal_code: parts[3] || "",
            country: parts[4] || "Romania",
          })
        }
        if (profile.preferences) {
          setSelectedCategoryIds(
            profile.preferences.favorite_categories?.map((c) => c.id) ?? []
          )
          if (profile.preferences.price_range) {
            setPriceRange([
              profile.preferences.price_range.min,
              profile.preferences.price_range.max,
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

  const handleCategoryChange = (id: string, checked: boolean) => {
    setSelectedCategoryIds((prev) =>
      checked ? [...prev, id] : prev.filter((c) => c !== id)
    )
  }

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personal.full_name.trim() || !personal.email.trim()) {
      toast.error("Câmpuri obligatorii lipsă", {
        description: "Numele și email-ul sunt obligatorii.",
      })
      return
    }
    setPersonalLoading(true)
    try {
      await updateBuyerProfile({
        full_name: personal.full_name,
        phone: personal.phone,
      })
      toast.success("Date personale salvate cu succes!")
    } catch (err) {
      toast.error("Eroare la salvare", {
        description: err instanceof Error ? err.message : "Încearcă din nou.",
      })
    } finally {
      setPersonalLoading(false)
    }
  }

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.street.trim() || !address.city.trim()) {
      toast.error("Câmpuri obligatorii lipsă", {
        description: "Strada și orașul sunt obligatorii.",
      })
      return
    }
    setAddressLoading(true)
    try {
      const addressString = [
        address.street,
        address.city,
        address.county,
        address.postal_code,
        address.country
      ].filter(Boolean).join(', ')
      
      await updateBuyerProfile({ address: addressString })
      toast.success("Adresă salvată cu succes!")
    } catch (err) {
      toast.error("Eroare la salvare", {
        description: err instanceof Error ? err.message : "Încearcă din nou.",
      })
    } finally {
      setAddressLoading(false)
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
      toast.error("Eroare la salvare", {
        description: err instanceof Error ? err.message : "Încearcă din nou.",
      })
    } finally {
      setPrefsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="md:hidden text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="w-5 h-5" />
              </Button>
              <Link href="/">
                <div className="text-xl font-bold cursor-pointer">
                  <span className="text-orange-500">Shop</span>
                  <span className="text-white">Verse</span>
                </div>
              </Link>
            </div>
            <div className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <Input placeholder="Cauta produse..." className="w-full pl-4 pr-12 py-2 rounded-md border-orange-500 text-slate-900" />
                <Button size="sm" className="absolute right-1 top-1 bg-orange-500 text-white">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center">
              <Link href="/" onClick={handleLogout}>
                <Button variant="outline" size="sm" className="border-red-500 text-red-500 hover:bg-orange-500 hover:text-white">
                  <LogOut className="w-4 h-4 mr-2" />Deconectare
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

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
          <Tabs defaultValue="personal">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Date personale
              </TabsTrigger>
              <TabsTrigger value="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Agenda de adrese
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Preferințe
              </TabsTrigger>
            </TabsList>

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
                      <Input
                        id="full_name"
                        placeholder="Ion Popescu"
                        value={personal.full_name}
                        onChange={(e) => setPersonal({ ...personal, full_name: e.target.value })}
                        disabled={personalLoading}
                        className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-gray-400 text-xs">(doar vizualizare)</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={personal.email}
                        disabled
                        className="border-gray-200 bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Telefon <span className="text-gray-400 text-xs">(opțional)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="07xx xxx xxx"
                        value={personal.phone}
                        onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                        disabled={personalLoading}
                        className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>
                    <Separator />
                    <Button
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={personalLoading}
                    >
                      {personalLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se salvează...</>
                      ) : (
                        <><Save className="w-4 h-4 mr-2" />Salvează datele personale</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="address">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Agenda de adrese</CardTitle>
                  <CardDescription>Adresa ta principală de livrare.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveAddress} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="street">Stradă și număr</Label>
                      <Input
                        id="street"
                        placeholder="Strada Memorandumului 12"
                        value={address.street}
                        onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        disabled={addressLoading}
                        className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Oraș</Label>
                        <Input
                          id="city"
                          placeholder="Cluj-Napoca"
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                          disabled={addressLoading}
                          className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="county">Județ</Label>
                        <Input
                          id="county"
                          placeholder="Cluj"
                          value={address.county}
                          onChange={(e) => setAddress({ ...address, county: e.target.value })}
                          disabled={addressLoading}
                          className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postal_code">Cod poștal</Label>
                        <Input
                          id="postal_code"
                          placeholder="400000"
                          value={address.postal_code}
                          onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                          disabled={addressLoading}
                          className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Țară</Label>
                        <Input
                          id="country"
                          placeholder="Romania"
                          value={address.country}
                          onChange={(e) => setAddress({ ...address, country: e.target.value })}
                          disabled={addressLoading}
                          className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    <Separator />
                    <Button
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={addressLoading}
                    >
                      {addressLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se salvează...</>
                      ) : (
                        <><Save className="w-4 h-4 mr-2" />Salvează adresa</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900">Preferințe</CardTitle>
                  <CardDescription>Personalizează experiența ta de cumpărare.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSavePreferences} className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-slate-800 mb-3 block">
                        Categorii favorite
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {STATIC_CATEGORIES.map((cat) => (
                          <div key={cat.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={cat.id}
                              checked={selectedCategoryIds.includes(cat.id)}
                              onCheckedChange={(checked) =>
                                handleCategoryChange(cat.id, checked as boolean)
                              }
                              disabled={prefsLoading}
                            />
                            <label htmlFor={cat.id} className="text-sm text-slate-700 cursor-pointer">
                              {cat.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium text-slate-800 mb-3 block">
                        Interval de preț preferat
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price_min" className="text-xs text-gray-500">Preț minim (RON)</Label>
                          <Input
                            id="price_min"
                            type="number"
                            min={0}
                            max={priceRange[1]}
                            value={priceRange[0]}
                            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                            disabled={prefsLoading}
                            className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="price_max" className="text-xs text-gray-500">Preț maxim (RON)</Label>
                          <Input
                            id="price_max"
                            type="number"
                            min={priceRange[0]}
                            max={50000}
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                            disabled={prefsLoading}
                            className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <Button
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={prefsLoading}
                    >
                      {prefsLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se salvează...</>
                      ) : (
                        <><Save className="w-4 h-4 mr-2" />Salvează preferințele</>
                      )}
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
