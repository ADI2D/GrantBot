"use client";

import { useState, useRef, FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadCloud, File, Download, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { DocumentMeta } from "@/types/api";

type FileUploadProps = {
  orgId: string;
  documents: DocumentMeta[];
  onUploadSuccess?: () => void;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return <File className="h-5 w-5" />;
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word")) return "📝";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
  return <File className="h-5 w-5" />;
};

export function FileUpload({ orgId, documents, onUploadSuccess }: FileUploadProps) {
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (payload: { file: File; title: string }) => {
      const formData = new FormData();
      formData.append("file", payload.file);
      formData.append("title", payload.title || payload.file.name);
      formData.append("status", "Ready");

      const response = await fetch(`/api/documents/upload?orgId=${orgId}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      setTitle("");
      setSelectedFile(null);
      setUploadProgress("Upload successful!");
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", orgId] });
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploadSuccess?.();
      setTimeout(() => setUploadProgress(null), 3000);
    },
    onError: (error) => {
      setUploadProgress(`Error: ${error instanceof Error ? error.message : "Upload failed"}`);
      setTimeout(() => setUploadProgress(null), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const response = await fetch(`/api/documents/delete?orgId=${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    setUploadProgress("Uploading...");
    uploadMutation.mutate({ file: selectedFile, title: title || selectedFile.name });
  };

  const handleDownload = async (doc: DocumentMeta) => {
    if (!doc.filePath) return;

    try {
      const response = await fetch(
        `/api/documents/download?orgId=${orgId}&filePath=${encodeURIComponent(doc.filePath)}`
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const { signedUrl } = await response.json();
      window.open(signedUrl, "_blank");
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Document vault</p>
          <p className="text-xs text-slate-500">
            Upload compliance artifacts (IRS 990, financials, board docs, etc.)
          </p>
        </div>
        <Badge tone="info">{documents.length} uploaded</Badge>
      </div>

      {/* Upload Form */}
      <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Document title (e.g., IRS 990 FY23)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
          />
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.txt"
            className="hidden"
            id="file-upload"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFile ? "Change file" : "Choose file"}
          </Button>
        </div>

        {selectedFile && (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getFileIcon(selectedFile.type)}</span>
              <div>
                <p className="font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={uploadMutation.isPending}
              onClick={handleUpload}
              className="gap-2"
            >
              <UploadCloud className="h-4 w-4" />
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </div>
        )}

        {uploadProgress && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              uploadProgress.startsWith("Error")
                ? "bg-rose-50 text-rose-700"
                : uploadProgress.includes("successful")
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-blue-50 text-blue-700"
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            {uploadProgress}
          </div>
        )}
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {documents.length === 0 && (
          <p className="text-center text-xs text-slate-500 py-4">
            No documents uploaded yet. Upload your first document above.
          </p>
        )}
        {documents.map((doc, index) => (
          <div
            key={doc.filePath || doc.title || index}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2.5"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-lg flex-shrink-0">{getFileIcon(doc.mimeType)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 truncate">{doc.title}</p>
                <p className="text-xs text-slate-500">
                  {doc.status || "Ready"}
                  {doc.fileSize && ` • ${formatFileSize(doc.fileSize)}`}
                  {doc.uploadedAt &&
                    ` • ${new Date(doc.uploadedAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {doc.filePath && (
                <button
                  type="button"
                  className="text-slate-400 hover:text-blue-600 transition-colors"
                  onClick={() => handleDownload(doc)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                className="text-slate-400 hover:text-rose-500 transition-colors"
                onClick={() => {
                  if (confirm(`Delete "${doc.title}"?`)) {
                    deleteMutation.mutate(doc.filePath || doc.title);
                  }
                }}
                disabled={deleteMutation.isPending}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
