'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// Adresse réelle du site (utile pour les liens envoyés par email)
async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

// Chacun arrive sur son espace ; la page recharge cette adresse pour
// que le navigateur reparte avec la nouvelle session.
const HOME_BY_ROLE = { cuisinier: '/kitchen', livreur: '/delivery', admin: '/admin', gerant: '/admin' }

export async function login(formData) {
  const supabase = await createClient()

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (error) {
    return { error: "Email ou mot de passe incorrect." }
  }

  if (authData?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', authData.user.id)
      .single()

    if (profile?.is_active === false) {
      await supabase.auth.signOut()
      return { error: "Ce compte est suspendu. Contactez le gérant." }
    }

    revalidatePath('/', 'layout')
    return { redirectTo: HOME_BY_ROLE[profile?.role] || '/' }
  }

  revalidatePath('/', 'layout')
  return { redirectTo: '/' }
}

export async function signup(formData) {
  const supabase = await createClient()
  const firstName = String(formData.get('first_name') || '').trim()

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email'),
    password: formData.get('password'),
    options: {
      data: { first_name: firstName },
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message === 'User already registered'
      ? "Un compte existe déjà avec cet email. Connectez-vous."
      : error.message }
  }

  // Si la confirmation par email est activée, il n'y a pas encore de session
  if (!data.session) {
    return { info: `Vérifiez votre boîte mail : un lien de confirmation vient de partir vers ${formData.get('email')}.` }
  }

  if (firstName && data.user) {
    await supabase.from('profiles').update({ first_name: firstName }).eq('id', data.user.id)
  }

  revalidatePath('/', 'layout')
  return { redirectTo: '/' }
}

export async function requestPasswordReset(formData) {
  const email = String(formData.get('email') || '').trim()
  if (!email) return { error: 'Entrez votre adresse email.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  })

  if (error) return { error: "L'email n'a pas pu être envoyé. Réessayez dans un instant." }

  // Réponse volontairement identique, que le compte existe ou non
  return { info: `Si un compte existe pour ${email}, un lien de réinitialisation vient d'y être envoyé.` }
}

export async function signInWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${await siteOrigin()}/auth/callback` },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}
