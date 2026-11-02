'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Déclenche l'animation d'une section quand elle arrive à l'écran, une seule fois.
 * `data-reveal` : absent (rendu serveur, rien n'est caché), « ready » (prêt, en attente),
 * « shown » (à l'écran). Le CSS de la section décide de ce qui bouge ; sans JavaScript
 * ou avec les animations désactivées, tout reste simplement visible.
 */
export default function Reveal({ as: Tag = 'div', className, children, threshold = 0.3, ...rest }) {
  const ref = useRef(null)
  const [state, setState] = useState(undefined)

  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    // Déjà à l'écran au chargement : on joue tout de suite
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setState('shown')
      observer.disconnect()
    }, { threshold })
    // Laisse le navigateur peindre l'état de départ avant d'observer
    const frame = requestAnimationFrame(() => {
      setState('ready')
      observer.observe(el)
    })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [threshold])

  return (
    <Tag ref={ref} className={className} data-reveal={state} {...rest}>
      {children}
    </Tag>
  )
}
