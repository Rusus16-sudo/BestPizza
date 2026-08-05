'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import styles from './Profile.module.css'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState(null)

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

  if (loading) {
    return <div className={styles.container} style={{justifyContent: 'center', alignItems: 'center'}}>Chargement...</div>
  }

  if (!user) return null



  const initial = user.email ? user.email.charAt(0).toUpperCase() : 'U'
  const displayName = user.email ? user.email.split('@')[0] : 'Utilisateur'

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
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Se déconnecter
        </button>
      </div>


    </div>
  )
}
