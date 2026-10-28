import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getStaffMembership, screenRole, HOME_BY_ROLE } from '@/lib/staff'
import CreateRestaurant from './CreateRestaurant'
import OtherAccount from './OtherAccount'
import { PLAN_NAMES, BUSINESS_INCLUDED_LOCATIONS } from '@/lib/plans'
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
    const { data: restaurant } = await supabase.from('storefronts').select('name, plan').eq('id', membership.organization_id).maybeSingle()
    const name = restaurant?.name || 'votre restaurant'
    const isOrgManager = membership.role === 'proprietaire' || (membership.role === 'gerant' && !membership.location_id)
    const business = restaurant?.plan === 'business'
    return (
      <main className={styles.page}>
        <div className={`${styles.card} ${styles.already}`}>
          <h1>Vous avez déjà un restaurant</h1>
          <p>
            Vous êtes connecté avec le compte de <strong>{name}</strong>
            {restaurant?.plan && <> (offre {PLAN_NAMES[restaurant.plan]})</>}.
          </p>

          {/* Une nouvelle adresse n'est pas un nouveau restaurant : c'est un point de vente de plus */}
          {isOrgManager ? (
            <>
              <div className={styles.alreadyTip}>
                <strong>Vous ouvrez une nouvelle adresse ?</strong>
                {business
                  ? <span>Ajoutez-la comme point de vente de {name} : même carte, même équipe, son propre lien.</span>
                  : <span>Votre offre permet un seul point de vente. Avec Business, {name} peut avoir {BUSINESS_INCLUDED_LOCATIONS} adresses ou plus, avec une carte commune.</span>}
              </div>
              <div className={styles.alreadyActions}>
                <Link href="/admin/points-de-vente" className={styles.primaryBtn}>
                  {business ? 'Ajouter un point de vente' : 'Voir mes points de vente'}
                </Link>
                <Link href="/admin" className={styles.secondaryBtn}>Aller à mon espace</Link>
              </div>
            </>
          ) : (
            <div className={styles.alreadyActions}>
              <Link href={HOME_BY_ROLE[screenRole(membership)] || '/admin'} className={styles.primaryBtn}>Aller à mon espace</Link>
            </div>
          )}

          <p className={styles.alreadyOther}>
            Vous lancez un restaurant complètement différent ? <OtherAccount />
          </p>
        </div>
      </main>
    )
  }

  return <CreateRestaurant />
}
