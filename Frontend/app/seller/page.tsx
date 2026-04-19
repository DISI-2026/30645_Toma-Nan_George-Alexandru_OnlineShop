"use client"

import React, { useState } from "react"
import { Search, ShoppingCart, User, Menu, Phone, Mail, FileText, Calendar, Package, ShoppingBag, Plus, LogOut, X, Camera, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function SellerProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  //const [activeTab, setActiveTab] = useState("products")

  //mock data
  const [sellerInfo, setSellerInfo] = useState({
    company_name: "TechGear Pro Solutions S.R.L.",
    created_at: "12 Octombrie 2023, 10:30:45",
    phone: "+40 722 123 456",
    address: "contact@techgear-pro.ro",
    tax_id: "RO123456789",
    description: "Suntem lideri in distributia de accesorii tech premium. Ne dedicam calitatii si satisfactiei clientilor nostri prin oferirea celor mai noi tehnologii de pe piata.",
    logo_path: ""
  })

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [formData, setFormData] = useState(sellerInfo)

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    console.log("Sesiunea a fost incheiata.");
  }

  //fisez datele mock
  const handleOpenEdit = () => {
    setFormData(sellerInfo) 
    setIsEditModalOpen(true)
  }

  //partea de edit a profilului
  const handleSaveProfile = () => {
    //data curenta pt "created at", "edited at"
    const today = new Date().toLocaleDateString('ro-RO', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit' 
    })

    //salvez modif
    setSellerInfo({
      ...formData,
      created_at: today
    })
    
    setIsEditModalOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* logo pagina */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="md:hidden text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div className="text-xl font-bold cursor-pointer">
                <span className="text-orange-500">Shop</span><span className="text-white">Verse</span>
              </div>
            </div>
            {/* search bar */}
            <div className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <Input placeholder="Cauta produse..." className="w-full pl-4 pr-12 py-2 rounded-md border-orange-500 text-slate-900" />
                <Button size="sm" className="absolute right-1 top-1 bg-orange-500 text-white"><Search className="w-4 h-4" /></Button>
              </div>
            </div>
            {/* deconectare */}
            <div className="flex items-center">
               <Link href="/" onClick={handleLogout}>
                 <Button 
                   variant="outline" 
                   size="sm" 
                   className="border-red-500 text-red-500 hover:bg-orange-500 hover:text-white"
                 >
                   <LogOut className="w-4 h-4 mr-2" />
                   Deconectare
                 </Button>
               </Link>
            </div>
          </div>
        </div>
      </header>

      {/* seller info */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          
          {/* Imagine & Detalii Principale */}
          <div className="flex-1 flex flex-col sm:flex-row gap-6">
            {/* Imagine de profil */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-100 flex items-center justify-center">
              {sellerInfo.logo_path ? (
                <img src={sellerInfo.logo_path} alt={sellerInfo.company_name} className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-slate-300" />
              )}
            </div>

            <div className="space-y-4 flex-1">
              <h1 className="text-3xl font-bold text-slate-900">{sellerInfo.company_name}</h1>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Descriere Companie</h3>
                <p className="text-slate-600 leading-relaxed max-w-2xl">{sellerInfo.description}</p>
                
                {/* Butonul de Actualizare sub descriere */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleOpenEdit}
                  className="mt-4 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Actualizare Profil
                </Button>
              </div>
            </div>
          </div>

          {/* Card Detalii Contact */}
          <Card className="w-full md:w-80 shadow-none border-slate-200 bg-slate-50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm font-medium">{sellerInfo.phone}</span>
              </div>
              
              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm font-medium break-all">{sellerInfo.address}</span>
              </div>

              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm font-medium">CUI: {sellerInfo.tax_id}</span>
              </div>

              {/* Eticheta actualizată */}
              <div className="flex items-center gap-3 text-slate-500 pt-4 border-t border-slate-200">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="text-xs">Ultima actualizare: <br className="hidden sm:block"/> <span className="font-medium text-slate-700">{sellerInfo.created_at}</span></span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="sticky top-0 bg-white z-10 border-b flex flex-row items-center justify-between py-4">
              <CardTitle className="text-xl">Actualizare Profil</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              <div className="space-y-2">
                <Label htmlFor="logo_path">Imagine Profil</Label>
                <Input 
                  id="logo_path" name="logo_path" 
                  value={formData.logo_path} onChange={handleInputChange}
                  placeholder="https://exemplu.ro/logo.jpg" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Nume Companie</Label>
                <Input 
                  id="company_name" name="company_name" 
                  value={formData.company_name} onChange={handleInputChange} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descriere</Label>
                <Textarea 
                  id="description" name="description" 
                  value={formData.description} onChange={handleInputChange}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input 
                    id="phone" name="phone" 
                    value={formData.phone} onChange={handleInputChange} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_id">CUI</Label>
                  <Input 
                    id="tax_id" name="tax_id" 
                    value={formData.tax_id} onChange={handleInputChange} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Email Contact</Label>
                <Input 
                  id="address" name="address" type="email"
                  value={formData.address} onChange={handleInputChange} 
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Anulare
                </Button>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSaveProfile}>
                  Salvează Modificările
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}