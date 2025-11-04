-- ============================================================================
-- FREELANCER PORTAL DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. CREATE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS freelancer_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'archived')),
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  mission TEXT,
  annual_budget BIGINT,
  focus_areas TEXT[] DEFAULT '{}',
  plan_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS freelancer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES freelancer_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'missing', 'in_review')),
  notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS freelancer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES freelancer_clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'meeting', 'todo', 'decision')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_freelancer_clients_freelancer
  ON freelancer_clients(freelancer_user_id, status);

CREATE INDEX IF NOT EXISTS idx_freelancer_clients_org
  ON freelancer_clients(organization_id);

CREATE INDEX IF NOT EXISTS idx_freelancer_documents_client
  ON freelancer_documents(client_id, status);

CREATE INDEX IF NOT EXISTS idx_freelancer_documents_freelancer
  ON freelancer_documents(freelancer_user_id);

CREATE INDEX IF NOT EXISTS idx_freelancer_notes_client
  ON freelancer_notes(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_freelancer_notes_freelancer
  ON freelancer_notes(freelancer_user_id);

-- 3. ENABLE RLS
-- ============================================================================

ALTER TABLE freelancer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_notes ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR freelancer_clients
-- ============================================================================

DROP POLICY IF EXISTS "Freelancers can view their own clients" ON freelancer_clients;
CREATE POLICY "Freelancers can view their own clients"
  ON freelancer_clients FOR SELECT
  USING (auth.uid() = freelancer_user_id);

DROP POLICY IF EXISTS "Freelancers can insert their own clients" ON freelancer_clients;
CREATE POLICY "Freelancers can insert their own clients"
  ON freelancer_clients FOR INSERT
  WITH CHECK (auth.uid() = freelancer_user_id);

DROP POLICY IF EXISTS "Freelancers can update their own clients" ON freelancer_clients;
CREATE POLICY "Freelancers can update their own clients"
  ON freelancer_clients FOR UPDATE
  USING (auth.uid() = freelancer_user_id);

DROP POLICY IF EXISTS "Freelancers can delete their own clients" ON freelancer_clients;
CREATE POLICY "Freelancers can delete their own clients"
  ON freelancer_clients FOR DELETE
  USING (auth.uid() = freelancer_user_id);

-- 5. RLS POLICIES FOR freelancer_documents
-- ============================================================================

DROP POLICY IF EXISTS "Freelancers can view their own documents" ON freelancer_documents;
CREATE POLICY "Freelancers can view their own documents"
  ON freelancer_documents FOR SELECT
  USING (auth.uid() = freelancer_user_id);

DROP POLICY IF EXISTS "Freelancers can insert their own documents" ON freelancer_documents;
CREATE POLICY "Freelancers can insert their own documents"
  ON freelancer_documents FOR INSERT
  WITH CHECK (auth.uid() = freelancer_user_id);

DROP POLICY IF EXISTS "Freelancers can update their own documents" ON freelancer_documents;
CREATE POLICY "Freelancers can update their own documents"
  ON freelancer_documents FOR UPDATE
  USING (auth.uid() = freelancer_user_id);

DROP POLICY IF EXISTS "Freelancers can delete their own documents" ON freelancer_documents;
CREATE POLICY "Freelancers can delete their own documents"
  ON freelancer_documents FOR DELETE
  USING (auth.uid() = freelancer_user_id);

-- 6. RLS POLICIES FOR freelancer_notes
-- ============================================================================

DROP POLICY IF EXISTS "Freelancers can view their own notes" ON freelancer_notes;
CREATE POLICY "Freelancers can view their own notes"
  ON freelancer_notes FOR SELECT
  USING (auth.uid() = freelancer_user_id);

DROP POLICY IF EXISTS "Freelancers can insert their own notes" ON freelancer_notes;
CREATE POLICY "Freelancers can insert their own notes"
  ON freelancer_notes FOR INSERT
  WITH CHECK (auth.uid() = freelancer_user_id);

DROP POLICY IF EXISTS "Freelancers can update their own notes" ON freelancer_notes;
CREATE POLICY "Freelancers can update their own notes"
  ON freelancer_notes FOR UPDATE
  USING (auth.uid() = freelancer_user_id);

DROP POLICY IF EXISTS "Freelancers can delete their own notes" ON freelancer_notes;
CREATE POLICY "Freelancers can delete their own notes"
  ON freelancer_notes FOR DELETE
  USING (auth.uid() = freelancer_user_id);

-- 7. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_freelancer_clients_updated_at ON freelancer_clients;
CREATE TRIGGER update_freelancer_clients_updated_at
  BEFORE UPDATE ON freelancer_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_freelancer_documents_updated_at ON freelancer_documents;
CREATE TRIGGER update_freelancer_documents_updated_at
  BEFORE UPDATE ON freelancer_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_freelancer_notes_updated_at ON freelancer_notes;
CREATE TRIGGER update_freelancer_notes_updated_at
  BEFORE UPDATE ON freelancer_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
