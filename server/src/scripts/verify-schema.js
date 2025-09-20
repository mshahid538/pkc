#!/usr/bin/env node

/**
 * Database Schema Verification Script
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTables() {
  console.log('📋 Verifying database tables...');
  
  const tables = [
    'users', 'threads', 'messages', 'files', 'thread_files', 
    'summaries', 'tags', 'item_tags', 'file_chunks'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
        return false;
      } else {
        console.log(`✅ Table ${table}: OK`);
      }
    } catch (err) {
      console.log(`❌ Table ${table}: ${err.message}`);
      return false;
    }
  }
  
  return true;
}

async function verifyUserIdColumn() {
  console.log('\n🔍 Verifying user_id column in files table...');
  
  try {
    const { data, error } = await supabase
      .from('files')
      .select('user_id')
      .limit(1);
    
    if (error) {
      console.log(`❌ user_id column: ${error.message}`);
      return false;
    } else {
      console.log('✅ user_id column exists in files table');
      return true;
    }
  } catch (err) {
    console.log(`❌ user_id column: ${err.message}`);
    return false;
  }
}

async function verifyHNSWIndex() {
  console.log('\n🔍 Verifying HNSW index...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'file_chunks' 
        AND indexname LIKE '%hnsw%'
      `
    });
    
    if (error) {
      console.log(`❌ HNSW index check: ${error.message}`);
      return false;
    } else if (data && data.length > 0) {
      console.log('✅ HNSW index exists');
      return true;
    } else {
      console.log('❌ HNSW index not found');
      return false;
    }
  } catch (err) {
    console.log(`❌ HNSW index check: ${err.message}`);
    return false;
  }
}

async function verifyVectorFunction() {
  console.log('\n🔍 Verifying vector search function...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT proname 
        FROM pg_proc 
        WHERE proname = 'match_file_chunks'
      `
    });
    
    if (error) {
      console.log(`❌ Vector function check: ${error.message}`);
      return false;
    } else if (data && data.length > 0) {
      console.log('✅ match_file_chunks function exists');
      return true;
    } else {
      console.log('❌ match_file_chunks function not found');
      return false;
    }
  } catch (err) {
    console.log(`❌ Vector function check: ${err.message}`);
    return false;
  }
}

async function verifyEmbeddings() {
  console.log('\n🔍 Verifying embeddings support...');
  
  try {
    const { data, error } = await supabase
      .from('file_chunks')
      .select('embedding')
      .not('embedding', 'is', null)
      .limit(1);
    
    if (error) {
      console.log(`❌ Embeddings check: ${error.message}`);
      return false;
    } else {
      console.log('✅ Embeddings column exists and supports vector data');
      return true;
    }
  } catch (err) {
    console.log(`❌ Embeddings check: ${err.message}`);
    return false;
  }
}

async function verifyRLSPolicies() {
  console.log('\n🔍 Verifying RLS policies...');
  
  const tables = ['users', 'threads', 'messages', 'files', 'file_chunks'];
  let allPoliciesOk = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT COUNT(*) as policy_count
          FROM pg_policies 
          WHERE tablename = '${table}'
        `
      });
      
      if (error) {
        console.log(`❌ RLS policies for ${table}: ${error.message}`);
        allPoliciesOk = false;
      } else if (data && data[0].policy_count > 0) {
        console.log(`✅ RLS policies for ${table}: ${data[0].policy_count} policies`);
      } else {
        console.log(`❌ No RLS policies found for ${table}`);
        allPoliciesOk = false;
      }
    } catch (err) {
      console.log(`❌ RLS policies for ${table}: ${err.message}`);
      allPoliciesOk = false;
    }
  }
  
  return allPoliciesOk;
}

async function runVerification() {
  console.log('🚀 Starting Database Schema Verification\n');
  
  const results = {
    tables: await verifyTables(),
    userIdColumn: await verifyUserIdColumn(),
    hnswIndex: await verifyHNSWIndex(),
    vectorFunction: await verifyVectorFunction(),
    embeddings: await verifyEmbeddings(),
    rlsPolicies: await verifyRLSPolicies()
  };
  
  console.log('\n📊 Verification Results Summary:');
  console.log(`   Tables: ${results.tables ? '✅' : '❌'}`);
  console.log(`   User ID Column: ${results.userIdColumn ? '✅' : '❌'}`);
  console.log(`   HNSW Index: ${results.hnswIndex ? '✅' : '❌'}`);
  console.log(`   Vector Function: ${results.vectorFunction ? '✅' : '❌'}`);
  console.log(`   Embeddings: ${results.embeddings ? '✅' : '❌'}`);
  console.log(`   RLS Policies: ${results.rlsPolicies ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 All database requirements verified successfully!');
    console.log('✅ Search & Ingestion implementation is ready for testing');
  } else {
    console.log('\n⚠️  Some requirements are not properly implemented');
    console.log('❌ Please check the failed items above and re-run the schema');
  }
  
  return allPassed;
}

// Run verification
runVerification().catch(console.error);
