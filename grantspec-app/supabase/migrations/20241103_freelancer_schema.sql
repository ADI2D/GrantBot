-- Freelancer Portal Database Schema
-- This migration creates tables for freelancers to manage clients, documents, and notes

-- ============================================================================
-- 1. FREELANCER CLIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS freelancer_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Client information
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'archived')),

  -- Contact information
  primary_contact_name TEXT,
  primary_contact_email TEXT,

  -- Organization details
  mission TEXT,
  annual_budget BIGINT,
  focus_areas TEXT[] DEFAULT '{}',
  plan_name TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ
);

-- Index for freelancer queries
CREATE INDEX IF NOT EXISTS idx_freelancer_clients_freelancer
  ON freelancer_clients(freelancer_user_id, status);

-- Index for organization lookups
CREATE INDEX IF NOT EXISTS idx_freelancer_clients_org
  ON freelancer_clients(organization_id);

-- ============================================================================
-- 2. FREELANCER DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS freelancer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES freelancer_clients(id) ON DELETE CASCADE,

  -- Document information
  name TEXT NOT NULL,
  file_path TEXT, -- Storage path (if using Supabase Storage)
  file_size BIGINT, -- Size in bytes
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'missing', 'in_review')),

  -- Metadata
  notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for client documents
CREATE INDEX IF NOT EXISTS idx_freelancer_documents_client
  ON freelancer_documents(client_id, status);

-- Index for freelancer queries
CREATE INDEX IF NOT EXISTS idx_freelancer_documents_freelancer
  ON freelancer_documents(freelancer_user_id);

-- ============================================================================
-- 3. FREELANCER NOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS freelancer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES freelancer_clients(id) ON DELETE CASCADE,

  -- Note content
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'meeting', 'todo', 'decision')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for client notes
CREATE INDEX IF NOT EXISTS idx_freelancer_notes_client
  ON freelancer_notes(client_id, created_at DESC);

-- Index for freelancer queries
CREATE INDEX IF NOT EXISTS idx_freelancer_notes_freelancer
  ON freelancer_notes(freelancer_user_id);

-- ============================================================================
-- 4. UPDATE EXISTING FREELANCER_PROPOSALS TABLE (if needed)
-- ============================================================================
-- Ensure client_id references the new freelancer_clients table
DO $$
BEGIN
  -- Check if the constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'freelancer_proposals_client_id_fkey'
    AND table_name = 'freelancer_proposals'
  ) THEN
    -- Add foreign key if freelancer_proposals exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'freelancer_proposals') THEN
      ALTER TABLE freelancer_proposals
        ADD CONSTRAINT freelancer_proposals_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES freelancer_clients(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE freelancer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for freelancer_clients
CREATE POLICY "Freelancers can view their own clients"
  ON freelancer_clients FOR SELECT
  USING (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can insert their own clients"
  ON freelancer_clients FOR INSERT
  WITH CHECK (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can update their own clients"
  ON freelancer_clients FOR UPDATE
  USING (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can delete their own clients"
  ON freelancer_clients FOR DELETE
  USING (auth.uid() = freelancer_user_id);

-- RLS Policies for freelancer_documents
CREATE POLICY "Freelancers can view their own documents"
  ON freelancer_documents FOR SELECT
  USING (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can insert their own documents"
  ON freelancer_documents FOR INSERT
  WITH CHECK (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can update their own documents"
  ON freelancer_documents FOR UPDATE
  USING (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can delete their own documents"
  ON freelancer_documents FOR DELETE
  USING (auth.uid() = freelancer_user_id);

-- RLS Policies for freelancer_notes
CREATE POLICY "Freelancers can view their own notes"
  ON freelancer_notes FOR SELECT
  USING (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can insert their own notes"
  ON freelancer_notes FOR INSERT
  WITH CHECK (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can update their own notes"
  ON freelancer_notes FOR UPDATE
  USING (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can delete their own notes"
  ON freelancer_notes FOR DELETE
  USING (auth.uid() = freelancer_user_id);

-- ============================================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for each table
CREATE TRIGGER update_freelancer_clients_updated_at
  BEFORE UPDATE ON freelancer_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_freelancer_documents_updated_at
  BEFORE UPDATE ON freelancer_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_freelancer_notes_updated_at
  BEFORE UPDATE ON freelancer_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
