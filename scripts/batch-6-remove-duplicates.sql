-- BATCH 6: Remove duplicates created by normalization
-- Run this after batch 5
-- This ensures arrays don't have duplicate values like ['education', 'education']

BEGIN;

UPDATE opportunities
SET focus_areas = (
  SELECT ARRAY(SELECT DISTINCT unnest(focus_areas))
)
WHERE array_length(focus_areas, 1) > 1;

COMMIT;

-- Final verification: Show clean focus area distribution
WITH expanded AS (
  SELECT unnest(focus_areas) as focus_area
  FROM opportunities
  WHERE organization_id IS NULL
    AND status != 'closed'
    AND (deadline >= CURRENT_DATE - INTERVAL '60 days' OR deadline IS NULL)
)
SELECT
  focus_area,
  COUNT(*) as opportunity_count
FROM expanded
GROUP BY focus_area
ORDER BY opportunity_count DESC;
