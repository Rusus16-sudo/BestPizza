import { getStaffMembership } from '@/lib/staff'

/**
 * Emplacement d'une nouvelle photo de plat dans le stockage « products » :
 * un dossier par enseigne ({organization_id}/{horodatage}.{extension}),
 * pour que chaque établissement ne gère que ses propres photos.
 */
export async function productPhotoPath(supabase, file) {
  const { data: { user } } = await supabase.auth.getUser()
  const membership = await getStaffMembership(supabase, user?.id)
  if (!membership) throw new Error('Seul le gérant peut ajouter une photo')

  const ext = String(file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  return `${membership.organization_id}/${Date.now()}.${ext}`
}
