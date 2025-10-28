"use client";

import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/database";

export function createClientBrowser() {
  return createBrowserSupabaseClient<Database>();
}
