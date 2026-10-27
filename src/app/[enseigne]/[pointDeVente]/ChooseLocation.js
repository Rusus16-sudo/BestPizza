'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStorefront } from '@/context/StorefrontContext'

export default function ChooseLocation({ slug }) {
  const router = useRouter()
  const { chooseLocation, href } = useStorefront()
  // Une seule fois : retenir le point de vente, puis aller sur la vitrine
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    chooseLocation(slug)
    router.replace(href('/'))
  }, [slug, chooseLocation, href, router])

  return null
}
