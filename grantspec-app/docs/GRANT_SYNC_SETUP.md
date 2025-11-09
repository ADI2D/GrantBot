# Grant Sync Setup Guide

## Phase 1 Implementation - COMPLETED ✅

The core grant ingestion pipeline has been built! Here's what was created:

### Files Created

**Database Migrations:**
- `supabase/migrations/20241101_add_connector_fields.sql` - Adds fields to opportunities table
- `supabase/migrations/20241101_connector_sync_state.sql` - Tracks connector health
- `supabase/migrations/20241101_sync_logs.sql` - Audit trail for syncs

**Core Code:**
- `src/types/connectors.ts` - Type definitions for connectors
- `src/lib/connectors/base-connector.ts` - Abstract base class
- `src/lib/connectors/grants-gov-connector.ts` - Grants.gov implementation
- `src/lib/ingestion/pipeline.ts` - ETL orchestration
- `scripts/sync-grants.ts` - CLI tool for manual sync

**Documentation:**
- `docs/GRANT_INGESTION_SPEC.md` - Full technical specification

---

## Next Steps to Complete Phase 1

### Step 1: Install Dependencies

You need to install two packages:

```bash
cd grantbot-app
npm install fast-xml-parser tsx
```

**What these do:**
- `fast-xml-parser` - Parse Grants.gov XML feeds
- `tsx` - TypeScript execution for CLI scripts

### Step 2: Apply Database Migrations

Run these SQL files in your Supabase SQL Editor:

1. Go to [Supabase Dashboard](https://app.supabase.com) → Your Project → SQL Editor

2. Run migration 1: Add connector fields
   ```sql
   -- Copy/paste contents of:
   -- supabase/migrations/20241101_add_connector_fields.sql
   ```

3. Run migration 2: Connector sync state table
   ```sql
   -- Copy/paste contents of:
   -- supabase/migrations/20241101_connector_sync_state.sql
   ```

4. Run migration 3: Sync logs table
   ```sql
   -- Copy/paste contents of:
   -- supabase/migrations/20241101_sync_logs.sql
   ```

### Step 3: Add Environment Variable

Make sure you have `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ← Make sure this exists
```

You can find the service role key in:
Supabase Dashboard → Settings → API → `service_role` key (keep it secret!)

### Step 4: Test the Sync!

Run the sync command:

```bash
npm run sync:grants
```

**What happens:**
1. Fetches latest opportunities from Grants.gov XML feed
2. Parses and normalizes the data
3. Inserts/updates records in your `opportunities` table
4. Logs sync state to `connector_sync_state` table

**Expected output:**
```
================================================================================
GRANTBOT - OPPORTUNITY SYNC
================================================================================
Mode: INCREMENTAL
Source: ALL
================================================================================

[grants_gov] Fetching opportunities from Grants.gov...
[grants_gov] Parsed 523 opportunities
[Pipeline] grants_gov: Fetched 523 raw records
...

================================================================================
SYNC RESULTS
================================================================================
✅ grants_gov
   Status: SUCCESS
   Duration: 12.34s
   Fetched: 523
   Created: 523
   Updated: 0
   Skipped: 0
   Errors: 0

================================================================================
```

### Step 5: Verify Data in Database

Check your Supabase dashboard:

1. Go to **Table Editor** → `opportunities` table
2. You should see hundreds of new rows with `source = 'grants_gov'`
3. Filter by source to see just federal grants

---

## CLI Commands Reference

### Basic Sync
```bash
npm run sync:grants
```
Runs incremental sync (only fetches new/updated opportunities since last sync)

### Full Refresh
```bash
npm run sync:grants -- --full
```
Fetches all opportunities (ignores last sync time)

### Dry Run (Preview)
```bash
npm run sync:grants -- --dry-run
```
Shows what would be synced without actually writing to database

### Sync Specific Source
```bash
npm run sync:grants -- --source=grants_gov
```
Only run the specified connector

---

## Troubleshooting

### Problem: "Module not found: fast-xml-parser"
**Solution:** Run `npm install fast-xml-parser tsx`

### Problem: "Cannot find SUPABASE_SERVICE_ROLE_KEY"
**Solution:** Add it to `.env.local` from Supabase Dashboard → Settings → API

### Problem: "Failed to fetch Grants.gov data: 404"
**Solution:** Grants.gov publishes daily XML files. The connector tries today's file, then yesterday's. If both fail, it means their feed is temporarily unavailable. Try again in a few hours.

### Problem: "Permission denied" or "RLS policy violation"
**Solution:** The connector uses the service role key which bypasses RLS. Make sure you're using the correct key from Supabase.

### Problem: Sync runs but no opportunities appear
**Solution:**
1. Check the terminal output - did it say "Created: X"?
2. Check `connector_sync_state` table for errors
3. Check `sync_logs` table for details
4. Run with `--dry-run` to see what would be processed

---

## Phase 2 - Production Readiness (COMPLETED ✅)

Phase 2 has been implemented! Here's what's available:

### Admin UI - View & Manage Connectors
- Navigate to **Admin → Connectors** in the sidebar
- View real-time connector health (healthy/warning/error)
- See sync statistics (records fetched, created, updated)
- Manually trigger syncs (incremental or full refresh)
- View recent sync activity logs
- Auto-refreshes every 30 seconds

### API Endpoints
- `POST /api/admin/sync-grants` - Trigger manual sync
- `GET /api/admin/connector-health` - Get connector status
- `GET /api/admin/sync-logs` - View sync history

### Scheduled Daily Syncs
Automatic syncs run daily at 2:00 AM UTC via Vercel Cron.

**Setup Instructions:**

1. **Add Cron Secret to Environment Variables**

   In Vercel Dashboard (or `.env.local` for local testing):
   ```bash
   CRON_SECRET=your-random-secret-here
   ```

   Generate a secure random secret:
   ```bash
   openssl rand -base64 32
   ```

2. **Deploy to Vercel**

   The cron job is configured in `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/sync-grants",
         "schedule": "0 2 * * *"
       }
     ]
   }
   ```

   After deploying, Vercel will automatically run the sync daily.

3. **Test Cron Endpoint Locally**

   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
        http://localhost:3000/api/cron/sync-grants
   ```

4. **Monitor Cron Runs in Vercel**

   - Go to Vercel Dashboard → Your Project → Cron
   - View execution history, logs, and errors
   - Manually trigger test runs

**What Happens During Scheduled Sync:**
- Runs incremental sync (only fetches new/updated grants)
- Updates all configured connectors (currently Grants.gov)
- Logs results to `sync_logs` table
- Updates connector status in `connector_sync_state`
- Completes within 5 minutes (maxDuration setting)

**Troubleshooting Cron:**
- If cron doesn't run: Check `CRON_SECRET` is set in Vercel environment variables
- If unauthorized errors: Verify the secret matches between Vercel config and endpoint
- View logs: Vercel Dashboard → Cron → Click on execution → View logs

See `docs/GRANT_INGESTION_SPEC.md` for full roadmap.

---

## Quick Start Checklist

- [ ] Install dependencies (`npm install fast-xml-parser tsx`)
- [ ] Apply 3 database migrations in Supabase SQL Editor
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- [ ] Run `npm run sync:grants`
- [ ] Verify opportunities appear in database (Table Editor)
- [ ] Check sync state (`connector_sync_state` table)
- [ ] Celebrate! 🎉

---

## Support

Questions? Check:
1. `docs/GRANT_INGESTION_SPEC.md` - Full technical spec
2. `src/lib/connectors/grants-gov-connector.ts` - Implementation details
3. Terminal output - Look for error messages
4. Supabase logs - Check for database errors
