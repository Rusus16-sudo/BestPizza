import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSchema() {
  const { data, error } = await supabase.from('products').select('*').limit(1)
  console.log('Products table exists:', !error)
  if (error) {
    console.error(error)
  } else {
    console.log('Sample data:', data)
  }
}

checkSchema()
