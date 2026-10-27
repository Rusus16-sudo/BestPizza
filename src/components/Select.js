'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './Select.module.css'

/**
 * Liste déroulante Tchopi, à la place de celle du navigateur.
 * options : [{ value, label, hint? }] — hint s'affiche à droite (un prix, un détail).
 * Clavier : flèches, Entrée, Échap. Sur téléphone, la liste monte du bas de l'écran.
 */
export default function Select({ value, onChange, options = [], placeholder = 'Choisir…', label, id, invalid = false, describedBy }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const panelRef = useRef(null)
  // Position de la liste sur ordinateur : sous le champ, ou au-dessus s'il manque de place.
  // Elle est affichée au-dessus de tout (portail) pour ne pas rester coincée dans une fenêtre qui défile.
  const [place, setPlace] = useState(null)

  const selected = options.find((o) => String(o.value) === String(value))

  const openList = () => {
    const index = options.findIndex((o) => String(o.value) === String(value))
    setActive(index >= 0 ? index : 0)
    measure()
    setOpen(true)
  }

  const choose = (option) => {
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const measure = useCallback(() => {
    if (!triggerRef.current || window.matchMedia('(max-width: 600px)').matches) return setPlace(null)
    const r = triggerRef.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    setPlace(below < 300 && r.top > below
      ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 8 }
      : { left: r.left, width: r.width, top: r.bottom + 8 })
  }, [])

  // La liste suit le champ si la page défile ou change de taille
  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, measure])

  // Fermeture en touchant à côté
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // L'option active reste visible quand on la déplace au clavier
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (options[active]) choose(options[active])
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`${styles.trigger} ${open ? styles.open : ''} ${invalid ? styles.invalid : ''}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        aria-describedby={describedBy}
      >
        <span className={selected ? styles.value : styles.placeholder}>{selected ? selected.label : placeholder}</span>
        {selected?.hint && <span className={styles.triggerHint}>{selected.hint}</span>}
        <svg className={styles.chevron} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {open && createPortal(
        <>
          <div className={styles.backdrop} aria-hidden="true" />
          <div className={styles.panel} ref={panelRef} style={place || undefined}>
            <div className={styles.grabber} aria-hidden="true" />
            {label && <p className={styles.sheetTitle}>{label}</p>}
            <ul className={styles.list} role="listbox" ref={listRef} aria-label={label}>
              {options.map((option, i) => {
                const isSelected = String(option.value) === String(value)
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.option} ${i === active ? styles.active : ''} ${isSelected ? styles.selected : ''}`}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => choose(option)}
                  >
                    <span className={styles.check} aria-hidden="true">
                      {isSelected && <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </span>
                    <span className={styles.optionLabel}>{option.label}</span>
                    {option.hint && <span className={styles.hint}>{option.hint}</span>}
                  </li>
                )
              })}
              {options.length === 0 && <li className={styles.empty}>Aucun choix pour le moment</li>}
            </ul>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
