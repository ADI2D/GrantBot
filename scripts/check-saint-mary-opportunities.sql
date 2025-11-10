-- Check Saint Mary University client details
SELECT
  id,
  name,
  focus_areas,
  status
FROM freelancer_clients
WHERE name ILIKE '%saint mary%'
LIMIT 5;

-- Check what focus_area values exist in opportunities
SELECT
  focus_area,
  COUNT(*) as count,
  MIN(deadline) as earliest_deadline,
  MAX(deadline) as latest_deadline
FROM opportunities
WHERE focus_area IS NOT NULL
GROUP BY focus_area
ORDER BY count DESC;

-- Check education opportunities specifically
SELECT
  COUNT(*) as education_count
FROM opportunities
WHERE focus_area = 'Education'
  AND deadline >= (CURRENT_DATE - INTERVAL '60 days')
  AND status != 'closed';

-- Check if there are ANY opportunities with Education (case variations)
SELECT
  focus_area,
  COUNT(*) as count
FROM opportunities
WHERE LOWER(focus_area) LIKE '%educ%'
GROUP BY focus_area;

-- Check the actual values stored in focus_areas for Saint Mary
SELECT
  focus_areas,
  array_length(focus_areas, 1) as array_length,
  focus_areas[1] as first_element
FROM freelancer_clients
WHERE name ILIKE '%saint mary%';
