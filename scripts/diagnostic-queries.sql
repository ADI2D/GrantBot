-- ============================================================================
-- COMPLIANCE STATUS DIAGNOSTIC QUERIES
-- Run these in Supabase SQL Editor to understand compliance extraction status
-- ============================================================================

-- 1. OVERALL STATUS
-- ============================================================================
SELECT
  COUNT(*) as total_opportunities,
  COUNT(CASE WHEN compliance_extracted = true THEN 1 END) as extracted,
  COUNT(CASE WHEN compliance_risk_score IS NOT NULL THEN 1 END) as with_risk_scores,
  COUNT(CASE WHEN compliance_risk_score >= 60 THEN 1 END) as high_risk,
  COUNT(CASE WHEN compliance_risk_score >= 30 AND compliance_risk_score < 60 THEN 1 END) as medium_risk,
  COUNT(CASE WHEN compliance_risk_score >= 0 AND compliance_risk_score < 30 THEN 1 END) as low_risk
FROM opportunities;

-- 2. RISK SCORE DISTRIBUTION
-- ============================================================================
SELECT
  CASE
    WHEN compliance_risk_score IS NULL THEN 'No Score'
    WHEN compliance_risk_score >= 60 THEN 'High (60+)'
    WHEN compliance_risk_score >= 30 THEN 'Medium (30-59)'
    ELSE 'Low (0-29)'
  END as risk_category,
  COUNT(*) as count
FROM opportunities
GROUP BY risk_category
ORDER BY
  CASE
    WHEN compliance_risk_score IS NULL THEN 4
    WHEN compliance_risk_score >= 60 THEN 1
    WHEN compliance_risk_score >= 30 THEN 2
    ELSE 3
  END;

-- 3. VISIBLE OPPORTUNITIES (deadline >= today)
-- ============================================================================
SELECT
  COUNT(*) as total_visible,
  COUNT(CASE WHEN compliance_risk_score IS NOT NULL THEN 1 END) as with_risk_scores,
  COUNT(CASE WHEN compliance_risk_score >= 60 THEN 1 END) as high_risk,
  COUNT(CASE WHEN compliance_risk_score >= 30 AND compliance_risk_score < 60 THEN 1 END) as medium_risk,
  COUNT(CASE WHEN compliance_risk_score >= 0 AND compliance_risk_score < 30 THEN 1 END) as low_risk
FROM opportunities
WHERE
  status NOT ILIKE 'closed'
  AND (deadline >= CURRENT_DATE OR deadline IS NULL);

-- 4. SAMPLE OPPORTUNITIES WITH HIGH RISK SCORES
-- ============================================================================
SELECT
  name,
  compliance_risk_score,
  deadline,
  funder_name
FROM opportunities
WHERE compliance_risk_score IS NOT NULL
ORDER BY compliance_risk_score DESC
LIMIT 10;

-- 5. SAMPLE VISIBLE OPPORTUNITIES
-- ============================================================================
SELECT
  name,
  deadline,
  compliance_risk_score,
  compliance_extracted,
  CASE
    WHEN compliance_notes IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_compliance_notes,
  CASE
    WHEN eligibility_requirements IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_eligibility
FROM opportunities
WHERE
  status NOT ILIKE 'closed'
  AND (deadline >= CURRENT_DATE OR deadline IS NULL)
ORDER BY deadline ASC
LIMIT 10;

-- 6. COMPLIANCE REQUIREMENTS STATS
-- ============================================================================
SELECT
  COUNT(DISTINCT opportunity_id) as opportunities_with_requirements,
  COUNT(*) as total_requirements,
  COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk_reqs,
  COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk_reqs,
  COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk_reqs
FROM compliance_requirements;

-- 7. CHECK IF RISK SCORE TRIGGER IS WORKING
-- ============================================================================
-- This shows opportunities with requirements but no risk score (trigger issue)
SELECT
  o.id,
  o.name,
  o.compliance_risk_score,
  COUNT(cr.id) as requirement_count
FROM opportunities o
LEFT JOIN compliance_requirements cr ON cr.opportunity_id = o.id
GROUP BY o.id, o.name, o.compliance_risk_score
HAVING COUNT(cr.id) > 0 AND o.compliance_risk_score IS NULL
LIMIT 10;

-- 8. MANUALLY RECALCULATE RISK SCORES (if trigger isn't working)
-- ============================================================================
-- Run this to manually update all risk scores
UPDATE opportunities o
SET compliance_risk_score = (
  SELECT
    LEAST(
      (
        COUNT(*) FILTER (WHERE risk_level = 'high') * 10 +
        COUNT(*) FILTER (WHERE risk_level = 'medium') * 5 +
        COUNT(*) FILTER (WHERE risk_level = 'low') * 1
      ) * 100.0 / GREATEST(COUNT(*) * 10, 1),
      100
    )
  FROM compliance_requirements cr
  WHERE cr.opportunity_id = o.id
)
WHERE EXISTS (
  SELECT 1 FROM compliance_requirements cr
  WHERE cr.opportunity_id = o.id
);
