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
