# Grant Cleanup System

This document describes the automatic grant lifecycle management system that keeps the database clean and up-to-date.

## Overview

The grant cleanup system automatically manages the lifecycle of grant opportunities in the database:

1. **Auto-close expired grants**: Marks grants as "closed" when their deadline passes
2. **Delete old closed grants**: Removes closed grants that are older than 24 months

## How It Works

### 1. Auto-Closing Expired Grants

When a grant's deadline passes, it is automatically marked as "closed":

- Runs after every grant sync
- Also runs daily via cron job at 3 AM UTC
- Updates only grants where:
  - `deadline < today`
  - `status != 'closed'`

### 2. Deleting Old Closed Grants

Closed grants older than 24 months are automatically deleted:

- Runs after every grant sync
- Also runs daily via cron job at 3 AM UTC
- Deletes only grants where:
  - `status = 'closed'`
  - `deadline < (today - 24 months)`

## Automated Cleanup

### Via Grant Sync

Cleanup runs automatically after each grant sync:

```bash
npm run sync:grants
```

This will:
1. Fetch new/updated grants from sources
2. Close any expired grants
3. Delete grants closed for 24+ months

To skip cleanup during sync (for debugging):
```bash
npm run sync:grants -- --skip-cleanup
```

### Via Cron Job

A daily cron job runs at 3 AM UTC to ensure cleanup happens even if syncs don't run:

**Configuration** (in `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-opportunities",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Endpoint**: `/api/cron/cleanup-opportunities`

**Authentication**: Protected by `CRON_SECRET` environment variable

## Manual Cleanup

### Using CLI Script

Run cleanup manually:

```bash
# Full cleanup (closes expired + deletes old)
npm run cleanup:grants

# Preview what would be cleaned (dry-run)
npm run cleanup:grants -- --dry-run

# Show statistics only
npm run cleanup:grants -- --stats
```

### Using API Endpoint

Trigger cleanup via HTTP POST:

```bash
curl -X POST https://yourdomain.com/api/cron/cleanup-opportunities \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Response:
```json
{
  "success": true,
  "message": "Closed 15 expired grants, deleted 23 old grants",
  "grants_closed": 15,
  "grants_deleted": 23,
  "errors": 0,
  "timestamp": "2025-01-15T03:00:00.000Z"
}
```

## Checking Grant Status

View current grant statistics:

```bash
npm run check:grants
```

This shows:
- Total grants in database
- Breakdown by status (open, closed, etc.)
- Expired grants still marked as open
- Old closed grants eligible for deletion
- Oldest deadline date

## Technical Details

### Cleanup Module

Location: `src/lib/ingestion/cleanup.ts`

**Main class**: `GrantCleanup`

**Methods**:
- `runCleanup()` - Runs full cleanup (close + delete)
- `closeExpiredGrants()` - Marks past-deadline grants as closed
- `deleteOldClosedGrants()` - Removes grants closed 24+ months ago
- `getCleanupStats()` - Returns statistics about grants

### Pipeline Integration

Location: `src/lib/ingestion/pipeline.ts`

The cleanup runs automatically in `GrantIngestionPipeline.runAll()` after all connectors finish syncing.

### Cron Endpoints

1. **Primary**: `/api/cron/cleanup-opportunities`
   - Runs full cleanup (close + delete)
   - Schedule: Daily at 3 AM UTC

2. **Sync**: `/api/cron/sync-grants`
   - Syncs grants from all sources
   - Automatically runs cleanup after sync
   - Schedule: Daily at 2 AM UTC

## Configuration

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `CRON_SECRET` - (Optional) Secret for protecting cron endpoints

### Adjusting Deletion Period

To change the 24-month deletion period, edit `src/lib/ingestion/cleanup.ts`:

```typescript
// Current: 24 months
cutoffDate.setMonth(cutoffDate.getMonth() - 24);

// Example: Change to 12 months
cutoffDate.setMonth(cutoffDate.getMonth() - 12);
```

## Monitoring

### Logs

All cleanup operations are logged with the `[Cleanup]` prefix:

```
[Cleanup] Starting grant cleanup...
[Cleanup] Found 15 expired grants to close
[Cleanup] Closed 15 expired grants
[Cleanup] Found 23 old closed grants to delete
[Cleanup] Deleted 23 old closed grants
[Cleanup] Cleanup complete: 15 closed, 23 deleted, 0 errors
```

### Error Handling

- Cleanup errors don't fail the entire sync process
- Errors are logged and included in the cleanup result
- Failed operations can be retried manually

## Best Practices

1. **Run regularly**: Ensure cron job is configured and running
2. **Monitor logs**: Check for cleanup errors in production logs
3. **Test before production**: Use `--dry-run` to preview cleanup
4. **Backup data**: Consider backing up before bulk deletions
5. **Adjust timing**: Schedule cleanup during low-traffic periods

## Troubleshooting

### Cleanup Not Running

Check that:
1. Cron job is configured in `vercel.json`
2. `CRON_SECRET` is set correctly (if using)
3. Supabase credentials are valid
4. Service role key has delete permissions

### Too Many Grants Being Deleted

1. Run `npm run cleanup:grants -- --stats` to see what would be deleted
2. Verify the 24-month cutoff is correct for your use case
3. Check grant deadlines are being set correctly during sync

### Grants Not Being Closed

1. Check that grants have valid deadline dates
2. Verify deadline field is in correct date format
3. Run manual cleanup to catch up: `npm run cleanup:grants`

## Related Documentation

- [Grant Sync Setup](./GRANT_SYNC_SETUP.md)
- [Opportunity Lifecycle](./OPPORTUNITY_LIFECYCLE.md)
- [Grant Ingestion Spec](./GRANT_INGESTION_SPEC.md)
