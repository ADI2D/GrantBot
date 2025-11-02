import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchAdminCustomerDetail } from "@/lib/admin-data";
import { createServerSupabase } from "@/lib/supabase-server";
import { getServiceSupabaseClient } from "@/lib/supabase-client";
import { requireAdminRole } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";
import { SupportTicketCard } from "../_components/support-ticket-card";
import { SupportTicketComposer } from "../_components/support-ticket-composer";

type PageParams = {
  params: {
    orgId: string;
  };
};

export default async function AdminCustomerDetailPage({ params }: PageParams) {
  const orgParam = params.orgId;
  let detail;

  try {
    detail = await fetchAdminCustomerDetail(orgParam);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      notFound();
    }
    throw error;
  }

  const resolvedOrgId = detail.organization.id;

  const addNote = async (formData: FormData) => {
    "use server";
    const noteContent = formData.get("note")?.toString().trim();
    if (!noteContent) {
      return;
    }

    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const actorRole = await requireAdminRole(session.user.id, ["super_admin", "support", "developer"]);

    const serviceClient = getServiceSupabaseClient();
    const { error } = await serviceClient.from("admin_customer_notes").insert({
      organization_id: resolvedOrgId,
      admin_user_id: session.user.id,
      content: noteContent,
    });

    if (error) {
      throw new Error(error.message);
    }

    await recordAdminAction({
      actorUserId: session.user.id,
      actorRole,
      action: "customer.note.created",
      targetType: "organization",
      targetId: resolvedOrgId,
      metadata: { length: noteContent.length },
    });

    revalidatePath(`/admin/customers/${orgParam}`);
  };

  const {
    organization,
    members,
    proposals,
    payments,
    notes,
    supportTickets,
    supportEvents,
    openTicketCount,
    averageResolutionHours,
  } = detail;

  const startImpersonation = async () => {
    "use server";
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const actorRole = await requireAdminRole(session.user.id, ["super_admin", "support"]);
    await recordAdminAction({
      actorUserId: session.user.id,
      actorRole,
      action: "customer.impersonation.started",
      targetType: "organization",
      targetId: resolvedOrgId,
    });

    redirect(`/workspace?orgId=${resolvedOrgId}&impersonated=1`);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500">Customer</p>
          <h1 className="text-2xl font-semibold text-slate-900">{organization.name}</h1>
          <p className="text-sm text-slate-500">
            Created {formatDate(organization.createdAt)} • Budget {formatCurrency(organization.annualBudget)}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/admin/customers`}
            className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Back to customers
          </Link>
          <form action={startImpersonation}>
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Impersonate workspace
            </button>
          </form>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Seats</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{members.length}</p>
          <p className="text-sm text-slate-500">Members with workspace access.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Recent proposals</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{proposals.length}</p>
          <p className="text-sm text-slate-500">Last 10 proposals created by this organization.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Invoices</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{payments.length}</p>
          <p className="text-sm text-slate-500">Last 10 Stripe invoices synced.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Support load</p>
          <p className={`mt-3 text-3xl font-semibold ${openTicketCount > 0 ? "text-amber-700" : "text-slate-900"}`}>
            {openTicketCount}
          </p>
          <p className="text-sm text-slate-500">
            Open tickets • Avg resolution {averageResolutionHours !== null ? `${averageResolutionHours}h` : "—"}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Membership</h2>
          <table className="mt-4 w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">User ID</th>
                <th className="py-2">Role</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-sm text-slate-500">
                    No members yet.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.userId}>
                    <td className="py-2 font-medium text-slate-800">{member.userId}</td>
                    <td className="py-2 text-slate-500">{member.role}</td>
                    <td className="py-2 text-slate-500">{formatDate(member.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mission</h2>
          <p className="mt-3 text-sm text-slate-600">{organization.mission ?? "No mission provided."}</p>
          <h3 className="mt-5 text-xs uppercase text-slate-500">Impact summary</h3>
          <p className="mt-2 text-sm text-slate-600">
            {organization.impactSummary ?? "No impact summary captured yet."}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent proposals</h2>
          <table className="mt-4 w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Proposal</th>
                <th className="py-2">Status</th>
                <th className="py-2">Due</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proposals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-sm text-slate-500">
                    No proposals yet.
                  </td>
                </tr>
              ) : (
                proposals.map((proposal) => (
                  <tr key={proposal.id}>
                    <td className="py-2 font-medium text-slate-800">{proposal.id}</td>
                    <td className="py-2 text-slate-500 capitalize">{proposal.status ?? "unknown"}</td>
                    <td className="py-2 text-slate-500">{formatDate(proposal.dueDate)}</td>
                    <td className="py-2 text-slate-500">{formatDate(proposal.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Billing history</h2>
          <table className="mt-4 w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Invoice</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-sm text-slate-500">
                    No billing events yet.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-2 font-medium text-slate-800">{payment.stripeInvoiceId}</td>
                    <td className="py-2 text-right text-slate-800">
                      {formatCurrency(payment.amount ?? 0, payment.currency ?? "USD")}
                    </td>
                    <td className="py-2 text-slate-500 capitalize">{payment.status ?? "unknown"}</td>
                    <td className="py-2 text-slate-500">{formatDate(payment.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Support tickets</h2>
          <p className="text-sm text-slate-500">Recent support activity linked to this organization.</p>
          <p className={`mt-2 text-xs font-medium ${openTicketCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {openTicketCount > 0
              ? `${openTicketCount} open ticket${openTicketCount === 1 ? "" : "s"} awaiting resolution.`
              : "All tickets resolved."}
          </p>
          <div className="mt-4">
            <SupportTicketComposer organizationId={organization.id} />
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {supportTickets.length === 0 ? (
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-slate-500">
                No support tickets on record.
              </li>
            ) : (
              supportTickets.map((ticket) => (
                <SupportTicketCard
                  key={ticket.id}
                  ticket={{
                    id: ticket.id,
                    subject: ticket.subject,
                    status: ticket.status,
                    priority: ticket.priority,
                    openedBy: ticket.openedBy,
                    createdAt: ticket.createdAt,
                    latestEvent: ticket.latestEvent
                      ? {
                          eventType: ticket.latestEvent.eventType,
                          message: ticket.latestEvent.message,
                          createdAt: ticket.latestEvent.createdAt,
                          metadata: ticket.latestEvent.metadata ?? null,
                        }
                      : null,
                  }}
                />
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Internal notes</h2>
          <p className="text-sm text-slate-500">Share context with other team members. Notes are private to GrantBot staff.</p>

          <form action={addNote} className="mt-4 space-y-3">
            <textarea
              name="note"
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none"
              placeholder="Add a note for the team..."
              required
            />
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Save note
            </button>
          </form>

          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            {notes.length === 0 ? (
              <li className="text-slate-500">No notes yet.</li>
            ) : (
              notes.map((note) => (
                <li key={note.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-slate-700">{note.content}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {note.adminEmail ?? note.adminUserId ?? "Unknown admin"} • {formatDate(note.createdAt)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Support timeline</h2>
        <p className="text-sm text-slate-500">
          Chronological log of support activity. Average resolution {averageResolutionHours !== null ? `${averageResolutionHours} hours` : "—"}.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          {supportEvents.length === 0 ? (
            <li className="text-slate-500">No support events recorded.</li>
          ) : (
            supportEvents.map((event) => (
              <li key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-800">{event.eventType}</p>
                  <span className="text-xs text-slate-500">{formatDate(event.createdAt)}</span>
                </div>
                <p className="mt-1 text-slate-600">{event.message}</p>
                <p className="mt-2 text-xs text-slate-500">Ticket #{event.ticketId}</p>
                {event.metadata ? (
                  <pre className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-white/70 p-3 text-xs text-slate-500">
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
