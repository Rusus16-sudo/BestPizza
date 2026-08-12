const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Using service role to bypass RLS and force delete
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceClearAll() {
  const { error } = await supabase
    .from('orders')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Successfully force-deleted ALL orders bypassing RLS.');
  }
}

forceClearAll();
