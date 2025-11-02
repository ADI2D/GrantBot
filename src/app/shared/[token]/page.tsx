"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PageLoader, PageError } from "@/components/ui/page-state";
import { Lock, MessageSquare, Send } from "lucide-react";

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

type Comment = {
  id: string;
  sectionId: string | null;
  commenterName: string;
  commenterEmail: string | null;
  commentText: string;
  createdAt: string;
};

export default function SharedProposalPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<SharedProposal | null>(null);
  const [sections, setSections] = useState<ProposalSection[]>([]);
  const [activeSection, setActiveSection] = useState<ProposalSection | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commenterName, setCommenterName] = useState("");
  const [commenterEmail, setCommenterEmail] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSharedProposal() {
      try {
        // Fetch proposal and sections via secure API route
        const response = await fetch(`/api/shared/${token}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load shared proposal");
        }

        const data = await response.json();

        setProposal({
          id: data.proposal.id,
          ownerName: data.proposal.ownerName,
          status: data.proposal.status,
          progress: data.proposal.progress,
          dueDate: data.proposal.dueDate,
          confidence: data.proposal.confidence,
          opportunityName: data.proposal.opportunityName,
        });

        const loadedSections = data.sections.map((s: any) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          tokenCount: s.tokenCount,
        }));

        setSections(loadedSections);
        setActiveSection(loadedSections[0] ?? null);

        // Load comments
        await loadComments(data.proposal.id);

        setLoading(false);
      } catch (err) {
        console.error("[shared] Error loading proposal:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    }

    loadSharedProposal();
  }, [token]);

  async function loadComments(proposalId: string) {
    try {
      const response = await fetch(`/api/proposals/${proposalId}/comments`);
      if (response.ok) {
        const data = await response.json() as { comments: Comment[] };
        setComments(data.comments.map((c) => ({
          id: c.id,
          sectionId: c.sectionId,
          commenterName: c.commenterName,
          commenterEmail: c.commenterEmail,
          commentText: c.commentText,
          createdAt: c.createdAt,
        })));
      }
    } catch (err) {
      console.error("[shared] Error loading comments:", err);
    }
  }

  async function handleSubmitComment() {
    if (!proposal || !commenterName.trim() || !commentText.trim()) {
      alert("Please provide your name and comment");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: activeSection?.id ?? null,
          commenterName: commenterName.trim(),
          commenterEmail: commenterEmail.trim() || null,
          commentText: commentText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit comment");
      }

      // Reload comments
      await loadComments(proposal.id);

      // Clear form
      setCommentText("");
      setShowCommentForm(false);
      alert("Comment submitted successfully!");
    } catch (err) {
      console.error("[shared] Error submitting comment:", err);
      alert("Failed to submit comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader label="Loading shared proposal" />;
  if (error) return <PageError message={error} />;
  if (!proposal) return <PageError message="Proposal not found" />;

  const sectionComments = comments.filter((c) => c.sectionId === activeSection?.id);
  const generalComments = comments.filter((c) => c.sectionId === null);

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

          <div className="space-y-6">
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
            </Card>

            {/* Comments Section */}
            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Feedback & Comments ({sectionComments.length})
                  </h3>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowCommentForm(!showCommentForm)}
                >
                  {showCommentForm ? "Cancel" : "Add Comment"}
                </Button>
              </div>

              {showCommentForm && (
                <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-slate-700">Your Name *</label>
                      <Input
                        value={commenterName}
                        onChange={(e) => setCommenterName(e.target.value)}
                        placeholder="Jane Doe"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Email (optional)</label>
                      <Input
                        type="email"
                        value={commenterEmail}
                        onChange={(e) => setCommenterEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Comment *</label>
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Share your feedback..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={submitting}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "Submitting..." : "Submit Comment"}
                  </Button>
                </div>
              )}

              {sectionComments.length === 0 && !showCommentForm && (
                <p className="text-sm text-slate-500">
                  No comments yet. Be the first to share feedback!
                </p>
              )}

              {sectionComments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{comment.commenterName}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(comment.createdAt).toLocaleDateString()} at{" "}
                        {new Date(comment.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{comment.commentText}</p>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
