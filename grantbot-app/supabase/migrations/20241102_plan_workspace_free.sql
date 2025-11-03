-- Workspace (Free) plan definition
insert into pricing_plans (
  id,
  name,
  description,
  monthly_price_cents,
  max_proposals_per_month,
  stripe_price_id,
  active,
  features
) values (
  'workspace',
  'Workspace (Free)',
  'Track a single grant cycle with essential tools. Upgrade for AI drafting & automation.',
  0,
  1,
  null,
  true,
  '["1 seat","Track up to 3 opportunities","Upload up to 3 documents","Manual checklists","AI features locked","Analytics disabled"]'
);
