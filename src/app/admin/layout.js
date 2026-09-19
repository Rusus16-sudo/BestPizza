import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { MANAGER_ROLES } from '@/utils/supabase/admin'

// Toutes les pages /admin/* sont réservées au gérant
export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !MANAGER_ROLES.includes(profile.role)) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', maxWidth: '420px', margin: '0 auto' }}>
        <h2>Accès réservé au gérant</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Cet espace sert à gérer le restaurant.</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: '16px' }}>Retour à la boutique</Link>
      </div>
    )
  }

  return children
}
