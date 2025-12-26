/**
 * Unified Data Types
 *
 * These types support both nonprofit (organization) and freelancer (client) contexts,
 * enabling code reuse across both user types while maintaining type safety.
 *
 * Created: 2025-12-26
 * Part of: Phase 1 - Foundation & Shared Infrastructure
 */

// ============================================================================
// Context Types
// ============================================================================

export type ContextType = 'organization' | 'freelancer';

export type DataContext = {
  type: ContextType;
  id: string; // organization_id or client_id
  userId?: string; // for freelancer context
  name?: string; // organization name or client name (for display)
};

// ============================================================================
// Proposal Types
// ============================================================================

export type ProposalStatus = 'draft' | 'in_progress' | 'submitted' | 'awarded' | 'rejected' | 'archived';
export type ChecklistStatus = 'pending' | 'in_progress' | 'ready';

export type UnifiedProposal = {
  id: string;
  contextType: ContextType;
  contextId: string; // org_id or client_id
  contextName?: string; // org name or client name

  // Core fields
  opportunityId?: string | null;
  opportunityName: string;
  ownerName: string | null;
  status: ProposalStatus;
  progress: number; // 0-100
  dueDate: string | null;
  checklistStatus: ChecklistStatus;
  complianceSummary?: string | null;

  // Draft content
  draft?: {
    id: string;
    html: string;
    lastEditedAt: string | null;
  };

  // Sections
  sections?: ProposalSection[];

  // Comments
  comments?: ProposalComment[];

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Context-specific fields
  organizationId?: string | null; // For nonprofit context
  freelancerUserId?: string | null; // For freelancer context
};

export type ProposalSection = {
  id: string;
  proposalId: string;
  title: string;
  content: string;
  tokenCount: number | null;
  order: number;
  updatedAt: string;
};

export type ProposalComment = {
  id: string;
  proposalId: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: string;
};

export type CreateProposalInput = {
  opportunityId?: string;
  opportunityName: string;
  ownerName?: string;
  dueDate?: string;
  status?: ProposalStatus;
  contextType: ContextType;
  contextId: string;
  freelancerUserId?: string; // Required for freelancer context
};

export type UpdateProposalInput = Partial<Omit<CreateProposalInput, 'contextType' | 'contextId'>> & {
  id: string;
  draft?: {
    html: string;
  };
};

// ============================================================================
// Opportunity Types
// ============================================================================

export type OpportunityStatus = 'open' | 'closing_soon' | 'closed';

export type UnifiedOpportunity = {
  id: string;
  name: string;
  funderName: string | null;
  focusArea: string | null;
  focusAreas: string[] | null;
  amount: number | null;
  deadline: string | null;

  // Scoring & matching
  alignmentScore: number | null;
  complianceRiskScore: number | null;
  matchReason?: string | null; // For AI-assisted matching (freelancer)

  // Status & metadata
  status: OpportunityStatus;
  complianceNotes: string | null;
  applicationUrl: string | null;
  geographicScope: string | null;

  // Bookmarking
  isBookmarked: boolean;

  // Context-specific
  organizationId?: string | null; // null for global opportunities

  // Timestamps
  createdAt: string;
  updatedAt: string;
};

export type OpportunityFilters = {
  search?: string;
  focusAreas?: string[];
  focusArea?: string;
  amountMin?: number;
  amountMax?: number;
  geographicScope?: string;
  showClosed?: boolean;
  viewMode?: 'all' | 'recommended' | 'saved';
};

// ============================================================================
// Document Types
// ============================================================================

export type DocumentType = 'proposal' | 'supporting' | 'template' | 'other';

export type UnifiedDocument = {
  id: string;
  contextType: ContextType;
  contextId: string; // org_id or client_id

  name: string;
  type: DocumentType;
  filePath: string;
  fileSize: number;
  mimeType: string;

  // Metadata (JSONB field, can contain custom data)
  metadata?: Record<string, any>;

  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type UploadDocumentInput = {
  contextType: ContextType;
  contextId: string;
  name: string;
  type: DocumentType;
  file: File;
  metadata?: Record<string, any>;
};

// ============================================================================
// Organization/Client Types
// ============================================================================

export type OrganizationType = 'nonprofit' | 'client';
export type OrganizationStatus = 'active' | 'on_hold' | 'archived';

export type UnifiedOrganization = {
  id: string;
  parentType: OrganizationType;
  name: string;
  mission: string | null;
  annualBudget: number | null;
  focusAreas: string[] | null;

  // Contact info
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;

  // Status & activity
  status?: OrganizationStatus;
  lastActivityAt?: string | null;

  // Context-specific
  freelancerUserId?: string | null; // For client type

  // Metadata
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// API Response Types
// ============================================================================

export type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guard to check if a context is for a nonprofit organization
 */
export function isNonprofitContext(context: DataContext): boolean {
  return context.type === 'organization';
}

/**
 * Type guard to check if a context is for a freelancer client
 */
export function isFreelancerContext(context: DataContext): boolean {
  return context.type === 'freelancer';
}

/**
 * Get display name for context (for UI)
 */
export function getContextDisplayName(context: DataContext): string {
  return context.name || (context.type === 'organization' ? 'Organization' : 'Client');
}

/**
 * Create a context object from parameters
 */
export function createContext(
  type: ContextType,
  id: string,
  userId?: string,
  name?: string
): DataContext {
  return { type, id, userId, name };
}

/**
 * Check if two contexts are equal
 */
export function areContextsEqual(a: DataContext, b: DataContext): boolean {
  return a.type === b.type && a.id === b.id;
}
