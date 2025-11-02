# Initialize Grants.gov Connector

Your connector page is showing empty because the connector hasn't been initialized yet. Follow these steps to set it up.

## Step 1: Initialize the Connector in Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Initialize Grants.gov connector
INSERT INTO connector_sync_state (
  source,
  status,
  records_fetched,
  records_created,
  records_updated,
  records_skipped,
  created_at,
  updated_at
) VALUES (
  'grants_gov',
  'idle',
  0,
  0,
  0,
  0,
  NOW(),
  NOW()
)
ON CONFLICT (source) DO NOTHING;
```

This creates the initial record for the Grants.gov connector in an `idle` state.

## Step 2: Verify the Connector Appears

After running the SQL, refresh the `/admin/connectors` page. You should now see:

```
Grants Gov  [Warning]
Last Sync: Never
```

The "Warning" status is expected because the connector has never synced successfully.

## Step 3: Run Your First Sync

You have two options to trigger a sync:

### Option A: Use the Admin UI (Recommended)

1. Go to `/admin/connectors`
2. Click the **"Sync"** button next to Grants Gov
3. Wait for the sync to complete (watch for status changes)

### Option B: Use the CLI Script

```bash
cd grantbot-app
npx tsx scripts/sync-grants.ts
```

## Step 4: Monitor the Sync

While the sync is running, you'll see:

```
Grants Gov  [Warning]  [Syncing now ●]
Last Sync: Never
```

The "Syncing now" badge will pulse to indicate active syncing.

## What Happens During First Sync

The Grants.gov connector will:

1. Fetch the latest opportunities XML feed from Grants.gov
2. Parse the XML into structured data
3. Insert new opportunities into the `opportunities` table
4. Update the `connector_sync_state` table with metrics
5. Create an entry in `sync_logs` for the audit trail

**Typical first sync:**
- Duration: 2-5 minutes
- Records fetched: 1,000-2,000
- Records created: 1,000-2,000 (all new on first run)
- Records updated: 0 (none exist yet)

## Step 5: Verify Success

After the sync completes successfully, you should see:

```
Grants Gov  [Healthy]  [Ready]
Last Sync: 11/1/2025, 6:36:13 PM
Records Fetched: 1,250
Created: 1,250
Updated: 0
```

And in the "Recent Sync Activity" section:

```
Grants Gov  [success]
11/1/2025, 6:36:13 PM • Created: 1,250 • Updated: 0 • Skipped: 0
```

## Troubleshooting

### "Failed to fetch connector health" Error

**Cause:** The `connector_sync_state` table doesn't exist or you don't have access.

**Fix:** Apply the migration:
```sql
-- Run: supabase/migrations/20241101_connector_sync_state.sql
```

### No Sync Logs Appear

**Cause:** The `sync_logs` table doesn't exist.

**Fix:** Apply the migration:
```sql
-- Run: supabase/migrations/20241101_sync_logs.sql
```

### Sync Fails with "Rate limit exceeded"

**Cause:** Grants.gov API rate limit hit (usually 120 requests/hour).

**Fix:** Wait an hour and try again, or use the "Sync" button (which respects cache).

### Sync Stuck in "Running" State

**Cause:** Script crashed or was interrupted.

**Fix:** Manually reset the status:
```sql
UPDATE connector_sync_state
SET status = 'idle'
WHERE source = 'grants_gov';
```

Then trigger a fresh sync.

## Setting Up Automated Syncs (Optional)

To sync automatically on a schedule, you can:

### Option 1: Vercel Cron (Recommended for Production)

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/sync-grants",
    "schedule": "0 */6 * * *"
  }]
}
```

This runs every 6 hours.

### Option 2: Manual Cron Job

```bash
# Add to crontab (runs every 6 hours)
0 */6 * * * cd /path/to/grantbot-app && npx tsx scripts/sync-grants.ts >> /var/log/grants-sync.log 2>&1
```

### Option 3: GitHub Actions (For Development)

Create `.github/workflows/sync-grants.yml`:

```yaml
name: Sync Grants
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
        working-directory: grantbot-app
      - run: npx tsx scripts/sync-grants.ts
        working-directory: grantbot-app
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Expected Sync Cadence

**Recommended frequency:** Every 6 hours

**Why 6 hours?**
- Grants.gov publishes new opportunities throughout the day
- Balances freshness vs. API rate limits
- Keeps connector in "Healthy" state (< 48 hours)

**Warning threshold:** 48 hours without sync → Status changes to "Warning"

## Next Steps

After your first successful sync:

1. Check the Opportunities page (`/opportunities`) - you should see new grants
2. Try filtering by category to see the data
3. Click "Draft proposal" on an opportunity to test the workflow
4. Set up automated syncs (see above) so data stays fresh

## Related Documentation

- [Connector Status Reference](./CONNECTOR_STATUS_REFERENCE.md) - Full status state documentation
- [Grant Sync Setup](./GRANT_SYNC_SETUP.md) - Complete setup guide
- [Grant Ingestion Spec](./GRANT_INGESTION_SPEC.md) - Technical architecture
