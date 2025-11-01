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
