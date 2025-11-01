export type KpiTile = {
  label: string;
  value: string | number;
  delta?: string;
};

export type Opportunity = {
  id: string;
  name: string;
  focusArea: string | null;
  amount: number | null;
  deadline: string | null;
  alignmentScore: number | null;
  status: string;
  complianceNotes: string | null;
  applicationUrl?: string | null;
};

export type Proposal = {
  id: string;
  opportunityId: string | null;
  opportunityName: string;
  focusArea: string | null;
  ownerName: string | null;
  status: string;
  progress: number;
  dueDate: string | null;
  checklistStatus: string;
  confidence: number | null;
  complianceSummary?: { section: string; items: { label: string; status: string }[] }[];
  archived?: boolean;
};

export type LearningInsight = {
  title: string;
  description: string;
};

export type TaskItem = {
  title: string;
  subtext: string;
  tone: "success" | "warning";
};

export type DashboardResponse = {
  organization: {
    id: string;
    name: string;
    mission: string | null;
    impactSummary: string | null;
    onboardingCompletion: number;
    documents: DocumentMeta[];
    planId: string;
  };
  kpis: KpiTile[];
  opportunities: Opportunity[];
  proposals: Proposal[];
  learning: LearningInsight[];
  tasks: TaskItem[];
};

export type OrganizationProfileResponse = {
  organization: {
    id: string;
    name: string;
    mission: string | null;
    impactSummary: string | null;
    differentiator: string | null;
    annualBudget: number | null;
    onboardingCompletion: number;
    documents: DocumentMeta[];
    planId: string;
  };
};

export type DocumentMeta = {
  title: string;
  status?: string;
  url?: string;
  fileName?: string; // Original file name
  filePath?: string; // Storage path
  fileSize?: number; // Size in bytes
  mimeType?: string; // MIME type
  uploadedAt?: string; // ISO timestamp
  uploadedBy?: string; // User email
};

export type WorkspaceResponse = {
  proposal: Proposal | null;
  sections: {
    id: string;
    title: string;
    tokenCount: number;
    content: string | null;
  }[];
  compliance: {
    section: string;
    items: { label: string; status: string }[];
  }[];
};

export type AnalyticsResponse = {
  funnel: { label: string; value: number; target: number }[];
  winRateTrend: number[];
  boardInsights: LearningInsight[];
  activity: ActivityLog[];
};

export type ChecklistResponse = {
  sections: {
    section: string;
    items: { label: string; status: string }[];
  }[];
  completion: number;
};

export type ActivityLog = {
  id: string;
  proposalId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BillingResponse = {
  planId: string;
  planName: string;
  planLimit: number;
  planPriceCents: number;
  planStripePriceId: string | null;
  proposalsThisMonth: number;
  submissionsThisQuarter: number;
  nextReset: string;
  usageStatus: {
    usageRatio: number;
    remaining: number;
    status: "ok" | "warning" | "limit";
  };
  stripeCustomerLinked: boolean;
  upcomingInvoice?: {
    amount: number;
    date: string;
  } | null;
  lastPayment?: {
    amount: number;
    date: string;
  } | null;
  invoices: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    dueDate: string | null;
    paidAt: string | null;
    createdAt: string | null;
  }[];
  availablePlans: {
    id: string;
    name: string;
    description: string | null;
    monthlyPriceCents: number;
    maxProposalsPerMonth: number;
  }[];
};
