'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getBrowserClient } from '@/utils/supabase/client'
import { formatPrice } from '@/lib/format'
import styles from './LocationRules.module.css'

/**
 * Un plat, point de vente par point de vente : disponible ou en rupture, et un prix
 * propre si besoin. Enregistré tout de suite (table product_locations).
 * Sans règle, le plat suit la carte commune.
 */
export default function LocationRules({ productId, basePrice, locations }) {
  const [supabase] = useState(() => getBrowserClient())
  const [rules, setRules] = useState({})
  const [prices, setPrices] = useState({})

  useEffect(() => {
    supabase
      .from('product_locations')
      .select('location_id, is_available, price_override')
      .eq('product_id', productId)
      .then(({ data }) => {
        const byLocation = Object.fromEntries((data || []).map((r) => [r.location_id, r]))
        setRules(byLocation)
        setPrices(Object.fromEntries((data || []).map((r) => [r.location_id, r.price_override ?? ''])))
      })
  }, [supabase, productId])

  const save = async (locationId, patch) => {
    const current = rules[locationId] || { is_available: true, price_override: null }
    const next = { ...current, ...patch }
    setRules((r) => ({ ...r, [locationId]: next }))

    // Rien de particulier ici : le plat suit la carte commune, la règle disparaît
    const { error } = next.is_available && next.price_override == null
      ? await supabase.from('product_locations').delete().eq('product_id', productId).eq('location_id', locationId)
      : await supabase.from('product_locations').upsert({
        product_id: productId,
        location_id: locationId,
        is_available: next.is_available,
        price_override: next.price_override,
      })
    if (error) {
      setRules((r) => ({ ...r, [locationId]: current }))
      toast.error("Ce changement n'a pas pu être enregistré.")
    }
  }

  const savePrice = (locationId) => {
    const raw = String(prices[locationId] ?? '').trim()
    const value = raw === '' ? null : Math.round(Number(raw))
    if (value !== null && (!Number.isFinite(value) || value < 0)) return toast.error('Un prix en FCFA, sans virgule.')
    const current = rules[locationId]?.price_override ?? null
    if (value !== current) save(locationId, { price_override: value })
  }

  return (
    <section className={styles.box}>
      <h4>Par point de vente</h4>
      <p className={styles.intro}>Rupture ou prix différent à une adresse. Enregistré tout de suite.</p>
      <ul className={styles.list}>
        {locations.map((l) => {
          const rule = rules[l.id] || { is_available: true, price_override: null }
          return (
            <li key={l.id} className={`${styles.row} ${rule.is_available ? '' : styles.off}`}>
              <strong className={styles.name}>{l.name}</strong>
              <label className={styles.price}>
                <span className="visually-hidden">Prix à {l.name}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="50"
                  value={prices[l.id] ?? ''}
                  placeholder={formatPrice(basePrice)}
                  onChange={(e) => setPrices((p) => ({ ...p, [l.id]: e.target.value }))}
                  onBlur={() => savePrice(l.id)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
                />
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={rule.is_available}
                aria-label={`Disponible à ${l.name}`}
                className={`${styles.switch} ${rule.is_available ? styles.switchOn : ''}`}
                onClick={() => save(l.id, { is_available: !rule.is_available })}
              >
                <span />
              </button>
              <span className={styles.state}>{rule.is_available ? 'Disponible' : 'Rupture'}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
