"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Sparkles, RefreshCw, Share2, ShieldAlert, Download, FileText, MessageSquare, Archive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageLoader, PageError, EmptyState } from "@/components/ui/page-state";
import { useWorkspaceData } from "@/hooks/use-api";

type Comment = {
  id: string;
  sectionId: string | null;
  commenterName: string;
  commenterEmail: string | null;
  commentText: string;
  createdAt: string;
};

export default function WorkspacePage() {
  const params = useSearchParams();
  const initialProposalId = params.get("proposalId") ?? undefined;
  const impersonated = params.get("impersonated") === "1";
  const impersonatedOrgId = params.get("orgId");
  const { data, isLoading, error } = useWorkspaceData(initialProposalId);
  const queryClient = useQueryClient();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [complianceState, setComplianceState] = useState(data?.compliance ?? []);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  const { proposal, sections } = data ?? {};

  useEffect(() => {
    if (data?.compliance) {
      setComplianceState(data.compliance);
    }
  }, [data?.compliance]);

  // Load comments when proposal changes
  useEffect(() => {
    async function loadComments() {
      if (!proposal?.id) return;

      try {
        const response = await fetch(`/api/proposals/${proposal.id}/comments`);
        if (response.ok) {
          const data = await response.json() as { comments: Comment[] };
          setComments(data.comments);
        }
      } catch (err) {
        console.error("[workspace] Error loading comments:", err);
      }
    }

    loadComments();
  }, [proposal?.id]);

  const activeSection = useMemo(() => {
    if (!sections?.length) return undefined;
    return sections.find((section) => section.id === activeSectionId) ?? sections[0];
  }, [sections, activeSectionId]);

  useEffect(() => {
    if (sections?.length && !activeSectionId) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  useEffect(() => {
    if (activeSection) {
      setDraftContent(activeSection.content ?? "");
    }
  }, [activeSection]);

  const sectionMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/proposals/${proposal?.id}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: activeSection?.id, content }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"], exact: false });
    },
  });

  const complianceMutation = useMutation({
    mutationFn: async (payload: typeof complianceState) => {
      const response = await fetch(`/api/proposals/${proposal?.id}/compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compliance: payload }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace"], exact: false }),
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/proposals/${proposal?.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: activeSection?.id }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json() as Promise<{ content: string }>;
    },
    onSuccess: (result) => {
      setDraftContent(result.content);
      queryClient.invalidateQueries({ queryKey: ["workspace"], exact: false });
    },
  });

  // Autosave after 2 seconds of inactivity (disabled for archived proposals)
  useEffect(() => {
    if (!activeSection || draftContent === activeSection.content || proposal?.archived) return;

    const timeoutId = setTimeout(() => {
      sectionMutation.mutate(draftContent);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [draftContent, activeSection, sectionMutation, proposal?.archived]);

  if (isLoading) return <PageLoader label="Loading workspace" />;
  if (error || !data || !sections?.length) {
    return <PageError message={error?.message || "Unable to load workspace"} />;
  }

  const handleSaveSection = () => {
    sectionMutation.mutate(draftContent);
  };

  const handleRegenerate = () => {
    regenerateMutation.mutate();
  };

  const handleComplianceStatus = (sectionIndex: number, itemIndex: number, status: string) => {
    const updated = complianceState.map((section, sIdx) => {
      if (sIdx !== sectionIndex) return section;
      return {
        ...section,
        items: section.items.map((item, iIdx) =>
          iIdx === itemIndex ? { ...item, status } : item,
        ),
      };
    });
    setComplianceState(updated);
    complianceMutation.mutate(updated);
  };

  const handleExport = async (format: "pdf" | "docx") => {
    if (!proposal?.id) return;

    try {
      const response = await fetch(`/api/proposals/${proposal.id}/export?format=${format}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `proposal-${proposal.id}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export ${format.toUpperCase()}`);
    }
  };

  const handleShareDraft = async () => {
    if (!proposal?.id) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      "⚠️ SHARING CONFIRMATION\n\n" +
      "Anyone with this link can:\n" +
      "• View the full proposal draft\n" +
      "• Leave comments and feedback\n" +
      "• Access it without logging in\n\n" +
      "The link will automatically expire after 7 days.\n" +
      "You can revoke access early at any time.\n\n" +
      "Do you want to continue?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setShareMessage("Generating share link...");

      const response = await fetch(`/api/proposals/${proposal.id}/share`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate share link");
      }

      const { shareUrl } = await response.json() as { shareUrl: string };

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("Link copied to clipboard!");

      // Clear message after 3 seconds
      setTimeout(() => setShareMessage(null), 3000);
    } catch (error) {
      console.error("Share error:", error);
      setShareMessage("Failed to generate share link");
      setTimeout(() => setShareMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-8">
      {proposal?.archived && (
        <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-700">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-400 bg-white text-slate-600">
              <Archive className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">This proposal is archived</p>
              <p className="text-xs text-slate-600/80">
                This proposal is in read-only mode. To edit this proposal, unarchive it from the Proposals page.
              </p>
            </div>
          </div>
        </div>
      )}
      {impersonated && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300 bg-white text-amber-600">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Admin impersonation active</p>
              <p className="text-xs text-amber-600/80">
                You are viewing the workspace as organization {impersonatedOrgId ?? "unknown"}. All actions are
                attributed to your admin account and recorded in the audit log.
              </p>
            </div>
          </div>
        </div>
      )}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">AI workspace</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Generate, edit, and route reviews seamlessly.
          </h1>
          <p className="text-sm text-slate-600">
            Retrieval-augmented prompts use your profile, opportunity metadata, and past wins.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {proposal && (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => handleExport("pdf")}
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => handleExport("docx")}
              >
                <FileText className="h-4 w-4" />
                Export Word
              </Button>
            </>
          )}
          <Button variant="secondary" className="gap-2" onClick={handleShareDraft} disabled={proposal?.archived}>
            <Share2 className="h-4 w-4" />
            {shareMessage ?? "Share draft link"}
          </Button>
          <Button className="gap-2" disabled={proposal?.archived}>
            <Sparkles className="h-4 w-4" />
            Ask GrantBot
          </Button>
        </div>
      </header>

      {!proposal && (
        <EmptyState
          title="No proposals in workspace"
          description="Create a draft from the Opportunities tab to start collaborating."
        />
      )}

      {proposal && (
        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          <Card className="space-y-4 p-5">
            <div>
              <p className="text-xs uppercase text-slate-500">Sections</p>
              <div className="mt-4 space-y-3">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    className={`w-full rounded-2xl border px-4 py-3 text-left ${
                      section.id === activeSection?.id
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-100 bg-white"
                    }`}
                    onClick={() => setActiveSectionId(section.id)}
                  >
                    <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                    <p className="text-xs text-slate-500">{section.tokenCount} tokens</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Compliance checklist</p>
              {complianceState.length === 0 && (
                <p className="mt-2 text-slate-500">Complete onboarding to unlock compliance guidance.</p>
              )}
              <div className="mt-3 space-y-3">
                {complianceState.map((section, sectionIndex) => (
                  <div key={section.section} className="rounded-xl border border-slate-100 bg-white p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {section.section}
                    </p>
                    <div className="mt-2 space-y-2">
                      {section.items.map((item, itemIndex) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-slate-700">{item.label}</span>
                          <div className="flex gap-2">
                            {[
                              { label: "Ready", value: "complete" },
                              { label: "Flag", value: "flag" },
                              { label: "Missing", value: "missing" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  item.status === option.value
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              onClick={() =>
                                handleComplianceStatus(sectionIndex, itemIndex, option.value)
                              }
                              disabled={complianceMutation.isPending || proposal?.archived}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-600" />
                <p className="font-semibold text-slate-800">
                  Reviewer Feedback ({comments.filter((c) => c.sectionId === activeSection?.id).length})
                </p>
              </div>
              {comments.filter((c) => c.sectionId === activeSection?.id).length === 0 && (
                <p className="mt-2 text-slate-500">No comments on this section yet.</p>
              )}
              <div className="mt-3 space-y-3">
                {comments
                  .filter((c) => c.sectionId === activeSection?.id)
                  .map((comment) => (
                    <div key={comment.id} className="rounded-xl border border-slate-100 bg-white p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{comment.commenterName}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-700">{comment.commentText}</p>
                    </div>
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
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="gap-2" onClick={handleRegenerate} disabled={proposal.archived}>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
                <Badge tone="info">Confidence {(proposal.confidence ?? 0).toFixed(2)}</Badge>
              </div>
            </div>
            <Textarea
              rows={18}
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              disabled={proposal.archived}
              className={proposal.archived ? "opacity-60 cursor-not-allowed" : ""}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <p>{proposal.archived ? "Read-only mode" : "Edits save back to Supabase"}</p>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={handleSaveSection} disabled={sectionMutation.isPending || proposal.archived}>
                  Save section
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
