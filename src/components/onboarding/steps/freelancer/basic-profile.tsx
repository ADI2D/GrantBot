"use client";

import { useState, useEffect } from "react";
import type { StepProps } from "../../onboarding-wizard";

export default function BasicProfileStep({ data, updateData }: StepProps) {
  const [formState, setFormState] = useState({
    full_name: data.full_name || "",
    headline: data.headline || "",
    bio: data.bio || "",
    hourly_rate: data.hourly_rate || "",
    years_experience: data.years_experience || "",
  });

  useEffect(() => {
    updateData(formState);
  }, [formState]);

  const handleChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Full Name */}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-slate-700 mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="full_name"
          value={formState.full_name}
          onChange={(e) => handleChange("full_name", e.target.value)}
          placeholder="Jane Doe"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Headline */}
      <div>
        <label htmlFor="headline" className="block text-sm font-medium text-slate-700 mb-2">
          Professional Headline <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="headline"
          value={formState.headline}
          onChange={(e) => handleChange("headline", e.target.value)}
          placeholder="Experienced Grant Writer | Health & Education Specialist"
          maxLength={100}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <p className="mt-1.5 text-xs text-slate-500">
          A brief, compelling summary of your expertise (max 100 characters)
        </p>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-2">
          Professional Bio <span className="text-red-500">*</span>
        </label>
        <textarea
          id="bio"
          value={formState.bio}
          onChange={(e) => handleChange("bio", e.target.value)}
          placeholder="Tell potential clients about your background, experience, and what makes you unique as a grant writer..."
          rows={6}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          required
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Share your background, achievements, and approach to grant writing
        </p>
      </div>

      {/* Years of Experience */}
      <div>
        <label htmlFor="years_experience" className="block text-sm font-medium text-slate-700 mb-2">
          Years of Experience
        </label>
        <input
          type="number"
          id="years_experience"
          value={formState.years_experience}
          onChange={(e) => handleChange("years_experience", e.target.value)}
          placeholder="5"
          min="0"
          max="50"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Total years working as a grant writer or in related fields
        </p>
      </div>

      {/* Hourly Rate */}
      <div>
        <label htmlFor="hourly_rate" className="block text-sm font-medium text-slate-700 mb-2">
          Hourly Rate
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
          <input
            type="number"
            id="hourly_rate"
            value={formState.hourly_rate}
            onChange={(e) => handleChange("hourly_rate", e.target.value)}
            placeholder="75"
            min="0"
            step="5"
            className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            / hour
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          Your standard hourly rate for grant writing services
        </p>
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
            <p className="text-sm font-medium text-blue-900 mb-1">Build Your Professional Profile</p>
            <p className="text-sm text-blue-800">
              Your profile helps nonprofits find and hire you. A complete, detailed profile increases
              your visibility and credibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
