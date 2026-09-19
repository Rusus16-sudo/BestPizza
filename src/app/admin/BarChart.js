'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './BarChart.module.css'

// Histogramme vertical, une seule série. SVG sans librairie, largeur mesurée.
// data : [{ label, value, tick }]  (tick = libellé d'axe, ou vide pour l'alléger)
export default function BarChart({ data, format, height = 200, tone = 'dark', title, emptyText }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const max = Math.max(0, ...data.map(d => d.value))
  const niceMax = niceCeil(max)
  const ticks = niceMax > 0 ? [0, niceMax / 2, niceMax] : [0]

  const padLeft = 44
  const padBottom = 24
  const padTop = 8
  const plotW = Math.max(0, width - padLeft)
  const plotH = height - padBottom - padTop
  const slot = data.length ? plotW / data.length : 0
  const barW = Math.max(2, Math.min(24, slot - 2))
  const y = (v) => padTop + plotH - (niceMax ? (v / niceMax) * plotH : 0)
  const isEmpty = max === 0

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${styles[tone]}`}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={title}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={padLeft} x2={width} y1={y(t)} y2={y(t)} className={styles.grid} />
              <text x={padLeft - 8} y={y(t)} dy="0.32em" textAnchor="end" className={styles.axis}>
                {compact(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const cx = padLeft + slot * i + slot / 2
            const top = y(d.value)
            const h = padTop + plotH - top
            return (
              <g key={i}>
                {h > 0 && (
                  <path
                    d={roundedTop(cx - barW / 2, top, barW, h, Math.min(4, barW / 2, h))}
                    className={`${styles.bar} ${hover === i ? styles.barHover : ''}`}
                  />
                )}
                {d.tick && (
                  <text x={cx} y={height - 6} textAnchor="middle" className={styles.axis}>{d.tick}</text>
                )}
                {/* Zone de survol plus large que la barre */}
                <rect
                  x={padLeft + slot * i}
                  y={padTop}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onTouchStart={() => setHover(i)}
                />
              </g>
            )
          })}
        </svg>
      )}

      {hover !== null && data[hover] && width > 0 && (
        <div
          className={styles.tooltip}
          style={{
            left: Math.min(Math.max(padLeft + slot * hover + slot / 2, 70), width - 70),
            top: Math.max(0, y(data[hover].value) - 52),
          }}
        >
          <span>{data[hover].label}</span>
          <strong>{format(data[hover].value)}</strong>
        </div>
      )}

      {isEmpty && emptyText && <p className={styles.empty}>{emptyText}</p>}

      {/* Version tableau pour les lecteurs d'écran */}
      <table className="visually-hidden">
        <caption>{title}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}><th scope="row">{d.label}</th><td>{format(d.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function roundedTop(x, y, w, h, r) {
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

function niceCeil(v) {
  if (v <= 0) return 0
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nice * exp
}

function compact(v) {
  if (v >= 1000000) return `${(v / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`
  if (v >= 1000) return `${(v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k`
  return String(v)
}
