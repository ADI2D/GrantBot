-- ============================================================================
-- OPPORTUNITY FULL-TEXT SEARCH (OPTIMIZED)
-- ============================================================================
-- Adds full-text search capability to opportunities table for fast searching
-- across name, funder_name, focus_area, and compliance_notes fields
--
-- This version uses batched updates to avoid timeout on large datasets
-- ============================================================================

-- Step 1: Add tsvector column for full-text search
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Step 2: Create function to update search vector
CREATE OR REPLACE FUNCTION opportunities_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.funder_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.focus_area, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.compliance_notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to automatically update search_vector on insert/update
DROP TRIGGER IF EXISTS opportunities_search_vector_trigger ON opportunities;
CREATE TRIGGER opportunities_search_vector_trigger
BEFORE INSERT OR UPDATE ON opportunities
FOR EACH ROW
EXECUTE FUNCTION opportunities_search_vector_update();

-- Step 4: Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS opportunities_search_vector_idx
ON opportunities USING GIN (search_vector);

-- Step 5: Add additional helpful indexes for filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_amount
ON opportunities(amount)
WHERE amount IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_geographic_scope
ON opportunities(geographic_scope)
WHERE geographic_scope IS NOT NULL;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN opportunities.search_vector IS 'Full-text search vector: A=name (highest weight), B=funder_name, C=focus_area, D=compliance_notes (lowest weight)';
COMMENT ON INDEX opportunities_search_vector_idx IS 'GIN index for fast full-text search across opportunity fields';

-- ============================================================================
-- BACKFILL STRATEGY (Run separately after migration)
-- ============================================================================
-- The backfill is intentionally separated to avoid timeout issues.
-- Run the backfill script after this migration completes:
--
-- Option 1: Run in batches via script
--   npx tsx scripts/backfill-search-vectors.ts
--
-- Option 2: Manual batched updates (run these one at a time in SQL Editor)
--
-- Batch 1 (0-10000):
-- UPDATE opportunities SET search_vector =
--   setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
--   setweight(to_tsvector('english', COALESCE(funder_name, '')), 'B') ||
--   setweight(to_tsvector('english', COALESCE(focus_area, '')), 'C') ||
--   setweight(to_tsvector('english', COALESCE(compliance_notes, '')), 'D')
-- WHERE search_vector IS NULL
-- LIMIT 10000;
--
-- Batch 2 (10001-20000):
-- UPDATE opportunities SET search_vector =
--   setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
--   setweight(to_tsvector('english', COALESCE(funder_name, '')), 'B') ||
--   setweight(to_tsvector('english', COALESCE(focus_area, '')), 'C') ||
--   setweight(to_tsvector('english', COALESCE(compliance_notes, '')), 'D')
-- WHERE search_vector IS NULL
-- LIMIT 10000;
--
-- Repeat until: SELECT COUNT(*) FROM opportunities WHERE search_vector IS NULL; returns 0
-- ============================================================================
