import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getStaffMembership } from '@/lib/staff'
import CreateRestaurant from './CreateRestaurant'
import styles from './Creer.module.css'

// tchopi.cm/creer : un restaurant crée sa vitrine Tchopi, tout seul
export const metadata = {
  title: 'Créer mon restaurant · Tchopi',
  description: 'Votre vitrine de commande en ligne, votre lien à partager et le suivi de vos livraisons, en quelques minutes.',
}

export default async function CreatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // D'abord un compte : la personne qui crée le restaurant en devient la propriétaire
  if (!user) redirect('/login?mode=signup&next=/creer')

  const membership = await getStaffMembership(supabase, user.id)
  if (membership) {
    const { data: restaurant } = await supabase.from('storefronts').select('name').eq('id', membership.organization_id).maybeSingle()
    return (
      <main className={styles.page}>
        <div className={`${styles.card} ${styles.already}`}>
          <h1>Vous avez déjà un restaurant</h1>
          <p>Votre compte travaille pour <strong>{restaurant?.name || 'un restaurant'}</strong>. Pour en créer un autre, utilisez un autre compte.</p>
          <Link href="/admin" className={styles.primaryBtn}>Aller à mon espace</Link>
        </div>
      </main>
    )
  }

  return <CreateRestaurant />
}
