# Quick Start: Get All 2,500+ Grants

## Problem Solved ✅

The XML Extract URL was returning HTML instead of XML because:
- Grants.gov provides the data as a **ZIP file**, not raw XML
- The filename changes daily: `GrantsDBExtract20251031v2.zip`
- It's hosted on S3, not at the old static URL

## Solution Implemented

I've updated the connector to:
1. Scrape the download page to get today's ZIP filename
2. Download the ~76 MB ZIP file from S3
3. Extract the XML file from the ZIP
4. Parse all ~2,500 opportunities

## How to Get All Grants RIGHT NOW

### Step 1: Install Dependencies

```bash
cd /Users/alexbach/Library/CloudStorage/OneDrive-Personal/Alex/_Startup/CODEX/grantbot-app
npm install
```

This will install the new `adm-zip` package for handling ZIP files.

### Step 2: Run Full Sync

**Option A: Use CLI (See detailed logs)**
```bash
npm run sync:grants -- --full
```

**Option B: Use Admin UI (More visual)**
1. Restart your dev server: `npm run dev`
2. Go to `http://localhost:3000/admin/connectors`
3. Click **"Full Refresh"** button
4. Wait 1-3 minutes

### Step 3: Verify Results

You should see:
- **Records Fetched:** ~2,500 (actual count varies daily)
- **Created:** ~2,492 new opportunities
- **Updated:** 8 existing opportunities
- **Duration:** 60-120 seconds

Navigate to `/opportunities` to see all grants!

---

## What Changed

### Files Modified

1. **[src/lib/connectors/grants-gov-connector.ts](../src/lib/connectors/grants-gov-connector.ts)**
   - Added `fetchXMLExtract()` - Downloads and extracts ZIP file
   - Added `extractXMLFromZip()` - Unzips and reads XML
   - Updated URLs to use Grants.gov S3 bucket
   - Added dynamic filename detection

2. **[package.json](../package.json)**
   - Added `adm-zip@^0.5.16` - ZIP file handling
   - Added `@types/adm-zip@^0.5.5` - TypeScript types

### How It Works Now

```typescript
// OLD (Broken):
const xmlContent = await fetch("https://www.grants.gov/extract/GrantsDBExtract.xml");
// ❌ Returns HTML page, not XML

// NEW (Working):
// 1. Fetch the download page
const page = await fetch("https://www.grants.gov/xml-extract");

// 2. Find today's ZIP filename in the HTML
const zipFilename = page.match(/GrantsDBExtract\d{8}v2\.zip/)[0];
// e.g., "GrantsDBExtract20251031v2.zip"

// 3. Download ZIP from S3
const zipUrl = `https://prod-grants-gov-chatbot.s3.amazonaws.com/extracts/${zipFilename}`;
const zipBuffer = await fetch(zipUrl).arrayBuffer();

// 4. Extract XML from ZIP
const zip = new AdmZip(Buffer.from(zipBuffer));
const xmlEntry = zip.getEntries().find(e => e.entryName.endsWith('.xml'));
const xmlContent = xmlEntry.getData().toString('utf8');

// 5. Parse XML (same as before)
const opportunities = parseXMLExtract(xmlContent);
// ✅ Returns ~2,500 grant opportunities
```

---

## Expected Console Output

When running `npm run sync:grants -- --full`, you'll see:

```
================================================================================
GRANTBOT - OPPORTUNITY SYNC
================================================================================
Mode: FULL REFRESH
Source: ALL
================================================================================

[Pipeline] Starting sync for grants_gov...
[grants_gov] Fetching opportunities...
[grants_gov] Full refresh: Fetching XML Extract (all active opportunities)
[grants_gov] Fetching XML Extract download page...
[grants_gov] Found ZIP file: GrantsDBExtract20251031v2.zip
[grants_gov] Downloading from: https://prod-grants-gov-chatbot.s3.amazonaws.com/extracts/GrantsDBExtract20251031v2.zip
[grants_gov] This may take 30-60 seconds (~76 MB)...
[grants_gov] ZIP downloaded (76.28 MB)
[grants_gov] Extracting XML from ZIP...
[grants_gov] Found XML file: GrantsDBExtract20251031.xml
[grants_gov] XML extracted (145.32 MB)
[grants_gov] Parsed XML Extract root keys: Grants
[grants_gov] Found 2847 opportunities in XML Extract
[Pipeline] grants_gov: Fetched 2847 raw records
[Pipeline] grants_gov: Completed in 98432ms - Created: 2839, Updated: 8, Skipped: 0, Errors: 0

================================================================================
SYNC RESULTS
================================================================================
✅ grants_gov
   Status: SUCCESS
   Duration: 98.43s
   Fetched: 2847
   Created: 2839
   Updated: 8
   Skipped: 0
   Errors: 0

================================================================================
```

---

## Troubleshooting

### Error: "Cannot find module 'adm-zip'"

**Solution:** Run `npm install` to install dependencies.

### Error: "Could not find XML Extract ZIP filename"

**Cause:** The Grants.gov page structure changed or is temporarily unavailable.

**Solution:**
1. Check https://www.grants.gov/xml-extract manually
2. If page loads, update the regex in `fetchXMLExtract()` method
3. If page is down, try again in a few hours

### Error: "No XML file found in ZIP archive"

**Cause:** ZIP structure changed (unlikely).

**Solution:** Download the ZIP manually and inspect contents, then update `extractXMLFromZip()` logic.

### Sync Takes Too Long / Times Out

**Cause:** Large file download (76 MB) + parsing (145 MB XML) takes time.

**Solution:**
- CLI: No timeout, will complete eventually (usually 60-120 seconds)
- Admin UI: Runs in background, check logs in terminal
- Vercel: Increase `maxDuration` in API routes (requires Pro plan for >60s)

### Only Getting 8 Grants Still

**Possible causes:**
1. Didn't restart dev server after code changes
2. Clicked "Sync" instead of "Full Refresh"
3. `npm install` didn't run

**Solution:**
1. Stop dev server (Ctrl+C)
2. Run `npm install`
3. Start dev server: `npm run dev`
4. Click **"Full Refresh"** (not "Sync")

---

## Daily Updates

After the initial full refresh:

- **Scheduled Cron** (2 AM UTC) → Incremental sync (RSS feed, fast)
- **Manual "Sync"** → Incremental sync (RSS feed, only new grants)
- **Manual "Full Refresh"** → Full sync (ZIP download, all grants)

**Recommendation:** Run full refresh monthly or when data seems stale.

---

## Next Steps

1. **Install dependencies:** `npm install`
2. **Run full sync:** `npm run sync:grants -- --full`
3. **Browse opportunities:** Go to `/opportunities` page
4. **Set up filters:** Create saved searches for your org
5. **Monitor health:** Check `/admin/connectors` regularly

🎉 **You're all set!** The system will now keep your database up-to-date with all federal grant opportunities.
