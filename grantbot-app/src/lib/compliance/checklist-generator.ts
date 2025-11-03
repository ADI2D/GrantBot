/**
 * Compliance Checklist Generator
 *
 * Converts compliance requirements into structured, actionable checklists
 * for proposal compliance tracking.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComplianceRequirement } from "./extractor";

export type ChecklistItem = {
  label: string;
  status: "complete" | "flag" | "missing";
  requirementType?: string;
  riskLevel?: string;
  suggestedAction?: string;
  deadline?: string;
};

export type ChecklistSection = {
  section: string;
  items: ChecklistItem[];
};

export type ComplianceSummary = ChecklistSection[];

export class ChecklistGenerator {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Generate checklist from opportunity requirements
   */
  async generateFromOpportunity(opportunityId: string): Promise<ComplianceSummary> {
    // Fetch compliance requirements
    const { data: requirements, error } = await this.client
      .from("compliance_requirements")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("risk_level", { ascending: false })
      .order("requirement_type");

    if (error) {
      console.error("Failed to fetch compliance requirements:", error);
      throw new Error("Failed to fetch compliance requirements");
    }

    if (!requirements || requirements.length === 0) {
      // Return default template if no requirements found
      return this.getDefaultTemplate();
    }

    // Group requirements by type
    const grouped = this.groupByType(requirements);

    // Convert to checklist sections
    const sections: ComplianceSummary = [];

    // Section order (prioritize by importance)
    const sectionOrder: Array<keyof typeof grouped> = [
      "eligibility",
      "deadline",
      "document",
      "narrative",
      "operational",
      "other",
    ];

    for (const type of sectionOrder) {
      const reqs = grouped[type];
      if (!reqs || reqs.length === 0) continue;

      const sectionName = this.getSectionName(type);
      const items = reqs.map((req) => this.requirementToChecklistItem(req));

      sections.push({
        section: sectionName,
        items,
      });
    }

    // If no sections, return default
    if (sections.length === 0) {
      return this.getDefaultTemplate();
    }

    return sections;
  }

  /**
   * Group requirements by type
   */
  private groupByType(requirements: any[]): Record<string, any[]> {
    return requirements.reduce((acc, req) => {
      const type = req.requirement_type || "other";
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(req);
      return acc;
    }, {} as Record<string, any[]>);
  }

  /**
   * Get human-readable section name
   */
  private getSectionName(type: string): string {
    const names: Record<string, string> = {
      eligibility: "Eligibility Requirements",
      document: "Required Documents",
      narrative: "Narrative Requirements",
      operational: "Operational Requirements",
      deadline: "Deadlines & Timeline",
      other: "Other Requirements",
    };
    return names[type] || "Other Requirements";
  }

  /**
   * Convert requirement record to checklist item
   */
  private requirementToChecklistItem(req: any): ChecklistItem {
    // Determine initial status based on risk level
    let status: "complete" | "flag" | "missing" = "missing";

    // High risk requirements start as flagged (need attention)
    if (req.risk_level === "high") {
      status = "flag";
    }

    return {
      label: this.formatRequirementLabel(req),
      status,
      requirementType: req.requirement_type,
      riskLevel: req.risk_level,
      suggestedAction: req.suggested_action || undefined,
      deadline: req.deadline || undefined,
    };
  }

  /**
   * Format requirement text as checklist label
   */
  private formatRequirementLabel(req: any): string {
    const text = req.requirement_text || "";

    // If it has a suggested action, use that as the label
    if (req.suggested_action) {
      return req.suggested_action;
    }

    // Otherwise, clean up requirement text
    let label = text.trim();

    // Remove common prefixes
    label = label
      .replace(/^(requires?|must have|must be|need|needed):?\s*/i, "")
      .replace(/^(organization|applicant|grantee)\s+/i, "");

    // Capitalize first letter
    label = label.charAt(0).toUpperCase() + label.slice(1);

    // Truncate if too long
    if (label.length > 100) {
      label = label.substring(0, 97) + "...";
    }

    return label;
  }

  /**
   * Get default checklist template
   */
  private getDefaultTemplate(): ComplianceSummary {
    return [
      {
        section: "Eligibility Requirements",
        items: [
          {
            label: "Verify 501(c)(3) tax-exempt status",
            status: "missing",
            requirementType: "eligibility",
            riskLevel: "high",
            suggestedAction: "Upload IRS 501(c)(3) determination letter",
          },
          {
            label: "Confirm budget within funder range",
            status: "missing",
            requirementType: "eligibility",
            riskLevel: "high",
          },
          {
            label: "Verify geographic service area matches criteria",
            status: "missing",
            requirementType: "eligibility",
            riskLevel: "high",
          },
        ],
      },
      {
        section: "Required Documents",
        items: [
          {
            label: "Prepare most recent audited financial statements",
            status: "missing",
            requirementType: "document",
            riskLevel: "medium",
          },
          {
            label: "Gather IRS Form 990 tax return",
            status: "missing",
            requirementType: "document",
            riskLevel: "medium",
          },
          {
            label: "Prepare current board roster with affiliations",
            status: "missing",
            requirementType: "document",
            riskLevel: "medium",
          },
        ],
      },
      {
        section: "Narrative Requirements",
        items: [
          {
            label: "Include recent data and citations in needs statement",
            status: "missing",
            requirementType: "narrative",
            riskLevel: "medium",
          },
          {
            label: "Define clear, measurable program outcomes",
            status: "missing",
            requirementType: "narrative",
            riskLevel: "medium",
          },
          {
            label: "Develop sustainability strategy",
            status: "missing",
            requirementType: "narrative",
            riskLevel: "medium",
          },
        ],
      },
    ];
  }

  /**
   * Auto-populate proposal compliance summary from opportunity
   */
  async populateProposalCompliance(proposalId: string, opportunityId: string): Promise<void> {
    // Generate checklist from opportunity
    const checklist = await this.generateFromOpportunity(opportunityId);

    // Update proposal with compliance summary
    const { error } = await this.client
      .from("proposals")
      .update({
        compliance_summary: checklist,
        checklist_status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);

    if (error) {
      console.error("Failed to update proposal compliance:", error);
      throw new Error("Failed to update proposal compliance");
    }
  }

  /**
   * Update single checklist item status
   */
  async updateItemStatus(
    proposalId: string,
    sectionIndex: number,
    itemIndex: number,
    status: "complete" | "flag" | "missing"
  ): Promise<void> {
    // Fetch current compliance summary
    const { data: proposal, error: fetchError } = await this.client
      .from("proposals")
      .select("compliance_summary")
      .eq("id", proposalId)
      .single();

    if (fetchError || !proposal) {
      throw new Error("Proposal not found");
    }

    const complianceSummary = (proposal.compliance_summary as ComplianceSummary) || [];

    if (!complianceSummary[sectionIndex] || !complianceSummary[sectionIndex].items[itemIndex]) {
      throw new Error("Invalid section or item index");
    }

    // Update status
    complianceSummary[sectionIndex].items[itemIndex].status = status;

    // Calculate overall checklist status
    const overallStatus = this.calculateOverallStatus(complianceSummary);

    // Save updated compliance summary
    const { error: updateError } = await this.client
      .from("proposals")
      .update({
        compliance_summary: complianceSummary,
        checklist_status: overallStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);

    if (updateError) {
      throw new Error("Failed to update item status");
    }
  }

  /**
   * Calculate overall checklist status
   */
  private calculateOverallStatus(summary: ComplianceSummary): "ready" | "in_progress" | "at_risk" {
    let totalItems = 0;
    let completeItems = 0;
    let flaggedItems = 0;

    for (const section of summary) {
      for (const item of section.items) {
        totalItems++;
        if (item.status === "complete") {
          completeItems++;
        } else if (item.status === "flag") {
          flaggedItems++;
        }
      }
    }

    if (totalItems === 0) return "in_progress";

    const completionRate = completeItems / totalItems;

    // Ready: 95%+ complete with no flags
    if (completionRate >= 0.95 && flaggedItems === 0) {
      return "ready";
    }

    // At risk: <50% complete or has flags
    if (completionRate < 0.5 || flaggedItems > 0) {
      return "at_risk";
    }

    return "in_progress";
  }

  /**
   * Get compliance completion stats
   */
  async getCompletionStats(proposalId: string): Promise<{
    total: number;
    complete: number;
    flagged: number;
    missing: number;
    completionRate: number;
  }> {
    const { data: proposal, error } = await this.client
      .from("proposals")
      .select("compliance_summary")
      .eq("id", proposalId)
      .single();

    if (error || !proposal) {
      return {
        total: 0,
        complete: 0,
        flagged: 0,
        missing: 0,
        completionRate: 0,
      };
    }

    const summary = (proposal.compliance_summary as ComplianceSummary) || [];

    let total = 0;
    let complete = 0;
    let flagged = 0;
    let missing = 0;

    for (const section of summary) {
      for (const item of section.items) {
        total++;
        if (item.status === "complete") complete++;
        else if (item.status === "flag") flagged++;
        else if (item.status === "missing") missing++;
      }
    }

    const completionRate = total > 0 ? (complete / total) * 100 : 0;

    return {
      total,
      complete,
      flagged,
      missing,
      completionRate: Math.round(completionRate),
    };
  }
}
