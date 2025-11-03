-- User profiles to track account types (nonprofit vs freelancer)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null default 'nonprofit' check (account_type in ('nonprofit', 'freelancer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute procedure public.set_user_profiles_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, account_type)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'account_type')::text, 'nonprofit')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user_profile();

alter table public.user_profiles enable row level security;

create policy "users can manage their own profile"
  on public.user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "service role can manage profiles"
  on public.user_profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
