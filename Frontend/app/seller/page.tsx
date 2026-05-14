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
import { createProduct, listAllSellerProducts, getProductById, updateProduct, type UpdateProductPayload, updateProductImages } from "@/lib/api/products"
import { listCategories } from "@/lib/api/categories"

import type { Product } from "@/lib/types/product"

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
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isSavingProduct, setIsSavingProduct] = useState(false)

  
  useEffect(() => {
    getSellerProfile()
      .then((profile) => {
        const mappedProfile = mapSellerProfile(profile)
        setSellerInfo(mappedProfile)
        setFormData(mappedProfile)
        setProfileExists(true)
        
        return listAllSellerProducts(profile.id)  // ← Schimbat aici
      })
      .then((productsResponse) => {
        const transformedProducts = productsResponse.data.map((product) => ({
          id: product.id,
          slug: product.slug,
          title: product.title,
          category: product.category,  
          price: product.price.toString(),
          stock: product.stock.toString(),
          description: '', 
          images: product.thumbnail_url ? [toBackendMediaUrl(product.thumbnail_url)] : [],
          is_available: product.is_available
        }))
        setProductsList(transformedProducts)
      })
      .catch((error) => {
        console.error('ERROR loading seller profile:', error)

        if (error.message.includes('UNAUTHORIZED') || error.message.includes('access token')) {
          alert('Sesiunea ta a expirat. Te rugăm să te loghezi din nou.')
          window.location.href = '/login'
          return
        }
        setProfileExists(false)
      })
  }, [])


  const loadProducts = async () => {
    try {
      const profile = await getSellerProfile()
      const productsResponse = await listAllSellerProducts(profile.id) 
      
      const transformedProducts = productsResponse.data.map((product) => ({
        id: product.id,
        slug: product.slug,
        title: product.title,
        category: product.category,  
        price: product.price.toString(),
        stock: product.stock.toString(),
        description: '', 
        images: product.thumbnail_url ? [toBackendMediaUrl(product.thumbnail_url)] : [],
        is_available: product.is_available
      }))
      
      setProductsList(transformedProducts)
    } catch (error) {
      console.error('Error loading products:', error)
      alert('Nu am putut reîncărca lista de produse.')
    }
  }



  const handleOpenAddProductModal = async () => {
    setIsAddProductModalOpen(true)
    
    if (categories.length === 0) {
      setIsLoadingCategories(true)
      try {
        const response = await listCategories(1, 100)
        const formattedCategories = response.items.map(cat => ({
          id: cat.id.toString(),
          name: cat.name
        }))
        setCategories(formattedCategories)
      } catch (error) {
        console.error('Eroare la încărcarea categoriilor:', error)
        alert('Nu am putut încărca categoriile. Te rog încearcă din nou.')
      } finally {
        setIsLoadingCategories(false)
      }
    }
  }


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
  try {
    if (!newProduct.title.trim()) {
      alert("Titlul produsului este obligatoriu.")
      return
    }
    if (!newProduct.description.trim()) {
      alert("Descrierea produsului este obligatorie.")
      return
    }
    if (!newProduct.category_id) {
      alert("Selectează o categorie.")
      return
    }
    if (!newProduct.price || parseFloat(newProduct.price) <= 0) {
      alert("Prețul trebuie să fie mai mare decât 0.")
      return
    }
    if (!newProduct.stock || parseInt(newProduct.stock) < 0) {
      alert("Stocul trebuie să fie un număr pozitiv.")
      return
    }

    const createdProduct = await createProduct(
      {
        title: newProduct.title,
        description: newProduct.description,
        price: newProduct.price,
        stock: newProduct.stock,
        category_id: newProduct.category_id,
      },
      images
    )

    const selectedCategory = categories.find(cat => cat.id === newProduct.category_id.toString())
    
    const productImages = createdProduct.images?.map((img: any) => {
      const mediaPath = `/media/${img.path}`
      return toBackendMediaUrl(mediaPath)
    }) || []
    
    const displayProduct = {
      id: createdProduct.id,
      slug: (createdProduct as any).slug, 
      title: createdProduct.title,
      category: {
        id: (createdProduct as any).category_id,  
        name: selectedCategory?.name || 'Unknown Category'
      }, 
      price: createdProduct.price.toString(),
      stock: createdProduct.stock.toString(),
      description: createdProduct.description,
      images: productImages
    }
    
    setProductsList(prev => [...prev, displayProduct])
            
    // Resetează formularul
    setIsAddProductModalOpen(false)
    setNewProduct({ title: "", category_id: 0, price: "", stock: "", description: "" })
    setImages([])
    
    alert("Produsul a fost creat cu succes!")
  } catch (error) {
    alert(error instanceof Error ? error.message : "Eroare la crearea produsului.")
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
  const handleViewDetails = async (product: any) => {
    try {
      const fullProduct = await getProductById(product.slug || product.id.toString())
      
      const productForModal = {
        id: fullProduct.id,
        title: fullProduct.title,
        category: fullProduct.category,
        price: fullProduct.price.toString(),
        stock: fullProduct.stock.toString(),
        description: fullProduct.description || '',
        images: fullProduct.images.map((img: any) => toBackendMediaUrl(img.url))
      }
      
      setSelectedProduct(productForModal)
      setCurrentImageIndex(0)
      setIsViewModalOpen(true)
    } catch (error) {
      console.error('Error loading product details:', error)
      alert('Nu am putut încărca detaliile produsului.')
    }
  }

  ///////// EDITARE PRODUS //////////
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editProductData, setEditProductData] = useState<{
    id: number
    title: string
    category_id: number
    price: string
    stock: string
    description: string
    is_available: boolean
    images?: Array<{  
      id: number
      url: string
      is_thumbnail: boolean
      display_order: number
    }>
  } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState<string | null>(null)
  const [productImages, setProductImages] = useState<Array<{
    id: number
    url: string
    is_thumbnail: boolean
    display_order: number
  }>>([])
  const [hasImageChanges, setHasImageChanges] = useState(false)


  const handleEditProduct = async (product: any) => {
    if (categories.length === 0) {
      setIsLoadingCategories(true)
      try {
        const response = await listCategories(1, 100)
        const formattedCategories = response.items.map(cat => ({
          id: cat.id.toString(),
          name: cat.name
        }))
        setCategories(formattedCategories)
      } catch (error) {
        console.error('Eroare la încărcarea categoriilor:', error)
        alert('Nu am putut încărca categoriile.')
      } finally {
        setIsLoadingCategories(false)
      }
    }

    try {
      const fullProduct = await getProductById(product.slug || product.id.toString())
      
      const images = fullProduct.images.map((img: any) => ({
        id: img.id,
        url: toBackendMediaUrl(img.url),
        is_thumbnail: img.is_thumbnail,
        display_order: img.order
      })).sort((a: any, b: any) => a.display_order - b.display_order)
      
      setProductImages(images)
      setHasImageChanges(false)
      
      setEditingProduct(fullProduct)
      setEditProductData({
        id: fullProduct.id,
        title: fullProduct.title,
        category_id: fullProduct.category.id,
        price: fullProduct.price.toString(),
        stock: fullProduct.stock.toString(),
        description: fullProduct.description || "",
        is_available: fullProduct.is_available ?? true,
        images: images
      })
      setUpdateSuccessMessage(null)
    } catch (error) {
      console.error('Error loading product details:', error)
      alert('Nu am putut încărca detaliile produsului.')
    }
  }

const handleImagesReorder = (reorderedImages: Array<{
    id: number
    url: string
    is_thumbnail: boolean
    display_order: number
}>) => {
    setProductImages(reorderedImages)
    setHasImageChanges(true)
    
    if (editProductData) {
      setEditProductData(prev => prev ? { ...prev, images: reorderedImages } : null)
    }
}

const handleCloseEditModal = () => {
  if (!isUpdating) {
    setEditingProduct(null)
    setEditProductData(null)
    setUpdateSuccessMessage(null)
  }
}

const handleEditProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  if (!editProductData) return
  const { name, value } = e.target
  setEditProductData(prev => prev ? { ...prev, [name]: value } : null)
}

const handleEditCategoryChange = (value: string) => {
  if (!editProductData) return
  setEditProductData(prev => prev ? { ...prev, category_id: parseInt(value) } : null)
}

const handleEditAvailabilityChange = (value: string) => {
  if (!editProductData) return
  setEditProductData(prev => prev ? { ...prev, is_available: value === "true" } : null)
}

const handleSaveEditProduct = async () => {
  if (!editProductData) return

  if (!editProductData.title.trim() || editProductData.title.trim().length < 3) {
    alert("Titlul produsului trebuie să aibă minim 3 caractere")
    return
  }

  if (!editProductData.description.trim() || editProductData.description.trim().length < 10) {
    alert("Descrierea produsului trebuie să aibă minim 10 caractere")
    return
  }

  const price = parseFloat(editProductData.price)
  if (isNaN(price) || price <= 0) {
    alert("Prețul trebuie să fie un număr pozitiv")
    return
  }

  const stock = parseInt(editProductData.stock)
  if (isNaN(stock) || stock < 0) {
    alert("Stocul trebuie să fie un număr pozitiv sau 0")
    return
  }

  if (!editProductData.category_id) {
    alert("Selectează o categorie")
    return
  }

  setIsUpdating(true)
  setUpdateSuccessMessage(null)

  try {
    const payload: UpdateProductPayload = {
      title: editProductData.title,
      description: editProductData.description,
      price: editProductData.price,
      stock: editProductData.stock,
      category_id: editProductData.category_id,
      is_available: editProductData.is_available,
    }

    await updateProduct(editProductData.id, payload)

    if (hasImageChanges && productImages.length > 0) {
      const imagesPayload = productImages.map(img => ({
        id: img.id,
        display_order: img.display_order,
        is_thumbnail: img.is_thumbnail
      }))
      
      await updateProductImages(editProductData.id, imagesPayload)
    }
    
    setUpdateSuccessMessage("Produsul a fost actualizat cu succes!")
    setHasImageChanges(false)
    
    await loadProducts()
    
    setTimeout(() => {
      handleCloseEditModal()
    }, 2000)
  } catch (error) {
    console.error("Error updating product:", error)
    alert(error instanceof Error ? error.message : "Eroare la actualizarea produsului")
  } finally {
    setIsUpdating(false)
  }
}
  ///////// STERGERE PRODUS //////////
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  //functie de stergere a unui produs
  const handleDeleteProduct = (id: number) => {
    if (window.confirm("Ești sigur că vrei să ștergi acest produs?")) {
      
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
                    onClick={handleOpenAddProductModal}
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

      {editingProduct && editProductData && (
        <EditProductModal
          product={editProductData}
          categories={categories}
          isLoadingCategories={isLoadingCategories}
          isSaving={isUpdating}
          successMessage={updateSuccessMessage}
          onClose={handleCloseEditModal}
          onSave={handleSaveEditProduct}
          onProductChange={handleEditProductChange}
          onCategoryChange={handleEditCategoryChange}
          onAvailabilityChange={handleEditAvailabilityChange}
          onImagesReorder={handleImagesReorder}
        />
      )}

    </div>
  )
}
