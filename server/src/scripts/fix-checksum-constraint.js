const { supabaseAdmin } = require("../config/database");

async function fixChecksumConstraint() {
  try {
    console.log("🔧 Fixing checksum constraint to be user-specific...");

    // Drop the existing unique constraint
    const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE files DROP CONSTRAINT IF EXISTS files_checksum_sha256_key;'
    });

    if (dropError) {
      console.error("Error dropping constraint:", dropError);
      return;
    }

    // Create a new unique constraint that includes user_id
    const { error: addError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE files ADD CONSTRAINT files_checksum_user_unique UNIQUE(checksum_sha256, user_id);'
    });

    if (addError) {
      console.error("Error adding new constraint:", addError);
      return;
    }

    // Drop the old index
    const { error: dropIndexError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'DROP INDEX IF EXISTS idx_files_checksum_sha256_unique;'
    });

    if (dropIndexError) {
      console.error("Error dropping index:", dropIndexError);
    }

    // Create a new index
    const { error: addIndexError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_files_checksum_user ON files(checksum_sha256, user_id);'
    });

    if (addIndexError) {
      console.error("Error adding new index:", addIndexError);
    }

    console.log("✅ Successfully updated checksum constraint to be user-specific");
    console.log("📝 Files can now have the same checksum across different users");

  } catch (error) {
    console.error("❌ Error fixing checksum constraint:", error);
  }
}

// Run the fix
fixChecksumConstraint().then(() => {
  console.log("🏁 Migration completed");
  process.exit(0);
}).catch((error) => {
  console.error("💥 Migration failed:", error);
  process.exit(1);
});
