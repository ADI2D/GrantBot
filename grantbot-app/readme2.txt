# GrantBot TODO

## Auth & Supabase
- [ ] Configure `.env.local` with Supabase URL, anon, and service-role keys for the current project.
- [ ] Replace auto-provision logic with explicit RLS policies or API bootstrap so org membership is created without touching the service client in layouts.
- [ ] Re-test the full auth lifecycle (signup, magic link, login, logout) to ensure the middleware and callback keep cookies in sync.
- [ ] Add error boundaries/flash messages for auth failures instead of surfacing raw JSON in the UI.

## Workspace Features
- [ ] Wire onboarding form mutations to persist all profile fields and reflect completion status in the dashboard.
- [ ] Replace placeholder data fetches (dashboard, opportunities, proposals, analytics) with Supabase-backed queries and seed updates.
- [ ] Implement proposal create/update flows, including checklist and workspace mutations.
- [ ] Build AI drafting + compliance endpoints that call OpenAI and surface results in the workspace view.

## Billing & Analytics
- [ ] Complete Stripe integration: price IDs in `.env.local`, billing portal route, and quota enforcement.
- [ ] Hook up analytics instrumentation (PostHog/Segment) per the 90-day roadmap.

## Data & Infrastructure
- [ ] Run migrations in a real Supabase project and verify RLS policies for every table used by the app.
- [ ] Flesh out seed scripts with realistic org/proposal data and align IDs with demo accounts.
- [ ] Add activity log triggers/audit trail once Supabase migrations for activity logs are finalized.

## Testing & Polish
- [ ] Add end-to-end tests covering login, onboarding, dashboard data, and proposal workflows.
- [ ] Introduce unit tests for data-service helpers and API route handlers.
- [ ] Audit for accessibility (focus states, aria labels) and responsive behavior across breakpoints.
- [ ] Update product README with deployment instructions, Supabase setup steps, and roadmap status.
