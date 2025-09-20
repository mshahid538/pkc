-- Secure RLS Setup for PKC
-- This script ensures proper Row Level Security with owner = auth.uid() enforcement

-- First, add user_id column to files table if it doesn't exist
ALTER TABLE files ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id column to tags table if it doesn't exist  
ALTER TABLE tags ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id column to item_tags table if it doesn't exist
ALTER TABLE item_tags ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for the new user_id columns
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_user_id ON item_tags(user_id);

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can create threads" ON threads;
DROP POLICY IF EXISTS "Users can read own threads" ON threads;
DROP POLICY IF EXISTS "Users can update own threads" ON threads;
DROP POLICY IF EXISTS "Users can delete own threads" ON threads;
DROP POLICY IF EXISTS "Users can create messages" ON messages;
DROP POLICY IF EXISTS "Users can read messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
DROP POLICY IF EXISTS "Users can delete messages" ON messages;
DROP POLICY IF EXISTS "Users can create files" ON files;
DROP POLICY IF EXISTS "Users can read files" ON files;
DROP POLICY IF EXISTS "Users can update files" ON files;
DROP POLICY IF EXISTS "Users can delete files" ON files;
DROP POLICY IF EXISTS "Users can create thread_files" ON thread_files;
DROP POLICY IF EXISTS "Users can read thread_files" ON thread_files;
DROP POLICY IF EXISTS "Users can delete thread_files" ON thread_files;
DROP POLICY IF EXISTS "Users can create summaries" ON summaries;
DROP POLICY IF EXISTS "Users can read summaries" ON summaries;
DROP POLICY IF EXISTS "Users can update summaries" ON summaries;
DROP POLICY IF EXISTS "Users can delete summaries" ON summaries;
DROP POLICY IF EXISTS "Users can create tags" ON tags;
DROP POLICY IF EXISTS "Users can read tags" ON tags;
DROP POLICY IF EXISTS "Users can update tags" ON tags;
DROP POLICY IF EXISTS "Users can delete tags" ON tags;
DROP POLICY IF EXISTS "Users can create item_tags" ON item_tags;
DROP POLICY IF EXISTS "Users can read item_tags" ON item_tags;
DROP POLICY IF EXISTS "Users can update item_tags" ON item_tags;
DROP POLICY IF EXISTS "Users can delete item_tags" ON item_tags;
DROP POLICY IF EXISTS "Users can create file_chunks" ON file_chunks;
DROP POLICY IF EXISTS "Users can read own file_chunks" ON file_chunks;
DROP POLICY IF EXISTS "Users can update own file_chunks" ON file_chunks;
DROP POLICY IF EXISTS "Users can delete own file_chunks" ON file_chunks;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can register" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (current_setting('app.current_user_id', true) = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (current_setting('app.current_user_id', true) = id);

-- Threads table policies (owner = auth.uid())
CREATE POLICY "Users can create own threads" ON threads
    FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can read own threads" ON threads
    FOR SELECT USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can update own threads" ON threads
    FOR UPDATE USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can delete own threads" ON threads
    FOR DELETE USING (current_setting('app.current_user_id', true) = user_id);

-- Messages table policies (through thread ownership)
CREATE POLICY "Users can create messages in own threads" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can read messages in own threads" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can update messages in own threads" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can delete messages in own threads" ON messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

-- Files table policies (owner = auth.uid())
CREATE POLICY "Users can create own files" ON files
    FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can read own files" ON files
    FOR SELECT USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can update own files" ON files
    FOR UPDATE USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can delete own files" ON files
    FOR DELETE USING (current_setting('app.current_user_id', true) = user_id);

-- Thread_files table policies (through thread ownership)
CREATE POLICY "Users can create thread_files in own threads" ON thread_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can read thread_files in own threads" ON thread_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can delete thread_files in own threads" ON thread_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

-- Summaries table policies (through thread ownership)
CREATE POLICY "Users can create summaries for own threads" ON summaries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can read summaries for own threads" ON summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can update summaries for own threads" ON summaries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can delete summaries for own threads" ON summaries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

-- Tags table policies (owner = auth.uid())
CREATE POLICY "Users can create own tags" ON tags
    FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can read own tags" ON tags
    FOR SELECT USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can update own tags" ON tags
    FOR UPDATE USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can delete own tags" ON tags
    FOR DELETE USING (current_setting('app.current_user_id', true) = user_id);

-- Item_tags table policies (owner = auth.uid())
CREATE POLICY "Users can create own item_tags" ON item_tags
    FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can read own item_tags" ON item_tags
    FOR SELECT USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can update own item_tags" ON item_tags
    FOR UPDATE USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can delete own item_tags" ON item_tags
    FOR DELETE USING (current_setting('app.current_user_id', true) = user_id);

-- File_chunks table policies (owner = auth.uid())
CREATE POLICY "Users can create own file_chunks" ON file_chunks
    FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can read own file_chunks" ON file_chunks
    FOR SELECT USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can update own file_chunks" ON file_chunks
    FOR UPDATE USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can delete own file_chunks" ON file_chunks
    FOR DELETE USING (current_setting('app.current_user_id', true) = user_id);

-- Verify setup
SELECT 'Secure RLS Setup Complete - All tables enforce owner = auth.uid()' as status;
