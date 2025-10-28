"use client";

import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const supabase = useSupabaseClient();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.href = "/dashboard";
  };

  const handleMagicLink = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    if (error) throw error;
    setMessage("Magic link sent. Check your inbox.");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "password") {
        await handlePasswordSignIn();
      } else {
        await handleMagicLink();
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
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            className={`flex-1 rounded-full px-4 py-1.5 ${
              mode === option.value ? "bg-slate-900 text-white" : "text-slate-500"
            }`}
            onClick={() => setMode(option.value as typeof mode)}
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
        {mode === "password" && (
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
        {message && <p className="text-sm text-slate-500">{message}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Working..." : mode === "password" ? "Sign in" : "Send magic link"}
        </Button>
      </form>
    </div>
  );
}
