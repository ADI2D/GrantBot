"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

type TimeEntry = {
  id: string;
  date: string;
  time_in: string;
  time_out: string;
  hours_worked: number;
  billable_rate: number;
  total_amount: number;
  notes: string | null;
  proposal: {
    id: string;
    title: string;
  } | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  client: {
    id: string;
    name: string;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
    ein: string | null;
    about_us: string | null;
  };
};

const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchInvoice();
    }
  }, [params.id]);

  const fetchInvoice = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/freelancer/invoices/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invoice");
      }
      const data = await response.json();
      setInvoice(data.invoice);
      setTimeEntries(data.timeEntries);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      alert("Failed to load invoice");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!invoice) return;

    setIsUpdating(true);
    try {
      const updateData: any = { status: newStatus };

      // If marking as paid, add paid_at timestamp
      if (newStatus === "paid") {
        updateData.paidAt = new Date().toISOString();
        updateData.paidAmount = invoice.total_amount;
      }

      const response = await fetch(`/api/freelancer/invoices/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update invoice");
      }

      await fetchInvoice();
    } catch (error) {
      console.error("Error updating invoice:", error);
      alert("Failed to update invoice status");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-slate-600">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-slate-600">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/freelancer/invoices">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              {invoice.invoice_number}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Invoice for {invoice.client.name}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ${
            statusColors[invoice.status]
          }`}
        >
          {invoice.status}
        </span>
      </div>

      {/* Status Actions */}
      {invoice.status !== "paid" && invoice.status !== "cancelled" && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Update invoice status:</p>
            <div className="flex gap-2">
              {invoice.status === "draft" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUpdateStatus("sent")}
                  disabled={isUpdating}
                >
                  Mark as sent
                </Button>
              )}
              {(invoice.status === "sent" || invoice.status === "overdue") && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus("paid")}
                  disabled={isUpdating}
                >
                  Mark as paid
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Bill to
            </h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-slate-900">{invoice.client.name}</p>
              {invoice.client.primary_contact_name && (
                <p className="text-slate-600">Attn: {invoice.client.primary_contact_name}</p>
              )}
              {invoice.client.primary_contact_email && (
                <p className="text-slate-600">{invoice.client.primary_contact_email}</p>
              )}
              {invoice.client.ein && (
                <p className="text-slate-600">EIN: {invoice.client.ein}</p>
              )}
            </div>
          </Card>
          {/* Time Entries */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Time entries
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-700">
                      Date
                    </th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-700">
                      Description
                    </th>
                    <th className="pb-2 text-right text-xs font-semibold text-slate-700">
                      Hours
                    </th>
                    <th className="pb-2 text-right text-xs font-semibold text-slate-700">
                      Rate
                    </th>
                    <th className="pb-2 text-right text-xs font-semibold text-slate-700">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timeEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-3 text-sm text-slate-900">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-sm text-slate-600">
                        <div>
                          {entry.proposal ? entry.proposal.title : "General work"}
                        </div>
                        {entry.notes && (
                          <div className="text-xs text-slate-500 mt-1">
                            {entry.notes}
                          </div>
                        )}
                        <div className="text-xs text-slate-500">
                          {entry.time_in} - {entry.time_out}
                        </div>
                      </td>
                      <td className="py-3 text-sm text-right text-slate-900">
                        {entry.hours_worked.toFixed(2)}
                      </td>
                      <td className="py-3 text-sm text-right text-slate-600">
                        ${entry.billable_rate.toFixed(2)}
                      </td>
                      <td className="py-3 text-sm text-right font-medium text-slate-900">
                        ${entry.total_amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Notes
              </h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invoice Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Invoice summary
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Issue date:</span>
                <span className="text-slate-900">
                  {new Date(invoice.issue_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Due date:</span>
                <span className="text-slate-900">
                  {new Date(invoice.due_date).toLocaleDateString()}
                </span>
              </div>
              {invoice.paid_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Paid on:</span>
                  <span className="text-green-700 font-medium">
                    {new Date(invoice.paid_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Amount Breakdown */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Amount
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal:</span>
                <span className="text-slate-900">
                  ${parseFloat(invoice.subtotal.toString()).toFixed(2)}
                </span>
              </div>
              {invoice.tax_rate > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    Tax ({invoice.tax_rate}%):
                  </span>
                  <span className="text-slate-900">
                    ${parseFloat(invoice.tax_amount.toString()).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="font-semibold text-slate-900">Total:</span>
                <span className="font-semibold text-slate-900 text-lg">
                  ${parseFloat(invoice.total_amount.toString()).toFixed(2)}
                </span>
              </div>
              {invoice.status === "paid" && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-4">
                  <div className="flex justify-between">
                    <span className="text-green-700 font-medium">Paid:</span>
                    <span className="text-green-700 font-medium">
                      ${parseFloat(invoice.paid_amount.toString()).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
