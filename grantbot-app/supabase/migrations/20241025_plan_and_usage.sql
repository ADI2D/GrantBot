alter table public.organizations
  add column if not exists plan_id text default 'starter',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

alter table public.proposals
  add column if not exists created_at timestamptz default now();
