# Phase 2: OpportunityList Component - Testing Guide

**Date:** December 26, 2025
**Status:** ✅ Component Built - Ready for Browser Testing

## Overview

The first unified component has been created! The `OpportunityList` component replaces ~1000 lines of duplicate code with a single ~600 line component that works for both nonprofit and freelancer contexts.

## What Was Built

### Unified OpportunityList Component
**Location:** [src/components/shared/OpportunityList.tsx](../src/components/shared/OpportunityList.tsx)

**Features:**
- ✅ Works for both nonprofit (organization) and freelancer contexts
- ✅ Uses UnifiedDataService for data access
- ✅ Context-aware rendering (different UI elements per context)
- ✅ Complete search, filter, and sorting logic
- ✅ Bookmark functionality
- ✅ Create proposal actions
- ✅ Add opportunity modal (freelancers only)
- ✅ Focus area matching with score badges
- ✅ Compliance risk indicators
- ✅ AI match reasons display

**Key Design Decisions:**
- Component receives data via callback props (not direct API calls)
- Parent pages handle UnifiedDataService instantiation
- Completely type-safe with unified TypeScript types
- Zero TypeScript compilation errors

### Test Pages Created

#### 1. Nonprofit Test Page
**URL:** `http://localhost:3000/opportunities-test`
**Location:** [src/app/(dashboard)/opportunities-test/page.tsx](../src/app/(dashboard)/opportunities-test/page.tsx)

**What it demonstrates:**
- UnifiedDataService initialization with nonprofit context
- Organization focus area loading
- Opportunity fetching with org-specific filters
- Create proposal flow
- Bookmark toggling
- Focus area match scoring

#### 2. Freelancer Test Page
**URL:** `http://localhost:3000/freelancer/opportunities-test?client=CLIENT_ID`
**Location:** [src/app/(freelancer)/freelancer/opportunities-test/page.tsx](../src/app/(freelancer)/freelancer/opportunities-test/page.tsx)

**What it demonstrates:**
- UnifiedDataService initialization with freelancer context
- Client-specific opportunity loading
- Global opportunity catalog access
- Add opportunity modal
- Bookmark toggling for clients
- Proposal creation for clients

## How to Test

### Step 1: Get a Client ID

First, you need a valid client ID to test the freelancer page:

```bash
# Get list of clients
npx dotenv-cli -e .env.local node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
supabase.from('organizations')
  .select('id, name')
  .eq('parent_type', 'client')
  .then(({ data }) => {
    console.log('Available clients:');
    data.forEach(c => console.log(\`  - \${c.name}: \${c.id}\`));
  });
"
```

### Step 2: Test Nonprofit Context

1. Open your browser to: `http://localhost:3000/opportunities-test`
2. You should see a blue banner at the top indicating:
   - "Test Page - Unified OpportunityList Component"
   - Feature flag status
   - Context information (type: organization, ID, name)
3. Test the following:
   - [ ] Page loads without errors
   - [ ] Opportunities display
   - [ ] Search bar works
   - [ ] Focus area filter chips work
   - [ ] Advanced filters (amount range, geographic scope) work
   - [ ] View modes (All, Recommended, Saved) work
   - [ ] Focus area match badges appear
   - [ ] Compliance risk badges appear
   - [ ] Bookmark button works
   - [ ] "Draft Proposal" button works
   - [ ] Click navigates to workspace

### Step 3: Test Freelancer Context

1. Open your browser to: `http://localhost:3000/freelancer/opportunities-test?client=CLIENT_ID`
   (Replace CLIENT_ID with one from Step 1)
2. You should see a blue banner indicating:
   - "Test Page - Unified OpportunityList Component (Freelancer)"
   - Feature flag status
   - Context information (type: freelancer, Client ID, name)
3. Test the following:
   - [ ] Page loads without errors
   - [ ] Opportunities display (global catalog)
   - [ ] Search bar works
   - [ ] Focus area filter chips work
   - [ ] Advanced filters work
   - [ ] View modes work
   - [ ] "Add opportunity" button appears
   - [ ] AI match reason boxes appear (freelancer-specific)
   - [ ] Bookmark button works
   - [ ] "Use in proposal" button appears
   - [ ] Add opportunity modal works:
     - [ ] Can paste URLs
     - [ ] Can upload documents
     - [ ] Validation works

### Step 4: Test Context Switching

1. Open both test pages in different tabs
2. Verify that:
   - [ ] Same opportunity appears in both contexts
   - [ ] But UI elements differ (badges, buttons, descriptions)
   - [ ] Nonprofit shows focus area matching
   - [ ] Freelancer shows AI match reasons
   - [ ] Data fetching works independently

## Known Limitations

### Current State
- Test pages only (not integrated into main app yet)
- Uses placeholder "New Proposal" for proposal names
- Add opportunity feature calls API endpoints that may not exist yet
- Some features depend on Phase 3 API consolidation

### Not Yet Implemented
- Actual proposal workspace integration (Phase 3)
- Unified API routes (Phase 3)
- Main page integration (Phase 3)

## Success Criteria

✅ **Component is ready for integration if:**
1. Both test pages load without errors
2. Data fetches and displays correctly in both contexts
3. All filters and search work
4. Buttons and actions don't throw errors
5. Context-specific features appear correctly

## Troubleshooting

### "Organization not found" error
- Make sure you're logged in to a nonprofit organization account
- Check that `currentOrgId` is set in your session

### "Client ID is required" error (freelancer page)
- Add `?client=CLIENT_ID` to the URL
- Use a valid client ID from the database

### "Data service not initialized" error
- Check browser console for Supabase connection errors
- Verify `.env.local` has correct credentials
- Ensure feature flags are enabled

### TypeScript Errors
- Run `npx tsc --noEmit` to check for any errors
- All errors should be in `_ARCHIVE_*` folders (ignored)

### API Errors
- Check Network tab in browser DevTools
- Look for 404s or 500s
- Verify RLS policies allow access to data

## Next Steps After Testing

### If Tests Pass ✅
1. Document any UI/UX improvements needed
2. Move to ProposalEditor component (Phase 2 continues)
3. Then DocumentManager component
4. Finally integrate all into main pages (Phase 3)

### If Tests Fail ❌
1. Document specific errors encountered
2. Check browser console for details
3. Verify data exists in database
4. Check RLS policies
5. Fix issues before proceeding to next component

## Files Modified

```
Created:
├── src/components/shared/
│   ├── OpportunityList.tsx      (unified component)
│   └── index.ts                  (exports)
├── src/app/(dashboard)/
│   └── opportunities-test/
│       └── page.tsx              (nonprofit test)
└── src/app/(freelancer)/freelancer/
    └── opportunities-test/
        └── page.tsx              (freelancer test)
```

## Validation Checklist

Before moving to next component:

- [ ] Nonprofit test page works
- [ ] Freelancer test page works
- [ ] No TypeScript errors
- [ ] No runtime errors in console
- [ ] Data loads correctly
- [ ] Filters work
- [ ] Actions (bookmark, create proposal) work
- [ ] Context-specific UI appears correctly
- [ ] Code committed and pushed to GitHub

---

**Ready to test?** Start with the nonprofit page at `/opportunities-test`!

**Questions or issues?** Check the browser console first, then review the component code.

*Last updated: December 26, 2025*
