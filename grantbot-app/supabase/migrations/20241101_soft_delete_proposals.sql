-- ============================================================================
-- SOFT DELETE FOR PROPOSALS
-- ============================================================================
-- Add soft delete functionality to proposals table
-- ============================================================================

-- Add deleted_at column to proposals
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add index for efficient filtering of non-deleted proposals
CREATE INDEX IF NOT EXISTS idx_proposals_deleted_at
ON proposals(deleted_at)
WHERE deleted_at IS NULL;

-- Add index for finding recently deleted proposals (for recovery/cleanup)
CREATE INDEX IF NOT EXISTS idx_proposals_deleted_at_recent
ON proposals(deleted_at)
WHERE deleted_at IS NOT NULL;

-- Add comment explaining the soft delete pattern
COMMENT ON COLUMN proposals.deleted_at IS
'Soft delete timestamp. When set, proposal is considered deleted but retained for recovery/audit. NULL means active proposal.';
