import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getStaffMembership, screenRole, HOME_BY_ROLE } from '@/lib/staff'
import CreateRestaurant from './CreateRestaurant'
import OtherAccount from './OtherAccount'
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
          <p>
            Vous êtes connecté avec le compte de <strong>{restaurant?.name || 'votre restaurant'}</strong>.
            Un compte ne gère qu’un seul restaurant : pour en créer un autre, utilisez un autre compte.
          </p>
          <div className={styles.alreadyActions}>
            <Link href={HOME_BY_ROLE[screenRole(membership)] || '/admin'} className={styles.primaryBtn}>Aller à mon espace</Link>
            <OtherAccount />
          </div>
        </div>
      </main>
    )
  }

  return <CreateRestaurant />
}
