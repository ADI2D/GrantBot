import { getServiceSupabaseClient } from "@/lib/supabase-client";
import type { AdminRole } from "@/lib/admin";

type RecordAdminActionInput = {
  actorUserId: string;
  actorRole: AdminRole;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function recordAdminAction({
  actorUserId,
  actorRole,
  action,
  targetType = null,
  targetId = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
}: RecordAdminActionInput) {
  const supabase = getServiceSupabaseClient();
  const payload = {
    actor_user_id: actorUserId,
    actor_role: actorRole,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
    ip_address: ipAddress,
    user_agent: userAgent,
  };

  const { error } = await supabase.from("admin_audit_logs").insert(payload);
  if (error) {
    console.error("[admin][audit] Failed to record admin action", error);
  }
}
