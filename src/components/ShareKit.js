'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import styles from './ShareKit.module.css'

// Le QR code reste toujours foncé sur fond blanc : une couleur claire se scanne mal
const QR_INK = '#1f1d1b'

/**
 * Le kit de partage d'une vitrine : son lien, un QR code à imprimer ou télécharger,
 * « Copier le lien » et « Partager sur WhatsApp ».
 */
export default function ShareKit({ url, name }) {
  const [qr, setQr] = useState(null)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 1, color: { dark: QR_INK, light: '#ffffff' }, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(null))
  }, [url])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Lien copié')
    } catch {
      toast.error('Copie impossible : sélectionnez le lien à la main.')
    }
  }

  const message = `Commandez chez ${name} et suivez votre livraison en direct : ${url}`
  const display = url.replace(/^https?:\/\//, '')

  return (
    <div className={styles.kit}>
      <div className={styles.qrCard}>
        {qr ? <img src={qr} alt={`QR code de la vitrine ${name}`} className={styles.qr} /> : <div className={styles.qrPlaceholder} />}
        <p className={styles.qrCaption}>Scannez pour commander</p>
      </div>

      <div className={styles.side}>
        <div className={styles.link}>
          <span className={styles.linkText}>{display}</span>
          <button type="button" className={styles.copy} onClick={copy}>Copier</button>
        </div>

        <a className={styles.whatsapp} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.06c-.24.68-1.42 1.3-1.95 1.34-.5.05-.97.23-3.28-.68-2.78-1.1-4.55-3.95-4.69-4.13-.13-.18-1.12-1.49-1.12-2.84 0-1.35.71-2.02.96-2.29.25-.28.55-.34.73-.34h.53c.17 0 .4-.06.62.48.24.55.8 1.92.87 2.06.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.16-.19.69-.81.88-1.09.18-.28.37-.23.62-.14.25.09 1.6.76 1.87.9.28.14.46.21.53.32.07.12.07.66-.17 1.33Z" /></svg>
          Partager sur WhatsApp
        </a>

        {qr && (
          <a className={styles.download} href={qr} download={`qr-${display.split('/').pop() || 'vitrine'}.png`}>
            Télécharger le QR code
          </a>
        )}
        <p className={styles.tip}>Collez le lien dans votre bio Instagram, Facebook et TikTok. Imprimez le QR code pour vos sacs et votre comptoir.</p>
      </div>
    </div>
  )
}
