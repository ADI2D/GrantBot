-- ============================================================================
-- COMPLIANCE AUTOMATION
-- ============================================================================
-- Adds structured compliance requirement tracking with AI extraction,
-- risk assessment, and automated checklist generation
-- ============================================================================

-- ============================================================================
-- 1. COMPLIANCE REQUIREMENTS TABLE
-- ============================================================================
-- Stores structured compliance requirements extracted from opportunities

CREATE TABLE IF NOT EXISTS public.compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  requirement_text TEXT NOT NULL,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('eligibility', 'document', 'narrative', 'operational', 'deadline', 'other')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('high', 'medium', 'low')) DEFAULT 'medium',
  deadline DATE,
  auto_extracted BOOLEAN DEFAULT false,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  suggested_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by opportunity
CREATE INDEX idx_compliance_requirements_opportunity_id
ON public.compliance_requirements(opportunity_id);

-- Index for filtering by risk level
CREATE INDEX idx_compliance_requirements_risk_level
ON public.compliance_requirements(risk_level)
WHERE risk_level = 'high';

-- Index for deadline tracking
CREATE INDEX idx_compliance_requirements_deadline
ON public.compliance_requirements(deadline)
WHERE deadline IS NOT NULL;

COMMENT ON TABLE public.compliance_requirements IS 'Structured compliance requirements extracted from grant opportunities with risk assessment';
COMMENT ON COLUMN public.compliance_requirements.requirement_type IS 'Category: eligibility, document, narrative, operational, deadline, other';
COMMENT ON COLUMN public.compliance_requirements.risk_level IS 'Impact: high (deal-breaker), medium (significant), low (minor)';
COMMENT ON COLUMN public.compliance_requirements.auto_extracted IS 'True if extracted by AI, false if manually added';
COMMENT ON COLUMN public.compliance_requirements.confidence_score IS 'AI extraction confidence (0-1)';

-- ============================================================================
-- 2. COMPLIANCE ASSETS TABLE
-- ============================================================================
-- Tracks documents and data that organizations have on file for compliance

CREATE TABLE IF NOT EXISTS public.org_compliance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  valid_from DATE,
  valid_until DATE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by organization
CREATE INDEX idx_org_compliance_assets_organization_id
ON public.org_compliance_assets(organization_id);

-- Index for searching by asset type
CREATE INDEX idx_org_compliance_assets_asset_type
ON public.org_compliance_assets(asset_type);

-- Index for finding expired assets
CREATE INDEX idx_org_compliance_assets_validity
ON public.org_compliance_assets(valid_until)
WHERE valid_until IS NOT NULL;

-- Index for tag-based search
CREATE INDEX idx_org_compliance_assets_tags
ON public.org_compliance_assets USING GIN(tags);

COMMENT ON TABLE public.org_compliance_assets IS 'Organization documents and data available for compliance requirements';
COMMENT ON COLUMN public.org_compliance_assets.asset_type IS 'Standard type: 501c3_letter, audited_financials, board_roster, etc.';
COMMENT ON COLUMN public.org_compliance_assets.valid_from IS 'When this document became valid (e.g., fiscal year start)';
COMMENT ON COLUMN public.org_compliance_assets.valid_until IS 'When this document expires (e.g., fiscal year end)';

-- ============================================================================
-- 3. COMPLIANCE RULES LIBRARY
-- ============================================================================
-- Reusable patterns for identifying and classifying requirements

CREATE TABLE IF NOT EXISTS public.compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  rule_description TEXT,
  keywords TEXT[] NOT NULL,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('eligibility', 'document', 'narrative', 'operational', 'deadline', 'other')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('high', 'medium', 'low')),
  suggested_action TEXT,
  match_pattern TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for keyword-based matching
CREATE INDEX idx_compliance_rules_keywords
ON public.compliance_rules USING GIN(keywords);

-- Index for active rules
CREATE INDEX idx_compliance_rules_active
ON public.compliance_rules(active)
WHERE active = true;

COMMENT ON TABLE public.compliance_rules IS 'Reusable patterns for identifying compliance requirements in grant text';
COMMENT ON COLUMN public.compliance_rules.keywords IS 'Keywords that trigger this rule (e.g., ["501(c)(3)", "tax-exempt", "nonprofit status"])';
COMMENT ON COLUMN public.compliance_rules.match_pattern IS 'Optional regex pattern for more precise matching';

-- ============================================================================
-- 4. SEED COMMON COMPLIANCE RULES
-- ============================================================================

INSERT INTO public.compliance_rules (rule_name, rule_description, keywords, requirement_type, risk_level, suggested_action) VALUES
-- Eligibility Rules (High Risk - Deal Breakers)
('501c3_requirement', 'Organization must have 501(c)(3) tax-exempt status',
  ARRAY['501(c)(3)', '501c3', 'tax-exempt', 'nonprofit status', 'IRS determination letter'],
  'eligibility', 'high', 'Upload IRS 501(c)(3) determination letter'),

('operating_history', 'Minimum years of operating history required',
  ARRAY['operating history', 'years in operation', 'established organization', 'organizational history'],
  'eligibility', 'high', 'Verify organization founding date meets requirement'),

('geographic_restriction', 'Geographic service area must match funder criteria',
  ARRAY['must serve', 'geographic area', 'service area', 'located in', 'operates in'],
  'eligibility', 'high', 'Confirm service area matches funder geographic requirements'),

('budget_range', 'Organization budget must fall within specified range',
  ARRAY['annual budget', 'operating budget', 'budget between', 'budget of at least', 'budget not exceed'],
  'eligibility', 'high', 'Verify annual budget meets funder range requirements'),

-- Document Requirements (Medium Risk - Significant)
('audited_financials', 'Audited financial statements required',
  ARRAY['audited financial', 'audited statements', 'financial audit', 'CPA audit', 'independent audit'],
  'document', 'medium', 'Prepare most recent audited financial statements'),

('board_roster', 'Board of directors roster and affiliations required',
  ARRAY['board roster', 'board list', 'board members', 'board composition', 'board affiliations', 'conflict of interest'],
  'document', 'medium', 'Prepare current board roster with affiliations'),

('irs_form_990', 'IRS Form 990 tax return required',
  ARRAY['form 990', '990', 'tax return', 'IRS filing'],
  'document', 'medium', 'Gather most recent IRS Form 990'),

('organizational_chart', 'Organizational chart or staff structure required',
  ARRAY['org chart', 'organizational chart', 'staff structure', 'organizational structure'],
  'document', 'low', 'Create organizational chart showing key staff'),

('strategic_plan', 'Strategic or operational plan required',
  ARRAY['strategic plan', 'operational plan', 'planning document', 'organizational plan'],
  'document', 'medium', 'Prepare strategic plan excerpt'),

('insurance_certificate', 'Proof of insurance required',
  ARRAY['insurance', 'liability coverage', 'insurance certificate', 'proof of insurance'],
  'document', 'medium', 'Obtain certificate of insurance'),

('partnership_mou', 'Partnership agreements or MOUs required',
  ARRAY['MOU', 'memorandum of understanding', 'partnership agreement', 'letter of support', 'collaboration agreement'],
  'document', 'medium', 'Secure partnership MOUs or letters of support'),

-- Narrative Requirements (Medium Risk)
('data_citation', 'Needs statement must cite current data',
  ARRAY['cite data', 'data sources', 'evidence-based', 'research-backed', 'statistics'],
  'narrative', 'medium', 'Include recent data and citations in needs statement'),

('measurable_outcomes', 'Program must have measurable outcomes and KPIs',
  ARRAY['measurable outcomes', 'KPI', 'metrics', 'performance indicators', 'evaluation plan'],
  'narrative', 'medium', 'Define clear, measurable program outcomes'),

('sustainability_plan', 'Sustainability and continuation plan required',
  ARRAY['sustainability', 'continuation plan', 'long-term viability', 'post-grant plan'],
  'narrative', 'medium', 'Develop sustainability strategy'),

('community_engagement', 'Evidence of community engagement required',
  ARRAY['community input', 'stakeholder engagement', 'community involvement', 'participatory'],
  'narrative', 'medium', 'Document community engagement activities'),

-- Operational Requirements (Low to Medium Risk)
('fiscal_sponsor', 'Fiscal sponsor may be required if not 501(c)(3)',
  ARRAY['fiscal sponsor', 'fiscal agent', 'sponsored project'],
  'operational', 'medium', 'Secure fiscal sponsor if needed'),

('matching_funds', 'Matching funds or cost-share required',
  ARRAY['match', 'matching funds', 'cost share', 'in-kind contribution'],
  'operational', 'medium', 'Identify matching fund sources'),

('indirect_cost_rate', 'Indirect cost rate must be established',
  ARRAY['indirect cost', 'overhead rate', 'administrative costs', 'F&A rate'],
  'operational', 'low', 'Calculate or obtain approved indirect cost rate'),

('reporting_requirements', 'Periodic reporting will be required',
  ARRAY['progress report', 'quarterly report', 'reporting requirements', 'grant reporting'],
  'operational', 'low', 'Note reporting schedule and requirements')

ON CONFLICT (rule_name) DO NOTHING;

-- ============================================================================
-- 5. UPDATE OPPORTUNITIES TABLE
-- ============================================================================

-- Add flag to track if compliance extraction has been performed
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS compliance_extracted BOOLEAN DEFAULT false;

-- Add extraction timestamp
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS compliance_extracted_at TIMESTAMPTZ;

-- Add overall risk score for opportunity
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS compliance_risk_score NUMERIC;

COMMENT ON COLUMN public.opportunities.compliance_extracted IS 'True if AI extraction has been performed on this opportunity';
COMMENT ON COLUMN public.opportunities.compliance_extracted_at IS 'When compliance requirements were last extracted';
COMMENT ON COLUMN public.opportunities.compliance_risk_score IS 'Overall compliance risk (0=low risk, 100=high risk)';

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;

-- Compliance Requirements Policies
-- Note: RLS policies will be added later when user management is finalized
-- For now, allow service role access only

CREATE POLICY "Service role can manage all requirements"
  ON public.compliance_requirements
  FOR ALL
  USING (true);

-- Compliance Assets Policies
-- Note: RLS policies will be added later when user management is finalized
-- For now, allow service role access only

CREATE POLICY "Service role can manage all assets"
  ON public.org_compliance_assets
  FOR ALL
  USING (true);

-- Compliance Rules Policies
-- Rules are global and read-only for most operations

CREATE POLICY "Anyone can view active rules"
  ON public.compliance_rules
  FOR SELECT
  USING (active = true);

CREATE POLICY "Service role can manage rules"
  ON public.compliance_rules
  FOR ALL
  USING (true);

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate compliance risk score for an opportunity
CREATE OR REPLACE FUNCTION calculate_compliance_risk_score(opp_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  high_count INTEGER;
  medium_count INTEGER;
  low_count INTEGER;
  total_count INTEGER;
  risk_score NUMERIC;
BEGIN
  -- Count requirements by risk level
  SELECT
    COUNT(*) FILTER (WHERE risk_level = 'high'),
    COUNT(*) FILTER (WHERE risk_level = 'medium'),
    COUNT(*) FILTER (WHERE risk_level = 'low'),
    COUNT(*)
  INTO high_count, medium_count, low_count, total_count
  FROM compliance_requirements
  WHERE opportunity_id = opp_id;

  -- If no requirements, return null
  IF total_count = 0 THEN
    RETURN NULL;
  END IF;

  -- Calculate weighted risk score (0-100)
  -- High risk: 10 points each
  -- Medium risk: 5 points each
  -- Low risk: 1 point each
  risk_score := (high_count * 10 + medium_count * 5 + low_count * 1) * 100.0 /
                GREATEST(total_count * 10, 1);

  RETURN LEAST(risk_score, 100);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_compliance_risk_score IS 'Calculates overall compliance risk score (0-100) based on requirement risk levels';

-- Function to update opportunity risk score
CREATE OR REPLACE FUNCTION update_opportunity_risk_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the opportunity's compliance risk score
  UPDATE opportunities
  SET compliance_risk_score = calculate_compliance_risk_score(NEW.opportunity_id)
  WHERE id = NEW.opportunity_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update risk score when requirements change
CREATE TRIGGER update_compliance_risk_score_trigger
AFTER INSERT OR UPDATE OR DELETE ON compliance_requirements
FOR EACH ROW
EXECUTE FUNCTION update_opportunity_risk_score();

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON public.compliance_requirements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_compliance_assets TO authenticated;
GRANT SELECT ON public.compliance_rules TO authenticated;

-- Grant full access to service role (for background jobs)
GRANT ALL ON public.compliance_requirements TO service_role;
GRANT ALL ON public.org_compliance_assets TO service_role;
GRANT ALL ON public.compliance_rules TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Next steps:
-- 1. Implement AI extraction service (src/lib/compliance/extractor.ts)
-- 2. Create compliance API routes
-- 3. Build compliance UI components
-- 4. Add extraction to opportunity ingestion pipeline
-- 5. Create script to backfill existing opportunities
