"use client";

import { useState, useEffect } from "react";
import type { StepProps } from "../../onboarding-wizard";

export default function BasicInfoStep({ data, updateData }: StepProps) {
  const [formState, setFormState] = useState({
    name: data.name || "",
    ein: data.ein || "",
    founded_year: data.founded_year || "",
    staff_size: data.staff_size || "",
    website: data.website || "",
  });

  useEffect(() => {
    updateData(formState);
  }, [formState]);

  const handleChange = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Organization Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
          Organization Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={formState.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Acme Nonprofit Foundation"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* EIN */}
      <div>
        <label htmlFor="ein" className="block text-sm font-medium text-slate-700 mb-2">
          Tax ID / EIN
          <span className="text-slate-500 text-xs ml-2">(Employer Identification Number)</span>
        </label>
        <input
          type="text"
          id="ein"
          value={formState.ein}
          onChange={(e) => handleChange("ein", e.target.value)}
          placeholder="12-3456789"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Your 9-digit federal tax ID number (format: XX-XXXXXXX)
        </p>
      </div>

      {/* Founded Year */}
      <div>
        <label htmlFor="founded_year" className="block text-sm font-medium text-slate-700 mb-2">
          Year Founded
        </label>
        <input
          type="number"
          id="founded_year"
          value={formState.founded_year}
          onChange={(e) => handleChange("founded_year", e.target.value)}
          placeholder="2020"
          min="1800"
          max={new Date().getFullYear()}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Staff Size */}
      <div>
        <label htmlFor="staff_size" className="block text-sm font-medium text-slate-700 mb-2">
          Organization Size
        </label>
        <select
          id="staff_size"
          value={formState.staff_size}
          onChange={(e) => handleChange("staff_size", e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select size</option>
          <option value="solo">Solo (1 person)</option>
          <option value="small">Small (2-10 staff)</option>
          <option value="medium">Medium (11-50 staff)</option>
          <option value="large">Large (50+ staff)</option>
        </select>
      </div>

      {/* Website */}
      <div>
        <label htmlFor="website" className="block text-sm font-medium text-slate-700 mb-2">
          Website
        </label>
        <input
          type="url"
          id="website"
          value={formState.website}
          onChange={(e) => handleChange("website", e.target.value)}
          placeholder="https://yourorganization.org"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Helper text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">Why we ask for this</p>
            <p className="text-sm text-blue-800">
              Basic information helps us understand your organization and match you with relevant grant opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
