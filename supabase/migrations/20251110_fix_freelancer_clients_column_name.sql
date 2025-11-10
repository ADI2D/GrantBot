-- Fix column name mismatch in freelancer_clients table
-- The original migration created the column as 'freelancer_id'
-- but the codebase expects 'freelancer_user_id'

-- Step 1: Rename the column
ALTER TABLE public.freelancer_clients
  RENAME COLUMN freelancer_id TO freelancer_user_id;

-- Step 2: Update the index to use the correct column name
-- Drop old index if it exists
DROP INDEX IF EXISTS idx_freelancer_clients_freelancer;

-- Create new index with correct column name
CREATE INDEX IF NOT EXISTS idx_freelancer_clients_freelancer
  ON public.freelancer_clients(freelancer_user_id);

-- Step 3: Update RLS policies to use the correct column name
DROP POLICY IF EXISTS "freelancers can manage their own clients" ON public.freelancer_clients;
CREATE POLICY "freelancers can manage their own clients"
  ON public.freelancer_clients
  FOR ALL
  USING (auth.uid() = freelancer_user_id)
  WITH CHECK (auth.uid() = freelancer_user_id);

-- Step 4: Add comment to clarify the column
COMMENT ON COLUMN public.freelancer_clients.freelancer_user_id IS 'Foreign key to auth.users(id) - the freelancer who owns this client';
