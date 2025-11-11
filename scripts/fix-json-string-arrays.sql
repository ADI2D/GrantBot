-- Fix JSON strings stored as array elements
-- Entries like '["ED","HL"]' are stored as a single text element in the array
-- instead of being parsed into proper array elements ["ED", "HL"]

-- First, let's see which records have this problem
SELECT
  id,
  focus_areas,
  focus_areas[1] as first_element,
  CASE
    WHEN focus_areas[1] LIKE '[%]' THEN 'JSON string detected'
    ELSE 'Normal array'
  END as status
FROM opportunities
WHERE focus_areas[1] LIKE '[%]'
LIMIT 10;

-- Now fix them by parsing the JSON string and converting to proper array
BEGIN;

UPDATE opportunities
SET focus_areas = (
  -- Parse the JSON string in the first element and convert to text array
  SELECT ARRAY(SELECT json_array_elements_text(focus_areas[1]::json))
)
WHERE
  array_length(focus_areas, 1) = 1
  AND focus_areas[1] LIKE '[%]'
  AND focus_areas[1] LIKE '%]';

COMMIT;

-- Verification: Check that we no longer have JSON strings
SELECT
  COUNT(*) as json_string_count
FROM opportunities
WHERE focus_areas[1] LIKE '[%]';
