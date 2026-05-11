"use client"

import React, { useState, useEffect } from "react"
import { X, Edit, AlertCircle, Upload, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProductImage {
  id: number
  url: string
  is_thumbnail: boolean
  display_order: number
}

interface EditProduct {
  id: number
  title: string
  category_id: number
  price: string
  stock: string
  description: string
  is_available: boolean
  images?: ProductImage[]
}

interface EditProductModalProps {
  product: EditProduct
  categories: Array<{ id: string; name: string }>
  isLoadingCategories: boolean
  isSaving: boolean
  successMessage: string | null
  onClose: () => void
  onSave: () => void
  onProductChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onCategoryChange: (value: string) => void
  onAvailabilityChange: (value: string) => void
  onImagesReorder: (reorderedImages: ProductImage[]) => void  
}

export default function EditProductModal({
  product,
  categories,
  isLoadingCategories,
  isSaving,
  successMessage,
  onClose,
  onSave,
  onProductChange,
  onCategoryChange,
  onAvailabilityChange,
  onImagesReorder,
}: EditProductModalProps) {

  // Adaugă acest state:
  const [localImages, setLocalImages] = useState<ProductImage[]>(product.images || [])

  // Adaugă acest useEffect:
  useEffect(() => {
    setLocalImages(product.images || [])
  }, [product.images])

  // Adaugă aceste 3 funcții:
  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newImages = [...localImages]
    ;[newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]]
    
    const reordered = newImages.map((img, idx) => ({
      ...img,
      display_order: idx,
      is_thumbnail: idx === 0
    }))
    
    setLocalImages(reordered)
    onImagesReorder(reordered)
  }

  const handleMoveDown = (index: number) => {
    if (index === localImages.length - 1) return
    const newImages = [...localImages]
    ;[newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]]
    
    const reordered = newImages.map((img, idx) => ({
      ...img,
      display_order: idx,
      is_thumbnail: idx === 0
    }))
    
    setLocalImages(reordered)
    onImagesReorder(reordered)
  }

  const handleSetThumbnail = (index: number) => {
    const newImages = [...localImages]
    const [selectedImage] = newImages.splice(index, 1)
    newImages.unshift(selectedImage)
    
    const reordered = newImages.map((img, idx) => ({
      ...img,
      display_order: idx,
      is_thumbnail: idx === 0
    }))
    
    setLocalImages(reordered)
    onImagesReorder(reordered)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="sticky top-0 bg-white z-10 border-b flex flex-row items-center justify-between py-6 px-8">
          <div className="flex items-center gap-3">
            <Edit className="w-6 h-6 text-orange-500" />
            <CardTitle className="text-2xl">Edit Product</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving}>
            <X className="w-6 h-6 text-slate-500" />
          </Button>
        </CardHeader>

        <CardContent className="p-8">
          {successMessage && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Stânga - Gestionare Imagini */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-slate-500 uppercase">Product Images</Label>
                <span className="text-xs text-slate-500">
                  {localImages.length} {localImages.length === 1 ? 'image' : 'images'}
                </span>
              </div>

              {localImages.length === 0 ? (
                <div className="border-2 border-dashed rounded-2xl aspect-square flex flex-col items-center justify-center bg-slate-50">
                  <Upload className="w-12 h-12 mb-4 text-slate-400" />
                  <p className="text-slate-500 font-medium">No images</p>
                  <p className="text-xs text-slate-400 mt-1">Add images when creating the product</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {localImages.map((image, index) => (
                    <div
                      key={image.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        index === 0
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0 || isSaving}
                          className="h-6 w-6 p-0 hover:bg-slate-200"
                        >
                          <span className="text-xs">▲</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === localImages.length - 1 || isSaving}
                          className="h-6 w-6 p-0 hover:bg-slate-200"
                        >
                          <span className="text-xs">▼</span>
                        </Button>
                      </div>

                      <div className="w-16 h-16 rounded-md overflow-hidden border border-slate-200 flex-shrink-0">
                        <img
                          src={image.url}
                          alt={`Product ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          Image {index + 1}
                        </p>
                        {index === 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-orange-500 fill-orange-500" />
                            <span className="text-xs text-orange-600 font-medium">Thumbnail</span>
                          </div>
                        )}
                      </div>

                      {index !== 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetThumbnail(index)}
                          disabled={isSaving}
                          className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                        >
                          Set as Thumbnail
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="font-medium text-blue-700 mb-1">💡 Tip:</p>
                <p className="text-blue-600">
                  Use ▲▼ buttons to reorder images. The first image is always the thumbnail.
                </p>
              </div>
            </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Product Title *</Label>
              <Input 
                name="title" 
                value={product.title} 
                onChange={onProductChange} 
                placeholder="Enter product name (min 3 caractere)" 
                disabled={isSaving}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select 
                onValueChange={onCategoryChange} 
                value={product.category_id?.toString() || ""}
                disabled={isLoadingCategories || isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select a category"} />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {isLoadingCategories && (
                    <div className="p-2 text-sm text-gray-500">Loading...</div>
                  )}
                  {!isLoadingCategories && categories.length === 0 && (
                    <div className="p-2 text-sm text-gray-500">No categories available</div>
                  )}
                  {!isLoadingCategories && categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (RON) *</Label>
                <Input 
                  name="price" 
                  value={product.price} 
                  onChange={onProductChange} 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  placeholder="0.00" 
                  disabled={isSaving}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Stock *</Label>
                <Input 
                  name="stock" 
                  value={product.stock} 
                  onChange={onProductChange} 
                  type="number" 
                  min="0"
                  placeholder="Quantity" 
                  disabled={isSaving}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Availability Status</Label>
              <Select 
                onValueChange={onAvailabilityChange} 
                value={product.is_available ? "true" : "false"}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="true">Available</SelectItem>
                  <SelectItem value="false">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product Description *</Label>
              <Textarea
                name="description"
                value={product.description}
                onChange={onProductChange}
                placeholder="Describe your product... (min 10 caractere)"
                className="min-h-[120px]"
                disabled={isSaving}
                required
              />
              <p className="text-xs text-slate-400">
                {product.description.length}/5000 caractere
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white" 
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  )
}
