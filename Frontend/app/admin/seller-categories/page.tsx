"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Settings, Filter, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  listSellers,
  assignSellerCategory,
  removeSellerCategory,
  type SellerWithCategories,
  type SellerAssignedCategory,
} from "@/lib/api/seller-categories"
import { listCategories, type Category } from "@/lib/api/categories"

export default function SellerCategoriesPage() {
  const [sellers, setSellers] = useState<SellerWithCategories[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState<SellerWithCategories | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load sellers and categories on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      console.log("Loading sellers and categories...")
      
      const [sellersResponse, categoriesResponse] = await Promise.all([
        listSellers(1, 100),
        listCategories(1, 100),
      ])
      
      console.log("Sellers loaded:", sellersResponse)
      console.log("Categories loaded:", categoriesResponse)
      
      setSellers(sellersResponse.items)
      setCategories(categoriesResponse.items)
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Eroare la încărcarea datelor", {
        description: error instanceof Error ? error.message : "Te rugăm să încerci din nou.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filtered sellers based on search and category filter
  const filteredSellers = sellers.filter((seller) => {
    const matchesSearch = seller.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      categoryFilter === "all" ||
      seller.categories.some((cat) => cat.id === parseInt(categoryFilter))
    return matchesSearch && matchesCategory
  })

  const openManageDialog = (seller: SellerWithCategories) => {
    setSelectedSeller(seller)
    setSelectedCategories(seller.categories.map((cat) => cat.id))
    setIsManageDialogOpen(true)
  }

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSaveCategories = async () => {
    if (!selectedSeller) return

    try {
      setIsSubmitting(true)

      const currentCategoryIds = selectedSeller.categories.map((cat) => cat.id)
      const toAdd = selectedCategories.filter((id) => !currentCategoryIds.includes(id))
      const toRemove = currentCategoryIds.filter((id) => !selectedCategories.includes(id))

      // Adaugă categorii noi
      for (const categoryId of toAdd) {
        await assignSellerCategory(selectedSeller.seller_id, categoryId)
      }

      // Șterge categorii
      for (const categoryId of toRemove) {
        await removeSellerCategory(selectedSeller.seller_id, categoryId)
      }

      // Reload data
      await loadData()

      toast.success("Categorii actualizate cu succes!", {
        description: `Asocierile pentru ${selectedSeller.company_name} au fost salvate.`,
      })

      setIsManageDialogOpen(false)
      setSelectedSeller(null)
      setSelectedCategories([])
    } catch (error) {
      toast.error("Eroare la salvarea categoriilor", {
        description: error instanceof Error ? error.message : "Te rugăm să încerci din nou.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Înapoi la Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-orange-600">Asocieri Vânzători - Categorii</h1>
                <p className="text-gray-600">Gestionează categoriile în care vânzătorii pot posta produse</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="md:col-span-2">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Caută vânzători după nume..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrează după categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate categoriile</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">{sellers.length}</div>
                <div className="text-sm text-gray-600">Total Vânzători</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">{categories.length}</div>
                <div className="text-sm text-gray-600">Categorii Disponibile</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">
                  {sellers.reduce((sum, seller) => sum + seller.categories.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Asocieri</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sellers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista Vânzători</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-3 text-gray-600">Se încarcă vânzătorii...</span>
              </div>
            ) : (
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nume Companie</TableHead>
                  <TableHead>Categorii Asociate</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      Nu s-au găsit vânzători
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSellers.map((seller) => (
                    <TableRow key={seller.seller_id}>
                      <TableCell className="font-medium">{seller.seller_id}</TableCell>
                      <TableCell className="font-medium">{seller.company_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {seller.categories.length === 0 ? (
                            <Badge variant="outline" className="text-gray-500">
                              Nicio categorie
                            </Badge>
                          ) : (
                            seller.categories.map((category) => (
                              <Badge
                                key={category.id}
                                className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                              >
                                {category.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManageDialog(seller)}
                          className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Gestionează
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manage Categories Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestionează Categorii</DialogTitle>
            <DialogDescription>
              Selectează categoriile în care <strong>{selectedSeller?.company_name}</strong> poate posta
              produse.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-4">
              {categories.map((category) => {
                const isAssigned = selectedCategories.includes(category.id)
                const assignedCategory = selectedSeller?.categories.find((c) => c.id === category.id)

                return (
                  <div
                    key={category.id}
                    className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${
                      isAssigned
                        ? "border-orange-300 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={isAssigned}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                      className="mt-1"
                      disabled={isSubmitting}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`category-${category.id}`}
                        className="text-base font-medium cursor-pointer"
                      >
                        {category.name}
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{category.slug}</code>
                      </p>
                      {isAssigned && assignedCategory && (
                        <p className="text-xs text-orange-600 mt-2">
                          ✓ Asociat din {formatDate(assignedCategory.assigned_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsManageDialogOpen(false)
                setSelectedSeller(null)
                setSelectedCategories([])
              }}
              disabled={isSubmitting}
            >
              Anulează
            </Button>
            <Button
              onClick={handleSaveCategories}
              className="bg-orange-500 hover:bg-orange-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Se salvează...
                </>
              ) : (
                "Salvează Modificările"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
