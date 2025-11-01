import { NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { recordAdminAction } from "@/lib/admin-audit";
import { requireAdminRole, AdminAuthorizationError, isAdminRole } from "@/lib/admin-auth";
import { fetchAdminUsers } from "@/lib/admin-data";
import { getServiceSupabaseClient } from "@/lib/supabase-client";
import type { AdminRole } from "@/lib/admin";

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

  try {
    const admins = await fetchAdminUsers();
    return NextResponse.json({ admins });
  } catch (error) {
    console.error("[api][admin][users][GET]", error);
    return NextResponse.json({ error: "Failed to load admin roster" }, { status: 500 });
  }
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
  const userId = typeof payload.userId === "string" ? payload.userId : null;
  const role = typeof payload.role === "string" ? payload.role : null;

  if (!userId || !role || !isAdminRole(role)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const adminClient = getServiceSupabaseClient();
  const { error } = await adminClient.from("admin_users").upsert(
    { user_id: userId, role },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    console.error("[api][admin][users][POST] Failed to upsert admin user", error);
    return NextResponse.json({ error: "Failed to update admin role" }, { status: 500 });
  }

  await recordAdminAction({
    actorUserId: session.user.id,
    actorRole,
    action: "admin_user.upsert",
    targetType: "admin_user",
    targetId: userId,
    metadata: { role },
  });
  return NextResponse.json({ ok: true });
}
