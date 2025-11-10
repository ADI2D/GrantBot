"use client";

import { useState } from "react";
import { X, Check, MessageSquare, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type InlineComment = {
  id: string;
  userName: string;
  userEmail: string | null;
  commentText: string;
  selectionStart: number;
  selectionEnd: number;
  selectedText: string;
  resolved: boolean;
  createdAt: string;
};

type InlineCommentThreadProps = {
  comment: InlineComment;
  onResolve: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  isOwner?: boolean;
  className?: string;
};

export function InlineCommentThread({
  comment,
  onResolve,
  onDelete,
  isOwner = false,
  className,
}: InlineCommentThreadProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
        comment.resolved && "border-green-200 bg-green-50/30",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
              {comment.userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{comment.userName}</p>
              <p className="text-xs text-slate-500">
                {new Date(comment.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {comment.resolved && (
            <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <Check className="h-3 w-3" />
              Resolved
            </div>
          )}

          {!comment.resolved && (
            <button
              onClick={() => onResolve(comment.id)}
              className="rounded p-1 text-slate-400 transition-colors hover:bg-green-100 hover:text-green-600"
              title="Resolve comment"
            >
              <Check className="h-4 w-4" />
            </button>
          )}

          {isOwner && onDelete && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <button
                    onClick={() => {
                      onDelete(comment.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected text */}
      <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm">
        <p className="text-xs font-medium text-slate-500">Selected text:</p>
        <p className="mt-1 italic text-slate-700">"{comment.selectedText}"</p>
      </div>

      {/* Comment text */}
      <div className="mt-3 text-sm text-slate-900">
        {comment.commentText}
      </div>
    </div>
  );
}

type NewCommentFormProps = {
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  onSubmit: (commentText: string) => void;
  onCancel: () => void;
};

export function NewCommentForm({
  selectedText,
  selectionStart,
  selectionEnd,
  onSubmit,
  onCancel,
}: NewCommentFormProps) {
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(commentText.trim());
      setCommentText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-blue-900">New comment</p>
        </div>
      </div>

      {/* Selected text preview */}
      <div className="mt-2 rounded-md bg-white px-3 py-2 text-sm">
        <p className="text-xs font-medium text-slate-500">Selected text:</p>
        <p className="mt-1 italic text-slate-700">"{selectedText}"</p>
      </div>

      {/* Comment input */}
      <Textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Add your comment..."
        rows={3}
        className="mt-3 text-sm"
        autoFocus
      />

      {/* Actions */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!commentText.trim() || isSubmitting}
        >
          {isSubmitting ? "Posting..." : "Post Comment"}
        </Button>
      </div>
    </form>
  );
}
