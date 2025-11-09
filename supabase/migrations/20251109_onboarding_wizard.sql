-- ============================================================================
-- Onboarding Wizard: Enhanced fields for nonprofits and freelancers
-- ============================================================================

-- Add onboarding fields to organizations table
alter table public.organizations add column if not exists ein text;
alter table public.organizations add column if not exists founded_year integer;
alter table public.organizations add column if not exists staff_size text;
alter table public.organizations add column if not exists geographic_scope text;
alter table public.organizations add column if not exists website text;
alter table public.organizations add column if not exists programs jsonb default '[]'::jsonb;
alter table public.organizations add column if not exists impact_metrics jsonb default '[]'::jsonb;
alter table public.organizations add column if not exists target_demographics jsonb default '[]'::jsonb;
alter table public.organizations add column if not exists past_funders jsonb default '[]'::jsonb;

comment on column public.organizations.ein is 'Employer Identification Number (Tax ID)';
comment on column public.organizations.founded_year is 'Year organization was founded';
comment on column public.organizations.staff_size is 'Organization size: solo, small (2-10), medium (11-50), large (50+)';
comment on column public.organizations.geographic_scope is 'Local, Regional, National, International';
comment on column public.organizations.programs is 'Array of program objects: [{name, description, budget}]';
comment on column public.organizations.impact_metrics is 'Array of metrics: [{metric, value, timeframe}]';
comment on column public.organizations.target_demographics is 'Array of target populations served';
comment on column public.organizations.past_funders is 'Array of past funding sources: [{name, amount, year}]';

-- Create freelancer_profiles table
create table if not exists public.freelancer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- Basic info
  full_name text,
  headline text,
  bio text,
  hourly_rate numeric,

  -- Expertise
  specializations jsonb default '[]'::jsonb, -- Array of focus areas they specialize in
  years_experience integer,
  certifications jsonb default '[]'::jsonb, -- [{name, issuer, year}]

  -- Portfolio
  portfolio_items jsonb default '[]'::jsonb, -- [{title, description, amount_raised, funder, year}]
  total_grants_written integer default 0,
  total_amount_raised numeric default 0,
  success_rate numeric, -- Percentage of grants won

  -- Availability
  availability_status text default 'available' check (availability_status in ('available', 'limited', 'unavailable')),
  weekly_capacity integer, -- Hours per week available

  -- Onboarding
  onboarding_completion numeric default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.freelancer_profiles is 'Extended profile data for freelancer users';
comment on column public.freelancer_profiles.specializations is 'Array of focus area IDs: ["health", "education", etc.]';
comment on column public.freelancer_profiles.certifications is 'Array of certifications: [{name, issuer, year}]';
comment on column public.freelancer_profiles.portfolio_items is 'Array of past grants: [{title, description, amount_raised, funder, year}]';

-- Trigger to update updated_at timestamp
create or replace function public.set_freelancer_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger freelancer_profiles_set_updated_at
before update on public.freelancer_profiles
for each row
execute procedure public.set_freelancer_profiles_updated_at();

-- RLS for freelancer_profiles
alter table public.freelancer_profiles enable row level security;

create policy "freelancers can read their own profile"
  on public.freelancer_profiles
  for select
  using (auth.uid() = user_id);

create policy "freelancers can update their own profile"
  on public.freelancer_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "freelancers can insert their own profile"
  on public.freelancer_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "nonprofits can read freelancer profiles"
  on public.freelancer_profiles
  for select
  using (
    exists (
      select 1 from public.user_profiles up
      where up.user_id = auth.uid() and up.account_type = 'nonprofit'
    )
  );

create policy "service role can manage freelancer profiles"
  on public.freelancer_profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Create clients table for freelancers
create table if not exists public.freelancer_clients (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references auth.users(id) on delete cascade,

  -- Client info
  client_name text not null,
  client_type text, -- 'nonprofit', 'foundation', 'government', 'other'
  relationship_status text default 'active' check (relationship_status in ('active', 'completed', 'inactive')),

  -- Engagement details
  start_date date,
  end_date date,
  total_raised numeric default 0,
  grants_submitted integer default 0,
  grants_awarded integer default 0,

  -- Notes
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.freelancer_clients is 'Client relationships for freelancer grant writers';

create index if not exists idx_freelancer_clients_freelancer on public.freelancer_clients(freelancer_id);

-- Trigger for clients updated_at
create trigger freelancer_clients_set_updated_at
before update on public.freelancer_clients
for each row
execute procedure public.set_freelancer_profiles_updated_at();

-- RLS for freelancer_clients
alter table public.freelancer_clients enable row level security;

create policy "freelancers can manage their own clients"
  on public.freelancer_clients
  for all
  using (auth.uid() = freelancer_id)
  with check (auth.uid() = freelancer_id);

create policy "service role can manage freelancer clients"
  on public.freelancer_clients
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Update focus_areas column on organizations to use the new taxonomy
comment on column public.organizations.focus_areas is 'Array of focus area IDs from taxonomy: ["health", "education", "environment", etc.]';
