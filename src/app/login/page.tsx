import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { AccountType, getUserProfile, resolveAccountRedirect } from "@/lib/account";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const missingOrg = Boolean(params?.missingOrg);
  const missingAdmin = params?.admin === "1" || params?.missingAdmin === "1";

  if (user && !missingOrg && !missingAdmin) {
    const profile = await getUserProfile(supabase, user.id);
    const metadataType = user.user_metadata?.account_type as AccountType | undefined;
    const accountType = profile?.accountType ?? metadataType ?? "nonprofit";
    redirect(resolveAccountRedirect(accountType));
  }

  if (user && (missingOrg || missingAdmin)) {
    const profile = await getUserProfile(supabase, user.id);
    const metadataType = user.user_metadata?.account_type as AccountType | undefined;
    const accountType = profile?.accountType ?? metadataType ?? "nonprofit";
    if (accountType === "freelancer") {
      redirect("/freelancer/clients");
    }
    await supabase.auth.signOut();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-blue-600">GrantBot Access</p>
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500">
            Use the email/password from your Supabase Auth user to enter the workspace.
          </p>
        </div>
        {missingOrg && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            You don&apos;t have access to a GrantBot workspace yet. Contact your administrator so they
            can invite you or bootstrap an organization for your account.
          </div>
        )}
        {missingAdmin && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Your account does not have access to the GrantBot Super Admin panel. Please contact a
            super admin to grant you the appropriate role.
          </div>
        )}
        <div className="mt-8">
          <LoginForm />
        </div>
      </Card>
    </div>
  );
}
