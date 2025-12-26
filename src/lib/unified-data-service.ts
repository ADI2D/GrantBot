/**
 * Unified Data Service
 *
 * Single source of truth for data access with context awareness.
 * Handles data fetching and mutations for both nonprofit and freelancer contexts.
 *
 * Created: 2025-12-26
 * Part of: Phase 1 - Foundation & Shared Infrastructure
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DataContext,
  UnifiedProposal,
  UnifiedOpportunity,
  UnifiedDocument,
  OpportunityFilters,
  CreateProposalInput,
  UpdateProposalInput,
} from "@/types/unified-data";
import { getAllFocusAreaSearchValues, type FocusAreaId } from "@/types/focus-areas";

export class UnifiedDataService {
  constructor(
    private client: SupabaseClient,
    private context: DataContext
  ) {}

  // ==========================================================================
  // Opportunities
  // ==========================================================================

  async fetchOpportunities(filters?: OpportunityFilters): Promise<UnifiedOpportunity[]> {
    let query = this.client
      .from("opportunities")
      .select("*, bookmarked_opportunities(user_id)");

    // Context-specific filtering
    if (this.context.type === 'organization') {
      // Nonprofits see both org-specific and global opportunities
      query = query.or(`organization_id.eq.${this.context.id},organization_id.is.null`);
    }
    // Freelancers see all global opportunities (no filter needed)

    // Apply filters
    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,funder_name.ilike.%${filters.search}%`
      );
    }

    if (filters?.focusAreas && filters.focusAreas.length > 0) {
      // Convert to all possible database values to handle mixed data quality
      const allSearchValues = new Set<string>();
      filters.focusAreas.forEach(fa => {
        const values = getAllFocusAreaSearchValues([fa as FocusAreaId]);
        values.forEach(v => allSearchValues.add(v));
      });
      const searchValuesArray = Array.from(allSearchValues);
      query = query.in("focus_area", searchValuesArray);
    } else if (filters?.focusArea) {
      // Single focus area (for freelancer context usually)
      const searchValues = getAllFocusAreaSearchValues([filters.focusArea as FocusAreaId]);
      query = query.in("focus_area", searchValues);
    }

    if (filters?.amountMin !== undefined) {
      query = query.gte("amount", filters.amountMin);
    }

    if (filters?.amountMax !== undefined) {
      query = query.lte("amount", filters.amountMax);
    }

    if (filters?.geographicScope) {
      query = query.eq("geographic_scope", filters.geographicScope);
    }

    if (!filters?.showClosed) {
      query = query.neq("status", "closed");
    }

    // Sorting
    query = query.order("deadline", { ascending: true, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch opportunities: ${error.message}`);
    }

    // Transform to unified type
    return (data || []).map(opp => this.transformOpportunity(opp));
  }

  async getOpportunity(id: string): Promise<UnifiedOpportunity | null> {
    const { data, error } = await this.client
      .from("opportunities")
      .select("*, bookmarked_opportunities(user_id)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch opportunity: ${error.message}`);
    }

    return this.transformOpportunity(data);
  }

  async bookmarkOpportunity(opportunityId: string, isBookmarked: boolean): Promise<void> {
    if (this.context.userId) {
      if (isBookmarked) {
        // Add bookmark
        await this.client
          .from("bookmarked_opportunities")
          .insert({
            user_id: this.context.userId,
            opportunity_id: opportunityId,
          });
      } else {
        // Remove bookmark
        await this.client
          .from("bookmarked_opportunities")
          .delete()
          .eq("user_id", this.context.userId)
          .eq("opportunity_id", opportunityId);
      }
    }
  }

  private transformOpportunity(data: any): UnifiedOpportunity {
    const isBookmarked = this.context.userId
      ? (data.bookmarked_opportunities || []).some((b: any) => b.user_id === this.context.userId)
      : false;

    return {
      id: data.id,
      name: data.name,
      funderName: data.funder_name,
      focusArea: data.focus_area,
      focusAreas: data.focus_areas,
      amount: data.amount,
      deadline: data.deadline,
      alignmentScore: data.alignment_score,
      complianceRiskScore: data.compliance_risk_score,
      status: data.status,
      complianceNotes: data.compliance_notes,
      applicationUrl: data.application_url,
      geographicScope: data.geographic_scope,
      isBookmarked,
      organizationId: data.organization_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // ==========================================================================
  // Proposals
  // ==========================================================================

  async fetchProposals(): Promise<UnifiedProposal[]> {
    let query = this.client
      .from("proposals")
      .select(`
        *,
        proposal_drafts(*),
        proposal_sections(*)
      `);

    // Context-aware filtering
    if (this.context.type === 'organization') {
      query = query.eq('organization_id', this.context.id);
    } else {
      query = query
        .eq('context_type', 'freelancer')
        .eq('freelancer_user_id', this.context.userId)
        .eq('context_id', this.context.id);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch proposals: ${error.message}`);
    }

    return (data || []).map(p => this.transformProposal(p));
  }

  async getProposal(id: string): Promise<UnifiedProposal | null> {
    const { data, error } = await this.client
      .from("proposals")
      .select(`
        *,
        proposal_drafts(*),
        proposal_sections(*),
        proposal_comments(*, user:user_id(email))
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch proposal: ${error.message}`);
    }

    return this.transformProposal(data);
  }

  async createProposal(input: CreateProposalInput): Promise<UnifiedProposal> {
    const proposalData: any = {
      opportunity_id: input.opportunityId,
      opportunity_name: input.opportunityName,
      owner_name: input.ownerName,
      status: input.status || 'draft',
      due_date: input.dueDate,
      context_type: input.contextType,
      context_id: input.contextId,
      progress: 0,
      checklist_status: 'pending',
    };

    if (input.contextType === 'organization') {
      proposalData.organization_id = input.contextId;
    } else {
      proposalData.freelancer_user_id = input.freelancerUserId;
    }

    const { data, error } = await this.client
      .from("proposals")
      .insert(proposalData)
      .select(`
        *,
        proposal_drafts(*),
        proposal_sections(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create proposal: ${error.message}`);
    }

    return this.transformProposal(data);
  }

  async updateProposal(input: UpdateProposalInput): Promise<UnifiedProposal> {
    const { id, draft, ...proposalUpdates } = input;

    // Update proposal metadata
    if (Object.keys(proposalUpdates).length > 0) {
      const { error } = await this.client
        .from("proposals")
        .update({
          ...proposalUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        throw new Error(`Failed to update proposal: ${error.message}`);
      }
    }

    // Update draft if provided
    if (draft) {
      await this.updateProposalDraft(id, draft.html);
    }

    // Fetch updated proposal
    const updated = await this.getProposal(id);
    if (!updated) {
      throw new Error('Proposal not found after update');
    }

    return updated;
  }

  async updateProposalDraft(proposalId: string, html: string): Promise<void> {
    const { error } = await this.client
      .from("proposal_drafts")
      .upsert({
        proposal_id: proposalId,
        draft_html: html,
        last_edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to update proposal draft: ${error.message}`);
    }
  }

  async deleteProposal(id: string): Promise<void> {
    const { error } = await this.client
      .from("proposals")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete proposal: ${error.message}`);
    }
  }

  private transformProposal(data: any): UnifiedProposal {
    const draft = Array.isArray(data.proposal_drafts) && data.proposal_drafts.length > 0
      ? {
          id: data.proposal_drafts[0].id,
          html: data.proposal_drafts[0].draft_html || '',
          lastEditedAt: data.proposal_drafts[0].last_edited_at,
        }
      : undefined;

    const sections = Array.isArray(data.proposal_sections)
      ? data.proposal_sections.map((s: any) => ({
          id: s.id,
          proposalId: s.proposal_id,
          title: s.title,
          content: s.content,
          tokenCount: s.token_count,
          order: s.order || 0,
          updatedAt: s.updated_at,
        }))
      : [];

    const comments = Array.isArray(data.proposal_comments)
      ? data.proposal_comments.map((c: any) => ({
          id: c.id,
          proposalId: c.proposal_id,
          userId: c.user_id,
          userEmail: c.user?.email || '',
          content: c.content,
          createdAt: c.created_at,
        }))
      : [];

    return {
      id: data.id,
      contextType: data.context_type || 'organization',
      contextId: data.context_id || data.organization_id,
      contextName: this.context.name,
      opportunityId: data.opportunity_id,
      opportunityName: data.opportunity_name,
      ownerName: data.owner_name,
      status: data.status,
      progress: data.progress || 0,
      dueDate: data.due_date,
      checklistStatus: data.checklist_status,
      complianceSummary: data.compliance_summary,
      draft,
      sections,
      comments,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      organizationId: data.organization_id,
      freelancerUserId: data.freelancer_user_id,
    };
  }

  // ==========================================================================
  // Documents
  // ==========================================================================

  async fetchDocuments(): Promise<UnifiedDocument[]> {
    let query = this.client
      .from("documents")
      .select("*");

    // Context-aware filtering
    if (this.context.type === 'organization') {
      query = query.eq('organization_id', this.context.id);
    } else {
      query = query.eq('organization_id', this.context.id); // clients are stored in organizations table
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    return (data || []).map(d => this.transformDocument(d));
  }

  private transformDocument(data: any): UnifiedDocument {
    return {
      id: data.id,
      contextType: this.context.type,
      contextId: this.context.id,
      name: data.name,
      type: data.type,
      filePath: data.file_path,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      metadata: data.metadata,
      uploadedBy: data.uploaded_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
