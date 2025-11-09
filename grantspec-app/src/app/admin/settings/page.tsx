import Link from "next/link";
import { fetchAdminUsers } from "@/lib/admin-data";
import { formatDate } from "@/lib/format";
import type { AdminRole } from "@/lib/admin";

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  support: "Support",
  developer: "Developer",
  read_only: "Read Only",
};

export default async function AdminSettingsPage() {
  const admins = await fetchAdminUsers();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase text-slate-500">Configuration</p>
        <h1 className="text-2xl font-semibold text-slate-900">Admin Settings</h1>
        <p className="text-sm text-slate-500">
          Manage admin roles, feature flags, and environment-wide preferences for the GrantSpec platform.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Admin roster</h2>
            <p className="text-sm text-slate-500">
              Super admins can invite or promote teammates using the API endpoint at <code>/api/admin/users</code>.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Security reminder</p>
            <p>Enforce MFA for all super admins via Supabase dashboard.</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                    No admin users configured yet.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.userId}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{admin.email ?? "Unknown email"}</span>
                        <span className="text-xs text-slate-500">{admin.userId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{ROLE_LABELS[admin.role] ?? admin.role}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(admin.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">API usage</p>
          <p className="mt-2">
            POST <code>/api/admin/users</code> with a JSON body containing <code>{"{ userId, role }"}</code> to promote a
            user. Only super admins may perform this action; all changes are logged to <code>admin_audit_logs</code>.
          </p>
          <p className="mt-4">
            Feature flags preview available at <Link className="text-slate-900 underline" href="/admin/settings/feature-flags">/admin/settings/feature-flags</Link>.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pricing management</h2>
            <p className="text-sm text-slate-500">
              Update pricing tiers, proposal limits, and Stripe price mappings.
            </p>
          </div>
          <Link
            href="/admin/settings/pricing"
            className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Manage pricing tiers
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Plans shown elsewhere in the app read from Supabase. Keep Stripe product & price references up to date when
          editing.
        </p>
      </section>
    </div>
  );
}
