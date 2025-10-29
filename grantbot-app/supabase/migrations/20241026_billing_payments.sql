create table if not exists public.billing_payments (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  stripe_invoice_id text unique not null,
  stripe_customer_id text not null,
  amount numeric,
  currency text,
  status text,
  due_date timestamptz,
  paid_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_billing_payments_org on public.billing_payments(organization_id);
create index if not exists idx_billing_payments_invoice on public.billing_payments(stripe_invoice_id);

alter table public.billing_payments enable row level security;

create policy "members read billing payments"
  on public.billing_payments
  for select
  using (
    exists (
      select 1
      from public.org_members m
      where m.organization_id = billing_payments.organization_id
        and m.user_id = auth.uid()
    )
  );
