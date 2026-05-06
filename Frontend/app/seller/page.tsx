"use client"

import React, { useEffect, useState, useRef } from "react"

import Link from "next/link"
import { Search, ShoppingCart, User, Menu, Phone, Mail, FileText, Calendar, Package, ShoppingBag, Plus, LogOut, X, Camera, Edit, PackagePlus, Upload, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import SellerProducts from "@/components/seller/Products"
import SellerOrders from "@/components/seller/Orders"

import ViewProductModal from "@/components/seller/modals/ViewProductModal"
import AddProductModal from "@/components/seller/modals/AddProductModal"
import EditProfileModal from "@/components/seller/modals/EditProfileModal"
import EditProductModal from "@/components/seller/modals/EditProductModal"
import {
  createSellerProfile,
  getSellerProfile,
  toBackendMediaUrl,
  updateSellerProfile,
  type SellerProfile,
} from "@/lib/api/seller"

interface SellerInfo {
  company_name: string
  created_at: string
  phone: string
  address: string
  tax_id: string
  description: string
  logo_path: string
}

const EMPTY_SELLER_INFO: SellerInfo = {
  company_name: "",
  created_at: "",
  phone: "",
  address: "",
  tax_id: "",
  description: "",
  logo_path: "",
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function mapSellerProfile(profile: SellerProfile): SellerInfo {
  return {
    company_name: profile.company_name,
    created_at: formatDate(profile.member_since),
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    tax_id: profile.tax_id ?? "",
    description: profile.description ?? "",
    logo_path: toBackendMediaUrl(profile.logo_url),
  }
}

export default function SellerProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("products")  //sectiunea de taburi se deschide automat cu cea de products

  const [sellerInfo, setSellerInfo] = useState<SellerInfo>(EMPTY_SELLER_INFO)
  const [profileExists, setProfileExists] = useState(false)
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  //boolean pt pop up de edit seller info
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [formData, setFormData] = useState<SellerInfo>(sellerInfo)

  useEffect(() => {
    getSellerProfile()
      .then((profile) => {
        const mappedProfile = mapSellerProfile(profile)
        setSellerInfo(mappedProfile)
        setFormData(mappedProfile)
        setProfileExists(true)
      })
      .catch((error) => {
        console.error(error)
        setProfileExists(false)
      })
  }, [])

  //afisez datele mock de mai sus
  const handleOpenEdit = () => {
    setFormData(sellerInfo) 
    setSelectedLogoFile(null)
    setIsEditModalOpen(true)
  }

  ////////// EDIT SELLER PROFILE //////////
  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true)
      const payload = {
        company_name: formData.company_name,
        description: formData.description,
        phone: formData.phone,
        address: formData.address,
        tax_id: formData.tax_id,
      }
      const savedProfile = profileExists
        ? await updateSellerProfile(payload, selectedLogoFile)
        : await createSellerProfile(payload, selectedLogoFile)

      const mappedProfile = mapSellerProfile(savedProfile)
      setSellerInfo(mappedProfile)
      setFormData(mappedProfile)
      setSelectedLogoFile(null)
      setProfileExists(true)
      setIsEditModalOpen(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nu am putut salva profilul.")
    } finally {
      setIsSavingProfile(false)
    }
  }
  
  // Adaugă un state pentru a păstra File object-ul
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {

      setSelectedLogoFile(file)

      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo_path: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  //restul datelor despre seller
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  ////////// ADAUGARE DE PRODUSE //////////
  const [images, setImages] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  //adaugare imagini pentru produse
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)

      //functie de conditionare a nr de imagini incracate la 10 img/produs
      setImages((prev) => {
        
        const availableSlots = 10 - prev.length

        if (availableSlots <= 0) {
          alert("Ai atins limita maximă de 10 imagini pentru un produs.")
          return prev
        }

        const filesToAdd = newFiles.slice(0, availableSlots)
        if (newFiles.length > availableSlots) {
          alert(`Ai selectat prea multe imagini. Doar primele ${availableSlots} au fost adăugate pentru a respecta limita de 10.`)
        }

        return [...prev, ...filesToAdd]
      })
    }
  }

  //tabel products + vizualizare detalii produs
  //inittializea lista de produse
  const [productsList, setProductsList] = useState<any[]>([])
  
  //sablon adaugare produs la tabel
  const [newProduct, setNewProduct] = useState({
    title: "", category: "", price: "", stock: "", description: ""
  })

  //adaugare produs
  const handleAddProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setNewProduct(prev => ({ ...prev, [name]: value }))
  }

  //adaugare de produs nou la tabel
  const handleSaveNewProduct = async () => {
    const imageUrls = await Promise.all(
      images.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
      )
    )

    const productToAdd = {
      id: Date.now(),
      title: newProduct.title || "Produs Fără Nume",
      category: newProduct.category || "Nespecificat",
      price: newProduct.price || "0.00",
      stock: newProduct.stock || "0",
      description: newProduct.description || "Nicio descriere adaugata",
      images: imageUrls,
    }

    setProductsList(prev => [...prev, productToAdd])
    setIsAddProductModalOpen(false)
    setNewProduct({ title: "", category: "", price: "", stock: "", description: "" })
    setImages([])
  }

  //functie de vizualizare detalii produse
  const handleViewDetails = (product: any) => {
    setSelectedProduct(product)
    setCurrentImageIndex(0)
    setIsViewModalOpen(true)
  }

  ///////// EDITARE PRODUS //////////
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<any>(null)

  const handleEditProduct = (product: any) => {
    setProductToEdit(product)
    setIsEditProductModalOpen(true)
  }

  const handleSaveEditedProduct = (updatedProduct: any) => {
    setProductsList(prev =>
      prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    )
    setIsEditProductModalOpen(false)
    setProductToEdit(null)
  }

  ///////// STERGERE PRODUS //////////
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  //functie de stergere a unui produs
  const handleDeleteProduct = (id: number) => {
    // Adăugăm o fereastră mică de confirmare nativă din browser (UX bun)
    if (window.confirm("Ești sigur că vrei să ștergi acest produs?")) {
      
      // Eliminăm produsul din state-ul curent (păstrăm doar produsele cu ID diferit de cel selectat)
      setProductsList(prev => prev.filter(product => product.id !== id))
    }
  }

  //functie deconectare
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    console.log("Sesiunea a fost incheiata.");
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
          <div className="flex-1 flex flex-col sm:flex-row gap-6">
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

          {/* contact */}
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
              <div className="flex items-center gap-3 text-slate-500 pt-4 border-t border-slate-200">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="text-xs">Ultima actualizare: <br className="hidden sm:block"/> <span className="font-medium text-slate-700">{sellerInfo.created_at}</span></span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* vizualizare a produselor si comenzilor */}
      <div className="flex-1 bg-slate-100 border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">

            {/* tabelul principal */}
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="w-full"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                {/* alegere tabela ce va fi vizualizata */}
                <TabsList className="bg-white border shadow-sm">
                  <TabsTrigger value="products" className="flex items-center gap-2">
                    <Package className="w-4 h-4" /> Products
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" /> Orders
                  </TabsTrigger>
                </TabsList>

                {/* buton add product pt products tab activ */}
                {activeTab === "products" && (
                  <Button 
                    onClick={() => setIsAddProductModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" /> 
                    Add Product
                  </Button>
                )}
              </div>

              {/* tabela de products */}
              <TabsContent value="products">
                <SellerProducts 
                  products={productsList} 
                  onViewDetails={handleViewDetails}
                  onDeleteProduct={handleDeleteProduct}
                  onEditProduct={handleEditProduct}
                /> 
              </TabsContent>
              <TabsContent value="orders">
                <SellerOrders />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* popups */}
      {isEditModalOpen && (
        <EditProfileModal
          formData={formData}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveProfile}
          onInputChange={handleInputChange}
          onImageUpload={handleImageUpload}
          isSaving={isSavingProfile}
        />
      )}

      {isAddProductModalOpen && (
        <AddProductModal
          newProduct={newProduct}
          images={images}
          onClose={() => setIsAddProductModalOpen(false)}
          onSave={handleSaveNewProduct}
          onProductChange={handleAddProductChange}
          onCategoryChange={(val) => setNewProduct(prev => ({ ...prev, category: val }))}
          onImageChange={handleImageChange}
          onRemoveImage={removeImage}
        />
      )}

      {isViewModalOpen && selectedProduct && (
        <ViewProductModal
          product={selectedProduct}
          currentImageIndex={currentImageIndex}
          onImageSelect={setCurrentImageIndex}
          onClose={() => setIsViewModalOpen(false)}
        />
      )}

      {isEditProductModalOpen && productToEdit && (
        <EditProductModal
          product={productToEdit}
          onClose={() => { setIsEditProductModalOpen(false); setProductToEdit(null) }}
          onSave={handleSaveEditedProduct}
        />
      )}
    </div>
  )
}
