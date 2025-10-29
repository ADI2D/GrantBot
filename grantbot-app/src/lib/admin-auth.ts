import { getServiceSupabaseClient } from "@/lib/supabase-client";
import type { AdminRole } from "@/lib/admin";

export class AdminAuthorizationError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "AdminAuthorizationError";
  }
}

export function isAdminRole(value: string | null | undefined): value is AdminRole {
  return value === "super_admin" || value === "support" || value === "developer" || value === "read_only";
}

export async function requireAdminRole(userId: string, allowed: AdminRole[] = ["super_admin"]) {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to verify admin role");
  }

  if (!data || !isAdminRole(data.role)) {
    throw new AdminAuthorizationError();
  }

  const role = data.role as AdminRole;
  if (!allowed.includes(role)) {
    throw new AdminAuthorizationError();
  }

  return role;
}
