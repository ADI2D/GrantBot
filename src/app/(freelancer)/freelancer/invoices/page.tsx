"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar, DollarSign, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

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
  };
};

const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
};

export default function FreelancerInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/freelancer/invoices");
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalRevenue = () => {
    return invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);
  };

  const getOutstandingAmount = () => {
    return invoices
      .filter((inv) => inv.status === "sent" || inv.status === "overdue")
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);
  };

  const getDraftCount = () => {
    return invoices.filter((inv) => inv.status === "draft").length;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Invoices</h1>
        <p className="mt-2 text-sm text-slate-600">
          View and manage your invoices
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total revenue</p>
              <p className="text-2xl font-semibold text-slate-900">
                ${getTotalRevenue().toFixed(2)}
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
              <p className="text-sm text-slate-600">Outstanding</p>
              <p className="text-2xl font-semibold text-slate-900">
                ${getOutstandingAmount().toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-3">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Draft invoices</p>
              <p className="text-2xl font-semibold text-slate-900">
                {getDraftCount()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <Link href="/freelancer/time-tracking">
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            Generate new invoice
          </Button>
        </Link>
      </div>

      {/* Invoices Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Invoice #
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Issue date
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Due date
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Amount
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
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No invoices yet. Generate your first invoice from the time tracking page.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {invoice.client.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(invoice.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      ${parseFloat(invoice.total_amount.toString()).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${
                          statusColors[invoice.status]
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/freelancer/invoices/${invoice.id}`}>
                        <Button variant="secondary" size="sm">
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
