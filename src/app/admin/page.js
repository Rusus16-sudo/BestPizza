import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Vérifier le rôle
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'gerant') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
        <h2>Accès Refusé 🛑</h2>
        <p>Cette page est réservée aux gérants de l'établissement.</p>
        <a href="/" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Retour à l'accueil</a>
      </div>
    )
  }

  // Récupérer la liste du personnel en utilisant la clé service_role pour contourner RLS
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  const { data: staff } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, is_active, created_at')
    .in('role', ['cuisinier', 'livreur'])
    .order('created_at', { ascending: false })

  return <AdminClient initialStaff={staff || []} />
}
