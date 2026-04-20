"use client"

import React, { useRef } from "react"
import { X, PackagePlus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface NewProduct {
  title: string
  category: string
  price: string
  stock: string
  description: string
}

interface AddProductModalProps {
  newProduct: NewProduct
  images: File[]
  onClose: () => void
  onSave: () => void
  onProductChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onCategoryChange: (value: string) => void
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: (index: number) => void
}

export default function AddProductModal({
  newProduct,
  images,
  onClose,
  onSave,
  onProductChange,
  onCategoryChange,
  onImageChange,
  onRemoveImage,
}: AddProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="sticky top-0 bg-white z-10 border-b flex flex-row items-center justify-between py-6 px-8">
          <div className="flex items-center gap-3">
            <PackagePlus className="w-6 h-6 text-orange-500" />
            <CardTitle className="text-2xl">Add New Product</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6 text-slate-500" />
          </Button>
        </CardHeader>

        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* stanga - upload product images */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-slate-500 uppercase">Product Images</Label>
                {/* contor de imagini */}
                <span className={`text-xs font-medium ${images.length >= 10 ? 'text-red-500' : 'text-slate-500'}`}>
                  {images.length}/10
                </span>
              </div>

              {/* chenar de upload pt < 10 imagini */}
              {images.length < 10 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-2xl aspect-square flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <Upload className="w-12 h-12 text-slate-400 group-hover:text-orange-500 mb-4" />
                  <p className="text-slate-500 font-medium">Click to upload images</p>
                  <p className="text-xs text-slate-400 mt-1">Maxim 10 imagini (rămase: {10 - images.length})</p>
                  <input type="file" ref={fileInputRef} onChange={onImageChange} multiple className="hidden" accept="image/*" />
                </div>
              )}

              {/* imaginile deja încărcate */}
              <div className="grid grid-cols-4 gap-2">
                {images.map((file, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                    <button onClick={() => onRemoveImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* dreapta - datele produsului */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Product Title</Label>
                <Input name="title" value={newProduct.title} onChange={onProductChange} placeholder="Enter product name" />
              </div>
              {/* de modificat vedem cum */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={onCategoryChange}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="Electronice">Electronice</SelectItem>
                    <SelectItem value="Imbracaminte">Imbracaminte</SelectItem>
                    <SelectItem value="Casa & Gradina">Casa & Gradina</SelectItem>
                    <SelectItem value="Sport">Sport</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (RON)</Label>
                  <Input name="price" value={newProduct.price} onChange={onProductChange} type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input name="stock" value={newProduct.stock} onChange={onProductChange} type="number" placeholder="Quantity" />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="available" className="data-[state=checked]:bg-orange-500" />
                <Label htmlFor="available">Product is available for sale</Label>
              </div>

              <div className="space-y-2">
                <Label>Product Description</Label>
                <Textarea
                  name="description"
                  value={newProduct.description}
                  onChange={onProductChange}
                  placeholder="Describe your product..."
                  className="min-h-[120px]"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white" onClick={onSave}>
                  Save and Publish
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
