-- ============================================================================
-- FIX OPPORTUNITIES RLS POLICY
-- ============================================================================
-- Allow authenticated users to read public opportunities (organization_id IS NULL)
-- These are opportunities synced from external sources that aren't tied to a specific org
-- ============================================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "members read opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "members manage opportunities" ON public.opportunities;

-- Create separate policies for read and write operations

-- 1. Allow members to read their org's opportunities OR public opportunities
CREATE POLICY "members read org and public opportunities"
  ON public.opportunities FOR SELECT
  USING (
    -- Public opportunities (synced from external sources)
    organization_id IS NULL
    OR
    -- Org-specific opportunities
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = opportunities.organization_id
        AND m.user_id = auth.uid()
    )
  );

-- 2. Allow members to manage only their org's opportunities (not public ones)
CREATE POLICY "members manage org opportunities"
  ON public.opportunities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = opportunities.organization_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "members update org opportunities"
  ON public.opportunities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = opportunities.organization_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "members delete org opportunities"
  ON public.opportunities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.organization_id = opportunities.organization_id
        AND m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify policies are correct:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'opportunities'
-- ORDER BY policyname;
