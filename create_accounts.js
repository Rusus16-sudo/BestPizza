const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function createAccounts() {
  const accounts = [
    { email: 'boss@bestpizza.com', password: 'password123', role: 'admin' },
    { email: 'chef@bestpizza.com', password: 'password123', role: 'cuisinier' },
    { email: 'livreur@bestpizza.com', password: 'password123', role: 'livreur' }
  ];

  for (const acc of accounts) {
    // Check if user exists
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(u => u.email === acc.email);
    
    let userId;
    if (existingUser) {
        console.log(`User ${acc.email} already exists, updating role...`);
        userId = existingUser.id;
    } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: acc.email,
          password: acc.password,
          email_confirm: true // Force confirmation
        });
        
        if (error) {
          console.error(`Error creating ${acc.email}:`, error.message);
          continue;
        }
        userId = data.user.id;
        console.log(`Created ${acc.email}`);
    }

    // Give time for trigger to fire
    await new Promise(r => setTimeout(r, 1000));

    // Update profile role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: acc.role, is_active: true })
      .eq('id', userId);
      
    if (profileError) {
      console.error(`Error updating profile for ${acc.email}:`, profileError.message);
    } else {
      console.log(`Updated role to ${acc.role} for ${acc.email}`);
    }
  }
}

createAccounts();
