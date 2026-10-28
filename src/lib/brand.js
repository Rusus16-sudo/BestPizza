// Couleur d'un restaurant : la vitrine reprend les variables de couleur du site
// (--color-primary…) avec la teinte choisie par l'enseigne.

const FALLBACK = '#d93a1f'

function toRgb(hex) {
  const clean = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())?.[1]
  const value = parseInt(clean || FALLBACK.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`

/** Les variables CSS qui donnent à la vitrine la couleur de l'enseigne. */
export function brandColorVars(hex) {
  const rgb = toRgb(hex)
  const darker = rgb.map((c) => c * 0.86)
  return {
    '--color-primary': toHex(rgb),
    '--color-primary-rgb': rgb.join(', '),
    '--color-primary-hover': toHex(darker),
    '--color-primary-dark': toHex(darker),
    '--color-primary-dim': `rgba(${rgb.join(', ')}, 0.08)`,
    '--shadow-glow': `0 8px 24px rgba(${rgb.join(', ')}, 0.28)`,
  }
}

// Couleurs proposées aux restaurants (inscription, « Mon restaurant »)
export const BRAND_COLORS = [
  { value: '#d93a1f', name: 'Tomate' },
  { value: '#e8590c', name: 'Orange' },
  { value: '#d6336c', name: 'Framboise' },
  { value: '#7048e8', name: 'Violet' },
  { value: '#1c7ed6', name: 'Bleu' },
  { value: '#0ca678', name: 'Menthe' },
  { value: '#2b8a3e', name: 'Basilic' },
  { value: '#1f1d1b', name: 'Ardoise' },
]
