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
