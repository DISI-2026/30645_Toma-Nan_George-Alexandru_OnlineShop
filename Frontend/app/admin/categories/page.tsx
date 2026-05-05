"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Edit, Trash2, Search, ArrowLeft, Loader2, LogOut } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  listCategories,
  createCategory,
  patchCategory,
  deleteCategory,
  type Category,
} from "@/lib/api/categories"
import { logout } from "@/lib/auth-utils"

export default function AdminCategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      const response = await listCategories(1, 100)
      setCategories(response.items)
    } catch (error) {
      toast.error("Eroare la încărcarea categoriilor", {
        description: error instanceof Error ? error.message : "Te rugăm să încerci din nou.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  // Filtered categories based on search
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) return

    try {
      setIsSubmitting(true)
      const newCategory = await createCategory({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      })
      
      setCategories([...categories, newCategory])
      setIsCreateDialogOpen(false)
      setFormData({ name: "", description: "" })
      
      toast.success("Categorie creată cu succes!", {
        description: `Categoria "${newCategory.name}" a fost adăugată.`,
      })
    } catch (error) {
      toast.error("Eroare la crearea categoriei", {
        description: error instanceof Error ? error.message : "Te rugăm să încerci din nou.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditCategory = async () => {
    if (!selectedCategory || !formData.name.trim()) return

    try {
      setIsSubmitting(true)
      const updatedCategory = await patchCategory(selectedCategory.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      })
      
      setCategories(
        categories.map((cat) => (cat.id === updatedCategory.id ? updatedCategory : cat))
      )
      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      setFormData({ name: "", description: "" })
      
      toast.success("Categorie actualizată cu succes!", {
        description: `Categoria "${updatedCategory.name}" a fost modificată.`,
      })
    } catch (error) {
      toast.error("Eroare la actualizarea categoriei", {
        description: error instanceof Error ? error.message : "Te rugăm să încerci din nou.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return

    try {
      setIsSubmitting(true)
      await deleteCategory(selectedCategory.id)
      
      setCategories(categories.filter((cat) => cat.id !== selectedCategory.id))
      setIsDeleteDialogOpen(false)
      setSelectedCategory(null)
      
      toast.success("Categorie ștearsă cu succes!", {
        description: `Categoria "${selectedCategory.name}" a fost eliminată.`,
      })
    } catch (error) {
      toast.error("Eroare la ștergerea categoriei", {
        description: error instanceof Error ? error.message : "Te rugăm să încerci din nou.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category)
    setIsDeleteDialogOpen(true)
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
                <h1 className="text-2xl font-bold text-orange-600">Gestionare Categorii</h1>
                <p className="text-gray-600">Administrează categoriile de produse</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adaugă Categorie
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Search and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="md:col-span-3">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Caută categorii..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">{categories.length}</div>
                <div className="text-sm text-gray-600">Total Categorii</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista Categorii</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-3 text-gray-600">Se încarcă categoriile...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nume</TableHead>
                    <TableHead>Descriere</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-right">Produse</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nu s-au găsit categorii
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.id}</TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {category.description || "-"}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {category.slug}
                          </code>
                        </TableCell>
                        <TableCell className="text-right">{category.product_count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(category)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(category)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adaugă Categorie Nouă</DialogTitle>
            <DialogDescription>
              Completează informațiile pentru noua categorie. Slug-ul va fi generat automat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nume Categorie *</Label>
              <Input
                id="create-name"
                placeholder="ex: Electronice"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Descriere</Label>
              <Textarea
                id="create-description"
                placeholder="Descriere opțională a categoriei"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
              Anulează
            </Button>
            <Button
              onClick={handleCreateCategory}
              className="bg-orange-500 hover:bg-orange-600"
              disabled={!formData.name.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Se creează...
                </>
              ) : (
                "Creează Categorie"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editează Categoria</DialogTitle>
            <DialogDescription>
              Modifică informațiile categoriei. Slug-ul nu poate fi modificat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nume Categorie *</Label>
              <Input
                id="edit-name"
                placeholder="ex: Electronice"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descriere</Label>
              <Textarea
                id="edit-description"
                placeholder="Descriere opțională a categoriei"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            {selectedCategory && (
              <div className="space-y-2">
                <Label>Slug (nu poate fi modificat)</Label>
                <code className="block text-sm bg-gray-100 px-3 py-2 rounded">
                  {selectedCategory.slug}
                </code>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Anulează
            </Button>
            <Button
              onClick={handleEditCategory}
              className="bg-orange-500 hover:bg-orange-600"
              disabled={!formData.name.trim() || isSubmitting}
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

      {/* Delete Category Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Șterge Categoria</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să ștergi categoria "{selectedCategory?.name}"?
              {selectedCategory && selectedCategory.product_count > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Atenție: Această categorie conține {selectedCategory.product_count} produse!
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Anulează
            </Button>
            <Button
              onClick={handleDeleteCategory}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Se șterge...
                </>
              ) : (
                "Șterge Categoria"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
