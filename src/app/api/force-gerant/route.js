import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Force update the specific user to gerant
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'gerant', email: 'teingorus@gmail.com' })
      .eq('id', 'ba340843-16d1-47ff-9c68-07deb0810ca3')
      .select()

    if (error) {
      return NextResponse.json({ status: 'Erreur', error: error.message })
    }

    return NextResponse.json({
      status: 'Succès ! Vous êtes maintenant Gérant.',
      message: 'Vous pouvez retourner sur http://localhost:3000 et vous verrez le menu Administration.',
      data
    })
  } catch (err) {
    return NextResponse.json({ status: 'Erreur Serveur', error: err.message })
  }
}
