"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Clock, DollarSign, Trash2, Pencil, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Client = {
  id: string;
  name: string;
};

type Proposal = {
  id: string;
  title: string;
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
  proposal: { id: string; title: string } | null;
};

export default function FreelancerTimeTrackingPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // Timeframe filter state
  const [timeframe, setTimeframe] = useState<"month-to-date" | "last-month" | "custom">("month-to-date");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    clientId: "",
    proposalId: "",
    date: new Date().toISOString().split("T")[0],
    timeIn: "09:00",
    timeOut: "17:00",
    billableRate: "",
    notes: "",
  });

  // Invoice form state
  const [invoiceData, setInvoiceData] = useState({
    clientId: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
    taxRate: "0",
    notes: "",
  });

  // Calculate date range based on timeframe
  const getDateRange = (): { startDate: string; endDate: string } => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (timeframe === "month-to-date") {
      // First day of current month to today
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
    } else if (timeframe === "last-month") {
      // First day of last month to last day of last month
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      // Custom range
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  // Filter entries based on selected timeframe
  const filteredEntries = entries.filter((entry) => {
    if (timeframe === "custom" && (!customStartDate || !customEndDate)) {
      return true; // Show all if custom dates not set
    }
    const { startDate, endDate } = getDateRange();
    return entry.date >= startDate && entry.date <= endDate;
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

  // Fetch proposals when client changes
  const fetchProposals = async (clientId: string) => {
    if (!clientId) {
      setProposals([]);
      return;
    }

    try {
      const response = await fetch(`/api/freelancer/clients/${clientId}/proposals`);
      const data = await response.json();
      setProposals(data.proposals || []);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      setProposals([]);
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
          proposalId: formData.proposalId || null,
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
      proposalId: entry.proposal_id || "",
      date: entry.date,
      timeIn: entry.time_in,
      timeOut: entry.time_out,
      billableRate: entry.billable_rate.toString(),
      notes: entry.notes || "",
    });
    // Fetch proposals for the selected client
    fetchProposals(entry.client_id);
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
      proposalId: "",
      date: new Date().toISOString().split("T")[0],
      timeIn: "09:00",
      timeOut: "17:00",
      billableRate: "",
      notes: "",
    });
    setProposals([]);
    setEditingEntry(null);
    setShowAddModal(false);
  };

  const handleOpenInvoiceModal = () => {
    // Clear previous selections
    setSelectedEntries(new Set());
    // Reset invoice form
    setInvoiceData({
      clientId: "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      taxRate: "0",
      notes: "",
    });
    setShowInvoiceModal(true);
  };

  const handleToggleEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedEntries.size === 0) {
      alert("Please select at least one time entry");
      return;
    }

    if (!invoiceData.clientId) {
      alert("Please select a client");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/freelancer/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeEntryIds: Array.from(selectedEntries),
          clientId: invoiceData.clientId,
          issueDate: invoiceData.issueDate,
          dueDate: invoiceData.dueDate,
          taxRate: parseFloat(invoiceData.taxRate),
          notes: invoiceData.notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate invoice");
      }

      const data = await response.json();
      alert(`Invoice ${data.invoice.invoice_number} created successfully!`);

      // Reset and refresh
      setShowInvoiceModal(false);
      setSelectedEntries(new Set());
      await fetchData();
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert(error instanceof Error ? error.message : "Failed to generate invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals based on filtered entries
  const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.hours_worked, 0);
  const totalAmount = filteredEntries.reduce((sum, entry) => sum + entry.total_amount, 0);
  const uninvoicedAmount = filteredEntries
    .filter((e) => !e.is_invoiced)
    .reduce((sum, entry) => sum + entry.total_amount, 0);

  // Get uninvoiced entries for the selected client
  const uninvoicedEntries = filteredEntries.filter(
    (e) => !e.is_invoiced && (!invoiceData.clientId || e.client_id === invoiceData.clientId)
  );

  // Calculate selected entries total
  const selectedEntriesData = entries.filter((e) => selectedEntries.has(e.id));
  const selectedSubtotal = selectedEntriesData.reduce((sum, entry) => sum + entry.total_amount, 0);
  const selectedTax = (selectedSubtotal * parseFloat(invoiceData.taxRate || "0")) / 100;
  const selectedTotal = selectedSubtotal + selectedTax;

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

      {/* Timeframe Filter */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="timeframe">Timeframe</Label>
            <select
              id="timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="month-to-date">Month to date</option>
              <option value="last-month">Last month</option>
              <option value="custom">Custom range</option>
            </select>
          </div>

          {timeframe === "custom" && (
            <>
              <div className="flex-1">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={handleOpenInvoiceModal}
          disabled={uninvoicedAmount === 0}
        >
          <FileText className="mr-2 h-4 w-4" />
          Generate invoice
        </Button>
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
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    No time entries yet. Add your first entry to get started.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
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
                  onChange={(e) => {
                    const clientId = e.target.value;
                    setFormData({ ...formData, clientId, proposalId: "" });
                    fetchProposals(clientId);
                  }}
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
                <Label htmlFor="proposal">
                  Proposal (optional)
                </Label>
                <select
                  id="proposal"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.proposalId}
                  onChange={(e) =>
                    setFormData({ ...formData, proposalId: e.target.value })
                  }
                  disabled={isSubmitting || !formData.clientId}
                >
                  <option value="">None (general work)</option>
                  {proposals.map((proposal) => (
                    <option key={proposal.id} value={proposal.id}>
                      {proposal.title}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Link this time entry to a specific proposal for invoice breakdown
                </p>
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

      {/* Invoice Generation Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
          <Card className="w-full max-w-4xl p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Generate invoice
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowInvoiceModal(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleGenerateInvoice} className="space-y-6">
              {/* Client Selection */}
              <div>
                <Label htmlFor="invoiceClient">
                  Client <span className="text-red-500">*</span>
                </Label>
                <select
                  id="invoiceClient"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={invoiceData.clientId}
                  onChange={(e) => {
                    setInvoiceData({ ...invoiceData, clientId: e.target.value });
                    setSelectedEntries(new Set()); // Clear selections when client changes
                  }}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select a client</option>
                  {clients
                    .filter((client) =>
                      filteredEntries.some((e) => e.client_id === client.id && !e.is_invoiced)
                    )
                    .map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Only clients with uninvoiced time entries are shown
                </p>
              </div>

              {/* Time Entries Selection */}
              {invoiceData.clientId && (
                <div>
                  <Label>
                    Select time entries <span className="text-red-500">*</span>
                  </Label>
                  <div className="mt-2 max-h-64 overflow-y-auto border border-slate-200 rounded-md">
                    {uninvoicedEntries.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        No uninvoiced time entries for this client
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="border-b border-slate-200 bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left">
                              <input
                                type="checkbox"
                                checked={
                                  uninvoicedEntries.length > 0 &&
                                  uninvoicedEntries.every((e) => selectedEntries.has(e.id))
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedEntries(new Set(uninvoicedEntries.map((entry) => entry.id)));
                                  } else {
                                    setSelectedEntries(new Set());
                                  }
                                }}
                              />
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-900">
                              Date
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-900">
                              Hours
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-900">
                              Rate
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-900">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {uninvoicedEntries.map((entry) => (
                            <tr
                              key={entry.id}
                              className={`hover:bg-slate-50 cursor-pointer ${
                                selectedEntries.has(entry.id) ? "bg-blue-50" : ""
                              }`}
                              onClick={() => handleToggleEntry(entry.id)}
                            >
                              <td className="px-4 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedEntries.has(entry.id)}
                                  onChange={() => handleToggleEntry(entry.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-4 py-2 text-xs text-slate-900">
                                {new Date(entry.date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-xs text-slate-600">
                                {entry.hours_worked.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-xs text-slate-600">
                                ${entry.billable_rate.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-xs text-right text-slate-900">
                                ${entry.total_amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedEntries.size} {selectedEntries.size === 1 ? "entry" : "entries"} selected
                  </p>
                </div>
              )}

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issueDate">
                    Issue date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={invoiceData.issueDate}
                    onChange={(e) =>
                      setInvoiceData({ ...invoiceData, issueDate: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="dueDate">
                    Due date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={(e) =>
                      setInvoiceData({ ...invoiceData, dueDate: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="taxRate">Tax rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g., 8.5"
                  value={invoiceData.taxRate}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, taxRate: e.target.value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="invoiceNotes">Notes (optional)</Label>
                <Textarea
                  id="invoiceNotes"
                  placeholder="Add any notes or payment terms..."
                  value={invoiceData.notes}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, notes: e.target.value })
                  }
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              {/* Invoice Preview */}
              {selectedEntries.size > 0 && (
                <Card className="p-4 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Invoice preview
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="text-slate-900">${selectedSubtotal.toFixed(2)}</span>
                    </div>
                    {parseFloat(invoiceData.taxRate) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">
                          Tax ({invoiceData.taxRate}%):
                        </span>
                        <span className="text-slate-900">${selectedTax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-300 pt-2 font-semibold">
                      <span className="text-slate-900">Total:</span>
                      <span className="text-slate-900">${selectedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </Card>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowInvoiceModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || selectedEntries.size === 0}>
                  {isSubmitting ? "Generating..." : "Generate invoice"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
