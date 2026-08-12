const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanGhostOrders() {
  // Fetch all orders with their items
  const { data: orders, error } = await supabase.from('orders').select('id, order_items(id)');
  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  // Find orders that have 0 order_items
  const ghostOrders = orders.filter(o => !o.order_items || o.order_items.length === 0);
  console.log(`Found ${ghostOrders.length} ghost orders.`);

  for (const ghost of ghostOrders) {
    console.log(`Deleting ghost order: ${ghost.id}`);
    await supabase.from('orders').delete().eq('id', ghost.id);
  }
  
  console.log('Cleanup complete.');
}

cleanGhostOrders();
