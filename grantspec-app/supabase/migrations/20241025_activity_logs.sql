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
