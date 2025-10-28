import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createServerSupabase } from "@/lib/supabase-server";
import { OrgProvider } from "@/components/providers/org-provider";
import { getServiceSupabaseClient } from "@/lib/supabase-client";
import { plans } from "@/lib/plans";

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

  const adminClient = getServiceSupabaseClient();

  const { data: memberships, error: membershipError } = await adminClient
    .from("org_members")
    .select("organization_id, organizations!inner(name)")
    .eq("user_id", user.id);

  if (membershipError) {
    throw membershipError;
  }

  let orgs =
    memberships?.map((member) => ({
      id: member.organization_id,
      name: member.organizations?.name ?? "Untitled org",
    })) ?? [];

  if (!orgs.length) {
    const { data: organization, error: orgError } = await adminClient
      .from("organizations")
      .insert({
        name: "New Organization",
        onboarding_completion: 0,
        plan_id: plans[0].id,
        created_by: user.id,
      })
      .select("id, name")
      .single();

    if (orgError || !organization) {
      redirect("/login");
    } else {
      const { error: memberInsertError } = await adminClient.from("org_members").insert({
        organization_id: organization.id,
        user_id: user.id,
        role: "owner",
      });

      if (memberInsertError) {
        redirect("/login");
      } else {
        orgs = [{ id: organization.id, name: organization.name ?? "Untitled org" }];
      }
    }
  }

  return (
    <OrgProvider orgs={orgs} initialOrgId={orgs[0].id}>
      <AppShell>{children}</AppShell>
    </OrgProvider>
  );
}
