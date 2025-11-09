import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createServerSupabase } from "@/lib/supabase-server";
import { OrgProvider } from "@/components/providers/org-provider";
import { AccountType, getUserProfile } from "@/lib/account";
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(supabase, user.id);
  const metadataType = user.user_metadata?.account_type as AccountType | undefined;
  const accountType = profile?.accountType ?? metadataType ?? "nonprofit";
  if (accountType === "freelancer") {
    redirect("/freelancer/clients");
  }

  const { data: memberships, error } = await supabase
    .from("org_members")
    .select("organization_id, organizations!inner(name)")
    .eq("user_id", user.id);

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  const orgs =
    memberships?.map((member) => ({
      id: member.organization_id,
      name: member.organizations?.name ?? "Untitled org",
    })) ?? [];

  if (!orgs.length) {
    redirect("/login?missingOrg=1");
  }

  return (
    <OrgProvider orgs={orgs} initialOrgId={orgs[0].id}>
      <AppShell>{children}</AppShell>
    </OrgProvider>
  );
}
