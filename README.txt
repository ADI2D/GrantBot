# GrantBot Remaining Work

## Authentication & Organizations
- [ ] Resolve the dashboard login loop by aligning `resolveOrgId` with org memberships and removing the service-role auto-provision hack.
- [ ] Persist org selection in the client (cookies or profile) and gate onboarding/feature routes on completion status.

## Product Features
- [ ] Wire write mutations for onboarding, opportunities, proposals, and compliance checklist updates.
- [ ] Implement AI drafting/compliance flows (OpenAI integration, content persistence, UX polish).
- [ ] Finish analytics experience (trend visualisation, real metrics once Supabase tables are populated).

## Billing & Integrations
- [ ] Configure real Stripe price IDs/keys for non-test environments, and verify webhook delivery in staging/production.
- [ ] Surface invoice download links / Stripe portal CTA once invoices exist.
- [ ] Add PostHog/Segment (or chosen analytics stack) per the 90-day roadmap.

## Quality & Ops
- [ ] Add automated test coverage (unit tests for API routes + E2E smoke tests for auth, onboarding, billing).
- [ ] Set up deployment pipeline and environment docs (Supabase migrations, Stripe webhook secret rotation).
- [ ] Run an end-to-end QA pass across dashboard flows before launch.
