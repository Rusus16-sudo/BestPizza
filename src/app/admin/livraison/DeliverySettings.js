'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getBrowserClient } from '@/utils/supabase/client'
import { getStaffMembership } from '@/lib/staff'
import { DAYS, WEEK_ORDER, openingState, describeOpening } from '@/lib/opening-hours'
import { hasFullDelivery } from '@/lib/delivery'
import { formatPrice } from '@/lib/format'
import AdminPageHeader from '../AdminPageHeader'
import TimePicker from '@/components/TimePicker'
import styles from './DeliverySettings.module.css'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

// Horaires modifiables : pour chaque jour, ouvert ou non, et une ou deux plages
function toForm(hours) {
  return Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => {
    const ranges = hours?.[String(d)] || []
    return [d, { open: ranges.length > 0, ranges: ranges.length ? ranges.map(([a, b]) => [a, b]) : [['11:00', '23:00']] }]
  }))
}

function fromForm(form) {
  return Object.fromEntries(Object.entries(form).map(([d, day]) => [d, day.open ? day.ranges : []]))
}

/**
 * Horaires et livraison d'un point de vente, réglés par le gérant.
 * Le propriétaire choisit parmi ses points de vente ; un gérant de point de vente
 * ne voit que le sien. Les règles d'accès de la base vérifient de toute façon.
 */
export default function DeliverySettings() {
  const [supabase] = useState(() => getBrowserClient())
  const [plan, setPlan] = useState(null)
  const [timezone, setTimezone] = useState('Africa/Douala')
  const [locations, setLocations] = useState([])
  const [locationId, setLocationId] = useState(null)
  const [hours, setHours] = useState(null)
  const [isOpen, setIsOpen] = useState(true)
  const [fee, setFee] = useState('')
  const [minimum, setMinimum] = useState('')
  const [freeFrom, setFreeFrom] = useState('')
  const [zones, setZones] = useState([])
  const [removedZones, setRemovedZones] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const full = hasFullDelivery(plan)
  // Starter : la plage commune est celle du premier jour ouvert
  const sharedRange = hours ? hours[WEEK_ORDER.find((d) => hours[d].open) ?? 1].ranges[0] : null
  const location = locations.find((l) => l.id === locationId)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const membership = await getStaffMembership(supabase, user?.id)
      if (!membership) return setLoading(false)

      const { data: org } = await supabase.from('storefronts').select('plan, timezone').eq('id', membership.organization_id).maybeSingle()
      setPlan(org?.plan || 'starter')
      setTimezone(org?.timezone || 'Africa/Douala')

      let query = supabase
        .from('locations')
        .select('id, name, is_open, opening_hours, delivery_fee, minimum_order, free_delivery_from')
        .eq('organization_id', membership.organization_id)
        .order('created_at')
      // Un gérant de point de vente ne règle que le sien
      if (membership.location_id) query = query.eq('id', membership.location_id)
      const { data } = await query
      setLocations(data || [])
      setLocationId(data?.[0]?.id || null)
      setLoading(false)
    }
    load()
  }, [supabase])

  // Le point de vente choisi : ses réglages dans le formulaire
  const loadLocation = useCallback(async (loc) => {
    setHours(toForm(loc.opening_hours))
    setIsOpen(loc.is_open)
    setFee(String(loc.delivery_fee ?? 0))
    setMinimum(loc.minimum_order != null ? String(loc.minimum_order) : '')
    setFreeFrom(loc.free_delivery_from != null ? String(loc.free_delivery_from) : '')
    setRemovedZones([])
    const { data } = await supabase.from('delivery_zones').select('id, name, fee, position').eq('location_id', loc.id).order('position')
    setZones((data || []).map((z) => ({ ...z, fee: String(z.fee) })))
  }, [supabase])

  useEffect(() => {
    if (location) loadLocation(location)
  }, [location, loadLocation])

  const setDay = (d, patch) => setHours((h) => ({ ...h, [d]: { ...h[d], ...patch } }))
  const setRange = (d, i, j, value) => setHours((h) => {
    const ranges = h[d].ranges.map((r) => [...r])
    ranges[i][j] = value
    return { ...h, [d]: { ...h[d], ranges } }
  })
  // En Starter, les mêmes horaires tous les jours : on recopie lundi partout
  const setEveryDay = (i, j, value) => setHours((h) => Object.fromEntries(Object.entries(h).map(([d, day]) => {
    const ranges = day.ranges.map((r) => [...r])
    ranges[i][j] = value
    return [d, { ...day, ranges }]
  })))

  // Fermeture immédiate (panne, rupture, congé) : enregistrée tout de suite
  const toggleOpenNow = async () => {
    const next = !isOpen
    const { error } = await supabase.from('locations').update({ is_open: next }).eq('id', locationId)
    if (error) return toast.error("Le changement n'a pas pu être enregistré.")
    setIsOpen(next)
    setLocations((list) => list.map((l) => (l.id === locationId ? { ...l, is_open: next } : l)))
    toast.success(next ? 'Point de vente rouvert : les commandes reprennent' : 'Point de vente fermé : plus aucune commande')
  }

  const save = async (e) => {
    e.preventDefault()
    // Starter : une seule plage, la même pour tous les jours ouverts
    const toSave = full ? hours : Object.fromEntries(Object.keys(hours).map((d) => [d, { open: hours[d].open, ranges: [sharedRange] }]))
    if (!Object.values(toSave).some((day) => day.open)) {
      return toast.error('Gardez au moins un jour d’ouverture, ou utilisez « Fermer maintenant ».')
    }

    for (const d of Object.keys(toSave)) {
      const day = toSave[d]
      if (!day.open) continue
      for (const [a, b] of day.ranges) {
        if (!TIME.test(a) || !TIME.test(b) || a === b) {
          return toast.error(`${DAYS[d]} : des heures valides, sous la forme 11:00, et différentes l’une de l’autre.`)
        }
      }
    }
    const numberOrNull = (v) => (String(v).trim() === '' ? null : Math.max(0, Math.round(Number(v)) || 0))
    const cleanZones = zones.map((z) => ({ ...z, name: z.name.trim() })).filter((z) => z.name)
    if (new Set(cleanZones.map((z) => z.name.toLowerCase())).size !== cleanZones.length) {
      return toast.error('Deux quartiers portent le même nom.')
    }

    setSaving(true)
    const { error } = await supabase.from('locations').update({
      opening_hours: fromForm(toSave),
      delivery_fee: numberOrNull(fee) ?? 0,
      minimum_order: full ? numberOrNull(minimum) : null,
      free_delivery_from: full ? numberOrNull(freeFrom) : null,
    }).eq('id', locationId)

    let zoneError = null
    if (!error && full) {
      if (removedZones.length) {
        zoneError = (await supabase.from('delivery_zones').delete().in('id', removedZones)).error
      }
      for (const [i, z] of cleanZones.entries()) {
        if (zoneError) break
        const row = { location_id: locationId, name: z.name, fee: numberOrNull(z.fee) ?? 0, position: i }
        zoneError = (z.id
          ? await supabase.from('delivery_zones').update(row).eq('id', z.id)
          : await supabase.from('delivery_zones').insert(row)).error
      }
    }
    setSaving(false)

    if (error || zoneError) {
      console.error('Horaires et livraison:', (error || zoneError).message)
      return toast.error("Les réglages n'ont pas pu être enregistrés.")
    }
    toast.success('Horaires et livraison enregistrés')
    const { data: fresh } = await supabase
      .from('locations')
      .select('id, name, is_open, opening_hours, delivery_fee, minimum_order, free_delivery_from')
      .eq('id', locationId)
      .maybeSingle()
    if (fresh) setLocations((list) => list.map((l) => (l.id === fresh.id ? fresh : l)))
  }

  if (loading) return <AdminPageHeader title="Horaires et livraison"><p>Chargement…</p></AdminPageHeader>
  if (!location || !hours) {
    return (
      <AdminPageHeader title="Horaires et livraison">
        <p>Aucun point de vente à régler.</p>
      </AdminPageHeader>
    )
  }

  const status = describeOpening(openingState({ ...location, is_open: isOpen, opening_hours: fromForm(hours) }, timezone))

  return (
    <AdminPageHeader
      title="Horaires et livraison"
      subtitle="Quand vos clients peuvent commander, et combien coûte la livraison."
    >
      {locations.length > 1 && (
        <div className={styles.locationPicker}>
          <label htmlFor="location">Point de vente</label>
          <select id="location" className={styles.input} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      )}

      {/* Ouvert ou fermé, tout de suite */}
      <section className={`${styles.card} ${styles.nowCard} ${isOpen ? '' : styles.nowClosed}`}>
        <div>
          <strong>{isOpen ? 'Les commandes sont ouvertes' : 'Fermé : plus aucune commande'}</strong>
          <span>En ce moment : {status}</span>
        </div>
        <button type="button" className={isOpen ? styles.closeBtn : styles.primaryBtn} onClick={toggleOpenNow}>
          {isOpen ? 'Fermer maintenant' : 'Rouvrir'}
        </button>
      </section>

      <form onSubmit={save} className={styles.form}>
        <section className={styles.card}>
          <h2>Horaires d’ouverture</h2>
          {full ? (
            <div className={styles.days}>
              {WEEK_ORDER.map((d) => (
                <div key={d} className={styles.day}>
                  <label className={styles.dayName}>
                    <input type="checkbox" checked={hours[d].open} onChange={(e) => setDay(d, { open: e.target.checked })} />
                    {DAYS[d]}
                  </label>
                  {hours[d].open ? (
                    <div className={styles.ranges}>
                      {hours[d].ranges.map((r, i) => (
                        <span key={i} className={styles.range}>
                          <TimePicker value={r[0]} onChange={(v) => setRange(d, i, 0, v)} label={`${DAYS[d]}, ouverture`} />
                          <span>–</span>
                          <TimePicker value={r[1]} onChange={(v) => setRange(d, i, 1, v)} label={`${DAYS[d]}, fermeture`} />
                          {i === 1 && (
                            <button type="button" className={styles.linkBtn} onClick={() => setDay(d, { ranges: [hours[d].ranges[0]] })}>Retirer</button>
                          )}
                        </span>
                      ))}
                      {hours[d].ranges.length === 1 && (
                        <button type="button" className={styles.linkBtn} onClick={() => setDay(d, { ranges: [...hours[d].ranges, ['18:00', '23:00']] })}>
                          + Coupure
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className={styles.closedDay}>Fermé</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className={styles.help}>Les mêmes horaires pour tous vos jours d’ouverture.</p>
              <span className={styles.range}>
                <TimePicker value={sharedRange[0]} onChange={(v) => setEveryDay(0, 0, v)} label="Ouverture" />
                <span>–</span>
                <TimePicker value={sharedRange[1]} onChange={(v) => setEveryDay(0, 1, v)} label="Fermeture" />
              </span>
              <p className={styles.groupTitle}>Jours d’ouverture</p>
              <div className={styles.dayToggles}>
                {WEEK_ORDER.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`${styles.dayToggle} ${hours[d].open ? styles.dayToggleOn : ''}`}
                    onClick={() => setDay(d, { open: !hours[d].open })}
                    aria-pressed={hours[d].open}
                  >
                    {DAYS[d].slice(0, 3)}
                  </button>
                ))}
              </div>
              <p className={styles.upsell}>Horaires différents selon les jours et coupure le midi : offre Pro.</p>
            </>
          )}
          <p className={styles.help}>Une fermeture après minuit est possible (ex. 18:00 – 02:00).</p>
        </section>

        <section className={styles.card}>
          <h2>Livraison</h2>
          <div className={styles.field}>
            <label htmlFor="fee">Frais de livraison (FCFA)</label>
            <input id="fee" type="number" min="0" step="50" inputMode="numeric" className={styles.input} value={fee} onChange={(e) => setFee(e.target.value)} disabled={full && zones.length > 0} />
            {full && zones.length > 0 && <p className={styles.help}>Remplacés par les tarifs des quartiers ci-dessous.</p>}
          </div>

          {full ? (
            <>
              <h3>Tarifs par quartier</h3>
              <p className={styles.help}>
                Avec des quartiers, le client choisit le sien en commandant, et seuls ces quartiers sont livrés.
                Sans quartier, le forfait ci-dessus s’applique partout.
              </p>
              <div className={styles.zones}>
                {zones.map((z, i) => (
                  <div key={z.id || `new-${i}`} className={styles.zone}>
                    <input className={styles.input} placeholder="Quartier (ex : Bastos)" value={z.name} onChange={(e) => setZones((list) => list.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} aria-label="Nom du quartier" />
                    <input className={`${styles.input} ${styles.zoneFee}`} type="number" min="0" step="50" inputMode="numeric" placeholder="Frais" value={z.fee} onChange={(e) => setZones((list) => list.map((x, k) => (k === i ? { ...x, fee: e.target.value } : x)))} aria-label="Frais pour ce quartier" />
                    <button type="button" className={styles.linkBtn} onClick={() => {
                      if (z.id) setRemovedZones((r) => [...r, z.id])
                      setZones((list) => list.filter((_, k) => k !== i))
                    }}>Retirer</button>
                  </div>
                ))}
              </div>
              <button type="button" className={styles.secondaryBtn} onClick={() => setZones((list) => [...list, { name: '', fee: fee || '1000' }])}>
                + Ajouter un quartier
              </button>

              <div className={styles.twoCols}>
                <div className={styles.field}>
                  <label htmlFor="minimum">Commande minimum (FCFA)</label>
                  <input id="minimum" type="number" min="0" step="500" inputMode="numeric" className={styles.input} placeholder="Aucune" value={minimum} onChange={(e) => setMinimum(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="free">Livraison offerte à partir de (FCFA)</label>
                  <input id="free" type="number" min="0" step="500" inputMode="numeric" className={styles.input} placeholder="Jamais" value={freeFrom} onChange={(e) => setFreeFrom(e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <p className={styles.upsell}>Tarifs par quartier, commande minimum et livraison offerte : offre Pro.</p>
          )}
        </section>

        <div className={styles.saveBar}>
          <button type="submit" className={styles.primaryBtn} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {!full && <span className={styles.help}>Forfait actuel : {formatPrice(fee || 0)} par livraison.</span>}
        </div>
      </form>
    </AdminPageHeader>
  )
}
