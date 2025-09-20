#!/usr/bin/env node

/**
 * Database Fix Script
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixSetUserContextFunction() {
  console.log('🔧 Fixing set_user_context function...');
  
  try {
    await supabaseAdmin.rpc('exec_sql', {
      sql: 'DROP FUNCTION IF EXISTS set_user_context(text);'
    });
    
    await supabaseAdmin.rpc('exec_sql', {
      sql: 'DROP FUNCTION IF EXISTS set_user_context(character varying);'
    });
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION set_user_context(user_id_param text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        PERFORM set_config('app.current_user_id', user_id_param, true);
      END;
      $$;
    `;
    
    await supabaseAdmin.rpc('exec_sql', {
      sql: createFunctionSQL
    });
    
    console.log('✅ set_user_context function fixed');
    return true;
  } catch (error) {
    console.error('❌ Error fixing set_user_context function:', error);
    return false;
  }
}

async function testFileUpload() {
  console.log('🧪 Testing file upload functionality...');
  
  try {
    const testChecksum = 'test-checksum-' + Date.now();
    const { data, error } = await supabaseAdmin
      .from('files')
      .insert([{
        filename: 'test-upload.txt',
        mime: 'text/plain',
        size_bytes: 100,
        checksum_sha256: testChecksum,
        storage_path: 'test/path.txt',
        file_type: 'txt',
        user_id: 'test-user-123',
        text_content: 'Test content'
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ File upload test failed:', error);
      return false;
    }
    
    console.log('✅ File upload test successful, ID:', data.id);
    
    await supabaseAdmin
      .from('files')
      .delete()
      .eq('id', data.id);
    
    console.log('✅ Test file cleaned up');
    return true;
  } catch (error) {
    console.error('❌ File upload test error:', error);
    return false;
  }
}

async function runFixes() {
  console.log('🚀 Starting Database Fixes\n');
  
  const functionFixed = await fixSetUserContextFunction();
  if (!functionFixed) {
    console.log('\n❌ Failed to fix set_user_context function');
    process.exit(1);
  }
  
  const uploadTest = await testFileUpload();
  if (!uploadTest) {
    console.log('\n❌ File upload test failed');
    process.exit(1);
  }
  
  console.log('\n🎉 All database fixes applied successfully!');
  console.log('✅ File uploads should now work properly');
}

// Run fixes
runFixes().catch(console.error);
