import { createServerSupabase } from "@/lib/supabase-server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, Building2, FileText, TrendingUp, DollarSign, Zap } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface FreelancerUsage {
  user_id: string;
  user_email: string;
  total_tokens: number;
  total_cost: number;
  client_count: number;
  proposal_count: number;
}

interface OrganizationUsage {
  org_id: string;
  org_name: string;
  total_tokens: number;
  total_cost: number;
  proposal_count: number;
}

export default async function AdminUsagePage() {
  const supabase = await createServerSupabase();

  // Get overall platform statistics
  const { data: allEvents } = await supabase
    .from("ai_cost_events")
    .select("prompt_tokens, completion_tokens, total_tokens, cost_usd, freelancer_user_id, organization_id");

  const totalTokens = allEvents?.reduce((sum, event) => sum + event.total_tokens, 0) || 0;
  const totalCost = allEvents?.reduce((sum, event) => sum + event.cost_usd, 0) || 0;
  const freelancerEvents = allEvents?.filter(e => e.freelancer_user_id) || [];
  const orgEvents = allEvents?.filter(e => e.organization_id) || [];

  const freelancerTokens = freelancerEvents.reduce((sum, event) => sum + event.total_tokens, 0);
  const freelancerCost = freelancerEvents.reduce((sum, event) => sum + event.cost_usd, 0);
  const orgTokens = orgEvents.reduce((sum, event) => sum + event.total_tokens, 0);
  const orgCost = orgEvents.reduce((sum, event) => sum + event.cost_usd, 0);

  // Get freelancer usage breakdown
  const { data: freelancerData } = await supabase
    .from("ai_cost_events")
    .select(`
      freelancer_user_id,
      total_tokens,
      cost_usd,
      freelancer_client_id,
      freelancer_proposal_id
    `)
    .not("freelancer_user_id", "is", null);

  // Get user emails for freelancers
  const freelancerUserIds = [...new Set(freelancerData?.map(f => f.freelancer_user_id))];
  const { data: userData } = await supabase.auth.admin.listUsers();
  const userEmailMap = new Map(userData.users.map(u => [u.id, u.email || "Unknown"]));

  // Aggregate freelancer usage
  const freelancerUsageMap = new Map<string, FreelancerUsage>();
  freelancerData?.forEach((event: any) => {
    const userId = event.freelancer_user_id;

    if (!freelancerUsageMap.has(userId)) {
      freelancerUsageMap.set(userId, {
        user_id: userId,
        user_email: userEmailMap.get(userId) || "Unknown",
        total_tokens: 0,
        total_cost: 0,
        client_count: new Set<string>().size,
        proposal_count: new Set<string>().size,
      });
    }

    const usage = freelancerUsageMap.get(userId)!;
    usage.total_tokens += event.total_tokens;
    usage.total_cost += event.cost_usd;
  });

  // Count unique clients and proposals per freelancer
  const clientsPerFreelancer = new Map<string, Set<string>>();
  const proposalsPerFreelancer = new Map<string, Set<string>>();

  freelancerData?.forEach((event: any) => {
    const userId = event.freelancer_user_id;

    if (event.freelancer_client_id) {
      if (!clientsPerFreelancer.has(userId)) {
        clientsPerFreelancer.set(userId, new Set());
      }
      clientsPerFreelancer.get(userId)!.add(event.freelancer_client_id);
    }

    if (event.freelancer_proposal_id) {
      if (!proposalsPerFreelancer.has(userId)) {
        proposalsPerFreelancer.set(userId, new Set());
      }
      proposalsPerFreelancer.get(userId)!.add(event.freelancer_proposal_id);
    }
  });

  // Update counts
  freelancerUsageMap.forEach((usage, userId) => {
    usage.client_count = clientsPerFreelancer.get(userId)?.size || 0;
    usage.proposal_count = proposalsPerFreelancer.get(userId)?.size || 0;
  });

  const freelancerUsage = Array.from(freelancerUsageMap.values()).sort((a, b) => b.total_cost - a.total_cost);

  // Get organization usage breakdown
  const { data: orgData } = await supabase
    .from("ai_cost_events")
    .select(`
      organization_id,
      total_tokens,
      cost_usd,
      proposal_id,
      organizations (
        id,
        name
      )
    `)
    .not("organization_id", "is", null);

  // Aggregate organization usage
  const orgUsageMap = new Map<string, OrganizationUsage>();
  orgData?.forEach((event: any) => {
    const orgId = event.organization_id;
    const orgName = event.organizations?.name || "Unknown Organization";

    if (!orgUsageMap.has(orgId)) {
      orgUsageMap.set(orgId, {
        org_id: orgId,
        org_name: orgName,
        total_tokens: 0,
        total_cost: 0,
        proposal_count: new Set<string>().size,
      });
    }

    const usage = orgUsageMap.get(orgId)!;
    usage.total_tokens += event.total_tokens;
    usage.total_cost += event.cost_usd;
  });

  // Count unique proposals per org
  const proposalsPerOrg = new Map<string, Set<string>>();
  orgData?.forEach((event: any) => {
    const orgId = event.organization_id;

    if (event.proposal_id) {
      if (!proposalsPerOrg.has(orgId)) {
        proposalsPerOrg.set(orgId, new Set());
      }
      proposalsPerOrg.get(orgId)!.add(event.proposal_id);
    }
  });

  // Update proposal counts
  orgUsageMap.forEach((usage, orgId) => {
    usage.proposal_count = proposalsPerOrg.get(orgId)?.size || 0;
  });

  const organizationUsage = Array.from(orgUsageMap.values()).sort((a, b) => b.total_cost - a.total_cost);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Platform token usage</h1>
        <p className="mt-1 text-sm text-slate-600">
          Monitor AI token consumption and costs across all freelancers and nonprofit organizations.
        </p>
      </div>

      {/* Overall Platform Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total tokens</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalTokens.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total cost</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">${totalCost.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Freelancer usage</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">${freelancerCost.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{freelancerTokens.toLocaleString()} tokens</p>
            </div>
            <div className="rounded-lg bg-purple-100 p-3">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Organization usage</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">${orgCost.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{orgTokens.toLocaleString()} tokens</p>
            </div>
            <div className="rounded-lg bg-orange-100 p-3">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </Card>
      </section>

      {/* Freelancer Usage */}
      <Card className="border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Freelancer usage</h2>
            <p className="mt-1 text-sm text-slate-600">
              Token consumption by each freelancer on the platform.
            </p>
          </div>
          <Badge variant="secondary" className="bg-purple-50 text-purple-700">
            {freelancerUsage.length} active freelancers
          </Badge>
        </div>

        {freelancerUsage.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="pb-3 font-semibold text-slate-900">Freelancer</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Tokens</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Cost</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Clients</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Proposals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {freelancerUsage.map((freelancer) => (
                  <tr key={freelancer.user_id} className="text-slate-700">
                    <td className="py-3 font-medium">{freelancer.user_email}</td>
                    <td className="py-3 text-right">{freelancer.total_tokens.toLocaleString()}</td>
                    <td className="py-3 text-right">${freelancer.total_cost.toFixed(2)}</td>
                    <td className="py-3 text-right">{freelancer.client_count}</td>
                    <td className="py-3 text-right">{freelancer.proposal_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-slate-500">
            No freelancer usage data yet.
          </p>
        )}
      </Card>

      {/* Organization Usage */}
      <Card className="border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Organization usage</h2>
            <p className="mt-1 text-sm text-slate-600">
              Token consumption by nonprofit organizations.
            </p>
          </div>
          <Badge variant="secondary" className="bg-orange-50 text-orange-700">
            {organizationUsage.length} active organizations
          </Badge>
        </div>

        {organizationUsage.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="pb-3 font-semibold text-slate-900">Organization</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Tokens</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Cost</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Proposals</th>
                  <th className="pb-3 text-right font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizationUsage.map((org) => (
                  <tr key={org.org_id} className="text-slate-700">
                    <td className="py-3 font-medium">{org.org_name}</td>
                    <td className="py-3 text-right">{org.total_tokens.toLocaleString()}</td>
                    <td className="py-3 text-right">${org.total_cost.toFixed(2)}</td>
                    <td className="py-3 text-right">{org.proposal_count}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/customers/${org.org_id}`}
                        className="text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-slate-500">
            No organization usage data yet.
          </p>
        )}
      </Card>

      {/* Usage Tips */}
      <Card className="border-slate-200 bg-blue-50 p-6">
        <h3 className="font-semibold text-blue-900">Usage insights</h3>
        <ul className="mt-3 space-y-2 text-sm text-blue-800">
          <li>• Freelancers are billed separately for AI usage on behalf of their clients</li>
          <li>• Organizations on paid plans have AI usage included up to their tier limits</li>
          <li>• Monitor high-usage accounts to identify potential billing adjustments</li>
          <li>• Token costs are calculated based on Claude's pricing: ~$3 per million input tokens</li>
        </ul>
      </Card>
    </div>
  );
}
