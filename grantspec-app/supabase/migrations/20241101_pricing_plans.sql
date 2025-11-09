-- Create pricing_plans table
CREATE TABLE IF NOT EXISTS pricing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price_cents INTEGER NOT NULL,
  max_proposals_per_month INTEGER NOT NULL,
  stripe_price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default plans
INSERT INTO pricing_plans (id, name, description, monthly_price_cents, max_proposals_per_month, stripe_price_id, active)
VALUES
  ('starter', 'Starter', 'Perfect for small teams getting started', 24900, 2, NULL, true),
  ('growth', 'Growth', 'For growing organizations with more needs', 49900, 10, NULL, true),
  ('impact', 'Impact', 'Unlimited proposals for high-volume teams', 99900, 999, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read pricing plans (public information)
CREATE POLICY "Pricing plans are publicly readable"
  ON pricing_plans
  FOR SELECT
  USING (true);

-- Policy: Only service role can modify pricing plans
CREATE POLICY "Only service role can modify pricing plans"
  ON pricing_plans
  FOR ALL
  USING (false);
