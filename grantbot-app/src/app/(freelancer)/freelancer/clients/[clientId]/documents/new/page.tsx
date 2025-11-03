"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DocumentStatus = "ready" | "in_review" | "missing";

const statusOptions: { value: DocumentStatus; label: string; description: string }[] = [
  {
    value: "ready",
    label: "Ready",
    description: "Document is complete and approved",
  },
  {
    value: "in_review",
    label: "In Review",
    description: "Document needs client review or approval",
  },
  {
    value: "missing",
    label: "Missing",
    description: "Document is required but not yet available",
  },
];

export default function UploadDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.clientId as string;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>("ready");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill document name from filename if empty
      if (!documentName) {
        setDocumentName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !documentName) {
      return;
    }

    setUploading(true);

    try {
      // TODO: Implement actual file upload to Supabase Storage
      // For now, simulate upload
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: Save document metadata to database
      // const formData = new FormData();
      // formData.append('file', selectedFile);
      // formData.append('name', documentName);
      // formData.append('status', documentStatus);
      // formData.append('clientId', clientId);
      // await fetch('/api/freelancer/documents', { method: 'POST', body: formData });

      // Navigate back to client detail page
      router.push(`/freelancer/clients/${clientId}`);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/freelancer/clients/${clientId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to client
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Upload document</h1>
        <p className="mt-2 text-sm text-slate-600">
          Add organizational documents needed for grant proposals.
        </p>
      </div>

      {/* Upload Form */}
      <Card className="border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Select file
            </label>
            <div className="mt-2">
              <label
                htmlFor="file-upload"
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition",
                  selectedFile
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
                )}
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle2 className="h-10 w-10 text-blue-600" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedFile(null);
                      }}
                    >
                      Choose different file
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-10 w-10 text-slate-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-900">
                        Click to upload or drag and drop
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        PDF, DOC, DOCX, XLS, XLSX (max 10MB)
                      </p>
                    </div>
                  </div>
                )}
                <input
                  id="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
              </label>
            </div>
          </div>

          {/* Document Name */}
          <div>
            <label htmlFor="document-name" className="block text-sm font-semibold text-slate-900">
              Document name
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Use a clear, descriptive name (e.g., "Audited Financials FY23")
            </p>
            <Input
              id="document-name"
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Enter document name"
              className="mt-2"
              required
            />
          </div>

          {/* Document Status */}
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Document status
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Mark the current state of this document
            </p>
            <div className="mt-3 grid gap-3">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition",
                    documentStatus === option.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={documentStatus === option.value}
                    onChange={(e) => setDocumentStatus(e.target.value as DocumentStatus)}
                    className="mt-1 h-4 w-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{option.label}</p>
                    <p className="mt-1 text-xs text-slate-600">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/freelancer/clients/${clientId}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedFile || !documentName || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Upload document
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Help Text */}
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Document types</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>IRS 501(c)(3) Determination Letter</li>
          <li>Audited Financial Statements</li>
          <li>Form 990 Tax Returns</li>
          <li>Board Roster & Conflict of Interest Policies</li>
          <li>Strategic Plans & Impact Reports</li>
          <li>Insurance Certificates</li>
          <li>Partnership MOUs & Letters of Support</li>
        </ul>
      </div>
    </div>
  );
}
