// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================
// Secure authentication utilities for API routes
// ============================================================================

import { createRouteSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AuthResult = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

/**
 * Authenticate a user in an API route (secure method)
 *
 * This uses getUser() instead of getSession() to ensure the user is authentic.
 * getSession() reads from cookies which can be tampered with.
 * getUser() validates the session with the Supabase Auth server.
 *
 * @throws Error if user is not authenticated
 * @returns Object with supabase client and userId
 */
export async function authenticateUser(): Promise<AuthResult> {
  const supabase = await createRouteSupabase();

  // Use getUser() instead of getSession() for security
  // This validates the session token with the Supabase Auth server
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return {
    supabase,
    userId: user.id,
  };
}

/**
 * Authenticate a user and return 401 response if unauthorized
 *
 * This is a convenience wrapper for API routes that handles the error response.
 *
 * @returns Object with supabase client and userId, or null if unauthorized
 */
export async function authenticateUserOrNull(): Promise<AuthResult | null> {
  try {
    return await authenticateUser();
  } catch {
    return null;
  }
}
