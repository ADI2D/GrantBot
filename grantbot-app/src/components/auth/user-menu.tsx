"use client";

import { useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const [open, setOpen] = useState(false);

  if (!session?.user) return null;

  const initials = session.user.email?.slice(0, 2).toUpperCase() ?? "US";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((prev) => !prev)}>
        <Avatar initials={initials} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-slate-100 bg-white p-3 text-sm shadow-lg">
          <p className="text-slate-600">{session.user.email}</p>
          <Button variant="ghost" className="mt-3 w-full justify-start" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
}
