"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
];

type SupportTicketCardProps = {
  ticket: {
    id: number;
    subject: string;
    status: string;
    priority: string;
    openedBy: string | null;
    createdAt: string | null;
    latestEvent: {
      eventType: string;
      message: string;
      createdAt: string | null;
      metadata: Record<string, unknown> | null;
    } | null;
  };
};

export function SupportTicketCard({ ticket }: SupportTicketCardProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState(ticket.status);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = () => {
    if (selectedStatus === ticket.status) {
      setError("Choose a different status before updating.");
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/admin/support/tickets", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId: ticket.id,
            status: selectedStatus,
            message: note || `Status changed to ${selectedStatus}`,
            metadata: note ? { note } : null,
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to update ticket");
        }

        setNote("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update ticket");
      }
    });
  };

  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium text-slate-900">{ticket.subject}</p>
          <p className="text-xs text-slate-500">
            Opened {formatDate(ticket.createdAt)} • Priority {ticket.priority}
            {ticket.openedBy ? ` • Reporter ${ticket.openedBy.slice(0, 8)}` : ""}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium capitalize text-slate-600">
          Current: {ticket.status}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[200px,1fr]">
        <div>
          <label className="text-xs uppercase text-slate-500">Set status</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            disabled={isPending}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Add note (optional)</label>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            placeholder="Reason for status change..."
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={handleUpdate}
          disabled={isPending || selectedStatus === ticket.status}
        >
          {isPending ? "Saving…" : "Update status"}
        </button>
        <button
          type="button"
          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          onClick={() => setNote("Escalated for internal triage")}
          disabled={isPending}
        >
          Escalate note
        </button>
        <button
          type="button"
          className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          onClick={() => setNote("Resolved with customer confirmation")}
          disabled={isPending}
        >
          Resolve note
        </button>
        {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      </div>

      {ticket.latestEvent ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white/70 p-3 text-xs text-slate-600">
          <p className="font-medium text-slate-800">{ticket.latestEvent.eventType}</p>
          <p className="mt-1">{ticket.latestEvent.message}</p>
          <p className="mt-2 text-[11px] uppercase text-slate-400">
            {formatDate(ticket.latestEvent.createdAt)}
          </p>
          {ticket.latestEvent.metadata ? (
            <pre className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-500">
              {JSON.stringify(ticket.latestEvent.metadata, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
