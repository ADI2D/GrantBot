"use client";

import { useState, useEffect } from "react";
import type { StepProps } from "../../onboarding-wizard";

type Program = {
  name: string;
  description: string;
  budget: number;
};

type ImpactMetric = {
  metric: string;
  value: string;
  timeframe: string;
};

export default function ProgramsMetricsStep({ data, updateData }: StepProps) {
  const [formState, setFormState] = useState({
    programs: data.programs || [],
    impact_metrics: data.impact_metrics || [],
    target_demographics: data.target_demographics || [],
  });

  const [newProgram, setNewProgram] = useState<Program>({
    name: "",
    description: "",
    budget: 0,
  });

  const [newMetric, setNewMetric] = useState<ImpactMetric>({
    metric: "",
    value: "",
    timeframe: "annually",
  });

  const [newDemographic, setNewDemographic] = useState("");

  useEffect(() => {
    updateData(formState);
  }, [formState]);

  const addProgram = () => {
    if (newProgram.name && newProgram.description) {
      setFormState((prev) => ({
        ...prev,
        programs: [...prev.programs, { ...newProgram }],
      }));
      setNewProgram({ name: "", description: "", budget: 0 });
    }
  };

  const removeProgram = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      programs: prev.programs.filter((_: any, i: number) => i !== index),
    }));
  };

  const addMetric = () => {
    if (newMetric.metric && newMetric.value) {
      setFormState((prev) => ({
        ...prev,
        impact_metrics: [...prev.impact_metrics, { ...newMetric }],
      }));
      setNewMetric({ metric: "", value: "", timeframe: "annually" });
    }
  };

  const removeMetric = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      impact_metrics: prev.impact_metrics.filter((_: any, i: number) => i !== index),
    }));
  };

  const addDemographic = () => {
    if (newDemographic.trim()) {
      setFormState((prev) => ({
        ...prev,
        target_demographics: [...prev.target_demographics, newDemographic.trim()],
      }));
      setNewDemographic("");
    }
  };

  const removeDemographic = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      target_demographics: prev.target_demographics.filter((_: any, i: number) => i !== index),
    }));
  };

  return (
    <div className="space-y-8">
      {/* Programs */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Programs & Services
        </label>
        <p className="text-sm text-slate-600 mb-4">
          Describe the main programs or services your organization offers.
        </p>

        {formState.programs.length > 0 && (
          <div className="mb-4 space-y-3">
            {formState.programs.map((program: Program, index: number) => (
              <div
                key={index}
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-slate-900">{program.name}</h4>
                  <button
                    type="button"
                    onClick={() => removeProgram(index)}
                    className="ml-4 p-1 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-slate-600 mb-2">{program.description}</p>
                {program.budget > 0 && (
                  <p className="text-xs text-slate-500">
                    Budget: ${program.budget.toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-lg space-y-3">
          <input
            type="text"
            value={newProgram.name}
            onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
            placeholder="Program name"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <textarea
            value={newProgram.description}
            onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
            placeholder="Brief description of this program"
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          />
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                $
              </span>
              <input
                type="number"
                value={newProgram.budget || ""}
                onChange={(e) => setNewProgram({ ...newProgram, budget: Number(e.target.value) })}
                placeholder="Annual program budget (optional)"
                min="0"
                step="1000"
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={addProgram}
              disabled={!newProgram.name || !newProgram.description}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Program
            </button>
          </div>
        </div>
      </div>

      {/* Impact Metrics */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Impact Metrics
        </label>
        <p className="text-sm text-slate-600 mb-4">
          Quantify your organization's impact with specific metrics.
        </p>

        {formState.impact_metrics.length > 0 && (
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {formState.impact_metrics.map((metric: ImpactMetric, index: number) => (
              <div
                key={index}
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg relative"
              >
                <button
                  type="button"
                  onClick={() => removeMetric(index)}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <p className="text-2xl font-bold text-blue-600 mb-1">{metric.value}</p>
                <p className="text-sm font-medium text-slate-900">{metric.metric}</p>
                <p className="text-xs text-slate-500 capitalize">{metric.timeframe}</p>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-lg space-y-3">
          <input
            type="text"
            value={newMetric.metric}
            onChange={(e) => setNewMetric({ ...newMetric, metric: e.target.value })}
            placeholder="Metric name (e.g., 'Students served', 'Meals provided')"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newMetric.value}
              onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })}
              placeholder="Value (e.g., '1,200')"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <select
              value={newMetric.timeframe}
              onChange={(e) => setNewMetric({ ...newMetric, timeframe: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="annually">Annually</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="to-date">To Date</option>
            </select>
          </div>
          <button
            type="button"
            onClick={addMetric}
            disabled={!newMetric.metric || !newMetric.value}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Metric
          </button>
        </div>
      </div>

      {/* Target Demographics */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Target Demographics
        </label>
        <p className="text-sm text-slate-600 mb-4">
          Who does your organization primarily serve?
        </p>

        {formState.target_demographics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {formState.target_demographics.map((demographic: string, index: number) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-900 rounded-full text-sm"
              >
                <span>{demographic}</span>
                <button
                  type="button"
                  onClick={() => removeDemographic(index)}
                  className="hover:text-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <div className="flex gap-2">
          <input
            type="text"
            value={newDemographic}
            onChange={(e) => setNewDemographic(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addDemographic())}
            placeholder="e.g., 'Low-income families', 'Youth ages 13-18'"
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="button"
            onClick={addDemographic}
            disabled={!newDemographic.trim()}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
