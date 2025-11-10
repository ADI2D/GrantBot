-- Standardize all focus_area values to use display labels consistently
-- This fixes mixed casing and ID/label mismatches

-- Convert lowercase IDs to proper display labels
UPDATE opportunities
SET focus_area = 'Education'
WHERE focus_area = 'education';

UPDATE opportunities
SET focus_area = 'Health & Wellness'
WHERE focus_area IN ('health', 'Health', 'health-wellness');

UPDATE opportunities
SET focus_area = 'Environment & Animals'
WHERE focus_area IN ('environment', 'Environment');

UPDATE opportunities
SET focus_area = 'Research & Innovation'
WHERE focus_area IN ('research-science', 'Research', 'Science');

UPDATE opportunities
SET focus_area = 'Community Development'
WHERE focus_area IN ('community-development', 'Community');

UPDATE opportunities
SET focus_area = 'Arts & Culture'
WHERE focus_area IN ('arts-culture', 'Arts');

-- Check the final distribution
SELECT
  focus_area,
  COUNT(*) as count
FROM opportunities
GROUP BY focus_area
ORDER BY count DESC;
