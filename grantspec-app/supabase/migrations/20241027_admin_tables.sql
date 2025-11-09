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
