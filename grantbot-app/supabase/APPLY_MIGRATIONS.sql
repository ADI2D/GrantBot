-- ============================================================================
-- GRANTBOT COMPLETE SCHEMA - Apply All Migrations
-- ============================================================================
-- Run this file in Supabase SQL Editor to create all tables and policies
-- Instructions:
--   1. Open your Supabase project SQL Editor
--   2. Copy and paste this entire file
--   3. Click "Run"
-- ============================================================================
--
-- NOTE: This file is auto-generated from individual migration files.
-- To regenerate: npx tsx scripts/regenerate-apply-migrations.ts
-- Last generated: 2025-11-02 03:33:22 UTC
-- ============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ============================================================================
-- 1. INITIAL (20241024_initial.sql)
-- ============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mission text,
  impact_summary text,
  differentiator text,
  annual_budget numeric,
  onboarding_completion numeric default 0,
  document_metadata jsonb default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Organization members
create table if not exists public.org_members (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  unique(organization_id, user_id)
);

-- Opportunities curated/imported per org
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  focus_area text,
  amount numeric,
  deadline date,
  alignment_score numeric,
  status text default 'recommended',
  compliance_notes text,
  created_at timestamptz default now()
);

-- Proposals tracked inside workspace
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  owner_name text,
  status text default 'drafting',
  progress integer default 0,
  due_date date,
  checklist_status text default 'in_progress',
  confidence numeric,
  autosave_enabled boolean default true,
  compliance_summary jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Proposal sections for the AI workspace
create table if not exists public.proposal_sections (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals(id) on delete cascade,
  title text not null,
  token_count integer default 0,
  content text,
  updated_at timestamptz default now()
);

-- Outcomes + learnings per submission
create table if not exists public.outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete set null,
  status text check (status in ('submitted','funded','lost')),
  award_amount numeric default 0,
  learning_insight text,
  recorded_at timestamptz default now()
);

-- Basic indexes
create index if not exists idx_opportunities_org on public.opportunities(organization_id);
create index if not exists idx_proposals_org on public.proposals(organization_id);
create index if not exists idx_outcomes_org on public.outcomes(organization_id);
create index if not exists idx_proposal_sections_proposal on public.proposal_sections(proposal_id);

-- Enable RLS
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.opportunities enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_sections enable row level security;
alter table public.outcomes enable row level security;

-- Policies
create policy "members can read org"
  on public.organizations for select
  using (exists (
    select 1 from public.org_members m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
  ));

create policy "members manage opportunities"
  on public.opportunities for all
  using (exists (
    select 1 from public.org_members m
    where m.organization_id = opportunities.organization_id
      and m.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.org_members m
    where m.organization_id = opportunities.organization_id
      and m.user_id = auth.uid()
  ));

create policy "members manage proposals"
  on public.proposals for all
  using (exists (
    select 1 from public.org_members m
    where m.organization_id = proposals.organization_id
      and m.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.org_members m
    where m.organization_id = proposals.organization_id
      and m.user_id = auth.uid()
  ));

create policy "members read proposal sections"
  on public.proposal_sections for select
  using (exists (
    select 1 from public.proposals p
    join public.org_members m on m.organization_id = p.organization_id
    where p.id = proposal_sections.proposal_id
      and m.user_id = auth.uid()
  ));

create policy "members read opportunities"
  on public.opportunities for select
  using (exists (
    select 1 from public.org_members m
    where m.organization_id = opportunities.organization_id
      and m.user_id = auth.uid()
  ));

create policy "members read outcomes"
  on public.outcomes for select
  using (exists (
    select 1 from public.org_members m
    where m.organization_id = outcomes.organization_id
      and m.user_id = auth.uid()
  ));

create policy "members manage outcomes"
  on public.outcomes for insert
  with check (exists (
    select 1 from public.org_members m
    where m.organization_id = outcomes.organization_id
      and m.user_id = auth.uid()
  ));

create policy "members manage proposal sections"
  on public.proposal_sections for all
  using (exists (
    select 1 from public.proposals p
    join public.org_members m on m.organization_id = p.organization_id
    where p.id = proposal_sections.proposal_id
      and m.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.proposals p
    join public.org_members m on m.organization_id = p.organization_id
    where p.id = proposal_sections.proposal_id
      and m.user_id = auth.uid()
  ));

-- ============================================================================
-- 2. ACTIVITY LOGS (20241025_activity_logs.sql)
-- ============================================================================

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_activity_logs_org on public.activity_logs(organization_id);
create index if not exists idx_activity_logs_proposal on public.activity_logs(proposal_id);

alter table public.activity_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'activity_logs'
      and policyname = 'members read activity'
  ) then
    execute '
      create policy "members read activity" on public.activity_logs for select
      using (
        exists (
          select 1 from public.org_members m
          where m.organization_id = activity_logs.organization_id
            and m.user_id = auth.uid()
        )
      )
    ';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'activity_logs'
      and policyname = 'members insert activity'
  ) then
    execute '
      create policy "members insert activity" on public.activity_logs for insert
      with check (
        exists (
          select 1 from public.org_members m
          where m.organization_id = activity_logs.organization_id
            and m.user_id = auth.uid()
        )
      )
    ';
  end if;
end $$;

-- ============================================================================
-- 3. ADD DOCUMENT METADATA (20241025_add_document_metadata.sql)
-- ============================================================================

alter table public.organizations
  add column if not exists document_metadata jsonb default '[]'::jsonb;

-- ============================================================================
-- 4. PLAN AND USAGE (20241025_plan_and_usage.sql)
-- ============================================================================

alter table public.organizations
  add column if not exists plan_id text default 'starter',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

alter table public.proposals
  add column if not exists created_at timestamptz default now();

-- ============================================================================
-- 5. BILLING PAYMENTS (20241026_billing_payments.sql)
-- ============================================================================

create table if not exists public.billing_payments (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  stripe_invoice_id text unique not null,
  stripe_customer_id text not null,
  amount numeric,
  currency text,
  status text,
  due_date timestamptz,
  paid_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_billing_payments_org on public.billing_payments(organization_id);
create index if not exists idx_billing_payments_invoice on public.billing_payments(stripe_invoice_id);

alter table public.billing_payments enable row level security;

create policy "members read billing payments"
  on public.billing_payments
  for select
  using (
    exists (
      select 1
      from public.org_members m
      where m.organization_id = billing_payments.organization_id
        and m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. ORG MEMBERS READ (20241026_org_members_read.sql)
-- ============================================================================

create policy if not exists "members read memberships"
  on public.org_members
  for select
  using (user_id = auth.uid());

-- ============================================================================
-- 7. ADMIN TABLES (20241027_admin_tables.sql)
-- ============================================================================

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'support', 'developer', 'read_only')),
  created_at timestamptz default now()
);

alter table public.admin_users enable row level security;

create policy "admins can read their own role"
  on public.admin_users
  for select
  using (auth.uid() = user_id);

create policy "service role manages admin users"
  on public.admin_users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.admin_audit_logs (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id),
  actor_role text check (actor_role in ('super_admin', 'support', 'developer', 'read_only')),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_admin_audit_logs_actor on public.admin_audit_logs(actor_user_id);
create index if not exists idx_admin_audit_logs_created on public.admin_audit_logs(created_at desc);

alter table public.admin_audit_logs enable row level security;

create policy "admins read audit logs"
  on public.admin_audit_logs
  for select
  using (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

create policy "service role writes audit logs"
  on public.admin_audit_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================================
-- 8. AI COSTS (20241027_ai_costs.sql)
-- ============================================================================

create table if not exists public.ai_cost_events (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete set null,
  template_id text,
  model text,
  prompt_tokens integer not null,
  completion_tokens integer not null,
  total_tokens integer not null,
  cost_usd numeric(12,6) not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_ai_cost_events_org on public.ai_cost_events(organization_id);
create index if not exists idx_ai_cost_events_created on public.ai_cost_events(created_at desc);

alter table public.ai_cost_events enable row level security;

create policy "service role manages ai cost events"
  on public.ai_cost_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================================
-- 9. FEATURE FLAGS (20241027_feature_flags.sql)
-- ============================================================================

create table if not exists public.feature_flags (
  id bigserial primary key,
  key text unique not null,
  description text,
  rollout_percentage integer not null default 0 check (rollout_percentage >= 0 and rollout_percentage <= 100),
  enabled boolean not null default false,
  target_plans jsonb default '[]'::jsonb,
  target_customer_ids jsonb default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_feature_flags_enabled on public.feature_flags(enabled);

alter table public.feature_flags enable row level security;

create policy "service role manages feature flags"
  on public.feature_flags
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================================
-- 10. SUPPORT TABLES (20241027_support_tables.sql)
-- ============================================================================

create table if not exists public.support_tickets (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  subject text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  opened_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.support_ticket_events (
  id bigserial primary key,
  ticket_id bigint references public.support_tickets(id) on delete cascade,
  event_type text not null,
  message text not null,
  metadata jsonb default '{}'::jsonb,
  actor_admin_id uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.admin_customer_notes (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  admin_user_id uuid references auth.users(id),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_support_tickets_org on public.support_tickets(organization_id);
create index if not exists idx_support_ticket_events_ticket on public.support_ticket_events(ticket_id);
create index if not exists idx_admin_customer_notes_org on public.admin_customer_notes(organization_id);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_events enable row level security;
alter table public.admin_customer_notes enable row level security;

create policy "service role manages support tickets"
  on public.support_tickets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages support events"
  on public.support_ticket_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages customer notes"
  on public.admin_customer_notes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================================
-- 11. FIX ORG UPDATE POLICY (20241031_fix_org_update_policy.sql)
-- ============================================================================

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

-- ============================================================================
-- 12. STORAGE SETUP (20241031_storage_setup.sql)
-- ============================================================================

-- ============================================================================
-- STORAGE SETUP FOR DOCUMENT UPLOADS
-- ============================================================================
-- Creates a Supabase Storage bucket for organization documents
-- Run this after applying all previous migrations
-- ============================================================================

-- Create the storage bucket for organization documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-documents',
  'org-documents',
  false, -- private bucket, requires auth
  52428800, -- 50MB max file size
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/csv',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- Storage policies: users can only access files for their organizations
create policy "Users can upload files to their org folder"
  on storage.objects for insert
  with check (
    bucket_id = 'org-documents' and
    auth.uid() in (
      select user_id from public.org_members
      where organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy "Users can view files in their org folder"
  on storage.objects for select
  using (
    bucket_id = 'org-documents' and
    auth.uid() in (
      select user_id from public.org_members
      where organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy "Users can update files in their org folder"
  on storage.objects for update
  using (
    bucket_id = 'org-documents' and
    auth.uid() in (
      select user_id from public.org_members
      where organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy "Users can delete files in their org folder"
  on storage.objects for delete
  using (
    bucket_id = 'org-documents' and
    auth.uid() in (
      select user_id from public.org_members
      where organization_id::text = (storage.foldername(name))[1]
    )
  );

-- Add a helper function to get file URL
create or replace function public.get_document_url(org_id uuid, file_path text)
returns text
language plpgsql
security definer
as $$
declare
  bucket_name text := 'org-documents';
  full_path text;
begin
  full_path := org_id::text || '/' || file_path;
  return bucket_name || '/' || full_path;
end;
$$;

-- ============================================================================
-- STORAGE BUCKET READY
-- ============================================================================
-- File structure: org-documents/{org_id}/{filename}
-- Example: org-documents/8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001/990-fy23.pdf
-- ============================================================================

-- ============================================================================
-- 13. ADD CONNECTOR FIELDS (20241101_add_connector_fields.sql)
-- ============================================================================

-- ============================================================================
-- ADD CONNECTOR FIELDS TO OPPORTUNITIES TABLE
-- ============================================================================
-- Adds fields needed for automated grant ingestion pipeline
-- ============================================================================

-- Add source tracking columns
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS raw_data JSONB,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add enrichment columns
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS funder_name TEXT,
ADD COLUMN IF NOT EXISTS funder_ein TEXT,
ADD COLUMN IF NOT EXISTS eligibility_requirements TEXT[],
ADD COLUMN IF NOT EXISTS application_url TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS geographic_scope TEXT;

-- Unique constraint: same external_id from same source = same opportunity
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunities_external_source
  ON opportunities(external_id, source)
  WHERE external_id IS NOT NULL;

-- Index for finding opportunities to refresh
CREATE INDEX IF NOT EXISTS idx_opportunities_sync
  ON opportunities(source, last_synced_at);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_source
  ON opportunities(source);

-- Comment the new columns
COMMENT ON COLUMN opportunities.source IS 'Data source: manual, grants_gov, ca_state, etc.';
COMMENT ON COLUMN opportunities.external_id IS 'Original ID from the data source';
COMMENT ON COLUMN opportunities.raw_data IS 'Full original data from source for traceability';
COMMENT ON COLUMN opportunities.last_synced_at IS 'When we last fetched this from source';
COMMENT ON COLUMN opportunities.source_updated_at IS 'When source last modified this opportunity';
COMMENT ON COLUMN opportunities.funder_name IS 'Name of the funding organization';
COMMENT ON COLUMN opportunities.funder_ein IS 'EIN of funder (for Open990 lookup)';
COMMENT ON COLUMN opportunities.geographic_scope IS 'national, state, regional, or local';

-- ============================================================================
-- 14. ADD PROPOSAL ARCHIVE (20241101_add_proposal_archive.sql)
-- ============================================================================

-- Add archived column to proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster filtering of archived proposals
CREATE INDEX IF NOT EXISTS idx_proposals_archived ON proposals(archived);

-- ============================================================================
-- 15. ADD SHARE EXPIRATION (20241101_add_share_expiration.sql)
-- ============================================================================

-- Add share_expires_at column to proposals for automatic link expiration
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

-- Create index for faster expiration checks
CREATE INDEX IF NOT EXISTS idx_proposals_share_expires_at ON proposals(share_expires_at);

-- Update RLS policy to check expiration
DROP POLICY IF EXISTS "Anyone can read shared proposals" ON proposals;
CREATE POLICY "Anyone can read shared proposals"
  ON proposals
  FOR SELECT
  USING (
    share_token IS NOT NULL
    AND (share_expires_at IS NULL OR share_expires_at > NOW())
  );

-- Update RLS policy for proposal_sections to check expiration
DROP POLICY IF EXISTS "Anyone can read sections of shared proposals" ON proposal_sections;
CREATE POLICY "Anyone can read sections of shared proposals"
  ON proposal_sections
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_sections.proposal_id
      AND p.share_token IS NOT NULL
      AND (p.share_expires_at IS NULL OR p.share_expires_at > NOW())
  ));

-- Update RLS policy for proposal_comments to check expiration
DROP POLICY IF EXISTS "Anyone can read comments on shared proposals" ON proposal_comments;
CREATE POLICY "Anyone can read comments on shared proposals"
  ON proposal_comments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_comments.proposal_id
      AND p.share_token IS NOT NULL
      AND (p.share_expires_at IS NULL OR p.share_expires_at > NOW())
  ));

DROP POLICY IF EXISTS "Anyone can comment on shared proposals" ON proposal_comments;
CREATE POLICY "Anyone can comment on shared proposals"
  ON proposal_comments
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_comments.proposal_id
      AND p.share_token IS NOT NULL
      AND (p.share_expires_at IS NULL OR p.share_expires_at > NOW())
  ));

-- ============================================================================
-- 16. ADD SHARE TOKEN (20241101_add_share_token.sql)
-- ============================================================================

-- Add share_token column to proposals for public sharing
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposals_share_token ON proposals(share_token);

-- RLS policy: Anyone can read proposals with a valid share token
CREATE POLICY "Anyone can read shared proposals"
  ON proposals
  FOR SELECT
  USING (share_token IS NOT NULL);

-- RLS policy: Anyone can read sections of shared proposals
CREATE POLICY "Anyone can read sections of shared proposals"
  ON proposal_sections
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_sections.proposal_id
      AND p.share_token IS NOT NULL
  ));

-- ============================================================================
-- 17. CONNECTOR SYNC STATE (20241101_connector_sync_state.sql)
-- ============================================================================

-- ============================================================================
-- CONNECTOR SYNC STATE TABLE
-- ============================================================================
-- Tracks the current state and health of each data connector
-- ============================================================================

CREATE TABLE IF NOT EXISTS connector_sync_state (
  source TEXT PRIMARY KEY,
  last_sync_started_at TIMESTAMPTZ,
  last_sync_completed_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors JSONB,
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying connector health
CREATE INDEX IF NOT EXISTS idx_connector_sync_state_status
  ON connector_sync_state(status, last_sync_completed_at);

-- Comments
COMMENT ON TABLE connector_sync_state IS 'Tracks sync state and health for each data connector';
COMMENT ON COLUMN connector_sync_state.source IS 'Connector identifier (grants_gov, ca_state, etc.)';
COMMENT ON COLUMN connector_sync_state.status IS 'Current status: idle, running, or error';
COMMENT ON COLUMN connector_sync_state.last_successful_sync_at IS 'Last time sync completed without errors';

-- ============================================================================
-- 18. FIX GRANTS GOV URLS (20241101_fix_grants_gov_urls.sql)
-- ============================================================================

-- ============================================================================
-- FIX GRANTS.GOV URL FORMAT
-- ============================================================================
-- Update application URLs from old format to new format
-- Old: https://www.grants.gov/web/grants/view-opportunity.html?oppId=312633
-- New: https://www.grants.gov/search-results-detail/312633
-- ============================================================================

-- Update opportunities that use the old URL format
UPDATE opportunities
SET application_url = REGEXP_REPLACE(
  application_url,
  'https://www\.grants\.gov/web/grants/view-opportunity\.html\?oppId=(\d+)',
  'https://www.grants.gov/search-results-detail/\1'
)
WHERE application_url LIKE '%grants.gov/web/grants/view-opportunity.html%';

-- Verification query (check how many URLs were updated)
-- Run this to verify the migration worked:
-- SELECT
--   COUNT(*) as total_grants_gov_opportunities,
--   COUNT(*) FILTER (WHERE application_url LIKE '%search-results-detail%') as new_format,
--   COUNT(*) FILTER (WHERE application_url LIKE '%view-opportunity.html%') as old_format
-- FROM opportunities
-- WHERE source = 'grants_gov';

-- ============================================================================
-- 19. FIX OPPORTUNITIES RLS (20241101_fix_opportunities_rls.sql)
-- ============================================================================

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

-- ============================================================================
-- 20. PRICING PLANS (20241101_pricing_plans.sql)
-- ============================================================================

-- Create pricing_plans table
CREATE TABLE IF NOT EXISTS pricing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price_cents INTEGER NOT NULL,
  max_proposals_per_month INTEGER NOT NULL,
  stripe_price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default plans
INSERT INTO pricing_plans (id, name, description, monthly_price_cents, max_proposals_per_month, stripe_price_id, active)
VALUES
  ('starter', 'Starter', 'Perfect for small teams getting started', 24900, 2, NULL, true),
  ('growth', 'Growth', 'For growing organizations with more needs', 49900, 10, NULL, true),
  ('impact', 'Impact', 'Unlimited proposals for high-volume teams', 99900, 999, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read pricing plans (public information)
CREATE POLICY "Pricing plans are publicly readable"
  ON pricing_plans
  FOR SELECT
  USING (true);

-- Policy: Only service role can modify pricing plans
CREATE POLICY "Only service role can modify pricing plans"
  ON pricing_plans
  FOR ALL
  USING (false);

-- ============================================================================
-- 21. PROPOSAL COMMENTS (20241101_proposal_comments.sql)
-- ============================================================================

-- Create proposal_comments table for external reviewer feedback
CREATE TABLE IF NOT EXISTS proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  section_id UUID REFERENCES proposal_sections(id) ON DELETE CASCADE,
  commenter_name TEXT NOT NULL,
  commenter_email TEXT,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal ON proposal_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_section ON proposal_comments(section_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_created ON proposal_comments(created_at DESC);

-- Enable RLS
ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read comments for shared proposals
CREATE POLICY "Anyone can read comments on shared proposals"
  ON proposal_comments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_comments.proposal_id
      AND p.share_token IS NOT NULL
  ));

-- Policy: Anyone can create comments on shared proposals (no auth required)
CREATE POLICY "Anyone can comment on shared proposals"
  ON proposal_comments
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_comments.proposal_id
      AND p.share_token IS NOT NULL
  ));

-- Policy: Organization members can read all comments on their proposals
CREATE POLICY "Members can read comments on org proposals"
  ON proposal_comments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    JOIN org_members m ON m.organization_id = p.organization_id
    WHERE p.id = proposal_comments.proposal_id
      AND m.user_id = auth.uid()
  ));

-- ============================================================================
-- 22. SOFT DELETE PROPOSALS (20241101_soft_delete_proposals.sql)
-- ============================================================================

-- ============================================================================
-- SOFT DELETE FOR PROPOSALS
-- ============================================================================
-- Add soft delete functionality to proposals table
-- ============================================================================

-- Add deleted_at column to proposals
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add index for efficient filtering of non-deleted proposals
CREATE INDEX IF NOT EXISTS idx_proposals_deleted_at
ON proposals(deleted_at)
WHERE deleted_at IS NULL;

-- Add index for finding recently deleted proposals (for recovery/cleanup)
CREATE INDEX IF NOT EXISTS idx_proposals_deleted_at_recent
ON proposals(deleted_at)
WHERE deleted_at IS NOT NULL;

-- Add comment explaining the soft delete pattern
COMMENT ON COLUMN proposals.deleted_at IS
'Soft delete timestamp. When set, proposal is considered deleted but retained for recovery/audit. NULL means active proposal.';

-- ============================================================================
-- 23. SYNC LOGS (20241101_sync_logs.sql)
-- ============================================================================

-- ============================================================================
-- SYNC LOGS TABLE
-- ============================================================================
-- Audit trail for all sync operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'running')),
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying logs by source and time
CREATE INDEX IF NOT EXISTS idx_sync_logs_source
  ON sync_logs(source, started_at DESC);

-- Index for finding recent logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_recent
  ON sync_logs(started_at DESC);

-- Comments
COMMENT ON TABLE sync_logs IS 'Audit trail of all sync operations';
COMMENT ON COLUMN sync_logs.status IS 'Sync result: success, partial (some errors), failed, or running';
COMMENT ON COLUMN sync_logs.metadata IS 'Additional context about the sync run';


-- ============================================================================
-- END OF MIGRATIONS
-- ============================================================================
