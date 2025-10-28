-- Demo seed data for the GrantBot workspace
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
