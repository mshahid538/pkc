require("dotenv").config();
const { supabaseAdmin } = require("../config/database");

const createTablesSQL = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      last_login TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  threads: `
    CREATE TABLE IF NOT EXISTS threads (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  messages: `
    CREATE TABLE IF NOT EXISTS messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  files: `
    CREATE TABLE IF NOT EXISTS files (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      mime VARCHAR(50) NOT NULL,
      size_bytes BIGINT NOT NULL,
      checksum_sha256 VARCHAR(64) NOT NULL,
      storage_path VARCHAR(500) NOT NULL,
      text_content TEXT,
      file_type VARCHAR(10),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(checksum_sha256)
    );
  `,
  thread_files: `
    CREATE TABLE IF NOT EXISTS thread_files (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  summaries: `
    CREATE TABLE IF NOT EXISTS summaries (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      short_summary TEXT,
      long_summary TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(thread_id)
    );
  `,
  tags: `
    CREATE TABLE IF NOT EXISTS tags (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    );
  `,
  item_tags: `
    CREATE TABLE IF NOT EXISTS item_tags (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      item_type VARCHAR(20) NOT NULL,
      item_id UUID NOT NULL,
      tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE
    );
  `,
  file_chunks: `
    CREATE TABLE IF NOT EXISTS file_chunks (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_id UUID REFERENCES files(id) ON DELETE CASCADE,
      filename VARCHAR(255),
      chunk_index INTEGER,
      chunk_text TEXT,
      embedding VECTOR(1536),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
};

const createIndexesSQL = {
  users_email: "CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);",
  users_username:
    "CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);",
  idx_messages_thread_id_created_at:
    "CREATE INDEX IF NOT EXISTS idx_messages_thread_id_created_at ON messages(thread_id, created_at);",
  idx_files_checksum_sha256_unique:
    "CREATE INDEX IF NOT EXISTS idx_files_checksum_sha256_unique ON files(checksum_sha256);",
  idx_thread_files_thread_id:
    "CREATE INDEX IF NOT EXISTS idx_thread_files_thread_id ON thread_files(thread_id);",
  idx_summaries_thread_id:
    "CREATE INDEX IF NOT EXISTS idx_summaries_thread_id ON summaries(thread_id);",
  file_chunks_file_id_idx:
    "CREATE INDEX IF NOT EXISTS file_chunks_file_id_idx ON file_chunks(file_id);",
  file_chunks_chunk_index_idx:
    "CREATE INDEX IF NOT EXISTS file_chunks_chunk_index_idx ON file_chunks(chunk_index);",
};
// Ensure extensions are created
async function createExtensions() {
  await executeSQL('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  await executeSQL('CREATE EXTENSION IF NOT EXISTS "vector";');
}

async function executeSQL(sql) {
  try {
    const { error } = await supabaseAdmin.rpc("exec_sql", { sql });
    if (error) {
      // RPC exec_sql failed

      return { success: false, error: "RPC exec_sql not available" };
    }
    return { success: true };
  } catch (error) {
    // RPC exec_sql not available
    return { success: false, error: error.message };
  }
}

async function runMigration() {
  try {
    if (!supabaseAdmin) {
      console.error(
        "Supabase admin client not available. Please check your SUPABASE_SERVICE_ROLE_KEY environment variable."
      );
      process.exit(1);
    }

    // Ensure extensions
    await createExtensions();

    // Test DB connection
    try {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("count")
        .limit(1);
      if (error && error.code !== "PGRST116") {
        console.error("Database connection failed:", error);
        process.exit(1);
      }
    } catch (error) {
      console.error("Database connection failed:", error.message);
      process.exit(1);
    }

    // Create tables
    for (const [tableName, sql] of Object.entries(createTablesSQL)) {
      const result = await executeSQL(sql);
      if (!result.success) {
        console.error(`Failed to create table ${tableName}:`, result.error);
      }
    }

    // Create indexes
    for (const [indexName, sql] of Object.entries(createIndexesSQL)) {
      const result = await executeSQL(sql);
      if (!result.success) {
        console.error(`Failed to create index ${indexName}:`, result.error);
      }
    }

    // Final test
    try {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("count")
        .limit(1);
      if (error && error.code !== "PGRST116") {
        console.error("Final test failed:", error);
      } else {
        // Database is ready
      }
    } catch (error) {
      console.error("Final test failed:", error.message);
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}
module.exports = { runMigration };
