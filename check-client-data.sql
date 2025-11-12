-- Check client focus areas and related opportunities
-- Replace the client_id with your actual client ID

-- 1. Check the client's focus areas
SELECT id, name, focus_areas, primary_focus_area
FROM freelancer_clients
WHERE id = 'b8c6c695-0968-43fa-814b-658bde8b97d0';

-- 2. Check how many opportunities match those focus areas
SELECT focus_area, COUNT(*) as count
FROM opportunities
WHERE focus_area = ANY(
  SELECT unnest(focus_areas)
  FROM freelancer_clients
  WHERE id = 'b8c6c695-0968-43fa-814b-658bde8b97d0'
)
AND deadline >= (CURRENT_DATE - INTERVAL '60 days')
AND status != 'closed'
GROUP BY focus_area;

-- 3. Sample of opportunities with their focus areas
SELECT id, name, focus_area, deadline
FROM opportunities
WHERE deadline >= (CURRENT_DATE - INTERVAL '60 days')
AND status != 'closed'
LIMIT 10;
