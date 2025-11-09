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
