"use client"

import React, { useRef, useState, useEffect } from "react"
import { X, Edit, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Product {
  id: number
  title: string
  category: string
  price: string
  stock: string
  description: string
  images: string[]
}

interface EditProductModalProps {
  product: Product
  onClose: () => void
  onSave: (updatedProduct: Product) => void
}

export default function EditProductModal({ product, onClose, onSave }: EditProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: product.title,
    category: product.category,
    price: product.price,
    stock: product.stock,
    description: product.description,
  })

  // existing images (base64 strings) already saved on the product
  const [existingImages, setExistingImages] = useState<string[]>(product.images || [])
  // newly added images (File objects, not yet converted)
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])

  const totalImages = existingImages.length + newImageFiles.length

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      const availableSlots = 10 - totalImages

      if (availableSlots <= 0) {
        alert("Ai atins limita maximă de 10 imagini pentru un produs.")
        return
      }

      const filesToAdd = newFiles.slice(0, availableSlots)
      if (newFiles.length > availableSlots) {
        alert(`Ai selectat prea multe imagini. Doar primele ${availableSlots} au fost adăugate pentru a respecta limita de 10.`)
      }

      setNewImageFiles(prev => [...prev, ...filesToAdd])
    }
  }

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    // convert new File objects to base64
    const newImageUrls = await Promise.all(
      newImageFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
      )
    )

    const updatedProduct: Product = {
      ...product,
      title: formData.title || "Produs Fără Nume",
      category: formData.category || "Nespecificat",
      price: formData.price || "0.00",
      stock: formData.stock || "0",
      description: formData.description || "Nicio descriere adaugata",
      images: [...existingImages, ...newImageUrls],
    }

    onSave(updatedProduct)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="sticky top-0 bg-white z-10 border-b flex flex-row items-center justify-between py-6 px-8">
          <div className="flex items-center gap-3">
            <Edit className="w-6 h-6 text-orange-500" />
            <CardTitle className="text-2xl">Edit Product</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6 text-slate-500" />
          </Button>
        </CardHeader>

        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* stanga - imagini produs */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-slate-500 uppercase">Product Images</Label>
                <span className={`text-xs font-medium ${totalImages >= 10 ? 'text-red-500' : 'text-slate-500'}`}>
                  {totalImages}/10
                </span>
              </div>

              {/* chenar upload pt < 10 imagini */}
              {totalImages < 10 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-2xl aspect-square flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <Upload className="w-12 h-12 text-slate-400 group-hover:text-orange-500 mb-4" />
                  <p className="text-slate-500 font-medium">Click to upload images</p>
                  <p className="text-xs text-slate-400 mt-1">Maxim 10 imagini (rămase: {10 - totalImages})</p>
                  <input type="file" ref={fileInputRef} onChange={handleImageChange} multiple className="hidden" accept="image/*" />
                </div>
              )}

              {/* grid cu toate imaginile */}
              <div className="grid grid-cols-4 gap-2">
                {/* imaginile deja salvate */}
                {existingImages.map((src, index) => (
                  <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={src} alt="existing" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* imaginile noi (inca File objects) */}
                {newImageFiles.map((file, index) => (
                  <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={URL.createObjectURL(file)} alt="new preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeNewImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                    >
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
                <Input name="title" value={formData.title} onChange={handleInputChange} placeholder="Enter product name" />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  defaultValue={formData.category}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                >
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
                  <Input name="price" value={formData.price} onChange={handleInputChange} type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input name="stock" value={formData.stock} onChange={handleInputChange} type="number" placeholder="Quantity" />
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
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your product..."
                  className="min-h-[120px]"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
