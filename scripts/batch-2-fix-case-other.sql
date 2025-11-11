-- BATCH 2: Fix "Other" case sensitivity (67,880 records - biggest impact!)
-- Run this after batch 1

BEGIN;

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'Other', 'other')
WHERE 'Other' = ANY(focus_areas);

COMMIT;

-- Verify
SELECT COUNT(*) as remaining_uppercase_other
FROM opportunities
WHERE 'Other' = ANY(focus_areas);
