import { getServiceSupabaseClient } from "@/lib/supabase-client";
import type { AdminCustomerSummary } from "@/lib/admin-data";
import { fetchAdminCustomers } from "@/lib/admin-data";
import { formatCurrency } from "@/lib/format";

export type BillingInvoice = {
  id: number;
  stripeInvoiceId: string;
  organizationId: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  dueDate: string | null;
  createdAt: string | null;
};

export type BillingOverview = {
  mrrThisMonth: number;
  mrrLastMonth: number;
  mrrGrowthPercent: number;
  totalPaidYtd: number;
  openInvoiceCount: number;
  delinquentInvoiceCount: number;
  invoices: BillingInvoice[];
  customerSummaries: AdminCustomerSummary[];
};

const PAID_STATUSES = new Set(["paid", "succeeded"]);
const DELINQUENT_STATUSES = new Set(["past_due", "uncollectible"]);

function isSameMonth(dateA: Date, dateB: Date) {
  return dateA.getUTCFullYear() === dateB.getUTCFullYear() && dateA.getUTCMonth() === dateB.getUTCMonth();
}

function isPastDue(date: Date, now: Date) {
  return date.getTime() < now.getTime();
}

export async function fetchBillingOverview(): Promise<BillingOverview> {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("billing_payments")
    .select("id, organization_id, stripe_invoice_id, amount, currency, status, due_date, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error("Failed to load billing invoices");
  }

  const invoices: BillingInvoice[] = (data ?? []).map((invoice) => ({
    id: invoice.id,
    organizationId: invoice.organization_id,
    stripeInvoiceId: invoice.stripe_invoice_id,
    amount: invoice.amount,
    currency: invoice.currency,
    status: invoice.status,
    dueDate: invoice.due_date,
    createdAt: invoice.created_at,
  }));

  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  let mrrThisMonth = 0;
  let mrrLastMonth = 0;
  let totalPaidYtd = 0;
  let openInvoiceCount = 0;
  let delinquentInvoiceCount = 0;

  invoices.forEach((invoice) => {
    const createdAt = invoice.createdAt ? new Date(invoice.createdAt) : null;
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
    const amount = Number(invoice.amount ?? 0);
    const status = invoice.status?.toLowerCase();

    if (createdAt && createdAt >= yearStart && PAID_STATUSES.has(status ?? "")) {
      totalPaidYtd += amount;
    }

    if (createdAt && createdAt >= currentMonthStart && isSameMonth(createdAt, now) && PAID_STATUSES.has(status ?? "")) {
      mrrThisMonth += amount;
    }

    if (
      createdAt &&
      createdAt >= lastMonthStart &&
      createdAt <= lastMonthEnd &&
      isSameMonth(createdAt, lastMonthStart) &&
      PAID_STATUSES.has(status ?? "")
    ) {
      mrrLastMonth += amount;
    }

    if (status === "open" || status === "draft") {
      openInvoiceCount += 1;
      if (dueDate && isPastDue(dueDate, now)) {
        delinquentInvoiceCount += 1;
      }
    }

    if (status && DELINQUENT_STATUSES.has(status)) {
      delinquentInvoiceCount += 1;
    }
  });

  const mrrGrowthPercent =
    mrrLastMonth === 0 ? (mrrThisMonth > 0 ? 100 : 0) : Math.round(((mrrThisMonth - mrrLastMonth) / mrrLastMonth) * 100);

  const customers = await fetchAdminCustomers(20);

  return {
    mrrThisMonth,
    mrrLastMonth,
    mrrGrowthPercent,
    totalPaidYtd,
    openInvoiceCount,
    delinquentInvoiceCount,
    invoices: invoices.slice(0, 15),
    customerSummaries: customers.summaries,
  };
}

export function formatAmount(amount: number, currency?: string | null) {
  return formatCurrency(amount, currency ?? "USD");
}
