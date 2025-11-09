import { notFound } from "next/navigation";
import { getFreelancerProposal } from "@/lib/freelancer-clients";
import { FreelancerProposalWorkspace } from "@/components/freelancer/proposal-workspace";

export const dynamic = "force-dynamic";

export default async function FreelancerProposalPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  const decoded = decodeURIComponent(proposalId);
  const proposal = await getFreelancerProposal(decoded);

  if (!proposal) {
    notFound();
  }

  return <FreelancerProposalWorkspace proposal={proposal} />;
}

export async function generateStaticParams() {
  return [];
}
