"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const rawParams = searchParams;
  const code = rawParams.get("code");
  const emailParam = rawParams.get("email");
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">(
    code ? "loading" : "ready",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const exchangeCode = async () => {
      if (!code) return;
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          throw error;
        }
        setStatus("ready");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to validate reset link.";
        const storedEmail =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem("grantspec-reset-email")
            : null;

        if (message.includes("code verifier")) {
          const fallback = await supabase.auth.verifyOtp({
            type: "recovery",
            token: code,
            email: emailParam ?? storedEmail ?? undefined,
          });
          if (!fallback.error) {
            if (typeof window !== "undefined") {
              window.sessionStorage.removeItem("grantspec-reset-email");
            }
            setStatus("ready");
            setMessage(null);
            return;
          }
        }
        setStatus("error");
        setMessage(message || "Unable to validate reset link.");
      }
    };

    void exchangeCode();
  }, [code, emailParam, supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("success");
      setMessage("Password updated. Redirecting to login…");
      setTimeout(() => router.push("/login"), 2000);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showForm = status === "ready";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-blue-600">GrantSpec Access</p>
          <h1 className="text-2xl font-semibold text-slate-900">Reset password</h1>
          <p className="text-sm text-slate-500">
            Enter a new password below. If you reached this page unexpectedly, return to the login
            form and request another reset email.
          </p>
        </div>

        {message && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              status === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}
          </div>
        )}

        {status === "loading" && (
          <p className="mt-6 text-center text-sm text-slate-500">Validating reset link…</p>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">New password</label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Confirm password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}

        {status === "error" && (
          <Button className="mt-6 w-full" variant="secondary" onClick={() => router.push("/login")}>
            Back to login
          </Button>
        )}
      </Card>
    </div>
  );
}
