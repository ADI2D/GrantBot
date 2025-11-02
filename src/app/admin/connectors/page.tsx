"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Play } from "lucide-react";
import { PageLoader, PageError } from "@/components/ui/page-state";

type ConnectorHealth = {
  source: string;
  status: "idle" | "running" | "error";
  health: "healthy" | "warning" | "error";
  last_sync_started_at?: string;
  last_sync_completed_at?: string;
  last_successful_sync_at?: string;
  records_fetched: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  errors?: unknown | unknown[] | null;
  hours_since_last_sync?: number;
};

type HealthSummary = {
  total: number;
  healthy: number;
  warning: number;
  error: number;
};

type ConnectorHealthResponse = {
  connectors: ConnectorHealth[];
  summary: HealthSummary;
};

type SyncLog = {
  id: string;
  source: string;
  started_at: string;
  completed_at?: string;
  status: "success" | "partial" | "failed" | "running";
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  errors?: unknown | unknown[] | null;
};

const formatErrorMessage = (error: unknown): string => {
  if (!error) {
    return "Unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error";
    }
  }
  return String(error);
};

export default function ConnectorsAdminPage() {
  const queryClient = useQueryClient();
  const [syncingSource, setSyncingSource] = useState<string | null>(null);

  // Fetch connector health
  const {
    data: healthData,
    isLoading,
    error,
  } = useQuery<ConnectorHealthResponse>({
    queryKey: ["connector-health"],
    queryFn: async () => {
      const response = await fetch("/api/admin/connector-health");
      if (!response.ok) throw new Error("Failed to fetch connector health");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch sync logs
  const { data: logsData } = useQuery<{ logs: SyncLog[] }>({
    queryKey: ["sync-logs"],
    queryFn: async () => {
      const response = await fetch("/api/admin/sync-logs?limit=10");
      if (!response.ok) throw new Error("Failed to fetch sync logs");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Trigger sync mutation
  const syncMutation = useMutation({
    mutationFn: async ({ source, force }: { source: string; force: boolean }) => {
      const response = await fetch("/api/admin/sync-grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, force }),
      });
      if (!response.ok) throw new Error("Failed to trigger sync");
      return response.json();
    },
    onSuccess: () => {
      // Refresh health data after sync starts
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["connector-health"] });
        queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
        setSyncingSource(null);
      }, 2000);
    },
    onError: () => {
      setSyncingSource(null);
    },
  });

  const handleSync = (source: string, force: boolean = false) => {
    setSyncingSource(source);
    syncMutation.mutate({ source, force });
  };

  if (isLoading) return <PageLoader />;
  if (error) return <PageError message="Failed to load connector health" />;
  if (!healthData) return null;

  const { connectors, summary } = healthData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Data orchestration</p>
        <h1 className="text-3xl font-semibold text-primary">Grant Connectors</h1>
        <p className="text-sm text-muted">Monitor and manage data source integrations.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted/80">Total connectors</p>
              <p className="mt-3 text-2xl font-semibold text-primary">{summary.total}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-[color:var(--color-growth-teal)]/50" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted/80">Healthy</p>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--color-success-green)]">
                {summary.healthy}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-[color:var(--color-success-green)]" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted/80">Warnings</p>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--color-warning-red)]">
                {summary.warning}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-[color:var(--color-warning-red)]" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted/80">Errors</p>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--color-warning-red)]">
                {summary.error}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-[color:var(--color-warning-red)]" />
          </div>
        </Card>
      </div>

      {/* Connectors List */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-primary">Active connectors</h2>
        <div className="space-y-4">
          {connectors.map((connector) => (
            <div
              key={connector.source}
              className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-4 last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-primary capitalize">
                    {connector.source.replace("_", " ")}
                  </h3>
                  <Badge
                    tone={
                      connector.health === "healthy"
                        ? "success"
                        : connector.health === "warning"
                          ? "warning"
                          : "error"
                    }
                  >
                    {connector.health.charAt(0).toUpperCase() + connector.health.slice(1)}
                  </Badge>
                  {connector.status === "running" && (
                    <Badge tone="info" className="animate-pulse">Syncing now</Badge>
                  )}
                  {connector.status === "idle" && connector.health === "healthy" && (
                    <Badge tone="neutral" className="bg-slate-100 text-slate-600">Ready</Badge>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted">
                  <div>
                    <span className="font-medium text-primary">Last Sync:</span>{" "}
                    {connector.last_sync_completed_at
                      ? new Date(connector.last_sync_completed_at).toLocaleString()
                      : "Never"}
                  </div>
                  <div>
                    <span className="font-medium text-primary">Records Fetched:</span>{" "}
                    {connector.records_fetched}
                  </div>
                  <div>
                    <span className="font-medium text-primary">Created:</span> {connector.records_created}
                  </div>
                  <div>
                    <span className="font-medium text-primary">Updated:</span> {connector.records_updated}
                  </div>
                </div>

                {Array.isArray(connector.errors) && connector.errors.length > 0 && (
                  <div className="mt-3 text-sm text-[color:var(--color-warning-red)]">
                    <span className="font-medium">Errors:</span>
                    <ul className="mt-1 list-disc list-inside">
                      {connector.errors.map((err, idx) => (
                        <li key={idx}>{formatErrorMessage(err)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {connector.errors && !Array.isArray(connector.errors) && (
                  <div className="mt-3 text-sm text-[color:var(--color-warning-red)]">
                    <span className="font-medium">Error:</span> {formatErrorMessage(connector.errors)}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSync(connector.source, false)}
                  disabled={syncingSource === connector.source || connector.status === "running"}
                  className="gap-2"
                >
                  {syncingSource === connector.source ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Sync
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSync(connector.source, true)}
                  disabled={syncingSource === connector.source || connector.status === "running"}
                >
                  Full Refresh
                </Button>
              </div>
            </div>
          ))}

          {connectors.length === 0 && (
            <p className="py-8 text-center text-muted">No connectors configured.</p>
          )}
        </div>
      </Card>

      {/* Recent Sync Logs */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-primary">Recent sync activity</h2>
        <div className="space-y-3 text-sm">
          {logsData?.logs && logsData.logs.length > 0 ? (
            logsData.logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-3 last:border-0 last:pb-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary capitalize">
                      {log.source.replace("_", " ")}
                    </span>
                    <Badge
                      tone={
                        log.status === "success"
                          ? "success"
                          : log.status === "partial"
                            ? "warning"
                            : log.status === "failed"
                              ? "error"
                              : "info"
                      }
                    >
                      {log.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-slate-600">
                    {new Date(log.started_at).toLocaleString()} • Created: {log.records_created} •
                    Updated: {log.records_updated} • Skipped: {log.records_skipped}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-500 py-8">
              No sync history yet. Click “Sync” or “Full Refresh” to run your first sync.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
