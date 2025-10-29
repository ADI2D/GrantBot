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

### Billing Setup
- Create a Stripe test account and generate a customer record for your organization.
- Copy the **Publishable** and **Secret** keys into `STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`.
- Create three recurring products/prices (Starter, Growth, Impact) and paste the price IDs into `STRIPE_PRICE_*`.
- Add the Stripe customer ID to `organizations.stripe_customer_id` for the org you're testing. Once linked, the “Manage billing” button opens Stripe Billing and the usage cards display invoice information.
- Webhook events (`invoice.*`, `customer.subscription.updated`, etc.) populate the `billing_payments` table. Run `supabase/migrations/20241026_billing_payments.sql` (or `supabase db push`) and set `STRIPE_WEBHOOK_SECRET` so the webhook endpoint can verify signatures.
- To seed Stripe test data locally:
  1. Start webhook forwarding in another terminal:
     ```bash
     stripe listen --forward-to http://localhost:3000/api/stripe/webhook
     ```
  2. Run the helper script to create a customer, subscription, and paid invoice (defaults to the starter plan):
     ```bash
     npm run seed:stripe -- <organization-id> [plan-id]
     # example
     npm run seed:stripe -- c9634d01-978e-40e6-b257-a6711db5b0da growth
     ```
  3. The script attaches `pm_card_visa`, pays the invoice, and polls Supabase until the webhook writes to `billing_payments`. If it times out, confirm the `stripe listen` process is running.

### Troubleshooting
- **Webhook signature errors:** ensure `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the secret shown when you run `stripe listen` (or from the Stripe dashboard if using a hosted endpoint). Restart `npm run dev` after updating the env file.
- **Invoice records missing:** confirm the listener is running and that the org has `stripe_customer_id` populated. Use the Supabase dashboard (SQL editor) to query `select * from billing_payments order by created_at desc;` and verify the webhook inserted a row.
- **Migration conflicts:** if `supabase db push` reports existing policies/tables, mark the migration as applied (`supabase migration repair --status applied --version 20241024_initial`) or run the SQL manually via the dashboard.

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
1. Fix the dashboard/login loop by aligning org resolution with memberships and removing the service-client auto-provision.
2. Persist org selection and gate onboarding/dashboard routes once the intake flow is complete.
3. Ship write mutations for onboarding, opportunity, proposal, and checklist updates (Supabase + UI forms).
4. Implement the AI drafting/compliance flows (OpenAI integration, content persistence, UX polish).
5. Wire analytics tracking (PostHog/Segment or preferred stack) per the 90-day roadmap.
6. Harden Stripe integration for production (real price IDs/keys, webhook verification in deployed envs, invoice download links).
7. Add automated test coverage (unit + E2E) and document deployment/runbooks.
