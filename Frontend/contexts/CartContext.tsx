"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getCart } from '@/lib/api/cart'
import { getUser } from '@/lib/auth-utils'

interface CartContextType {
  cartItemCount: number
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType>({
  cartItemCount: 0,
  refreshCart: async () => {},
})

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItemCount, setCartItemCount] = useState(0)

  const refreshCart = async () => {
    // Only fetch cart if user is logged in as buyer
    const user = getUser()
    if (!user || user.role !== 'buyer') {
      setCartItemCount(0)
      return
    }

    try {
      const cart = await getCart()
      const count = cart.items.reduce((sum, item) => sum + item.quantity, 0)
      setCartItemCount(count)
    } catch {
      setCartItemCount(0)
    }
  }

  useEffect(() => {
    refreshCart()
  }, [])

  return (
    <CartContext.Provider value={{ cartItemCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
