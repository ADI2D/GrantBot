# Comprehensive Refactoring Plan: Unified Architecture for Nonprofit & Freelancer Systems

**Created:** 2025-12-26
**Status:** Draft - Ready for Implementation
**Estimated Total Effort:** 6-8 weeks (160-200 hours)
**Risk Level:** Medium-High

## Executive Summary

This document outlines a phased approach to eliminate ~40% code duplication between the nonprofit (dashboard) and freelancer systems by unifying shared assets while maintaining system-specific workflows. The refactoring will create a context-aware architecture that enables both user types to share opportunities, proposals, and document management infrastructure.

### Current State Analysis

**Duplication Areas:**
1. **Opportunity Lists**: ~800 lines duplicated (`/opportunities` vs `/freelancer/opportunities`)
2. **Proposal Editor**: Two separate implementations (RichTextEditor vs TipTap direct)
3. **Data Models**: Separate tables (`proposals` vs `freelancer_proposals`)
4. **API Routes**: Duplicate routes (`/api/*` vs `/api/freelancer/*`)
5. **Document Management**: Separate systems (org docs vs client docs)
6. **Comments**: Duplicate comment systems

**Key Architectural Issues:**
- Dashboard uses React hooks (`useOpportunitiesData`, `useProposalsData`)
- Freelancer uses manual `fetch()` calls
- Different data models prevent easy sharing
- No context-switching mechanism (org mode vs client mode)

### Success Criteria

1. Code duplication reduced from ~40% to <10%
2. Zero breaking changes to existing functionality
3. Single proposal editor (TipTap) used by both systems
4. Unified data model with backward compatibility
5. Shared API routes with context awareness
6. Performance maintained or improved

---

## Phase 1: Foundation & Shared Infrastructure

**Duration:** 2-3 weeks
**Risk Level:** Medium
**Dependencies:** None

### 1.1 Create Unified Data Models

#### 1.1.1 Merge Proposal Tables

**File:** `supabase/migrations/20251226_unify_proposals.sql`

**Changes:**
```sql
-- Add context fields to existing proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS context_type TEXT DEFAULT 'organization' CHECK (context_type IN ('organization', 'freelancer'));
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS context_id TEXT; -- org_id or client_id
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS freelancer_user_id UUID REFERENCES auth.users(id);

-- Create index for freelancer queries
CREATE INDEX IF NOT EXISTS idx_proposals_freelancer ON proposals(freelancer_user_id, context_id) WHERE context_type = 'freelancer';

-- Create unified proposal_drafts table for HTML content
CREATE TABLE IF NOT EXISTS proposal_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  draft_html TEXT,
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for draft lookups
CREATE INDEX IF NOT EXISTS idx_proposal_drafts_proposal_id ON proposal_drafts(proposal_id);

-- Migrate data from freelancer_proposals to proposals
INSERT INTO proposals (
  id,
  organization_id,
  opportunity_id,
  owner_name,
  status,
  progress,
  due_date,
  checklist_status,
  compliance_summary,
  created_at,
  updated_at,
  context_type,
  context_id,
  freelancer_user_id
)
SELECT
  fp.id,
  NULL, -- organization_id (null for freelancer proposals)
  NULL, -- opportunity_id (to be linked later)
  fp.owner_name,
  fp.status,
  0, -- progress (calculate from checklist)
  fp.due_date,
  'in_progress', -- default checklist_status
  fp.checklist, -- store checklist in compliance_summary temporarily
  fp.created_at,
  fp.updated_at,
  'freelancer',
  fp.client_id,
  fp.freelancer_user_id
FROM freelancer_proposals fp
WHERE NOT EXISTS (
  SELECT 1 FROM proposals p WHERE p.id = fp.id
);

-- Migrate draft content from freelancer_proposals
INSERT INTO proposal_drafts (proposal_id, draft_html, last_edited_at, created_at, updated_at)
SELECT
  fp.id,
  fp.draft_html,
  fp.last_edited_at,
  fp.created_at,
  fp.updated_at
FROM freelancer_proposals fp
WHERE NOT EXISTS (
  SELECT 1 FROM proposal_drafts pd WHERE pd.proposal_id = fp.id
);

-- Update RLS policies for unified table
DROP POLICY IF EXISTS "Context-aware proposal access" ON proposals;
CREATE POLICY "Context-aware proposal access" ON proposals
  FOR SELECT USING (
    CASE
      WHEN context_type = 'organization' THEN
        EXISTS (
          SELECT 1 FROM org_members m
          WHERE m.organization_id = proposals.organization_id
            AND m.user_id = auth.uid()
        )
      WHEN context_type = 'freelancer' THEN
        freelancer_user_id = auth.uid()
      ELSE FALSE
    END
  );

-- RLS policy for proposal_drafts
DROP POLICY IF EXISTS "Users can access proposal drafts they own" ON proposal_drafts;
CREATE POLICY "Users can access proposal drafts they own" ON proposal_drafts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_drafts.proposal_id
        AND (
          (p.context_type = 'organization' AND EXISTS (
            SELECT 1 FROM org_members m
            WHERE m.organization_id = p.organization_id
              AND m.user_id = auth.uid()
          ))
          OR
          (p.context_type = 'freelancer' AND p.freelancer_user_id = auth.uid())
        )
    )
  );
```

**Migration Strategy:**
- Add new columns without breaking existing queries
- Migrate freelancer_proposals data with context_type='freelancer'
- Keep freelancer_proposals table as read-only for 30 days
- Add database triggers to sync changes during transition period

**Rollback Plan:**
- Script to restore freelancer_proposals from proposals where context_type='freelancer'
- Keep original table schema intact for 90 days

#### 1.1.2 Unify Document Management

**File:** `supabase/migrations/20251226_unify_documents.sql`

**Changes:**
```sql
-- Add context awareness to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_type TEXT DEFAULT 'nonprofit' CHECK (parent_type IN ('nonprofit', 'client'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS freelancer_user_id UUID REFERENCES auth.users(id);

-- Create index for freelancer client queries
CREATE INDEX IF NOT EXISTS idx_organizations_freelancer ON organizations(freelancer_user_id) WHERE parent_type = 'client';

-- Migrate freelancer_clients to organizations
INSERT INTO organizations (
  id,
  name,
  mission,
  annual_budget,
  created_at,
  parent_type,
  freelancer_user_id,
  focus_areas
)
SELECT
  fc.id,
  fc.name,
  fc.mission,
  fc.annual_budget,
  fc.created_at,
  'client',
  fc.freelancer_user_id,
  fc.focus_areas
FROM freelancer_clients fc
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.id = fc.id
);

-- Update RLS for organizations to include freelancer clients
DROP POLICY IF EXISTS "Organizations are viewable by members or freelancer owner" ON organizations;
CREATE POLICY "Organizations are viewable by members or freelancer owner" ON organizations
  FOR SELECT USING (
    CASE
      WHEN parent_type = 'nonprofit' THEN
        EXISTS (
          SELECT 1 FROM org_members m
          WHERE m.organization_id = organizations.id
            AND m.user_id = auth.uid()
        )
      WHEN parent_type = 'client' THEN
        freelancer_user_id = auth.uid()
      ELSE FALSE
    END
  );
```

**Breaking Changes:** None (additive only)

**Testing Strategy:**
- Unit tests for context-aware queries
- Integration tests for data migration
- Verify RLS policies work for both contexts

### 1.2 Create Context-Aware Data Access Layer

#### 1.2.1 Unified Data Service

**File:** `src/lib/unified-data-service.ts`

This will be created in the implementation phase with full TypeScript types and methods for:
- `fetchOpportunities(filters)` - Context-aware opportunity fetching
- `fetchProposals()` - Context-aware proposal fetching
- `createProposal(data)` - Unified proposal creation
- `updateProposal(id, data)` - Unified proposal updates
- `fetchDocuments()` - Context-aware document fetching

### 1.3 Feature Flag System

**File:** `src/lib/feature-flags.ts`

```typescript
export const FEATURE_FLAGS = {
  UNIFIED_PROPOSALS: process.env.NEXT_PUBLIC_FF_UNIFIED_PROPOSALS === 'true',
  UNIFIED_OPPORTUNITIES: process.env.NEXT_PUBLIC_FF_UNIFIED_OPPORTUNITIES === 'true',
  UNIFIED_DOCUMENTS: process.env.NEXT_PUBLIC_FF_UNIFIED_DOCUMENTS === 'true',
} as const;

export function useFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
```

**Environment Variables to Add:**
```bash
# Feature Flags for Unified Architecture
NEXT_PUBLIC_FF_UNIFIED_PROPOSALS=false
NEXT_PUBLIC_FF_UNIFIED_OPPORTUNITIES=false
NEXT_PUBLIC_FF_UNIFIED_DOCUMENTS=false
```

---

## Phase 2: Component Extraction & Unification

**Duration:** 2-3 weeks
**Risk Level:** Medium
**Dependencies:** Phase 1 complete

### 2.1 Extract Shared Opportunity List Component

**Files to Create:**
- `src/components/shared/opportunity-list.tsx`
- `src/components/shared/opportunity-card.tsx`
- `src/components/shared/opportunity-filters.tsx`

**Files to Modify:**
- `src/app/(dashboard)/opportunities/page.tsx`
- `src/app/(freelancer)/freelancer/opportunities/page.tsx`

**Estimated Effort:** 16-20 hours

### 2.2 Unify Proposal Editor

**Goal:** Standardize on TipTap editor for both systems

**Files to Create:**
- `src/components/shared/unified-proposal-editor.tsx`
- `src/components/shared/rich-text-toolbar.tsx`
- `src/components/shared/section-tabs.tsx`

**Files to Deprecate:**
- `src/components/ui/rich-text-editor.tsx`

**Estimated Effort:** 12-16 hours

### 2.3 Extract Shared Document Management

**Files to Create:**
- `src/components/shared/document-manager.tsx`
- `src/components/shared/document-upload.tsx`
- `src/components/shared/document-list.tsx`

**Estimated Effort:** 12-16 hours

### 2.4 Extract Shared Comment Components

**Files to Create:**
- `src/components/shared/comments-panel.tsx`
- `src/components/shared/comment-item.tsx`
- `src/components/shared/comment-form.tsx`

**Estimated Effort:** 8-12 hours

---

## Phase 3: API Consolidation

**Duration:** 2 weeks
**Risk Level:** High
**Dependencies:** Phase 1 & 2 complete

### 3.1 Merge Duplicate API Routes

**Files to Create:**
- `src/lib/context-manager.ts` - Context detection logic
- `src/lib/api-helpers.ts` - Shared API utilities

**Files to Modify:**
- `src/app/api/opportunities/route.ts` - Add context awareness
- `src/app/api/proposals/route.ts` - Add context awareness
- `src/app/api/proposals/[id]/route.ts` - Add context awareness

**Files to Deprecate:**
- `src/app/api/freelancer/opportunities/route.ts`
- `src/app/api/freelancer/proposals/route.ts`

**Estimated Effort:** 16-20 hours per endpoint

### 3.2 Update Hooks to Use Unified APIs

**Files to Create:**
- `src/hooks/use-unified-data.ts`
- `src/hooks/use-current-context.ts`

**Estimated Effort:** 12-16 hours

---

## Phase 4: UI/UX Unification & Cleanup

**Duration:** 1-2 weeks
**Risk Level:** Low
**Dependencies:** Phase 1, 2, 3 complete

### 4.1 Create Mode-Switching Interface

**Files to Create:**
- `src/components/navigation/context-switcher.tsx`

**Estimated Effort:** 8-12 hours

### 4.2 Remove Deprecated Code

**Files to Delete (after 60-day deprecation):**
- `src/app/api/freelancer/opportunities/route.ts`
- `src/app/api/freelancer/proposals/**`
- `src/components/ui/rich-text-editor.tsx`

**Database Tables to Archive:**
- `freelancer_proposals` (keep for 90 days, then drop)

**Estimated Effort:** 4-8 hours

---

## Risk Assessment & Mitigation

### High-Risk Areas

#### 1. Database Migration
**Risk:** Data loss or corruption during migration
**Mitigation:**
- Full database backup before migration
- Test migration on staging environment first
- Run migration during low-traffic period
- Implement rollback script
- Keep original tables for 90 days

#### 2. RLS Policy Changes
**Risk:** Security vulnerabilities or access control issues
**Mitigation:**
- Audit all RLS policies before deployment
- Test with different user roles
- Monitor auth logs for unauthorized access
- Feature flag for new policies

#### 3. API Breaking Changes
**Risk:** Existing clients break if API contracts change
**Mitigation:**
- Maintain backward compatibility with proxies
- Deprecation period of 60 days minimum
- Monitor API error rates
- Comprehensive integration tests

---

## Testing Strategy

### Unit Tests
**Coverage Target:** 85% for new code

**Key Areas:**
- UnifiedDataService methods
- Context detection logic
- Data transformation functions
- Filter parsing

### Integration Tests
**Coverage:**
- API route context switching
- Database queries with RLS policies
- End-to-end proposal creation flow
- Document upload/download

### E2E Tests (Playwright)
**Scenarios:**
1. Nonprofit user creates proposal from opportunity
2. Freelancer user creates proposal for client
3. Context switching between org and client
4. Document upload in both contexts
5. Comment on proposal (both contexts)

---

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All unit tests passing (>85% coverage)
- [ ] All integration tests passing
- [ ] E2E tests passing on staging
- [ ] Performance benchmarks meet thresholds
- [ ] Database migration script tested on staging
- [ ] Rollback script tested
- [ ] Feature flags configured
- [ ] Monitoring dashboards created
- [ ] Documentation updated
- [ ] Stakeholder approval

### Deployment Sequence

#### Week 1: Phase 1 (Foundation)
1. Deploy database migrations to staging
2. Test data access layer on staging
3. Deploy to production with feature flags OFF
4. Monitor for errors
5. Enable feature flags for internal team (10% traffic)

#### Week 2-3: Phase 2 (Components)
1. Deploy shared components to staging
2. Test with both contexts
3. Deploy to production with feature flags OFF
4. Enable for 25% of users
5. Monitor metrics (error rate, performance)

#### Week 4-5: Phase 3 (APIs)
1. Deploy unified API routes to staging
2. Test backward compatibility
3. Deploy to production
4. Enable for 50% of users
5. Deprecate old endpoints (log warnings)

#### Week 6: Phase 4 (Cleanup)
1. Enable unified system for 100% of users
2. Monitor for 7 days
3. Remove deprecated code
4. Archive old tables

---

## Success Metrics

### Code Quality
- **Code Duplication:** Reduce from 40% to <10%
- **Test Coverage:** Maintain >80% coverage
- **Bundle Size:** No increase >5%

### Performance
- **Page Load Time:** No degradation (maintain <2s)
- **API Response Time:** Maintain p95 <500ms
- **Database Queries:** No slow queries (all <100ms)

### User Experience
- **Bug Reports:** <5 critical bugs in first month
- **User Satisfaction:** No decrease in NPS
- **Feature Parity:** 100% of features working in both contexts

### Business
- **Development Velocity:** 30% faster for new features (shared components)
- **Maintenance Burden:** 40% reduction in code to maintain
- **Onboarding Time:** Reduced by 50% for new developers

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `supabase/migrations/20251226_unify_proposals.sql`
- [ ] Create `supabase/migrations/20251226_unify_documents.sql`
- [ ] Create `src/lib/unified-data-service.ts`
- [ ] Create `src/lib/context-manager.ts`
- [ ] Create `src/types/unified-data.ts`
- [ ] Create `src/lib/feature-flags.ts`
- [ ] Test migrations on staging
- [ ] Deploy migrations to production
- [ ] Verify data integrity

### Phase 2: Components
- [ ] Create `src/components/shared/opportunity-list.tsx`
- [ ] Create `src/components/shared/unified-proposal-editor.tsx`
- [ ] Create `src/components/shared/document-manager.tsx`
- [ ] Create `src/components/shared/comments-panel.tsx`
- [ ] Update dashboard pages to use shared components
- [ ] Update freelancer pages to use shared components
- [ ] Test component isolation
- [ ] Deploy with feature flags

### Phase 3: APIs
- [ ] Create context detection logic
- [ ] Update `/api/opportunities/route.ts`
- [ ] Update `/api/proposals/route.ts`
- [ ] Create `src/hooks/use-unified-data.ts`
- [ ] Update pages to use unified hooks
- [ ] Test API backward compatibility
- [ ] Deploy with feature flags
- [ ] Monitor error rates

### Phase 4: Cleanup
- [ ] Create context switcher UI
- [ ] Enable unified system for all users
- [ ] Monitor for 7 days
- [ ] Delete deprecated API routes
- [ ] Delete deprecated components
- [ ] Archive database tables
- [ ] Update documentation

---

## Appendix A: Database Schema Changes

### Before (Separate Tables)
```sql
-- Nonprofit proposals
proposals (
  id, organization_id, opportunity_id, owner_name, status, ...
)

-- Freelancer proposals
freelancer_proposals (
  id, freelancer_user_id, client_id, title, status, draft_html, ...
)
```

### After (Unified Table)
```sql
-- Unified proposals with context
proposals (
  id,
  context_type, -- 'organization' | 'freelancer'
  context_id, -- org_id or client_id
  organization_id, -- nullable, for backward compat
  freelancer_user_id, -- nullable, for freelancer context
  opportunity_id,
  owner_name,
  status,
  progress,
  due_date,
  checklist_status,
  compliance_summary,
  created_at,
  updated_at
)

-- Separate table for draft HTML
proposal_drafts (
  id,
  proposal_id,
  draft_html,
  last_edited_at,
  created_at,
  updated_at
)
```

---

## Appendix B: Context Detection Flow

```typescript
// Priority 1: Explicit context params
if (params.get('orgId')) {
  return { type: 'organization', id: params.get('orgId') };
}

if (params.get('clientId')) {
  return {
    type: 'freelancer',
    id: params.get('clientId'),
    userId: user.id
  };
}

// Priority 2: User profile
const profile = await getUserProfile(user.id);
if (profile.accountType === 'freelancer' && profile.activeClientId) {
  return { type: 'freelancer', id: profile.activeClientId, userId: user.id };
}

// Priority 3: Organization membership
const membership = await getOrgMembership(user.id);
return { type: 'organization', id: membership.organizationId };
```

---

## Next Steps

1. ✅ Review this plan with the team
2. ✅ Get stakeholder approval
3. ⏳ Set up monitoring and feature flag infrastructure
4. ⏳ Begin Phase 1 implementation
5. ⏳ Iterate based on learnings

---

**Document Version:** 1.0
**Last Updated:** 2025-12-26
**Author:** Claude (AI Planning Assistant)
**Review Status:** Draft - Ready for Implementation
