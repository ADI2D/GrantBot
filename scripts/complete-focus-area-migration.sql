-- Complete Focus Area Migration Script
-- This script performs a comprehensive cleanup of all focus area data
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Fix JSON strings stored as array elements
-- ============================================================================
-- Entries like '["ED","HL"]' stored as single text element in array
-- Convert these to proper arrays: ["ED", "HL"]

BEGIN;

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Fix JSON string arrays
  UPDATE opportunities
  SET focus_areas = (
    SELECT ARRAY(SELECT json_array_elements_text(focus_areas[1]::json))
  )
  WHERE
    array_length(focus_areas, 1) = 1
    AND focus_areas[1] LIKE '[%]'
    AND focus_areas[1] LIKE '%]';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Step 1: Fixed % JSON string arrays', updated_count;
END $$;

COMMIT;

-- ============================================================================
-- STEP 2: Normalize old abbreviation codes to new taxonomy IDs
-- ============================================================================

BEGIN;

-- Mapping of old codes to new taxonomy:
-- ED/ELT -> education
-- HL -> health
-- ENV/NR/AG/EN -> environment
-- AR -> arts-culture
-- CD/HO/RD -> community-development
-- HU/LJL/DPR -> human-services
-- IS/ISS/IIJ -> international
-- T/ST -> research-science
-- O/FN/BC/CP/OZ -> other

-- Case sensitivity fix
UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'Other', 'other')
WHERE 'Other' = ANY(focus_areas);

-- Education
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'ED', 'education') WHERE 'ED' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'ELT', 'education') WHERE 'ELT' = ANY(focus_areas);

-- Health
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'HL', 'health') WHERE 'HL' = ANY(focus_areas);

-- Environment
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'ENV', 'environment') WHERE 'ENV' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'NR', 'environment') WHERE 'NR' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'AG', 'environment') WHERE 'AG' = ANY(focus_areas);
UPDATE opportunities SET focus_areas = array_replace(focus_areas, 'EN', 'environment') WHERE 'EN' = ANY(focus_areas);

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

-- ============================================================================
-- STEP 3: Remove duplicates created by normalization
-- ============================================================================

BEGIN;

UPDATE opportunities
SET focus_areas = (
  SELECT ARRAY(SELECT DISTINCT unnest(focus_areas))
)
WHERE array_length(focus_areas, 1) > 0;

COMMIT;

-- ============================================================================
-- VERIFICATION: Show the new distribution
-- ============================================================================

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
