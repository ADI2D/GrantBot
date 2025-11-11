-- BATCH 1: Fix JSON strings stored as array elements (highest impact first)
-- This fixes entries like '["ED","HL"]' stored as single text elements
-- Run this first, then proceed to batch 2

BEGIN;

UPDATE opportunities
SET focus_areas = (
  SELECT ARRAY(SELECT json_array_elements_text(focus_areas[1]::json))
)
WHERE
  array_length(focus_areas, 1) = 1
  AND focus_areas[1] LIKE '[%]'
  AND focus_areas[1] LIKE '%]'
  AND id IN (
    -- Process only first 5000 records
    SELECT id FROM opportunities
    WHERE array_length(focus_areas, 1) = 1
      AND focus_areas[1] LIKE '[%]'
      AND focus_areas[1] LIKE '%]'
    LIMIT 5000
  );

COMMIT;

-- Check how many are left
SELECT COUNT(*) as remaining_json_strings
FROM opportunities
WHERE array_length(focus_areas, 1) = 1
  AND focus_areas[1] LIKE '[%]'
  AND focus_areas[1] LIKE '%]';
