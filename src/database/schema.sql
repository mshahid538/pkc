CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  short_summary TEXT,
  long_summary TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(thread_id)
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS item_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type VARCHAR(20) NOT NULL, -- e.g., 'file', 'thread', 'message'
  item_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE
);

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

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id_created_at ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_files_checksum_sha256_unique ON files(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_thread_files_thread_id ON thread_files(thread_id);
CREATE INDEX IF NOT EXISTS idx_summaries_thread_id ON summaries(thread_id);
CREATE INDEX IF NOT EXISTS file_chunks_file_id_idx ON file_chunks(file_id);
CREATE INDEX IF NOT EXISTS file_chunks_chunk_index_idx ON file_chunks(chunk_index);

INSERT INTO storage.buckets (id, name, public)
VALUES ('pkc-uploads', 'pkc-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) on all user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (true);


CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);


CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can create threads" ON threads
    FOR INSERT WITH CHECK (true);


CREATE POLICY "Users can read own threads" ON threads
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own threads" ON threads
    FOR UPDATE USING (auth.uid()::text = user_id::text);


CREATE POLICY "Users can delete own threads" ON threads
    FOR DELETE USING (auth.uid()::text = user_id::text);


CREATE POLICY "Users can create messages" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id::text = auth.uid()::text
        )
    );

-- Allow users to read messages in their threads
CREATE POLICY "Users can read messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id::text = auth.uid()::text
        )
    );

-- Allow users to update messages in their threads
CREATE POLICY "Users can update messages" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id::text = auth.uid()::text
        )
    );

-- Allow users to delete messages in their threads
CREATE POLICY "Users can delete messages" ON messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id::text = auth.uid()::text
        )
    );

-- RLS Policies for files table
-- Allow users to create files
CREATE POLICY "Users can create files" ON files
    FOR INSERT WITH CHECK (true);

-- Allow users to read files
CREATE POLICY "Users can read files" ON files
    FOR SELECT USING (true);

-- Allow users to update files
CREATE POLICY "Users can update files" ON files
    FOR UPDATE USING (true);

-- Allow users to delete files
CREATE POLICY "Users can delete files" ON files
    FOR DELETE USING (true);

-- RLS Policies for thread_files table
-- Allow users to create thread_file associations
CREATE POLICY "Users can create thread_files" ON thread_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id::text = auth.uid()::text
        )
    );

-- Allow users to read thread_file associations
CREATE POLICY "Users can read thread_files" ON thread_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id::text = auth.uid()::text
        )
    );

-- Allow users to delete thread_file associations
CREATE POLICY "Users can delete thread_files" ON thread_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id::text = auth.uid()::text
        )
    );

-- RLS Policies for summaries table
-- Allow users to create summaries for their threads
CREATE POLICY "Users can create summaries" ON summaries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id::text = auth.uid()::text
        )
    );

-- Allow users to read summaries for their threads
CREATE POLICY "Users can read summaries" ON summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id::text = auth.uid()::text
        )
    );

-- Allow users to update summaries for their threads
CREATE POLICY "Users can update summaries" ON summaries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id::text = auth.uid()::text
        )
    );

-- Allow users to delete summaries for their threads
CREATE POLICY "Users can delete summaries" ON summaries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id::text = auth.uid()::text
        )
    );

-- RLS Policies for tags table
-- Allow users to create tags
CREATE POLICY "Users can create tags" ON tags
    FOR INSERT WITH CHECK (true);

-- Allow users to read tags
CREATE POLICY "Users can read tags" ON tags
    FOR SELECT USING (true);

-- Allow users to update tags
CREATE POLICY "Users can update tags" ON tags
    FOR UPDATE USING (true);

-- Allow users to delete tags
CREATE POLICY "Users can delete tags" ON tags
    FOR DELETE USING (true);

-- RLS Policies for item_tags table
-- Allow users to create item_tags
CREATE POLICY "Users can create item_tags" ON item_tags
    FOR INSERT WITH CHECK (true);

-- Allow users to read item_tags
CREATE POLICY "Users can read item_tags" ON item_tags
    FOR SELECT USING (true);

-- Allow users to update item_tags
CREATE POLICY "Users can update item_tags" ON item_tags
    FOR UPDATE USING (true);

-- Allow users to delete item_tags
CREATE POLICY "Users can delete item_tags" ON item_tags
    FOR DELETE USING (true);

-- RLS Policies for file_chunks table
-- Allow users to create file_chunks
CREATE POLICY "Users can create file_chunks" ON file_chunks
    FOR INSERT WITH CHECK (true);

-- Allow users to read their own file_chunks
CREATE POLICY "Users can read own file_chunks" ON file_chunks
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Allow users to update their own file_chunks
CREATE POLICY "Users can update own file_chunks" ON file_chunks
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Allow users to delete their own file_chunks
CREATE POLICY "Users can delete own file_chunks" ON file_chunks
    FOR DELETE USING (auth.uid()::text = user_id::text);

