# Onboarding Wizard Implementation

## Overview

Building a comprehensive, guided onboarding experience for both nonprofit organizations and freelancer grant writers.

## Architecture

### Core Components

1. **OnboardingWizard** (`src/components/onboarding/onboarding-wizard.tsx`)
   - Base wizard component with step navigation
   - Progress tracking (visual + percentage)
   - Auto-save every 30 seconds
   - Responsive design with modern UI

### Nonprofit Onboarding Flow (5 Steps)

1. **Basic Info** ✅ Created
   - Organization name, EIN, founded year
   - Staff size, website

2. **Mission & Impact** ✅ Created
   - Mission statement
   - Focus areas (multi-select from taxonomy)
   - Geographic scope
   - Impact summary
   - Differentiator

3. **Budget & Finance** (To Create)
   - Annual budget
   - Funding sources breakdown
   - Past grants received

4. **Programs & Metrics** (To Create)
   - Programs offered
   - Target demographics
   - Impact metrics

5. **Documents & Review** (To Create)
   - Upload key documents (IRS letter, financials, etc.)
   - Review all information
   - Complete setup

### Freelancer Onboarding Flow (4 Steps)

1. **Basic Profile** (To Create)
   - Full name, headline, bio
   - Years of experience
   - Hourly rate

2. **Expertise & Specializations** (To Create)
   - Focus area specializations
   - Certifications
   - Success rate

3. **Portfolio** (To Create)
   - Past grants written
   - Total amount raised
   - Notable funders

4. **Clients & Availability** (To Create)
   - Client list
   - Availability status
   - Weekly capacity

## Database Schema

### New Tables

```sql
-- freelancer_profiles
user_id (PK)
full_name, headline, bio
hourly_rate
specializations (jsonb array)
years_experience
certifications (jsonb array)
portfolio_items (jsonb array)
total_grants_written
total_amount_raised
success_rate
availability_status
weekly_capacity
onboarding_completion

-- freelancer_clients
id (PK)
freelancer_id (FK -> users)
client_name, client_type
relationship_status
start_date, end_date
total_raised
grants_submitted, grants_awarded
notes
```

### Enhanced Columns on `organizations`

```sql
ein, founded_year, staff_size
geographic_scope, website
programs (jsonb)
impact_metrics (jsonb)
target_demographics (jsonb)
past_funders (jsonb)
```

## Features

### UX/UI Enhancements

✅ **Progress Visualization**
- Fixed top progress bar
- Step-by-step navigation with completion indicators
- Current/completed/upcoming visual states

✅ **Auto-save**
- Every 30 seconds
- Visual feedback
- No data loss

✅ **Smart Navigation**
- Back/Next buttons
- Skip option for optional fields
- Validation on required fields

✅ **Modern Design**
- Gradient backgrounds
- Clean card-based layout
- Responsive grid system
- Icon-based indicators

### Planned Features

🔄 **Document Upload Vault**
- Drag-and-drop interface
- File preview
- Organized by type (IRS letter, financials, etc.)
- Supabase Storage integration

🔄 **Progress Persistence**
- API endpoint: `/api/onboarding/progress`
- Saves partial data
- Resume from any step

🔄 **Validation**
- Required field checking
- Format validation (EIN, URL, etc.)
- Helpful error messages

## API Endpoints (To Create)

### `POST /api/onboarding/progress`
Save partial onboarding data

**Request:**
```json
{
  "accountType": "nonprofit",
  "step": "basic-info",
  "data": {...},
  "completion": 20
}
```

### `POST /api/onboarding/complete`
Complete onboarding and create organization/profile

**Nonprofit:**
```json
{
  "organization": {...},
  "documents": [...]
}
```

**Freelancer:**
```json
{
  "profile": {...},
  "clients": [...]
}
```

### `GET /api/onboarding/status`
Get current onboarding progress

**Response:**
```json
{
  "completion": 60,
  "currentStep": "programs",
  "data": {...}
}
```

## Implementation Progress

### ✅ Completed
- [x] Base wizard component
- [x] Progress tracking UI
- [x] Auto-save infrastructure
- [x] Nonprofit step 1: Basic Info
- [x] Nonprofit step 2: Mission & Impact
- [x] Database migration file

### 🔄 In Progress
- [ ] Remaining nonprofit steps (3-5)
- [ ] Freelancer steps (1-4)
- [ ] Document upload component
- [ ] API endpoints
- [ ] Database migration application

### 📋 To Do
- [ ] Validation logic
- [ ] Error handling
- [ ] Loading states
- [ ] Success/completion page
- [ ] Integration with main app flow
- [ ] Testing

## Next Steps

1. Complete remaining nonprofit onboarding steps
2. Create freelancer onboarding steps
3. Build document upload vault
4. Implement API endpoints
5. Apply database migrations
6. Create onboarding entry pages
7. Test complete flows

## File Structure

```
src/
├── components/
│   └── onboarding/
│       ├── onboarding-wizard.tsx          ✅
│       └── steps/
│           ├── nonprofit/
│           │   ├── basic-info.tsx         ✅
│           │   ├── mission-impact.tsx     ✅
│           │   ├── budget-finance.tsx     📋
│           │   ├── programs-metrics.tsx   📋
│           │   └── documents-review.tsx   📋
│           └── freelancer/
│               ├── basic-profile.tsx      📋
│               ├── expertise.tsx          📋
│               ├── portfolio.tsx          📋
│               └── clients.tsx            📋
├── app/
│   ├── (dashboard)/
│   │   └── onboarding/
│   │       └── page.tsx                   📋
│   └── api/
│       └── onboarding/
│           ├── progress/route.ts          📋
│           ├── complete/route.ts          📋
│           └── status/route.ts            📋
supabase/
└── migrations/
    └── 20251109_onboarding_wizard.sql     ✅
```

## Design Principles

1. **Guided Experience**: Clear steps with helpful descriptions
2. **Minimal Friction**: Skip optional fields, auto-save progress
3. **Visual Feedback**: Progress indicators, success states
4. **Trust Building**: Explain why we ask for each piece of data
5. **Mobile-First**: Responsive design for all screen sizes
