import LoginClient from './LoginClient'

// ?mode=signup ouvre directement la création de compte ; ?next=… indique où revenir.
// Lu à chaque visite : depuis « Vous avez un restaurant ? », on revient ici avec une autre adresse.
export default async function Page({ searchParams }) {
  const params = await searchParams
  const mode = params.mode === 'signup' ? 'signup' : 'login'
  const target = typeof params.next === 'string' ? params.next : ''
  const next = target.startsWith('/') && !target.startsWith('//') ? target : ''
  return <LoginClient key={`${mode}|${next}`} initialMode={mode} next={next} />
}
