"use client";

import { useState, useEffect } from "react";
import type { StepProps } from "../../onboarding-wizard";
import DocumentUpload, { type DocumentFile } from "../../document-upload";

export default function DocumentsReviewStep({ data, updateData }: StepProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>(data.documents || []);

  useEffect(() => {
    updateData({ documents });
  }, [documents]);

  const handleUpload = async (files: File[]) => {
    // In a real implementation, this would upload to Supabase Storage
    // For now, we'll create mock DocumentFile objects
    const newDocs: DocumentFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      // In production: url would be the Supabase Storage URL
      url: URL.createObjectURL(file),
    }));

    setDocuments((prev) => [...prev, ...newDocs]);
  };

  const handleRemove = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Document Upload */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Key Documents</h3>
        <p className="text-sm text-slate-600 mb-4">
          Upload important documents that help verify your organization and support grant
          applications. These are optional but highly recommended.
        </p>

        <DocumentUpload
          documents={documents}
          onUpload={handleUpload}
          onRemove={handleRemove}
          multiple={true}
        />

        {/* Suggested Documents */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Suggested Documents:</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              IRS 501(c)(3) Determination Letter
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Annual Financial Statements or Form 990
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Board of Directors List
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Organizational Budget
            </li>
          </ul>
        </div>
      </div>

      {/* Review Summary */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Review Your Information</h3>

        <div className="space-y-4">
          {/* Basic Info */}
          {data.name && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="text-sm font-medium text-slate-900 mb-2">Basic Information</h4>
              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  <span className="font-medium">Organization:</span> {data.name}
                </p>
                {data.ein && (
                  <p>
                    <span className="font-medium">EIN:</span> {data.ein}
                  </p>
                )}
                {data.founded_year && (
                  <p>
                    <span className="font-medium">Founded:</span> {data.founded_year}
                  </p>
                )}
                {data.staff_size && (
                  <p>
                    <span className="font-medium">Size:</span>{" "}
                    {data.staff_size.charAt(0).toUpperCase() + data.staff_size.slice(1)}
                  </p>
                )}
                {data.website && (
                  <p>
                    <span className="font-medium">Website:</span>{" "}
                    <a
                      href={data.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {data.website}
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Mission & Focus */}
          {(data.mission || data.focus_areas?.length > 0) && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="text-sm font-medium text-slate-900 mb-2">Mission & Focus Areas</h4>
              {data.mission && (
                <p className="text-sm text-slate-600 mb-2">{data.mission}</p>
              )}
              {data.focus_areas?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.focus_areas.map((area: string) => (
                    <span
                      key={area}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {area.replace("-", " & ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Budget */}
          {data.annual_budget && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="text-sm font-medium text-slate-900 mb-2">Financial Information</h4>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Annual Budget:</span> $
                {Number(data.annual_budget).toLocaleString()}
              </p>
              {data.past_funders?.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {data.past_funders.length} past funder(s) recorded
                </p>
              )}
            </div>
          )}

          {/* Programs */}
          {data.programs?.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="text-sm font-medium text-slate-900 mb-2">Programs & Services</h4>
              <p className="text-sm text-slate-600">{data.programs.length} program(s) listed</p>
            </div>
          )}

          {/* Impact Metrics */}
          {data.impact_metrics?.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="text-sm font-medium text-slate-900 mb-2">Impact Metrics</h4>
              <p className="text-sm text-slate-600">
                {data.impact_metrics.length} metric(s) recorded
              </p>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="text-sm font-medium text-slate-900 mb-2">Documents</h4>
              <p className="text-sm text-slate-600">{documents.length} document(s) uploaded</p>
            </div>
          )}
        </div>
      </div>

      {/* Final Message */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">You're Almost Done!</h4>
            <p className="text-sm text-slate-700 mb-3">
              Click "Complete Setup" below to finish your onboarding. You'll then have access to:
            </p>
            <ul className="space-y-1 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Personalized grant recommendations
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                AI-powered proposal drafting
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Collaboration tools for your team
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
