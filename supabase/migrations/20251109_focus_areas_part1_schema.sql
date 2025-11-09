-- Part 1: Add columns and tables only (fast, no data updates)
-- Run this first

-- Step 1: Add focus_areas array columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS focus_areas text[] DEFAULT '{}';

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS focus_areas text[] DEFAULT '{}';

-- Step 2: Add lookup table for valid focus areas
CREATE TABLE IF NOT EXISTS public.focus_area_taxonomy (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text,
  ntee_codes text[],
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

-- Step 3: Add helper function for focus area overlap scoring
CREATE OR REPLACE FUNCTION calculate_focus_area_match_score(
  org_areas text[],
  opp_areas text[]
) RETURNS numeric AS $$
DECLARE
  overlap_count integer;
  org_count integer;
  opp_count integer;
BEGIN
  SELECT COUNT(*) INTO overlap_count
  FROM unnest(org_areas) AS org_area
  WHERE org_area = ANY(opp_areas);

  org_count := array_length(org_areas, 1);
  opp_count := array_length(opp_areas, 1);

  IF org_count IS NULL OR org_count = 0 THEN RETURN 0; END IF;
  IF opp_count IS NULL OR opp_count = 0 THEN RETURN 0; END IF;
  IF overlap_count = 0 THEN RETURN 0; END IF;

  IF overlap_count = org_count AND overlap_count = opp_count THEN
    RETURN 100.0;
  ELSIF overlap_count = opp_count THEN
    RETURN 100.0;
  ELSE
    RETURN (overlap_count::numeric / org_count::numeric) * 100.0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comments
COMMENT ON COLUMN public.organizations.focus_areas IS 'Primary focus areas (array of focus_area_taxonomy.id values)';
COMMENT ON COLUMN public.opportunities.focus_areas IS 'Focus areas (array of focus_area_taxonomy.id values)';
COMMENT ON TABLE public.focus_area_taxonomy IS 'Standard taxonomy of focus areas for matching';
COMMENT ON FUNCTION calculate_focus_area_match_score IS 'Calculate match score (0-100) between org and opportunity focus areas';
