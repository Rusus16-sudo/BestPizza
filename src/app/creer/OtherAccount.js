'use client'

import { useState } from 'react'
import { getBrowserClient } from '@/utils/supabase/client'
import { signOut } from '@/lib/sign-out'
import styles from './Creer.module.css'

// Un compte ne gère qu'un restaurant : pour en créer un autre, on change de compte
export default function OtherAccount() {
  const [busy, setBusy] = useState(false)

  const switchAccount = async () => {
    setBusy(true)
    await signOut(getBrowserClient())
    window.location.replace('/login?mode=signup&next=/creer')
  }

  return (
    <button type="button" className={styles.secondaryBtn} onClick={switchAccount} disabled={busy}>
      {busy ? 'Un instant…' : 'Utiliser un autre compte'}
    </button>
  )
}
