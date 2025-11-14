import type { SupabaseClient } from "@supabase/supabase-js";
import type { Opportunity, Proposal, DocumentMeta, ActivityLog } from "@/types/api";
import type { Database } from "@/types/database";

type ComplianceSection = {
  section: string;
  items: { label: string; status: string }[];
};

export type OutcomeRecord = {
  id: string;
  proposal_id: string | null;
  status: "submitted" | "funded" | "lost" | null;
  award_amount: number | null;
  learning_insight: string | null;
  recorded_at: string | null;
};

type Client = SupabaseClient<Database>;

export async function fetchOrganization(client: Client, orgId: string) {
  const { data, error } = await client
    .from("organizations")
    .select(
      "id, name, mission, impact_summary, differentiator, annual_budget, focus_areas, onboarding_completion, document_metadata, plan_id, ein, founded_year, staff_size, geographic_scope, website, programs, impact_metrics, target_demographics, past_funders",
    )
    .eq("id", orgId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load organization: ${error.message}`);
  }

  if (!data) {
    throw new Error("Organization not found.");
  }

  const documents: DocumentMeta[] = Array.isArray(data.document_metadata)
    ? data.document_metadata
    : [];

  return {
    id: data.id,
    name: data.name,
    mission: data.mission,
    impactSummary: data.impact_summary,
    impact_summary: data.impact_summary,
    differentiator: data.differentiator,
    annualBudget: data.annual_budget,
    annual_budget: data.annual_budget,
    focus_areas: data.focus_areas || [],
    onboardingCompletion: Number(data.onboarding_completion ?? 0),
    documents,
    planId: data.plan_id ?? "starter",
    // New onboarding fields
    ein: data.ein,
    founded_year: data.founded_year,
    staff_size: data.staff_size,
    geographic_scope: data.geographic_scope,
    website: data.website,
    programs: data.programs || [],
    impact_metrics: data.impact_metrics || [],
    target_demographics: data.target_demographics || [],
    past_funders: data.past_funders || [],
  };
}

export type OpportunityFilters = {
  search?: string;
  focusArea?: string; // Deprecated - use focusAreas instead
  focusAreas?: string[]; // Multiple focus areas (OR logic)
  minAmount?: number;
  maxAmount?: number;
  minDeadline?: string;
  maxDeadline?: string;
  geographicScope?: string;
  showClosed?: boolean; // Show closed opportunities when explicitly enabled
  limit?: number;
  offset?: number;
};

export async function fetchOpportunities(
  client: Client,
  orgId: string,
  filters?: OpportunityFilters
): Promise<Opportunity[]> {
  // Show opportunities from past 60 days OR future (for reference and planning)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0];

  // Get user ID for bookmark lookup
  const { data: { user } } = await client.auth.getUser();
  const userId = user?.id;

  // First, fetch bookmarks for this organization
  const { data: bookmarksData } = await client
    .from("bookmarked_opportunities")
    .select("opportunity_id")
    .eq("organization_id", orgId);

  const bookmarkedIds = new Set(bookmarksData?.map(b => b.opportunity_id) || []);

  let query = client
    .from("opportunities")
    .select(
      `id, name, focus_area, focus_areas, funder_name, amount, deadline, alignment_score, status, compliance_notes, application_url, geographic_scope, compliance_risk_score`,
    )
    .or(`organization_id.eq.${orgId},organization_id.is.null`)
    .or(`deadline.gte.${sixtyDaysAgoStr},deadline.is.null`); // Show past 60 days + future + ongoing programs (no deadline)

  // Only exclude closed opportunities if showClosed filter is not explicitly enabled
  if (!filters?.showClosed) {
    query = query.not("status", "ilike", "closed"); // Exclude closed opportunities (case-insensitive)
  }

  // Apply filters
  // Support both single focusArea (deprecated) and multiple focusAreas
  if (filters?.focusAreas && filters.focusAreas.length > 0) {
    // Multiple focus areas - use OR logic
    const focusAreaConditions = filters.focusAreas.map(fa => `focus_area.eq.${fa}`).join(',');
    query = query.or(focusAreaConditions);
  } else if (filters?.focusArea) {
    // Single focus area (deprecated, kept for backwards compatibility)
    query = query.eq("focus_area", filters.focusArea);
  }

  if (filters?.minAmount !== undefined) {
    query = query.gte("amount", filters.minAmount);
  }

  if (filters?.maxAmount !== undefined) {
    query = query.lte("amount", filters.maxAmount);
  }

  if (filters?.minDeadline) {
    query = query.gte("deadline", filters.minDeadline);
  }

  if (filters?.maxDeadline) {
    query = query.lte("deadline", filters.maxDeadline);
  }

  if (filters?.geographicScope) {
    query = query.ilike("geographic_scope", `%${filters.geographicScope}%`);
  }

  // Apply full-text search if query provided
  if (filters?.search && filters.search.trim()) {
    // Use Postgres full-text search with websearch_to_tsquery for natural language queries
    query = query.textSearch("search_vector", filters.search, {
      type: "websearch",
      config: "english",
    });
  }

  // Order by deadline (soonest first, NULL deadlines last)
  // This ensures the 1000 limit shows the most urgent opportunities
  query = query.order("deadline", { ascending: true, nullsFirst: false });

  // Apply pagination (default to showing all, max 1000 for performance)
  const limit = filters?.limit ?? 1000;
  const offset = filters?.offset ?? 0;

  // Use limit() for better compatibility with Supabase client
  query = query.limit(limit);
  if (offset > 0) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error, count} = await query;

  if (error) {
    throw new Error(`Failed to load opportunities: ${error.message}`);
  }

  // Debug: Log the actual count returned
  console.log(`[fetchOpportunities] Returned ${data?.length ?? 0} opportunities (requested limit: ${limit})`);

  const now = new Date();
  const opportunities = (data ?? []).map((item: any) => ({
    id: item.id,
    name: item.name,
    focusArea: item.focus_area, // Legacy field
    focus_areas: item.focus_areas || [], // New array field
    funderName: item.funder_name,
    amount: item.amount,
    deadline: item.deadline,
    alignmentScore: item.alignment_score,
    status: item.status,
    complianceNotes: item.compliance_notes,
    applicationUrl: item.application_url,
    geographicScope: item.geographic_scope,
    complianceRiskScore: item.compliance_risk_score,
    isBookmarked: bookmarkedIds.has(item.id),
  }));

  // Sort: Upcoming deadlines first (soonest), null deadlines (ongoing programs) last
  return opportunities.sort((a, b) => {
    const aDeadline = a.deadline ? new Date(a.deadline) : new Date(8640000000000000); // Max date for null deadlines
    const bDeadline = b.deadline ? new Date(b.deadline) : new Date(8640000000000000);
    return aDeadline.getTime() - bDeadline.getTime();
  });
}

type RawProposal = {
  id: string;
  opportunity_id: string | null;
  owner_name: string | null;
  status: string;
  progress: number | null;
  due_date: string | null;
  checklist_status: string;
  confidence: number | null;
  compliance_summary: ComplianceSection[] | null;
  archived: boolean | null;
  opportunities: {
    name: string;
    focus_area: string | null;
  } | null;
};

export async function fetchProposals(client: Client, orgId: string): Promise<Proposal[]> {
  const { data, error } = await client
    .from("proposals")
    .select(
      "id, opportunity_id, owner_name, status, progress, due_date, checklist_status, confidence, compliance_summary, archived, opportunities:opportunity_id(name, focus_area)"
    )
    .eq("organization_id", orgId)
    .is("deleted_at", null) // Filter out soft-deleted proposals
    .order("due_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to load proposals: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as RawProposal[];

  return rows.map((proposal) => {
    const complianceSummary: ComplianceSection[] = Array.isArray(
      proposal.compliance_summary,
    )
      ? proposal.compliance_summary ?? []
      : [];

    return {
      id: proposal.id,
      opportunityId: proposal.opportunity_id,
      opportunityName: proposal.opportunities?.name ?? "Untitled opportunity",
      focusArea: proposal.opportunities?.focus_area ?? null,
      ownerName: proposal.owner_name,
      status: proposal.status,
      progress: proposal.progress ?? 0,
      dueDate: proposal.due_date,
      checklistStatus: proposal.checklist_status,
      confidence: proposal.confidence,
      complianceSummary,
      archived: proposal.archived ?? false,
    };
  });
}

export async function fetchProposalSections(client: Client, proposalId: string) {
  const { data, error } = await client
    .from("proposal_sections")
    .select("id, title, token_count, content")
    .eq("proposal_id", proposalId)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed to load proposal sections: ${error.message}`);
  }

  return (data ?? []).map((section) => ({
    id: section.id,
    title: section.title,
    tokenCount: section.token_count ?? 0,
    content: section.content,
  }));
}

export async function fetchOutcomes(client: Client, orgId: string): Promise<OutcomeRecord[]> {
  const { data, error } = await client
    .from("outcomes")
    .select("id, proposal_id, status, award_amount, learning_insight, recorded_at")
    .eq("organization_id", orgId)
    .order("recorded_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load outcomes: ${error.message}`);
  }

  return (data ?? []) as OutcomeRecord[];
}

export async function fetchActivityLogs(client: Client, orgId: string): Promise<ActivityLog[]> {
  const { data, error } = await client
    .from("activity_logs")
    .select("id, proposal_id, action, metadata, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(`Failed to load activity logs: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    proposalId: row.proposal_id,
    action: row.action,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at ?? new Date().toISOString(),
  }));
}
