-- Add support for freelancer clients to bookmark opportunities
-- This allows freelancers to bookmark opportunities on behalf of their clients

-- Step 1: Make organization_id nullable
ALTER TABLE public.bookmarked_opportunities
  ALTER COLUMN organization_id DROP NOT NULL;

-- Step 2: Add freelancer_client_id column
ALTER TABLE public.bookmarked_opportunities
  ADD COLUMN IF NOT EXISTS freelancer_client_id uuid references public.freelancer_clients(id) on delete cascade;

-- Step 3: Drop old unique constraint
ALTER TABLE public.bookmarked_opportunities
  DROP CONSTRAINT IF EXISTS bookmarked_opportunities_organization_id_opportunity_id_key;

-- Step 4: Add new unique constraints
-- One bookmark per organization-opportunity pair
ALTER TABLE public.bookmarked_opportunities
  ADD CONSTRAINT unique_org_opportunity
  UNIQUE NULLS NOT DISTINCT (organization_id, opportunity_id);

-- One bookmark per freelancer_client-opportunity pair
ALTER TABLE public.bookmarked_opportunities
  ADD CONSTRAINT unique_freelancer_client_opportunity
  UNIQUE NULLS NOT DISTINCT (freelancer_client_id, opportunity_id);

-- Step 5: Add check constraint to ensure either organization_id or freelancer_client_id is set
ALTER TABLE public.bookmarked_opportunities
  ADD CONSTRAINT check_org_or_client
  CHECK (
    (organization_id IS NOT NULL AND freelancer_client_id IS NULL) OR
    (organization_id IS NULL AND freelancer_client_id IS NOT NULL)
  );

-- Step 6: Create index for freelancer client lookups
CREATE INDEX IF NOT EXISTS idx_bookmarked_opps_freelancer_client
  ON public.bookmarked_opportunities(freelancer_client_id);

-- Step 7: Update RLS policies to support freelancer clients
-- Drop existing policies
DROP POLICY IF EXISTS "Members can read organization bookmarks" ON public.bookmarked_opportunities;
DROP POLICY IF EXISTS "Members can create bookmarks" ON public.bookmarked_opportunities;
DROP POLICY IF EXISTS "Members can delete bookmarks" ON public.bookmarked_opportunities;

-- Create new policies that support both organizations and freelancer clients
CREATE POLICY "Users can read bookmarks for their orgs or clients"
  ON public.bookmarked_opportunities
  FOR SELECT
  USING (
    -- Allow if user is member of the organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.organization_id = bookmarked_opportunities.organization_id
        AND org_members.user_id = auth.uid()
    ))
    OR
    -- Allow if user is the freelancer managing this client
    (freelancer_client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.freelancer_clients
      WHERE freelancer_clients.id = bookmarked_opportunities.freelancer_client_id
        AND freelancer_clients.freelancer_user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create bookmarks for their orgs or clients"
  ON public.bookmarked_opportunities
  FOR INSERT
  WITH CHECK (
    -- Allow if user is member of the organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.organization_id = bookmarked_opportunities.organization_id
        AND org_members.user_id = auth.uid()
    ))
    OR
    -- Allow if user is the freelancer managing this client
    (freelancer_client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.freelancer_clients
      WHERE freelancer_clients.id = bookmarked_opportunities.freelancer_client_id
        AND freelancer_clients.freelancer_user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete bookmarks for their orgs or clients"
  ON public.bookmarked_opportunities
  FOR DELETE
  USING (
    -- Allow if user is member of the organization
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.organization_id = bookmarked_opportunities.organization_id
        AND org_members.user_id = auth.uid()
    ))
    OR
    -- Allow if user is the freelancer managing this client
    (freelancer_client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.freelancer_clients
      WHERE freelancer_clients.id = bookmarked_opportunities.freelancer_client_id
        AND freelancer_clients.freelancer_user_id = auth.uid()
    ))
  );

-- Step 8: Add helpful comment
COMMENT ON COLUMN public.bookmarked_opportunities.freelancer_client_id IS 'ID of freelancer client who bookmarked this opportunity (mutually exclusive with organization_id)';
