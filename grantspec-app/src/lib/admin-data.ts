import { getServiceSupabaseClient } from "@/lib/supabase-client";
import { formatCurrency } from "@/lib/format";
import { isAdminRole } from "@/lib/admin-auth";
import type { AdminRole } from "@/lib/admin";

type OrganizationRow = {
  id: string;
  name: string;
  created_at: string | null;
  annual_budget: number | null;
};

type MembershipRow = {
  organization_id: string;
};

type ProposalRow = {
  organization_id: string;
};

type PaymentRow = {
  organization_id: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  created_at: string | null;
};

export type AdminCustomerSummary = {
  id: string;
  name: string;
  createdAt: string | null;
  annualBudget: number | null;
  seatCount: number;
  proposalCount: number;
  totalPaid: number;
  currency: string;
  lastInvoice: {
    status: string | null;
    createdAt: string | null;
  } | null;
};

export type AdminCustomerDetail = {
  organization: {
    id: string;
    name: string;
    mission: string | null;
    impactSummary: string | null;
    annualBudget: number | null;
    createdAt: string | null;
  };
  members: {
    userId: string;
    role: string | null;
    createdAt: string | null;
  }[];
  proposals: {
    id: string;
    status: string | null;
    dueDate: string | null;
    createdAt: string | null;
  }[];
  payments: {
    id: number;
    stripeInvoiceId: string;
    amount: number | null;
    currency: string | null;
    status: string | null;
    createdAt: string | null;
  }[];
  notes: {
    id: number;
    adminUserId: string | null;
    adminEmail: string | null;
    content: string;
    createdAt: string | null;
  }[];
  supportTickets: {
    id: number;
    subject: string;
    status: string;
    priority: string;
    openedBy: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    latestEvent: {
      id: number;
      eventType: string;
      message: string;
      createdAt: string | null;
      metadata: Record<string, unknown> | null;
    } | null;
  }[];
  supportEvents: {
    id: number;
    ticketId: number;
    eventType: string;
    message: string;
    createdAt: string | null;
    metadata: Record<string, unknown> | null;
  }[];
  openTicketCount: number;
  averageResolutionHours: number | null;
};

export type AdminUserRecord = {
  userId: string;
  role: AdminRole;
  createdAt: string | null;
  email: string | null;
};

function aggregateCounts(rows: { organization_id: string }[]) {
  return rows.reduce<Map<string, number>>((acc, row) => {
    acc.set(row.organization_id, (acc.get(row.organization_id) ?? 0) + 1);
    return acc;
  }, new Map());
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function slugToName(slug: string) {
  return slug.replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function aggregatePayments(rows: PaymentRow[]) {
  return rows.reduce<
    Map<
      string,
      {
        totalPaid: number;
        lastInvoice: PaymentRow | null;
      }
    >
  >((acc, row) => {
    const aggregate = acc.get(row.organization_id) ?? { totalPaid: 0, lastInvoice: null };

    if (row.status === "paid" || row.status === "succeeded") {
      aggregate.totalPaid += Number(row.amount ?? 0);
    }

    if (!aggregate.lastInvoice) {
      aggregate.lastInvoice = row;
    } else if (
      row.created_at &&
      aggregate.lastInvoice.created_at &&
      new Date(row.created_at).getTime() > new Date(aggregate.lastInvoice.created_at).getTime()
    ) {
      aggregate.lastInvoice = row;
    }

    acc.set(row.organization_id, aggregate);
    return acc;
  }, new Map());
}

export async function fetchAdminCustomers(limit = 50) {
  const supabase = getServiceSupabaseClient();
  const { data: organizationsData, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, created_at, annual_budget")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (orgError) {
    throw new Error("Failed to load organizations");
  }

  const organizations: OrganizationRow[] = organizationsData ?? [];
  const organizationIds = organizations.map((org) => org.id);

  let membershipRows: MembershipRow[] = [];
  let proposalRows: ProposalRow[] = [];
  let paymentRows: PaymentRow[] = [];

  if (organizationIds.length > 0) {
    const [membershipsResult, proposalsResult, paymentsResult] = await Promise.all([
      supabase.from("org_members").select("organization_id").in("organization_id", organizationIds),
      supabase.from("proposals").select("organization_id").in("organization_id", organizationIds),
      supabase
        .from("billing_payments")
        .select("organization_id, amount, currency, status, created_at")
        .in("organization_id", organizationIds),
    ]);

    if (membershipsResult.error) {
      throw new Error("Failed to load memberships");
    }
    membershipRows = membershipsResult.data ?? [];

    if (proposalsResult.error) {
      throw new Error("Failed to load proposals");
    }
    proposalRows = proposalsResult.data ?? [];

    if (paymentsResult.error) {
      throw new Error("Failed to load billing data");
    }
    paymentRows = paymentsResult.data ?? [];
  }

  const membershipCounts = aggregateCounts(membershipRows);
  const proposalCounts = aggregateCounts(proposalRows);
  const paymentAggregates = aggregatePayments(paymentRows);

  const summaries: AdminCustomerSummary[] = organizations.map((org) => {
    const payments = paymentAggregates.get(org.id);
    return {
      id: org.id,
      name: org.name,
      createdAt: org.created_at,
      annualBudget: org.annual_budget,
      seatCount: membershipCounts.get(org.id) ?? 0,
      proposalCount: proposalCounts.get(org.id) ?? 0,
      totalPaid: payments?.totalPaid ?? 0,
      currency: payments?.lastInvoice?.currency ?? "USD",
      lastInvoice: payments?.lastInvoice
        ? {
            status: payments.lastInvoice.status,
            createdAt: payments.lastInvoice.created_at,
          }
        : null,
    };
  });

  const aggregate = {
    totalSeats: membershipRows.length,
    totalProposals: proposalRows.length,
    totalPaid: paymentRows.reduce((sum, payment) => {
      if (payment.status === "paid" || payment.status === "succeeded") {
        return sum + Number(payment.amount ?? 0);
      }
      return sum;
    }, 0),
  };

  return { summaries, aggregate };
}

export async function fetchAdminCustomerDetail(orgId: string): Promise<AdminCustomerDetail> {
  const normalizedOrgId = typeof orgId === "string" ? decodeURIComponent(orgId).trim() : "";
  if (!normalizedOrgId || normalizedOrgId === "undefined") {
    throw new Error("Organization not found");
  }

  const isUuid = isValidUuid(normalizedOrgId);
  const nameFromSlug = isUuid ? null : slugToName(normalizedOrgId);
  const supabase = getServiceSupabaseClient();
  let organization: {
    id: string;
    name: string;
    mission?: string | null;
    impact_summary?: string | null;
    annual_budget: number | null;
    created_at: string | null;
  } | null = null;

  const orConditions = (() => {
    const base = [`id.eq.${normalizedOrgId}`];
    if (!isUuid && nameFromSlug) {
      const fuzzyPattern = `%${nameFromSlug.replace(/\s+/g, "%")}%`;
      const escaped = fuzzyPattern.replace(/[,]/g, ""); // supabase OR delimiter safety
      base.push(`name.ilike.${escaped}`);
    }
    return base.join(",");
  })();

  const { data: primaryOrg, error: primaryError } = await supabase
    .from("organizations")
    .select("id, name, mission, impact_summary, annual_budget, created_at")
    .or(orConditions)
    .limit(1)
    .maybeSingle();

  if (primaryError) {
    console.warn("[admin][customers] fallback organization query", primaryError);
    const { data: fallbackOrg, error: fallbackError } = await supabase
      .from("organizations")
      .select("id, name, annual_budget, created_at")
      .or(orConditions)
      .limit(1)
      .maybeSingle();

    if (fallbackError) {
      throw new Error(`Failed to load organization: ${fallbackError.message}`);
    }

    organization = fallbackOrg
      ? { ...fallbackOrg, mission: null, impact_summary: null }
      : null;
  } else {
    organization = primaryOrg;
  }

  if (!organization) {
    throw new Error("Organization not found");
  }

  const organizationId = organization.id;
  const [membersResult, proposalsResult, paymentsResult, notesResult, ticketsResult] = await Promise.all([
      supabase
        .from("org_members")
        .select("user_id, role, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true }),
      supabase
        .from("proposals")
        .select("id, status, due_date, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("billing_payments")
        .select("id, stripe_invoice_id, amount, currency, status, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("admin_customer_notes")
        .select("id, admin_user_id, content, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("support_tickets")
        .select("id, subject, status, priority, opened_by, created_at, updated_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  if (membersResult.error) {
    throw new Error("Failed to load members");
  }

  if (proposalsResult.error) {
    throw new Error("Failed to load proposals");
  }

  if (paymentsResult.error) {
    throw new Error("Failed to load billing history");
  }

  if (notesResult.error) {
    throw new Error("Failed to load customer notes");
  }

  if (ticketsResult.error) {
    throw new Error("Failed to load support tickets");
  }

  const noteAuthorIds = (notesResult.data ?? [])
    .map((note) => note.admin_user_id)
    .filter((value): value is string => typeof value === "string");
  const noteEmailMap = noteAuthorIds.length ? await fetchUserEmails(noteAuthorIds) : new Map<string, string | null>();

  const ticketIds = (ticketsResult.data ?? []).map((ticket) => ticket.id);
  let ticketEventsData: {
    id: number;
    ticket_id: number;
    event_type: string;
    message: string;
    created_at: string | null;
    metadata: Record<string, unknown> | null;
  }[] = [];

  let ticketEventsResponse:
    | {
        data:
          | {
              id: number;
              ticket_id: number;
              event_type: string;
              message: string;
              created_at: string | null;
              metadata: Record<string, unknown> | null;
            }[]
          | null;
        error: { message: string } | null;
      }
    | null = null;

  if (ticketIds.length > 0) {
    ticketEventsResponse = await supabase
      .from("support_ticket_events")
        .select("id, ticket_id, event_type, message, created_at, metadata")
      .in("ticket_id", ticketIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (ticketEventsResponse.error) {
      throw new Error("Failed to load support ticket events");
    }

    ticketEventsData = ticketEventsResponse.data ?? [];
  }

  const ticketEventsByTicket = new Map<
    number,
    {
      id: number;
      event_type: string;
      message: string;
      created_at: string | null;
      metadata: Record<string, unknown> | null;
    }[]
  >();
  ticketEventsData.forEach((event) => {
    const events = ticketEventsByTicket.get(event.ticket_id) ?? [];
    events.push(event);
    ticketEventsByTicket.set(event.ticket_id, events);
  });

  // Calculate ticket metrics
  const openTicketCount = (ticketsResult.data ?? []).filter((ticket) => ticket.status !== "closed").length;
  const resolutionDurations: number[] = [];
  (ticketsResult.data ?? []).forEach((ticket) => {
    if (ticket.status === "closed" && ticket.created_at && ticket.updated_at) {
      const created = new Date(ticket.created_at);
      const updated = new Date(ticket.updated_at);
      const hours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
      resolutionDurations.push(hours);
    }
  });
  const averageResolutionHours =
    resolutionDurations.length > 0
      ? Number((resolutionDurations.reduce((sum, value) => sum + value, 0) / resolutionDurations.length).toFixed(1))
      : null;

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      mission: organization.mission ?? null,
      impactSummary: organization.impact_summary ?? null,
      annualBudget: organization.annual_budget,
      createdAt: organization.created_at,
    },
    members: (membersResult.data ?? []).map((member) => ({
      userId: member.user_id,
      role: member.role,
      createdAt: member.created_at,
    })),
    proposals: (proposalsResult.data ?? []).map((proposal) => ({
      id: proposal.id,
      status: proposal.status,
      dueDate: proposal.due_date,
      createdAt: proposal.created_at,
    })),
    payments: (paymentsResult.data ?? []).map((payment) => ({
      id: payment.id,
      stripeInvoiceId: payment.stripe_invoice_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.created_at,
    })),
    notes: (notesResult.data ?? []).map((note) => ({
      id: note.id,
      adminUserId: note.admin_user_id ?? null,
      adminEmail: note.admin_user_id ? noteEmailMap.get(note.admin_user_id) ?? null : null,
      content: note.content,
      createdAt: note.created_at,
    })),
    supportTickets: (ticketsResult.data ?? []).map((ticket) => {
      const events = ticketEventsByTicket.get(ticket.id) ?? [];
      const latest = events[0] ?? null;
      return {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        openedBy: ticket.opened_by ?? null,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        latestEvent: latest
          ? {
              id: latest.id,
              eventType: latest.event_type,
              message: latest.message,
              createdAt: latest.created_at,
              metadata: (latest.metadata as Record<string, unknown> | null) ?? null,
            }
          : null,
      };
    }),
    supportEvents: ticketEventsData.map((event) => ({
      id: event.id,
      ticketId: event.ticket_id,
      eventType: event.event_type,
      message: event.message,
      createdAt: event.created_at,
      metadata: (event.metadata as Record<string, unknown> | null) ?? null,
    })),
    openTicketCount,
    averageResolutionHours,
  };
}

export function summarizeCustomerBilling(totalPaid: number, currency: string | undefined) {
  return formatCurrency(totalPaid, currency ?? "USD");
}

async function fetchUserEmails(userIds: string[]) {
  const supabase = getServiceSupabaseClient();
  const emailMap = new Map<string, string | null>();

  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(userId);
        if (error) {
          console.warn(
            `[admin][data] Failed to retrieve auth user ${userId}:`,
            error.message ?? String(error),
          );
          emailMap.set(userId, null);
          return;
        }
        emailMap.set(userId, data.user?.email ?? null);
      } catch (error) {
        console.warn(`[admin][data] Unexpected error fetching user ${userId}`, error);
        emailMap.set(userId, null);
      }
    }),
  );

  return emailMap;
}

export async function fetchAdminUsers(): Promise<AdminUserRecord[]> {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Failed to load admin users");
  }

  const rows = data ?? [];
  const userIds = rows.map((row) => row.user_id);
  const emailMap = await fetchUserEmails(userIds);

  return rows
    .filter((row) => isAdminRole(row.role))
    .map((row) => ({
      userId: row.user_id,
      role: row.role as AdminRole,
      createdAt: row.created_at,
      email: emailMap.get(row.user_id) ?? null,
    }));
}
