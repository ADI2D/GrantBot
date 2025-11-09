import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { getServiceSupabaseClient } from "@/lib/supabase-client";
import { isAdminRole, requireAdminRole } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";
import type { AdminRole } from "@/lib/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: targetUserId } = await params;
  const supabase = await createRouteSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorRole = await requireAdminRole(user.id, ["super_admin"]);

  let payload: { role?: AdminRole };
  try {
    payload = (await request.json()) as { role?: AdminRole };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { role } = payload;
  if (!role || !isAdminRole(role)) {
    return NextResponse.json({ error: "role is required and must be a valid admin role" }, { status: 400 });
  }

  const adminClient = getServiceSupabaseClient();

  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    app_metadata: { admin_role: role },
  });
  if (updateError) {
    console.error("[admin][users][update-role]", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: upsertError } = await adminClient
    .from("admin_users")
    .upsert({ user_id: targetUserId, role }, { onConflict: "user_id" });
  if (upsertError) {
    console.error("[admin][users][update-role][upsert]", upsertError);
    return NextResponse.json({ error: "Failed to update admin role mapping" }, { status: 500 });
  }

  await recordAdminAction({
    actorUserId: user.id,
    actorRole,
    action: "admin.user.update_role",
    targetType: "auth_user",
    targetId: targetUserId,
    metadata: { role },
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
    userAgent: request.headers.get("user-agent") ?? null,
  });

  return NextResponse.json({ success: true, role });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: targetUserId } = await params;
  const supabase = await createRouteSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorRole = await requireAdminRole(user.id, ["super_admin"]);

  if (user.id === targetUserId) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const adminClient = getServiceSupabaseClient();
  const { error: membershipDeleteError } = await adminClient
    .from("org_members")
    .delete()
    .eq("user_id", targetUserId);

  if (membershipDeleteError) {
    console.error("[admin][users][delete][memberships]", membershipDeleteError);
    return NextResponse.json({ error: "Failed to remove organization memberships" }, { status: 500 });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
  if (deleteError) {
    console.error("[admin][users][delete]", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await recordAdminAction({
    actorUserId: user.id,
    actorRole,
    action: "admin.user.delete",
    targetType: "auth_user",
    targetId: targetUserId,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
    userAgent: request.headers.get("user-agent") ?? null,
  });

  return NextResponse.json({ success: true });
}
