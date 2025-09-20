#!/usr/bin/env node

/**
 * Database Migration Runner
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
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

async function runMigration() {
  try {
    console.log('🚀 Database Schema Migration Helper');
    console.log('');
    console.log('📄 To apply the database schema changes:');
    console.log('1. Open your Supabase dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and paste the contents of: server/src/database/schema.sql');
    console.log('4. Execute the SQL');
    console.log('');
    console.log('📋 The schema includes:');
    console.log('   ✅ All tables with proper relationships');
    console.log('   ✅ HNSW vector index for semantic search');
    console.log('   ✅ Row Level Security (RLS) policies');
    console.log('   ✅ Vector similarity search function');
    console.log('   ✅ User ownership filtering');
    console.log('');
    console.log('⚠️  Note: All CREATE statements use IF NOT EXISTS');
    console.log('   This means you can run the schema multiple times safely.');
    console.log('');
    console.log('✅ Schema file is ready for manual execution in Supabase SQL Editor');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
