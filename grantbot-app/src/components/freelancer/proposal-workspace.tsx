"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Save, CheckCircle2 } from "lucide-react";
import type { FreelancerProposalDetail } from "@/lib/freelancer-clients";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [draft, setDraft] = useState(proposal.draft);
  const [checklist, setChecklist] = useState(() => proposal.checklist.map((item) => ({ ...item })));
  const [status, setStatus] = useState(proposal.status);
  const [lastEditedAt, setLastEditedAt] = useState<string | null>(proposal.lastEditedAt ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiBusyPrompt, setAiBusyPrompt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(proposal.sections[0]?.id ?? null);

  const completedCount = useMemo(() => checklist.filter((item) => item.completed).length, [checklist]);
  const isReadOnly = ["submitted", "awarded"].includes(status.toLowerCase());

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
      setFeedback({ type: "success", message: "Proposal submitted for review" });
    } catch (error) {
      console.error("[freelancer][proposal] submit error", error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to submit proposal",
      });
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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600">{proposal.clientName}</p>
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
            <Button variant="secondary" size="sm" disabled={isSaving || isReadOnly} onClick={handleSaveDraft}>
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
              disabled={isReadOnly || isSubmitting}
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
          <div>
            <p className="text-sm font-semibold text-slate-900">Checklist</p>
            <p className="text-xs text-slate-500">
              {completedCount} of {checklist.length} complete
            </p>
          </div>
          <div className="space-y-3">
            {checklist.map((item) => (
              <label
                key={item.id}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm transition",
                  item.completed ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleChecklistToggle(item.id)}
                  className="mt-1"
                  disabled={isReadOnly}
                />
                <span className={cn("flex-1", item.completed && "text-blue-700 line-through")}>{item.label}</span>
              </label>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-blue-600"
            onClick={() => setChecklist((prev) => prev.map((item) => ({ ...item, completed: true })))}
            disabled={isReadOnly}
          >
            Mark all complete
          </Button>
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
                    selectedSection === section.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"
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
          <div className={cn("min-h-[480px] rounded-[var(--radius-soft)] border border-slate-200 bg-white", isReadOnly && "pointer-events-none opacity-90")}> 
            {editor ? (
              <EditorContent editor={editor} className="prose max-w-none px-4 py-3 text-sm" />
            ) : (
              <div className="flex min-h-[480px] items-center justify-center text-sm text-slate-500">Loading editor…</div>
            )}
          </div>
          {isReadOnly ? (
            <p className="text-xs text-slate-500">This proposal has been submitted and is read-only.</p>
          ) : null}
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
                  <span className="flex items-center gap-2">
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
    </div>
  );
}
