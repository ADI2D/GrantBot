-- Add archived column to proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster filtering of archived proposals
CREATE INDEX IF NOT EXISTS idx_proposals_archived ON proposals(archived);
