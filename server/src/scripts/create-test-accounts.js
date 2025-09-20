#!/usr/bin/env node

/**
 * Create Test Accounts for RLS Testing
 * Creates Owner and Developer test accounts in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestAccounts() {
  console.log('👥 Creating Test Accounts...');
  
  const testAccounts = [
    {
      id: 'user_owner_test123',
      email: 'owner@test.com',
      username: 'owner_test',
      role: 'Owner'
    },
    {
      id: 'user_developer_test456',
      email: 'developer@test.com', 
      username: 'developer_test',
      role: 'Developer'
    }
  ];
  
  try {
    for (const account of testAccounts) {
      console.log(`\n📝 Creating ${account.role} account: ${account.email}`);
      
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', account.id)
        .single();
      
      if (existingUser) {
        console.log(`   ⚠️  User ${account.email} already exists, skipping...`);
        continue;
      }
      
      // Create user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          id: account.id,
          email: account.email,
          username: account.username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (createError) {
        console.error(`   ❌ Error creating ${account.role} account:`, createError);
        continue;
      }
      
      console.log(`   ✅ ${account.role} account created successfully!`);
      console.log(`      ID: ${newUser.id}`);
      console.log(`      Email: ${newUser.email}`);
      console.log(`      Username: ${newUser.username}`);
    }
    
    console.log('\n🎉 Test accounts creation complete!');
    console.log('\n📋 Test Account Details:');
    console.log('   Owner Account:');
    console.log('     Email: owner@test.com');
    console.log('     Username: owner_test');
    console.log('     ID: user_owner_test123');
    console.log('\n   Developer Account:');
    console.log('     Email: developer@test.com');
    console.log('     Username: developer_test');
    console.log('     ID: user_developer_test456');
    
    console.log('\n🧪 These accounts can be used for RLS testing:');
    console.log('   1. Log in as Developer → confirm no access to Owner\'s data');
    console.log('   2. Log in as Owner → confirm access to own data only');
    console.log('   3. Test cross-user access prevention');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the setup
createTestAccounts();
