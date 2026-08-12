const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testInsert() {
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert({
      short_id: `CMD-12345`,
      total_price: 1000, // trying total_price
      status: 'en_attente',
      customer_name: 'Test'
    })
    .select()
    .single();

  if (orderError) {
    console.error('Order error:', orderError);
    return;
  }
  console.log('Order created:', orderData.id);

  const { data: itemData, error: itemError } = await supabase
    .from('order_items')
    .insert([
      {
        order_id: orderData.id,
        product_name: 'Test Pizza',
        quantity: 1,
        price: 1000
      }
    ]);

  if (itemError) {
    console.error('Item error:', itemError);
  } else {
    console.log('Success:', itemData);
  }
}

testInsert();
