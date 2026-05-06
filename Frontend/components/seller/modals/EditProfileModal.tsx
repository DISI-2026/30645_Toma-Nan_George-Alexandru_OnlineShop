"use client"

import React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface SellerInfo {
  company_name: string
  created_at: string
  phone: string
  address: string
  tax_id: string
  description: string
  logo_path: string
}

interface EditProfileModalProps {
  formData: SellerInfo
  onClose: () => void
  onSave: () => void
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isSaving: boolean
}

export default function EditProfileModal({
  formData,
  onClose,
  onSave,
  onInputChange,
  onImageUpload,
  isSaving,
}: EditProfileModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="sticky top-0 bg-white z-10 border-b flex flex-row items-center justify-between py-4">
          <CardTitle className="text-xl">Actualizare Profil</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">

          <div className="space-y-2">
            <Label htmlFor="logo_upload">Imagine Profil</Label>
            <div className="flex items-center gap-4">
              {formData.logo_path && (
                <img
                  src={formData.logo_path}
                  alt="Preview"
                  className="w-10 h-10 rounded-md object-cover border"
                />
              )}
              <Input
                id="logo_upload"
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={onImageUpload}
                className="cursor-pointer file:text-orange-500 file:bg-orange-50 file:border-0 file:mr-4 file:px-4 file:py-1 hover:file:bg-orange-100"
                disabled={isSaving}
              />
            </div>
            <p className="text-xs text-slate-500">
              Selectează o imagine.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">Nume Companie</Label>
            <Input
              id="company_name" name="company_name"
              value={formData.company_name} onChange={onInputChange}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descriere</Label>
            <Textarea
              id="description" name="description"
              value={formData.description} onChange={onInputChange}
              className="min-h-[100px]"
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone" name="phone"
                value={formData.phone} onChange={onInputChange}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">CUI</Label>
              <Input
                id="tax_id" name="tax_id"
                value={formData.tax_id} onChange={onInputChange}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Email Contact</Label>
            <Input
              id="address" name="address" type="email"
              value={formData.address} onChange={onInputChange}
              disabled={isSaving}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t mt-6">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Anulare
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={onSave} disabled={isSaving}>
              {isSaving ? "Se salvează..." : "Salvează Modificările"}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}