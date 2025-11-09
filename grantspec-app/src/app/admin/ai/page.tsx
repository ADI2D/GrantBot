import { fetchAiOperations } from "@/lib/admin-ai";
import { formatDate } from "@/lib/format";

export default async function AdminAIOpsPage() {
  const snapshot = await fetchAiOperations();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase text-slate-500">Automation</p>
        <h1 className="text-2xl font-semibold text-slate-900">AI Ops</h1>
        <p className="text-sm text-slate-500">
          Track AI task queues, retry failed generations, and manage human-in-the-loop escalations.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <Metric label="Pending jobs" value={snapshot.pendingCount.toString()} description="Queued or awaiting review" />
        <Metric label="Retries today" value={snapshot.retryCount.toString()} description="Manual re-runs triggered" />
        <Metric label="Completed" value={snapshot.successCount.toString()} description="Successful AI outputs" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent AI events</h2>
            <p className="text-sm text-slate-500">Latest audit log entries prefixed with <code>ai.</code>.</p>
          </div>
        </div>
        <ul className="mt-6 space-y-3 text-sm text-slate-600">
          {snapshot.events.length === 0 ? (
            <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
              No AI operations logged yet.
            </li>
          ) : (
            snapshot.events.map((event) => (
              <li key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-800">{event.action}</p>
                  <p className="text-xs text-slate-500">{formatDate(event.createdAt)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {event.actorRole ? `Actor: ${event.actorRole}` : "System event"}
                </p>
                {event.metadata ? (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-white/70 p-3 text-xs text-slate-600">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}
