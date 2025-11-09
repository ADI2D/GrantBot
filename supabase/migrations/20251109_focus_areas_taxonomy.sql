-- Add focus areas taxonomy system for better matching and performance
-- This migration adds focus_areas as arrays to organizations and opportunities

-- Step 1: Add focus_areas array columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS focus_areas text[] DEFAULT '{}';

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS focus_areas text[] DEFAULT '{}';

-- Step 2: Migrate existing focus_area (singular) to focus_areas (array)
-- For opportunities, convert the existing focus_area field
UPDATE public.opportunities
SET focus_areas = ARRAY[focus_area]
WHERE focus_area IS NOT NULL AND focus_area != '';

-- Step 3: Add performance indexes
-- GIN index for array contains/overlap queries (fast focus area matching)
CREATE INDEX IF NOT EXISTS idx_opportunities_focus_areas
  ON public.opportunities USING GIN (focus_areas);

CREATE INDEX IF NOT EXISTS idx_organizations_focus_areas
  ON public.organizations USING GIN (focus_areas);

-- Composite index for common query pattern: active opportunities with deadlines
CREATE INDEX IF NOT EXISTS idx_opportunities_active_deadline
  ON public.opportunities (status, deadline DESC)
  WHERE status IN ('open', 'Open') AND deadline >= CURRENT_DATE;

-- Index for geographic filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_geo
  ON public.opportunities (geographic_scope)
  WHERE geographic_scope IS NOT NULL;

-- Index for amount range queries
CREATE INDEX IF NOT EXISTS idx_opportunities_amount
  ON public.opportunities (amount)
  WHERE amount IS NOT NULL;

-- Step 4: Add lookup table for valid focus areas (reference data)
CREATE TABLE IF NOT EXISTS public.focus_area_taxonomy (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text,
  ntee_codes text[], -- Map to NTEE codes for 990 matching later
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert standard focus areas
INSERT INTO public.focus_area_taxonomy (id, label, description, ntee_codes, sort_order) VALUES
  ('arts-culture', 'Arts & Culture', 'Museums, performing arts, cultural programs, humanities', ARRAY['A'], 1),
  ('education', 'Education', 'K-12, higher education, literacy, vocational training', ARRAY['B'], 2),
  ('environment', 'Environment & Animals', 'Conservation, climate, wildlife, sustainability', ARRAY['C', 'D'], 3),
  ('health', 'Health & Wellness', 'Healthcare, mental health, public health, substance abuse', ARRAY['E', 'F', 'G'], 4),
  ('human-services', 'Human Services', 'Social services, homelessness, food security, family support', ARRAY['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'], 5),
  ('youth-development', 'Youth Development', 'Youth programs, mentoring, after-school, camps', ARRAY['O', 'P'], 6),
  ('community-development', 'Community Development', 'Housing, economic development, community building, neighborhood improvement', ARRAY['L', 'S'], 7),
  ('research-science', 'Research & Science', 'Scientific research, STEM education, technology innovation', ARRAY['U', 'H'], 8),
  ('international', 'International', 'International development, global health, foreign aid', ARRAY['Q'], 9),
  ('other', 'Other', 'Other causes and programs not listed above', ARRAY['Y', 'Z'], 10)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  ntee_codes = EXCLUDED.ntee_codes,
  sort_order = EXCLUDED.sort_order;

-- Step 5: Add helper function for focus area overlap scoring
CREATE OR REPLACE FUNCTION calculate_focus_area_match_score(
  org_areas text[],
  opp_areas text[]
) RETURNS numeric AS $$
DECLARE
  overlap_count integer;
  org_count integer;
  opp_count integer;
BEGIN
  -- Count overlapping areas
  SELECT COUNT(*) INTO overlap_count
  FROM unnest(org_areas) AS org_area
  WHERE org_area = ANY(opp_areas);

  -- Get counts
  org_count := array_length(org_areas, 1);
  opp_count := array_length(opp_areas, 1);

  -- Handle null/empty arrays
  IF org_count IS NULL OR org_count = 0 THEN RETURN 0; END IF;
  IF opp_count IS NULL OR opp_count = 0 THEN RETURN 0; END IF;
  IF overlap_count = 0 THEN RETURN 0; END IF;

  -- Scoring logic:
  -- If opportunity matches ALL of org's areas: 100%
  -- If opportunity matches SOME of org's areas: percentage based on overlap
  -- Opportunities with exact match (all areas) should rank higher

  IF overlap_count = org_count AND overlap_count = opp_count THEN
    -- Perfect match: both have same areas
    RETURN 100.0;
  ELSIF overlap_count = opp_count THEN
    -- Opportunity areas are subset of org areas: 100% (opp fully matches)
    RETURN 100.0;
  ELSE
    -- Partial match: score based on overlap percentage
    RETURN (overlap_count::numeric / org_count::numeric) * 100.0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Add comment documentation
COMMENT ON COLUMN public.organizations.focus_areas IS 'Primary focus areas for the organization (array of focus_area_taxonomy.id values)';
COMMENT ON COLUMN public.opportunities.focus_areas IS 'Focus areas for this opportunity (array of focus_area_taxonomy.id values)';
COMMENT ON TABLE public.focus_area_taxonomy IS 'Standard taxonomy of focus areas for matching organizations to opportunities';
COMMENT ON FUNCTION calculate_focus_area_match_score IS 'Calculate match score (0-100) between org and opportunity focus areas. Returns 100 for complete matches, proportional score for partial matches.';

-- Step 7: Create view for opportunities with pre-calculated match scores (optional, for future use)
-- This can be used for faster filtering later
CREATE OR REPLACE VIEW public.opportunities_with_focus_match AS
SELECT
  o.*,
  CASE
    WHEN o.focus_areas IS NULL OR array_length(o.focus_areas, 1) IS NULL THEN 0
    ELSE array_length(o.focus_areas, 1)
  END as focus_area_count
FROM public.opportunities o;

COMMENT ON VIEW public.opportunities_with_focus_match IS 'Opportunities with focus area metadata for efficient matching';
