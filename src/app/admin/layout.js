import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getStaffMembership, MANAGER_ROLES } from '@/lib/staff'

// Toutes les pages /admin/* sont réservées aux gérants d'un établissement
export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const membership = await getStaffMembership(supabase, user.id)

  if (!membership || !MANAGER_ROLES.includes(membership.role)) {
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
