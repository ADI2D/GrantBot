import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { AccountType, getUserProfile } from "@/lib/account";
import { FreelancerShell } from "@/components/layout/freelancer-shell";

export default async function FreelancerLayout({ children }: { children: ReactNode }) {
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

  if (accountType !== "freelancer") {
    redirect("/dashboard");
  }

  return <FreelancerShell>{children}</FreelancerShell>;
}
