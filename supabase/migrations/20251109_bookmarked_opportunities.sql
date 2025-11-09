-- Add bookmarked opportunities table
-- This tracks which opportunities users have saved/bookmarked for later review

create table if not exists public.bookmarked_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(organization_id, opportunity_id)
);

-- Index for faster lookups
create index if not exists idx_bookmarked_opps_org on public.bookmarked_opportunities(organization_id);
create index if not exists idx_bookmarked_opps_user on public.bookmarked_opportunities(user_id);

-- Enable RLS
alter table public.bookmarked_opportunities enable row level security;

-- Policy: Users can read bookmarks for their organizations
create policy "members can read org bookmarks"
  on public.bookmarked_opportunities for select
  using (exists (
    select 1 from public.org_members m
    where m.organization_id = bookmarked_opportunities.organization_id
      and m.user_id = auth.uid()
  ));

-- Policy: Users can create bookmarks for their organizations
create policy "members can create org bookmarks"
  on public.bookmarked_opportunities for insert
  with check (exists (
    select 1 from public.org_members m
    where m.organization_id = bookmarked_opportunities.organization_id
      and m.user_id = auth.uid()
  ));

-- Policy: Users can delete bookmarks they created or for their org
create policy "members can delete org bookmarks"
  on public.bookmarked_opportunities for delete
  using (exists (
    select 1 from public.org_members m
    where m.organization_id = bookmarked_opportunities.organization_id
      and m.user_id = auth.uid()
  ));

-- Add view preference to organizations table (recommended vs all)
alter table public.organizations
  add column if not exists opportunity_view_mode text default 'all' check (opportunity_view_mode in ('recommended', 'all'));

comment on column public.organizations.opportunity_view_mode is 'User preference for opportunity view: recommended (AI-matched) or all opportunities';
