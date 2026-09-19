'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { promoApplies } from '@/lib/pricing'

const CartContext = createContext()

export function formatPrice(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('fr-FR')} FCFA`
}

function sameCustomizations(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) if (!!a[k] !== !!b[k]) return false
  return true
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([])
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [isMounted, setIsMounted] = useState(false)

  // Chargement depuis le stockage local
  useEffect(() => {
    setIsMounted(true)
    try {
      const saved = localStorage.getItem('pizza_cart')
      if (saved) setCartItems(JSON.parse(saved))
      const promo = localStorage.getItem('pizza_promo')
      if (promo) setAppliedPromo(JSON.parse(promo))
    } catch (e) {
      console.error('Failed to parse cart')
    }
  }, [])

  // Sauvegarde à chaque changement
  useEffect(() => {
    if (!isMounted) return
    try {
      localStorage.setItem('pizza_cart', JSON.stringify(cartItems))
      if (appliedPromo) localStorage.setItem('pizza_promo', JSON.stringify(appliedPromo))
      else localStorage.removeItem('pizza_promo')
    } catch (e) {}
  }, [cartItems, appliedPromo, isMounted])

  const addToCart = (product, quantity, size, customizations, totalPrice) => {
    const unitPrice = totalPrice / quantity
    setCartItems(prev => {
      // Même produit, même taille, mêmes options : on additionne les quantités
      const existing = prev.find(item =>
        item.productId === product.id &&
        item.size === size &&
        sameCustomizations(item.customizations, customizations)
      )
      if (existing) {
        return prev.map(item => item.id === existing.id
          ? { ...item, quantity: item.quantity + quantity, price: item.unitPrice * (item.quantity + quantity) }
          : item)
      }
      return [...prev, {
        id: Date.now().toString(),
        productId: product.id,
        title: product.title,
        category: product.category,
        price: totalPrice, // Prix pour toute la quantité
        unitPrice,
        image: product.image,
        quantity,
        size,
        customizations
      }]
    })
  }

  const updateQuantity = (cartItemId, quantity) => {
    if (quantity < 1) return removeFromCart(cartItemId)
    setCartItems(prev => prev.map(item => item.id === cartItemId
      ? { ...item, quantity, price: (item.unitPrice || item.price / item.quantity) * quantity }
      : item))
  }

  const removeFromCart = (cartItemId) => {
    setCartItems(prev => prev.filter(item => item.id !== cartItemId))
  }

  const clearCart = () => {
    setCartItems([])
    setAppliedPromo(null)
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0)

  // Réduction du code promo, calculée article par article
  const discountAmount = appliedPromo ? cartItems.reduce((sum, item) => {
    const applies = promoApplies(appliedPromo, { id: item.productId, category: item.category })
    return applies ? sum + (item.price * appliedPromo.discount_percentage) / 100 : sum
  }, 0) : 0

  const finalTotal = Math.max(0, Math.round(cartTotal - discountAmount))

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, updateQuantity, removeFromCart, clearCart,
      totalItems, cartTotal, appliedPromo, setAppliedPromo,
      discountAmount: Math.round(discountAmount), finalTotal, isMounted
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
