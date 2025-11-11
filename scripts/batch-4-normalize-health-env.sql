-- BATCH 4: Normalize health and environment codes
-- HL -> health (426 records)
-- ENV -> environment (202 records)
-- NR -> environment (426 records)
-- AG -> environment (55 records)
-- EN -> environment (61 records)
-- Run this after batch 3

BEGIN;

-- Health
UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'HL', 'health')
WHERE 'HL' = ANY(focus_areas);

-- Environment codes
UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'ENV', 'environment')
WHERE 'ENV' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'NR', 'environment')
WHERE 'NR' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'AG', 'environment')
WHERE 'AG' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'EN', 'environment')
WHERE 'EN' = ANY(focus_areas);

COMMIT;

-- Verify
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
WHERE focus_area IN ('health', 'HL', 'environment', 'ENV', 'NR', 'AG', 'EN')
GROUP BY focus_area
ORDER BY opportunity_count DESC;
