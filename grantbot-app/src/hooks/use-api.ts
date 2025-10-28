import { useQuery } from "@tanstack/react-query";
import type {
  AnalyticsResponse,
  ChecklistResponse,
  DashboardResponse,
  OrganizationProfileResponse,
  WorkspaceResponse,
} from "@/types/api";
import { useOrg } from "@/hooks/use-org";
type BillingResponse = {
  planId: string;
  proposalsThisMonth: number;
  submissionsThisQuarter: number;
  nextReset: string;
};

async function fetcher<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return (await response.json()) as T;
}

export function useDashboardData() {
  const { currentOrgId } = useOrg();
  return useQuery({
    queryKey: ["dashboard", currentOrgId],
    queryFn: () => fetcher<DashboardResponse>(`/api/dashboard?orgId=${currentOrgId}`),
    enabled: Boolean(currentOrgId),
  });
}

export function useOrganizationProfile() {
  const { currentOrgId } = useOrg();
  return useQuery({
    queryKey: ["organization", currentOrgId],
    queryFn: () => fetcher<OrganizationProfileResponse>(`/api/organization?orgId=${currentOrgId}`),
    enabled: Boolean(currentOrgId),
  });
}

export function useOpportunitiesData() {
  const { currentOrgId } = useOrg();
  return useQuery({
    queryKey: ["opportunities", currentOrgId],
    queryFn: () => fetcher<{ opportunities: DashboardResponse["opportunities"] }>(
      `/api/opportunities?orgId=${currentOrgId}`,
    ),
    enabled: Boolean(currentOrgId),
  });
}

export function useProposalsData() {
  const { currentOrgId } = useOrg();
  return useQuery({
    queryKey: ["proposals", currentOrgId],
    queryFn: () => fetcher<{ proposals: DashboardResponse["proposals"] }>(
      `/api/proposals?orgId=${currentOrgId}`,
    ),
    enabled: Boolean(currentOrgId),
  });
}

export function useWorkspaceData(proposalId?: string) {
  const { currentOrgId } = useOrg();
  const params = new URLSearchParams();
  if (proposalId) params.set("proposalId", proposalId);
  if (currentOrgId) params.set("orgId", currentOrgId);
  const queryString = params.toString();

  return useQuery({
    queryKey: ["workspace", currentOrgId, proposalId ?? "default"],
    queryFn: () =>
      fetcher<WorkspaceResponse>(`/api/workspace${queryString ? `?${queryString}` : ""}`),
    enabled: Boolean(currentOrgId),
  });
}

export function useAnalyticsData() {
  const { currentOrgId } = useOrg();
  return useQuery({
    queryKey: ["analytics", currentOrgId],
    queryFn: () => fetcher<AnalyticsResponse>(`/api/analytics?orgId=${currentOrgId}`),
    enabled: Boolean(currentOrgId),
  });
}

export function useChecklistData() {
  const { currentOrgId } = useOrg();
  return useQuery({
    queryKey: ["checklists", currentOrgId],
    queryFn: () => fetcher<ChecklistResponse>(`/api/checklists?orgId=${currentOrgId}`),
    enabled: Boolean(currentOrgId),
  });
}

export function useBillingData() {
  const { currentOrgId } = useOrg();
  return useQuery({
    queryKey: ["billing", currentOrgId],
    queryFn: () => fetcher<BillingResponse>(`/api/billing?orgId=${currentOrgId}`),
    enabled: Boolean(currentOrgId),
  });
}
