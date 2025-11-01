"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader, PageError } from "@/components/ui/page-state";
import { getServiceSupabaseClient } from "@/lib/supabase-client";
import { Lock } from "lucide-react";

type ProposalSection = {
  id: string;
  title: string;
  content: string | null;
  tokenCount: number;
};

type SharedProposal = {
  id: string;
  ownerName: string | null;
  status: string;
  progress: number;
  dueDate: string | null;
  confidence: number | null;
  opportunityName: string | null;
};

export default function SharedProposalPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<SharedProposal | null>(null);
  const [sections, setSections] = useState<ProposalSection[]>([]);
  const [activeSection, setActiveSection] = useState<ProposalSection | null>(null);

  useEffect(() => {
    async function loadSharedProposal() {
      try {
        const supabase = getServiceSupabaseClient();

        // Fetch proposal by share token (uses public RLS policy)
        const { data: proposalData, error: proposalError } = await supabase
          .from("proposals")
          .select("id, owner_name, status, progress, due_date, confidence")
          .eq("share_token", token)
          .maybeSingle();

        if (proposalError) {
          throw new Error("Unable to load shared proposal");
        }

        if (!proposalData) {
          throw new Error("Invalid or expired share link");
        }

        // Fetch opportunity name
        const { data: oppData } = await supabase
          .from("opportunities")
          .select("name")
          .eq("id", proposalData.id)
          .maybeSingle();

        setProposal({
          id: proposalData.id,
          ownerName: proposalData.owner_name,
          status: proposalData.status,
          progress: proposalData.progress,
          dueDate: proposalData.due_date,
          confidence: proposalData.confidence,
          opportunityName: oppData?.name ?? "Unknown opportunity",
        });

        // Fetch sections (uses public RLS policy)
        const { data: sectionsData, error: sectionsError } = await supabase
          .from("proposal_sections")
          .select("id, title, content, token_count")
          .eq("proposal_id", proposalData.id)
          .order("created_at", { ascending: true });

        if (sectionsError) {
          throw new Error("Unable to load proposal sections");
        }

        const loadedSections = (sectionsData ?? []).map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          tokenCount: s.token_count ?? 0,
        }));

        setSections(loadedSections);
        setActiveSection(loadedSections[0] ?? null);
        setLoading(false);
      } catch (err) {
        console.error("[shared] Error loading proposal:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    }

    loadSharedProposal();
  }, [token]);

  if (loading) return <PageLoader label="Loading shared proposal" />;
  if (error) return <PageError message={error} />;
  if (!proposal) return <PageError message="Proposal not found" />;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
            <Lock className="h-4 w-4" />
            Read-only shared draft
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {proposal.opportunityName}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Shared by {proposal.ownerName ?? "GrantBot user"}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Badge tone="info">{proposal.status.replaceAll("_", " ")}</Badge>
            <Badge tone="neutral">{proposal.progress}% complete</Badge>
            {proposal.confidence !== null && (
              <Badge tone="neutral">Confidence {proposal.confidence.toFixed(2)}</Badge>
            )}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          <Card className="space-y-4 p-5">
            <div>
              <p className="text-xs uppercase text-slate-500">Sections</p>
              <div className="mt-4 space-y-3">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                      section.id === activeSection?.id
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-100 bg-white hover:border-blue-100"
                    }`}
                    onClick={() => setActiveSection(section)}
                  >
                    <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                    <p className="text-xs text-slate-500">{section.tokenCount} tokens</p>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {activeSection?.title ?? "Select a section"}
                </p>
                <p className="text-xs text-slate-500">{proposal.opportunityName}</p>
              </div>
            </div>
            <div className="min-h-[400px] whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              {activeSection?.content ?? "No content"}
            </div>
            <p className="text-xs text-slate-500">
              This is a read-only view. Contact the proposal owner to request edit access.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
