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
    actorRole = await requireAdminRole(user.id, ["super_admin", "support"]);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const payload = await request.json();
  const organizationId = typeof payload.organizationId === "string" ? payload.organizationId : null;
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const priority = typeof payload.priority === "string" ? payload.priority : "normal";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";

  if (!organizationId || !subject) {
    return NextResponse.json({ error: "organizationId and subject are required" }, { status: 400 });
  }

  const serviceClient = getServiceSupabaseClient();
  const { data: ticketData, error: ticketError } = await serviceClient
    .from("support_tickets")
    .insert({
      organization_id: organizationId,
      subject,
      priority,
      opened_by: user.id,
      status: payload.status ?? "open",
    })
    .select("id")
    .single();

  if (ticketError || !ticketData) {
    console.error("[api][admin][support][tickets][POST]", ticketError);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }

  const eventPayload = {
    ticket_id: ticketData.id,
    event_type: "status.open",
    message: message || "Ticket created",
    actor_admin_id: user.id,
    metadata: payload.metadata ?? null,
  };

  await serviceClient.from("support_ticket_events").insert(eventPayload);

  await recordAdminAction({
    actorUserId: user.id,
    actorRole,
    action: "support.ticket.created",
    targetType: "support_ticket",
    targetId: String(ticketData.id),
    metadata: { subject, priority },
  });

  return NextResponse.json({ ticketId: ticketData.id });
}

export async function PATCH(request: Request) {
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
    actorRole = await requireAdminRole(user.id, ["super_admin", "support"]);
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const payload = await request.json();
  const ticketId = typeof payload.ticketId === "number" ? payload.ticketId : null;
  const status = typeof payload.status === "string" ? payload.status : null;
  const message = typeof payload.message === "string" ? payload.message.trim() : "";

  if (!ticketId || !status) {
    return NextResponse.json({ error: "ticketId and status are required" }, { status: 400 });
  }

  const serviceClient = getServiceSupabaseClient();
  const { error: ticketError } = await serviceClient
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (ticketError) {
    console.error("[api][admin][support][tickets][PATCH]", ticketError);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }

  const eventPayload = {
    ticket_id: ticketId,
    event_type: `status.${status}`,
    message: message || `Ticket status updated to ${status}`,
    actor_admin_id: user.id,
    metadata: payload.metadata ?? null,
  };

  await serviceClient.from("support_ticket_events").insert(eventPayload);

  await recordAdminAction({
    actorUserId: user.id,
    actorRole,
    action: "support.ticket.updated",
    targetType: "support_ticket",
    targetId: String(ticketId),
    metadata: { status, message },
  });

  return NextResponse.json({ ok: true });
}
