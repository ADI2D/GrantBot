# Connector Status Reference

This document defines all connector status states and their visual representations in the admin interface.

## Overview

The connector system uses two independent status dimensions:

1. **Health Status** - Overall connector health (healthy, warning, error)
2. **Activity Status** - Current activity state (idle, running)

## Status States

### Health Status

Health status indicates the overall condition of the connector based on sync history and performance.

| Status | Badge Color | Criteria | Meaning |
|--------|-------------|----------|---------|
| **Healthy** | Green | Last sync succeeded within 48 hours | Connector is working properly |
| **Warning** | Yellow/Amber | No sync in 48+ hours OR never synced | Needs attention - may be stale |
| **Error** | Red | Last sync failed with errors | Connector is broken - immediate action needed |

**Health Calculation Logic:**
```typescript
// Located in: src/app/api/admin/connector-health/route.ts

let health: "healthy" | "warning" | "error" = "healthy";

if (connector.status === "error") {
  health = "error";
} else if (hoursSinceLastSync && hoursSinceLastSync > 48) {
  health = "warning"; // No sync in 48 hours
} else if (!connector.last_successful_sync_at) {
  health = "warning"; // Never successfully synced
}
```

### Activity Status

Activity status shows what the connector is currently doing.

| Status | Badge | Visual | Meaning |
|--------|-------|--------|---------|
| **Running** | "Syncing now" (blue, pulsing) | Animated pulse | Actively syncing data RIGHT NOW |
| **Idle + Healthy** | "Ready" (gray) | Static | Connected and waiting for next scheduled sync |
| **Idle + Warning/Error** | (No additional badge) | Static | Not syncing, has issues |

**Activity Display Logic:**
```typescript
// Located in: src/app/admin/connectors/page.tsx

{connector.status === "running" && (
  <Badge tone="info" className="animate-pulse">Syncing now</Badge>
)}

{connector.status === "idle" && connector.health === "healthy" && (
  <Badge tone="neutral" className="bg-slate-100 text-slate-600">Ready</Badge>
)}
```

## Visual Examples

### Combined Status Display

The admin interface shows both badges together for maximum clarity:

**Example 1: Active Sync**
```
Grants Gov  [Healthy]  [Syncing now ●]
Last Sync: 11/1/2025, 6:36:13 AM
```

**Example 2: Ready and Waiting**
```
Grants Gov  [Healthy]  [Ready]
Last Sync: 11/1/2025, 6:36:13 AM
```

**Example 3: Needs Attention**
```
Grants Gov  [Warning]
Last Sync: 10/25/2025, 3:12:45 PM
```

**Example 4: Broken**
```
Grants Gov  [Error]
Last Sync: Failed at 11/1/2025, 2:15:00 AM
Errors: Rate limit exceeded, API timeout
```

## Database Schema

### connector_sync_state Table

Stores the persistent state of each connector.

```sql
CREATE TABLE connector_sync_state (
  source TEXT PRIMARY KEY,              -- Connector identifier (e.g., "grants_gov")
  status TEXT NOT NULL,                 -- Current activity: "idle" | "running" | "error"
  last_sync_started_at TIMESTAMPTZ,     -- When last sync began
  last_sync_completed_at TIMESTAMPTZ,   -- When last sync finished
  last_successful_sync_at TIMESTAMPTZ,  -- When last successful sync occurred
  records_fetched INTEGER DEFAULT 0,    -- Total records fetched in last sync
  records_created INTEGER DEFAULT 0,    -- New records created
  records_updated INTEGER DEFAULT 0,    -- Existing records updated
  records_skipped INTEGER DEFAULT 0,    -- Records skipped (duplicates)
  errors JSONB,                         -- Array of error objects
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sync_logs Table

Audit trail of all sync operations.

```sql
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,                 -- Which connector
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,                 -- "success" | "partial" | "failed" | "running"
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### GET /api/admin/connector-health

Returns health status and metrics for all connectors.

**Response:**
```json
{
  "connectors": [
    {
      "source": "grants_gov",
      "status": "idle",
      "health": "healthy",
      "last_sync_completed_at": "2025-11-01T06:36:13Z",
      "records_fetched": 1250,
      "records_created": 45,
      "records_updated": 203,
      "hours_since_last_sync": 2.5
    }
  ],
  "summary": {
    "total": 1,
    "healthy": 1,
    "warning": 0,
    "error": 0
  }
}
```

### GET /api/admin/sync-logs

Returns recent sync history.

**Query Parameters:**
- `source` (optional) - Filter by connector source
- `limit` (optional, default: 50) - Max records to return

**Response:**
```json
{
  "logs": [
    {
      "id": 123,
      "source": "grants_gov",
      "started_at": "2025-11-01T06:36:00Z",
      "completed_at": "2025-11-01T06:36:13Z",
      "status": "success",
      "records_processed": 1250,
      "records_created": 45,
      "records_updated": 203,
      "records_skipped": 1002
    }
  ],
  "count": 1
}
```

### POST /api/admin/sync-grants

Manually trigger a sync operation.

**Request Body:**
```json
{
  "source": "grants_gov",
  "force": false  // Set true to bypass cache
}
```

## State Transitions

### Normal Sync Cycle

```
[Idle, Healthy, Ready]
    → User clicks "Sync" or cron triggers
    → [Running, Healthy, Syncing now (pulsing)]
    → Sync completes successfully
    → [Idle, Healthy, Ready]
```

### Warning Condition

```
[Idle, Healthy, Ready]
    → 48+ hours pass without sync
    → [Idle, Warning] (no Ready badge)
```

### Error Condition

```
[Running, Healthy, Syncing now]
    → Sync fails with errors
    → [Idle, Error] (no Ready badge)
    → Show error details below
```

### Recovery from Error

```
[Idle, Error]
    → User clicks "Sync" or "Full Refresh"
    → [Running, Error, Syncing now (pulsing)]
    → Sync completes successfully
    → [Idle, Healthy, Ready]
```

## UI Components

### Badge Styles

All badges use the same component with different tones:

```typescript
// Health badges
<Badge tone="success">Healthy</Badge>     // Green
<Badge tone="warning">Warning</Badge>     // Yellow
<Badge tone="error">Error</Badge>         // Red

// Activity badges
<Badge tone="info" className="animate-pulse">Syncing now</Badge>  // Blue, pulsing
<Badge tone="neutral" className="bg-slate-100 text-slate-600">Ready</Badge>  // Gray
```

### Capitalization Rules

- **Health statuses**: Always capitalize first letter (Healthy, Warning, Error)
- **Activity badges**: Use sentence case ("Syncing now", "Ready")

## Monitoring & Alerts

### Recommended Monitoring

1. **Health Check Interval**: Every 30 seconds (configured in connectors page)
2. **Alert Thresholds**:
   - Warning: No successful sync in 48 hours
   - Error: Any sync with `status === "error"`

### Auto-Refresh

The connectors admin page auto-refreshes every 30 seconds:

```typescript
useQuery({
  queryKey: ["connector-health"],
  queryFn: fetchConnectorHealth,
  refetchInterval: 30000, // 30 seconds
});
```

## Troubleshooting

### Connector Stuck in "Running"

If a connector shows "Syncing now" for more than 10 minutes:

1. Check sync_logs table for the stuck record
2. Look for errors in the logs
3. Manually update connector_sync_state to set status = 'error'
4. Trigger a fresh sync

### "Warning" State Won't Clear

If connector shows Warning despite recent successful sync:

1. Verify `last_successful_sync_at` is populated in connector_sync_state
2. Check that less than 48 hours have passed since last sync
3. Refresh the page to get latest health calculation

### "Ready" Badge Not Showing

The "Ready" badge only shows when:
- `status === "idle"` AND
- `health === "healthy"`

If either condition is false, the badge won't appear.

---

## Related Documentation

- [Grant Ingestion Specification](./GRANT_INGESTION_SPEC.md)
- [Grant Sync Setup Guide](./GRANT_SYNC_SETUP.md)
- [How to Get Full Grants](./HOW_TO_GET_FULL_GRANTS.md)

## Implementation Files

- UI: `src/app/admin/connectors/page.tsx`
- Health API: `src/app/api/admin/connector-health/route.ts`
- Sync Logs API: `src/app/api/admin/sync-logs/route.ts`
- Sync Trigger API: `src/app/api/admin/sync-grants/route.ts`
- Database: `supabase/migrations/20241101_connector_sync_state.sql`
