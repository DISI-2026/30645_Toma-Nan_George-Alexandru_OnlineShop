"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, ShoppingCart, User, Menu, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getUser, clearLocalAuth } from "@/lib/auth-utils"
import { logoutUser } from "@/lib/api/auth"
import { useCart } from "@/contexts/CartContext"

interface NavbarProps {
  onSearch?: (query: string) => void
  searchValue?: string
}

export default function Navbar({ onSearch, searchValue = "" }: NavbarProps) {
  const router = useRouter()
  const [user, setUser] = useState<{ id: number; email: string; role: string } | null>(null)
  const [searchInput, setSearchInput] = useState(searchValue)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { cartItemCount } = useCart()

  useEffect(() => {
    setUser(getUser())
  }, [])

  useEffect(() => {
    setSearchInput(searchValue)
  }, [searchValue])

  const handleLogout = async () => {
    await logoutUser()
    clearLocalAuth()
    setUser(null)
    router.push("/login")
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchInput)
    } else {
      router.push(`/?q=${encodeURIComponent(searchInput)}`)
    }
  }

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="md:hidden text-white" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Link href="/">
              <div className="text-xl font-bold cursor-pointer">
                <span className="text-orange-500">Shop</span>
                <span className="text-white">Verse</span>
              </div>
            </Link>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4">
            <div className="relative">
              <Input
                placeholder="Cauta produse..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-4 pr-12 py-2 rounded-md border-orange-500 text-slate-900"
              />
              <Button 
                type="submit" 
                size="sm" 
                className="absolute right-1 top-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </form>

          <div className="flex items-center gap-2">
            <Link href="/cart">
              <Button variant="ghost" size="sm" className="text-white hover:text-orange-400 relative">
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center font-bold">
                    {cartItemCount}
                  </span>
                )}
                <span className="ml-1 hidden sm:inline">Coș</span>
              </Button>
            </Link>
            {user ? (
              <>
                <Link href={user.role === 'seller' ? '/seller' : '/buyer/profile'}>
                  <Button variant="ghost" size="sm" className="text-orange-300 hover:text-orange-400 hidden sm:flex">
                    <User className="w-4 h-4 mr-1" />
                    {user.email}
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white" 
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
                    <User className="w-4 h-4 mr-1" />Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
