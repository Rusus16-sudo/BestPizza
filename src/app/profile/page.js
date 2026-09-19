'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/utils/supabase/client'
import styles from './Profile.module.css'

export default function ProfilePage() {
  const router = useRouter()
  const [supabase] = useState(() => getBrowserClient())
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    email: '',
    password: ''
  })
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarUrl(URL.createObjectURL(file));
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        setFormData({
          displayName: user.user_metadata?.display_name || (user.email ? user.email.split('@')[0] : ''),
          phone: user.user_metadata?.phone || '',
          email: user.email,
          password: ''
        })
      } else {
        router.push('/login')
      }
      setLoading(false)
    }
    fetchUser()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setUpdating(true)
    setMessage({ text: '', type: '' })

    try {
      const updates = {}
      
      // Update metadata
      updates.data = {
        display_name: formData.displayName,
        phone: formData.phone
      }

      // Update email if changed
      if (formData.email !== user.email) {
        updates.email = formData.email
      }

      // Update password if provided
      if (formData.password) {
        if (formData.password.length < 6) {
          setMessage({ text: 'Le mot de passe doit contenir au moins 6 caractères', type: 'error' })
          setUpdating(false)
          return
        }
        updates.password = formData.password
      }

      const { data, error } = await supabase.auth.updateUser(updates)

      if (error) throw error

      setUser(data.user)
      setMessage({ text: 'Profil mis à jour avec succès !', type: 'success' })
      setFormData(prev => ({ ...prev, password: '' })) // Clear password field
    } catch (error) {
      console.error(error)
      setMessage({ text: error.message || 'Une erreur est survenue', type: 'error' })
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className={styles.container} style={{justifyContent: 'center', alignItems: 'center'}}>Chargement...</div>
  }

  if (!user) return null



  const initial = user.email ? user.email.charAt(0).toUpperCase() : 'U'
  const displayName = user.user_metadata?.display_name || (user.email ? user.email.split('@')[0] : 'Utilisateur')

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1>Mon Profil</h1>
      </header>

      <div className={styles.profileCard}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatar}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profil" className={styles.avatarImg} />
            ) : (
              initial
            )}
          </div>
          <label className={styles.avatarEditBtn} title="Modifier la photo">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>
        </div>
        <div className={styles.userInfo}>
          <h2 className={styles.userName}>{displayName}</h2>
          <p className={styles.userEmail}>{user.email}</p>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h3 className={styles.sectionTitle}>Paramètres du compte</h3>
        
        {message.text && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        <form className={styles.settingsForm} onSubmit={handleUpdateProfile}>
          <div className={styles.inputGroup}>
            <label>Nom d'utilisateur</label>
            <input 
              type="text" 
              className={styles.formInput} 
              value={formData.displayName} 
              onChange={e => setFormData({...formData, displayName: e.target.value})} 
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label>Numéro de téléphone</label>
            <input 
              type="tel" 
              className={styles.formInput} 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              placeholder="+237 6 12 34 56 78"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Adresse E-mail</label>
            <input 
              type="email" 
              className={styles.formInput} 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Nouveau Mot de passe (laisser vide pour ne pas modifier)</label>
            <input 
              type="password" 
              className={styles.formInput} 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className={styles.saveBtn} disabled={updating}>
            {updating ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </button>
        </form>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          Se déconnecter
        </button>
      </div>


    </div>
  )
}
