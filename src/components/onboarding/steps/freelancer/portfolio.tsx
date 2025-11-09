"use client";

import { useState, useEffect } from "react";
import type { StepProps } from "../../onboarding-wizard";

type PortfolioItem = {
  title: string;
  description: string;
  amount_raised: number;
  funder: string;
  year: string;
};

export default function PortfolioStep({ data, updateData }: StepProps) {
  const [formState, setFormState] = useState({
    portfolio_items: data.portfolio_items || [],
    total_grants_written: data.total_grants_written || "",
    total_amount_raised: data.total_amount_raised || "",
  });

  const [newItem, setNewItem] = useState<PortfolioItem>({
    title: "",
    description: "",
    amount_raised: 0,
    funder: "",
    year: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    updateData(formState);
  }, [formState]);

  const handleChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const addPortfolioItem = () => {
    if (newItem.title && newItem.funder && newItem.amount_raised > 0) {
      setFormState((prev) => ({
        ...prev,
        portfolio_items: [...prev.portfolio_items, { ...newItem }],
      }));
      setNewItem({
        title: "",
        description: "",
        amount_raised: 0,
        funder: "",
        year: new Date().getFullYear().toString(),
      });
    }
  };

  const removePortfolioItem = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      portfolio_items: prev.portfolio_items.filter((_: any, i: number) => i !== index),
    }));
  };

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="total_grants_written" className="block text-sm font-medium text-slate-700 mb-2">
            Total Grants Written
          </label>
          <input
            type="number"
            id="total_grants_written"
            value={formState.total_grants_written}
            onChange={(e) => handleChange("total_grants_written", e.target.value)}
            placeholder="25"
            min="0"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Approximate number of grants you've authored
          </p>
        </div>

        <div>
          <label htmlFor="total_amount_raised" className="block text-sm font-medium text-slate-700 mb-2">
            Total Amount Raised
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              id="total_amount_raised"
              value={formState.total_amount_raised}
              onChange={(e) => handleChange("total_amount_raised", e.target.value)}
              placeholder="500000"
              min="0"
              step="1000"
              className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Total funding secured through your grants
          </p>
        </div>
      </div>

      {/* Portfolio Items */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Notable Grants & Projects
        </label>
        <p className="text-sm text-slate-600 mb-4">
          Showcase your best work with specific examples. This helps nonprofits understand your experience.
        </p>

        {formState.portfolio_items.length > 0 && (
          <div className="mb-4 space-y-3">
            {formState.portfolio_items.map((item: PortfolioItem, index: number) => (
              <div
                key={index}
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 mb-1">{item.title}</h4>
                    <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="font-medium text-blue-600">
                        ${item.amount_raised.toLocaleString()}
                      </span>
                      <span>{item.funder}</span>
                      <span>{item.year}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePortfolioItem(index)}
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
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              placeholder="Grant/Project title"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="text"
              value={newItem.funder}
              onChange={(e) => setNewItem({ ...newItem, funder: e.target.value })}
              placeholder="Funder name"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <textarea
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="Brief description of the grant and your role"
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                $
              </span>
              <input
                type="number"
                value={newItem.amount_raised || ""}
                onChange={(e) => setNewItem({ ...newItem, amount_raised: Number(e.target.value) })}
                placeholder="Amount"
                min="0"
                step="1000"
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <select
              value={newItem.year}
              onChange={(e) => setNewItem({ ...newItem, year: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {Array.from({ length: 20 }, (_, i) => {
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
            onClick={addPortfolioItem}
            disabled={!newItem.title || !newItem.funder || newItem.amount_raised <= 0}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Portfolio
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
            <p className="text-sm font-medium text-blue-900 mb-1">Demonstrate Your Track Record</p>
            <p className="text-sm text-blue-800">
              Specific examples of successful grants you've written help nonprofits understand your capabilities and give them confidence in hiring you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
