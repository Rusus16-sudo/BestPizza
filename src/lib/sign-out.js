import { detachDevice } from '@/lib/push-client'

/**
 * Déconnexion depuis n'importe quel bouton « Se déconnecter ».
 * L'appareil est d'abord détaché du compte, tant qu'on sait encore lequel :
 * une fois déconnecté, il ne doit plus recevoir aucune notification du personnel
 * ni du compte client.
 */
export async function signOut(supabase) {
  await detachDevice()
  await supabase.auth.signOut()
}
