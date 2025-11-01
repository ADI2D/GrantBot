"use client";

import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic" | "signup" | "reset">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Handle rate limit specifically
      if (error.message.includes("rate limit") || error.status === 429) {
        throw new Error("Too many login attempts. Please wait a few minutes and try again.");
      }
      throw error;
    }
    window.location.href = "/dashboard";
  };

  const handleMagicLink = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      if (error.message.includes("rate limit") || error.status === 429) {
        throw new Error("Too many requests. Please wait a few minutes and try again.");
      }
      throw error;
    }
    setMessage("Magic link sent. Check your inbox.");
  };

  const handleReset = async () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("grantbot-reset-email", email);
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      if (error.message.includes("rate limit") || error.status === 429) {
        throw new Error("Too many requests. Please wait a few minutes and try again.");
      }
      throw error;
    }
    setMessage("Password reset email sent. Check your inbox.");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "password") {
        await handlePasswordSignIn();
      } else if (mode === "magic") {
        await handleMagicLink();
      } else if (mode === "reset") {
        await handleReset();
      } else {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (!data.session) {
          setMessage("Check your email to confirm your account.");
          return;
        }

        const bootstrapResponse = await fetch("/api/auth/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationName: organizationName || "New Organization" }),
        });

        if (!bootstrapResponse.ok) {
          const text = await bootstrapResponse.text();
          throw new Error(text || "Failed to initialize workspace");
        }

        router.push("/onboarding");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex rounded-full border border-slate-200 p-1 text-sm">
        {[
          { label: "Password", value: "password" },
          { label: "Magic Link", value: "magic" },
          { label: "Create Account", value: "signup" },
          { label: "Reset Password", value: "reset" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            className={`flex-1 rounded-full px-4 py-1.5 ${
              mode === option.value ? "bg-slate-900 text-white" : "text-slate-500"
            }`}
            onClick={() => {
              setMessage(null);
              setMode(option.value as typeof mode);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        {(mode === "password" || mode === "signup") && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
        )}
        {mode === "signup" && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Confirm password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Organization name</label>
              <Input
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                placeholder="My Nonprofit"
              />
            </div>
          </>
        )}
        {message && <p className="text-sm text-slate-500">{message}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Working..."
            : mode === "password"
              ? "Sign in"
              : mode === "magic"
                ? "Send magic link"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset email"}
        </Button>
      </form>
    </div>
  );
}
