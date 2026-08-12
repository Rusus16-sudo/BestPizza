import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      return NextResponse.json({ status: 'Error fetching user', error: authError })
    }

    if (!user) {
      return NextResponse.json({ status: 'Not logged in', user: null })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      status: 'Logged in',
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile || null,
      profileError: profileError || null
    })
  } catch (err) {
    return NextResponse.json({ status: 'Server Error', error: err.message })
  }
}
