import { NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { requireAdminRole, AdminAuthorizationError } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";
import type { AdminRole } from "@/lib/admin";

export async function POST(request: Request) {
  const supabase = await createRouteSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let actorRole: AdminRole;
  try {
    actorRole = await requireAdminRole(user.id, ["super_admin"]);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const payload = await request.json();

  await recordAdminAction({
    actorUserId: user.id,
    actorRole,
    action: "billing.trial.extension_requested",
    targetType: "organization",
    targetId: payload?.organizationId ?? null,
    metadata: payload ?? null,
  });

  return NextResponse.json(
    {
      error: "Not implemented. Add Supabase update for trial_end and Stripe subscription update.",
    },
    { status: 501 },
  );
}
