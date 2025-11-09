"use client";

import { useState, useEffect } from "react";
import type { StepProps } from "../../onboarding-wizard";

type PastFunder = {
  name: string;
  amount: number;
  year: string;
};

export default function BudgetFinanceStep({ data, updateData }: StepProps) {
  const [formState, setFormState] = useState({
    annual_budget: data.annual_budget || "",
    past_funders: data.past_funders || [],
  });

  const [newFunder, setNewFunder] = useState<PastFunder>({
    name: "",
    amount: 0,
    year: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    updateData(formState);
  }, [formState]);

  const handleChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const addFunder = () => {
    if (newFunder.name && newFunder.amount > 0) {
      setFormState((prev) => ({
        ...prev,
        past_funders: [...prev.past_funders, { ...newFunder }],
      }));
      setNewFunder({ name: "", amount: 0, year: new Date().getFullYear().toString() });
    }
  };

  const removeFunder = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      past_funders: prev.past_funders.filter((_: any, i: number) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Annual Budget */}
      <div>
        <label htmlFor="annual_budget" className="block text-sm font-medium text-slate-700 mb-2">
          Annual Operating Budget
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
          <input
            type="number"
            id="annual_budget"
            value={formState.annual_budget}
            onChange={(e) => handleChange("annual_budget", e.target.value)}
            placeholder="250000"
            min="0"
            step="1000"
            className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          Your organization's total annual operating budget
        </p>
      </div>

      {/* Past Funders */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Past Grants & Funders
        </label>
        <p className="text-sm text-slate-600 mb-4">
          Add grants you've previously received. This helps us understand your funding history.
        </p>

        {/* Funder List */}
        {formState.past_funders.length > 0 && (
          <div className="mb-4 space-y-2">
            {formState.past_funders.map((funder: PastFunder, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{funder.name}</p>
                  <p className="text-sm text-slate-600">
                    ${funder.amount.toLocaleString()} • {funder.year}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFunder(index)}
                  className="ml-4 p-2 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Funder */}
        <div className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={newFunder.name}
                onChange={(e) => setNewFunder({ ...newFunder, name: e.target.value })}
                placeholder="Funder name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <select
                value={newFunder.year}
                onChange={(e) => setNewFunder({ ...newFunder, year: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                $
              </span>
              <input
                type="number"
                value={newFunder.amount || ""}
                onChange={(e) => setNewFunder({ ...newFunder, amount: Number(e.target.value) })}
                placeholder="Amount"
                min="0"
                step="1000"
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              type="button"
              onClick={addFunder}
              disabled={!newFunder.name || newFunder.amount <= 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
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
            <p className="text-sm font-medium text-blue-900 mb-1">Financial Information</p>
            <p className="text-sm text-blue-800">
              Your budget and funding history help us match you with appropriately-sized grant
              opportunities and demonstrate your track record to potential funders.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
