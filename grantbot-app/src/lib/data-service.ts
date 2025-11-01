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
      "id, name, mission, impact_summary, differentiator, annual_budget, onboarding_completion, document_metadata, plan_id",
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
    differentiator: data.differentiator,
    annualBudget: data.annual_budget,
    onboardingCompletion: Number(data.onboarding_completion ?? 0),
    documents,
    planId: data.plan_id ?? "starter",
  };
}

export async function fetchOpportunities(client: Client, orgId: string): Promise<Opportunity[]> {
  const { data, error } = await client
    .from("opportunities")
    .select(
      "id, name, focus_area, amount, deadline, alignment_score, status, compliance_notes, application_url",
    )
    .or(`organization_id.eq.${orgId},organization_id.is.null`)
    .order("deadline", { ascending: true });

  if (error) {
    throw new Error(`Failed to load opportunities: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    focusArea: item.focus_area,
    amount: item.amount,
    deadline: item.deadline,
    alignmentScore: item.alignment_score,
    status: item.status,
    complianceNotes: item.compliance_notes,
    applicationUrl: item.application_url,
  }));
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
