-- BATCH 5: Normalize remaining codes
-- Run this after batch 4

BEGIN;

-- Arts & Culture
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'AR', 'arts-culture') WHERE 'AR' = ANY(focus_areas);

-- Community Development
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'CD', 'community-development') WHERE 'CD' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'HO', 'community-development') WHERE 'HO' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'RD', 'community-development') WHERE 'RD' = ANY(focus_areas);

-- Human Services
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'HU', 'human-services') WHERE 'HU' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'LJL', 'human-services') WHERE 'LJL' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'DPR', 'human-services') WHERE 'DPR' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'Disaster Relief', 'human-services') WHERE 'Disaster Relief' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'youth-development', 'human-services') WHERE 'youth-development' = ANY(focus_areas);

-- International
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'IS', 'international') WHERE 'IS' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'ISS', 'international') WHERE 'ISS' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'IIJ', 'international') WHERE 'IIJ' = ANY(focus_areas);

-- Research & Science
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'T', 'research-science') WHERE 'T' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'ST', 'research-science') WHERE 'ST' = ANY(focus_areas);

-- Other
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'O', 'other') WHERE 'O' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'FN', 'other') WHERE 'FN' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'BC', 'other') WHERE 'BC' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'CP', 'other') WHERE 'CP' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'OZ', 'other') WHERE 'OZ' = ANY(focus_areas);

COMMIT;
