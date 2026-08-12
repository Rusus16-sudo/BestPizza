const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Using service role to bypass RLS and see what's actually in DB
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // fallback
);

async function testQuery() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      short_id,
      order_items (
        *
      )
    `)
    .eq('short_id', 'CMD-62647');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

testQuery();
