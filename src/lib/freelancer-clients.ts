import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";
import type { Database } from "@/types/database";
import { getAllFocusAreaSearchValues, type FocusAreaId } from "@/types/focus-areas";

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
    name: string | null;
    email: string | null;
  } | null;
  planName?: string | null;
  billingRate?: number | null;
  likeUs?: boolean;
  categories?: string[];
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
    id: string;
    name: string;
    status: "ready" | "missing" | "in_review";
    uploadedAt?: string | null;
  }>;
  notes: Array<string | { id: string; content: string; createdAt: string }>;
};

export type FreelancerProposalChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
};

export type FreelancerProposalSection = {
  id: string;
  title: string;
  placeholder: string;
};

export type FreelancerProposalDetail = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  status: string;
  dueDate: string | null;
  owner: string;
  lastEditedAt: string | null;
  draft: string;
  checklist: FreelancerProposalChecklistItem[];
  sections: FreelancerProposalSection[];
  aiPrompts: string[];
};

type FreelancerProposalRow = Database["public"]["Tables"]["freelancer_proposals"]["Row"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeChecklist(value: unknown): FreelancerProposalChecklistItem[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!isRecord(item)) return null;
        const id = typeof item.id === "string" ? item.id : String(item.id ?? "");
        const label = typeof item.label === "string" ? item.label : "";
        const completed = typeof item.completed === "boolean" ? item.completed : false;
        if (!id || !label) return null;
        return { id, label, completed };
      })
      .filter((item): item is FreelancerProposalChecklistItem => Boolean(item));
  }

  if (typeof value === "string") {
    try {
      return normalizeChecklist(JSON.parse(value));
    } catch (error) {
      console.warn("[freelancer][proposal] failed to parse checklist JSON", error);
    }
  }

  return [];
}

function normalizeSections(value: unknown): FreelancerProposalSection[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!isRecord(item)) return null;
        const id = typeof item.id === "string" ? item.id : String(item.id ?? "");
        const title = typeof item.title === "string" ? item.title : "";
        const placeholder = typeof item.placeholder === "string" ? item.placeholder : "";
        if (!id || !title) return null;
        return { id, title, placeholder };
      })
      .filter((item): item is FreelancerProposalSection => Boolean(item));
  }

  if (typeof value === "string") {
    try {
      return normalizeSections(JSON.parse(value));
    } catch (error) {
      console.warn("[freelancer][proposal] failed to parse sections JSON", error);
    }
  }

  return [];
}

function normalizePrompts(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
  }

  if (typeof value === "string") {
    try {
      return normalizePrompts(JSON.parse(value));
    } catch (error) {
      console.warn("[freelancer][proposal] failed to parse prompts JSON", error);
    }
  }

  return [];
}

function mapRowToProposalDetail(row: FreelancerProposalRow): FreelancerProposalDetail {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    title: row.title,
    status: row.status ?? "Drafting",
    dueDate: row.due_date,
    owner: row.owner_name ?? "",
    lastEditedAt: row.last_edited_at ?? row.updated_at,
    draft: row.draft_html ?? "",
    checklist: normalizeChecklist(row.checklist),
    sections: normalizeSections(row.sections),
    aiPrompts: normalizePrompts(row.ai_prompts),
  };
}

function cloneProposalDetail(source: FreelancerProposalDetail): FreelancerProposalDetail {
  return {
    ...source,
    checklist: source.checklist.map((item) => ({ ...item })),
    sections: source.sections.map((section) => ({ ...section })),
    aiPrompts: [...source.aiPrompts],
  };
}

async function fetchProposalRow(
  supabase: SupabaseClient<Database>,
  userId: string,
  proposalId: string,
): Promise<FreelancerProposalRow | null> {
  const { data, error } = await supabase
    .from("freelancer_proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("freelancer_user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[freelancer][proposal] failed to load proposal row", error);
    return null;
  }

  return data ?? null;
}

async function insertSeedProposal(
  supabase: SupabaseClient<Database>,
  userId: string,
  seed: FreelancerProposalDetail,
): Promise<FreelancerProposalDetail | null> {
  const payload = {
    id: seed.id,
    freelancer_user_id: userId,
    client_id: seed.clientId,
    client_name: seed.clientName,
    title: seed.title,
    status: seed.status,
    due_date: seed.dueDate,
    owner_name: seed.owner,
    draft_html: seed.draft,
    checklist: seed.checklist,
    sections: seed.sections,
    ai_prompts: seed.aiPrompts,
    last_edited_at: seed.lastEditedAt,
    submitted_at: ["submitted", "awarded"].includes(seed.status.toLowerCase())
      ? seed.lastEditedAt ?? new Date().toISOString()
      : null,
  };

  const { data, error } = await supabase.from("freelancer_proposals").insert(payload).select("*").single();

  if (error) {
    console.warn("[freelancer][proposal] failed to seed proposal", error);
    return null;
  }

  return data ? mapRowToProposalDetail(data) : null;
}

function lookupProposalSeed(proposalId: string): FreelancerProposalDetail | null {
  const normalized = proposalId.trim().toLowerCase();
  const direct = proposalSeed[proposalId] ?? proposalSeed[normalized];
  return direct ? cloneProposalDetail(direct) : null;
}

function listSeedProposals(): FreelancerProposalDetail[] {
  return Object.values(proposalSeed).map((seed) => cloneProposalDetail(seed));
}

/**
 * Fetches the list of freelancer clients from the database.
 */
export async function listFreelancerClients(): Promise<FreelancerClientSummary[]> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("freelancer_clients")
      .select("*")
      .eq("freelancer_user_id", user.id)
      .order("last_activity_at", { ascending: false });

    if (error) {
      console.error("[freelancer][clients] Failed to list clients:", error);
      return [];
    }

    // For each client, count opportunities matching their focus areas
    const clientsWithCounts = await Promise.all(
      (data ?? []).map(async (row) => {
        let opportunitiesCount = 0;
        const clientFocusAreas = Array.isArray(row.focus_areas) ? row.focus_areas : [];

        if (clientFocusAreas.length > 0) {
          // Convert focus area IDs to all possible database values (handles mixed data quality)
          const focusAreaLabels = getAllFocusAreaSearchValues(clientFocusAreas as FocusAreaId[]);

          // Count opportunities with matching focus areas and valid deadlines
          const sixtyDaysAgo = new Date();
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
          const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0];

          const { count, error: countError } = await supabase
            .from("opportunities")
            .select("*", { count: "exact", head: true })
            .in("focus_area", focusAreaLabels)
            .gte("deadline", sixtyDaysAgoStr)
            .neq("status", "closed");

          if (!countError && count !== null) {
            opportunitiesCount = count;
          }
        }

        return {
          id: row.id,
          name: row.name,
          status: row.status as "active" | "on_hold" | "archived",
          activeProposals: 0, // TODO: Count from proposals table
          opportunitiesInPipeline: opportunitiesCount,
          documentsMissing: 0, // TODO: Count documents with status 'missing'
          lastActivityAt: row.last_activity_at || row.created_at,
          annualBudget: row.annual_budget || null,
          primaryContact: row.primary_contact_name || row.primary_contact_email
            ? {
                name: row.primary_contact_name || null,
                email: row.primary_contact_email || null,
              }
            : null,
          billingRate: row.billing_rate || null,
          likeUs: row.like_us || false,
          categories: Array.isArray(row.categories) ? row.categories : [],
        };
      })
    );

    return clientsWithCounts;
  } catch (error) {
    console.error("[freelancer][clients] Unexpected error:", error);
    return [];
  }
}

// Legacy mock data kept for reference
const legacyMockData = [
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
  ];

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

const proposalSeed: Record<string, FreelancerProposalDetail> = {
  "p-101": {
    id: "p-101",
    clientId: "impact-circle",
    clientName: "Impact Circle Foundation",
    title: "STEM Labs Expansion",
    status: "In review",
    dueDate: "2024-12-05",
    owner: "Nia Rodriguez",
    lastEditedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    draft:
      "## Executive Summary\n\nImpact Circle Foundation is expanding our STEM labs to reach 600 additional students in Title I middle schools. This proposal outlines our strategy, timeline, and evaluation plan for scaling the program.",
    checklist: [
      { id: "chk-01", label: "Executive summary drafted", completed: true },
      { id: "chk-02", label: "Budget attachment uploaded", completed: false },
      { id: "chk-03", label: "Letters of support collected", completed: false },
      { id: "chk-04", label: "Review compliance checklist", completed: true },
    ],
    sections: [
      { id: "sec-01", title: "Needs Statement", placeholder: "Describe the challenge and target population." },
      { id: "sec-02", title: "Program Design", placeholder: "Outline the core activities, timeline, and staffing." },
      { id: "sec-03", title: "Budget Narrative", placeholder: "Explain how requested funds will be used." },
      { id: "sec-04", title: "Evaluation Plan", placeholder: "Detail metrics, data collection, and reporting." },
    ],
    aiPrompts: [
      "Draft a compelling needs statement using recent STEM education statistics.",
      "Suggest three measurable outcomes for middle school STEM programs.",
      "Rewrite the budget narrative to emphasize cost efficiency.",
    ],
  },
  "p-102": {
    id: "p-102",
    clientId: "impact-circle",
    clientName: "Impact Circle Foundation",
    title: "After-school Robotics Cohort",
    status: "Drafting",
    dueDate: "2025-01-18",
    owner: "Sarah Chen",
    lastEditedAt: null,
    draft: "",
    checklist: [
      { id: "chk-05", label: "Confirm cohort size", completed: false },
      { id: "chk-06", label: "Collect partner MOUs", completed: false },
      { id: "chk-07", label: "Upload staff bios", completed: false },
    ],
    sections: [
      { id: "sec-05", title: "Program Overview", placeholder: "Summarize cohort goals and structure." },
      { id: "sec-06", title: "Partnerships", placeholder: "Explain partner roles and commitments." },
      { id: "sec-07", title: "Sustainability", placeholder: "Describe funding diversification and long-term plans." },
    ],
    aiPrompts: [
      "Outline a timeline for launching a 12-week robotics cohort.",
      "Draft mentor recruitment messaging.",
    ],
  },
  "p-201": {
    id: "p-201",
    clientId: "harvest-cooperative",
    clientName: "Unity Harvest Cooperative",
    title: "Mobile Pantry Route Expansion",
    status: "Submitted",
    dueDate: "2024-11-30",
    owner: "Kyle Summers",
    lastEditedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    draft:
      "## Mobile Pantry Expansion\n\nUnity Harvest Cooperative will add three new routes to serve food-insecure rural communities. This continuation request summarizes outcomes from FY23 and outlines the expansion plan.",
    checklist: [
      { id: "chk-10", label: "Update service map", completed: true },
      { id: "chk-11", label: "Attach audited financials", completed: false },
      { id: "chk-12", label: "Confirm letters of support", completed: true },
    ],
    sections: [
      { id: "sec-10", title: "Community Need", placeholder: "Use USDA data and local surveys." },
      { id: "sec-11", title: "Implementation Plan", placeholder: "Outline delivery schedule and staffing." },
      { id: "sec-12", title: "Outcomes & Evaluation", placeholder: "Detail KPIs, data collection, and reporting cycle." },
    ],
    aiPrompts: [
      "Summarize FY23 impact with a focus on households served and job placements.",
      "Suggest persuasive language for rural community partnerships.",
    ],
  },
  "p-202": {
    id: "p-202",
    clientId: "harvest-cooperative",
    clientName: "Unity Harvest Cooperative",
    title: "Community Kitchen Apprenticeships",
    status: "Drafting",
    dueDate: "2025-02-10",
    owner: "Sarah Chen",
    lastEditedAt: null,
    draft: "",
    checklist: [
      { id: "chk-13", label: "Confirm employer partners", completed: false },
      { id: "chk-14", label: "Draft apprenticeship curriculum", completed: false },
    ],
    sections: [
      { id: "sec-13", title: "Program Goals", placeholder: "Define apprenticeship outcomes." },
      { id: "sec-14", title: "Employer Partnerships", placeholder: "List committed restaurants / kitchens." },
      { id: "sec-15", title: "Evaluation", placeholder: "Highlight retention and employment metrics." },
    ],
    aiPrompts: [
      "Draft an executive summary highlighting workforce development impact.",
      "Provide three evaluation metrics aligned to Department of Labor standards.",
    ],
  },
  "p-301": {
    id: "p-301",
    clientId: "learning-alliance",
    clientName: "Rising Learners Alliance",
    title: "Reading Coaches Fellowship",
    status: "On hold",
    dueDate: null,
    owner: "Amelia Cho",
    lastEditedAt: null,
    draft: "",
    checklist: [
      { id: "chk-20", label: "Finalize fellowship curriculum", completed: false },
      { id: "chk-21", label: "Confirm school partners", completed: false },
    ],
    sections: [
      { id: "sec-20", title: "Program Summary", placeholder: "Describe fellowship support model." },
      { id: "sec-21", title: "Evidence of Need", placeholder: "Use literacy assessment data." },
    ],
    aiPrompts: [
      "Suggest compelling need statement for multilingual learners.",
      "Draft a partnership request email for school principals.",
    ],
  },
  "p-401": {
    id: "p-401",
    clientId: "green-spaces",
    clientName: "Green Spaces Collective",
    title: "Neighborhood Canopy Initiative",
    status: "Awarded",
    dueDate: "2024-10-01",
    owner: "Veronica Patel",
    lastEditedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    draft:
      "## Neighborhood Canopy Initiative\n\nFollowing the initial award, this addendum details the community engagement plan and evaluation metrics requested by the funder.",
    checklist: [
      { id: "chk-30", label: "Update project timeline", completed: true },
      { id: "chk-31", label: "Attach revised budget", completed: true },
      { id: "chk-32", label: "Document community commitments", completed: false },
    ],
    sections: [
      { id: "sec-30", title: "Community Engagement", placeholder: "Describe outreach and volunteer strategy." },
      { id: "sec-31", title: "Climate Impact", placeholder: "Quantify anticipated outcomes (trees planted, cooling)." },
      { id: "sec-32", title: "Evaluation", placeholder: "Outline data collection plan." },
    ],
    aiPrompts: [
      "Draft a paragraph on climate resilience benefits for donors.",
      "Suggest evaluation metrics for urban heat mitigation.",
    ],
  },
  "p-402": {
    id: "p-402",
    clientId: "green-spaces",
    clientName: "Green Spaces Collective",
    title: "Community Garden Fellows",
    status: "In review",
    dueDate: "2024-12-15",
    owner: "Veronica Patel",
    lastEditedAt: null,
    draft: "",
    checklist: [
      { id: "chk-33", label: "Collect participant testimonials", completed: false },
      { id: "chk-34", label: "Draft sustainability plan", completed: false },
    ],
    sections: [
      { id: "sec-33", title: "Program Overview", placeholder: "Explain fellowship structure." },
      { id: "sec-34", title: "Budget Narrative", placeholder: "Describe cost per fellow." },
      { id: "sec-35", title: "Impact", placeholder: "Detail health and community outcomes." },
    ],
    aiPrompts: [
      "Write a compelling overview for a community garden fellowship.",
      "List three potential risks and mitigation strategies.",
    ],
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
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from("freelancer_clients")
      .select("*")
      .eq("id", clientId)
      .eq("freelancer_user_id", user.id)
      .maybeSingle();

    if (clientError) {
      console.error("[freelancer][client] Failed to fetch client:", clientError);
      return null;
    }

    if (!client) {
      return null;
    }

    // Fetch documents
    const { data: documents, error: documentsError } = await supabase
      .from("freelancer_documents")
      .select("*")
      .eq("client_id", clientId)
      .eq("freelancer_user_id", user.id)
      .order("created_at", { ascending: false });

    if (documentsError) {
      console.error("[freelancer][documents] Failed to fetch documents:", documentsError);
    }

    // Fetch notes
    const { data: notes, error: notesError } = await supabase
      .from("freelancer_notes")
      .select("*")
      .eq("client_id", clientId)
      .eq("freelancer_user_id", user.id)
      .order("created_at", { ascending: false });

    if (notesError) {
      console.error("[freelancer][notes] Failed to fetch notes:", notesError);
    }

    // Fetch proposals
    const { data: proposals, error: proposalsError } = await supabase
      .from("freelancer_proposals")
      .select("id, title, status, due_date")
      .eq("client_id", clientId)
      .eq("freelancer_user_id", user.id)
      .order("updated_at", { ascending: false });

    if (proposalsError) {
      console.error("[freelancer][proposals] Failed to fetch proposals:", proposalsError);
    }

    // Count active proposals (not archived or rejected)
    const activeProposalsCount = (proposals ?? []).filter(
      (p) => !["archived", "rejected", "awarded"].includes(p.status?.toLowerCase() || "")
    ).length;

    // Count opportunities matching client's focus areas
    let opportunitiesCount = 0;
    const clientFocusAreas = Array.isArray(client.focus_areas) ? client.focus_areas : [];

    console.log(`[freelancer][client] ${client.name} - Raw focus_areas:`, client.focus_areas);
    console.log(`[freelancer][client] ${client.name} - Parsed as array:`, clientFocusAreas);

    if (clientFocusAreas.length > 0) {
      // Convert focus area IDs to all possible database values (handles mixed data quality)
      const focusAreaLabels = getAllFocusAreaSearchValues(clientFocusAreas as FocusAreaId[]);
      console.log(`[freelancer][client] ${client.name} - Converted to search values:`, focusAreaLabels);

      // Count opportunities with matching focus areas and valid deadlines
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0];

      console.log(`[freelancer][client] ${client.name} - Querying opportunities with deadline >= ${sixtyDaysAgoStr}`);

      const { count, error: countError } = await supabase
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .in("focus_area", focusAreaLabels)
        .gte("deadline", sixtyDaysAgoStr)
        .neq("status", "closed");

      if (!countError && count !== null) {
        opportunitiesCount = count;
        console.log(`[freelancer][client] ${client.name} - Found ${count} matching opportunities`);
      } else if (countError) {
        console.error("[freelancer][client] Failed to count opportunities:", countError);
      }
    } else {
      console.log(`[freelancer][client] ${client.name} - No focus areas defined, skipping opportunity count`);
    }

    // Map to FreelancerClientDetail
    return {
      id: client.id,
      name: client.name,
      status: client.status as "active" | "on_hold" | "archived",
      activeProposals: activeProposalsCount,
      opportunitiesInPipeline: opportunitiesCount,
      documentsMissing: (documents ?? []).filter((d) => d.status === "missing").length,
      lastActivityAt: client.last_activity_at || client.created_at,
      annualBudget: client.annual_budget || null,
      primaryContact: client.primary_contact_name || client.primary_contact_email
        ? {
            name: client.primary_contact_name || null,
            email: client.primary_contact_email || null,
          }
        : null,
      billingRate: client.billing_rate || null,
      mission: client.mission || null,
      focusAreas: Array.isArray(client.focus_areas) ? client.focus_areas : [],
      proposals: (proposals ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status || "Drafting",
        dueDate: p.due_date,
      })),
      documents: (documents ?? []).map((doc) => ({
        id: doc.id,
        name: doc.name,
        status: doc.status as "ready" | "in_review" | "missing",
        uploadedAt: doc.created_at,
      })),
      notes: (notes ?? []).map((note) => ({
        id: note.id,
        content: note.content,
        createdAt: note.created_at,
      })),
    };
  } catch (error) {
    console.error("[freelancer][client] Unexpected error:", error);
    return null;
  }
}

export async function listFreelancerProposals(): Promise<FreelancerProposalDetail[]> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("freelancer_proposals")
      .select("*")
      .eq("freelancer_user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("[freelancer][proposal] failed to list proposals", error);
      return listSeedProposals();
    }

    return (data ?? []).map(mapRowToProposalDetail);
  } catch (error) {
    console.warn("[freelancer][proposal] unexpected error listing proposals", error);
    return listSeedProposals();
  }
}

export async function getFreelancerProposal(proposalId: string): Promise<FreelancerProposalDetail | null> {
  const targetId = proposalId.trim();
  if (!targetId) {
    return null;
  }

  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const existingRow = await fetchProposalRow(supabase, user.id, targetId);
    if (existingRow) {
      return mapRowToProposalDetail(existingRow);
    }

    const fallback = lookupProposalSeed(targetId);
    if (!fallback) {
      return null;
    }

    const seeded = await insertSeedProposal(supabase, user.id, fallback);
    return seeded ?? fallback;
  } catch (error) {
    console.warn("[freelancer][proposal] using seed data due to Supabase error", error);
    return lookupProposalSeed(targetId);
  }
}
