import { NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { getServiceSupabaseClient } from "@/lib/supabase-client";
import { requireAdminRole, AdminAuthorizationError } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";
import type { AdminRole } from "@/lib/admin";

const UPDATE_FIELDS = new Set(["description", "rolloutPercentage", "enabled", "targetPlans", "targetCustomerIds"]);

export async function GET() {
  const supabase = await createRouteSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireAdminRole(session.user.id, ["super_admin", "support", "developer"]);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const serviceClient = getServiceSupabaseClient();
  const { data, error } = await serviceClient
    .from("feature_flags")
    .select("id, key, description, rollout_percentage, enabled, target_plans, target_customer_ids, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api][admin][feature-flags][GET]", error);
    return NextResponse.json({ error: "Failed to load feature flags" }, { status: 500 });
  }

  return NextResponse.json({ flags: data ?? [] });
}

export async function PATCH(request: Request) {
  const supabase = await createRouteSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let actorRole: AdminRole;
  try {
    actorRole = await requireAdminRole(session.user.id, ["super_admin", "developer"]);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const payload = await request.json();
  const id = typeof payload.id === "number" ? payload.id : null;
  if (!id) {
    return NextResponse.json({ error: "Flag id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!UPDATE_FIELDS.has(key)) continue;
    switch (key) {
      case "rolloutPercentage":
        if (typeof value !== "number" || value < 0 || value > 100) {
          return NextResponse.json({ error: "rolloutPercentage must be between 0 and 100" }, { status: 400 });
        }
        updates.rollout_percentage = Math.round(value);
        break;
      case "enabled":
        updates.enabled = Boolean(value);
        break;
      case "description":
        updates.description = typeof value === "string" ? value : null;
        break;
      case "targetPlans":
        updates.target_plans = value ?? [];
        break;
      case "targetCustomerIds":
        updates.target_customer_ids = value ?? [];
        break;
      default:
        break;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const serviceClient = getServiceSupabaseClient();
  const { error } = await serviceClient.from("feature_flags").update(updates).eq("id", id);

  if (error) {
    console.error("[api][admin][feature-flags][PATCH]", error);
    return NextResponse.json({ error: "Failed to update feature flag" }, { status: 500 });
  }

  await recordAdminAction({
    actorUserId: session.user.id,
    actorRole,
    action: "feature_flag.updated",
    targetType: "feature_flag",
    targetId: String(id),
    metadata: updates,
  });

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const supabase = await createRouteSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let actorRole: AdminRole;
  try {
    actorRole = await requireAdminRole(session.user.id, ["super_admin"]);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const payload = await request.json();
  const key = typeof payload.key === "string" ? payload.key.trim() : "";
  if (!key) {
    return NextResponse.json({ error: "Key is required" }, { status: 400 });
  }

  const insertPayload = {
    key,
    description: typeof payload.description === "string" ? payload.description : null,
    rollout_percentage:
      typeof payload.rolloutPercentage === "number" && payload.rolloutPercentage >= 0 && payload.rolloutPercentage <= 100
        ? Math.round(payload.rolloutPercentage)
        : 0,
    enabled: Boolean(payload.enabled),
    target_plans: payload.targetPlans ?? [],
    target_customer_ids: payload.targetCustomerIds ?? [],
    created_by: session.user.id,
  };

  const serviceClient = getServiceSupabaseClient();
  const { error } = await serviceClient.from("feature_flags").insert(insertPayload);

  if (error) {
    console.error("[api][admin][feature-flags][POST]", error);
    return NextResponse.json({ error: "Failed to create feature flag" }, { status: 500 });
  }

  await recordAdminAction({
    actorUserId: session.user.id,
    actorRole,
    action: "feature_flag.created",
    targetType: "feature_flag",
    targetId: key,
    metadata: insertPayload,
  });

  return NextResponse.json({ ok: true });
}
