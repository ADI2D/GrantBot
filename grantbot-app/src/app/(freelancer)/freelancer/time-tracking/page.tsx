"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Clock, DollarSign, Trash2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Client = {
  id: string;
  name: string;
};

type TimeEntry = {
  id: string;
  client_id: string;
  proposal_id: string | null;
  date: string;
  time_in: string;
  time_out: string;
  hours_worked: number;
  billable_rate: number;
  total_amount: number;
  notes: string | null;
  is_invoiced: boolean;
  client: { id: string; name: string };
  proposal: { id: string; name: string } | null;
};

export default function FreelancerTimeTrackingPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientId: "",
    date: new Date().toISOString().split("T")[0],
    timeIn: "09:00",
    timeOut: "17:00",
    billableRate: "",
    notes: "",
  });

  // Fetch clients and time entries
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [clientsRes, entriesRes] = await Promise.all([
        fetch("/api/freelancer/clients"),
        fetch("/api/freelancer/time-entries"),
      ]);

      const clientsData = await clientsRes.json();
      const entriesData = await entriesRes.json();

      setClients(clientsData.clients || []);
      setEntries(entriesData.entries || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.billableRate) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingEntry
        ? `/api/freelancer/time-entries/${editingEntry.id}`
        : "/api/freelancer/time-entries";

      const method = editingEntry ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formData.clientId,
          date: formData.date,
          timeIn: formData.timeIn,
          timeOut: formData.timeOut,
          billableRate: parseFloat(formData.billableRate),
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save time entry");
      }

      // Reset form and refresh data
      resetForm();
      await fetchData();
    } catch (error) {
      console.error("Error saving time entry:", error);
      alert(error instanceof Error ? error.message : "Failed to save time entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormData({
      clientId: entry.client_id,
      date: entry.date,
      timeIn: entry.time_in,
      timeOut: entry.time_out,
      billableRate: entry.billable_rate.toString(),
      notes: entry.notes || "",
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this time entry?")) {
      return;
    }

    try {
      const response = await fetch(`/api/freelancer/time-entries/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete time entry");
      }

      await fetchData();
    } catch (error) {
      console.error("Error deleting time entry:", error);
      alert(error instanceof Error ? error.message : "Failed to delete time entry");
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: "",
      date: new Date().toISOString().split("T")[0],
      timeIn: "09:00",
      timeOut: "17:00",
      billableRate: "",
      notes: "",
    });
    setEditingEntry(null);
    setShowAddModal(false);
  };

  // Calculate totals
  const totalHours = entries.reduce((sum, entry) => sum + entry.hours_worked, 0);
  const totalAmount = entries.reduce((sum, entry) => sum + entry.total_amount, 0);
  const uninvoicedAmount = entries
    .filter((e) => !e.is_invoiced)
    .reduce((sum, entry) => sum + entry.total_amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Time tracking</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track billable hours for your clients and generate invoices
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total hours</p>
              <p className="text-2xl font-semibold text-slate-900">
                {totalHours.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total earned</p>
              <p className="text-2xl font-semibold text-slate-900">
                ${totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-3">
              <DollarSign className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Uninvoiced</p>
              <p className="text-2xl font-semibold text-slate-900">
                ${uninvoicedAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Entry Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowAddModal(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add time entry
        </Button>
      </div>

      {/* Time Entries Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Hours
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Rate
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Notes
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading time entries...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    No time entries yet. Add your first entry to get started.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {entry.client.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {entry.time_in} - {entry.time_out}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {entry.hours_worked.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      ${entry.billable_rate.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      ${entry.total_amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {entry.notes ? (
                        <span className="line-clamp-1">{entry.notes}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.is_invoiced ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Invoiced
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!entry.is_invoiced && (
                          <>
                            <button
                              onClick={() => handleEdit(entry)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingEntry ? "Edit time entry" : "Add time entry"}
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="client">
                  Client <span className="text-red-500">*</span>
                </Label>
                <select
                  id="client"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.clientId}
                  onChange={(e) =>
                    setFormData({ ...formData, clientId: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="date">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeIn">
                    Time in <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="timeIn"
                    type="time"
                    value={formData.timeIn}
                    onChange={(e) =>
                      setFormData({ ...formData, timeIn: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="timeOut">
                    Time out <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="timeOut"
                    type="time"
                    value={formData.timeOut}
                    onChange={(e) =>
                      setFormData({ ...formData, timeOut: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="billableRate">
                  Billable rate ($/hour) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billableRate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 150.00"
                  value={formData.billableRate}
                  onChange={(e) =>
                    setFormData({ ...formData, billableRate: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this time entry..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : editingEntry
                    ? "Update entry"
                    : "Add entry"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
