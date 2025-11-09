alter table public.organizations
  add column if not exists document_metadata jsonb default '[]'::jsonb;
