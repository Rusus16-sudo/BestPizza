'use client'
import styles from './ProductCard.module.css'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'

export default function ProductCard({ id, title, price, image, category = 'Pizza', isSpicy = false, rating = "4.5", prepTime = "25-35 min" }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [isGerant, setIsGerant] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  
  const [editForm, setEditForm] = useState({
    title,
    price,
    category,
    image,
    isSpicy,
    prep_time: prepTime
  })
  
  const router = useRouter()

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (data?.role === 'gerant') {
          setIsGerant(true)
        }
      }
    }
    checkRole()
  }, [])
  
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleDelete = async () => {
    if (String(id).length < 10) {
      toast.error("Ce produit est un exemple de démonstration et ne peut pas être supprimé. Veuillez ajouter vos propres produits dans l'espace d'Administration.")
      return
    }
    setIsSaving(true)
    const supabase = createClient()
    await supabase.from('products').delete().eq('id', id)
    setIsSaving(false)
    setDeleteModalOpen(false)
    showToast('Le plat a été supprimé')
    router.refresh()
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    
    if (String(id).length < 10) {
      toast.error("Ce produit est un exemple de démonstration et ne peut pas être modifié. Veuillez ajouter vos propres produits dans l'espace d'Administration.")
      return
    }

    setIsSaving(true)
    const supabase = createClient()
    
    let finalImageUrl = editForm.image;
    
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
        setIsSaving(false)
        return
      }
    }

    const payload = {
      title: editForm.title,
      price: editForm.price,
      category: editForm.category,
      image: finalImageUrl,
      prep_time: editForm.prep_time || '25-35 min'
    }

    const { error: dbError } = await supabase.from('products').update(payload).eq('id', id)
    
    setIsSaving(false)
    if (dbError) {
      toast.error("Erreur de modification : " + dbError.message)
      return
    }

    setEditModalOpen(false)
    setImageFile(null)
    showToast('Le plat a été modifié')
    router.refresh()
  }

  // Use static rating from prop to avoid SSR hydration mismatch
  
  return (
    <>
    <Link href={`/product/${id}`} style={{ textDecoration: 'none' }}>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
          <Image src={image} alt={title} fill className={styles.productImage} style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
          {isGerant && (
            <>
              <button 
                className={styles.dotsBtn} 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowDropdown(!showDropdown)
                }}
              >
                &#8942;
              </button>
              {showDropdown && (
                <div className={styles.dropdownMenu}>
                  <button 
                    className={styles.dropdownItem} 
                    onClick={(e) => { 
                      e.preventDefault()
                      e.stopPropagation()
                      setEditForm({ title, price, category, image, isSpicy, prep_time: prepTime })
                      setEditModalOpen(true)
                      setShowDropdown(false)
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Modifier
                  </button>
                  <button 
                    className={`${styles.dropdownItem} ${styles.danger}`} 
                    onClick={(e) => { 
                      e.preventDefault()
                      e.stopPropagation()
                      setDeleteModalOpen(true)
                      setShowDropdown(false)
                    }}
                  >
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
            </>
          )}
        </div>
        
        <div className={styles.content}>
          <div className={styles.headerRow}>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.rating}>
              <svg className={styles.star} viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              {rating}
            </div>
          </div>
          
          <div className={styles.subtitle}>
            {category}
          </div>
          
          <div className={styles.footer}>
            <div className={styles.metaItem}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              {prepTime}
            </div>
            <div className={styles.metaItem}>
              <span style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{price} FCFA</span>
              <span style={{ margin: '0 4px', opacity: 0.4 }}>•</span>
              <span style={{ fontSize: '0.75rem' }}>Livraison</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
    
    {deleteModalOpen && (
      <div className={styles.modalOverlay}>
        <div className={styles.modal} style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h3 className={styles.modalTitle}>Supprimer ce plat ?</h3>
          <p className={styles.modalText}>Voulez-vous vraiment supprimer "{title}" ? Cette action est irréversible.</p>
          <div className={styles.modalActions} style={{ justifyContent: 'center' }}>
            <button className={`${styles.solidBtn} ${styles.cancelBtn}`} onClick={() => setDeleteModalOpen(false)} disabled={isSaving}>Annuler</button>
            <button className={`${styles.solidBtn} ${styles.solidBtnDanger}`} onClick={handleDelete} disabled={isSaving}>
              {isSaving ? 'Suppression...' : 'Oui, supprimer'}
            </button>
          </div>
        </div>
      </div>
    )}

    {editModalOpen && (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <h3 className={styles.modalTitle}>Modifier un produit</h3>
          <p className={styles.modalText}>Modifiez les informations pour "{title}".</p>
          <form onSubmit={handleEdit}>
            <div className={styles.inputGroup}>
              <label>Nom du produit</label>
              <input type="text" className={styles.formInput} value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} required />
            </div>
            
            <div className={styles.productFormGrid}>
              <div className={styles.inputGroup}>
                <label>Prix (FCFA)</label>
                <input type="number" className={styles.formInput} value={editForm.price} onChange={(e) => setEditForm({...editForm, price: e.target.value})} required />
              </div>
              <div className={styles.inputGroup}>
                <label>Catégorie</label>
                <select className={styles.formInput} value={editForm.category} onChange={(e) => setEditForm({...editForm, category: e.target.value})}>
                  <option value="Pizza">Pizza</option>
                  <option value="Burgers">Burgers</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Drinks">Boissons</option>
                </select>
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label>Temps de préparation</label>
              <input type="text" className={styles.formInput} placeholder="ex: 15-20 min" value={editForm.prep_time} onChange={(e) => setEditForm({...editForm, prep_time: e.target.value})} required />
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
                {(imageFile || editForm.image) ? (
                  <div className={styles.imagePreviewContainer}>
                    <img 
                      src={imageFile ? URL.createObjectURL(imageFile) : editForm.image} 
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

            <div className={styles.checkboxGroup} onClick={() => setEditForm({...editForm, isSpicy: !editForm.isSpicy})}>
              <input type="checkbox" checked={editForm.isSpicy} readOnly />
              <label>Ce plat est épicé</label>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={`${styles.solidBtn} ${styles.cancelBtn}`} onClick={() => setEditModalOpen(false)} disabled={isSaving}>Annuler</button>
              <button type="submit" className={`${styles.solidBtn} ${styles.solidBtnPass}`} disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
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
    </>
  )
}
