"use client"

import React, { useState, useRef, useEffect } from "react"
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

import { getSellerProfile, createSellerProfile, updateSellerProfile, createProduct, getCategories } from "@/lib/api/seller"
           

export default function SellerProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("products")  //sectiunea de taburi se deschide automat cu cea de products

  //mock data pentru contul de seller
  // const [sellerInfo, setSellerInfo] = useState({
  //   company_name: "TechGear Pro Solutions S.R.L.",
  //   created_at: "12 Octombrie 2023, 10:30:45",
  //   phone: "+40 722 123 456",
  //   address: "contact@techgear-pro.ro",
  //   tax_id: "RO123456789",
  //   description: "Suntem lideri in distributia de accesorii tech premium. Ne dedicam calitatii si satisfactiei clientilor nostri prin oferirea celor mai noi tehnologii de pe piata.",
  //   logo_path: ""
  // })

  //data from api
  const [sellerInfo, setSellerInfo] = useState({
    company_name: "",
    created_at: "",
    phone: "",
    address: "",
    tax_id: "",
    description: "",
    logo_path: ""
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSellerProfile = async () => {
      try {
        let response = await getSellerProfile()

        if (response.status === 404) {
          response = await createSellerProfile()
        }

        if (!response.ok) throw new Error("Failed to fetch profile")

        const data = await response.json()

        setSellerInfo({
          company_name: data.company_name ?? "",
          created_at:   data.member_since ?? "",
          phone:        data.phone       ?? "",
          address:      data.email     ?? "",
          tax_id:       data.tax_id      ?? "",
          description:  data.description ?? "",
          logo_path:    data.logo_url        ?? "",
        })
      } catch (error) {
        console.error("Error fetching seller profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSellerProfile()
  }, [])

  //boolean pt pop up de edit seller info
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [formData, setFormData] = useState(sellerInfo)
  useEffect(() => {
    setFormData(sellerInfo)
  }, [sellerInfo])

  //afisez datele mock de mai sus
  const handleOpenEdit = () => {
  setFormData(sellerInfo)
  setLogoFile(null)  // Resetează logo file când deschizi modalul
  setIsEditModalOpen(true)
}

  ////////// EDIT SELLER PROFILE //////////
  // const handleSaveProfile = () => {
  //   const today = new Date().toLocaleDateString('ro-RO', { 
  //     day: 'numeric', 
  //     month: 'long', 
  //     year: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit',
  //     second: '2-digit' 
  //   })

  //   setSellerInfo({
  //     ...formData,
  //     created_at: today
  //   })
    
  //   setIsEditModalOpen(false)
  // }
  
  // Adaugă un state pentru a păstra File object-ul
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Salvează File object-ul pentru upload
      setLogoFile(file)
      
      // Creează preview pentru UI
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo_path: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    console.log("formData on save:", formData)
    try {
      const body: Record<string, string | null | File> = {}
      
      if (formData.company_name) body.company_name = formData.company_name
      if (formData.phone) body.phone = formData.phone
      if (formData.address) body.address = formData.address  
      if (formData.tax_id) body.tax_id = formData.tax_id
      if (formData.description) body.description = formData.description
      
      if (logoFile) {
        body.logo = logoFile
      }
          
      console.log("body being sent:", body)  

      const response = await updateSellerProfile(body)
      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error response:", errorData)
        throw new Error("Failed to save profile")
      }

      const updated = await response.json()
      console.log("Updated profile response:", updated)

      setSellerInfo({
        company_name: updated.company_name ?? "",
        created_at:   updated.member_since ?? "",
        phone:        updated.phone        ?? "",
        address:      updated.address      ?? "",  
        tax_id:       updated.tax_id       ?? "",
        description:  updated.description  ?? "",
        logo_path:    updated.logo_url     ?? "",
      })

      setIsEditModalOpen(false)
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("Eroare la salvarea profilului. Încearcă din nou.")
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

  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isSavingProduct, setIsSavingProduct] = useState(false)

  
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const response = await getCategories()
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error("Error fetching categories:", errorData)
          throw new Error("Failed to fetch categories")
        }
        
        const data = await response.json()
        console.log("Categories response:", data) // Pentru debugging
        
        // Backend returnează { items: [...], page, page_size, total }
        setCategories(data.items || [])
      } catch (error) {
        console.error("Error fetching categories:", error)
        alert("Eroare la încărcarea categoriilor. Verifică consola pentru detalii.")
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])


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
    title: "", category_id: 0, price: "", stock: "", description: ""
  })

  //adaugare de produs nou la tabel
  const handleSaveNewProduct = async () => {
      if (!newProduct.title.trim()) {
      alert("Titlul produsului este obligatoriu!")
      return
    }
    
    if (!newProduct.description.trim() || newProduct.description.trim().length < 10) {
      alert("Descrierea trebuie să aibă cel puțin 10 caractere!")
      return
    }
    
    if (!newProduct.category_id || newProduct.category_id === 0) {
      alert("Selectează o categorie!")
      return
    }
    
    const price = parseFloat(newProduct.price)
    if (isNaN(price) || price <= 0) {
      alert("Prețul trebuie să fie un număr pozitiv!")
      return
    }
    
    const stock = parseInt(newProduct.stock)
    if (isNaN(stock) || stock < 0) {
      alert("Stocul trebuie să fie un număr pozitiv sau 0!")
      return
    }
    
    if (images.length === 0) {
      alert("Adaugă cel puțin o imagine pentru produs!")
      return
    }

    setIsSavingProduct(true)
    
    try {
      const imagesMetadata = images.map((_, index) => ({
        display_order: index,
        is_thumbnail: index === 0 // prima imagine = thumbnail
      }))

      const response = await createProduct(
        newProduct.title.trim(),
        newProduct.description.trim(),
        price,
        stock,
        newProduct.category_id,
        images,
        imagesMetadata
      )

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error response:", errorData)
        throw new Error(errorData.detail || "Failed to create product")
      }

      const createdProduct = await response.json()
      console.log("Product created:", createdProduct)

      const productToAdd = {
        id: createdProduct.id,
        title: createdProduct.title,
        category: categories.find(c => c.id === createdProduct.category_id)?.name || "Nespecificat",
        price: createdProduct.price.toString(),
        stock: createdProduct.stock.toString(),
        description: createdProduct.description || "",
        images: createdProduct.images.map((img: any) => `http://localhost:8000${img.path}`),
        slug: createdProduct.slug,
        is_available: createdProduct.is_available,
      }

      setProductsList(prev => [...prev, productToAdd])
      
      // Resetează formularul
      setIsAddProductModalOpen(false)
      setNewProduct({ title: "", category_id: 0, price: "", stock: "", description: "" })
      setImages([])
      
      alert("Produsul a fost adăugat cu succes!")
    } catch (error) {
      console.error("Error creating product:", error)
      alert(`Eroare la adăugarea produsului: ${error instanceof Error ? error.message : "Eroare necunoscută"}`)
    } finally {
      setIsSavingProduct(false)
    }
  }

  //adaugare produs
  const handleAddProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewProduct(prev => ({ ...prev, [name]: value }))
  }

  const handleCategoryChange = (categoryId: string) => {
    setNewProduct(prev => ({ ...prev, category_id: parseInt(categoryId) }))
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
        />
      )}

      {isAddProductModalOpen && (
        <AddProductModal
          newProduct={newProduct}
          images={images}
          categories={categories}
          isLoadingCategories={isLoadingCategories}
          isSaving={isSavingProduct}
          onClose={() => {
            setIsAddProductModalOpen(false)
            setNewProduct({ title: "", category_id: 0, price: "", stock: "", description: "" })
            setImages([])
          }}
          onSave={handleSaveNewProduct}
          onProductChange={handleAddProductChange}
          onCategoryChange={handleCategoryChange}
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