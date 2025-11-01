create table if not exists public.pricing_plans (
  id text primary key,
  name text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  max_proposals_per_month integer not null check (max_proposals_per_month >= 0),
  description text,
  stripe_product_id text,
  stripe_price_id text,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_pricing_plans_stripe_price on public.pricing_plans(stripe_price_id) where stripe_price_id is not null;

alter table public.pricing_plans enable row level security;

create policy "service role manages pricing plans"
  on public.pricing_plans
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.pricing_plans (id, name, monthly_price_cents, max_proposals_per_month, description)
values
  ('starter', 'Starter', 24900, 2, 'Up to 2 proposals per quarter, guided drafting'),
  ('growth', 'Growth', 49900, 1, 'One new proposal every month plus analytics'),
  ('impact', 'Impact', 99900, 5, 'Full-service automation and collaboration')
on conflict (id) do update set
  name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  max_proposals_per_month = excluded.max_proposals_per_month,
  description = excluded.description,
  updated_at = now();
