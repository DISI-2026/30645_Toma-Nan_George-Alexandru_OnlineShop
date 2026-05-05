"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Edit, Trash2, Search, ArrowLeft } from "lucide-react"
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

// Mock data - va fi înlocuit cu date reale din API
const mockCategories = [
  {
    id: 1,
    name: "Electronice",
    description: "Produse electronice și gadgeturi",
    slug: "electronice",
    product_count: 1247,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    name: "Îmbrăcăminte",
    description: "Haine și accesorii vestimentare",
    slug: "imbracaminte",
    product_count: 856,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: 3,
    name: "Casă & Grădină",
    description: "Produse pentru casă și grădină",
    slug: "casa-gradina",
    product_count: 543,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
]

type Category = typeof mockCategories[0]

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // Filtered categories based on search
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateCategory = () => {
    // TODO: API call pentru creare categorie
    console.log("Create category:", formData)
    setIsCreateDialogOpen(false)
    setFormData({ name: "", description: "" })
  }

  const handleEditCategory = () => {
    // TODO: API call pentru editare categorie
    console.log("Edit category:", selectedCategory?.id, formData)
    setIsEditDialogOpen(false)
    setSelectedCategory(null)
    setFormData({ name: "", description: "" })
  }

  const handleDeleteCategory = () => {
    // TODO: API call pentru ștergere categorie
    console.log("Delete category:", selectedCategory?.id)
    setIsDeleteDialogOpen(false)
    setSelectedCategory(null)
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
                <h1 className="text-2xl font-bold">Gestionare Categorii</h1>
                <p className="text-gray-600">Administrează categoriile de produse</p>
              </div>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Categorie
            </Button>
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
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={handleCreateCategory}
              className="bg-orange-500 hover:bg-orange-600"
              disabled={!formData.name.trim()}
            >
              Creează Categorie
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
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={handleEditCategory}
              className="bg-orange-500 hover:bg-orange-600"
              disabled={!formData.name.trim()}
            >
              Salvează Modificările
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
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={handleDeleteCategory}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              Șterge Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
