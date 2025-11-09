# Soft Delete Implementation for Proposals

## Overview

Proposals use **soft delete** instead of permanent deletion. When a user deletes a proposal, it's marked as deleted but retained in the database for recovery and audit purposes.

## How It Works

### Database Schema

```sql
ALTER TABLE proposals ADD COLUMN deleted_at timestamptz;
```

- `deleted_at = NULL` → Active proposal (normal)
- `deleted_at = <timestamp>` → Deleted proposal (hidden from UI)

### API Endpoints

#### Delete Proposal
```
DELETE /api/proposals/[id]?orgId=xxx
```
- Sets `deleted_at` to current timestamp
- Logs action with `recoverable: true`
- Proposal disappears from UI immediately

#### Restore Proposal
```
POST /api/proposals/[id]/restore?orgId=xxx
```
- Clears `deleted_at` (sets to NULL)
- Logs restoration action
- Proposal reappears in UI

### Query Filtering

All proposal queries automatically filter out soft-deleted records:

```typescript
.from("proposals")
.select("*")
.is("deleted_at", null)  // Only show non-deleted proposals
```

## Benefits

1. **Accidental Delete Protection** - Users can recover mistakenly deleted proposals
2. **Audit Trail** - Complete history of deletions with timestamps
3. **Compliance** - Retain records for regulatory requirements
4. **Analytics** - Track proposal lifecycle including deletions
5. **Data Recovery** - Support team can restore if needed

## Recovery Window

Currently: **Indefinite** - Deleted proposals are retained forever

Future options:
- Add auto-cleanup after 30/90 days
- Add admin "Permanently Delete" feature
- Add "Recently Deleted" UI section (like trash folder)

## Database Indexes

Two indexes optimize soft delete queries:

1. **Active proposals** (most common query):
   ```sql
   CREATE INDEX idx_proposals_deleted_at
   ON proposals(deleted_at)
   WHERE deleted_at IS NULL;
   ```

2. **Deleted proposals** (for cleanup/recovery):
   ```sql
   CREATE INDEX idx_proposals_deleted_at_recent
   ON proposals(deleted_at)
   WHERE deleted_at IS NOT NULL;
   ```

## Future Enhancements

### 1. Recently Deleted UI
Show deleted proposals in a separate view with restore option:
```
/proposals/deleted
```

### 2. Auto-Cleanup Cron Job
Permanently delete proposals after retention period:
```typescript
// Delete proposals soft-deleted > 90 days ago
DELETE FROM proposals
WHERE deleted_at < NOW() - INTERVAL '90 days';
```

### 3. Bulk Operations
- Restore multiple proposals at once
- Permanently delete multiple proposals

### 4. Admin Tools
- View all deleted proposals across all organizations
- Force permanent delete (bypass soft delete)
- Configure retention periods per organization

## Migration

To apply this feature to your database:

```bash
npx supabase db push supabase/migrations/20241101_soft_delete_proposals.sql
```

Or include in consolidated migrations file.

## Testing

1. **Delete a proposal** → Check `deleted_at` is set
2. **List proposals** → Deleted proposal doesn't appear
3. **Restore proposal** → Check `deleted_at` is NULL
4. **List proposals** → Restored proposal appears again
5. **Check activity_logs** → Both delete and restore actions logged
