-- ============================================================================
-- GRANTBOT COMPLETE SCHEMA - Apply All Migrations
-- ============================================================================
-- Run this file in Supabase SQL Editor to create all tables and policies
-- Instructions:
--   1. Open https://app.supabase.com/project/wwwrchacbyepnvbqhgnb
--   2. Go to SQL Editor
--   3. Copy and paste this entire file
--   4. Click "Run"
-- ============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. INITIAL SCHEMA (20241024_initial.sql)
-- ============================================================================

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
create index if not exists idx_org_members_org_id on public.org_members(organization_id);
create index if not exists idx_org_members_user_id on public.org_members(user_id);
create index if not exists idx_opportunities_org_id on public.opportunities(organization_id);
create index if not exists idx_proposals_org_id on public.proposals(organization_id);
create index if not exists idx_proposals_opportunity_id on public.proposals(opportunity_id);
create index if not exists idx_proposal_sections_proposal_id on public.proposal_sections(proposal_id);
create index if not exists idx_outcomes_org_id on public.outcomes(organization_id);
create index if not exists idx_outcomes_proposal_id on public.outcomes(proposal_id);

-- Row-level security
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.opportunities enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_sections enable row level security;
alter table public.outcomes enable row level security;

-- Policies: users can only access data for orgs they belong to
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'organizations' and policyname = 'Users can view their orgs') then
    create policy "Users can view their orgs" on public.organizations
      for select using (
        id in (select organization_id from public.org_members where user_id = auth.uid())
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'org_members' and policyname = 'Users can view their memberships') then
    create policy "Users can view their memberships" on public.org_members
      for select using (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'opportunities' and policyname = 'Users can view org opportunities') then
    create policy "Users can view org opportunities" on public.opportunities
      for select using (
        organization_id in (select organization_id from public.org_members where user_id = auth.uid())
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'proposals' and policyname = 'Users can view org proposals') then
    create policy "Users can view org proposals" on public.proposals
      for select using (
        organization_id in (select organization_id from public.org_members where user_id = auth.uid())
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'proposal_sections' and policyname = 'Users can view org sections') then
    create policy "Users can view org sections" on public.proposal_sections
      for select using (
        proposal_id in (
          select id from public.proposals
          where organization_id in (select organization_id from public.org_members where user_id = auth.uid())
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'outcomes' and policyname = 'Users can view org outcomes') then
    create policy "Users can view org outcomes" on public.outcomes
      for select using (
        organization_id in (select organization_id from public.org_members where user_id = auth.uid())
      );
  end if;
end $$;

-- ============================================================================
-- 2. DOCUMENT METADATA (20241025_add_document_metadata.sql)
-- ============================================================================

-- Already included in initial schema above

-- ============================================================================
-- 3. PLAN AND USAGE (20241025_plan_and_usage.sql)
-- ============================================================================

alter table public.organizations add column if not exists plan_id text default 'starter';
alter table public.organizations add column if not exists stripe_customer_id text;
alter table public.organizations add column if not exists stripe_subscription_id text;

-- ============================================================================
-- 4. ACTIVITY LOGS (20241025_activity_logs.sql)
-- ============================================================================

create table if not exists public.activity_logs (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_activity_logs_org_id on public.activity_logs(organization_id);
create index if not exists idx_activity_logs_proposal_id on public.activity_logs(proposal_id);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

alter table public.activity_logs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'activity_logs' and policyname = 'Users can view org activity') then
    create policy "Users can view org activity" on public.activity_logs
      for select using (
        organization_id in (select organization_id from public.org_members where user_id = auth.uid())
      );
  end if;
end $$;

-- ============================================================================
-- 5. BILLING PAYMENTS (20241026_billing_payments.sql)
-- ============================================================================

create table if not exists public.billing_payments (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  stripe_invoice_id text unique,
  stripe_customer_id text,
  amount integer not null,
  currency text default 'usd',
  status text not null,
  due_date timestamptz,
  paid_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_billing_payments_org_id on public.billing_payments(organization_id);
create index if not exists idx_billing_payments_stripe_invoice_id on public.billing_payments(stripe_invoice_id);
create index if not exists idx_billing_payments_created_at on public.billing_payments(created_at desc);

alter table public.billing_payments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'billing_payments' and policyname = 'Users can view org billing') then
    create policy "Users can view org billing" on public.billing_payments
      for select using (
        organization_id in (select organization_id from public.org_members where user_id = auth.uid())
      );
  end if;
end $$;

-- ============================================================================
-- 6. ORG MEMBERS READ FIX (20241026_org_members_read.sql)
-- ============================================================================

-- Policy already created in initial schema

-- ============================================================================
-- 7. ADMIN TABLES (20241027_admin_tables.sql)
-- ============================================================================

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'support', 'developer', 'read_only')),
  created_at timestamptz default now()
);

create table if not exists public.admin_audit_logs (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create table if not exists public.admin_customer_notes (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  admin_user_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_admin_audit_logs_actor on public.admin_audit_logs(actor_user_id);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at desc);
create index if not exists idx_admin_customer_notes_org_id on public.admin_customer_notes(organization_id);

alter table public.admin_users enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.admin_customer_notes enable row level security;

-- ============================================================================
-- 8. SUPPORT TABLES (20241027_support_tables.sql)
-- ============================================================================

create table if not exists public.support_tickets (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  subject text not null,
  status text default 'open' check (status in ('open', 'pending', 'closed')),
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  opened_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.support_ticket_events (
  id bigserial primary key,
  ticket_id bigint references public.support_tickets(id) on delete cascade,
  event_type text not null,
  message text,
  metadata jsonb default '{}'::jsonb,
  actor_admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_support_tickets_org_id on public.support_tickets(organization_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_ticket_events_ticket_id on public.support_ticket_events(ticket_id);
create index if not exists idx_support_ticket_events_created_at on public.support_ticket_events(created_at desc);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_events enable row level security;

-- ============================================================================
-- 9. FEATURE FLAGS (20241027_feature_flags.sql)
-- ============================================================================

create table if not exists public.feature_flags (
  id bigserial primary key,
  key text unique not null,
  description text,
  rollout_percentage integer default 0 check (rollout_percentage >= 0 and rollout_percentage <= 100),
  enabled boolean default false,
  target_plans jsonb default '[]'::jsonb,
  target_customer_ids jsonb default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_feature_flags_key on public.feature_flags(key);
create index if not exists idx_feature_flags_enabled on public.feature_flags(enabled);

alter table public.feature_flags enable row level security;

-- ============================================================================
-- 10. AI COSTS (20241027_ai_costs.sql)
-- ============================================================================

create table if not exists public.ai_cost_events (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete set null,
  template_id text,
  model text not null,
  prompt_tokens integer not null,
  completion_tokens integer not null,
  total_tokens integer not null,
  cost_usd numeric(10, 4) not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_ai_cost_events_org_id on public.ai_cost_events(organization_id);
create index if not exists idx_ai_cost_events_proposal_id on public.ai_cost_events(proposal_id);
create index if not exists idx_ai_cost_events_created_at on public.ai_cost_events(created_at desc);

alter table public.ai_cost_events enable row level security;

-- ============================================================================
-- 11. PRICING PLANS (20241028_pricing_plans.sql)
-- ============================================================================

create table if not exists public.pricing_plans (
  id text primary key,
  name text not null,
  description text,
  price_monthly integer not null,
  max_proposals_per_month integer not null,
  stripe_price_id text,
  features jsonb default '[]'::jsonb,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.pricing_plans enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'pricing_plans' and policyname = 'Anyone can view active plans') then
    create policy "Anyone can view active plans" on public.pricing_plans
      for select using (is_active = true);
  end if;
end $$;

-- Insert default pricing plans
insert into public.pricing_plans (id, name, description, price_monthly, max_proposals_per_month, sort_order)
values
  ('starter', 'Starter', 'For organizations just getting started with grant writing', 24900, 2, 1),
  ('growth', 'Growth', 'For active grant seekers', 49900, 12, 2),
  ('impact', 'Impact', 'For organizations with multiple grant applications', 99900, 60, 3)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  max_proposals_per_month = excluded.max_proposals_per_month,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ============================================================================
-- 9. SOFT DELETE FOR PROPOSALS (20241101_soft_delete_proposals.sql)
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
-- SCHEMA COMPLETE
-- ============================================================================
-- Next steps:
--   1. Run the seed file: supabase/seed/001_demo_data.sql
--   2. Create test users: npm run seed:users
-- ============================================================================
