import { getServiceSupabaseClient } from "@/lib/supabase-client";
import type { AdminRole } from "@/lib/admin";

export type AiEvent = {
  id: number;
  action: string;
  createdAt: string | null;
  actorRole: AdminRole | null;
  metadata: Record<string, unknown> | null;
};

export type AiOperationsSnapshot = {
  pendingCount: number;
  retryCount: number;
  successCount: number;
  events: AiEvent[];
};

const PENDING_ACTIONS = ["ai.job.queued", "ai.pipeline.pending"];
const SUCCESS_ACTIONS = ["ai.job.completed", "ai.pipeline.completed"];
const RETRY_ACTIONS = ["ai.job.retry", "ai.pipeline.retry"];

export async function fetchAiOperations(): Promise<AiOperationsSnapshot> {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("id, action, metadata, actor_role, created_at")
    .ilike("action", "ai.%")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error("Failed to load AI operations history");
  }

  const events: AiEvent[] = (data ?? []).map((event) => ({
    id: event.id,
    action: event.action,
    createdAt: event.created_at,
    actorRole: (event.actor_role as AdminRole | null) ?? null,
    metadata: (event.metadata as Record<string, unknown> | null) ?? null,
  }));

  const pendingCount = countByAction(events, PENDING_ACTIONS);
  const successCount = countByAction(events, SUCCESS_ACTIONS);
  const retryCount = countByAction(events, RETRY_ACTIONS);

  return {
    pendingCount,
    successCount,
    retryCount,
    events,
  };
}

function countByAction(events: AiEvent[], targetActions: string[]) {
  const targets = new Set(targetActions);
  return events.filter((event) => targets.has(event.action)).length;
}
