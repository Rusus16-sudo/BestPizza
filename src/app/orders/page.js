'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import styles from './Orders.module.css'
import { createClient } from '@/utils/supabase/client'
import ClientTrackingMap from '@/components/ClientTrackingMap'
import SkeletonList from '@/components/SkeletonList'
import { useCart } from '@/context/CartContext'

export default function OrdersPage() {
  const router = useRouter()
  const { addToCart } = useCart()
  const [activeTab, setActiveTab] = useState('en_cours') // 'en_cours' or 'historique'
  const [orders, setOrders] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [user, setUser] = useState(null)

  // Review state
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    const fetchOrders = async () => {
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) setUser(currentUser)

      if (!currentUser) {
        setOrders([])
        setIsLoaded(true)
        return
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          short_id,
          status,
          total_amount,
          created_at,
          order_items (
            product_id,
            product_name,
            quantity,
            price
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        const formattedOrders = data.map(o => ({
          id: o.short_id,
          uuid: o.id,
          date: o.created_at,
          status: o.status,
          total: o.total_amount,
          restaurant: 'Best Pizza',
          items: o.order_items.map(item => ({
            productId: item.product_id,
            name: item.product_name,
            quantity: item.quantity,
            price: item.price
          }))
        }))
        setOrders(formattedOrders)
      } else {
        setOrders([])
      }
      setIsLoaded(true)
    }

    fetchOrders()
  }, [])

  const activeOrders = orders.filter(o => o.status === 'en_attente' || o.status === 'en_preparation' || o.status === 'prete' || o.status === 'en_route')
  const historyOrders = orders.filter(o => o.status === 'livre' || o.status === 'annule')

  const ordersToDisplay = activeTab === 'en_cours' ? activeOrders : historyOrders

  const handleReorder = (order) => {
    let addedCount = 0;
    for (const item of order.items) {
      const product = {
        id: item.productId || Date.now().toString() + Math.random(),
        title: item.name,
        image: '/margherita.png'
      };
      
      addToCart(product, item.quantity, 'Moyenne', {}, item.price);
      addedCount++;
    }
    
    if (addedCount > 0) {
      toast.success('Plats ajoutés au panier !')
      router.push('/cart')
    }
  }

  const getStatusDisplay = (status) => {
    switch(status) {
      case 'en_attente':
        return { 
          label: 'En attente', 
          icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
          class: styles.status_en_preparation 
        }
      case 'en_preparation':
        return { 
          label: 'En préparation', 
          icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>,
          class: styles.status_en_preparation 
        }
      case 'prete':
        return {
          label: 'Prête, bientôt en route',
          icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
          class: styles.status_en_preparation
        }
      case 'en_route':
        return { 
          label: 'En route', 
          icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>, 
          class: styles.status_en_route 
        }
      case 'livre':
        return { 
          label: 'Livré', 
          icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>, 
          class: styles.status_livre 
        }
      case 'annule':
        return { 
          label: 'Annulé', 
          icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>, 
          class: styles.status_annule 
        }
      default:
        return { label: status, icon: null, class: '' }
    }
  }

  const openReviewModal = (product) => {
    setSelectedProduct(product)
    setNewReview({ rating: 5, comment: '' })
    setReviewModalOpen(true)
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!user) {
      toast.error("Vous devez être connecté pour laisser un avis.")
      return
    }
    
    setIsSubmittingReview(true)
    const supabase = createClient()
    
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('product_id', selectedProduct.productId)
      .eq('user_id', user.id)
      .maybeSingle()

    let submitError = null

    if (existingReview) {
      const { error } = await supabase
        .from('reviews')
        .update({ rating: newReview.rating, comment: newReview.comment, created_at: new Date().toISOString() })
        .eq('id', existingReview.id)
      submitError = error
    } else {
      const { error } = await supabase
        .from('reviews')
        .insert([{
          product_id: selectedProduct.productId,
          user_id: user.id,
          rating: newReview.rating,
          comment: newReview.comment
        }])
      submitError = error
    }

    setIsSubmittingReview(false)
    if (!submitError) {
      toast.success("Votre avis a bien été publié ! Merci.")
      setReviewModalOpen(false)
    } else {
      toast.error("Erreur lors de la publication : " + submitError.message)
    }
  }

  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  }


  if (!isLoaded) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1>Vos Commandes</h1>
            <p>Suivez et consultez l'historique de vos commandes.</p>
          </div>
        </header>
        <div style={{ marginTop: '32px' }}>
          <SkeletonList count={4} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1>Commandes</h1>
      </header>

      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tab} ${activeTab === 'en_cours' ? styles.active : ''}`}
          onClick={() => setActiveTab('en_cours')}
        >
          En cours
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'historique' ? styles.active : ''}`}
          onClick={() => setActiveTab('historique')}
        >
          Historique
        </button>
      </div>

      <div className={styles.ordersList}>
        {ordersToDisplay.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <p>Aucune commande à afficher.</p>
          </div>
        ) : (
          ordersToDisplay.map(order => {
            const statusInfo = getStatusDisplay(order.status)
            return (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div>
                    <div className={styles.orderId}>{order.id}</div>
                    <div className={styles.orderDate}>{formatDate(order.date)} • {order.restaurant}</div>
                  </div>
                  <div className={`${styles.orderStatus} ${statusInfo.class}`}>
                    <span>{statusInfo.icon}</span> {statusInfo.label}
                  </div>
                </div>

                <div className={styles.orderDetails}>
                  {order.items.map((item, idx) => (
                    <div key={idx} className={styles.orderItem}>
                      <span className={styles.itemName}>{item.quantity}x {item.name}</span>
                      <div className={styles.itemActions}>
                        {order.status === 'livre' && (
                          <button 
                            className={styles.rateBtn} 
                            onClick={(e) => { e.stopPropagation(); openReviewModal(item); }}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            Évaluer
                          </button>
                        )}
                        <span className={styles.itemPrice}>{item.price} FCFA</span>
                      </div>
                    </div>
                  ))}
                </div>

                {order.status === 'en_route' && (
                  <ClientTrackingMap orderId={order.uuid} />
                )}

                <div className={styles.orderTotalRow}>
                  <div>
                    <span className={styles.totalLabel}>Total : </span>
                    <span className={styles.totalPrice}>{order.total} FCFA</span>
                  </div>
                  
                  {activeTab === 'historique' && order.status === 'livre' && (
                    <button className={styles.reorderBtn} onClick={() => handleReorder(order)}>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <polyline points="23 20 23 14 17 14"></polyline>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                      </svg>
                      Recommander
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {reviewModalOpen && selectedProduct && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Évaluer "{selectedProduct.name}"</h3>
            <form onSubmit={handleSubmitReview}>
              <div className={styles.ratingInputRow}>
                <label>Note :</label>
                <div className={styles.interactiveStars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <svg 
                      key={star}
                      onClick={() => setNewReview({...newReview, rating: star})}
                      viewBox="0 0 24 24" 
                      width="32" 
                      height="32" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      strokeLinejoin="round"
                      fill={newReview.rating >= star ? "#fbbf24" : "none"}
                      color={newReview.rating >= star ? "#fbbf24" : "#cbd5e1"}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  ))}
                </div>
              </div>
              <textarea 
                placeholder="Partagez votre expérience avec ce plat (goût, portion...)"
                value={newReview.comment}
                onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                className={styles.reviewTextarea}
                rows={4}
                required
              />
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setReviewModalOpen(false)} disabled={isSubmittingReview}>
                  Annuler
                </button>
                <button type="submit" className={styles.submitReviewBtn} disabled={isSubmittingReview}>
                  {isSubmittingReview ? 'Publication...' : 'Publier mon avis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
