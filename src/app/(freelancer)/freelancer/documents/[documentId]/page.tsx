import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText, Edit, Trash2, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Mock document data - in production, fetch from API
const mockDocuments: Record<string, any> = {
  "irs-determination-letter": {
    id: "doc-1",
    name: "IRS Determination Letter",
    filename: "irs-501c3-determination.pdf",
    status: "ready",
    uploadedAt: "2024-10-15T14:30:00Z",
    uploadedBy: "Alex Johnson",
    fileSize: 245000,
    clientName: "Green Spaces Collective",
    clientId: "green-spaces",
    category: "Tax Documentation",
    notes: "Current 501(c)(3) determination letter on file.",
    usedInProposals: [
      { id: "p-401", title: "Neighborhood Canopy Initiative" },
      { id: "p-402", title: "Community Garden Fellows" },
    ],
  },
  "audited-financials-fy23": {
    id: "doc-2",
    name: "Audited Financials FY23",
    filename: "audited-financials-2023.pdf",
    status: "in_review",
    uploadedAt: "2024-11-01T09:15:00Z",
    uploadedBy: "Sarah Williams",
    fileSize: 1250000,
    clientName: "Impact Circle Foundation",
    clientId: "impact-circle",
    category: "Financial Documents",
    notes: "Waiting for board approval before using in proposals.",
    usedInProposals: [],
  },
};

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

  // Find document by matching name or id
  const document = Object.values(mockDocuments).find(
    (doc) => doc.id === decodedId || doc.name.toLowerCase().replace(/ /g, "-") === decodedId.toLowerCase()
  );

  if (!document) {
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
                Uploaded {formatDate(document.uploadedAt)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="secondary" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
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
                <dt className="text-sm font-medium text-slate-500">Filename</dt>
                <dd className="text-sm text-slate-900">{document.filename}</dd>
              </div>
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <dt className="text-sm font-medium text-slate-500">Client</dt>
                <dd>
                  <Link
                    href={`/freelancer/clients/${document.clientId}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {document.clientName}
                  </Link>
                </dd>
              </div>
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <dt className="text-sm font-medium text-slate-500">Category</dt>
                <dd className="text-sm text-slate-900">{document.category}</dd>
              </div>
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <dt className="text-sm font-medium text-slate-500">File size</dt>
                <dd className="text-sm text-slate-900">
                  {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                </dd>
              </div>
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <dt className="text-sm font-medium text-slate-500">Uploaded by</dt>
                <dd className="text-sm text-slate-900">{document.uploadedBy}</dd>
              </div>
              <div className="flex items-start justify-between">
                <dt className="text-sm font-medium text-slate-500">Upload date</dt>
                <dd className="text-sm text-slate-900">{formatDate(document.uploadedAt)}</dd>
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

          {/* Used In Proposals */}
          <Card className="border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Used in proposals</h2>
            {document.usedInProposals.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {document.usedInProposals.map((proposal: any) => (
                  <li key={proposal.id}>
                    <Link
                      href={`/freelancer/proposals/${proposal.id}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <FileText className="h-4 w-4 text-slate-400" />
                      {proposal.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                This document hasn't been used in any proposals yet.
              </p>
            )}
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          <Card className="border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Quick actions</h3>
            <div className="mt-3 space-y-2">
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <Download className="mr-2 h-4 w-4" />
                Download file
              </Button>
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <Edit className="mr-2 h-4 w-4" />
                Update status
              </Button>
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Set expiration
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete document
              </Button>
            </div>
          </Card>

          <div className="rounded-xl bg-blue-50 p-4 text-sm">
            <p className="font-semibold text-blue-900">Document tips</p>
            <ul className="mt-2 space-y-1 text-xs text-blue-800">
              <li>• Keep documents current and up to date</li>
              <li>• Mark "In Review" if pending approval</li>
              <li>• Add notes about version or context</li>
              <li>• Set expiration dates for time-sensitive docs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
