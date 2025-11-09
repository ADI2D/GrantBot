-- Part 3: Add performance indexes (simplified)
-- Run after Part 2

-- GIN indexes for array operations (fast array searching)
CREATE INDEX IF NOT EXISTS idx_opportunities_focus_areas
  ON public.opportunities USING GIN (focus_areas);

CREATE INDEX IF NOT EXISTS idx_organizations_focus_areas
  ON public.organizations USING GIN (focus_areas);

-- Composite index for common query pattern (removed date predicate)
CREATE INDEX IF NOT EXISTS idx_opportunities_status_deadline
  ON public.opportunities (status, deadline DESC);

-- Single column indexes for filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_geo
  ON public.opportunities (geographic_scope)
  WHERE geographic_scope IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_amount
  ON public.opportunities (amount)
  WHERE amount IS NOT NULL;

-- Create helper view for efficient queries
CREATE OR REPLACE VIEW public.opportunities_with_focus_match AS
SELECT
  o.*,
  CASE
    WHEN o.focus_areas IS NULL OR array_length(o.focus_areas, 1) IS NULL THEN 0
    ELSE array_length(o.focus_areas, 1)
  END as focus_area_count
FROM public.opportunities o;

COMMENT ON VIEW public.opportunities_with_focus_match IS 'Opportunities with focus area metadata for efficient matching';
