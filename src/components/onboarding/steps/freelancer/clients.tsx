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

type Client = {
  client_name: string;
  client_type: string;
  relationship_status: string;
  total_raised: number;
  grants_submitted: number;
  grants_awarded: number;
  notes: string;
  like_us: boolean;
  categories: string[];
};

export default function ClientsStep({ data, updateData }: StepProps) {
  const [formState, setFormState] = useState({
    clients: data.clients || [],
    availability_status: data.availability_status || "available",
    weekly_capacity: data.weekly_capacity || "",
  });

  const [newClient, setNewClient] = useState<Client>({
    client_name: "",
    client_type: "nonprofit",
    relationship_status: "active",
    total_raised: 0,
    grants_submitted: 0,
    grants_awarded: 0,
    notes: "",
    like_us: false,
    categories: [],
  });

  const [showClientForm, setShowClientForm] = useState(false);

  useEffect(() => {
    updateData(formState);
  }, [formState]);

  const handleChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (categoryId: string) => {
    setNewClient((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const addClient = () => {
    if (newClient.client_name) {
      setFormState((prev) => ({
        ...prev,
        clients: [...prev.clients, { ...newClient }],
      }));
      setNewClient({
        client_name: "",
        client_type: "nonprofit",
        relationship_status: "active",
        total_raised: 0,
        grants_submitted: 0,
        grants_awarded: 0,
        notes: "",
        like_us: false,
        categories: [],
      });
      setShowClientForm(false);
    }
  };

  const removeClient = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      clients: prev.clients.filter((_: any, i: number) => i !== index),
    }));
  };

  return (
    <div className="space-y-8">
      {/* Availability */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Availability</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="availability_status" className="block text-sm font-medium text-slate-700 mb-2">
              Current Status
            </label>
            <select
              id="availability_status"
              value={formState.availability_status}
              onChange={(e) => handleChange("availability_status", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="available">Available</option>
              <option value="limited">Limited Availability</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          <div>
            <label htmlFor="weekly_capacity" className="block text-sm font-medium text-slate-700 mb-2">
              Weekly Capacity
            </label>
            <div className="relative">
              <input
                type="number"
                id="weekly_capacity"
                value={formState.weekly_capacity}
                onChange={(e) => handleChange("weekly_capacity", e.target.value)}
                placeholder="20"
                min="0"
                max="168"
                className="w-full pr-16 pl-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                hours/week
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Client List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Your Clients</h3>
            <p className="text-sm text-slate-600 mt-1">
              Add clients you've worked with (optional but helps build credibility)
            </p>
          </div>
          {!showClientForm && (
            <button
              type="button"
              onClick={() => setShowClientForm(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Add Client
            </button>
          )}
        </div>

        {formState.clients.length > 0 && (
          <div className="mb-4 space-y-3">
            {formState.clients.map((client: Client, index: number) => (
              <div
                key={index}
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900">{client.client_name}</h4>
                      {client.like_us && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                          Like Us
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 capitalize mb-2">
                      {client.client_type} • {client.relationship_status}
                    </p>
                    {client.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {client.categories.map((catId) => {
                          const cat = FOCUS_AREAS.find((f) => f.id === catId);
                          return (
                            <span
                              key={catId}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {cat?.label || catId}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {client.total_raised > 0 && (
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>${client.total_raised.toLocaleString()} raised</span>
                        <span>{client.grants_awarded}/{client.grants_submitted} awarded</span>
                      </div>
                    )}
                    {client.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic">{client.notes}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeClient(index)}
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

        {/* Add Client Form */}
        {showClientForm && (
          <div className="p-4 bg-white border-2 border-blue-300 rounded-lg space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-slate-900">Add New Client</h4>
              <button
                type="button"
                onClick={() => setShowClientForm(false)}
                className="text-slate-400 hover:text-slate-600"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newClient.client_name}
                onChange={(e) => setNewClient({ ...newClient, client_name: e.target.value })}
                placeholder="Client organization name"
                className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />

              <select
                value={newClient.client_type}
                onChange={(e) => setNewClient({ ...newClient, client_type: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="nonprofit">Nonprofit</option>
                <option value="foundation">Foundation</option>
                <option value="government">Government</option>
                <option value="other">Other</option>
              </select>

              <select
                value={newClient.relationship_status}
                onChange={(e) => setNewClient({ ...newClient, relationship_status: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Like Us Toggle */}
            <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <input
                type="checkbox"
                id="like_us"
                checked={newClient.like_us}
                onChange={(e) => setNewClient({ ...newClient, like_us: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <label htmlFor="like_us" className="flex-1 text-sm">
                <span className="font-medium text-purple-900">Like Us</span>
                <span className="text-purple-700 block text-xs">
                  Mark if this is your ideal client type
                </span>
              </label>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client Focus Areas
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_AREAS.map((area) => {
                  const isSelected = newClient.categories.includes(area.id);
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => toggleCategory(area.id)}
                      className={`text-left px-3 py-2 text-xs border rounded-lg transition-colors ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {area.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Engagement Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  value={newClient.total_raised || ""}
                  onChange={(e) => setNewClient({ ...newClient, total_raised: Number(e.target.value) })}
                  placeholder="Amount raised"
                  min="0"
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <input
                type="number"
                value={newClient.grants_submitted || ""}
                onChange={(e) => setNewClient({ ...newClient, grants_submitted: Number(e.target.value) })}
                placeholder="Submitted"
                min="0"
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="number"
                value={newClient.grants_awarded || ""}
                onChange={(e) => setNewClient({ ...newClient, grants_awarded: Number(e.target.value) })}
                placeholder="Awarded"
                min="0"
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <textarea
              value={newClient.notes}
              onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
              placeholder="Notes about this client (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={addClient}
                disabled={!newClient.client_name}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Client
              </button>
              <button
                type="button"
                onClick={() => setShowClientForm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!showClientForm && formState.clients.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-slate-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-sm text-slate-600 mb-3">No clients added yet</p>
            <button
              type="button"
              onClick={() => setShowClientForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Your First Client
            </button>
          </div>
        )}
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
            <p className="text-sm font-medium text-blue-900 mb-1">About "Like Us"</p>
            <p className="text-sm text-blue-800">
              Mark clients as "Like Us" to help the platform recommend similar nonprofits. Focus area categories help match you with relevant opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
