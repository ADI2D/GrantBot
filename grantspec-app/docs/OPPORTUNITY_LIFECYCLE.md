# Opportunity Lifecycle Management

This document explains how grant opportunities are synced, filtered, and cleaned up in the GrantSpec system.

## Overview

GrantSpec manages opportunities through a complete lifecycle:

1. **Sync** - Fetch new opportunities from external sources
2. **Filter** - Only store active opportunities with future deadlines
3. **Display** - Show only relevant, active opportunities to users
4. **Cleanup** - Mark expired opportunities as closed
5. **Archive** - Optionally delete very old opportunities

## Sync Process

### What Gets Synced

The connector ([grants-gov-connector.ts](../src/lib/connectors/grants-gov-connector.ts)) fetches opportunities from Grants.gov and applies filtering at the source:

**Included:**
- ✅ Opportunities with future deadlines
- ✅ Opportunities not yet archived
- ✅ Valid deadline dates

**Excluded:**
- ❌ Archived opportunities
- ❌ Opportunities with past deadlines
- ❌ Opportunities without deadlines
- ❌ Invalid or malformed data

### Sync Schedule

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-grants",
      "schedule": "0 2 * * *"  // Daily at 2 AM UTC
    }
  ]
}
```

## Filtering Layers

GrantSpec uses **defense in depth** with three layers of filtering:

### Layer 1: Connector Filtering (Source)
**File:** [grants-gov-connector.ts](../src/lib/connectors/grants-gov-connector.ts#L375-L398)

```typescript
// XML Extract parsing - filters before storing in DB
const activeOpportunities = opportunities.filter((opp) => {
  // Skip if already archived
  if (opp.ArchiveDate && parseDate(opp.ArchiveDate) < now) return false;

  // Skip if no deadline
  if (!opp.CloseDate) return false;

  // Skip if deadline has passed
  const closeDate = parseDate(opp.CloseDate);
  if (!closeDate || closeDate < now) return false;

  return true;
});
```

**Benefits:**
- Reduces database bloat
- Faster sync times
- Cleaner data from the start

### Layer 2: Backend Filtering (Database Query)
**File:** [data-service.ts](../src/lib/data-service.ts#L56-L82)

```typescript
// API query - filters when fetching from DB
const { data } = await client
  .from("opportunities")
  .select("...")
  .or(`organization_id.eq.${orgId},organization_id.is.null`)
  .neq("status", "closed")                              // Exclude closed
  .gte("deadline", new Date().toISOString().split("T")[0])  // Future deadlines only
  .order("deadline", { ascending: true });
```

**Benefits:**
- Reduces network payload
- Faster API responses
- Less data to process on frontend

### Layer 3: Frontend Filtering (Display)
**File:** [opportunities/page.tsx](../src/app/(dashboard)/opportunities/page.tsx#L56-L88)

```typescript
// UI filtering - final safety net
const filteredOpportunities = data.opportunities.filter((opp) => {
  // Filter out closed opportunities
  if (opp.status === "closed") return false;

  // Filter out past deadlines
  if (opp.deadline && new Date(opp.deadline) < new Date()) return false;

  // Apply user filters (focus area, search)
  // ...

  return true;
});
```

**Benefits:**
- Real-time filtering without API calls
- Handles edge cases
- User-controlled filters (search, focus area)

## Cleanup Process

### Daily Cleanup Cron

**File:** [cleanup-opportunities/route.ts](../src/app/api/cron/cleanup-opportunities/route.ts)

```json
{
  "path": "/api/cron/cleanup-opportunities",
  "schedule": "0 3 * * *"  // Daily at 3 AM UTC (after sync)
}
```

Marks opportunities as closed when their deadline passes:

```typescript
// Update opportunities where deadline < today
await supabase
  .from("opportunities")
  .update({ status: "closed" })
  .lt("deadline", today)
  .neq("status", "closed");
```

### Manual Cleanup

You can also manually trigger cleanup:

```bash
# Via API (requires CRON_SECRET in env)
curl -X POST https://yourdomain.com/api/cron/cleanup-opportunities \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Via admin UI (future feature)
# Admin > Connectors > Cleanup Now
```

## Status Values

Opportunities can have the following statuses:

| Status | Description | Visible to Users |
|--------|-------------|------------------|
| `open` | Active opportunity with deadline >7 days away | ✅ Yes |
| `closing_soon` | Active opportunity with deadline ≤7 days away | ✅ Yes |
| `closed` | Deadline has passed or manually closed | ❌ No |

## RLS Policies

**File:** [APPLY_ALL_MIGRATIONS.sql](../APPLY_ALL_MIGRATIONS.sql#L140-L199)

Row Level Security policies control who can see and manage opportunities:

```sql
-- Read policy: Allow users to see public opportunities OR their org's opportunities
CREATE POLICY "members read org and public opportunities"
  ON opportunities FOR SELECT
  USING (
    organization_id IS NULL  -- Public (synced from external sources)
    OR
    EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.organization_id = opportunities.organization_id
        AND m.user_id = auth.uid()
    )
  );
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     GRANTS.GOV (External)                       │
│                   ~2,500 federal opportunities                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Daily Sync (2 AM UTC)
                            │ Filter: Active + Future Deadlines
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONNECTOR (Layer 1)                          │
│  ✅ Has future deadline     ❌ Archived                         │
│  ✅ Not archived            ❌ No deadline                      │
│  ✅ Valid date format       ❌ Past deadline                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Store in DB
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DATABASE (Supabase)                           │
│              opportunities table (RLS enabled)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Query with filters
                            │ (Layer 2: Backend)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API ENDPOINT                                 │
│  SELECT * FROM opportunities                                    │
│  WHERE organization_id IS NULL                                  │
│    AND status != 'closed'                                       │
│    AND deadline >= TODAY                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Return JSON
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND (Layer 3)                             │
│  User filters: Focus area, Search, Status                       │
│  Final filtering: Remove closed/expired                         │
└─────────────────────────────────────────────────────────────────┘

           ┌────────────────────────────────┐
           │  CLEANUP CRON (3 AM UTC)       │
           │  Marks expired as closed       │
           └────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| [grants-gov-connector.ts](../src/lib/connectors/grants-gov-connector.ts) | Fetches and filters opportunities at source |
| [pipeline.ts](../src/lib/ingestion/pipeline.ts) | Orchestrates sync and upsert to database |
| [data-service.ts](../src/lib/data-service.ts) | Backend queries with filtering |
| [opportunities/page.tsx](../src/app/(dashboard)/opportunities/page.tsx) | Frontend display with filtering |
| [cleanup.ts](../src/lib/connectors/cleanup.ts) | Cleanup utilities |
| [cleanup-opportunities/route.ts](../src/app/api/cron/cleanup-opportunities/route.ts) | Cron endpoint for cleanup |

## Testing

### Test Connector Filtering

```bash
# Run a sync and check console output
npm run sync:grants:grants_gov

# Look for logs like:
# [grants_gov] Filtered to 1234 active opportunities (456 archived/closed)
```

### Test Backend Filtering

```bash
# Query the API
curl https://yourdomain.com/api/opportunities?orgId=YOUR_ORG_ID

# Should only return opportunities with:
# - status != 'closed'
# - deadline >= today
```

### Test Cleanup

```bash
# Trigger cleanup manually
curl -X POST http://localhost:3000/api/cron/cleanup-opportunities

# Check response:
# { "success": true, "count": 42, "message": "Marked 42 opportunities as closed" }
```

## Environment Variables

```bash
# Required for sync
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional: Use mock data instead of real Grants.gov
GRANTS_GOV_USE_MOCK=true

# Optional: Secure cron endpoints
CRON_SECRET=your-secret-key
```

## Best Practices

1. **Let connectors filter first** - Don't store stale data
2. **Use backend filtering** - Reduce network overhead
3. **Keep frontend filtering** - Handle edge cases and user preferences
4. **Run cleanup daily** - Keep the database current
5. **Monitor sync logs** - Check for errors and data quality issues

## Troubleshooting

### No opportunities showing after sync

1. Check RLS policies are applied: [APPLY_ALL_MIGRATIONS.sql](../APPLY_ALL_MIGRATIONS.sql)
2. Verify opportunities have `organization_id = null` (public)
3. Check filtering isn't too aggressive (deadlines, status)

### Too many old opportunities

1. Run cleanup manually: `POST /api/cron/cleanup-opportunities`
2. Check cleanup cron is configured in `vercel.json`
3. Verify `CRON_SECRET` is set correctly

### Sync errors

1. Check Grants.gov is accessible
2. Verify XML Extract URL is current
3. Review connector logs for parsing errors
4. Consider enabling mock mode: `GRANTS_GOV_USE_MOCK=true`
