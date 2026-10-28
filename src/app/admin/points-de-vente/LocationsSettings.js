'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getBrowserClient } from '@/utils/supabase/client'
import { getStaffMembership } from '@/lib/staff'
import { openingState, describeOpening } from '@/lib/opening-hours'
import { PLAN_NAMES, BUSINESS_INCLUDED_LOCATIONS, EXTRA_LOCATION_PRICE, canAddLocation, isExtraLocation } from '@/lib/plans'
import { formatPrice } from '@/lib/format'
import { slugify } from '@/lib/slug'
import AdminPageHeader from '../AdminPageHeader'
import styles from './LocationsSettings.module.css'

const EMPTY_FORM = { name: '', address: '', phone: '' }

/**
 * Les points de vente du restaurant : leur lien à partager, et l'ouverture d'un
 * nouveau selon l'offre (1 en Starter et Pro, 3 inclus en Business, puis en supplément).
 * Un gérant de point de vente voit seulement le sien.
 */
export default function LocationsSettings() {
  const [supabase] = useState(() => getBrowserClient())
  const [org, setOrg] = useState(null)
  const [locations, setLocations] = useState([])
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [origin, setOrigin] = useState('')
  // null : fermé ; { id: null } : nouveau point de vente ; { id } : modification
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setOrigin(window.location.origin)
      const membership = await getStaffMembership(supabase, user?.id)
      if (!membership) return setLoading(false)

      const { data: organization } = await supabase
        .from('organizations')
        .select('id, slug, name, plan, timezone')
        .eq('id', membership.organization_id)
        .maybeSingle()
      let query = supabase
        .from('locations')
        .select('id, slug, name, address, phone, is_open, opening_hours')
        .eq('organization_id', membership.organization_id)
        .order('created_at')
      if (membership.location_id) query = query.eq('id', membership.location_id)
      const { data } = await query

      setOrg(organization)
      setLocations(data || [])
      setCanEdit(membership.role === 'proprietaire' || (membership.role === 'gerant' && !membership.location_id))
      setLoading(false)
    }
    load()
  }, [supabase])

  useEffect(() => {
    if (!editing) return
    const onKey = (e) => e.key === 'Escape' && !saving && setEditing(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, saving])

  const openNew = () => {
    setForm(EMPTY_FORM)
    setEditing({ id: null })
  }

  const openEdit = (location) => {
    setForm({ name: location.name, address: location.address || '', phone: location.phone || '' })
    setEditing({ id: location.id })
  }

  const linkOf = (location) => `${origin}/${org.slug}/${location.slug}`

  const copy = async (location) => {
    try {
      await navigator.clipboard.writeText(linkOf(location))
      toast.success('Lien copié')
    } catch {
      toast.error('Copie impossible : sélectionnez le lien à la main.')
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (form.name.trim().length < 2) return toast.error('Indiquez le nom ou le quartier du point de vente.')
    if (form.phone.replace(/\D/g, '').length < 8) return toast.error('Indiquez un téléphone joignable par vos clients.')
    setSaving(true)

    if (editing.id) {
      const patch = { name: form.name.trim().slice(0, 60), address: form.address.trim().slice(0, 200) || null, phone: form.phone.trim().slice(0, 30) }
      const { data, error } = await supabase.from('locations').update(patch).eq('id', editing.id).select('id')
      setSaving(false)
      if (error || !data?.length) return toast.error("Les changements n'ont pas pu être enregistrés.")
      setLocations((list) => list.map((l) => (l.id === editing.id ? { ...l, ...patch } : l)))
      setEditing(null)
      return toast.success('Point de vente mis à jour')
    }

    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const body = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) return toast.error(body.error || "Le point de vente n'a pas pu être ajouté.")
    setLocations((list) => [...list, body.location])
    setEditing(null)
    toast.success(`${body.location.name} est ouvert. Vérifiez ses horaires et sa livraison.`, { duration: 5000 })
  }

  if (loading) return <AdminPageHeader title="Points de vente"><p>Chargement…</p></AdminPageHeader>
  if (!org) return <AdminPageHeader title="Points de vente"><p>Aucun restaurant trouvé pour ce compte.</p></AdminPageHeader>

  const canAdd = canEdit && canAddLocation(org.plan, locations.length)
  const extra = isExtraLocation(org.plan, locations.length)
  const previewSlug = slugify(form.name).slice(0, 36)

  return (
    <AdminPageHeader
      title="Points de vente"
      subtitle="Chaque adresse de votre restaurant, avec son propre lien à partager."
      actions={canAdd && (
        <button type="button" className={styles.primaryBtn} onClick={openNew}>＋ Ajouter un point de vente</button>
      )}
    >
      <p className={styles.plan}>
        Offre <strong>{PLAN_NAMES[org.plan] || org.plan}</strong> ·{' '}
        {org.plan === 'business'
          ? `${BUSINESS_INCLUDED_LOCATIONS} points de vente inclus, puis ${formatPrice(EXTRA_LOCATION_PRICE)} par mois pour chacun en plus`
          : '1 point de vente'}
      </p>

      <div className={styles.grid}>
        {locations.map((location) => {
          const state = openingState(location, org.timezone)
          return (
            <article key={location.id} className={styles.card}>
              <header className={styles.cardHead}>
                <div>
                  <h2>{location.name}</h2>
                  {location.address && <p className={styles.address}>{location.address}</p>}
                </div>
                <span className={`${styles.status} ${state.open ? styles.statusOpen : ''}`}>
                  {state.open ? 'Ouvert' : 'Fermé'}
                </span>
              </header>

              <p className={styles.meta}>{describeOpening(state)}{location.phone && <> · {location.phone}</>}</p>

              <div className={styles.link}>
                <span>{linkOf(location).replace(/^https?:\/\//, '')}</span>
                <button type="button" onClick={() => copy(location)}>Copier</button>
              </div>

              <div className={styles.cardActions}>
                {canEdit && <button type="button" className={styles.ghostBtn} onClick={() => openEdit(location)}>Modifier</button>}
                {canEdit && <Link href="/admin/livraison" className={styles.ghostBtn}>Horaires et livraison</Link>}
              </div>
            </article>
          )
        })}

        {canAdd && (
          <button type="button" className={styles.addCard} onClick={openNew}>
            <span aria-hidden="true">＋</span>
            <strong>Ouvrir un point de vente</strong>
            <small>{extra ? `${formatPrice(EXTRA_LOCATION_PRICE)} de plus par mois` : 'Inclus dans votre offre'}</small>
          </button>
        )}

        {canEdit && !canAdd && (
          <div className={styles.upgrade}>
            <span className={styles.upgradeBadge}>Business</span>
            <strong>Vous ouvrez une autre adresse ?</strong>
            <p>
              L’offre Business inclut {BUSINESS_INCLUDED_LOCATIONS} points de vente, avec une carte commune,
              des livreurs et un responsable pour chaque adresse.
            </p>
            <small>Le passage à Business depuis votre espace arrive avec l’abonnement en ligne.</small>
          </div>
        )}
      </div>

      {editing && (
        <div className={styles.overlay} onClick={() => !saving && setEditing(null)}>
          <form
            className={styles.modal}
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-title"
          >
            <h2 id="location-title">{editing.id ? 'Modifier le point de vente' : 'Nouveau point de vente'}</h2>
            {!editing.id && (
              <p className={styles.modalIntro}>
                Il reprend les horaires et la livraison de votre premier point de vente : vous les ajusterez ensuite.
              </p>
            )}

            <div className={styles.field}>
              <label htmlFor="loc-name">Nom ou quartier</label>
              <input id="loc-name" className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bastos" maxLength={60} autoFocus />
              {!editing.id && previewSlug && (
                <span className={styles.hint}>Son lien : {origin.replace(/^https?:\/\//, '')}/{org.slug}/<strong>{previewSlug}</strong></span>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="loc-address">Adresse</label>
              <input id="loc-address" className={styles.input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Face à la pharmacie du carrefour" maxLength={200} />
            </div>
            <div className={styles.field}>
              <label htmlFor="loc-phone">Téléphone</label>
              <input id="loc-phone" className={styles.input} type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="6 90 00 00 00" maxLength={30} />
            </div>

            {!editing.id && extra && (
              <p className={styles.extra}>
                Au-delà de {BUSINESS_INCLUDED_LOCATIONS} points de vente, celui-ci sera facturé {formatPrice(EXTRA_LOCATION_PRICE)} de plus par mois.
              </p>
            )}

            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostBtn} onClick={() => setEditing(null)} disabled={saving}>Annuler</button>
              <button type="submit" className={styles.primaryBtn} disabled={saving}>
                {saving ? 'Un instant…' : editing.id ? 'Enregistrer' : 'Ouvrir ce point de vente'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminPageHeader>
  )
}
