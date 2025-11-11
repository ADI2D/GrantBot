-- Comprehensive focus area normalization script
-- This script normalizes ALL focus area data to use the standard taxonomy

-- Step 1: Create a mapping of old codes to new taxonomy IDs
-- Based on common grant database abbreviations:
-- ED = Education
-- HL = Health
-- ENV = Environment
-- NR = Natural Resources (map to environment)
-- AG = Agriculture (map to environment)
-- AR = Arts (map to arts-culture)
-- CD = Community Development
-- HU = Human Services
-- IS/ISS = International/International Services
-- O = Other
-- T = Technology (map to other)
-- LJL = Law/Justice/Legal (map to human-services)
-- FN = Finance (map to other)
-- ELT = Education/Literacy/Training (map to education)
-- HO = Housing (map to community-development)
-- EN = Energy (map to environment)
-- DPR = Disaster Preparedness/Relief (map to human-services)
-- BC = Business/Commerce (map to other)
-- CP = Capacity Building (map to other)
-- RD = Rural Development (map to community-development)
-- OZ = other (typo for O)
-- IIJ = International Justice (map to international)
-- ST = Science/Technology (map to research-science)

-- Step 2: Normalize string JSON arrays like ["ED","HL"] to proper arrays
-- These are stored as text, need to be parsed and converted

-- Step 3: Fix case sensitivity (Other -> other)

BEGIN;

-- First, let's handle the simple single-value cases (non-array text values)

-- Case sensitivity fixes
UPDATE opportunities
SET focus_areas = ARRAY['other']
WHERE 'Other' = ANY(focus_areas);

-- Map old abbreviation codes to new taxonomy IDs
UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'ED', 'education')
WHERE 'ED' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'HL', 'health')
WHERE 'HL' = ANY(focus_areas);

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
SET focus_areas = array_replace(focus_areas, 'AR', 'arts-culture')
WHERE 'AR' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'CD', 'community-development')
WHERE 'CD' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'HU', 'human-services')
WHERE 'HU' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'IS', 'international')
WHERE 'IS' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'ISS', 'international')
WHERE 'ISS' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'O', 'other')
WHERE 'O' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'T', 'research-science')
WHERE 'T' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'ST', 'research-science')
WHERE 'ST' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'LJL', 'human-services')
WHERE 'LJL' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'FN', 'other')
WHERE 'FN' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'ELT', 'education')
WHERE 'ELT' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'HO', 'community-development')
WHERE 'HO' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'EN', 'environment')
WHERE 'EN' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'DPR', 'human-services')
WHERE 'DPR' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'BC', 'other')
WHERE 'BC' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'CP', 'other')
WHERE 'CP' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'RD', 'community-development')
WHERE 'RD' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'OZ', 'other')
WHERE 'OZ' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'IIJ', 'international')
WHERE 'IIJ' = ANY(focus_areas);

-- Handle non-standard values
UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'Disaster Relief', 'human-services')
WHERE 'Disaster Relief' = ANY(focus_areas);

UPDATE opportunities
SET focus_areas = array_replace(focus_areas, 'youth-development', 'human-services')
WHERE 'youth-development' = ANY(focus_areas);

-- Remove duplicates from arrays after normalization
UPDATE opportunities
SET focus_areas = (
  SELECT ARRAY(SELECT DISTINCT unnest(focus_areas))
)
WHERE array_length(focus_areas, 1) > 0;

COMMIT;

-- Verification query - run this after to see the results
SELECT
  unnest(focus_areas) as focus_area,
  COUNT(*) as opportunity_count
FROM (
  SELECT unnest(focus_areas) as focus_area
  FROM opportunities
  WHERE organization_id IS NULL
    AND status != 'closed'
    AND (deadline >= CURRENT_DATE - INTERVAL '60 days' OR deadline IS NULL)
) as expanded
GROUP BY focus_area
ORDER BY opportunity_count DESC;
