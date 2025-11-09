import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText, Edit, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/format";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "success" | "warning" | "info"> = {
  ready: "success",
  in_review: "info",
  missing: "warning",
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const decodedId = decodeURIComponent(documentId);

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch document from database
  const { data: document, error } = await supabase
    .from("freelancer_documents")
    .select(`
      *,
      client:freelancer_clients!freelancer_documents_client_id_fkey(id, name)
    `)
    .eq("id", decodedId)
    .eq("freelancer_user_id", user.id)
    .maybeSingle();

  if (error || !document) {
    console.error("[freelancer][document] Error fetching document:", error);
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/freelancer/clients"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to clients
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-slate-900">{document.name}</h1>
            <div className="flex items-center gap-3">
              <StatusPill tone={statusTone[document.status]}>
                {document.status.replace("_", " ")}
              </StatusPill>
              <span className="text-sm text-slate-500">
                Uploaded {formatDate(document.created_at)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {document.file_path && (
              <Button variant="secondary" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Document details</h2>
            <dl className="mt-4 space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <dt className="text-sm font-medium text-slate-500">Client</dt>
                <dd>
                  <Link
                    href={`/freelancer/clients/${document.client_id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {document.client?.name || "Unknown"}
                  </Link>
                </dd>
              </div>
              {document.file_size && (
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <dt className="text-sm font-medium text-slate-500">File size</dt>
                  <dd className="text-sm text-slate-900">
                    {(document.file_size / 1024).toFixed(1)} KB
                  </dd>
                </div>
              )}
              {document.mime_type && (
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <dt className="text-sm font-medium text-slate-500">File type</dt>
                  <dd className="text-sm text-slate-900">{document.mime_type}</dd>
                </div>
              )}
              <div className="flex items-start justify-between">
                <dt className="text-sm font-medium text-slate-500">Upload date</dt>
                <dd className="text-sm text-slate-900">{formatDate(document.created_at)}</dd>
              </div>
            </dl>
          </Card>

          {/* Notes */}
          {document.notes && (
            <Card className="border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Notes</h2>
              <p className="mt-3 text-sm text-slate-700">{document.notes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          <Card className="border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Quick actions</h3>
            <div className="mt-3 space-y-2">
              {document.file_path && (
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Download file
                </Button>
              )}
              <Link href={`/freelancer/clients/${document.client_id}`}>
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  View client
                </Button>
              </Link>
            </div>
          </Card>

          <div className="rounded-xl bg-blue-50 p-4 text-sm">
            <p className="font-semibold text-blue-900">Document info</p>
            <p className="mt-2 text-xs text-blue-800">
              This document is stored securely and linked to the client's profile for easy access during proposal writing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
