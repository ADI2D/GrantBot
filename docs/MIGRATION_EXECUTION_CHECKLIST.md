# Migration Execution Checklist

**Date:** 2025-12-26
**Migrations:** Phase 1 Unification (Proposals + Documents)
**Project:** https://app.supabase.com/project/wwwrchacbyepnvbqhgnb

---

## Pre-Flight Checklist

- [ ] Read [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- [ ] Understand what will change
- [ ] Have rollback plan ready
- [ ] Team notified (if applicable)

---

## Step 1: Backup Database ⚠️ CRITICAL

- [ ] Open: https://app.supabase.com/project/wwwrchacbyepnvbqhgnb/database/backups
- [ ] Click **"Create Backup"**
- [ ] Wait for completion
- [ ] Verify backup appears in list
- [ ] Note backup timestamp: ___________________

---

## Step 2: Apply Migration 1 - Unify Proposals

### 2.1 Open SQL Editor
- [ ] Go to: https://app.supabase.com/project/wwwrchacbyepnvbqhgnb/sql/new
- [ ] Click **"New Query"**

### 2.2 Copy SQL
- [ ] Open file: `supabase/migrations/20251226_unify_proposals.sql`
- [ ] Copy ALL contents (250 lines)

### 2.3 Execute
- [ ] Paste into SQL Editor
- [ ] Review the SQL one more time
- [ ] Click **"RUN"** (bottom right)
- [ ] Wait for success message
- [ ] Check for any errors in output panel
- [ ] If errors: STOP and investigate (refer to troubleshooting section)

### 2.4 Quick Verification
Run this query in a new SQL Editor tab:
```sql
-- Should return 3 rows
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'proposals'
  AND column_name IN ('context_type', 'context_id', 'freelancer_user_id');
```
- [ ] Verified: Returns 3 rows ✅

---

## Step 3: Apply Migration 2 - Unify Documents

### 3.1 Open New SQL Query
- [ ] In SQL Editor, click **"New Query"**

### 3.2 Copy SQL
- [ ] Open file: `supabase/migrations/20251226_unify_documents.sql`
- [ ] Copy ALL contents

### 3.3 Execute
- [ ] Paste into SQL Editor
- [ ] Review the SQL
- [ ] Click **"RUN"**
- [ ] Wait for success message
- [ ] Check for errors

### 3.4 Quick Verification
Run this query:
```sql
-- Should return 2 rows
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name IN ('parent_type', 'freelancer_user_id');
```
- [ ] Verified: Returns 2 rows ✅

---

## Step 4: Comprehensive Verification

### 4.1 Check Data Migration
Run these queries in SQL Editor:

**Query 1: Freelancer proposals migrated**
```sql
SELECT COUNT(*) as freelancer_proposals_count
FROM proposals
WHERE context_type = 'freelancer';
-- Expected: 7
```
- [ ] Result: _______ (should be 7)

**Query 2: Proposal drafts created**
```sql
SELECT COUNT(*) as drafts_count
FROM proposal_drafts;
-- Expected: 7 (if freelancer_proposals had draft_html)
```
- [ ] Result: _______

**Query 3: Clients migrated to organizations**
```sql
SELECT COUNT(*) as clients_count
FROM organizations
WHERE parent_type = 'client';
-- Expected: 5
```
- [ ] Result: _______ (should be 5)

**Query 4: Original nonprofit proposals intact**
```sql
SELECT COUNT(*) as nonprofit_proposals
FROM proposals
WHERE organization_id IS NOT NULL
  AND (context_type = 'organization' OR context_type IS NULL);
-- Expected: 7
```
- [ ] Result: _______ (should be 7)

### 4.2 Check RLS Policies
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'proposals'
ORDER BY policyname;
-- Should see: proposals_select_policy, proposals_insert_policy, etc.
```
- [ ] Verified: Context-aware policies exist ✅

### 4.3 Spot Check Data Integrity
```sql
-- Check a specific freelancer proposal
SELECT
  p.id,
  p.opportunity_name,
  p.status,
  p.context_type,
  p.context_id,
  pd.draft_html IS NOT NULL as has_draft
FROM proposals p
LEFT JOIN proposal_drafts pd ON pd.proposal_id = p.id
WHERE p.context_type = 'freelancer'
LIMIT 3;
```
- [ ] Verified: Proposals look correct ✅

---

## Step 5: Test in Application (Optional but Recommended)

### 5.1 Test Nonprofit View
- [ ] Login as nonprofit user
- [ ] Navigate to proposals page
- [ ] Verify proposals still display
- [ ] Try creating a test proposal
- [ ] Verify no errors in console

### 5.2 Test Freelancer View
- [ ] Login as freelancer user
- [ ] Navigate to client proposals
- [ ] Verify client proposals display
- [ ] Try editing a proposal
- [ ] Verify no errors in console

---

## Step 6: Monitor (First 24 Hours)

- [ ] Check error logs: https://app.supabase.com/project/wwwrchacbyepnvbqhgnb/logs
- [ ] Monitor user reports
- [ ] Watch database performance
- [ ] Note any issues: _______________________

---

## Rollback Procedure (If Needed)

**Only use if critical issues occur**

### Option 1: Restore from Backup
1. Go to: https://app.supabase.com/project/wwwrchacbyepnvbqhgnb/database/backups
2. Find backup from Step 1 (timestamp: ___________________)
3. Click **"Restore"**
4. Confirm restoration
5. Wait for completion

### Option 2: Manual Rollback (SQL)
See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md#rollback-plan) for SQL commands

---

## Success Criteria

All items must be checked:

- [x] ✅ Backup created successfully
- [ ] ✅ Migration 1 applied without errors
- [ ] ✅ Migration 2 applied without errors
- [ ] ✅ All data counts match expected values
- [ ] ✅ RLS policies updated
- [ ] ✅ Application still works (tested)
- [ ] ✅ No errors in logs after 1 hour

---

## Post-Migration Tasks

- [ ] Update team: "Phase 1 migrations completed successfully"
- [ ] Document any issues encountered
- [ ] Schedule follow-up check in 7 days
- [ ] Mark in calendar: Day 30 (make freelancer_proposals read-only)
- [ ] Mark in calendar: Day 90 (consider dropping old tables)

---

## Notes / Issues Encountered

```
(Use this space to note any issues, warnings, or observations during migration)




```

---

**Completed By:** ___________________
**Date/Time:** ___________________
**Duration:** ___________________
**Status:** ☐ Success  ☐ Partial  ☐ Rolled Back

