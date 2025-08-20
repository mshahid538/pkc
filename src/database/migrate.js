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
  conversations: `
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  messages: `
    CREATE TABLE IF NOT EXISTS messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  files: `
    CREATE TABLE IF NOT EXISTS files (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_size BIGINT NOT NULL,
      file_hash VARCHAR(64) NOT NULL,
      file_type VARCHAR(10) NOT NULL,
      storage_path VARCHAR(500) NOT NULL,
      storage_url TEXT,
      text_content TEXT,
      word_count INTEGER DEFAULT 0,
      page_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, file_hash)
    );
  `,
  file_chunks: `
    CREATE TABLE IF NOT EXISTS file_chunks (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      chunk_embedding VECTOR(1536),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(file_id, chunk_index)
    );
  `,
};

const createIndexesSQL = {
  users_email: "CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);",
  users_username:
    "CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);",
  conversations_user_id:
    "CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON conversations(user_id);",
  conversations_created_at:
    "CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations(created_at);",
  messages_conversation_id:
    "CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);",
  messages_created_at:
    "CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);",
  files_user_id:
    "CREATE INDEX IF NOT EXISTS files_user_id_idx ON files(user_id);",
  files_file_hash:
    "CREATE INDEX IF NOT EXISTS files_file_hash_idx ON files(file_hash);",
  files_file_type:
    "CREATE INDEX IF NOT EXISTS files_file_type_idx ON files(file_type);",
  files_created_at:
    "CREATE INDEX IF NOT EXISTS files_created_at_idx ON files(created_at);",
  file_chunks_file_id:
    "CREATE INDEX IF NOT EXISTS file_chunks_file_id_idx ON file_chunks(file_id);",
  file_chunks_chunk_index:
    "CREATE INDEX IF NOT EXISTS file_chunks_chunk_index_idx ON file_chunks(chunk_index);",
};

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

    for (const [tableName, sql] of Object.entries(createTablesSQL)) {
      const result = await executeSQL(sql);
      if (result.success) {
        // Table created
      } else {
        // Manual execution required
      }
    }

    for (const [indexName, sql] of Object.entries(createIndexesSQL)) {
      const result = await executeSQL(sql);
      if (result.success) {
        // Index created
      } else {
        // Manual execution required
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
