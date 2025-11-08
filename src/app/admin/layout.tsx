import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getServiceSupabaseClient } from "@/lib/supabase-client";
import { AdminShell } from "@/components/admin/admin-shell";
import type { AdminRole } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?admin=1");
  }

  const adminClient = getServiceSupabaseClient();
  const { data: adminRecord } = await adminClient
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRecord) {
    redirect("/login?admin=1");
  }

  const role = adminRecord.role as AdminRole;

  return <AdminShell role={role} email={user.email ?? null}>{children}</AdminShell>;
}
