"use client";

import { useState, useEffect } from "react";
import { MessageSquare, CheckCircle, X, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Comment {
  id: string;
  author_name: string;
  author_email: string;
  content: string;
  created_at: string;
  status: "pending" | "acknowledged" | "resolved" | "dismissed";
  share_id: string | null;
}

interface ProposalCommentsPanelProps {
  proposalId: string;
  className?: string;
}

export function ProposalCommentsPanel({ proposalId, className = "" }: ProposalCommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [proposalId]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/freelancer/proposals/${proposalId}/comments`);

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  };

  const updateCommentStatus = async (commentId: string, status: Comment["status"]) => {
    try {
      setUpdatingId(commentId);
      const response = await fetch(`/api/freelancer/proposals/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update comment");
      }

      // Update local state
      setComments(
        comments.map((c) =>
          c.id === commentId ? { ...c, status } : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update comment");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: Comment["status"]) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
            <AlertCircle className="h-3 w-3" />
            Pending
          </span>
        );
      case "acknowledged":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            <CheckCircle className="h-3 w-3" />
            Acknowledged
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle className="h-3 w-3" />
            Resolved
          </span>
        );
      case "dismissed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            <X className="h-3 w-3" />
            Dismissed
          </span>
        );
    }
  };

  const pendingCount = comments.filter((c) => c.status === "pending").length;

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-slate-200 bg-white p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Reviewer Feedback
            </h3>
            {pendingCount > 0 && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                {pendingCount} pending
              </span>
            )}
          </div>
          <span className="text-sm text-slate-500">{comments.length} total</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="divide-y divide-slate-100">
        {comments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              No feedback yet. Share your proposal to receive comments.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900">
                      {comment.author_name}
                    </span>
                    {getStatusBadge(comment.status)}
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">
                    {comment.content}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(comment.created_at)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              {comment.status === "pending" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateCommentStatus(comment.id, "acknowledged")}
                    disabled={updatingId === comment.id}
                    className="text-xs"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Acknowledge
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateCommentStatus(comment.id, "resolved")}
                    disabled={updatingId === comment.id}
                    className="text-xs"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Mark Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateCommentStatus(comment.id, "dismissed")}
                    disabled={updatingId === comment.id}
                    className="text-xs text-slate-600"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Dismiss
                  </Button>
                </div>
              )}

              {comment.status !== "pending" && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateCommentStatus(comment.id, "pending")}
                    disabled={updatingId === comment.id}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Mark as Pending
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
