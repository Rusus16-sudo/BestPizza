'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { getBrowserClient } from '@/utils/supabase/client'
import { slugify, slugProblem } from '@/lib/slug'
import { brandColorVars } from '@/lib/brand'
import BrandMark from '@/components/BrandMark'
import TimePicker from '@/components/TimePicker'
import ShareKit from '@/components/ShareKit'
import styles from './Creer.module.css'

const COLORS = [
  { value: '#d93a1f', name: 'Tomate' },
  { value: '#e8590c', name: 'Orange' },
  { value: '#d6336c', name: 'Framboise' },
  { value: '#7048e8', name: 'Violet' },
  { value: '#1c7ed6', name: 'Bleu' },
  { value: '#0ca678', name: 'Menthe' },
  { value: '#2b8a3e', name: 'Basilic' },
  { value: '#1f1d1b', name: 'Ardoise' },
]

const STEPS = ['Le restaurant', 'L’apparence', 'Le point de vente']

/** Les étapes de l'inscription d'un restaurant, puis son kit de partage. */
export default function CreateRestaurant() {
  const [supabase] = useState(() => getBrowserClient())
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)

  // 1. Le restaurant
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState(null) // { checking } | { available, reason }
  const [phone, setPhone] = useState('')
  // 2. L'apparence
  const [color, setColor] = useState(COLORS[0].value)
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  // 3. Le point de vente
  const [locationName, setLocationName] = useState('')
  const [address, setAddress] = useState('')
  const [opens, setOpens] = useState('11:00')
  const [closes, setCloses] = useState('23:00')
  const [fee, setFee] = useState('1000')

  const checkTimer = useRef(null)
  const effectiveSlug = slugEdited ? slug : slugify(name)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  // L'adresse du lien est vérifiée pendant la saisie
  useEffect(() => {
    clearTimeout(checkTimer.current)
    const local = slugProblem(effectiveSlug)
    if (!effectiveSlug) return
    checkTimer.current = setTimeout(async () => {
      if (local) return setSlugStatus({ available: false, reason: local })
      setSlugStatus({ checking: true })
      try {
        const res = await fetch(`/api/restaurants/slug?value=${encodeURIComponent(effectiveSlug)}`)
        setSlugStatus(await res.json())
      } catch {
        setSlugStatus(null)
      }
    }, 350)
    return () => clearTimeout(checkTimer.current)
  }, [effectiveSlug])

  const chooseLogo = (file) => {
    if (!file) return
    if (file.size > 3 * 1024 * 1024) return toast.error('Logo trop lourd : 3 Mo au plus.')
    setLogo(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const canNext = [
    name.trim().length >= 2 && slugStatus?.available && phone.replace(/\D/g, '').length >= 8,
    true,
    locationName.trim().length >= 2 && opens !== closes,
  ][step]

  const next = (e) => {
    e.preventDefault()
    if (!canNext) {
      const messages = [
        name.trim().length < 2 ? 'Donnez le nom de votre restaurant.' : !slugStatus?.available ? 'Choisissez une adresse de lien disponible.' : 'Indiquez un téléphone joignable par vos clients.',
        '',
        locationName.trim().length < 2 ? 'Indiquez le quartier de votre restaurant.' : 'L’ouverture et la fermeture doivent être différentes.',
      ]
      return toast.error(messages[step])
    }
    if (step < STEPS.length - 1) return setStep(step + 1)
    create()
  }

  const create = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: effectiveSlug, color, phone, locationName, address, opens, closes, deliveryFee: fee }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Le restaurant n'a pas pu être créé.")
        if (res.status === 409 || /adresse/i.test(data.error || '')) setStep(0)
        setBusy(false)
        return
      }

      // Le logo, dans le dossier du restaurant tout juste créé
      if (logo) {
        const ext = (logo.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
        const path = `${data.organization.id}/logo-${Date.now()}.${ext}`
        const { error: upError } = await supabase.storage.from('products').upload(path, logo, { contentType: logo.type })
        if (!upError) {
          const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path)
          await supabase.from('organizations').update({ logo_url: publicUrl }).eq('id', data.organization.id)
        } else {
          toast.error('Le logo n’a pas pu être envoyé : vous pourrez l’ajouter plus tard.')
        }
      }
      setCreated(data.organization)
    } catch {
      toast.error('Pas de connexion. Réessayez.')
    }
    setBusy(false)
  }

  // Aperçu de la vitrine, aux couleurs choisies
  const preview = (
    <div className={styles.preview} style={brandColorVars(color)} aria-hidden="true">
      <div className={styles.previewBar}>
        <BrandMark name={name.trim() || 'Mon restaurant'} logoUrl={logoPreview} />
      </div>
      <div className={styles.previewHero}>
        <span className={styles.previewBadge}>Ouvert jusqu’à {closes.replace(':00', ' h').replace(':', ' h ')}</span>
        <strong>{name.trim() || 'Mon restaurant'},<br />livré chez vous.</strong>
        <span className={styles.previewBtn}>Voir la carte</span>
      </div>
      <p className={styles.previewUrl} suppressHydrationWarning>{origin.replace(/^https?:\/\//, '')}/{effectiveSlug || 'mon-restaurant'}</p>
    </div>
  )

  if (created) {
    const url = `${origin}/${created.slug}`
    return (
      <main className={styles.page}>
        <div className={styles.card} style={brandColorVars(color)}>
          <div className={styles.doneIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 className={styles.doneTitle}>{created.name} est en ligne !</h1>
          <p className={styles.lead}>Votre vitrine est prête, avec 14 jours d’essai de l’offre Pro. Partagez votre lien, puis ajoutez vos plats.</p>
          <ShareKit url={url} name={created.name} />
          <div className={styles.doneActions}>
            {/* Rechargement complet : l'app découvre le nouveau rôle de gérant */}
            <button type="button" className={styles.primaryBtn} onClick={() => window.location.assign('/admin/carte')}>Ajouter mes plats</button>
            <button type="button" className={styles.secondaryBtn} onClick={() => window.location.assign(`/${created.slug}`)}>Voir ma vitrine</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <BrandMark size="lg" />
        <span className={styles.topNote}>Votre restaurant en ligne, en quelques minutes</span>
      </header>

      <div className={styles.layout}>
        <form className={styles.card} onSubmit={next}>
          <ol className={styles.steps}>
            {STEPS.map((label, i) => (
              <li key={label} className={`${styles.stepDot} ${i === step ? styles.stepOn : ''} ${i < step ? styles.stepDone : ''}`}>
                <span>{i < step ? '✓' : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>

          {step === 0 && (
            <>
              <h1>Votre restaurant</h1>
              <div className={styles.field}>
                <label htmlFor="name">Nom du restaurant</label>
                <input id="name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Chez Mama" autoFocus maxLength={60} />
              </div>
              <div className={styles.field}>
                <label htmlFor="slug">Adresse de votre lien</label>
                <div className={styles.slugField}>
                  <span className={styles.slugPrefix} suppressHydrationWarning>{origin.replace(/^https?:\/\//, '')}/</span>
                  <input
                    id="slug"
                    className={styles.slugInput}
                    value={effectiveSlug}
                    onChange={(e) => { setSlugEdited(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')) }}
                    placeholder="chez-mama"
                    maxLength={40}
                  />
                </div>
                {effectiveSlug && slugStatus && (
                  <p className={slugStatus.available ? styles.ok : slugStatus.checking ? styles.hint : styles.error}>
                    {slugStatus.checking ? 'Vérification…' : slugStatus.available ? '✓ Disponible' : slugStatus.reason}
                  </p>
                )}
                {!effectiveSlug && <p className={styles.hint}>C’est le lien que vous collerez sur vos réseaux.</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="phone">Téléphone du restaurant</label>
                <input id="phone" type="tel" inputMode="tel" className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6XX XX XX XX" />
                <p className={styles.hint}>Affiché à vos clients dans la page d’aide.</p>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1>Son apparence</h1>
              <div className={styles.field}>
                <span className={styles.label}>Logo (facultatif)</span>
                <label className={styles.logoDrop}>
                  <input type="file" accept="image/*" onChange={(e) => chooseLogo(e.target.files?.[0])} />
                  {logoPreview
                    ? <img src={logoPreview} alt="" className={styles.logoPreview} />
                    : <span className={styles.logoEmpty}>＋</span>}
                  <span>{logoPreview ? 'Changer le logo' : 'Ajouter votre logo'}</span>
                </label>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Couleur de votre vitrine</span>
                <div className={styles.colors} role="radiogroup" aria-label="Couleur">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={color === c.value}
                      aria-label={c.name}
                      title={c.name}
                      className={`${styles.color} ${color === c.value ? styles.colorOn : ''}`}
                      style={{ background: c.value }}
                      onClick={() => setColor(c.value)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1>Votre point de vente</h1>
              <div className={styles.field}>
                <label htmlFor="location">Quartier</label>
                <input id="location" className={styles.input} value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Ex : Bastos" autoFocus maxLength={60} />
              </div>
              <div className={styles.field}>
                <label htmlFor="address">Adresse ou repère (facultatif)</label>
                <input id="address" className={styles.input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex : face à la pharmacie du carrefour" />
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Horaires, tous les jours</span>
                <div className={styles.hours}>
                  <TimePicker value={opens} onChange={setOpens} label="Ouverture" />
                  <span>–</span>
                  <TimePicker value={closes} onChange={setCloses} label="Fermeture" />
                </div>
                <p className={styles.hint}>Jours de fermeture, coupure le midi, quartiers : à régler ensuite dans votre espace.</p>
              </div>
              <div className={styles.field}>
                <label htmlFor="fee">Frais de livraison (FCFA)</label>
                <input id="fee" type="number" min="0" step="100" inputMode="numeric" className={styles.input} value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
            </>
          )}

          <div className={styles.actions}>
            {step > 0 && <button type="button" className={styles.secondaryBtn} onClick={() => setStep(step - 1)} disabled={busy}>Retour</button>}
            <button type="submit" className={styles.primaryBtn} disabled={busy} style={brandColorVars(color)}>
              {busy ? 'Création…' : step < STEPS.length - 1 ? 'Continuer' : 'Créer mon restaurant'}
            </button>
          </div>
        </form>

        <aside className={styles.previewWrap}>
          <p className={styles.previewLabel}>Aperçu de votre vitrine</p>
          {preview}
        </aside>
      </div>
    </main>
  )
}
