-- ============================================================================
-- FIX GRANTS.GOV URL FORMAT
-- ============================================================================
-- Update application URLs from old format to new format
-- Old: https://www.grants.gov/web/grants/view-opportunity.html?oppId=312633
-- New: https://www.grants.gov/search-results-detail/312633
-- ============================================================================

-- Update opportunities that use the old URL format
UPDATE opportunities
SET application_url = REGEXP_REPLACE(
  application_url,
  'https://www\.grants\.gov/web/grants/view-opportunity\.html\?oppId=(\d+)',
  'https://www.grants.gov/search-results-detail/\1'
)
WHERE application_url LIKE '%grants.gov/web/grants/view-opportunity.html%';

-- Verification query (check how many URLs were updated)
-- Run this to verify the migration worked:
-- SELECT
--   COUNT(*) as total_grants_gov_opportunities,
--   COUNT(*) FILTER (WHERE application_url LIKE '%search-results-detail%') as new_format,
--   COUNT(*) FILTER (WHERE application_url LIKE '%view-opportunity.html%') as old_format
-- FROM opportunities
-- WHERE source = 'grants_gov';
