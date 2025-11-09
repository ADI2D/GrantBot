-- Part 2: Migrate data in small batches (run after Part 1)
-- This converts existing focus_area to focus_areas array

-- Migrate opportunities data in batches to avoid timeout
-- Only update rows that haven't been migrated yet
UPDATE public.opportunities
SET focus_areas = ARRAY[focus_area]
WHERE focus_area IS NOT NULL
  AND focus_area != ''
  AND (focus_areas IS NULL OR array_length(focus_areas, 1) IS NULL OR array_length(focus_areas, 1) = 0);

-- Verify migration
-- SELECT COUNT(*) as migrated_count
-- FROM public.opportunities
-- WHERE focus_areas IS NOT NULL AND array_length(focus_areas, 1) > 0;
