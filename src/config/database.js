const { createClient } = require("@supabase/supabase-js");
const pdfParse = require("pdf-parse");

const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
});

const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    })
  : null;

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    return false;
  }
}

async function initializeDatabase() {
  try {
    console.log("Initializing database tables...");

    const { error: usersError } = await supabaseAdmin.rpc("create_users_table");
    if (usersError && !usersError.message.includes("already exists")) {
      console.error("Error creating users table:", usersError);
    }

    const { error: conversationsError } = await supabaseAdmin.rpc(
      "create_conversations_table"
    );
    if (
      conversationsError &&
      !conversationsError.message.includes("already exists")
    ) {
      console.error("Error creating conversations table:", conversationsError);
    }

    const { error: messagesError } = await supabaseAdmin.rpc(
      "create_messages_table"
    );
    if (messagesError && !messagesError.message.includes("already exists")) {
      console.error("Error creating messages table:", messagesError);
    }

    const { error: filesError } = await supabaseAdmin.rpc("create_files_table");
    if (filesError && !filesError.message.includes("already exists")) {
      console.error("Error creating files table:", filesError);
    }

    console.log("Database tables initialized");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}

async function parseFile(fileBuffer, fileExtension) {
  let textContent = "";

  if (fileExtension === ".pdf") {
    try {
      const data = await pdfParse(fileBuffer);
      textContent = data.text;
    } catch (err) {
      textContent = "";
    }
  }

  return textContent;
}
async function setUserContext(userId) {
  try {
    if (!userId) {

      await supabase.rpc('set_user_context', { user_id: null });
      return;
    }
    
    const { error } = await supabase.rpc('set_user_context', { user_id: userId });
    if (error) {
      console.error('Error setting user context:', error);
    }
  } catch (error) {
    console.error('Error setting user context:', error);
  }
}

function createUserClient(userId) {
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  });

  if (userId) {
    setUserContext(userId);
  }

  return userSupabase;
}

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  initializeDatabase,
  parseFile,
  setUserContext,
  createUserClient,
};
