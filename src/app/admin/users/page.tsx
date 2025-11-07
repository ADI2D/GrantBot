import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { Card } from "@/components/ui/card";
import { createServerSupabase } from "@/lib/supabase-server";
import { UsersManager } from "@/components/admin/users-manager";

export default async function UsersPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?admin=1");
  }

  await requireSuperAdmin(user.id);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Administration</p>
        <h1 className="text-3xl font-semibold text-primary">User management</h1>
        <p className="text-sm text-muted">
          Invite, update, or deactivate user accounts across every organization.
        </p>
      </header>

      <UsersManager currentUserId={user.id} />

      <Card className="p-4 text-xs text-muted">
        <p>
          Every change is logged to <code className="text-primary/80">admin_audit_logs</code>. Removing a user will also
          remove any organization memberships linked to their account.
        </p>
      </Card>
    </div>
  );
}
