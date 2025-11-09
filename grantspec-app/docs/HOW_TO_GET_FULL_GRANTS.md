# How to Download the Full Grants.gov Database

## Current Situation

You currently have **8 grants** in your database. These came from the Grants.gov **RSS feed**, which only includes opportunities published in the **last 7-30 days**.

## Get ALL Active Grants (2,000-4,000 Opportunities)

To download the **full Grants.gov database** with all currently active federal grant opportunities:

### Method 1: Use the Admin UI (Recommended)

1. **Navigate to the Connectors page**
   - Go to your app at `http://localhost:3000` (or your production URL)
   - Click **Connectors** in the left sidebar

2. **Click "Full Refresh"**
   - Find the "Grants Gov" connector
   - Click the **"Full Refresh"** button (NOT the regular "Sync" button)
   - This will trigger a download of the complete XML Extract

3. **Wait 1-3 minutes**
   - The XML Extract is a large file (~20-50 MB)
   - It contains 2,000-4,000 active opportunities
   - The page will auto-refresh and show updated counts

4. **Verify the results**
   - You should see "Records Fetched: 2000+" (or similar)
   - "Created: 1900+" (approximately, minus the 8 you already have)
   - Navigate to **Opportunities** page to see all grants

### Method 2: Use the CLI

```bash
# Full refresh (downloads all active grants)
npm run sync:grants -- --full

# This is equivalent to:
npm run sync:grants -- --full --source grants_gov
```

### Method 3: Use the API

```bash
curl -X POST http://localhost:3000/api/admin/sync-grants \
  -H "Content-Type: application/json" \
  -d '{"source": "grants_gov", "force": true}'
```

---

## How It Works

### Full Refresh vs Incremental Sync

The connector now uses **two different data sources** depending on the sync mode:

| Mode | Button | Data Source | Coverage |
|------|--------|-------------|----------|
| **Incremental** | "Sync" | RSS Feed | Recent updates (last 7-30 days) |
| **Full Refresh** | "Full Refresh" | XML Extract | ALL active opportunities |

### Data Sources

**1. XML Extract (Full Database)**
- URL: `https://www.grants.gov/extract/GrantsDBExtract.xml`
- Size: ~20-50 MB
- Count: 2,000-4,000 active opportunities
- Updates: Daily (around midnight ET)
- Use: Full refresh, initial import

**2. RSS Feed (Recent Updates)**
- URL: `https://www.grants.gov/web/grants/rss/GG_NewOppByAgency.xml`
- Size: ~100-500 KB
- Count: 8-50 recent opportunities
- Updates: Real-time
- Use: Daily incremental syncs

### Sync Logic

```typescript
// Full refresh (no 'since' date)
if (!since) {
  return await this.fetchXMLExtract(); // Gets ALL grants
}

// Incremental (with 'since' date)
return await this.fetchRSSFeed(since); // Gets only recent updates
```

---

## What You'll See

### Before Full Refresh
```
Active Connectors: 1
Grants Gov: healthy

Last Sync: 10/31/2025, 5:43:05 PM
Records Fetched: 8
Created: 0
Updated: 8
```

### After Full Refresh
```
Active Connectors: 1
Grants Gov: healthy

Last Sync: 10/31/2025, 6:15:22 PM
Records Fetched: 2,847
Created: 2,839
Updated: 8
```

---

## Scheduled Syncs

Once you've done the initial full refresh, the **automated daily syncs** will use the **incremental mode** (RSS feed):

- **Manual Full Refresh**: Downloads all 2,000-4,000 grants (use when you need to re-import everything)
- **Manual Sync**: Downloads only recent updates (use for quick refresh)
- **Scheduled Daily Sync**: Downloads only recent updates (runs automatically at 2 AM UTC)

This is efficient because:
- Daily syncs are fast (~5-10 seconds)
- Only new/updated grants are fetched
- Full database refresh only needed occasionally

---

## Troubleshooting

### "Records Fetched: 8" (Still Only Getting RSS Feed)

**Problem:** Clicking "Full Refresh" still only fetches 8 grants.

**Solution:** Make sure you clicked **"Full Refresh"** not **"Sync"**. The buttons do different things:
- "Sync" = Incremental (RSS feed, ~8 grants)
- "Full Refresh" = Full (XML Extract, ~2,000+ grants)

### "Error: Failed to fetch XML Extract"

**Possible causes:**
1. Grants.gov server is down (check https://www.grants.gov/xml-extract.html)
2. Timeout (XML file is large, may take 30-60 seconds)
3. Network issue (firewall blocking request)

**Solution:**
- Try again in a few minutes
- Check Grants.gov status page
- If on Vercel, increase API route timeout (see `maxDuration` in `/api/admin/sync-grants/route.ts`)

### Sync Takes Too Long / Times Out

**Problem:** The full refresh times out on Vercel (10 second limit on Hobby plan).

**Solutions:**

1. **Use Vercel Pro Plan** - Increases timeout to 60 seconds
2. **Run CLI locally** - No timeout limits:
   ```bash
   npm run sync:grants -- --full
   ```
3. **Upgrade maxDuration** - In `/api/admin/sync-grants/route.ts`:
   ```typescript
   export const maxDuration = 60; // Requires Vercel Pro
   ```

### Database Fills Up

**Problem:** Too many old/expired grants in database.

**Solution:** Implement cleanup job to delete expired opportunities:
```sql
DELETE FROM opportunities
WHERE deadline < NOW() - INTERVAL '90 days'
  AND source = 'grants_gov';
```

---

## Next Steps

After getting the full database:

1. **Browse Opportunities**
   - Go to `/opportunities` page
   - Filter by focus area, amount, deadline
   - Search by keywords

2. **Set Up Filters**
   - Create saved searches for your organization
   - Get email alerts for matching grants
   - Track favorites

3. **Monitor Data Quality**
   - Check for missing fields (deadline, amount, etc.)
   - Review focus area mappings
   - Report issues to improve connector

4. **Schedule Regular Updates**
   - Let the daily cron job handle incremental syncs
   - Run full refresh monthly to catch any missed updates
   - Monitor connector health in admin UI

---

## Performance Notes

### Full Refresh Performance

Typical performance metrics:

| Stage | Time | Size |
|-------|------|------|
| Download XML | 10-30 sec | 20-50 MB |
| Parse XML | 5-15 sec | 2,000-4,000 records |
| Database Insert | 20-60 sec | Batch upserts |
| **Total** | **35-105 sec** | **~2,500 grants** |

### Database Storage

| Item | Count | Size |
|------|-------|------|
| Opportunities | ~2,500 | ~5-10 MB |
| Sync Logs | 1 per sync | ~1 KB each |
| Connector State | 1 | ~1 KB |

### API Limits

Grants.gov does NOT have official API rate limits for the XML Extract or RSS feeds, but best practices:

- **Full refresh**: Once per day max (data only updates daily anyway)
- **Incremental**: Every 1-4 hours is fine (cron runs once daily)
- **User-Agent**: Always include (already implemented)

---

## Summary

✅ **To get the full database:**
1. Click **"Full Refresh"** button in Connectors admin UI
2. Wait 1-3 minutes
3. Verify you see 2,000+ records fetched

✅ **Daily updates:**
- Automatic cron runs at 2 AM UTC (incremental mode)
- Only fetches new/updated grants (fast, efficient)

✅ **When to use Full Refresh:**
- Initial setup (right now!)
- Monthly maintenance (catch any missed updates)
- After prolonged downtime
- If data looks incomplete

🎉 **You're all set!** The system will now keep your grant database up-to-date automatically.
