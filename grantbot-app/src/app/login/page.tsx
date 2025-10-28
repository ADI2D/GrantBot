import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
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
        <div className="mt-8">
          <LoginForm />
        </div>
      </Card>
    </div>
  );
}
