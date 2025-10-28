import { cookies } from "next/headers";
import { createServerComponentClient, createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/database";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
}

export async function createRouteSupabase() {
  const cookieStore = await cookies();
  return createRouteHandlerClient<Database>({ cookies: () => cookieStore });
}
