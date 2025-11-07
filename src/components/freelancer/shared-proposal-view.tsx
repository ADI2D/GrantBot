"use client";

import { useState } from "react";
import { MessageSquare, Calendar, User, AlertCircle, CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Comment {
  id: string;
  author_name: string;
  author_email: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  status: string;
}

interface SharedProposalViewProps {
  proposal: {
    id: string;
    clientName: string;
    title: string;
    status: string;
    dueDate: string | null;
    content: string;
    updatedAt: string;
  };
  share: {
    id: string;
    reviewerName: string;
    canComment: boolean;
    expiresAt: string | null;
  };
  comments: Comment[];
  shareToken: string;
}

export function SharedProposalView({
  proposal,
  share,
  comments: initialComments,
  shareToken,
}: SharedProposalViewProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !share.canComment) return;

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/proposals/shared/${shareToken}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          authorName: share.reviewerName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit comment");
      }

      const { comment } = await response.json();
      setComments([...comments, comment]);
      setNewComment("");
      setSuccess("Comment submitted successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isExpired = share.expiresAt && new Date(share.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">{proposal.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Client: {proposal.clientName}</span>
                </div>
                {proposal.dueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {formatDate(proposal.dueDate)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {proposal.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reviewer Info */}
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-900">
              <strong>Reviewing as:</strong> {share.reviewerName}
            </p>
            {share.expiresAt && (
              <p className="mt-1 text-xs text-blue-700">
                {isExpired ? (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    This share link has expired
                  </span>
                ) : (
                  <span>This link expires on {formatDate(share.expiresAt)}</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Proposal Content */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card className="border-slate-200 bg-white p-8 shadow-sm">
          <div
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: proposal.content }}
          />
        </Card>

        {/* Comments Section */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-600" />
            <h2 className="text-xl font-semibold text-slate-900">
              Comments ({comments.length})
            </h2>
          </div>

          {/* Existing Comments */}
          {comments.length > 0 && (
            <div className="space-y-4 mb-6">
              {comments.map((comment) => (
                <Card key={comment.id} className="border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {comment.author_name}
                        </span>
                        {comment.status === "acknowledged" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            <CheckCircle className="h-3 w-3" />
                            Acknowledged
                          </span>
                        )}
                        {comment.status === "resolved" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                            <CheckCircle className="h-3 w-3" />
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* New Comment Form */}
          {share.canComment && !isExpired && (
            <Card className="border-slate-200 bg-white p-4">
              <form onSubmit={handleSubmitComment}>
                <label htmlFor="comment" className="block text-sm font-medium text-slate-900 mb-2">
                  Add your feedback
                </label>
                <textarea
                  id="comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or questions..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  disabled={isSubmitting}
                />

                {error && (
                  <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2 text-sm text-red-800">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mt-2 rounded-lg bg-green-50 border border-green-200 p-2 text-sm text-green-800">
                    {success}
                  </div>
                )}

                <div className="mt-3 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Comment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {!share.canComment && (
            <Card className="border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-600">
                Commenting has been disabled for this proposal.
              </p>
            </Card>
          )}

          {isExpired && (
            <Card className="border-red-200 bg-red-50 p-4 text-center">
              <p className="text-sm text-red-800">
                This share link has expired. You can no longer leave comments.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
