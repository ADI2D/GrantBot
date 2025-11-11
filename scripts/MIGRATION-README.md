# Focus Area Data Migration Guide

## Problem Summary

Your opportunities data has multiple issues causing incorrect counts:

1. **Case sensitivity**: "Other" (67,880) vs "other" (918)
2. **Old abbreviation codes**: ED, HL, NR, etc. instead of taxonomy IDs
3. **JSON strings as text**: `["ED","HL"]` stored as single text elements
4. **Result**: Clients with "education" only see 1,829 opportunities instead of 2,200+

## Solution: Run Batched Migration Scripts

The migration is split into 6 batches to avoid timeouts. Run them **in order**:

### Batch 1: Fix JSON String Arrays (~500 records)
**File**: `batch-1-fix-json-strings.sql`

Converts entries like `'["ED","HL"]'` (stored as single text) to proper arrays `["ED", "HL"]`

**Impact**: Low record count but critical for data integrity
**Expected time**: < 10 seconds

---

### Batch 2: Fix "Other" Case Sensitivity (~67,880 records)
**File**: `batch-2-fix-case-other.sql`

Converts uppercase "Other" to lowercase "other"

**Impact**: Highest record count - this is the biggest win!
**Expected time**: 30-60 seconds

---

### Batch 3: Normalize Education (~238 records)
**File**: `batch-3-normalize-education.sql`

- ED → education (186 records)
- ELT → education (52 records)

**Impact**: Increases education count from 1,829 to ~2,200+
**Expected time**: < 10 seconds
**User impact**: This will immediately fix your client counts!

---

### Batch 4: Normalize Health & Environment (~1,170 records)
**File**: `batch-4-normalize-health-env.sql`

- HL → health (426 records)
- ENV → environment (202 records)
- NR → environment (426 records)
- AG → environment (55 records)
- EN → environment (61 records)

**Impact**: Major improvements to health and environment counts
**Expected time**: 20-30 seconds

---

### Batch 5: Normalize Remaining Codes (~500 records)
**File**: `batch-5-normalize-remaining.sql`

Normalizes all remaining abbreviation codes:
- Arts, community, human services, international, research, other categories

**Impact**: Completes the normalization
**Expected time**: 20-30 seconds

---

### Batch 6: Remove Duplicates (All updated records)
**File**: `batch-6-remove-duplicates.sql`

Removes duplicate values created by normalization (e.g., `['education', 'education']` → `['education']`)

**Impact**: Clean data, accurate counts
**Expected time**: 30-60 seconds

---

## How to Run

1. Open Supabase SQL Editor
2. Run each batch **in numerical order** (1 through 6)
3. Wait for each batch to complete before running the next
4. Each batch includes a verification query showing the results

## Expected Results

### Before Migration:
- Education: 1,829
- Health: 2,750
- Environment: 1,921
- Other: 918

### After Migration:
- **Education: ~2,200+** (1,829 + 186 ED + 52 ELT + combos)
- **Health: ~3,200+** (2,750 + 426 HL + combos)
- **Environment: ~6,500+** (1,921 + 426 NR + 202 ENV + 55 AG + 61 EN + combos)
- **Other: ~69,000+** (67,880 Other + 918 other + 416 O + codes)

Your clients' opportunity counts should jump from 1,829 to the new higher numbers!

## Quick Start

```sql
-- Run these in order in Supabase SQL Editor:

-- 1. Fix JSON strings
\i batch-1-fix-json-strings.sql

-- 2. Fix case (biggest impact!)
\i batch-2-fix-case-other.sql

-- 3. Normalize education (YOUR IMMEDIATE FIX!)
\i batch-3-normalize-education.sql

-- 4. Normalize health & environment
\i batch-4-normalize-health-env.sql

-- 5. Normalize remaining codes
\i batch-5-normalize-remaining.sql

-- 6. Remove duplicates (final cleanup)
\i batch-6-remove-duplicates.sql
```

## Troubleshooting

**If a batch times out:**
- It's likely batch 2 or 6 (highest record counts)
- The batch can be safely re-run - it's idempotent
- Or contact me to break it into smaller chunks

**To check progress:**
```sql
-- Count remaining unmapped codes
SELECT unnest(focus_areas) as code, COUNT(*)
FROM opportunities
WHERE focus_areas && ARRAY['ED', 'HL', 'ENV', 'NR', 'O', 'Other']
GROUP BY code;
```
