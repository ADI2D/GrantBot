"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SessionContextProvider, type Session } from "@supabase/auth-helpers-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/database";
import { PostHogProvider } from "@/components/analytics/posthog-provider";

export function AppProviders({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [supabase] = useState(() => createClientComponentClient<Database>());

  return (
    <PostHogProvider>
      <SessionContextProvider supabaseClient={supabase} initialSession={initialSession}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SessionContextProvider>
    </PostHogProvider>
  );
}
