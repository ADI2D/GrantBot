-- Check what focus_area values actually exist in opportunities table
SELECT
  focus_area,
  COUNT(*) as count,
  MIN(deadline) as earliest_deadline,
  MAX(deadline) as latest_deadline
FROM opportunities
WHERE deadline >= (CURRENT_DATE - INTERVAL '60 days')
  AND status != 'closed'
GROUP BY focus_area
ORDER BY count DESC
LIMIT 20;

-- Check total count of opportunities
SELECT COUNT(*) as total_opportunities
FROM opportunities
WHERE deadline >= (CURRENT_DATE - INTERVAL '60 days')
  AND status != 'closed';

-- Check if any opportunities exist at all
SELECT COUNT(*) as all_opportunities
FROM opportunities;

-- Sample some opportunities to see their focus_area values
SELECT
  id,
  name,
  focus_area,
  deadline,
  status,
  funder_name
FROM opportunities
ORDER BY deadline DESC
LIMIT 10;
