create policy if not exists "members read memberships"
  on public.org_members
  for select
  using (user_id = auth.uid());
