-- Migration: Unify document management to support both nonprofit and freelancer contexts
-- Created: 2025-12-26
-- Part of: Phase 1 - Foundation & Shared Infrastructure

-- Step 1: Add context awareness to organizations table
-- This allows the same table to store both nonprofit orgs and freelancer clients
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS parent_type TEXT DEFAULT 'nonprofit'
    CHECK (parent_type IN ('nonprofit', 'client'));

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS freelancer_user_id UUID REFERENCES auth.users(id);

-- Step 2: Create index for freelancer client queries
CREATE INDEX IF NOT EXISTS idx_organizations_parent_type
  ON organizations(parent_type);

CREATE INDEX IF NOT EXISTS idx_organizations_freelancer
  ON organizations(freelancer_user_id)
  WHERE parent_type = 'client';

-- Step 3: Migrate freelancer_clients to organizations
-- Only migrate if the record doesn't already exist
INSERT INTO organizations (
  id,
  name,
  mission,
  annual_budget,
  created_at,
  parent_type,
  freelancer_user_id,
  focus_areas
)
SELECT
  fc.id,
  fc.name,
  fc.mission,
  fc.annual_budget,
  fc.created_at,
  'client',
  fc.freelancer_user_id,
  fc.focus_areas
FROM freelancer_clients fc
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.id = fc.id
);

-- Step 4: Update additional fields from freelancer_clients if they exist
-- Add any additional columns that exist in freelancer_clients
DO $$
BEGIN
  -- Check if primary_contact_name exists in freelancer_clients
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'freelancer_clients'
      AND column_name = 'primary_contact_name'
  ) THEN
    -- Ensure organizations has these columns
    ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS primary_contact_name TEXT;
    ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS primary_contact_email TEXT;
    ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'on_hold', 'archived'));
    ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

    -- Update from freelancer_clients
    UPDATE organizations o
    SET
      primary_contact_name = fc.primary_contact_name,
      primary_contact_email = fc.primary_contact_email,
      status = fc.status,
      last_activity_at = fc.last_activity_at
    FROM freelancer_clients fc
    WHERE o.id = fc.id
      AND o.parent_type = 'client';
  END IF;
END $$;

-- Step 5: Update RLS policies for organizations to include freelancer clients

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Organizations are viewable by members" ON organizations;
DROP POLICY IF EXISTS "Organizations are viewable by members or freelancer owner" ON organizations;

-- Create new context-aware read policy
CREATE POLICY "organizations_select_policy" ON organizations
  FOR SELECT USING (
    CASE
      WHEN parent_type = 'nonprofit' OR parent_type IS NULL THEN
        -- Nonprofit context: check org membership
        EXISTS (
          SELECT 1 FROM org_members m
          WHERE m.organization_id = organizations.id
            AND m.user_id = auth.uid()
        )
      WHEN parent_type = 'client' THEN
        -- Freelancer context: check ownership
        freelancer_user_id = auth.uid()
      ELSE FALSE
    END
  );

-- Create context-aware insert policy
CREATE POLICY "organizations_insert_policy" ON organizations
  FOR INSERT WITH CHECK (
    CASE
      WHEN parent_type = 'nonprofit' OR parent_type IS NULL THEN
        -- Anyone can create a nonprofit org (handled by app logic)
        TRUE
      WHEN parent_type = 'client' THEN
        -- Only the freelancer can create their own clients
        freelancer_user_id = auth.uid()
      ELSE FALSE
    END
  );

-- Create context-aware update policy
CREATE POLICY "organizations_update_policy" ON organizations
  FOR UPDATE USING (
    CASE
      WHEN parent_type = 'nonprofit' OR parent_type IS NULL THEN
        -- Org members can update their nonprofit
        EXISTS (
          SELECT 1 FROM org_members m
          WHERE m.organization_id = organizations.id
            AND m.user_id = auth.uid()
        )
      WHEN parent_type = 'client' THEN
        -- Freelancer can update their own clients
        freelancer_user_id = auth.uid()
      ELSE FALSE
    END
  );

-- Create context-aware delete policy
CREATE POLICY "organizations_delete_policy" ON organizations
  FOR DELETE USING (
    CASE
      WHEN parent_type = 'nonprofit' OR parent_type IS NULL THEN
        -- Only org owners can delete
        EXISTS (
          SELECT 1 FROM org_members m
          WHERE m.organization_id = organizations.id
            AND m.user_id = auth.uid()
            AND m.role = 'owner'
        )
      WHEN parent_type = 'client' THEN
        -- Freelancer can delete their own clients
        freelancer_user_id = auth.uid()
      ELSE FALSE
    END
  );

-- Step 6: Update document_metadata table policies (if needed)
-- Documents are already using JSONB metadata, no schema change needed
-- Just ensure RLS policies work with the unified organizations table

-- The existing document policies should work as-is since they reference organizations.id
-- and the RLS on organizations will handle access control

-- Step 7: Add helpful comments
COMMENT ON COLUMN organizations.parent_type IS 'Type of organization: nonprofit (standard org) or client (freelancer client)';
COMMENT ON COLUMN organizations.freelancer_user_id IS 'User ID of the freelancer who owns this client (only for client type)';

-- Migration complete
-- Note: freelancer_clients table is kept for backward compatibility (read-only)
-- It will be deprecated after 30 days and removed after 90 days
