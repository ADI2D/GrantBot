-- Demo seed data for the GrantSpec workspace
truncate table public.admin_audit_logs cascade;
truncate table public.admin_customer_notes cascade;
truncate table public.support_ticket_events cascade;
truncate table public.support_tickets cascade;
truncate table public.billing_payments cascade;
truncate table public.ai_cost_events cascade;
truncate table public.feature_flags cascade;
truncate table public.admin_users cascade;
truncate table public.proposal_sections cascade;
truncate table public.outcomes cascade;
truncate table public.proposals cascade;
truncate table public.opportunities cascade;
truncate table public.org_members cascade;
truncate table public.organizations cascade;

insert into public.organizations (
  id,
  name,
  mission,
  impact_summary,
  differentiator,
  annual_budget,
  onboarding_completion,
  document_metadata,
  plan_id
) values (
  '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
  'Community Harvest Cooperative',
  'Deliver wraparound food security and workforce programs for families below 200% of the federal poverty line.',
  'Served 1,200 households with fresh produce deliveries and placed 85 residents into culinary jobs last year.',
  'Integrated food hub with mobile pantry + workforce training led by lived-experience mentors.',
  750000,
  0.72,
  '[{"title":"IRS 990 FY23","status":"Ready"},{"title":"Audited Financials FY23","status":"Missing"}]',
  'growth'
);

-- Replace with real auth user IDs once auth is wired
insert into public.org_members (organization_id, user_id, role)
values
  ('8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001', 'a8006bc4-02ce-4154-a29d-ebb25f87c5aa', 'owner');

-- Seed admin roles (replace with real auth user IDs in non-demo environments)
insert into public.admin_users (user_id, role)
values
  ('a8006bc4-02ce-4154-a29d-ebb25f87c5aa', 'super_admin'),
  ('c5dfd1ac-b4f0-4b16-9d7a-6bbfcb0b7f1e', 'support');

insert into public.opportunities (
  id,
  organization_id,
  name,
  focus_area,
  amount,
  deadline,
  alignment_score,
  status,
  compliance_notes
) values
  (
    'b7da0f87-7bf2-42da-9d6d-8a8dd6ca0a11',
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'Blue Ridge Community Resilience Fund',
    'Food Security',
    75000,
    '2024-11-15',
    0.96,
    'recommended',
    'Requires audited financials and board conflict of interest policy.'
  ),
  (
    '5f0de1ff-70dd-4c15-9af5-9a43f4d1e90c',
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'Community Health Innovation Challenge',
    'Health Equity',
    120000,
    '2024-12-02',
    0.88,
    'ready_for_draft',
    'Needs partnership MOUs and outcomes dashboard access.'
  ),
  (
    'e6b8a0f2-8a64-46ed-95e0-37fab21d3108',
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'Hope Foundation Rapid Relief',
    'Emergency Services',
    45000,
    '2024-11-05',
    0.82,
    'needs_info',
    'Requires crisis response protocols and insurance certificate.'
  );

insert into public.proposals (
  id,
  organization_id,
  opportunity_id,
  owner_name,
  status,
  progress,
  due_date,
  checklist_status,
  confidence,
  compliance_summary
) values
  (
    '0bdc3ad4-8c1a-4e63-9dc8-4fdd8ba4d301',
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'b7da0f87-7bf2-42da-9d6d-8a8dd6ca0a11',
    'Devon Wells',
    'in_review',
    82,
    '2024-11-08',
    'ready',
    0.87,
    '[{"section":"Eligibility","items":[{"label":"IRS 501(c)(3) letter uploaded","status":"complete"},{"label":"Budget within funder range","status":"complete"},{"label":"Geography served matches criteria","status":"flag"}]},{"section":"Attachments","items":[{"label":"Latest audited financials","status":"missing"},{"label":"Board roster & affiliations","status":"complete"},{"label":"Strategic plan excerpt","status":"complete"}]},{"section":"Narrative","items":[{"label":"Needs statement cites latest data","status":"complete"},{"label":"Program KPIs align to RFP rubric","status":"flag"},{"label":"Sustainability plan references funder priorities","status":"complete"}]}]'
  ),
  (
    '95df8db9-2b22-4c9b-ac1c-cbf0ff0cee02',
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    '5f0de1ff-70dd-4c15-9af5-9a43f4d1e90c',
    'Erin Walker',
    'drafting',
    54,
    '2024-11-20',
    'in_progress',
    0.64,
    '[]'
  ),
  (
    'a3c1a0d2-7079-4ba7-9954-9d0a4d3ff503',
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'e6b8a0f2-8a64-46ed-95e0-37fab21d3108',
    'Val Chen',
    'needs_data',
    28,
    '2024-11-03',
    'in_progress',
    0.4,
    '[]'
  );

insert into public.proposal_sections (
  proposal_id,
  title,
  token_count,
  content
) values
  (
    '0bdc3ad4-8c1a-4e63-9dc8-4fdd8ba4d301',
    'Needs Statement',
    480,
    'Blue Ridge County families face compounding economic shocks. Over 42% of households served by Community Harvest Cooperative report lacking reliable access to healthy food...'
  ),
  (
    '0bdc3ad4-8c1a-4e63-9dc8-4fdd8ba4d301',
    'Program Design',
    630,
    'Our integrated food hub combines mobile pantry routes with workforce development...'
  ),
  (
    '0bdc3ad4-8c1a-4e63-9dc8-4fdd8ba4d301',
    'Budget Narrative',
    310,
    'Each $1,000 invested funds two weeks of deliveries and paid internships...'
  ),
  (
    '0bdc3ad4-8c1a-4e63-9dc8-4fdd8ba4d301',
    'Evaluation Plan',
    290,
    'We will track food security scores, employment retention, and emergency response times...'
  ),
  (
    '0bdc3ad4-8c1a-4e63-9dc8-4fdd8ba4d301',
    'Organizational Capacity',
    220,
    'Our leadership team blends lived experience with grant compliance expertise...'
  );

insert into public.outcomes (
  id,
  organization_id,
  proposal_id,
  status,
  award_amount,
  learning_insight,
  recorded_at
) values
  (
    '79ad3ee6-7f25-4a41-93ac-17ed7ddd5201',
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    '0bdc3ad4-8c1a-4e63-9dc8-4fdd8ba4d301',
    'submitted',
    0,
    'Budget narrative clarity improved reviewer score by 25%.',
    now() - interval '10 days'
  ),
  (
    'bf931c80-1f4c-4926-b970-839ff8d5a213',
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    '95df8db9-2b22-4c9b-ac1c-cbf0ff0cee02',
    'funded',
    50000,
    'Community testimonials lifted storytelling effectiveness.',
    now() - interval '25 days'
  ),
  (
    '857c3253-4300-4ef5-9f5e-5a32696354a4',
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'a3c1a0d2-7079-4ba7-9954-9d0a4d3ff503',
    'funded',
    90000,
    'Compliance checklist catches 92% of missing attachments.',
    now() - interval '40 days'
  );

-- Billing, pricing, and AI cost telemetry for admin dashboards
insert into public.billing_payments (
  organization_id,
  stripe_invoice_id,
  stripe_customer_id,
  amount,
  currency,
  status,
  due_date,
  paid_at,
  metadata,
  created_at
) values
  (
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'in_demo_001',
    'cus_demo_001',
    49900,
    'usd',
    'paid',
    now() - interval '6 days',
    now() - interval '5 days',
    jsonb_build_object('plan', 'growth'),
    now() - interval '7 days'
  ),
  (
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'in_demo_002',
    'cus_demo_001',
    49900,
    'usd',
    'open',
    now() + interval '10 days',
    null,
    jsonb_build_object('plan', 'growth'),
    now() - interval '2 days'
  ),
  (
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'in_demo_003',
    'cus_demo_001',
    49900,
    'usd',
    'past_due',
    now() - interval '3 days',
    null,
    jsonb_build_object('plan', 'growth', 'notes', 'Card declined'),
    now() - interval '15 days'
  );

insert into public.ai_cost_events (
  organization_id,
  proposal_id,
  template_id,
  model,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  cost_usd,
  metadata,
  created_at
) values
  (
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    '0bdc3ad4-8c1a-4e63-9dc8-4fdd8ba4d301',
    'proposal_draft_v1',
    'gpt-4o-mini',
    1820,
    640,
    2460,
    3.24,
    jsonb_build_object('summary', 'Initial narrative draft'),
    now() - interval '4 days'
  ),
  (
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    '95df8db9-2b22-4c9b-ac1c-cbf0ff0cee02',
    'compliance_check_v2',
    'gpt-4o-mini',
    940,
    210,
    1150,
    1.08,
    jsonb_build_object('summary', 'Compliance checklist pass'),
    now() - interval '1 days'
  );

insert into public.admin_audit_logs (
  actor_user_id,
  actor_role,
  action,
  target_type,
  target_id,
  metadata,
  ip_address,
  user_agent,
  created_at
) values
  (
    'a8006bc4-02ce-4154-a29d-ebb25f87c5aa',
    'super_admin',
    'customer.note.created',
    'organization',
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    jsonb_build_object('length', 148),
    '10.0.0.5',
    'Mozilla/5.0 (demo seed)',
    now() - interval '3 days'
  ),
  (
    'c5dfd1ac-b4f0-4b16-9d7a-6bbfcb0b7f1e',
    'support',
    'support.ticket.updated',
    'support_ticket',
    '2001',
    jsonb_build_object('status', 'awaiting_customer'),
    '10.0.0.12',
    'Mozilla/5.0 (demo seed)',
    now() - interval '12 hours'
  );

insert into public.admin_customer_notes (
  organization_id,
  admin_user_id,
  content,
  created_at
) values
  (
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'a8006bc4-02ce-4154-a29d-ebb25f87c5aa',
    'Met with the executive director; focus on storytelling in next proposal draft.',
    now() - interval '3 days'
  ),
  (
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'c5dfd1ac-b4f0-4b16-9d7a-6bbfcb0b7f1e',
    'Customer requested billing review; follow up after finance sync.',
    now() - interval '18 hours'
  );

insert into public.support_tickets (
  id,
  organization_id,
  subject,
  status,
  priority,
  opened_by,
  created_at,
  updated_at
) values
  (
    2001,
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'Unable to sync Stripe customer portal',
    'open',
    'high',
    'a8006bc4-02ce-4154-a29d-ebb25f87c5aa',
    now() - interval '2 days',
    now() - interval '6 hours'
  ),
  (
    2002,
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    'Question about proposal AI credits',
    'closed',
    'normal',
    'c5dfd1ac-b4f0-4b16-9d7a-6bbfcb0b7f1e',
    now() - interval '9 days',
    now() - interval '1 days'
  );

insert into public.support_ticket_events (
  ticket_id,
  event_type,
  message,
  metadata,
  actor_admin_id,
  created_at
) values
  (
    2001,
    'status.updated',
    'Ticket escalated to billing specialist.',
    jsonb_build_object('from', 'open', 'to', 'pending_billing'),
    'c5dfd1ac-b4f0-4b16-9d7a-6bbfcb0b7f1e',
    now() - interval '12 hours'
  ),
  (
    2002,
    'comment.added',
    'Provided guidance on AI credit usage and linked documentation.',
    jsonb_build_object('channel', 'email'),
    'a8006bc4-02ce-4154-a29d-ebb25f87c5aa',
    now() - interval '2 days'
  );

insert into public.feature_flags (
  key,
  description,
  rollout_percentage,
  enabled,
  target_plans,
  target_customer_ids,
  created_by,
  created_at,
  updated_at
) values
  (
    'ai_pipeline_v2',
    'Second-generation AI drafting pipeline',
    25,
    true,
    '["growth","impact"]'::jsonb,
    '[]'::jsonb,
    'a8006bc4-02ce-4154-a29d-ebb25f87c5aa',
    now() - interval '14 days',
    now() - interval '2 days'
  ),
  (
    'support_handoff_beta',
    'Routes high-priority tickets to concierge channel',
    0,
    false,
    '["impact"]'::jsonb,
    '[]'::jsonb,
    'c5dfd1ac-b4f0-4b16-9d7a-6bbfcb0b7f1e',
    now() - interval '7 days',
    now() - interval '7 days'
  );

insert into public.activity_logs (
  organization_id,
  proposal_id,
  user_id,
  action,
  metadata
) values
  (
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    '0bdc3ad4-8c1a-4e63-9dc8-4fdd8ba4d301',
    'a8006bc4-02ce-4154-a29d-ebb25f87c5aa',
    'proposal_created',
    '{"seed": true}'
  ),
  (
    '8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001',
    '0bdc3ad4-8c1a-4e63-9dc8-4fdd8ba4d301',
    'a8006bc4-02ce-4154-a29d-ebb25f87c5aa',
    'section_updated',
    '{"sectionTitle": "Needs Statement"}'
  );
