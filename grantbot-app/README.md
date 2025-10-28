# GrantBot Workspace

AI-assisted grant writing workspace that turns the PRD + 90-day roadmap into a runnable Next.js prototype. It showcases onboarding, opportunity curation, proposal drafting, compliance checklists, and analytics flows for <$1M-budget nonprofits.

## Stack & Architecture
- **Framework**: Next.js 16 (App Router, TypeScript, Tailwind v4)
- **Styling**: Utility-first theme tokens + custom UI primitives (Button, Card, Badge, etc.)
- **State/Data**: React Query client provider ready for Supabase/LLM data sources
- **Integrations (planned)**: Supabase (auth, data, storage), OpenAI (drafting), Stripe (billing)
 - **Integrations**: Supabase (auth, data, storage), Stripe webhook scaffolding ready for billing events
- **Structure**: `/(dashboard)` route group with feature pages that map to PRD requirements

## Getting Started
```bash
npm install
npm run dev
```
Visit `http://localhost:3000` for the marketing overview and `/dashboard` for the authenticated workspace shell.

### Environment Variables
Copy `.env.example` to `.env.local` and fill in keys once Supabase/OpenAI projects are ready.
```
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEMO_ORG_ID=8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
```

### Supabase Schema & Seed
`supabase/migrations/20241024_initial.sql` defines the multi-tenant tables (organizations, org_members, opportunities, proposals, proposal_sections, outcomes) plus RLS policies. Subsequent migrations add document metadata, billing plan fields, and audit timestamps. Use `supabase/seed/001_demo_data.sql` to load the GrantBot demo org:
```bash
# Via Supabase CLI or psql
psql \"$SUPABASE_URL\" <<'SQL'
\\i supabase/migrations/20241024_initial.sql
\\i supabase/seed/001_demo_data.sql
SQL
```
Set `SUPABASE_SERVICE_ROLE_KEY` so API routes can proxy secure reads, while browser code relies on the anon key.

## Project Map
```
src/
  app/
    page.tsx                # Marketing-style overview tied to the PRD vision
    (dashboard)/            # Authenticated workspace routes
      layout.tsx            # Shared shell with sidebar + top nav
      dashboard/            # KPI overview + opportunity/proposal panels
      onboarding/           # Guided org profile intake
      opportunities/        # Curated matchboard experience
      proposals/            # Table view of drafts + statuses
      workspace/            # AI drafting canvas + checklist stub
      analytics/            # Outcome metrics + insights feed
      checklists/           # Compliance tracker
  components/
    layout/                 # AppShell, Sidebar, TopNav
    providers/              # React Query provider
    ui/                     # Button, Card, Badge, Inputs, etc.
  hooks/use-api.ts          # React Query hooks that hit Next.js API routes
  lib/                      # Utility helpers + Supabase client + formatters
app/api/*                   # Route handlers that proxy to Supabase
```

## Roadmap Alignment
- ✅ MVP skeleton with navigation, Supabase-backed APIs, and UI primitives
- 🔜 Add auth guards + multi-org switching
- 🔜 Connect AI orchestration + compliance logic per PRD Section 5
- 🔜 Implement billing quotas & analytics instrumentation described in the 90-day plan

## Scripts
- `npm run dev` – local development with Webpack bundler
- `npm run build` – production build
- `npm start` – run compiled build
- `npm run lint` – lint source files

## Next Steps
1. Wire Supabase auth + org membership selection inside the UI.
2. Add write mutations (onboarding form, proposal updates, compliance checklist edits).
3. Integrate AI drafting/compliance services per PRD Section 5.
4. Layer in billing, quotas, and analytics instrumentation (Stripe + PostHog/Segment).
