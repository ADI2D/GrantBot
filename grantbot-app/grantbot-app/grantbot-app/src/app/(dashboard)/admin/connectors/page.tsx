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
  errors?: any;
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
  errors?: any;
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
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Grant Connectors</h1>
        <p className="text-sm text-slate-600">Monitor and manage data source integrations</p>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Connectors</p>
              <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-slate-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Healthy</p>
              <p className="text-2xl font-bold text-emerald-600">{summary.healthy}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Warnings</p>
              <p className="text-2xl font-bold text-amber-600">{summary.warning}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Errors</p>
              <p className="text-2xl font-bold text-rose-600">{summary.error}</p>
            </div>
            <XCircle className="h-8 w-8 text-rose-500" />
          </div>
        </Card>
      </div>

      {/* Connectors List */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Connectors</h2>
        <div className="space-y-4">
          {connectors.map((connector) => (
            <div
              key={connector.source}
              className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-900 capitalize">
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
                    {connector.health}
                  </Badge>
                  {connector.status === "running" && (
                    <Badge tone="info">Syncing...</Badge>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
                  <div>
                    <span className="font-medium">Last Sync:</span>{" "}
                    {connector.last_sync_completed_at
                      ? new Date(connector.last_sync_completed_at).toLocaleString()
                      : "Never"}
                  </div>
                  <div>
                    <span className="font-medium">Records Fetched:</span>{" "}
                    {connector.records_fetched}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {connector.records_created}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span> {connector.records_updated}
                  </div>
                </div>

                {connector.errors && (
                  <div className="mt-2 text-sm text-rose-600">
                    Error: {JSON.stringify(connector.errors)}
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
            <p className="text-center text-slate-500 py-8">No connectors configured</p>
          )}
        </div>
      </Card>

      {/* Recent Sync Logs */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Sync Activity</h2>
        <div className="space-y-3">
          {logsData?.logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 capitalize">
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
          ))}

          {logsData?.logs.length === 0 && (
            <p className="text-center text-slate-500 py-8">No sync history yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
