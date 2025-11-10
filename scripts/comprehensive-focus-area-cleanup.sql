-- Comprehensive Focus Area Cleanup Script
-- This handles abbreviations, JSON arrays, and mixed case values

-- First, standardize common abbreviations to display labels
UPDATE opportunities SET focus_area = 'Health & Wellness' WHERE focus_area = 'HL';
UPDATE opportunities SET focus_area = 'Education' WHERE focus_area = 'ED';
UPDATE opportunities SET focus_area = 'Environment & Animals' WHERE focus_area = 'ENV';
UPDATE opportunities SET focus_area = 'Research & Innovation' WHERE focus_area IN ('NR', 'ST', 'RD');
UPDATE opportunities SET focus_area = 'Community Development' WHERE focus_area = 'CD';
UPDATE opportunities SET focus_area = 'Arts & Culture' WHERE focus_area = 'AR';
UPDATE opportunities SET focus_area = 'Energy' WHERE focus_area = 'EN';
UPDATE opportunities SET focus_area = 'Humanities' WHERE focus_area = 'HU';
UPDATE opportunities SET focus_area = 'Transportation' WHERE focus_area = 'T';
UPDATE opportunities SET focus_area = 'Disaster Relief' WHERE focus_area = 'DPR';
UPDATE opportunities SET focus_area = 'Employment & Training' WHERE focus_area = 'ELT';
UPDATE opportunities SET focus_area = 'Housing' WHERE focus_area = 'HO';
UPDATE opportunities SET focus_area = 'Legal & Justice' WHERE focus_area = 'LJL';
UPDATE opportunities SET focus_area = 'Food & Nutrition' WHERE focus_area = 'FN';
UPDATE opportunities SET focus_area = 'Social Services' WHERE focus_area = 'ISS';
UPDATE opportunities SET focus_area = 'Business & Commerce' WHERE focus_area = 'BC';

-- Handle lowercase variations
UPDATE opportunities SET focus_area = 'Other' WHERE focus_area IN ('other', 'O', 'OZ');

-- Handle JSON arrays - set them all to 'Other' for now since they represent multiple categories
-- and the recategorization script will reassign them based on keywords
UPDATE opportunities SET focus_area = 'Other' WHERE focus_area LIKE '[%';

-- Check final distribution
SELECT
  focus_area,
  COUNT(*) as count
FROM opportunities
GROUP BY focus_area
ORDER BY count DESC;
