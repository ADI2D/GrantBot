-- Migration: Unify proposals table to support both nonprofit and freelancer contexts
-- Created: 2025-12-26
-- Part of: Phase 1 - Foundation & Shared Infrastructure

-- Step 1: Add context fields to existing proposals table
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS context_type TEXT DEFAULT 'organization'
    CHECK (context_type IN ('organization', 'freelancer'));

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS context_id TEXT;

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS freelancer_user_id UUID REFERENCES auth.users(id);

-- Step 2: Create index for freelancer queries
CREATE INDEX IF NOT EXISTS idx_proposals_context
  ON proposals(context_type, context_id);

CREATE INDEX IF NOT EXISTS idx_proposals_freelancer
  ON proposals(freelancer_user_id, context_id)
  WHERE context_type = 'freelancer';

-- Step 3: Create unified proposal_drafts table for HTML content
CREATE TABLE IF NOT EXISTS proposal_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  draft_html TEXT,
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for draft lookups
CREATE INDEX IF NOT EXISTS idx_proposal_drafts_proposal_id
  ON proposal_drafts(proposal_id);

-- Enable RLS on proposal_drafts
ALTER TABLE proposal_drafts ENABLE ROW LEVEL SECURITY;

-- Step 4: Migrate data from freelancer_proposals to proposals
-- Only migrate if the record doesn't already exist
INSERT INTO proposals (
  id,
  organization_id,
  opportunity_id,
  owner_name,
  status,
  progress,
  due_date,
  checklist_status,
  compliance_summary,
  created_at,
  updated_at,
  context_type,
  context_id,
  freelancer_user_id
)
SELECT
  fp.id,
  NULL, -- organization_id (null for freelancer proposals)
  NULL, -- opportunity_id (to be linked later if needed)
  fp.owner_name,
  fp.status,
  0, -- progress (calculate from checklist if needed)
  fp.due_date,
  'in_progress', -- default checklist_status
  fp.checklist, -- store checklist in compliance_summary temporarily
  fp.created_at,
  fp.updated_at,
  'freelancer',
  fp.client_id,
  fp.freelancer_user_id
FROM freelancer_proposals fp
WHERE NOT EXISTS (
  SELECT 1 FROM proposals p WHERE p.id = fp.id
);

-- Step 5: Migrate draft content from freelancer_proposals to proposal_drafts
INSERT INTO proposal_drafts (proposal_id, draft_html, last_edited_at, created_at, updated_at)
SELECT
  fp.id,
  fp.draft_html,
  fp.last_edited_at,
  fp.created_at,
  fp.updated_at
FROM freelancer_proposals fp
WHERE fp.draft_html IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM proposal_drafts pd WHERE pd.proposal_id = fp.id
  );

-- Step 6: Update RLS policies for unified table

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Context-aware proposal access" ON proposals;
DROP POLICY IF EXISTS "Proposals are viewable by organization members" ON proposals;

-- Create new context-aware read policy
CREATE POLICY "proposals_select_policy" ON proposals
  FOR SELECT USING (
    CASE
      WHEN context_type = 'organization' OR context_type IS NULL THEN
        -- Nonprofit context: check org membership
        EXISTS (
          SELECT 1 FROM org_members m
          WHERE m.organization_id = proposals.organization_id
            AND m.user_id = auth.uid()
        )
      WHEN context_type = 'freelancer' THEN
        -- Freelancer context: check ownership
        freelancer_user_id = auth.uid()
      ELSE FALSE
    END
  );

-- Create context-aware insert policy
CREATE POLICY "proposals_insert_policy" ON proposals
  FOR INSERT WITH CHECK (
    CASE
      WHEN context_type = 'organization' OR context_type IS NULL THEN
        EXISTS (
          SELECT 1 FROM org_members m
          WHERE m.organization_id = proposals.organization_id
            AND m.user_id = auth.uid()
        )
      WHEN context_type = 'freelancer' THEN
        freelancer_user_id = auth.uid()
      ELSE FALSE
    END
  );

-- Create context-aware update policy
CREATE POLICY "proposals_update_policy" ON proposals
  FOR UPDATE USING (
    CASE
      WHEN context_type = 'organization' OR context_type IS NULL THEN
        EXISTS (
          SELECT 1 FROM org_members m
          WHERE m.organization_id = proposals.organization_id
            AND m.user_id = auth.uid()
        )
      WHEN context_type = 'freelancer' THEN
        freelancer_user_id = auth.uid()
      ELSE FALSE
    END
  );

-- Create context-aware delete policy
CREATE POLICY "proposals_delete_policy" ON proposals
  FOR DELETE USING (
    CASE
      WHEN context_type = 'organization' OR context_type IS NULL THEN
        EXISTS (
          SELECT 1 FROM org_members m
          WHERE m.organization_id = proposals.organization_id
            AND m.user_id = auth.uid()
            AND m.role = 'owner' -- Only owners can delete
        )
      WHEN context_type = 'freelancer' THEN
        freelancer_user_id = auth.uid()
      ELSE FALSE
    END
  );

-- Step 7: RLS policies for proposal_drafts

-- Users can access proposal drafts if they can access the proposal
CREATE POLICY "proposal_drafts_select_policy" ON proposal_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_drafts.proposal_id
        AND (
          (p.context_type = 'organization' AND EXISTS (
            SELECT 1 FROM org_members m
            WHERE m.organization_id = p.organization_id
              AND m.user_id = auth.uid()
          ))
          OR
          (p.context_type = 'freelancer' AND p.freelancer_user_id = auth.uid())
        )
    )
  );

-- Users can insert drafts if they can access the proposal
CREATE POLICY "proposal_drafts_insert_policy" ON proposal_drafts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_drafts.proposal_id
        AND (
          (p.context_type = 'organization' AND EXISTS (
            SELECT 1 FROM org_members m
            WHERE m.organization_id = p.organization_id
              AND m.user_id = auth.uid()
          ))
          OR
          (p.context_type = 'freelancer' AND p.freelancer_user_id = auth.uid())
        )
    )
  );

-- Users can update drafts if they can access the proposal
CREATE POLICY "proposal_drafts_update_policy" ON proposal_drafts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_drafts.proposal_id
        AND (
          (p.context_type = 'organization' AND EXISTS (
            SELECT 1 FROM org_members m
            WHERE m.organization_id = p.organization_id
              AND m.user_id = auth.uid()
          ))
          OR
          (p.context_type = 'freelancer' AND p.freelancer_user_id = auth.uid())
        )
    )
  );

-- Users can delete drafts if they can delete the proposal
CREATE POLICY "proposal_drafts_delete_policy" ON proposal_drafts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_drafts.proposal_id
        AND (
          (p.context_type = 'organization' AND EXISTS (
            SELECT 1 FROM org_members m
            WHERE m.organization_id = p.organization_id
              AND m.user_id = auth.uid()
              AND m.role = 'owner'
          ))
          OR
          (p.context_type = 'freelancer' AND p.freelancer_user_id = auth.uid())
        )
    )
  );

-- Step 8: Add helpful comments
COMMENT ON COLUMN proposals.context_type IS 'Type of context: organization (nonprofit) or freelancer (client-based)';
COMMENT ON COLUMN proposals.context_id IS 'ID of the context entity (organization_id or client_id)';
COMMENT ON COLUMN proposals.freelancer_user_id IS 'User ID of the freelancer (only for freelancer context)';
COMMENT ON TABLE proposal_drafts IS 'Stores draft HTML content for proposals (extracted from main table for better performance)';

-- Migration complete
-- Note: freelancer_proposals table is kept for backward compatibility (read-only)
-- It will be deprecated after 30 days and removed after 90 days
