import { notFound } from "next/navigation";
import { SharedProposalView } from "@/components/freelancer/shared-proposal-view";

export const dynamic = "force-dynamic";

async function getSharedProposal(token: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/proposals/shared/${token}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[shared-proposal] Fetch error:", error);
    return null;
  }
}

export default async function SharedProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSharedProposal(token);

  if (!data || !data.proposal || !data.share) {
    notFound();
  }

  return (
    <SharedProposalView
      proposal={data.proposal}
      share={data.share}
      comments={data.comments || []}
      shareToken={token}
    />
  );
}
