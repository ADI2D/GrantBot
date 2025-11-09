-- Create freelancer_time_entries table for time tracking
CREATE TABLE IF NOT EXISTS freelancer_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES freelancer_clients(id) ON DELETE CASCADE,
  proposal_id TEXT REFERENCES freelancer_proposals(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time_in TIME NOT NULL,
  time_out TIME NOT NULL,
  hours_worked DECIMAL(5,2) GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (time_out - time_in)) / 3600
  ) STORED,
  billable_rate DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (
    (EXTRACT(EPOCH FROM (time_out - time_in)) / 3600) * billable_rate
  ) STORED,
  notes TEXT,
  is_invoiced BOOLEAN NOT NULL DEFAULT false,
  invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_time_entries_freelancer_user
  ON freelancer_time_entries(freelancer_user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_client
  ON freelancer_time_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_proposal
  ON freelancer_time_entries(proposal_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date
  ON freelancer_time_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_is_invoiced
  ON freelancer_time_entries(is_invoiced);

-- Add check constraint to ensure time_out is after time_in (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_time_out_after_time_in'
    AND conrelid = 'freelancer_time_entries'::regclass
  ) THEN
    ALTER TABLE freelancer_time_entries
      ADD CONSTRAINT check_time_out_after_time_in CHECK (time_out > time_in);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE freelancer_time_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Freelancers can manage their own time entries
DROP POLICY IF EXISTS "freelancers manage own time entries" ON freelancer_time_entries;
CREATE POLICY "freelancers manage own time entries"
  ON freelancer_time_entries
  FOR ALL
  USING (auth.uid() = freelancer_user_id)
  WITH CHECK (auth.uid() = freelancer_user_id);

-- Add comments for documentation
COMMENT ON TABLE freelancer_time_entries IS 'Time tracking entries for freelancer billable hours';
COMMENT ON COLUMN freelancer_time_entries.hours_worked IS 'Automatically calculated from time_in and time_out';
COMMENT ON COLUMN freelancer_time_entries.total_amount IS 'Automatically calculated as hours_worked * billable_rate';
COMMENT ON COLUMN freelancer_time_entries.is_invoiced IS 'Whether this entry has been included in an invoice';
COMMENT ON COLUMN freelancer_time_entries.invoice_id IS 'Reference to the invoice that includes this entry';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_freelancer_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS set_freelancer_time_entries_updated_at ON freelancer_time_entries;
CREATE TRIGGER set_freelancer_time_entries_updated_at
  BEFORE UPDATE ON freelancer_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_freelancer_time_entries_updated_at();
