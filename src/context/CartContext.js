'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([])
  const [isMounted, setIsMounted] = useState(false)

  // Load from local storage on mount
  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem('pizza_cart')
    if (saved) {
      try {
        setCartItems(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse cart')
      }
    }
  }, [])

  // Save to local storage on change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('pizza_cart', JSON.stringify(cartItems))
    }
  }, [cartItems, isMounted])

  const addToCart = (product, quantity, size, customizations, totalPrice) => {
    const newItem = {
      id: Date.now().toString(), // Unique ID for the cart item
      productId: product.id,
      title: product.title,
      price: totalPrice, // Price for the full quantity
      unitPrice: totalPrice / quantity,
      image: product.image,
      quantity,
      size,
      customizations
    }
    
    setCartItems(prev => [...prev, newItem])
  }

  const removeFromCart = (cartItemId) => {
    setCartItems(prev => prev.filter(item => item.id !== cartItemId))
  }
  
  const clearCart = () => setCartItems([])

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0)

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, totalItems, cartTotal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
