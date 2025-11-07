"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, Sparkles, Bold, Italic, List, CheckSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Textarea } from "@/components/ui/textarea";

const noteTemplates = [
  {
    label: "Meeting recap",
    template: "**Meeting Date:** [Date]\n**Attendees:** [Names]\n**Key Decisions:**\n- \n\n**Action Items:**\n- \n\n**Next Steps:**\n- ",
  },
  {
    label: "Client preference",
    template: "**Preference:** \n\n**Context:** \n\n**Application:** How to apply this to future proposals\n- ",
  },
  {
    label: "Proposal strategy",
    template: "**Opportunity:** \n\n**Approach:**\n- \n\n**Key Messaging:**\n- \n\n**Risks to Address:**\n- ",
  },
  {
    label: "Follow-up reminder",
    template: "**Follow up on:** \n\n**Due date:** \n\n**Details:** ",
  },
];

export default function AddNotePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.clientId as string;

  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTemplateSelect = (template: string) => {
    setNoteContent(template);
  };

  const insertFormatting = (before: string, after: string = "", placeholder: string = "text") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = noteContent.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newText =
      noteContent.substring(0, start) +
      before +
      textToInsert +
      after +
      noteContent.substring(end);

    setNoteContent(newText);

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!noteContent.trim()) {
      return;
    }

    setSaving(true);

    try {
      // Save note to database
      const response = await fetch("/api/freelancer/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, content: noteContent }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save note");
      }

      // Navigate back to client detail page
      router.push(`/freelancer/clients/${clientId}`);
    } catch (error) {
      console.error("Save failed:", error);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Breadcrumb
          items={[
            { label: "Clients", href: "/freelancer/clients" },
            { label: "Client", href: `/freelancer/clients/${clientId}` },
            { label: "Add Note", current: true },
          ]}
        />
        <h1 className="text-3xl font-semibold text-slate-900">Add working note</h1>
        <p className="mt-2 text-sm text-slate-600">
          Capture client preferences, meeting notes, and strategy insights.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Note Form */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="note-content" className="block text-sm font-semibold text-slate-900">
                  Note content
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Use quick formatting buttons or templates below.
                </p>

                {/* Formatting Toolbar */}
                <div className="mt-2 flex gap-1 rounded-t-lg border border-b-0 border-slate-300 bg-slate-50 p-2">
                  <button
                    type="button"
                    onClick={() => insertFormatting("**", "**", "bold text")}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900"
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                    Bold
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("_", "_", "italic text")}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900"
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                    Italic
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("- ", "", "list item")}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900"
                    title="Bullet list"
                  >
                    <List className="h-3.5 w-3.5" />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("- [ ] ", "", "task")}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900"
                    title="Checklist"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    Task
                  </button>
                </div>

                <Textarea
                  ref={textareaRef}
                  id="note-content"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Start typing your note here..."
                  rows={16}
                  className="rounded-t-none font-mono text-sm"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push(`/freelancer/clients/${clientId}`)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!noteContent.trim() || saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save note
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Templates Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Quick templates
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Start with a structured format
            </p>
          </div>

          <div className="space-y-2">
            {noteTemplates.map((template, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleTemplateSelect(template.template)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm transition hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="font-medium text-slate-900">{template.label}</p>
              </button>
            ))}
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-blue-50 p-4 text-sm">
            <p className="font-semibold text-blue-900">Quick tips</p>
            <ul className="mt-2 space-y-1 text-xs text-blue-800">
              <li>• Click formatting buttons to add structure</li>
              <li>• Select text first to wrap it with formatting</li>
              <li>• Use templates for common note types</li>
              <li>• Add dates for time-sensitive items</li>
              <li>• Tag action items with checkboxes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
