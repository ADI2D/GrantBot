import { cookies } from "next/headers";
import { createServerComponentClient, createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AnySupabase = SupabaseClient<Database, any, any>;

export async function createServerSupabase(): Promise<AnySupabase> {
  const cookieStore = await cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore }) as AnySupabase;
}

export async function createRouteSupabase(): Promise<AnySupabase> {
  const cookieStore = await cookies();
  return createRouteHandlerClient<Database>({ cookies: () => cookieStore }) as AnySupabase;
}
