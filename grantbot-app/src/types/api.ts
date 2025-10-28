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
