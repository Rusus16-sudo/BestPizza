'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import DatePicker, { registerLocale } from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { fr } from 'date-fns/locale/fr'
import styles from './Admin.module.css'

registerLocale('fr', fr)

export default function AdminClient({ initialStaff }) {
  const router = useRouter()
  const supabase = createClient()
  
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard', 'staff', 'menu'
  
  // --- STAFF STATE ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('cuisinier')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [staff, setStaff] = useState(initialStaff)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' })

  // --- DASHBOARD STATE ---
  const [dateRange, setDateRange] = useState([new Date(), new Date()])
  const [startDate, endDate] = dateRange
  const [activePeriod, setActivePeriod] = useState('today') // today, yesterday, week, month, custom
  const [periodMetrics, setPeriodMetrics] = useState({ count: 0, revenue: 0 })
  const [dashboardLoading, setDashboardLoading] = useState(true)

  // --- MENU STATE ---
  const [products, setProducts] = useState([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuModalOpen, setMenuModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({ title: '', category: 'Pizzas', price: '', description: '', image: '' })
  const [imageFile, setImageFile] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  // --- OFFERS STATE ---
  const [offers, setOffers] = useState([])
  const [offersLoading, setOffersLoading] = useState(true)
  const [offerModalOpen, setOfferModalOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState(null)
  const [offerForm, setOfferForm] = useState({ 
    title: '', description: '', code: '', theme: 'orange',
    valid_until: '', discount_percentage: 10, target_type: 'all', target_value: ''
  })

  // --- REVIEWS STATE ---
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchMetrics()
    } else if (activeTab === 'menu') {
      fetchProducts()
    } else if (activeTab === 'offers') {
      fetchOffers()
    } else if (activeTab === 'reviews') {
      fetchReviews()
    }
  }, [activeTab, dateRange])

  const fetchMetrics = async () => {
    setDashboardLoading(true)
    
    // Si endDate est null (pendant la sélection d'une plage), on attend
    if (!startDate || !endDate) return;

    // Ajuster les heures pour couvrir la journée entière
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('created_at, total_price')
      .eq('status', 'livre')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (!error && orders) {
      let count = 0
      let revenue = 0
      
      orders.forEach(order => {
        count += 1
        revenue += Number(order.total_price) || 0
      })
      
      setPeriodMetrics({ count, revenue })
    }
    setDashboardLoading(false)
  }

  const handlePeriodChange = (period) => {
    setActivePeriod(period)
    const today = new Date()
    
    if (period === 'today') {
      setDateRange([today, today])
    } else if (period === 'yesterday') {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      setDateRange([yesterday, yesterday])
    } else if (period === 'week') {
      const startOfWeek = new Date(today)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
      startOfWeek.setDate(diff)
      setDateRange([startOfWeek, today])
    } else if (period === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      setDateRange([startOfMonth, today])
    } else if (period === 'custom') {
      // Garder les dates actuelles, l'utilisateur va les modifier via le datepicker
    }
  }

  const fetchProducts = async () => {
    setMenuLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category')
    
    if (!error && data) {
      setProducts(data)
    }
    setMenuLoading(false)
  }

  const fetchOffers = async () => {
    setOffersLoading(true)
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setOffers(data)
    }
    setOffersLoading(false)
  }

  const fetchReviews = async () => {
    setReviewsLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        products(title),
        profiles(email, full_name, user_role)
      `)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setReviews(data)
    }
    setReviewsLoading(false)
  }

  // --- MENU HANDLERS ---
  const openMenuModal = (product = null) => {
    if (product) {
      setEditingProduct(product)
      setProductForm({
        title: product.title,
        category: product.category,
        price: product.price.toString(),
        description: product.description || '',
        image: product.image,
        prep_time: product.prep_time || '25-35 min'
      })
    } else {
      setEditingProduct(null)
      setProductForm({ title: '', category: 'Pizzas', price: '', description: '', image: '', prep_time: '25-35 min' })
    }
    setImageFile(null)
    setMenuModalOpen(true)
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    setFormLoading(true)

    let finalImageUrl = productForm.image;
    
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, imageFile)
        
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName)
        finalImageUrl = publicUrl
      } else {
        toast.error("Erreur lors de l'upload de l'image : " + uploadError.message)
        setFormLoading(false)
        return
      }
    }

    const payload = {
      title: productForm.title,
      category: productForm.category,
      price: Number(productForm.price),
      description: productForm.description,
      image: finalImageUrl,
      prep_time: productForm.prep_time || '25-35 min'
    }

    let error;
    if (editingProduct) {
      const { error: err } = await supabase.from('products').update(payload).eq('id', editingProduct.id)
      error = err
    } else {
      const { error: err } = await supabase.from('products').insert([payload])
      error = err
    }

    if (!error) {
      fetchProducts()
      setMenuModalOpen(false)
      showToast(editingProduct ? 'Le plat a été modifié' : 'Le plat a été ajouté')
      router.refresh()
    } else {
      toast.error('Erreur lors de la sauvegarde: ' + error.message)
    }
    setFormLoading(false)
  }

  const handleDeleteProduct = async (id) => {
    if (confirm('Voulez-vous vraiment supprimer ce produit ?')) {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (!error) {
        fetchProducts()
        showToast('Le plat a été supprimé')
        router.refresh()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  // --- OFFERS HANDLERS ---
  const openOfferModal = (offer = null) => {
    if (offer) {
      setEditingOffer(offer)
      setOfferForm({
        title: offer.title,
        description: offer.description || '',
        code: offer.code,
        theme: offer.theme || 'orange',
        valid_until: offer.valid_until ? new Date(offer.valid_until) : null,
        discount_percentage: offer.discount_percentage || 10,
        target_type: offer.target_type || 'all',
        target_value: offer.target_value || ''
      })
    } else {
      setEditingOffer(null)
      setOfferForm({ 
        title: '', description: '', code: '', theme: 'orange',
        valid_until: null, discount_percentage: 10, target_type: 'all', target_value: ''
      })
    }
    setOfferModalOpen(true)
  }

  const handleSaveOffer = async (e) => {
    e.preventDefault()
    setFormLoading(true)

    const payload = {
      title: offerForm.title,
      description: offerForm.description,
      code: offerForm.code,
      theme: offerForm.theme,
      valid_until: offerForm.valid_until ? offerForm.valid_until.toISOString() : null,
      discount_percentage: parseInt(offerForm.discount_percentage),
      target_type: offerForm.target_type,
      target_value: offerForm.target_value
    }

    let error;
    if (editingOffer) {
      const { error: err } = await supabase.from('offers').update(payload).eq('id', editingOffer.id)
      error = err
    } else {
      const { error: err } = await supabase.from('offers').insert([payload])
      error = err
    }

    if (!error) {
      fetchOffers()
      setOfferModalOpen(false)
      showToast(editingOffer ? 'La promotion a été modifiée' : 'La promotion a été ajoutée')
      router.refresh()
    } else {
      toast.error('Erreur lors de la sauvegarde: ' + error.message)
    }
    setFormLoading(false)
  }

  const handleDeleteOffer = async (id) => {
    if (confirm('Voulez-vous vraiment supprimer cette promotion ?')) {
      const { error } = await supabase.from('offers').delete().eq('id', id)
      if (!error) {
        fetchOffers()
        showToast('La promotion a été supprimée')
        router.refresh()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  // --- STAFF HANDLERS ---
  const handleCreateUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création')
      }

      setMessage({ type: 'success', text: `Compte ${role} créé avec succès.` })
      setStaff([{ id: data.user.id, email: email, role: role, is_active: true, created_at: new Date().toISOString() }, ...staff])
      setEmail('')
      setPassword('')
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = !currentStatus
    try {
      const res = await fetch('/api/admin/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: newStatus })
      })
      if (!res.ok) throw new Error('Erreur lors du changement de statut')
      setStaff(staff.map(s => s.id === userId ? { ...s, is_active: newStatus } : s))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      setResetMessage({ type: 'success', text: 'Mot de passe réinitialisé.' })
      setNewPassword('')
      setTimeout(() => {
        setResetModalOpen(false)
        setResetMessage({ type: '', text: '' })
      }, 1500)
    } catch (err) {
      setResetMessage({ type: 'error', text: err.message })
    } finally {
      setResetLoading(false)
    }
  }

  const openResetModal = (user) => {
    setSelectedUser(user)
    setResetModalOpen(true)
    setResetMessage({ type: '', text: '' })
    setNewPassword('')
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Administration</h1>
          <p>Gérez votre restaurant en toute simplicité.</p>
        </div>
      </header>

      {/* TABS */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tab} ${activeTab === 'dashboard' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Tableau de Bord
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'staff' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          Personnel
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'menu' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          Gestion du Menu
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'offers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('offers')}
        >
          Promotions
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'reviews' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Avis Clients
        </button>
      </div>

      {/* TAB CONTENT: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div>
          {dashboardLoading ? (
            <p>Chargement des statistiques...</p>
          ) : (
            <>
              <div className={styles.dashboardHeader}>
                <div>
                  <h2 className={styles.dashboardTitle}>Aperçu des Ventes</h2>
                  <p className={styles.dashboardSubtitle}>Suivez vos performances sur la période sélectionnée</p>
                </div>
              </div>

              <div className={styles.filterSection}>
                <div className={styles.periodButtons}>
                  <button className={`${styles.periodBtn} ${activePeriod === 'today' ? styles.active : ''}`} onClick={() => handlePeriodChange('today')}>Aujourd'hui</button>
                  <button className={`${styles.periodBtn} ${activePeriod === 'yesterday' ? styles.active : ''}`} onClick={() => handlePeriodChange('yesterday')}>Hier</button>
                  <button className={`${styles.periodBtn} ${activePeriod === 'week' ? styles.active : ''}`} onClick={() => handlePeriodChange('week')}>Cette Semaine</button>
                  <button className={`${styles.periodBtn} ${activePeriod === 'month' ? styles.active : ''}`} onClick={() => handlePeriodChange('month')}>Ce Mois</button>
                  <button className={`${styles.periodBtn} ${activePeriod === 'custom' ? styles.active : ''}`} onClick={() => handlePeriodChange('custom')}>Période Personnalisée</button>
                </div>

                {activePeriod === 'custom' && (
                  <div className={styles.datePickerContainer}>
                    <label>Sélectionnez une plage de dates :</label>
                    <DatePicker
                      selectsRange={true}
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(update) => setDateRange(update)}
                      isClearable={false}
                      locale="fr"
                      dateFormat="dd/MM/yyyy"
                      className={styles.formInput}
                      wrapperClassName={styles.datePickerWrapper}
                    />
                  </div>
                )}
              </div>

              <div className={styles.metricsGridLarge}>
                <div className={`${styles.metricCard} ${styles.cardOrange}`}>
                  <div className={styles.metricIconBox}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div className={styles.metricContent}>
                    <div className={styles.metricTitle}>Chiffre d'Affaires</div>
                    <div className={styles.metricValue}>{periodMetrics.revenue.toLocaleString('fr-FR')} <span className={styles.currency}>FCFA</span></div>
                    <div className={styles.metricSubtext}>
                      Pour la période sélectionnée
                    </div>
                  </div>
                  <div className={styles.metricBgDeco}></div>
                </div>

                <div className={`${styles.metricCard} ${styles.cardBlue}`}>
                  <div className={styles.metricIconBox}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                  </div>
                  <div className={styles.metricContent}>
                    <div className={styles.metricTitle}>Commandes Livrées</div>
                    <div className={styles.metricValue}>{periodMetrics.count} <span className={styles.currency}>commandes</span></div>
                    <div className={styles.metricSubtext}>
                      Pour la période sélectionnée
                    </div>
                  </div>
                  <div className={styles.metricBgDeco}></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: STAFF */}
      {activeTab === 'staff' && (
        <div className={styles.grid}>
          {/* CREATE STAFF CARD */}
          <div className={styles.card} style={{ alignSelf: 'start' }}>
            <h2>Nouveau membre</h2>
            <form onSubmit={handleCreateUser}>
              <div className={styles.inputGroup}>
                <label>Rôle</label>
                <div className={styles.dropdownContainer}>
                  <select className={styles.formInput} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="cuisinier">Cuisinier</option>
                    <option value="livreur">Livreur</option>
                  </select>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Adresse Email</label>
                <input type="email" className={styles.formInput} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employe@bestpizza.com" required />
              </div>
              <div className={styles.inputGroup}>
                <label>Mot de passe provisoire</label>
                <input type="password" className={styles.formInput} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 caractères" required minLength="6" />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={loading || !email || !password}>
                {loading ? 'En cours...' : 'Créer le compte'}
              </button>
            </form>
            {message.text && (
              <div className={`${styles.message} ${styles[message.type]}`}>
                {message.text}
              </div>
            )}
          </div>

          {/* STAFF LIST CARD */}
          <div className={styles.card}>
            <h2>Équipe active</h2>
            {staff.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.5 }}>Aucun membre</p>
            ) : (
              <div className={styles.memberList}>
                {staff.map(member => (
                  <div key={member.id} className={styles.memberCard} style={{ opacity: member.is_active ? 1 : 0.65 }}>
                    <div className={styles.memberInfo}>
                      <div className={styles.memberAvatar}>{(member.email || 'U').charAt(0).toUpperCase()}</div>
                      <div className={styles.memberDetails}>
                        <span className={styles.memberEmail}>{member.email || 'Email non renseigné'}</span>
                        <span className={styles.memberRole}>
                          <span className={`${styles.roleBadge} ${member.is_active ? styles[member.role] : styles.inactive}`}>{member.role}</span>
                        </span>
                      </div>
                    </div>
                    <div className={styles.memberActions}>
                      <button onClick={() => openResetModal(member)} className={`${styles.solidBtn} ${styles.solidBtnPass}`}>MDP</button>
                      <button onClick={() => handleToggleStatus(member.id, member.is_active)} className={`${styles.solidBtn} ${member.is_active ? styles.solidBtnSuspend : styles.solidBtnActivate}`}>
                        {member.is_active ? 'Suspendre' : 'Réactiver'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: MENU */}
      {activeTab === 'menu' && (
        <div onClick={() => setOpenDropdownId(null)}>
          <div className={styles.menuHeader}>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Carte du Restaurant</h2>
          </div>
          
          {menuLoading ? (
            <p>Chargement du menu...</p>
          ) : (
            <div className={styles.menuGrid}>
              {/* ADD PRODUCT CARD */}
              <div className={styles.addCard} onClick={() => openMenuModal()}>
                <div className={styles.addCardIcon}>+</div>
                <span>Ajouter un produit</span>
              </div>

              {products.map(product => (
                <div key={product.id} className={styles.menuItemCard}>
                  <div className={styles.menuItemImgWrapper}>
                    <img src={product.image} alt={product.title} className={styles.menuItemImg} />
                    <button 
                      className={styles.dotsBtn} 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(openDropdownId === product.id ? null : product.id);
                      }}
                    >
                      &#8942;
                    </button>
                    {openDropdownId === product.id && (
                      <div className={styles.dropdownMenu}>
                        <button className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); openMenuModal(product); setOpenDropdownId(null); }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Modifier
                        </button>
                        <button className={`${styles.dropdownItem} ${styles.danger}`} onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); setOpenDropdownId(null); }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={styles.menuItemContent}>
                    <span className={styles.menuItemCategory}>{product.category}</span>
                    <h3 className={styles.menuItemTitle}>{product.title}</h3>
                    <div className={styles.menuItemPrice}>{product.price} FCFA</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MENU MODAL */}
      {menuModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '500px' }}>
            <h3>{editingProduct ? 'Modifier un produit' : 'Nouveau produit'}</h3>
            <p>Entrez les détails du plat pour le menu.</p>
            <form onSubmit={handleSaveProduct}>
              <div className={styles.inputGroup}>
                <label>Nom du produit</label>
                <input type="text" className={styles.formInput} value={productForm.title} onChange={(e) => setProductForm({...productForm, title: e.target.value})} required />
              </div>
              
              <div className={styles.productFormGrid}>
                <div className={styles.inputGroup}>
                  <label>Catégorie</label>
                  <div className={styles.dropdownContainer}>
                    <select className={styles.formInput} value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})}>
                      <option value="Pizzas">Pizzas</option>
                      <option value="Burgers">Burgers</option>
                      <option value="Tacos">Tacos</option>
                      <option value="Boissons">Boissons</option>
                      <option value="Desserts">Desserts</option>
                    </select>
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label>Prix (FCFA)</label>
                  <input type="number" className={styles.formInput} value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required />
                </div>
                <div className={styles.inputGroup}>
                  <label>Temps de préparation</label>
                  <input type="text" className={styles.formInput} placeholder="ex: 15-20 min" value={productForm.prep_time} onChange={(e) => setProductForm({...productForm, prep_time: e.target.value})} required />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Image du plat</label>
                <div className={styles.fileUploadZone}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className={styles.fileUploadInput} 
                    onChange={(e) => setImageFile(e.target.files[0])} 
                  />
                  {(imageFile || productForm.image) ? (
                    <div className={styles.imagePreviewContainer}>
                      <img 
                        src={imageFile ? URL.createObjectURL(imageFile) : productForm.image} 
                        alt="Preview" 
                        className={styles.imagePreview} 
                      />
                      <div className={styles.imagePreviewOverlay}>
                        Changer l'image
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fileUploadContent}>
                      <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <span className={styles.fileUploadText}>Cliquez pour choisir une image</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setMenuModalOpen(false)} className={styles.btnCancel}>Annuler</button>
                <button type="submit" disabled={formLoading} className={styles.btnConfirm}>{formLoading ? 'Sauvegarde...' : 'Sauvegarder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT: OFFERS */}
      {activeTab === 'offers' && (
        <div className={styles.menuContainer}>
          <div className={styles.menuHeader}>
            <div>
              <h2 className={styles.dashboardTitle}>Promotions & Offres</h2>
              <p className={styles.dashboardSubtitle}>Créez des codes promo et des réductions attractives</p>
            </div>
            <button className={styles.btnConfirm} onClick={() => openOfferModal()} style={{ width: 'auto', padding: '12px 24px' }}>
              Nouvelle Offre
            </button>
          </div>

          {offersLoading ? (
            <p>Chargement des offres...</p>
          ) : (
            <div className={styles.offersGrid}>
              {offers.map(offer => (
                <div key={offer.id} className={`${styles.offerCardAdmin} ${styles['offerTheme' + offer.theme]}`}>
                  <div className={styles.offerCardActions}>
                    <button onClick={() => openOfferModal(offer)} className={styles.offerBtnEdit}>Modifier</button>
                    <button onClick={() => handleDeleteOffer(offer.id)} className={styles.offerBtnDelete}>Supprimer</button>
                  </div>
                  <div className={styles.offerCardContent}>
                    <h3 className={styles.offerTitle}>{offer.title}</h3>
                    <p className={styles.offerDesc}>{offer.description}</p>
                    <div className={styles.offerCodeBox}>
                      Code: <strong>{offer.code}</strong>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '0.85rem', opacity: 0.9 }}>
                      <div><strong>Réduction:</strong> -{offer.discount_percentage}%</div>
                      <div><strong>Valable jusqu'au:</strong> {offer.valid_until ? new Date(offer.valid_until).toLocaleDateString('fr-FR') : 'Non défini'}</div>
                      <div><strong>Cible:</strong> {offer.target_type === 'all' ? 'Tout le menu' : offer.target_type === 'category' ? `Catégorie: ${offer.target_value}` : `Produit ID: ${offer.target_value}`}</div>
                    </div>
                  </div>
                  <div className={styles.metricBgDeco}></div>
                </div>
              ))}
              {offers.length === 0 && <p>Aucune offre pour le moment.</p>}
            </div>
          )}
        </div>
      )}

      {/* MODAL OFFERS */}
      {offerModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '500px' }}>
            <h3>{editingOffer ? 'Modifier l\'offre' : 'Nouvelle offre'}</h3>
            <p>Définissez le texte et le code de la promotion.</p>
            <form onSubmit={handleSaveOffer}>
              <div className={styles.inputGroup}>
                <label>Titre de l'offre</label>
                <input type="text" className={styles.formInput} value={offerForm.title} onChange={(e) => setOfferForm({...offerForm, title: e.target.value})} placeholder="-50% sur votre première commande" required />
              </div>
              <div className={styles.inputGroup}>
                <label>Code Promo</label>
                <input type="text" className={styles.formInput} value={offerForm.code} onChange={(e) => setOfferForm({...offerForm, code: e.target.value})} placeholder="MIAM50" required />
              </div>
              <div className={styles.inputGroup}>
                <label>Date de fin de validité</label>
                <DatePicker 
                  selected={offerForm.valid_until} 
                  onChange={(date) => setOfferForm({...offerForm, valid_until: date})} 
                  locale="fr"
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Sélectionnez une date"
                  className={styles.formInput}
                  wrapperClassName={styles.datePickerWrapper}
                  minDate={new Date()}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Pourcentage de réduction (%)</label>
                <input type="number" min="1" max="100" className={styles.formInput} value={offerForm.discount_percentage} onChange={(e) => setOfferForm({...offerForm, discount_percentage: e.target.value})} required />
              </div>
              <div className={styles.inputGroup}>
                <label>Cible de la réduction</label>
                <div className={styles.dropdownContainer}>
                  <select className={styles.formInput} value={offerForm.target_type} onChange={(e) => setOfferForm({...offerForm, target_type: e.target.value})}>
                    <option value="all">Tout le menu (Toutes les commandes)</option>
                    <option value="category">Une catégorie spécifique</option>
                    <option value="product">Un produit spécifique</option>
                  </select>
                </div>
              </div>
              
              {offerForm.target_type === 'category' && (
                <div className={styles.inputGroup}>
                  <label>Nom de la catégorie (ex: Pizzas, Burgers)</label>
                  <input type="text" className={styles.formInput} value={offerForm.target_value} onChange={(e) => setOfferForm({...offerForm, target_value: e.target.value})} placeholder="Pizzas" required />
                </div>
              )}

              {offerForm.target_type === 'product' && (
                <div className={styles.inputGroup}>
                  <label>ID du produit (Trouvable dans la section Menu)</label>
                  <input type="text" className={styles.formInput} value={offerForm.target_value} onChange={(e) => setOfferForm({...offerForm, target_value: e.target.value})} placeholder="ID-du-produit" required />
                </div>
              )}

              <div className={styles.inputGroup}>
                <label>Description (Optionnelle)</label>
                <textarea className={styles.formInput} value={offerForm.description} onChange={(e) => setOfferForm({...offerForm, description: e.target.value})} placeholder="Valable pour toute commande > 5000 FCFA..."></textarea>
              </div>
              <div className={styles.inputGroup}>
                <label>Couleur du Thème</label>
                <div className={styles.dropdownContainer}>
                  <select className={styles.formInput} value={offerForm.theme} onChange={(e) => setOfferForm({...offerForm, theme: e.target.value})}>
                    <option value="orange">Orange (Dégradé)</option>
                    <option value="blue">Bleu (Dégradé)</option>
                    <option value="purple">Violet (Dégradé)</option>
                  </select>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setOfferModalOpen(false)} className={styles.btnCancel}>Annuler</button>
                <button type="submit" disabled={formLoading} className={styles.btnConfirm}>{formLoading ? 'Sauvegarde...' : 'Sauvegarder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT: AVIS CLIENTS */}
      {activeTab === 'reviews' && (
        <div>
          <div className={styles.dashboardHeader}>
            <div>
              <h2 className={styles.dashboardTitle}>Avis Clients</h2>
              <p className={styles.dashboardSubtitle}>Consultez les retours de vos clients sur vos plats</p>
            </div>
          </div>

          {reviewsLoading ? (
            <p>Chargement des avis...</p>
          ) : reviews.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Aucun avis client pour le moment.</p>
            </div>
          ) : (
            <div className={styles.reviewsGrid}>
              {reviews.map(review => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewUser}>
                      <div className={styles.userAvatar}>
                        {(review.profiles?.full_name || review.profiles?.email || 'A')[0].toUpperCase()}
                      </div>
                      <div>
                        <strong>{review.profiles?.full_name || review.profiles?.email || 'Client Anonyme'}</strong>
                        <div className={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      </div>
                    </div>
                    <div className={styles.reviewStars}>
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </div>
                  </div>
                  <div className={styles.reviewProduct}>
                    Concernant : <span>{review.products?.title || 'Produit inconnu'}</span>
                  </div>
                  <p className={styles.reviewComment}>"{review.comment}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL RESET PASSWORD */}
      {resetModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Nouveau mot de passe</h3>
            <p>Pour l'utilisateur <strong>{selectedUser?.email}</strong></p>
            <form onSubmit={handleResetPassword}>
              <div className={styles.inputGroup}>
                <label>Saisissez le nouveau mot de passe</label>
                <input type="password" className={styles.formInput} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength="6" />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setResetModalOpen(false)} className={styles.btnCancel}>Annuler</button>
                <button type="submit" disabled={resetLoading || newPassword.length < 6} className={styles.btnConfirm}>Confirmer</button>
              </div>
            </form>
            {resetMessage.text && (
              <div className={`${styles.message} ${styles[resetMessage.type]}`} style={{ marginTop: '20px' }}>
                {resetMessage.text}
              </div>
            )}
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="globalToast">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
