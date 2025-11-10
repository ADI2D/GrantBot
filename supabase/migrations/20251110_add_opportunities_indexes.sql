-- Add indexes to improve opportunities query performance
-- These indexes will speed up the freelancer client opportunity matching

-- Index on focus_area for filtering opportunities by category
-- This is heavily used in the .in("focus_area", [...]) queries
CREATE INDEX IF NOT EXISTS idx_opportunities_focus_area
ON opportunities(focus_area);

-- Index on deadline for filtering by date range
-- Used in the .gte("deadline", date) queries
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline
ON opportunities(deadline);

-- Index on status to quickly filter out closed opportunities
-- Used in .neq("status", "closed") queries
CREATE INDEX IF NOT EXISTS idx_opportunities_status
ON opportunities(status);

-- Composite index for the common query pattern: focus_area + deadline + status
-- This will optimize the exact query pattern used in client matching:
-- WHERE focus_area IN (...) AND deadline >= date AND status != 'closed'
CREATE INDEX IF NOT EXISTS idx_opportunities_matching
ON opportunities(focus_area, deadline, status)
WHERE status != 'closed';

-- Show index creation results
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'opportunities'
ORDER BY indexname;
