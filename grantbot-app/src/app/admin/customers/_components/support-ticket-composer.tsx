"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

type SupportTicketComposerProps = {
  organizationId: string;
};

export function SupportTicketComposer({ organizationId }: SupportTicketComposerProps) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("normal");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      try {
        const response = await fetch("/api/admin/support/tickets", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            subject,
            priority,
            message,
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to create ticket");
        }

        setSubject("");
        setMessage("");
        setPriority("normal");
        setSuccess("Ticket created");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create ticket");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">Log internal ticket</h3>
      <p className="text-xs text-slate-500">Creates a support ticket tied to this organization for shared follow-up.</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr),150px]">
        <div>
          <label className="text-xs uppercase text-slate-500">Subject</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            placeholder="Describe the issue..."
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            disabled={isPending}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Priority</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            disabled={isPending}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs uppercase text-slate-500">Initial note</label>
        <textarea
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
          placeholder="Add internal context for the team..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isPending || subject.trim() === ""}
        >
          {isPending ? "Logging…" : "Create ticket"}
        </button>
        {success ? <span className="text-xs text-emerald-600">{success}</span> : null}
        {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      </div>
    </form>
  );
}
