-- Add additional limits to pricing_plans
ALTER TABLE pricing_plans
  ADD COLUMN IF NOT EXISTS seat_limit integer,
  ADD COLUMN IF NOT EXISTS max_opportunities integer,
  ADD COLUMN IF NOT EXISTS max_documents integer,
  ADD COLUMN IF NOT EXISTS allow_ai boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_analytics boolean DEFAULT true;

-- Ensure existing rows default to allowed features
UPDATE pricing_plans
SET allow_ai = true,
    allow_analytics = true
WHERE allow_ai IS NULL OR allow_analytics IS NULL;

-- Seed free workspace tier if it does not exist
INSERT INTO pricing_plans (
  id,
  name,
  description,
  monthly_price_cents,
  max_proposals_per_month,
  seat_limit,
  max_opportunities,
  max_documents,
  allow_ai,
  allow_analytics,
  stripe_price_id,
  active,
  features
) VALUES (
  'workspace_free',
  'Workspace (Free)',
  'Single-user workspace with manual tracking tools.',
  0,
  1,
  1,
  3,
  3,
  false,
  false,
  NULL,
  true,
  '["1 seat","Track up to 3 opportunities","Upload up to 3 documents","Manual checklists","AI features locked","Analytics disabled"]'
)
ON CONFLICT (id) DO UPDATE
SET name = excluded.name,
    description = excluded.description,
    monthly_price_cents = excluded.monthly_price_cents,
    max_proposals_per_month = excluded.max_proposals_per_month,
    seat_limit = excluded.seat_limit,
    max_opportunities = excluded.max_opportunities,
    max_documents = excluded.max_documents,
    allow_ai = excluded.allow_ai,
    allow_analytics = excluded.allow_analytics,
    active = excluded.active,
    features = excluded.features;
