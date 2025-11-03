export type FreelancerClientSummary = {
  id: string;
  name: string;
  status: "active" | "on_hold" | "archived";
  activeProposals: number;
  opportunitiesInPipeline: number;
  documentsMissing: number;
  lastActivityAt: string | null;
  annualBudget: number | null;
  primaryContact: {
    name: string;
    email: string | null;
  } | null;
  planName: string | null;
};

export type FreelancerClientDetail = FreelancerClientSummary & {
  mission: string | null;
  focusAreas: string[];
  proposals: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
  }>;
  documents: Array<{
    name: string;
    status: "ready" | "missing" | "in_review";
  }>;
  notes: string[];
};

/**
 * Placeholder implementation for the freelancer clients listing.
 * Once the `freelancer_clients` table and API are wired up we can
 * replace this stub with a Supabase query.
 */
export async function listFreelancerClients(): Promise<FreelancerClientSummary[]> {
  return Promise.resolve([
    {
      id: "impact-circle",
      name: "Impact Circle Foundation",
      status: "active",
      activeProposals: 4,
      opportunitiesInPipeline: 9,
      documentsMissing: 2,
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      annualBudget: 1250000,
      primaryContact: {
        name: "Nia Rodriguez",
        email: "nia@impactcircle.org",
      },
      planName: "Growth",
    },
    {
      id: "harvest-cooperative",
      name: "Unity Harvest Cooperative",
      status: "active",
      activeProposals: 2,
      opportunitiesInPipeline: 5,
      documentsMissing: 1,
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      annualBudget: 980000,
      primaryContact: {
        name: "Kyle Summers",
        email: "kyle@unityharvest.org",
      },
      planName: "Starter",
    },
    {
      id: "learning-alliance",
      name: "Rising Learners Alliance",
      status: "on_hold",
      activeProposals: 1,
      opportunitiesInPipeline: 3,
      documentsMissing: 5,
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
      annualBudget: 540000,
      primaryContact: {
        name: "Amelia Cho",
        email: "amelia@rla.org",
      },
      planName: "Workspace (Free)",
    },
    {
      id: "green-spaces",
      name: "Green Spaces Collective",
      status: "active",
      activeProposals: 3,
      opportunitiesInPipeline: 4,
      documentsMissing: 0,
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      annualBudget: 2100000,
      primaryContact: {
        name: "Veronica Patel",
        email: "veronica@greenspaces.org",
      },
      planName: "Impact",
    },
  ]);
}

const detailSeed: Record<string, FreelancerClientDetail> = {
  "impact-circle": {
    id: "impact-circle",
    name: "Impact Circle Foundation",
    status: "active",
    activeProposals: 4,
    opportunitiesInPipeline: 9,
    documentsMissing: 2,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    annualBudget: 1250000,
    primaryContact: {
      name: "Nia Rodriguez",
      email: "nia@impactcircle.org",
    },
    planName: "Growth",
    mission: "Expand access to STEAM education for middle-school girls across the Mid-Atlantic region.",
    focusAreas: ["STEAM", "Youth Development"],
    proposals: [
      { id: "p-101", title: "STEM Labs Expansion", status: "In review", dueDate: "2024-12-05" },
      { id: "p-102", title: "After-school Robotics Cohort", status: "Drafting", dueDate: "2025-01-18" },
    ],
    documents: [
      { name: "IRS Determination Letter", status: "ready" },
      { name: "Audited Financials FY23", status: "in_review" },
      { name: "Board Roster", status: "ready" },
      { name: "Form 990 FY23", status: "missing" },
    ],
    notes: [
      "Prefers proposals formatted in Google Docs for collaboration.",
      "Highlight longitudinal impact data in all narratives.",
    ],
  },
  "harvest-cooperative": {
    id: "harvest-cooperative",
    name: "Unity Harvest Cooperative",
    status: "active",
    activeProposals: 2,
    opportunitiesInPipeline: 5,
    documentsMissing: 1,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    annualBudget: 980000,
    primaryContact: {
      name: "Kyle Summers",
      email: "kyle@unityharvest.org",
    },
    planName: "Starter",
    mission: "Deliver wraparound food security and workforce programs for rural families.",
    focusAreas: ["Food Access", "Workforce Development"],
    proposals: [
      { id: "p-201", title: "Mobile Pantry Route Expansion", status: "Submitted", dueDate: "2024-11-30" },
      { id: "p-202", title: "Community Kitchen Apprenticeships", status: "Drafting", dueDate: "2025-02-10" },
    ],
    documents: [
      { name: "Impact Report FY23", status: "ready" },
      { name: "Audited Financials FY23", status: "missing" },
      { name: "Insurance Certificates", status: "ready" },
    ],
    notes: [
      "Needs storytelling support—provide 2 case studies per proposal.",
      "Request budget template from finance contact by Friday.",
    ],
  },
  "learning-alliance": {
    id: "learning-alliance",
    name: "Rising Learners Alliance",
    status: "on_hold",
    activeProposals: 1,
    opportunitiesInPipeline: 3,
    documentsMissing: 5,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    annualBudget: 540000,
    primaryContact: {
      name: "Amelia Cho",
      email: "amelia@rla.org",
    },
    planName: "Workspace (Free)",
    mission: "Bridge literacy gaps for multilingual learners in Title I schools.",
    focusAreas: ["Literacy", "Teacher Training"],
    proposals: [
      { id: "p-301", title: "Reading Coaches Fellowship", status: "On hold", dueDate: null },
    ],
    documents: [
      { name: "Strategic Plan", status: "in_review" },
      { name: "Board Bios", status: "missing" },
    ],
    notes: [
      "Pause new proposals until leadership retreat completes in January.",
    ],
  },
  "green-spaces": {
    id: "green-spaces",
    name: "Green Spaces Collective",
    status: "active",
    activeProposals: 3,
    opportunitiesInPipeline: 4,
    documentsMissing: 0,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    annualBudget: 2100000,
    primaryContact: {
      name: "Veronica Patel",
      email: "veronica@greenspaces.org",
    },
    planName: "Impact",
    mission: "Activate urban green spaces for climate resilience and community wellness.",
    focusAreas: ["Climate", "Community Health"],
    proposals: [
      { id: "p-401", title: "Neighborhood Canopy Initiative", status: "Awarded", dueDate: "2024-10-01" },
      { id: "p-402", title: "Community Garden Fellows", status: "In review", dueDate: "2024-12-15" },
    ],
    documents: [
      { name: "Climate Action Plan", status: "ready" },
      { name: "Memorandum of Understanding", status: "ready" },
    ],
    notes: ["Celebrate recent award—prep press release draft by 11/10."],
  },
};

const clientOpportunities: Record<string, Array<{ id: string; name: string; status: string }>> = {
  "impact-circle": [
    { id: "opp-401", name: "STEM Futures Initiative", status: "Recommended" },
    { id: "opp-402", name: "Regional Innovation Grant", status: "Shortlisted" },
  ],
  "harvest-cooperative": [
    { id: "opp-201", name: "Community Food Resilience Fund", status: "Recommended" },
    { id: "opp-202", name: "Agriculture Workforce Pilot", status: "In review" },
  ],
  "learning-alliance": [
    { id: "opp-301", name: "Emerging Readers Challenge", status: "Paused" },
  ],
  "green-spaces": [
    { id: "opp-501", name: "Urban Climate Resilience RFP", status: "Submitted" },
    { id: "opp-502", name: "Community Health Trail Fund", status: "Drafting" },
  ],
};

function normalizeClientId(value: string) {
  return value.trim().toLowerCase();
}

export async function getFreelancerClient(clientId: string): Promise<FreelancerClientDetail | null> {
  const normalized = normalizeClientId(clientId);
  if (detailSeed[normalized]) {
    return detailSeed[normalized];
  }

  const summary = await listFreelancerClients();
  const matched = summary.find((client) => normalizeClientId(client.id) === normalized);
  if (matched) {
    const seed = detailSeed[normalizeClientId(matched.id)];
    if (seed) {
      return seed;
    }
    console.warn("[freelancer][client] using summary fallback", matched.id);
    return {
      ...matched,
      mission: null,
      focusAreas: [],
      proposals: [],
      documents: [],
      notes: [],
    };
  }

  return null;
}
