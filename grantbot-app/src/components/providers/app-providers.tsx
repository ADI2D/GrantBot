"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { SessionContextProvider, type Session } from "@supabase/auth-helpers-react";
import { createClientBrowser } from "@/lib/supabase-browser";

export function AppProviders({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession: Session | null;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [supabase] = useState(() => createClientBrowser());

  return (
    <SessionContextProvider supabaseClient={supabase} initialSession={initialSession}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionContextProvider>
  );
}
