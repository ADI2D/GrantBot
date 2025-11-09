import { NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { getServiceSupabaseClient } from "@/lib/supabase-client";
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
    actorRole = await requireAdminRole(user.id, ["super_admin", "support", "developer"]);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const payload = await request.json();
  const organizationId = typeof payload.organizationId === "string" ? payload.organizationId : null;
  const content = typeof payload.content === "string" ? payload.content.trim() : "";

  if (!organizationId || !content) {
    return NextResponse.json({ error: "organizationId and content are required" }, { status: 400 });
  }

  const serviceClient = getServiceSupabaseClient();
  const { error } = await serviceClient.from("admin_customer_notes").insert({
    organization_id: organizationId,
    admin_user_id: user.id,
    content,
  });

  if (error) {
    console.error("[api][admin][support][notes][POST]", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }

  await recordAdminAction({
    actorUserId: user.id,
    actorRole,
    action: "customer.note.created",
    targetType: "organization",
    targetId: organizationId,
    metadata: { length: content.length },
  });

  return NextResponse.json({ ok: true });
}
