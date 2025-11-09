create type public.admin_role as enum ('super_admin', 'support', 'developer', 'read_only');

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null,
  created_at timestamptz default now()
);

create index if not exists idx_admin_users_role on public.admin_users(role);

alter table public.admin_users enable row level security;

create policy if not exists "admin users can read admin users"
  on public.admin_users
  for select
  using (exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
  ));

create policy if not exists "super admins manage admin users"
  on public.admin_users
  for all
  using (exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
      and au.role = 'super_admin'
  ))
  with check (exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
      and au.role = 'super_admin'
  ));

create table if not exists public.admin_audit_logs (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role public.admin_role,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_admin_audit_logs_actor on public.admin_audit_logs(actor_user_id);
create index if not exists idx_admin_audit_logs_action on public.admin_audit_logs(action);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at);

alter table public.admin_audit_logs enable row level security;

create policy if not exists "admin users read audit logs"
  on public.admin_audit_logs
  for select
  using (exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
  ));

create policy if not exists "super admins insert audit logs"
  on public.admin_audit_logs
  for insert
  with check (exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
  ));
