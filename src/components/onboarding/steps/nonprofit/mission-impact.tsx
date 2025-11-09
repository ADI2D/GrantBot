"use client";

import { useState, useEffect } from "react";
import type { StepProps } from "../../onboarding-wizard";

const FOCUS_AREAS = [
  { id: "health", label: "Health & Wellness" },
  { id: "education", label: "Education" },
  { id: "arts-culture", label: "Arts & Culture" },
  { id: "environment", label: "Environment & Sustainability" },
  { id: "human-services", label: "Human Services" },
  { id: "youth-development", label: "Youth Development" },
  { id: "community-development", label: "Community Development" },
  { id: "research-science", label: "Research & Science" },
  { id: "international", label: "International Aid" },
  { id: "other", label: "Other" },
];

const GEOGRAPHIC_SCOPES = [
  { value: "local", label: "Local (City/County)" },
  { value: "regional", label: "Regional (Multi-county/State)" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

export default function MissionImpactStep({ data, updateData }: StepProps) {
  const [formState, setFormState] = useState({
    mission: data.mission || "",
    impact_summary: data.impact_summary || "",
    differentiator: data.differentiator || "",
    focus_areas: data.focus_areas || [],
    geographic_scope: data.geographic_scope || "",
  });

  useEffect(() => {
    updateData(formState);
  }, [formState]);

  const handleChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFocusArea = (areaId: string) => {
    setFormState((prev) => ({
      ...prev,
      focus_areas: prev.focus_areas.includes(areaId)
        ? prev.focus_areas.filter((id: string) => id !== areaId)
        : [...prev.focus_areas, areaId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Mission Statement */}
      <div>
        <label htmlFor="mission" className="block text-sm font-medium text-slate-700 mb-2">
          Mission Statement <span className="text-red-500">*</span>
        </label>
        <textarea
          id="mission"
          value={formState.mission}
          onChange={(e) => handleChange("mission", e.target.value)}
          placeholder="Describe your organization's mission and purpose..."
          rows={4}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          required
        />
        <p className="mt-1.5 text-xs text-slate-500">
          A clear, concise statement of what your organization aims to accomplish
        </p>
      </div>

      {/* Focus Areas */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Focus Areas <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-slate-600 mb-3">
          Select all areas that apply to your work. This helps us match you with relevant grants.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FOCUS_AREAS.map((area) => {
            const isSelected = formState.focus_areas.includes(area.id);
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => toggleFocusArea(area.id)}
                className={`flex items-center gap-3 px-4 py-3 border-2 rounded-lg text-left transition-all ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">{area.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Geographic Scope */}
      <div>
        <label htmlFor="geographic_scope" className="block text-sm font-medium text-slate-700 mb-2">
          Geographic Scope
        </label>
        <select
          id="geographic_scope"
          value={formState.geographic_scope}
          onChange={(e) => handleChange("geographic_scope", e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select scope</option>
          {GEOGRAPHIC_SCOPES.map((scope) => (
            <option key={scope.value} value={scope.value}>
              {scope.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-slate-500">
          The primary geographic area your organization serves
        </p>
      </div>

      {/* Impact Summary */}
      <div>
        <label htmlFor="impact_summary" className="block text-sm font-medium text-slate-700 mb-2">
          Impact Summary
        </label>
        <textarea
          id="impact_summary"
          value={formState.impact_summary}
          onChange={(e) => handleChange("impact_summary", e.target.value)}
          placeholder="What impact has your organization made? (e.g., people served, programs delivered, outcomes achieved)"
          rows={4}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Share key accomplishments and measurable outcomes
        </p>
      </div>

      {/* Differentiator */}
      <div>
        <label htmlFor="differentiator" className="block text-sm font-medium text-slate-700 mb-2">
          What Makes You Unique?
        </label>
        <textarea
          id="differentiator"
          value={formState.differentiator}
          onChange={(e) => handleChange("differentiator", e.target.value)}
          placeholder="What sets your organization apart from others doing similar work?"
          rows={3}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Your unique approach, methodology, or competitive advantage
        </p>
      </div>
    </div>
  );
}
