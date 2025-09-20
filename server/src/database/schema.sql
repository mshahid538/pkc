CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY, -- Clerk user ID
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS thread_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('thread', 'file', 'message')),
  item_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_type, item_id, tag_id)
);

CREATE TABLE IF NOT EXISTS file_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id_created_at ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_files_checksum_sha256_unique ON files(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_thread_files_thread_id ON thread_files(thread_id);
CREATE INDEX IF NOT EXISTS idx_summaries_thread_id ON summaries(thread_id);
CREATE INDEX IF NOT EXISTS file_chunks_file_id_idx ON file_chunks(file_id);
CREATE INDEX IF NOT EXISTS file_chunks_chunk_index_idx ON file_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS file_chunks_embedding_hnsw_idx ON file_chunks USING hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
DROP POLICY IF EXISTS "Allow user registration" ON users;
CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (current_setting('app.current_user_id', true) = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (current_setting('app.current_user_id', true) = id);

-- RLS Policies for threads table
DROP POLICY IF EXISTS "Users can create threads" ON threads;
CREATE POLICY "Users can create threads" ON threads
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own threads" ON threads;
CREATE POLICY "Users can read own threads" ON threads
    FOR SELECT USING (current_setting('app.current_user_id', true) = user_id);

DROP POLICY IF EXISTS "Users can update own threads" ON threads;
CREATE POLICY "Users can update own threads" ON threads
    FOR UPDATE USING (current_setting('app.current_user_id', true) = user_id);

DROP POLICY IF EXISTS "Users can delete own threads" ON threads;
CREATE POLICY "Users can delete own threads" ON threads
    FOR DELETE USING (current_setting('app.current_user_id', true) = user_id);

-- RLS Policies for messages table
DROP POLICY IF EXISTS "Users can create messages" ON messages;
CREATE POLICY "Users can create messages" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

DROP POLICY IF EXISTS "Users can read messages" ON messages;
CREATE POLICY "Users can read messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

DROP POLICY IF EXISTS "Users can update messages" ON messages;
CREATE POLICY "Users can update messages" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

DROP POLICY IF EXISTS "Users can delete messages" ON messages;
CREATE POLICY "Users can delete messages" ON messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

-- RLS Policies for files table
DROP POLICY IF EXISTS "Users can create files" ON files;
CREATE POLICY "Users can create files" ON files
    FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) = user_id);

DROP POLICY IF EXISTS "Users can read own files" ON files;
CREATE POLICY "Users can read own files" ON files
    FOR SELECT USING (current_setting('app.current_user_id', true) = user_id);

DROP POLICY IF EXISTS "Users can update own files" ON files;
CREATE POLICY "Users can update own files" ON files
    FOR UPDATE USING (current_setting('app.current_user_id', true) = user_id);

DROP POLICY IF EXISTS "Users can delete own files" ON files;
CREATE POLICY "Users can delete own files" ON files
    FOR DELETE USING (current_setting('app.current_user_id', true) = user_id);

-- RLS Policies for thread_files table
DROP POLICY IF EXISTS "Users can create thread_files" ON thread_files;
CREATE POLICY "Users can create thread_files" ON thread_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

DROP POLICY IF EXISTS "Users can read thread_files" ON thread_files;
CREATE POLICY "Users can read thread_files" ON thread_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

DROP POLICY IF EXISTS "Users can delete thread_files" ON thread_files;
CREATE POLICY "Users can delete thread_files" ON thread_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

-- RLS Policies for summaries table
DROP POLICY IF EXISTS "Users can create summaries" ON summaries;
CREATE POLICY "Users can create summaries" ON summaries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

DROP POLICY IF EXISTS "Users can read summaries" ON summaries;
CREATE POLICY "Users can read summaries" ON summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

DROP POLICY IF EXISTS "Users can update summaries" ON summaries;
CREATE POLICY "Users can update summaries" ON summaries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

DROP POLICY IF EXISTS "Users can delete summaries" ON summaries;
CREATE POLICY "Users can delete summaries" ON summaries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

-- RLS Policies for tags table
DROP POLICY IF EXISTS "Users can create tags" ON tags;
CREATE POLICY "Users can create tags" ON tags
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read tags" ON tags;
CREATE POLICY "Users can read tags" ON tags
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update tags" ON tags;
CREATE POLICY "Users can update tags" ON tags
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete tags" ON tags;
CREATE POLICY "Users can delete tags" ON tags
    FOR DELETE USING (true);

-- RLS Policies for item_tags table
DROP POLICY IF EXISTS "Users can create item_tags" ON item_tags;
CREATE POLICY "Users can create item_tags" ON item_tags
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read item_tags" ON item_tags;
CREATE POLICY "Users can read item_tags" ON item_tags
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update item_tags" ON item_tags;
CREATE POLICY "Users can update item_tags" ON item_tags
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete item_tags" ON item_tags;
CREATE POLICY "Users can delete item_tags" ON item_tags
    FOR DELETE USING (true);

-- RLS Policies for file_chunks table
DROP POLICY IF EXISTS "Users can create file_chunks" ON file_chunks;
CREATE POLICY "Users can create file_chunks" ON file_chunks
    FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) = user_id);

DROP POLICY IF EXISTS "Users can read own file_chunks" ON file_chunks;
CREATE POLICY "Users can read own file_chunks" ON file_chunks
    FOR SELECT USING (current_setting('app.current_user_id', true) = user_id);

DROP POLICY IF EXISTS "Users can update own file_chunks" ON file_chunks;
CREATE POLICY "Users can update own file_chunks" ON file_chunks
    FOR UPDATE USING (current_setting('app.current_user_id', true) = user_id);

DROP POLICY IF EXISTS "Users can delete own file_chunks" ON file_chunks;
CREATE POLICY "Users can delete own file_chunks" ON file_chunks
    FOR DELETE USING (current_setting('app.current_user_id', true) = user_id);

-- Vector similarity search function for semantic search
CREATE OR REPLACE FUNCTION match_file_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id text
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    file_chunks.id,
    file_chunks.chunk_text,
    1 - (file_chunks.embedding <=> query_embedding) AS similarity
  FROM file_chunks
  WHERE file_chunks.user_id = match_file_chunks.user_id
    AND 1 - (file_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY file_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to set user context for RLS policies
DROP FUNCTION IF EXISTS set_user_context(text);
DROP FUNCTION IF EXISTS set_user_context(character varying);
CREATE OR REPLACE FUNCTION set_user_context(user_id_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id_param, true);
END;
$$;