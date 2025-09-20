CREATE OR REPLACE FUNCTION set_user_context(user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF user_id IS NULL THEN
    PERFORM set_config('app.current_user_id', NULL, false);
  ELSE
    PERFORM set_config('app.current_user_id', user_id::text, false);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION set_user_context(UUID) TO anon;
GRANT EXECUTE ON FUNCTION set_user_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO anon;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;

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


CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (current_setting('app.current_user_id', true) = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (current_setting('app.current_user_id', true) = id);

-- Threads table policies
CREATE POLICY "Users can create threads" ON threads
    FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can read own threads" ON threads
    FOR SELECT USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can update own threads" ON threads
    FOR UPDATE USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can delete own threads" ON threads
    FOR DELETE USING (current_setting('app.current_user_id', true) = user_id);

-- Messages table policies
CREATE POLICY "Users can create messages" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can read messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can update messages" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can delete messages" ON messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

-- Files table policies (public access)
CREATE POLICY "Users can create files" ON files
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read files" ON files
    FOR SELECT USING (true);

CREATE POLICY "Users can update files" ON files
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete files" ON files
    FOR DELETE USING (true);

-- Thread_files table policies
CREATE POLICY "Users can create thread_files" ON thread_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can read thread_files" ON thread_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can delete thread_files" ON thread_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = thread_files.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

-- Summaries table policies
CREATE POLICY "Users can create summaries" ON summaries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can read summaries" ON summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can update summaries" ON summaries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can delete summaries" ON summaries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = summaries.thread_id 
            AND threads.user_id = current_setting('app.current_user_id', true)
        )
    );

-- Tags table policies (public access)
CREATE POLICY "Users can create tags" ON tags
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read tags" ON tags
    FOR SELECT USING (true);

CREATE POLICY "Users can update tags" ON tags
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete tags" ON tags
    FOR DELETE USING (true);

-- Item_tags table policies (public access)
CREATE POLICY "Users can create item_tags" ON item_tags
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read item_tags" ON item_tags
    FOR SELECT USING (true);

CREATE POLICY "Users can update item_tags" ON item_tags
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete item_tags" ON item_tags
    FOR DELETE USING (true);

-- File_chunks table policies
CREATE POLICY "Users can create file_chunks" ON file_chunks
    FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can read own file_chunks" ON file_chunks
    FOR SELECT USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can update own file_chunks" ON file_chunks
    FOR UPDATE USING (current_setting('app.current_user_id', true) = user_id);

CREATE POLICY "Users can delete own file_chunks" ON file_chunks
    FOR DELETE USING (current_setting('app.current_user_id', true) = user_id);

-- Step 5: Verify setup
SELECT 'RLS Setup Complete' as status;
