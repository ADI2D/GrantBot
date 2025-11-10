-- Standardize freelancer_clients focus areas to match organization pattern
-- This migration renames 'categories' to 'focus_areas' and adds primary_focus_area field

-- Step 1: Add new columns
ALTER TABLE public.freelancer_clients
  ADD COLUMN IF NOT EXISTS focus_areas text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_focus_area text,
  ADD COLUMN IF NOT EXISTS focus_description text;

-- Step 2: Migrate existing data from categories (jsonb) to focus_areas (text[])
UPDATE public.freelancer_clients
SET focus_areas = ARRAY(SELECT jsonb_array_elements_text(categories))
WHERE categories IS NOT NULL AND categories != '[]'::jsonb;

-- Step 3: Set primary_focus_area to first element if focus_areas has data
UPDATE public.freelancer_clients
SET primary_focus_area = focus_areas[1]
WHERE array_length(focus_areas, 1) > 0 AND primary_focus_area IS NULL;

-- Step 4: Drop old categories column (after data migration)
ALTER TABLE public.freelancer_clients
  DROP COLUMN IF EXISTS categories;

-- Step 5: Add check constraint for primary_focus_area (must be in focus_areas)
ALTER TABLE public.freelancer_clients
  ADD CONSTRAINT primary_focus_in_focus_areas
  CHECK (
    primary_focus_area IS NULL OR
    primary_focus_area = ANY(focus_areas)
  );

-- Step 6: Add check constraint for focus_description length
ALTER TABLE public.freelancer_clients
  ADD CONSTRAINT focus_description_length
  CHECK (focus_description IS NULL OR length(focus_description) <= 200);

-- Step 7: Add check constraint for focus_areas array length (1-5 areas)
ALTER TABLE public.freelancer_clients
  ADD CONSTRAINT focus_areas_count
  CHECK (
    array_length(focus_areas, 1) IS NULL OR
    (array_length(focus_areas, 1) >= 1 AND array_length(focus_areas, 1) <= 5)
  );

-- Step 8: Update column comments
COMMENT ON COLUMN public.freelancer_clients.focus_areas IS 'Array of 1-5 focus area IDs from standardized taxonomy (education, health, arts-culture, etc.)';
COMMENT ON COLUMN public.freelancer_clients.primary_focus_area IS 'Primary focus area from the focus_areas array - used for matching boost';
COMMENT ON COLUMN public.freelancer_clients.focus_description IS 'Optional brief description of client focus (max 200 chars) for context';

-- Step 9: Create index for focus area matching queries
CREATE INDEX IF NOT EXISTS idx_freelancer_clients_focus_areas ON public.freelancer_clients USING GIN(focus_areas);
CREATE INDEX IF NOT EXISTS idx_freelancer_clients_primary_focus ON public.freelancer_clients(primary_focus_area);
