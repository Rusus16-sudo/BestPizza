'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { storefrontSlugFromPath, lastStorefrontSlug, DEFAULT_STOREFRONT } from '@/lib/storefront-paths'
import { promoApplies } from '@/lib/pricing'
import { formatPrice } from '@/lib/format'

const CartContext = createContext()

// Les écrans l'importent d'ici ; le serveur, de lib/format
export { formatPrice }

function sameCustomizations(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) if (!!a[k] !== !!b[k]) return false
  return true
}

// Un panier par restaurant, gardé sur l'appareil : passer d'une vitrine à l'autre
// ne mélange pas les plats.
const cartKey = (slug) => `tchopi_panier:${slug}`
const promoKey = (slug) => `tchopi_promo:${slug}`

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Avant les vitrines, il n'y avait qu'un panier : celui de Best Pizza
function migrateOldCart() {
  try {
    const old = localStorage.getItem('pizza_cart')
    if (old && !localStorage.getItem(cartKey(DEFAULT_STOREFRONT))) {
      localStorage.setItem(cartKey(DEFAULT_STOREFRONT), old)
      const promo = localStorage.getItem('pizza_promo')
      if (promo) localStorage.setItem(promoKey(DEFAULT_STOREFRONT), promo)
    }
    localStorage.removeItem('pizza_cart')
    localStorage.removeItem('pizza_promo')
  } catch {}
}

export function CartProvider({ children }) {
  const pathname = usePathname() || ''
  // Le restaurant de la page, ou le dernier visité pour les pages communes (mes commandes…)
  const [slug, setSlug] = useState(DEFAULT_STOREFRONT)
  const [cartItems, setCartItems] = useState([])
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [isMounted, setIsMounted] = useState(false)
  // Le panier affiché appartient-il bien à ce restaurant ? (sinon, on ne l'enregistre pas sous son nom)
  const [loadedSlug, setLoadedSlug] = useState(null)

  useEffect(() => {
    setSlug(storefrontSlugFromPath(pathname) || lastStorefrontSlug() || DEFAULT_STOREFRONT)
  }, [pathname])

  // Chargement du panier de ce restaurant
  useEffect(() => {
    migrateOldCart()
    setCartItems(readJSON(cartKey(slug)) || [])
    setAppliedPromo(readJSON(promoKey(slug)))
    setLoadedSlug(slug)
    setIsMounted(true)
  }, [slug])

  // Sauvegarde à chaque changement
  useEffect(() => {
    if (!isMounted || loadedSlug !== slug) return
    try {
      localStorage.setItem(cartKey(slug), JSON.stringify(cartItems))
      if (appliedPromo) localStorage.setItem(promoKey(slug), JSON.stringify(appliedPromo))
      else localStorage.removeItem(promoKey(slug))
    } catch {}
  }, [cartItems, appliedPromo, isMounted, loadedSlug, slug])

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

  // Ajoute des plats au panier d'un restaurant, même hors de sa vitrine
  // (« Recommander » depuis mes commandes, qui regroupent tous les restaurants)
  const addToStorefrontCart = (targetSlug, entries) => {
    if (targetSlug === slug) {
      entries.forEach(e => addToCart(e.product, e.quantity, e.size, e.customizations, e.totalPrice))
      return
    }
    const items = readJSON(cartKey(targetSlug)) || []
    entries.forEach((e, i) => items.push({
      id: `${Date.now()}-${i}`,
      productId: e.product.id,
      title: e.product.title,
      category: e.product.category,
      price: e.totalPrice,
      unitPrice: e.totalPrice / e.quantity,
      image: e.product.image,
      quantity: e.quantity,
      size: e.size,
      customizations: e.customizations,
    }))
    try {
      localStorage.setItem(cartKey(targetSlug), JSON.stringify(items))
    } catch {}
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
      cartItems, addToCart, addToStorefrontCart, updateQuantity, removeFromCart, clearCart,
      totalItems, cartTotal, appliedPromo, setAppliedPromo,
      discountAmount: Math.round(discountAmount), finalTotal, isMounted, storefront: slug
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
