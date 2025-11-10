-- Fix column name mismatch in freelancer_clients table
-- The original migration created the column as 'freelancer_id'
-- but the codebase expects 'freelancer_user_id'

-- Step 1: Check if table exists, if not create it with correct column name
DO $$
BEGIN
  -- Create table if it doesn't exist (with correct column name)
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'freelancer_clients') THEN
    CREATE TABLE public.freelancer_clients (
      id uuid primary key default gen_random_uuid(),
      freelancer_user_id uuid not null references auth.users(id) on delete cascade,
      organization_id uuid references public.organizations(id) on delete set null,

      -- Client info
      name text not null,
      status text default 'active' check (status in ('active', 'completed', 'inactive')),

      -- Contact info
      primary_contact_name text,
      primary_contact_email text,
      mission text,
      annual_budget numeric,

      -- Focus areas (standardized)
      focus_areas text[] default '{}',
      primary_focus_area text,
      focus_description text,

      -- Billing
      plan_name text,
      billing_rate numeric,

      -- Optional fields
      like_us boolean default false,

      -- Timestamps
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      last_activity_at timestamptz
    );

    RAISE NOTICE 'Created freelancer_clients table with freelancer_user_id column';
  END IF;

  -- Step 2: Rename column if it exists as freelancer_id
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'freelancer_clients'
    AND column_name = 'freelancer_id'
  ) THEN
    ALTER TABLE public.freelancer_clients
      RENAME COLUMN freelancer_id TO freelancer_user_id;
    RAISE NOTICE 'Renamed freelancer_id to freelancer_user_id';
  ELSE
    RAISE NOTICE 'Column freelancer_id does not exist, no rename needed';
  END IF;

  -- Step 3: Ensure freelancer_user_id column exists (in case of other scenarios)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'freelancer_clients'
    AND column_name = 'freelancer_user_id'
  ) THEN
    -- This shouldn't happen, but handle it just in case
    ALTER TABLE public.freelancer_clients
      ADD COLUMN freelancer_user_id uuid not null references auth.users(id) on delete cascade;
    RAISE NOTICE 'Added missing freelancer_user_id column';
  END IF;
END $$;

-- Step 3.5: Add missing columns if they don't exist
DO $$
BEGIN
  -- Add focus_areas if missing
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelancer_clients' AND column_name = 'focus_areas'
  ) THEN
    ALTER TABLE public.freelancer_clients ADD COLUMN focus_areas text[] DEFAULT '{}';
    RAISE NOTICE 'Added focus_areas column';
  END IF;

  -- Add primary_focus_area if missing
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelancer_clients' AND column_name = 'primary_focus_area'
  ) THEN
    ALTER TABLE public.freelancer_clients ADD COLUMN primary_focus_area text;
    RAISE NOTICE 'Added primary_focus_area column';
  END IF;

  -- Add focus_description if missing
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelancer_clients' AND column_name = 'focus_description'
  ) THEN
    ALTER TABLE public.freelancer_clients ADD COLUMN focus_description text;
    RAISE NOTICE 'Added focus_description column';
  END IF;

  -- Add primary_contact_name if missing
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelancer_clients' AND column_name = 'primary_contact_name'
  ) THEN
    ALTER TABLE public.freelancer_clients ADD COLUMN primary_contact_name text;
    RAISE NOTICE 'Added primary_contact_name column';
  END IF;

  -- Add primary_contact_email if missing
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelancer_clients' AND column_name = 'primary_contact_email'
  ) THEN
    ALTER TABLE public.freelancer_clients ADD COLUMN primary_contact_email text;
    RAISE NOTICE 'Added primary_contact_email column';
  END IF;

  -- Add mission if missing
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelancer_clients' AND column_name = 'mission'
  ) THEN
    ALTER TABLE public.freelancer_clients ADD COLUMN mission text;
    RAISE NOTICE 'Added mission column';
  END IF;

  -- Add annual_budget if missing
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelancer_clients' AND column_name = 'annual_budget'
  ) THEN
    ALTER TABLE public.freelancer_clients ADD COLUMN annual_budget numeric;
    RAISE NOTICE 'Added annual_budget column';
  END IF;

  -- Add billing_rate if missing
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelancer_clients' AND column_name = 'billing_rate'
  ) THEN
    ALTER TABLE public.freelancer_clients ADD COLUMN billing_rate numeric;
    RAISE NOTICE 'Added billing_rate column';
  END IF;

  -- Add last_activity_at if missing
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelancer_clients' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE public.freelancer_clients ADD COLUMN last_activity_at timestamptz;
    RAISE NOTICE 'Added last_activity_at column';
  END IF;

  -- Rename client_name to name if needed
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelancer_clients' AND column_name = 'client_name'
  ) THEN
    ALTER TABLE public.freelancer_clients RENAME COLUMN client_name TO name;
    RAISE NOTICE 'Renamed client_name to name';
  END IF;

  -- Rename relationship_status to status if needed
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'freelancer_clients' AND column_name = 'relationship_status'
  ) THEN
    ALTER TABLE public.freelancer_clients RENAME COLUMN relationship_status TO status;
    RAISE NOTICE 'Renamed relationship_status to status';
  END IF;
END $$;

-- Step 4: Update the index to use the correct column name
DROP INDEX IF EXISTS idx_freelancer_clients_freelancer;
CREATE INDEX IF NOT EXISTS idx_freelancer_clients_freelancer
  ON public.freelancer_clients(freelancer_user_id);

-- Step 5: Update RLS policies to use the correct column name
DROP POLICY IF EXISTS "freelancers can manage their own clients" ON public.freelancer_clients;
CREATE POLICY "freelancers can manage their own clients"
  ON public.freelancer_clients
  FOR ALL
  USING (auth.uid() = freelancer_user_id)
  WITH CHECK (auth.uid() = freelancer_user_id);

DROP POLICY IF EXISTS "service role can manage freelancer clients" ON public.freelancer_clients;
CREATE POLICY "service role can manage freelancer clients"
  ON public.freelancer_clients
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Step 6: Enable RLS
ALTER TABLE public.freelancer_clients ENABLE ROW LEVEL SECURITY;

-- Step 7: Add constraints for focus areas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'primary_focus_in_focus_areas'
  ) THEN
    ALTER TABLE public.freelancer_clients
      ADD CONSTRAINT primary_focus_in_focus_areas
      CHECK (
        primary_focus_area IS NULL OR
        primary_focus_area = ANY(focus_areas)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'focus_areas_count'
  ) THEN
    ALTER TABLE public.freelancer_clients
      ADD CONSTRAINT focus_areas_count
      CHECK (
        array_length(focus_areas, 1) IS NULL OR
        (array_length(focus_areas, 1) >= 1 AND array_length(focus_areas, 1) <= 5)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'focus_description_length'
  ) THEN
    ALTER TABLE public.freelancer_clients
      ADD CONSTRAINT focus_description_length
      CHECK (focus_description IS NULL OR length(focus_description) <= 200);
  END IF;
END $$;

-- Step 8: Add helpful comments
COMMENT ON TABLE public.freelancer_clients IS 'Client relationships managed by freelancer grant writers';
COMMENT ON COLUMN public.freelancer_clients.freelancer_user_id IS 'Foreign key to auth.users(id) - the freelancer who owns this client';
COMMENT ON COLUMN public.freelancer_clients.focus_areas IS 'Array of 1-5 focus area IDs from standardized taxonomy';
COMMENT ON COLUMN public.freelancer_clients.primary_focus_area IS 'Primary focus area from the focus_areas array';
