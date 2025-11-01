-- ============================================================================
-- FIX ORGANIZATION UPDATE POLICY
-- ============================================================================
-- Adds missing UPDATE policy for organizations table so members can update
-- organization data including document_metadata
-- ============================================================================

-- Add policy to allow members to update their organization
create policy "members can update org"
  on public.organizations for update
  using (exists (
    select 1 from public.org_members m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.org_members m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
  ));
