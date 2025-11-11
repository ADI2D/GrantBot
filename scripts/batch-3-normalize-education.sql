-- BATCH 3: Normalize education-related codes
-- ED -> education (186 records)
-- ELT -> education (52 records)
-- Run this after batch 2

BEGIN;

-- ED to education
UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'ED', 'education')
WHERE 'ED' = ANY(focus_areas);

-- ELT to education
UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'ELT', 'education')
WHERE 'ELT' = ANY(focus_areas);

COMMIT;

-- Verify and show new education count
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
WHERE focus_area IN ('education', 'ED', 'ELT')
GROUP BY focus_area
ORDER BY opportunity_count DESC;
