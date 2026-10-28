'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getBrowserClient } from '@/utils/supabase/client'
import { getStaffMembership } from '@/lib/staff'
import { brandColorVars, BRAND_COLORS } from '@/lib/brand'
import AdminPageHeader from '../AdminPageHeader'
import BrandMark from '@/components/BrandMark'
import ShareKit from '@/components/ShareKit'
import { PLAN_NAMES } from '@/lib/plans'
import styles from './RestaurantSettings.module.css'

const MAX_LOGO = 3 * 1024 * 1024
const MAX_COVER = 6 * 1024 * 1024

/**
 * « Mon restaurant » : ce que voient les clients sur la vitrine (nom, logo, couleur,
 * photo de couverture, accroche) et le kit de partage. Réservé au gérant de toute
 * l'enseigne ; un gérant de point de vente le consulte seulement.
 */
export default function RestaurantSettings() {
  const [supabase] = useState(() => getBrowserClient())
  const [org, setOrg] = useState(null)
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [color, setColor] = useState(BRAND_COLORS[0].value)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  // Une image : celle déjà en ligne (url), une nouvelle choisie (file + aperçu), ou retirée
  const [logo, setLogo] = useState({ url: null, file: null, preview: null })
  const [cover, setCover] = useState({ url: null, file: null, preview: null })
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setOrigin(window.location.origin)
      const membership = await getStaffMembership(supabase, user?.id)
      if (!membership) return setLoading(false)
      const { data } = await supabase
        .from('organizations')
        .select('id, slug, name, logo_url, primary_color, cover_url, tagline_title, tagline_text, plan, plan_status, trial_ends_at')
        .eq('id', membership.organization_id)
        .maybeSingle()
      if (data) {
        setOrg(data)
        setName(data.name)
        setColor(data.primary_color || BRAND_COLORS[0].value)
        setTitle(data.tagline_title || '')
        setText(data.tagline_text || '')
        setLogo({ url: data.logo_url, file: null, preview: null })
        setCover({ url: data.cover_url, file: null, preview: null })
      }
      setCanEdit(membership.role === 'proprietaire' || (membership.role === 'gerant' && !membership.location_id))
      setLoading(false)
    }
    load()
  }, [supabase])

  const pick = (setter, max, label) => (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Choisissez une image.')
    if (file.size > max) return toast.error(`${label} trop lourd : ${Math.round(max / 1024 / 1024)} Mo au plus.`)
    setter({ url: null, file, preview: URL.createObjectURL(file) })
  }

  const upload = async (file, kind) => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${org.id}/${kind}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('products').upload(path, file, { contentType: file.type })
    if (error) throw new Error(error.message)
    return supabase.storage.from('products').getPublicUrl(path).data.publicUrl
  }

  const save = async (e) => {
    e.preventDefault()
    if (name.trim().length < 2) return toast.error('Le nom du restaurant est trop court.')
    setSaving(true)
    try {
      const logoUrl = logo.file ? await upload(logo.file, 'logo') : logo.url
      const coverUrl = cover.file ? await upload(cover.file, 'couverture') : cover.url
      const patch = {
        name: name.trim().slice(0, 60),
        primary_color: color,
        logo_url: logoUrl || null,
        cover_url: coverUrl || null,
        tagline_title: title.trim().slice(0, 80) || null,
        tagline_text: text.trim().slice(0, 160) || null,
      }
      const { data, error } = await supabase.from('organizations').update(patch).eq('id', org.id).select('id')
      if (error || !data?.length) throw new Error(error?.message || 'Non enregistré')
      setOrg({ ...org, ...patch })
      setLogo({ url: logoUrl || null, file: null, preview: null })
      setCover({ url: coverUrl || null, file: null, preview: null })
      toast.success('Votre vitrine est à jour')
    } catch (err) {
      console.error('Mon restaurant:', err.message)
      toast.error("Les changements n'ont pas pu être enregistrés.")
    }
    setSaving(false)
  }

  if (loading) return <AdminPageHeader title="Mon restaurant"><p>Chargement…</p></AdminPageHeader>
  if (!org) return <AdminPageHeader title="Mon restaurant"><p>Aucun restaurant trouvé pour ce compte.</p></AdminPageHeader>

  const logoShown = logo.preview || logo.url
  const coverShown = cover.preview || cover.url
  const initials = (name || org.name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const trialEnd = org.plan_status === 'trial' && org.trial_ends_at
    ? new Date(org.trial_ends_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : null

  return (
    <AdminPageHeader
      title="Mon restaurant"
      subtitle="Ce que vos clients voient en ouvrant votre lien."
    >
      <p className={styles.plan}>
        Offre <strong>{PLAN_NAMES[org.plan] || org.plan}</strong>
        {trialEnd && <> · essai gratuit jusqu’au {trialEnd}</>}
      </p>

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={save}>
          {!canEdit && (
            <p className={styles.readOnly}>Seul le gérant de tout le restaurant peut modifier ces réglages.</p>
          )}
          <fieldset disabled={!canEdit || saving} className={styles.fieldset}>
            <section className={styles.card}>
              <h2>Identité</h2>
              <div className={styles.field}>
                <label htmlFor="name">Nom du restaurant</label>
                <input id="name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Logo</span>
                <div className={styles.imageRow}>
                  <span className={styles.logoBox}>
                    {logoShown ? <img src={logoShown} alt="" /> : <span>{initials}</span>}
                  </span>
                  <label className={styles.fileBtn}>
                    <input type="file" accept="image/*" onChange={(e) => pick(setLogo, MAX_LOGO, 'Logo')(e.target.files?.[0])} />
                    {logoShown ? 'Changer' : 'Ajouter un logo'}
                  </label>
                  {logoShown && <button type="button" className={styles.linkBtn} onClick={() => setLogo({ url: null, file: null, preview: null })}>Retirer</button>}
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Couleur</span>
                <div className={styles.colors} role="radiogroup" aria-label="Couleur">
                  {BRAND_COLORS.map((c) => (
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
            </section>

            <section className={styles.card}>
              <h2>Accueil de la vitrine</h2>
              <div className={styles.field}>
                <span className={styles.label}>Photo de couverture</span>
                <label className={styles.coverDrop}>
                  <input type="file" accept="image/*" onChange={(e) => pick(setCover, MAX_COVER, 'Photo')(e.target.files?.[0])} />
                  {coverShown
                    ? <img src={coverShown} alt="" />
                    : <span>＋ Votre devanture, votre plat phare, votre équipe…</span>}
                </label>
                {coverShown
                  ? <button type="button" className={styles.linkBtn} onClick={() => setCover({ url: null, file: null, preview: null })}>Retirer la photo</button>
                  : <p className={styles.hint}>Sans photo, l’accueil montre un de vos plats, ou votre logo sur votre couleur.</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="title">Titre</label>
                <input id="title" className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${name || org.name}, livré chez vous.`} maxLength={80} />
              </div>
              <div className={styles.field}>
                <label htmlFor="text">Phrase d’accroche</label>
                <input id="text" className={styles.input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Choisissez vos plats, on s’occupe du reste." maxLength={160} />
              </div>
            </section>

            {canEdit && (
              <button type="submit" className={styles.saveBtn} style={brandColorVars(color)}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            )}
          </fieldset>
        </form>

        <aside className={styles.side}>
          <p className={styles.sideLabel}>Aperçu</p>
          <div className={styles.preview} style={brandColorVars(color)} aria-hidden="true">
            <div className={styles.previewBar}><BrandMark name={name || org.name} logoUrl={logoShown} /></div>
            <div className={`${styles.previewHero} ${coverShown ? styles.previewHeroCover : ''}`}>
              {coverShown && <img src={coverShown} alt="" className={styles.previewCover} />}
              <strong>{title.trim() || <>{name || org.name},<br />livré chez vous.</>}</strong>
              <span>{text.trim() || 'Choisissez vos plats, on s’occupe du reste.'}</span>
              <em>Voir la carte</em>
            </div>
          </div>

          <p className={styles.sideLabel}>Partager votre vitrine</p>
          <div className={styles.card}>
            {origin && <ShareKit stacked url={`${origin}/${org.slug}`} name={org.name} />}
          </div>
        </aside>
      </div>
    </AdminPageHeader>
  )
}
