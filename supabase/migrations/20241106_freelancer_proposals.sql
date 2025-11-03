-- Freelancer proposal persistence
create table if not exists public.freelancer_proposals (
  id text primary key,
  freelancer_user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  client_name text not null,
  title text not null,
  status text not null default 'Drafting',
  due_date date,
  owner_name text,
  draft_html text,
  checklist jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  ai_prompts jsonb not null default '[]'::jsonb,
  last_edited_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_freelancer_proposals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger freelancer_proposals_set_updated_at
before update on public.freelancer_proposals
for each row
execute procedure public.set_freelancer_proposals_updated_at();

create index if not exists freelancer_proposals_user_idx
  on public.freelancer_proposals (freelancer_user_id);

alter table public.freelancer_proposals enable row level security;

create policy "freelancers can view own proposals"
  on public.freelancer_proposals
  for select
  using (auth.uid() = freelancer_user_id);

create policy "freelancers can insert own proposals"
  on public.freelancer_proposals
  for insert
  with check (auth.uid() = freelancer_user_id);

create policy "freelancers can update own proposals"
  on public.freelancer_proposals
  for update
  using (auth.uid() = freelancer_user_id)
  with check (auth.uid() = freelancer_user_id);

create policy "freelancers can delete own proposals"
  on public.freelancer_proposals
  for delete
  using (auth.uid() = freelancer_user_id);

create policy "service role can manage freelancer proposals"
  on public.freelancer_proposals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
