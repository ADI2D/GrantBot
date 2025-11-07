"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Save, CheckCircle2, Plus, Trash2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import type { FreelancerProposalDetail } from "@/lib/freelancer-clients";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ShareProposalDialog, type ShareFormData } from "@/components/freelancer/share-proposal-dialog";
import { ProposalCommentsPanel } from "@/components/freelancer/proposal-comments-panel";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { RichTextToolbar } from "@/components/freelancer/rich-text-toolbar";
import { FontSize } from "@/lib/editor/font-size-extension";

export function FreelancerProposalWorkspace({ proposal }: { proposal: FreelancerProposalDetail }) {
  const router = useRouter();
  const [draft, setDraft] = useState(proposal.draft);
  const [checklist, setChecklist] = useState(() => proposal.checklist.map((item) => ({ ...item })));
  const [status, setStatus] = useState(proposal.status);
  const [lastEditedAt, setLastEditedAt] = useState<string | null>(proposal.lastEditedAt ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnsubmitting, setIsUnsubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiBusyPrompt, setAiBusyPrompt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(proposal.sections[0]?.id ?? null);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [showChecklistInput, setShowChecklistInput] = useState(false);
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const completedCount = useMemo(() => checklist.filter((item) => item.completed).length, [checklist]);
  const isReadOnly = ["awarded"].includes(status.toLowerCase());
  const isSubmitted = status.toLowerCase() === "in review";

  const formatTimestamp = (value: string | null) => (value ? new Date(value).toLocaleString() : null);

  useEffect(() => {
    if (!feedback || feedback.type !== "success") {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const toInitialHtml = (content: string) => {
    if (!content) return "<p></p>";
    const trimmed = content.trim();
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);
    if (looksLikeHtml) {
      return content;
    }
    return `<p>${content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br />")}</p>`;
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: toInitialHtml(proposal.draft),
    editable: !isReadOnly,
    onUpdate: ({ editor }) => {
      setDraft(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && isReadOnly && editor.isEditable) {
      editor.setEditable(false);
    }
  }, [editor, isReadOnly]);

  useEffect(() => {
    if (editor && proposal.draft) {
      editor.commands.setContent(toInitialHtml(proposal.draft), false);
    }
  }, [editor, proposal.draft]);

  const handleChecklistToggle = (id: string) => {
    if (isReadOnly) return;
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  const handleSubmitProposal = async () => {
    if (isReadOnly) return;
    // Show share dialog instead of immediately submitting
    setShowShareDialog(true);
  };

  const handleShareProposal = async (shareData: ShareFormData) => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      // First, share the proposal
      const shareResponse = await fetch(`/api/freelancer/proposals/${proposal.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shareData),
      });

      if (!shareResponse.ok) {
        const sharePayload = await shareResponse.json().catch(() => null);
        throw new Error(sharePayload?.error ?? "Failed to share proposal");
      }

      // Then submit for review
      const submitResponse = await fetch(`/api/freelancer/proposals/${proposal.id}/submit`, {
        method: "POST",
      });
      const submitPayload = await submitResponse.json().catch(() => null);
      if (!submitResponse.ok) {
        throw new Error(submitPayload?.error ?? "Failed to submit proposal");
      }

      if (typeof submitPayload?.status === "string") {
        setStatus(submitPayload.status);
      }
      if (submitPayload?.lastEditedAt) {
        setLastEditedAt(submitPayload.lastEditedAt);
      }

      setShowShareDialog(false);
      setFeedback({ type: "success", message: "Proposal submitted and shared for review" });
    } catch (error) {
      console.error("[freelancer][proposal] share/submit error", error);
      throw error; // Let dialog handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipShare = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/freelancer/proposals/${proposal.id}/submit`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to submit proposal");
      }

      if (typeof payload?.status === "string") {
        setStatus(payload.status);
      }
      if (payload?.lastEditedAt) {
        setLastEditedAt(payload.lastEditedAt);
      }

      setShowShareDialog(false);
      setFeedback({ type: "success", message: "Proposal submitted for review" });
    } catch (error) {
      console.error("[freelancer][proposal] submit error", error);
      throw error; // Let dialog handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (isReadOnly) return;
    const html = editor?.getHTML() ?? draft;
    setDraft(html);
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/freelancer/proposals/${proposal.id}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftHtml: html,
          checklist,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save draft");
      }

      const updatedAt = payload?.lastEditedAt ?? new Date().toISOString();
      setLastEditedAt(updatedAt);
      setFeedback({ type: "success", message: "Draft saved" });
    } catch (error) {
      console.error("[freelancer][proposal] save draft error", error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save draft",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiPrompt = async (prompt: string) => {
    if (!editor || isReadOnly) return;
    setAiBusyPrompt(prompt);
    setFeedback(null);

    try {
      const response = await fetch(`/api/freelancer/proposals/${proposal.id}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          draftHtml: editor.getHTML(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to generate suggestion");
      }

      const suggestion = typeof payload?.suggestion === "string" ? payload.suggestion : "";
      if (suggestion) {
        editor.chain().focus().insertContent(`\n\n${suggestion}`).run();
        setDraft(editor.getHTML());
        setFeedback({ type: "success", message: "AI suggestion inserted" });
      }
    } catch (error) {
      console.error("[freelancer][proposal] AI prompt error", error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "AI suggestion failed",
      });
    } finally {
      setAiBusyPrompt(null);
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;

    const newItem = {
      id: `chk-${Date.now()}`,
      label: newChecklistItem.trim(),
      completed: false,
    };

    setChecklist((prev) => [...prev, newItem]);
    setNewChecklistItem("");
    setShowChecklistInput(false);
  };

  const handleDeleteChecklistItem = (id: string) => {
    if (isReadOnly) return;
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUnsubmit = async () => {
    if (!isSubmitted || isReadOnly) return;
    setIsUnsubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/freelancer/proposals/${proposal.id}/unsubmit`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to unsubmit proposal");
      }

      if (typeof payload?.status === "string") {
        setStatus(payload.status);
      }
      setFeedback({ type: "success", message: "Proposal moved back to drafting" });
    } catch (error) {
      console.error("[freelancer][proposal] unsubmit error", error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to unsubmit proposal",
      });
    } finally {
      setIsUnsubmitting(false);
    }
  };

  const handleDeleteProposal = async () => {
    if (isDeleting) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this proposal? This action cannot be undone."
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/freelancer/proposals/${proposal.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to delete proposal");
      }

      // Navigate back to client page
      router.push(`/freelancer/clients/${proposal.clientId}`);
    } catch (error) {
      console.error("[freelancer][proposal] delete error", error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete proposal",
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <Breadcrumb
            items={[
              { label: "Clients", href: "/freelancer/clients" },
              { label: proposal.clientName, href: `/freelancer/clients/${proposal.clientId}` },
              { label: proposal.title, current: true },
            ]}
          />
          <h1 className="text-3xl font-semibold text-slate-900">{proposal.title}</h1>
          <p className="text-sm text-slate-500">
            {status} · {proposal.dueDate ? `Due ${new Date(proposal.dueDate).toLocaleDateString()}` : "No due date"}
          </p>
          {formatTimestamp(lastEditedAt) ? (
            <p className="text-xs text-slate-400">Last updated {formatTimestamp(lastEditedAt)}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {!isSubmitted && !isReadOnly && (
              <>
                <Button variant="secondary" size="sm" disabled={isSaving} onClick={handleSaveDraft}>
                  {isSaving ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save draft
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleSubmitProposal}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Submitting…
                    </>
                  ) : (
                    "Submit for review"
                  )}
                </Button>
              </>
            )}
            {isSubmitted && !isReadOnly && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUnsubmit}
                disabled={isUnsubmitting}
              >
                {isUnsubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                    Moving back...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Move back to drafting
                  </>
                )}
              </Button>
            )}
            {!isReadOnly && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDeleteProposal}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isDeleting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            )}
          </div>
          {feedback ? (
            <p
              className={cn(
                "text-xs",
                feedback.type === "error" ? "text-red-600" : "text-slate-500",
              )}
            >
              {feedback.message}
              {feedback.type === "success" && lastEditedAt ? ` · ${formatTimestamp(lastEditedAt)}` : ""}
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px,minmax(0,1fr),260px]">
        {/* Checklist */}
        <Card className="space-y-4 border-slate-200 p-5">
          <button
            onClick={() => setIsChecklistExpanded(!isChecklistExpanded)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">Checklist</p>
              <p className="text-xs text-slate-500">
                {completedCount} of {checklist.length} complete
              </p>
            </div>
            {isChecklistExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition" />
            )}
          </button>

          {!isChecklistExpanded && checklist.length > 0 && (
            <div className="space-y-2">
              {checklist.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-2 py-1.5 text-xs transition",
                    item.completed ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleChecklistToggle(item.id)}
                    className="mt-0.5"
                    disabled={isReadOnly}
                  />
                  <span className={cn("flex-1 cursor-pointer", item.completed && "text-blue-700 line-through")}
                    onClick={() => !isReadOnly && handleChecklistToggle(item.id)}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
              {checklist.length > 2 && (
                <p className="text-xs text-slate-400 text-center pt-1">
                  +{checklist.length - 2} more items
                </p>
              )}
            </div>
          )}

          {isChecklistExpanded && (
            <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm transition",
                  item.completed ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white",
                )}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleChecklistToggle(item.id)}
                  className="mt-1"
                  disabled={isReadOnly}
                />
                <span className={cn("flex-1 cursor-pointer", item.completed && "text-blue-700 line-through")}
                  onClick={() => !isReadOnly && handleChecklistToggle(item.id)}
                >
                  {item.label}
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    className="text-slate-400 hover:text-red-600 transition"
                    aria-label="Delete item"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {checklist.length === 0 && !showChecklistInput && (
              <p className="text-xs text-slate-500 text-center py-4">
                No checklist items yet. Add items to track your progress.
              </p>
            )}
          </div>
          )}

          {showChecklistInput ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  } else if (e.key === "Escape") {
                    setShowChecklistInput(false);
                    setNewChecklistItem("");
                  }
                }}
                placeholder="Enter checklist item..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistItem.trim()}
                  className="flex-1"
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowChecklistInput(false);
                    setNewChecklistItem("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-blue-600"
                  onClick={() => setShowChecklistInput(true)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add item
                </Button>
              )}
              {checklist.length > 0 && !isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-slate-600"
                  onClick={() => setChecklist((prev) => prev.map((item) => ({ ...item, completed: true })))}
                >
                  Mark all complete
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Editor */}
        <Card className="space-y-4 border-slate-200 p-5">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            Draft content
          </div>
          <RichTextToolbar editor={editor} />
          {proposal.sections.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {proposal.sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSection(section.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                    selectedSection === section.id
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600",
                  )}
                >
                  {section.title}
                </button>
              ))}
            </div>
          ) : null}
          {selectedSection ? (
            <p className="text-xs text-slate-500">
              {proposal.sections.find((section) => section.id === selectedSection)?.placeholder}
            </p>
          ) : null}
          <div
            className={cn(
              "min-h-[480px] rounded-[var(--radius-soft)] border border-slate-200 bg-white",
              isReadOnly && "pointer-events-none opacity-90",
            )}
          >
            {editor ? (
              <EditorContent editor={editor} className="prose prose-slate max-w-none px-4 py-3 text-sm" />
            ) : (
              <div className="flex min-h-[480px] items-center justify-center text-sm text-slate-500">
                Loading editor…
              </div>
            )}
          </div>
          {isReadOnly ? <p className="text-xs text-slate-500">This proposal has been submitted and is read-only.</p> : null}
        </Card>

        {/* AI assistant */}
        <Card className="space-y-4 border-slate-200 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-blue-600" />
            AI Toolkit
          </div>
          <p className="text-xs text-slate-500">
            Use prompts to brainstorm copy or tighten your language. Outputs will be appended to the draft.
          </p>
          <div className="space-y-2">
            {proposal.aiPrompts.map((prompt, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleAiPrompt(prompt)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                disabled={isReadOnly || aiBusyPrompt === prompt}
              >
                {aiBusyPrompt === prompt ? (
                  <span className="flex items-center gap-2 text-blue-600">
                    <div className="h-3 w-3 animate-spin rounded-full border border-blue-500 border-t-transparent" />
                    Generating…
                  </span>
                ) : (
                  prompt
                )}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="w-full text-xs uppercase" disabled={isReadOnly}>
            Open AI composer
          </Button>
        </Card>
      </div>

      {/* Comments Panel */}
      {isSubmitted && (
        <div className="mt-6">
          <ProposalCommentsPanel proposalId={proposal.id} />
        </div>
      )}

      {/* Share Dialog */}
      <ShareProposalDialog
        proposalId={proposal.id}
        proposalTitle={proposal.title}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        onShare={handleShareProposal}
        onSkip={handleSkipShare}
      />
    </div>
  );
}
