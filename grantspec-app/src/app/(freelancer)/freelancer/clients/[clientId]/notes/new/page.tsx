"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const handleTemplateSelect = (template: string) => {
    setNoteContent(template);
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
      alert(error instanceof Error ? error.message : "Failed to save note");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/freelancer/clients/${clientId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to client
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Add working note</h1>
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
                  Use templates or write freeform. Markdown formatting supported.
                </p>
                <Textarea
                  id="note-content"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Start typing your note here..."
                  rows={16}
                  className="mt-2 font-mono text-sm"
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
            <p className="font-semibold text-blue-900">Pro tips</p>
            <ul className="mt-2 space-y-1 text-xs text-blue-800">
              <li>• Use ** for bold text</li>
              <li>• Use - for bullet lists</li>
              <li>• Add dates for time-sensitive items</li>
              <li>• Tag action items clearly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
