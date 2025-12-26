# Migration Guide: Phase 1 Unification

This guide walks you through safely applying the Phase 1 database migrations to unify the nonprofit and freelancer systems.

## Current State

**Existing Data:**
- `freelancer_proposals`: 7 rows
- `proposals`: 7 rows
- `freelancer_clients`: 5 rows
- `organizations`: 2 rows

**What Will Happen:**
1. New columns added to `proposals` table (context_type, context_id, freelancer_user_id)
2. New `proposal_drafts` table created
3. Data from `freelancer_proposals` migrated to unified `proposals` table
4. New columns added to `organizations` table (parent_type, freelancer_user_id)
5. Data from `freelancer_clients` migrated to unified `organizations` table
6. RLS policies updated for context-aware access

## Pre-Migration Checklist

- [ ] **Backup your database** (critical!)
- [ ] Review migration SQL files
- [ ] Verify you're applying to the correct environment
- [ ] Notify team members of maintenance window
- [ ] Have rollback plan ready

## Step 1: Create Database Backup

### Option A: Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project
3. Go to **Database** > **Backups**
4. Click **Create Backup** and wait for completion
5. Note the backup timestamp

### Option B: CLI Backup (if linked)
```bash
# Link to your project (one-time)
supabase link --project-ref your-project-ref

# Create backup
supabase db dump -f backup-$(date +%Y%m%d).sql
```

## Step 2: Review Migration Files

Review the SQL in these files before applying:

1. **`supabase/migrations/20251226_unify_proposals.sql`**
   - Adds context fields to proposals table
   - Creates proposal_drafts table
   - Migrates freelancer_proposals data
   - Updates RLS policies

2. **`supabase/migrations/20251226_unify_documents.sql`**
   - Adds parent_type to organizations table
   - Migrates freelancer_clients data
   - Updates RLS policies

## Step 3: Apply Migrations

### Method 1: Supabase SQL Editor (Recommended)

1. **Open SQL Editor:**
   - Go to Supabase Dashboard > SQL Editor
   - Click "New Query"

2. **Apply First Migration:**
   - Copy all contents from `supabase/migrations/20251226_unify_proposals.sql`
   - Paste into SQL Editor
   - Click **Run** (bottom right)
   - Wait for success message
   - Verify no errors in output

3. **Apply Second Migration:**
   - Create another new query
   - Copy all contents from `supabase/migrations/20251226_unify_documents.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Verify no errors

### Method 2: Supabase CLI

```bash
# If linked to project
supabase db push

# This will apply all pending migrations
```

## Step 4: Verify Migration Success

### Check New Columns

Run these queries in SQL Editor to verify:

```sql
-- 1. Check proposals table has new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'proposals'
  AND column_name IN ('context_type', 'context_id', 'freelancer_user_id');

-- Should return 3 rows

-- 2. Check proposal_drafts table exists
SELECT COUNT(*) FROM proposal_drafts;

-- Should return 7 (migrated from freelancer_proposals)

-- 3. Check organizations has new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name IN ('parent_type', 'freelancer_user_id');

-- Should return 2 rows

-- 4. Verify data migration
SELECT COUNT(*) FROM proposals WHERE context_type = 'freelancer';

-- Should return 7 (migrated freelancer proposals)

SELECT COUNT(*) FROM organizations WHERE parent_type = 'client';

-- Should return 5 (migrated freelancer clients)
```

### Check RLS Policies

```sql
-- List all policies on proposals table
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'proposals';

-- Should see context-aware policies like:
-- - proposals_select_policy
-- - proposals_insert_policy
-- - proposals_update_policy
-- - proposals_delete_policy
```

## Step 5: Test Data Integrity

### Test 1: Nonprofit Context

```sql
-- Check nonprofit proposals still accessible
SELECT id, opportunity_name, status, context_type
FROM proposals
WHERE organization_id IS NOT NULL
  AND (context_type = 'organization' OR context_type IS NULL);
```

### Test 2: Freelancer Context

```sql
-- Check freelancer proposals migrated correctly
SELECT
  p.id,
  p.opportunity_name,
  p.status,
  p.context_type,
  p.context_id,
  pd.draft_html IS NOT NULL as has_draft
FROM proposals p
LEFT JOIN proposal_drafts pd ON pd.proposal_id = p.id
WHERE p.context_type = 'freelancer';

-- All 7 should have context_type = 'freelancer'
```

### Test 3: Client Organizations

```sql
-- Check clients migrated to organizations
SELECT id, name, parent_type, freelancer_user_id
FROM organizations
WHERE parent_type = 'client';

-- Should return 5 clients
```

## Step 6: Test RLS Policies

**Important:** Test with actual user authentication to ensure RLS works correctly.

### Test Nonprofit Access

```javascript
// In your app or browser console with authenticated user
const { data, error } = await supabase
  .from('proposals')
  .select('*')
  .eq('context_type', 'organization');

console.log('Nonprofit proposals:', data);
```

### Test Freelancer Access

```javascript
// As a freelancer user
const { data, error } = await supabase
  .from('proposals')
  .select('*')
  .eq('context_type', 'freelancer');

console.log('Freelancer proposals:', data);
```

## Step 7: Enable Feature Flags (Gradual)

Once migrations are verified, enable feature flags incrementally:

```bash
# In .env.local

# Start with just data layer
NEXT_PUBLIC_FF_UNIFIED_PROPOSALS=true
NEXT_PUBLIC_FF_UNIFIED_DOCUMENTS=true

# Test thoroughly, then enable opportunities
NEXT_PUBLIC_FF_UNIFIED_OPPORTUNITIES=true

# Restart your app
npm run dev
```

**Test after each flag:**
1. Test proposal creation (both contexts)
2. Test proposal viewing (both contexts)
3. Test document management
4. Test opportunities

## Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution:** Migration was partially applied. Check which columns exist and comment out those parts of the migration.

```sql
-- Check what exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'proposals'
  AND column_name IN ('context_type', 'context_id', 'freelancer_user_id');
```

### Issue: RLS denies access after migration

**Solution:** Check if user is authenticated and has proper role:

```sql
-- Check current user
SELECT auth.uid(), auth.role();

-- Check org membership
SELECT * FROM org_members WHERE user_id = auth.uid();
```

### Issue: Freelancer proposals not showing

**Solution:** Verify context_type was set correctly:

```sql
SELECT id, context_type, context_id, freelancer_user_id
FROM proposals
WHERE context_type = 'freelancer';

-- If NULL, update:
UPDATE proposals
SET context_type = 'freelancer',
    context_id = (SELECT client_id FROM freelancer_proposals fp WHERE fp.id = proposals.id)
WHERE id IN (SELECT id FROM freelancer_proposals);
```

## Rollback Plan

If you need to rollback:

### Option 1: Restore from Backup

1. Go to Supabase Dashboard > Database > Backups
2. Find your pre-migration backup
3. Click **Restore**
4. Wait for restoration to complete

### Option 2: Manual Rollback SQL

```sql
-- Remove new columns from proposals
ALTER TABLE proposals DROP COLUMN IF EXISTS context_type;
ALTER TABLE proposals DROP COLUMN IF EXISTS context_id;
ALTER TABLE proposals DROP COLUMN IF EXISTS freelancer_user_id;

-- Drop proposal_drafts table
DROP TABLE IF EXISTS proposal_drafts CASCADE;

-- Remove new columns from organizations
ALTER TABLE organizations DROP COLUMN IF EXISTS parent_type;
ALTER TABLE organizations DROP COLUMN IF EXISTS freelancer_user_id;

-- Restore old RLS policies (you'll need to recreate the original ones)
```

## Post-Migration

After successful migration and testing:

1. **Monitor for 7 days:**
   - Check error logs
   - Monitor user feedback
   - Watch database performance

2. **Update documentation:**
   - Mark migration as applied
   - Document any issues encountered

3. **Plan for cleanup:**
   - After 30 days: Make `freelancer_proposals` read-only
   - After 90 days: Drop `freelancer_proposals` table
   - After 90 days: Drop `freelancer_clients` table

## Success Criteria

- [ ] All migrations applied without errors
- [ ] All existing proposals still accessible
- [ ] All freelancer proposals migrated (7 rows)
- [ ] All clients migrated to organizations (5 rows)
- [ ] RLS policies working for both contexts
- [ ] No broken functionality in app
- [ ] Feature flags can be enabled without errors

---

**Questions?** Refer to [REFACTORING_PLAN_UNIFIED_ARCHITECTURE.md](./REFACTORING_PLAN_UNIFIED_ARCHITECTURE.md) for full context.
