# Onboarding Wizard - Database Migration Guide

## Overview

This migration adds comprehensive onboarding support for both nonprofit and freelancer users, including:

- **User Profiles**: Onboarding progress tracking
- **Organizations**: Enhanced nonprofit profile fields (EIN, staff size, programs, impact metrics, etc.)
- **Freelancer Profiles**: Complete freelancer profile table with specializations, portfolio, certifications
- **Freelancer Clients**: Client relationship tracking with "Like Us" and category tagging

## Migration File Location

```
supabase/migrations/20251109_onboarding_wizard.sql
```

## How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your project at https://supabase.com/dashboard
   - Navigate to **SQL Editor** in the left sidebar

2. **Copy Migration SQL**
   - Open `supabase/migrations/20251109_onboarding_wizard.sql`
   - Copy the entire contents

3. **Execute Migration**
   - Paste the SQL into the SQL Editor
   - Click **Run** to execute
   - Verify no errors appear

4. **Verify Tables Created**
   - Navigate to **Table Editor**
   - Confirm the following tables/columns exist:
     - `user_profiles.onboarding_progress` (JSONB column)
     - `organizations.ein, founded_year, staff_size, programs, impact_metrics, etc.`
     - `freelancer_profiles` (new table)
     - `freelancer_clients` (new table with `like_us` and `categories` columns)

### Option 2: Supabase CLI (If Available)

```bash
# Apply the migration
npx supabase db push

# Or apply specific migration file
psql $DATABASE_URL -f supabase/migrations/20251109_onboarding_wizard.sql
```

## Database Schema Changes

### 1. user_profiles Table (Enhanced)

**New Column:**
- `onboarding_progress` (JSONB): Stores partial onboarding data for resume functionality
  ```json
  {
    "step": "mission-impact",
    "data": { /* form data */ },
    "completion": 40,
    "updated_at": "2024-11-09T12:00:00Z"
  }
  ```

### 2. organizations Table (Enhanced)

**New Columns:**
- `ein` (TEXT): Employer Identification Number (Tax ID)
- `founded_year` (INTEGER): Year organization was founded
- `staff_size` (TEXT): Organization size: solo, small (2-10), medium (11-50), large (50+)
- `geographic_scope` (TEXT): Local, Regional, National, International
- `website` (TEXT): Organization website URL
- `programs` (JSONB): Array of program objects
  ```json
  [
    {
      "name": "Youth STEM Program",
      "description": "After-school STEM activities",
      "budget": 50000
    }
  ]
  ```
- `impact_metrics` (JSONB): Array of impact metrics
  ```json
  [
    {
      "metric": "Students served",
      "value": "500",
      "timeframe": "annually"
    }
  ]
  ```
- `target_demographics` (JSONB): Array of target populations
  ```json
  ["Youth ages 12-18", "Low-income families", "Urban communities"]
  ```
- `past_funders` (JSONB): Array of past funding sources
  ```json
  [
    {
      "name": "ABC Foundation",
      "amount": 25000,
      "year": "2023"
    }
  ]
  ```

### 3. freelancer_profiles Table (New)

**Purpose:** Extended profile data for freelancer grant writers

**Columns:**
- `user_id` (UUID, PK): References auth.users
- `full_name` (TEXT): Freelancer's full name
- `headline` (TEXT): Professional headline (e.g., "Grant Writer specializing in Health & Education")
- `bio` (TEXT): Professional bio
- `hourly_rate` (NUMERIC): Hourly billing rate
- `specializations` (JSONB): Array of focus area IDs they specialize in
  ```json
  ["health", "education", "youth-development"]
  ```
- `years_experience` (INTEGER): Years of grant writing experience
- `certifications` (JSONB): Array of certifications
  ```json
  [
    {
      "name": "Grant Professional Certified (GPC)",
      "issuer": "Grant Professionals Association",
      "year": 2022
    }
  ]
  ```
- `portfolio_items` (JSONB): Array of past grants
  ```json
  [
    {
      "title": "Community Health Initiative",
      "description": "Federal grant for community health center",
      "amount_raised": 500000,
      "funder": "HRSA",
      "year": 2023
    }
  ]
  ```
- `total_grants_written` (INTEGER): Total number of grants written
- `total_amount_raised` (NUMERIC): Total amount raised across all grants
- `success_rate` (NUMERIC): Percentage of grants won
- `availability_status` (TEXT): 'available', 'limited', or 'unavailable'
- `weekly_capacity` (INTEGER): Hours per week available
- `onboarding_completion` (NUMERIC): Percentage of onboarding complete (0-100)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Row Level Security (RLS):**
- Freelancers can read/update their own profile
- Freelancers can insert their own profile
- Nonprofits can read freelancer profiles (for hiring)
- Service role can manage all profiles

### 4. freelancer_clients Table (New)

**Purpose:** Client relationships for freelancer grant writers

**Columns:**
- `id` (UUID, PK): Auto-generated client ID
- `freelancer_id` (UUID, FK): References auth.users (the freelancer)
- `client_name` (TEXT, required): Name of the client organization
- `client_type` (TEXT): 'nonprofit', 'foundation', 'government', 'other'
- `relationship_status` (TEXT): 'active', 'completed', 'inactive'
- `start_date` (DATE): When engagement started
- `end_date` (DATE): When engagement ended (if completed)
- `total_raised` (NUMERIC): Total amount raised for this client
- `grants_submitted` (INTEGER): Number of grants submitted
- `grants_awarded` (INTEGER): Number of grants awarded
- `like_us` (BOOLEAN): **Mark if this is an ideal client type** (for matching)
- `categories` (JSONB): **Array of focus area IDs for this client**
  ```json
  ["health", "education"]
  ```
- `notes` (TEXT): Freelancer notes about the client
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Row Level Security (RLS):**
- Freelancers can manage (CRUD) their own clients
- Service role can manage all clients

**Indexes:**
- `idx_freelancer_clients_freelancer` on `freelancer_id`

## Migration Dependencies

This migration assumes the following tables already exist:
- `auth.users` (Supabase auth)
- `public.user_profiles`
- `public.organizations`

If these tables don't exist, you'll need to run earlier migrations first.

## Rollback Instructions

If you need to rollback this migration:

```sql
-- Remove columns from organizations
ALTER TABLE public.organizations
DROP COLUMN IF EXISTS ein,
DROP COLUMN IF EXISTS founded_year,
DROP COLUMN IF EXISTS staff_size,
DROP COLUMN IF EXISTS geographic_scope,
DROP COLUMN IF EXISTS website,
DROP COLUMN IF EXISTS programs,
DROP COLUMN IF EXISTS impact_metrics,
DROP COLUMN IF EXISTS target_demographics,
DROP COLUMN IF EXISTS past_funders;

-- Remove column from user_profiles
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS onboarding_progress;

-- Drop freelancer tables (cascades will clean up policies/triggers)
DROP TABLE IF EXISTS public.freelancer_clients;
DROP TABLE IF EXISTS public.freelancer_profiles;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.set_freelancer_profiles_updated_at();
```

## Testing the Migration

After applying the migration, test with these queries:

### Test 1: Check user_profiles column
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'onboarding_progress';
```

### Test 2: Check organizations columns
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name IN ('ein', 'programs', 'impact_metrics', 'past_funders');
```

### Test 3: Check freelancer_profiles table exists
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'freelancer_profiles';
```

### Test 4: Check freelancer_clients has like_us and categories
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'freelancer_clients'
AND column_name IN ('like_us', 'categories');
```

### Test 5: Verify RLS policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('freelancer_profiles', 'freelancer_clients');
```

## Next Steps After Migration

1. **Test Onboarding Flow**
   - Navigate to `/onboarding` as a nonprofit user
   - Complete all 5 nonprofit onboarding steps
   - Verify data saves to `organizations` table

2. **Test Freelancer Onboarding**
   - Navigate to `/onboarding` as a freelancer user
   - Complete all 4 freelancer onboarding steps
   - Verify data saves to `freelancer_profiles` and `freelancer_clients` tables

3. **Test Client Management**
   - Navigate to `/freelancer/clients` as a freelancer
   - Verify "Like Us" badge appears for marked clients
   - Verify categories display correctly
   - Test toggling "Like Us" and editing categories

4. **Verify API Endpoints**
   - Test `GET /api/user/profile` returns account type
   - Test `POST /api/onboarding/progress` saves progress
   - Test `GET /api/onboarding/progress` retrieves progress
   - Test `POST /api/onboarding/complete` creates organization/freelancer profile

## Support

If you encounter issues:

1. Check Supabase Dashboard → Database → Logs for error messages
2. Verify all prerequisite tables exist
3. Check that your database user has necessary permissions
4. Review the migration SQL for any syntax errors specific to your PostgreSQL version

## Related Files

- Migration: `supabase/migrations/20251109_onboarding_wizard.sql`
- API Endpoints:
  - `src/app/api/user/profile/route.ts`
  - `src/app/api/onboarding/progress/route.ts`
  - `src/app/api/onboarding/complete/route.ts`
- UI Components:
  - `src/app/(dashboard)/onboarding/page.tsx`
  - `src/components/onboarding/onboarding-wizard.tsx`
  - All step components in `src/components/onboarding/steps/`
- Documentation:
  - `docs/ONBOARDING_WIZARD_COMPLETE.md`
  - `docs/ONBOARDING_IMPLEMENTATION_SUMMARY.md`
