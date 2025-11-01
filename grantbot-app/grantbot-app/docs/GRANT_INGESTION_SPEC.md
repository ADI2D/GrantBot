# Grant Opportunity Ingestion Pipeline - Technical Spec

**Version:** 1.0
**Date:** October 31, 2024
**Status:** Approved for Implementation
**Owner:** GrantBot Engineering

---

## 1. Problem Statement

GrantBot currently relies on manual curation to populate grant opportunities, which limits:
- **Coverage:** Only ~50-100 opportunities can be manually added per month
- **Freshness:** Manual updates lag behind actual opportunity postings
- **Scalability:** Cannot serve growing user base without proportional manual effort
- **Competitiveness:** Users expect comprehensive opportunity databases

**User Impact:** Nonprofits miss grant opportunities because they're not in our database.

---

## 2. Solution Overview

Build an automated **Grant Opportunity Ingestion Pipeline** that:
1. Fetches opportunities from external sources (starting with Grants.gov federal data)
2. Normalizes data into canonical schema
3. Deduplicates across sources
4. Enriches with additional metadata (funder financials, historical data)
5. Syncs to database on scheduled basis
6. Scales to support multiple sources over time

**Key Principle:** Start simple (one source), build extensible architecture for future growth.

---

## 3. Architecture

### 3.1 High-Level Flow

```
┌─────────────────┐
│  Data Sources   │
│  (Grants.gov,   │
│   State portals,│
│   etc.)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Connectors    │  ← Fetch raw data from each source
│  (Modular)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Normalizer     │  ← Transform to canonical schema
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Enrichment     │  ← Add Open990, ML scores, etc.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deduplicator   │  ← Identify and merge duplicates
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │  ← Store in opportunities table
│  (Supabase)     │
└─────────────────┘
```

### 3.2 Component Breakdown

**Connectors** (`src/lib/connectors/`)
- Each source gets its own connector module
- All implement common `GrantConnector` interface
- Responsible for: fetching, rate limiting, error handling
- Track sync state per source

**Normalizer** (`src/lib/normalizers/`)
- Maps source-specific fields to canonical schema
- Handles data validation and cleaning
- Preserves raw data for traceability

**Enrichment** (`src/lib/enrichment/`)
- Open990 API integration (funder financials)
- ML-based alignment scoring (future)
- Historical funding patterns (future)

**Deduplication** (`src/lib/deduplication/`)
- Exact match on `external_id` + `source`
- Cross-source canonical ID matching
- Fuzzy matching on title + funder + deadline (manual review)

**Pipeline Orchestrator** (`src/lib/ingestion/`)
- Runs all active connectors
- Manages transaction boundaries
- Handles failures and retries
- Logs metrics and errors

---

## 4. Data Schema

### 4.1 Existing Table Updates

**`opportunities` table** - Add new columns:

```sql
ALTER TABLE opportunities
ADD COLUMN source TEXT DEFAULT 'manual',  -- 'grants_gov', 'ca_state', 'manual', etc.
ADD COLUMN external_id TEXT,               -- Original ID from source
ADD COLUMN raw_data JSONB,                 -- Full original data for traceability
ADD COLUMN last_synced_at TIMESTAMPTZ,     -- When we last fetched this
ADD COLUMN source_updated_at TIMESTAMPTZ;  -- When source last modified it

-- Unique constraint: same external_id from same source = same opportunity
CREATE UNIQUE INDEX idx_opportunities_external_source
  ON opportunities(external_id, source)
  WHERE external_id IS NOT NULL;

-- Index for finding opportunities to refresh
CREATE INDEX idx_opportunities_sync
  ON opportunities(source, last_synced_at);
```

### 4.2 New Tables

**`connector_sync_state` table** - Track connector health:

```sql
CREATE TABLE connector_sync_state (
  source TEXT PRIMARY KEY,                  -- 'grants_gov', 'ca_state', etc.
  last_sync_started_at TIMESTAMPTZ,
  last_sync_completed_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors JSONB,
  status TEXT DEFAULT 'idle',               -- 'idle', 'running', 'error'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`sync_logs` table** - Audit trail:

```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,                     -- 'success', 'partial', 'failed'
  records_processed INTEGER DEFAULT 0,
  errors JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_source ON sync_logs(source, started_at DESC);
```

### 4.3 Canonical Opportunity Schema

All sources normalize to these fields:

```typescript
type CanonicalOpportunity = {
  // Identification
  source: string;              // 'grants_gov', 'ca_state', etc.
  external_id: string;         // Source's unique ID

  // Core data (existing fields)
  organization_id: uuid;       // Which org owns this (null = global)
  name: string;
  focus_area: string;
  amount: number;
  deadline: date;
  status: string;

  // New enrichment fields
  funder_name: string;
  funder_ein: string;          // From Open990
  eligibility_requirements: string[];
  application_url: string;
  contact_email: string;
  geographic_scope: string;    // 'national', 'state', 'local'

  // Metadata
  raw_data: jsonb;             // Original data
  last_synced_at: timestamptz;
  source_updated_at: timestamptz;
};
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Get Grants.gov connector working end-to-end

**Deliverables:**
- [ ] Base connector interface (`GrantConnector`)
- [ ] Grants.gov connector implementation
  - Fetch opportunities from Grants.gov API/XML feed
  - Parse XML to structured data
  - Handle pagination and rate limits
- [ ] Normalizer for Grants.gov data
- [ ] Database migrations (add columns to `opportunities`, create new tables)
- [ ] CLI script to run sync manually (`npm run sync:grants`)
- [ ] Basic error handling and logging

**Success Criteria:**
- Can fetch ≥100 federal opportunities from Grants.gov
- Opportunities appear in database with correct schema
- Sync can be triggered manually via CLI
- No data loss or corruption

**Time Estimate:** 1-2 weeks

---

### Phase 2: Production Readiness (Week 3)
**Goal:** Make pipeline reliable and observable

**Deliverables:**
- [ ] Sync state tracking (connector_sync_state table)
- [ ] Incremental updates (only fetch new/changed opportunities)
- [ ] Error handling and retry logic
- [ ] Admin API endpoints:
  - `POST /api/admin/sync-grants` - Trigger manual sync
  - `GET /api/admin/connector-health` - View sync status
- [ ] Admin UI page to:
  - View connector status
  - Trigger manual syncs
  - View sync logs and errors
- [ ] Scheduled cron job (daily sync at 2am)

**Success Criteria:**
- Sync runs automatically every 24 hours
- Admin can manually trigger sync via UI
- Failed syncs log errors and retry
- Can view sync history and status

**Time Estimate:** 1 week

---

### Phase 3: User Validation (Week 4)
**Goal:** Launch to users and gather feedback

**Deliverables:**
- [ ] Update opportunities page to show source badges
- [ ] Add filter: "Federal" vs "Foundation" vs "State"
- [ ] Add "Last updated" timestamp to opportunities
- [ ] Monitor user engagement with synced opportunities
- [ ] Gather feedback: What other sources do users want?

**Success Criteria:**
- ≥500 federal opportunities in database
- Users can see and interact with synced opportunities
- Identify top 3 requested additional sources

**Time Estimate:** 1 week (mostly monitoring)

---

### Phase 4: Expansion (Month 2-3)
**Goal:** Add more sources based on user demand

**Candidates (prioritize based on Phase 3 feedback):**
- State portals: California, New York, Texas
- Open990 enrichment (funder financials)
- Manual foundation curation (admin UI)
- Additional federal sources (NSF, NIH if not in Grants.gov)

**Deliverables:**
- [ ] 2-3 additional connectors
- [ ] Deduplication logic (cross-source matching)
- [ ] Enrichment pipeline (Open990 API integration)
- [ ] Improved search/filtering

**Success Criteria:**
- ≥1,000 opportunities across multiple sources
- <5% duplicate rate
- Funder metadata enriched on ≥50% of opportunities

**Time Estimate:** 1-2 months (depending on sources)

---

## 6. API Specifications

### 6.1 Admin Endpoints

#### Trigger Manual Sync
```typescript
POST /api/admin/sync-grants

Request:
{
  source?: string;  // Optional: sync specific source, or all if omitted
  force?: boolean;  // Force full refresh (ignore incremental)
}

Response:
{
  sync_id: string;
  source: string;
  status: "started" | "queued";
  message: string;
}
```

#### Get Connector Health
```typescript
GET /api/admin/connector-health

Response:
{
  connectors: [
    {
      source: "grants_gov",
      status: "idle" | "running" | "error",
      last_sync_at: "2024-10-31T12:00:00Z",
      last_successful_sync_at: "2024-10-31T12:00:00Z",
      records_fetched: 523,
      errors: null
    }
  ]
}
```

#### Get Sync Logs
```typescript
GET /api/admin/sync-logs?source=grants_gov&limit=50

Response:
{
  logs: [
    {
      id: "uuid",
      source: "grants_gov",
      started_at: "2024-10-31T12:00:00Z",
      completed_at: "2024-10-31T12:05:32Z",
      status: "success",
      records_processed: 523,
      errors: null
    }
  ]
}
```

### 6.2 User-Facing Changes

#### Opportunities API (existing, add new fields)
```typescript
GET /api/opportunities?orgId=xxx

Response:
{
  opportunities: [
    {
      id: "uuid",
      name: "Community Development Block Grant",
      source: "grants_gov",           // NEW
      external_id: "HUD-2024-12345",  // NEW
      funder_name: "HUD",             // NEW
      last_synced_at: "2024-10-31",   // NEW
      // ... existing fields
    }
  ]
}
```

---

## 7. Code Structure

```
src/
├── lib/
│   ├── connectors/
│   │   ├── base-connector.ts           # Interface all connectors implement
│   │   ├── grants-gov-connector.ts     # Grants.gov implementation
│   │   └── connector-registry.ts       # Register and manage connectors
│   ├── normalizers/
│   │   ├── grant-normalizer.ts         # Transform to canonical schema
│   │   └── field-mappers.ts            # Field mapping utilities
│   ├── enrichment/
│   │   ├── open990-enricher.ts         # Add funder metadata
│   │   └── enrichment-pipeline.ts      # Orchestrate enrichments
│   ├── deduplication/
│   │   ├── dedup-engine.ts             # Deduplication logic
│   │   └── matchers.ts                 # Fuzzy matching algorithms
│   └── ingestion/
│       ├── pipeline.ts                  # Main ETL orchestrator
│       ├── scheduler.ts                 # Cron job setup
│       └── sync-manager.ts              # Track sync state
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── sync-grants/route.ts    # Trigger sync endpoint
│   │   │   ├── connector-health/route.ts
│   │   │   └── sync-logs/route.ts
│   │   └── opportunities/route.ts       # Update with new fields
│   └── (dashboard)/
│       └── admin/
│           └── connectors/
│               └── page.tsx             # Admin UI for connectors
├── scripts/
│   └── sync-grants.ts                   # CLI tool for local testing
└── supabase/
    └── migrations/
        ├── 20241101_add_connector_fields.sql
        ├── 20241101_connector_sync_state.sql
        └── 20241101_sync_logs.sql
```

---

## 8. Success Metrics

### Phase 1 (Technical Validation)
- ✅ Sync success rate: >95%
- ✅ Data freshness: <24 hour lag from source
- ✅ Opportunity count: ≥500 federal grants
- ✅ Data quality: <2% parsing errors

### Phase 2 (Production)
- ✅ Uptime: >99% for scheduled syncs
- ✅ Sync duration: <10 minutes for incremental
- ✅ Error recovery: Auto-retry failures with exponential backoff
- ✅ Observability: Admin can view sync status at any time

### Phase 3 (User Impact)
- ✅ User engagement: ≥30% of users interact with synced opportunities
- ✅ Conversion: ≥10% of users create proposals from synced opportunities
- ✅ Feedback: Identify top 3 requested additional sources

### Phase 4 (Scale)
- ✅ Multi-source coverage: ≥3 active connectors
- ✅ Total opportunities: ≥1,000
- ✅ Deduplication accuracy: <5% duplicate rate
- ✅ Enrichment coverage: ≥50% with funder metadata

---

## 9. Technical Decisions & Rationale

### Why start with Grants.gov?
- **Authoritative source:** Official federal data, no licensing issues
- **High value:** Federal grants = large dollar amounts nonprofits want
- **API availability:** Well-documented API/XML feeds
- **Proof of concept:** Validates pipeline architecture before expanding

### Why modular connector pattern?
- **Scalability:** Add sources without touching existing code
- **Maintainability:** Each connector is independently testable
- **Flexibility:** Can enable/disable sources via feature flags
- **Resilience:** One broken connector doesn't break others

### Why store raw_data in JSONB?
- **Traceability:** Can debug data issues by inspecting original
- **Re-processing:** Can re-normalize if schema changes
- **Flexibility:** Different sources have different fields
- **Compliance:** May need to prove data provenance

### Why incremental updates vs full refresh?
- **Performance:** Faster syncs (seconds vs minutes)
- **Cost:** Fewer API calls to data sources
- **User experience:** More frequent updates without impact
- **Scalability:** Enables hourly syncs as we grow

---

## 10. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Grants.gov API changes break connector | High | Medium | Store raw data; monitor for errors; version connectors |
| Deduplication creates false matches | Medium | Medium | Start with conservative thresholds; flag ambiguous for review |
| Sync failures go unnoticed | High | Low | Admin alerts; monitoring dashboard; daily health checks |
| Rate limiting from data sources | Medium | Medium | Implement exponential backoff; respect API limits |
| Data quality issues (parsing errors) | Medium | High | Validation on normalization; log bad records; manual review |
| Storage costs grow with raw data | Low | High | Archive old raw data; compress JSONB; monitor growth |

---

## 11. Open Questions & Future Decisions

**To decide in Phase 1:**
- [ ] Grants.gov API vs XML feed vs RSS? (Test performance/reliability)
- [ ] How often to sync? (Start daily, increase to hourly if needed)
- [ ] Error notification strategy? (Email admin? Slack? Dashboard only?)

**To decide in Phase 3 (based on user feedback):**
- [ ] Which state portals to prioritize?
- [ ] Budget for commercial data licensing (Candid, Instrumentl)?
- [ ] When to invest in ML-based deduplication?

**To decide in Phase 4:**
- [ ] Move to Elasticsearch for search? (If Postgres full-text is slow)
- [ ] Add caching layer (Redis)? (If API response times degrade)
- [ ] Parallelize connectors? (If sync duration >15 minutes)

---

## 12. Dependencies & Prerequisites

**Technical:**
- ✅ Supabase Postgres (already have)
- ✅ Next.js API routes (already have)
- ✅ Node.js cron job capability (use Vercel Cron or node-cron)
- 🔲 Grants.gov API access (free, no API key needed)
- 🔲 ProPublica Nonprofit Explorer API (free, no API key needed)

**Product:**
- ✅ `opportunities` table exists (already have)
- ✅ Admin role/permissions (already have via org_members.role)
- 🔲 Admin UI section (need to create)

**Legal:**
- ✅ Federal data is public domain (no licensing needed)
- 🔲 Review ToS for any commercial sources before adding

---

## 13. Success Checklist

**Phase 1 Complete When:**
- [ ] Can run `npm run sync:grants` and fetch ≥100 opportunities
- [ ] Opportunities appear in database with correct schema
- [ ] Can view synced opportunities in existing UI
- [ ] Zero data corruption or loss

**Phase 2 Complete When:**
- [ ] Sync runs automatically daily via cron
- [ ] Admin can trigger sync via UI
- [ ] Can view connector health and sync logs
- [ ] Failed syncs retry automatically

**Phase 3 Complete When:**
- [ ] ≥500 opportunities visible to users
- [ ] Users engage with synced opportunities
- [ ] Have clear feedback on what sources to add next

**Phase 4 Complete When:**
- [ ] ≥3 active connectors
- [ ] ≥1,000 opportunities across sources
- [ ] Deduplication working with <5% duplicate rate
- [ ] Enrichment pipeline adding value

---

## 14. Appendix

### A. Grants.gov Data Structure (Reference)

Key fields from Grants.gov XML/API:
```xml
<OpportunitySynopsisDetail_1_0>
  <OpportunityID>334876</OpportunityID>
  <OpportunityTitle>Community Development Block Grant</OpportunityTitle>
  <OpportunityNumber>HUD-2024-12345</OpportunityNumber>
  <OpportunityCategory>Discretionary</OpportunityCategory>
  <FundingInstrumentType>Grant</FundingInstrumentType>
  <CategoryOfFundingActivity>Community Development</CategoryOfFundingActivity>
  <ExpectedNumberOfAwards>50</ExpectedNumberOfAwards>
  <EstimatedTotalProgramFunding>10000000</EstimatedTotalProgramFunding>
  <AwardCeiling>500000</AwardCeiling>
  <AwardFloor>50000</AwardFloor>
  <CloseDate>2024-12-31</CloseDate>
  <AgencyName>Department of Housing and Urban Development</AgencyName>
  <Description>...</Description>
</OpportunitySynopsisDetail_1_0>
```

### B. Connector Interface (TypeScript)

```typescript
interface GrantConnector {
  source: string;  // 'grants_gov', 'ca_state', etc.

  // Fetch raw data from source
  fetch(since?: Date): Promise<RawGrant[]>;

  // Normalize to canonical schema
  normalize(raw: RawGrant): CanonicalOpportunity;

  // Get last successful sync time
  getLastSyncTime(): Promise<Date | null>;

  // Update sync state after run
  updateSyncState(state: SyncState): Promise<void>;

  // Validate connection/credentials
  healthCheck(): Promise<boolean>;
}
```

### C. References

- [Grants.gov API Documentation](https://www.grants.gov/web/grants/xml-extract.html)
- [ProPublica Nonprofit Explorer API](https://projects.propublica.org/nonprofits/api)
- [IRS 990 Data Documentation](https://www.irs.gov/charities-non-profits/form-990-series-downloads)

---

**Document End**
