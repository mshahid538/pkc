-- Expanded Metadata Migration
CREATE TABLE IF NOT EXISTS metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  entities JSONB DEFAULT '{}'::jsonb,
  tag VARCHAR(50) CHECK (tag IN (
    'work', 'personal', 'task', 'deal', 'idea', 'finance', 'health', 
    'meeting', 'project', 'research', 'legal', 'contract', 'invoice',
    'report', 'presentation', 'notes', 'documentation', 'education',
    'travel', 'reference'
  )),
  relationships JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_metadata_file_id ON metadata(file_id);
CREATE INDEX IF NOT EXISTS idx_metadata_user_id ON metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_metadata_tag ON metadata(tag);
CREATE INDEX IF NOT EXISTS idx_metadata_entities_gin ON metadata USING gin(entities);
CREATE INDEX IF NOT EXISTS idx_metadata_relationships_gin ON metadata USING gin(relationships);

-- Enable RLS for metadata table
ALTER TABLE metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can create metadata" ON metadata;
CREATE POLICY "Users can create metadata" ON metadata
    FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) = user_id);

DROP POLICY IF EXISTS "Users can read own metadata" ON metadata;
CREATE POLICY "Users can read own metadata" ON metadata
    FOR SELECT USING (current_setting('app.current_user_id', true) = user_id);

DROP POLICY IF EXISTS "Users can update own metadata" ON metadata;
CREATE POLICY "Users can update own metadata" ON metadata
    FOR UPDATE USING (current_setting('app.current_user_id', true) = user_id);

DROP POLICY IF EXISTS "Users can delete own metadata" ON metadata;
CREATE POLICY "Users can delete own metadata" ON metadata
    FOR DELETE USING (current_setting('app.current_user_id', true) = user_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger
DROP TRIGGER IF EXISTS update_metadata_updated_at_trigger ON metadata;
CREATE TRIGGER update_metadata_updated_at_trigger
  BEFORE UPDATE ON metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_metadata_updated_at();

-- Metadata view
CREATE OR REPLACE VIEW file_metadata_view AS
SELECT 
  f.id as file_id,
  f.filename,
  f.file_type,
  f.created_at as file_created_at,
  f.user_id,
  COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', m.id,
        'entities', m.entities,
        'tag', m.tag,
        'relationships', m.relationships,
        'created_at', m.created_at,
        'updated_at', m.updated_at
      )
    ) FILTER (WHERE m.id IS NOT NULL), 
    '[]'::json
  ) as metadata
FROM files f
LEFT JOIN metadata m ON f.id = m.file_id
GROUP BY f.id, f.filename, f.file_type, f.created_at, f.user_id;
