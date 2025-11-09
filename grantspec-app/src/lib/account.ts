import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type AccountType = "nonprofit" | "freelancer";

export type UserProfile = {
  userId: string;
  accountType: AccountType;
};

export async function getUserProfile(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<UserProfile | null> {
  try {
    const { data, error } = await client
      .from("user_profiles")
      .select("account_type")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[account] Failed to load user profile", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      userId,
      accountType: (data.account_type as AccountType) ?? "nonprofit",
    };
  } catch (error) {
    console.warn("[account] Unexpected failure to read user profile", error);
    return null;
  }
}

export function resolveAccountRedirect(accountType: AccountType | null | undefined) {
  return accountType === "freelancer" ? "/freelancer/clients" : "/dashboard";
}
