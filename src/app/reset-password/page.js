'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import BrandMark from '@/components/BrandMark'
import styles from '../login/login.module.css'

export default function ResetPasswordPage() {
  const [supabase] = useState(() => createClient())
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Le lien reçu par email ouvre une session de récupération
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setHasSession(!!user)
      setReady(true)
    }
    check()
  }, [supabase])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const password = String(form.get('password') || '')
    const confirm = String(form.get('confirm') || '')

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit faire au moins 8 caractères.' })
      return
    }
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Les deux mots de passe ne sont pas identiques.' })
      return
    }

    setIsLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    setIsLoading(false)

    if (error) {
      setMessage({ type: 'error', text: "Le mot de passe n'a pas pu être changé. Redemandez un lien." })
      return
    }

    setMessage({ type: 'info', text: 'Mot de passe changé. Vous allez être redirigé…' })
    setTimeout(() => window.location.assign('/'), 1600)
  }

  return (
    <div className={styles.page}>
      <aside className={styles.visual}>
        <img src="/four_cheeses.png" alt="" className={styles.photo} />
        <div className={styles.visualContent}>
          <BrandMark size="lg" />
          <p className={styles.tagline}>Un nouveau<br />mot de passe.</p>
        </div>
      </aside>

      <main className={styles.panel}>
        <div className={styles.card}>
          <h1 className={styles.title}>Choisissez votre mot de passe</h1>

          {!ready ? (
            <p className={styles.intro}>Vérification du lien…</p>
          ) : !hasSession ? (
            <>
              <p className={styles.intro}>
                Ce lien n’est plus valable. Les liens de réinitialisation expirent après un moment,
                et ne servent qu’une fois.
              </p>
              <Link href="/login" className={styles.google}>Demander un nouveau lien</Link>
            </>
          ) : (
            <>
              <p className={styles.intro}>Il vous servira à vous connecter la prochaine fois.</p>

              {message && (
                <p className={message.type === 'error' ? styles.error : styles.info} role="alert">{message.text}</p>
              )}

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="password">Nouveau mot de passe</label>
                  <div className={styles.passwordWrap}>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      placeholder="8 caractères minimum"
                    />
                    <button
                      type="button"
                      className={styles.eye}
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="confirm">Confirmez le mot de passe</label>
                  <input id="confirm" name="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required />
                </div>

                <button type="submit" className={styles.submit} disabled={isLoading}>
                  {isLoading ? 'Un instant…' : 'Enregistrer le mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
