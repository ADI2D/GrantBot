import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchAdminCustomers, summarizeCustomerBilling } from "@/lib/admin-data";

export default async function AdminCustomersPage() {
  const { summaries, aggregate } = await fetchAdminCustomers();

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Active organizations</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summaries.length}</p>
          <p className="text-sm text-slate-500">Last 50 organizations by creation date.</p>
        </div>
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Seats provisioned</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{aggregate.totalSeats.toLocaleString()}</p>
          <p className="text-sm text-slate-500">Total members across these orgs.</p>
        </div>
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Paid invoices</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(aggregate.totalPaid)}
          </p>
          <p className="text-sm text-slate-500">Sum of invoices marked paid or succeeded.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Customers</h2>
            <p className="text-sm text-slate-500">
              Organization roster with seat counts, proposal volume, and billing activity.
            </p>
          </div>
          <Link
            href="/admin/settings#new-customer"
            className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Add new customer
          </Link>
        </div>
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Organization</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Seats</th>
                <th className="px-4 py-3 text-right font-medium">Proposals</th>
                <th className="px-4 py-3 text-right font-medium">Total Paid</th>
                <th className="px-4 py-3 text-left font-medium">Last Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                summaries.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {customer.name}
                        </Link>
                        <span className="text-xs text-slate-500">
                          Budget {formatCurrency(customer.annualBudget)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(customer.createdAt)}</td>
                    <td className="px-4 py-3 text-right">{customer.seatCount}</td>
                    <td className="px-4 py-3 text-right">{customer.proposalCount}</td>
                    <td className="px-4 py-3 text-right">
                      {summarizeCustomerBilling(customer.totalPaid, customer.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {customer.lastInvoice ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">
                            {formatDate(customer.lastInvoice.createdAt)}
                          </span>
                          <span className="text-xs text-slate-500 capitalize">
                            {customer.lastInvoice.status ?? "unknown"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">No invoices</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
