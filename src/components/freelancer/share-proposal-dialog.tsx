"use client";

import { useState } from "react";
import { X, Mail, User, Briefcase, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ShareProposalDialogProps {
  proposalId: string;
  proposalTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onShare: (data: ShareFormData) => Promise<void>;
  onSkip: () => Promise<void>;
}

export interface ShareFormData {
  reviewerName: string;
  reviewerEmail: string;
  reviewerRelationship: string;
  message?: string;
}

export function ShareProposalDialog({
  proposalId,
  proposalTitle,
  isOpen,
  onClose,
  onShare,
  onSkip,
}: ShareProposalDialogProps) {
  const [formData, setFormData] = useState<ShareFormData>({
    reviewerName: "",
    reviewerEmail: "",
    reviewerRelationship: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onShare(formData);
      // onClose will be called by parent after successful submission
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share proposal");
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      await onSkip();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit proposal");
      setIsSkipping(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isSkipping) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl border-slate-200 bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-slate-900">Share for Review</h2>
            <p className="mt-1 text-sm text-slate-600">
              Would you like to share &quot;{proposalTitle}&quot; with someone for feedback?
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting || isSkipping}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Reviewer Name */}
          <div>
            <label htmlFor="reviewer-name" className="block text-sm font-medium text-slate-900">
              Reviewer Name <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="reviewer-name"
                type="text"
                required
                value={formData.reviewerName}
                onChange={(e) => setFormData({ ...formData, reviewerName: e.target.value })}
                placeholder="John Smith"
                className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Reviewer Email */}
          <div>
            <label htmlFor="reviewer-email" className="block text-sm font-medium text-slate-900">
              Reviewer Email <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="reviewer-email"
                type="email"
                required
                value={formData.reviewerEmail}
                onChange={(e) => setFormData({ ...formData, reviewerEmail: e.target.value })}
                placeholder="john@example.com"
                className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Relationship */}
          <div>
            <label htmlFor="reviewer-relationship" className="block text-sm font-medium text-slate-900">
              Relationship to Proposal <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                id="reviewer-relationship"
                required
                value={formData.reviewerRelationship}
                onChange={(e) => setFormData({ ...formData, reviewerRelationship: e.target.value })}
                className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
              >
                <option value="">Select a relationship...</option>
                <option value="client">Client Representative</option>
                <option value="supervisor">Supervisor</option>
                <option value="colleague">Colleague</option>
                <option value="consultant">Consultant</option>
                <option value="subject_matter_expert">Subject Matter Expert</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Optional Message */}
          <div>
            <label htmlFor="reviewer-message" className="block text-sm font-medium text-slate-900">
              Personal Message <span className="text-slate-500 text-xs">(Optional)</span>
            </label>
            <textarea
              id="reviewer-message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Add a personal note to your reviewer..."
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-900">
              <strong>What happens next:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-blue-800">
              <li>• The reviewer will receive an email with a secure link</li>
              <li>• They can view the proposal and leave comments</li>
              <li>• You&apos;ll be able to see and respond to their feedback</li>
              <li>• You can revoke access at any time</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSkip}
              disabled={isSubmitting || isSkipping}
              className="flex-1 sm:flex-none"
            >
              {isSkipping ? "Submitting..." : "Skip for Now"}
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting || isSkipping}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isSkipping}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Share & Submit
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
