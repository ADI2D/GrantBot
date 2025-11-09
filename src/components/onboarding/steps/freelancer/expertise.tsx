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

type Certification = {
  name: string;
  issuer: string;
  year: string;
};

export default function ExpertiseStep({ data, updateData }: StepProps) {
  const [formState, setFormState] = useState({
    specializations: data.specializations || [],
    certifications: data.certifications || [],
    success_rate: data.success_rate || "",
  });

  const [newCert, setNewCert] = useState<Certification>({
    name: "",
    issuer: "",
    year: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    updateData(formState);
  }, [formState]);

  const toggleSpecialization = (areaId: string) => {
    setFormState((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(areaId)
        ? prev.specializations.filter((id: string) => id !== areaId)
        : [...prev.specializations, areaId],
    }));
  };

  const addCertification = () => {
    if (newCert.name && newCert.issuer) {
      setFormState((prev) => ({
        ...prev,
        certifications: [...prev.certifications, { ...newCert }],
      }));
      setNewCert({ name: "", issuer: "", year: new Date().getFullYear().toString() });
    }
  };

  const removeCertification = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_: any, i: number) => i !== index),
    }));
  };

  return (
    <div className="space-y-8">
      {/* Specializations */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Focus Area Specializations <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-slate-600 mb-4">
          Select the focus areas where you have the most expertise. This helps match you with relevant clients.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FOCUS_AREAS.map((area) => {
            const isSelected = formState.specializations.includes(area.id);
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => toggleSpecialization(area.id)}
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

      {/* Success Rate */}
      <div>
        <label htmlFor="success_rate" className="block text-sm font-medium text-slate-700 mb-2">
          Success Rate
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="number"
              id="success_rate"
              value={formState.success_rate}
              onChange={(e) => setFormState((prev) => ({ ...prev, success_rate: e.target.value }))}
              placeholder="75"
              min="0"
              max="100"
              step="1"
              className="w-full pr-10 pl-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
          </div>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          Percentage of grants you've written that were successfully funded
        </p>
      </div>

      {/* Certifications */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Certifications & Credentials
        </label>
        <p className="text-sm text-slate-600 mb-4">
          Add any relevant certifications, training, or credentials (optional but recommended)
        </p>

        {formState.certifications.length > 0 && (
          <div className="mb-4 space-y-2">
            {formState.certifications.map((cert: Certification, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{cert.name}</p>
                  <p className="text-sm text-slate-600">
                    {cert.issuer} • {cert.year}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeCertification(index)}
                  className="ml-4 p-2 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-lg space-y-3">
          <input
            type="text"
            value={newCert.name}
            onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
            placeholder="Certification name (e.g., Grant Professional Certified)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newCert.issuer}
              onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
              placeholder="Issuing organization"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <select
              value={newCert.year}
              onChange={(e) => setNewCert({ ...newCert, year: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {Array.from({ length: 30 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
          <button
            type="button"
            onClick={addCertification}
            disabled={!newCert.name || !newCert.issuer}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Certification
          </button>
        </div>
      </div>

      {/* Helper text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">Showcase Your Expertise</p>
            <p className="text-sm text-blue-800">
              Highlighting your specialized knowledge and credentials helps nonprofits find the right fit for their needs and increases your credibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
