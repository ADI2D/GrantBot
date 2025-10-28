import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createServerSupabase } from "@/lib/supabase-server";
import { OrgProvider } from "@/components/providers/org-provider";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const { data: memberships, error } = await supabase
    .from("org_members")
    .select("organization_id, organizations!inner(name)")
    .eq("user_id", session.user.id);

  if (error) {
    throw error;
  }

  const orgs =
    memberships?.map((member) => ({
      id: member.organization_id,
      name: member.organizations?.name ?? "Untitled org",
    })) ?? [];

  if (!orgs.length) {
    redirect("/onboarding");
  }

  return (
    <OrgProvider orgs={orgs} initialOrgId={orgs[0].id}>
      <AppShell>{children}</AppShell>
    </OrgProvider>
  );
}
