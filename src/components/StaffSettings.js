'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getBrowserClient } from '@/utils/supabase/client'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getPushState, enablePush, sendTestPush } from '@/lib/push-client'
import styles from './StaffSettings.module.css'

const ROLE_LABELS = { cuisinier: 'Cuisinier', livreur: 'Livreur', gerant: 'Gérant', admin: 'Gérant' }

// Ce que l'on dit des notifications sur cet appareil, selon leur état
const PUSH_STATUS = {
  enabled: { tone: 'ok', text: 'Activées sur cet appareil. Vous êtes prévenu même app fermée.' },
  disabled: { tone: 'warn', text: 'Pas encore activées sur cet appareil.' },
  denied: { tone: 'warn', text: 'Bloquées. Touchez le cadenas à gauche de l’adresse du site, autorisez les notifications, puis rechargez la page.' },
  'ios-install': { tone: 'warn', text: 'Sur iPhone, ajoutez d’abord Best Pizza à l’écran d’accueil (bouton Partager, puis « Sur l’écran d’accueil »), et ouvrez l’app depuis son icône.' },
  unsupported: { tone: 'warn', text: 'Ce navigateur ne reçoit pas les notifications. Ouvrez le site dans Chrome ou Safari à jour.' },
}

/**
 * Paramètres du personnel (cuisine, livreur, gérant) : profil, notifications
 * de cet appareil, déconnexion. `home` : l'écran de travail, où ramène le retour
 * et où ouvre la notification de test.
 */
export default function StaffSettings({ home }) {
  const router = useRouter()
  const [supabase] = useState(() => getBrowserClient())
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [pushState, setPushState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      setRole(data?.role || null)
    }
    load()
    getPushState().then(setPushState).catch(() => setPushState('unsupported'))
  }, [supabase, router])

  const handleEnable = async () => {
    setBusy(true)
    try {
      const next = await enablePush()
      setPushState(next)
      if (next === 'enabled') toast.success('Notifications activées')
    } catch {
      toast.error("Les notifications n'ont pas pu être activées.")
    }
    setBusy(false)
  }

  const handleTest = async () => {
    setBusy(true)
    try {
      await sendTestPush(home)
      toast.success('Notification envoyée : elle doit arriver dans quelques secondes.')
    } catch (err) {
      toast.error(err.message)
    }
    setBusy(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const current = form.current.value
    const next = form.next.value
    if (next.length < 8) return setPasswordMessage({ type: 'error', text: 'Le nouveau mot de passe doit faire au moins 8 caractères.' })
    if (next !== form.confirm.value) return setPasswordMessage({ type: 'error', text: 'Les deux nouveaux mots de passe ne sont pas identiques.' })
    if (next === current) return setPasswordMessage({ type: 'error', text: 'Le nouveau mot de passe doit être différent de l’actuel.' })

    setPasswordBusy(true)
    setPasswordMessage(null)
    // Le mot de passe actuel est exigé : un téléphone resté déverrouillé ne suffit pas
    const { error: wrongCurrent } = await supabase.auth.signInWithPassword({ email: user.email, password: current })
    if (wrongCurrent) {
      setPasswordBusy(false)
      return setPasswordMessage({ type: 'error', text: 'Mot de passe actuel incorrect.' })
    }

    const { error } = await supabase.auth.updateUser({ password: next })
    setPasswordBusy(false)
    if (error) {
      console.error('Changement de mot de passe:', error.message)
      return setPasswordMessage({
        type: 'error',
        text: error.code === 'weak_password'
          ? 'Mot de passe trop simple : mélangez lettres, chiffres et symboles.'
          : "Le mot de passe n'a pas pu être changé. Réessayez.",
      })
    }
    form.reset()
    setPasswordMessage({ type: 'success', text: 'Mot de passe changé. Utilisez-le à votre prochaine connexion.' })
  }

  if (!user) return <div className={styles.container}>Chargement…</div>

  const isManager = role === 'gerant' || role === 'admin'
  const status = PUSH_STATUS[pushState]

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {/* Sur téléphone, seul chemin de retour vers l'écran de travail */}
        <Link href={home} className={styles.backBtn} aria-label="Retour">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </Link>
        <h1>Paramètres</h1>
      </header>

      <section className={styles.card} aria-labelledby="profile-title">
        <h2 id="profile-title" className={styles.cardTitle}>Profil</h2>
        <div className={styles.profileInfo}>
          <div className={styles.infoGroup}>
            <span className={styles.infoLabel}>Adresse email</span>
            <div className={styles.infoValue}>{user.email}</div>
          </div>
          <div className={styles.infoGroup}>
            <span className={styles.infoLabel}>Rôle</span>
            <div className={styles.infoValue}>
              <span className={styles.badge}>{ROLE_LABELS[role] || 'Personnel'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="push-title">
        <h2 id="push-title" className={styles.cardTitle}>Notifications</h2>
        {status ? (
          <>
            <p className={`${styles.pushStatus} ${status.tone === 'ok' ? styles.pushOk : styles.pushWarn}`}>
              <span aria-hidden="true">{status.tone === 'ok' ? '✅' : '⚠️'}</span>
              {status.text}
            </p>
            {pushState === 'disabled' && (
              <button className={styles.primaryBtn} onClick={handleEnable} disabled={busy}>
                {busy ? 'Un instant…' : 'Activer les notifications'}
              </button>
            )}
            {pushState === 'enabled' && (
              <button className={styles.secondaryBtn} onClick={handleTest} disabled={busy}>
                {busy ? 'Envoi…' : 'Envoyer une notification de test'}
              </button>
            )}
          </>
        ) : (
          <p className={styles.pushStatus}>Vérification…</p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="password-title">
        <h2 id="password-title" className={styles.cardTitle}>Mot de passe</h2>
        <form className={styles.form} onSubmit={handleChangePassword}>
          <div className={styles.field}>
            <label htmlFor="current">Mot de passe actuel</label>
            <div className={styles.passwordWrap}>
              <input id="current" name="current" type={showPasswords ? 'text' : 'password'} autoComplete="current-password" required />
              <button
                type="button"
                className={styles.eye}
                onClick={() => setShowPasswords(v => !v)}
                aria-label={showPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
              >
                {showPasswords ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="next">Nouveau mot de passe</label>
            <input id="next" name="next" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" minLength={8} required placeholder="8 caractères minimum" />
          </div>
          <div className={styles.field}>
            <label htmlFor="confirm">Confirmez le nouveau mot de passe</label>
            <input id="confirm" name="confirm" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" minLength={8} required />
          </div>

          {passwordMessage && (
            <p className={passwordMessage.type === 'error' ? styles.formError : styles.formSuccess} role="alert">{passwordMessage.text}</p>
          )}

          <button type="submit" className={styles.primaryBtn} disabled={passwordBusy}>
            {passwordBusy ? 'Un instant…' : 'Changer le mot de passe'}
          </button>
        </form>
      </section>

      <section className={styles.card}>
        <p className={styles.helperText}>
          {isManager
            ? <>Un membre de l’équipe a oublié son mot de passe ? Réinitialisez-le depuis la page <strong>Équipe</strong>.</>
            : <>Mot de passe oublié ? Votre <strong>gérant</strong> peut le réinitialiser.</>}
        </p>
        <button onClick={() => setConfirmLogout(true)} className={styles.logoutBtn}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Se déconnecter
        </button>
      </section>

      <ConfirmDialog
        open={confirmLogout}
        title="Se déconnecter ?"
        message="Cet appareil ne recevra plus les notifications de votre compte."
        confirmLabel="Se déconnecter"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  )
}
