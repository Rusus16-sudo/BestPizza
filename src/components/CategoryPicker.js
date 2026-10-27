'use client'

import { useState } from 'react'
import Select from '@/components/Select'
import { categoryLabel } from '@/lib/categories'
import styles from './CategoryPicker.module.css'

const NEW = '__nouvelle__'

/**
 * Catégorie d'un plat : celles du restaurant, plus « Nouvelle catégorie… ».
 * La catégorie actuelle du plat est toujours proposée, même si elle est rare :
 * l'enregistrer ne la change jamais en silence.
 */
export default function CategoryPicker({ value, onChange, categories = [], allowNew = true, id }) {
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')

  const list = [...new Set([...categories, ...(value ? [value] : [])])]
  const options = [
    ...list.map((c) => ({ value: c, label: categoryLabel(c) })),
    ...(allowNew ? [{ value: NEW, label: '＋ Nouvelle catégorie…' }] : []),
  ]

  if (creating) {
    const confirm = () => {
      const name = draft.trim()
      if (name) onChange(name)
      setCreating(false)
      setDraft('')
    }
    return (
      <div className={styles.newRow}>
        <input
          id={id}
          autoFocus
          className={styles.input}
          value={draft}
          placeholder="Ex : Tacos, Salades…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); confirm() }
            if (e.key === 'Escape') { e.preventDefault(); setCreating(false) }
          }}
          aria-label="Nom de la nouvelle catégorie"
        />
        <button type="button" className={styles.ok} onClick={confirm}>OK</button>
        <button type="button" className={styles.cancel} onClick={() => setCreating(false)}>Annuler</button>
      </div>
    )
  }

  return (
    <Select
      id={id}
      label="Catégorie"
      value={value}
      options={options}
      placeholder="Choisir une catégorie"
      onChange={(v) => (v === NEW ? setCreating(true) : onChange(v))}
    />
  )
}
