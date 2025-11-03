"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ActionState = {
  status: "idle" | "pending" | "success" | "error";
  message?: string;
};

type SubmitPayload = Record<string, unknown>;

const INITIAL_REFUND = { stripeInvoiceId: "", amount: "" };
const INITIAL_CREDIT = { organizationId: "", amount: "", reason: "" };
const INITIAL_TRIAL = { organizationId: "", days: "" };

type SectionKey = "refund" | "credit" | "trial";

export function ManualBillingActions() {
  const [refundForm, setRefundForm] = useState(INITIAL_REFUND);
  const [creditForm, setCreditForm] = useState(INITIAL_CREDIT);
  const [trialForm, setTrialForm] = useState(INITIAL_TRIAL);

  const [refundState, setRefundState] = useState<ActionState>({ status: "idle" });
  const [creditState, setCreditState] = useState<ActionState>({ status: "idle" });
  const [trialState, setTrialState] = useState<ActionState>({ status: "idle" });
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const resetState = useCallback((setter: (value: ActionState) => void) => {
    setter({ status: "idle" });
  }, []);

  const toggleSection = useCallback((section: SectionKey) => {
    setOpenSection((current) => (current === section ? null : section));
  }, []);

  const submit = useCallback(async (opts: {
    endpoint: string;
    payload: SubmitPayload;
    setState: (value: ActionState) => void;
    onSuccess?: () => void;
  }) => {
    const { endpoint, payload, setState, onSuccess } = opts;

    setState({ status: "pending" });
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed: ${response.status}`);
      }

      setState({ status: "success", message: "Completed successfully" });
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      setState({ status: "error", message });
    }
  }, []);

  const refundDisabled = useMemo(() => {
    return (
      refundState.status === "pending" ||
      !refundForm.stripeInvoiceId.trim() ||
      !refundForm.amount.trim() ||
      Number.isNaN(Number(refundForm.amount))
    );
  }, [refundForm.amount, refundForm.stripeInvoiceId, refundState.status]);

  const creditDisabled = useMemo(() => {
    return (
      creditState.status === "pending" ||
      !creditForm.organizationId.trim() ||
      !creditForm.amount.trim() ||
      Number.isNaN(Number(creditForm.amount)) ||
      !creditForm.reason.trim()
    );
  }, [creditForm.amount, creditForm.organizationId, creditForm.reason, creditState.status]);

  const trialDisabled = useMemo(() => {
    return (
      trialState.status === "pending" ||
      !trialForm.organizationId.trim() ||
      !trialForm.days.trim() ||
      Number.isNaN(Number(trialForm.days))
    );
  }, [trialForm.days, trialForm.organizationId, trialState.status]);

  return (
    <div className="rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-soft">
      <h3 className="text-lg font-semibold text-primary">Manual actions</h3>
      <p className="mt-2 text-sm text-muted">
        Execute overrides directly from the dashboard. All API calls require super-admin privileges and write to
        <code className="ml-1 text-primary/80">admin_audit_logs</code>.
      </p>

      <div className="mt-6 space-y-6">
        <ActionCard
          isOpen={openSection === "refund"}
          onToggle={() => toggleSection("refund")}
          title="Issue refund"
          description="POST /api/admin/billing/refund"
          state={refundState}
          onSubmit={() =>
            submit({
              endpoint: "/api/admin/billing/refund",
              payload: {
                stripeInvoiceId: refundForm.stripeInvoiceId.trim(),
                amount: Number(refundForm.amount),
              },
              setState: setRefundState,
              onSuccess: () => setRefundForm(INITIAL_REFUND),
            })
          }
          submitLabel="Issue refund"
          disabled={refundDisabled}
          onReset={() => resetState(setRefundState)}
          onCancel={() => setRefundForm(INITIAL_REFUND)}
          fields={[
            {
              label: "Stripe invoice ID",
              value: refundForm.stripeInvoiceId,
              placeholder: "in_1P...",
              onChange: (value) => setRefundForm((prev) => ({ ...prev, stripeInvoiceId: value })),
            },
            {
              label: "Amount (cents)",
              value: refundForm.amount,
              placeholder: "2500",
              type: "number",
              onChange: (value) => setRefundForm((prev) => ({ ...prev, amount: value })),
            },
          ]}
        />

        <ActionCard
          isOpen={openSection === "credit"}
          onToggle={() => toggleSection("credit")}
          title="Apply credit"
          description="POST /api/admin/billing/credit"
          state={creditState}
          onSubmit={() =>
            submit({
              endpoint: "/api/admin/billing/credit",
              payload: {
                organizationId: creditForm.organizationId.trim(),
                amount: Number(creditForm.amount),
                reason: creditForm.reason.trim(),
              },
              setState: setCreditState,
              onSuccess: () => setCreditForm(INITIAL_CREDIT),
            })
          }
          submitLabel="Apply credit"
          disabled={creditDisabled}
          onReset={() => resetState(setCreditState)}
          onCancel={() => setCreditForm(INITIAL_CREDIT)}
          fields={[
            {
              label: "Organization ID",
              value: creditForm.organizationId,
              placeholder: "c9634d01-...",
              onChange: (value) => setCreditForm((prev) => ({ ...prev, organizationId: value })),
            },
            {
              label: "Amount (cents)",
              value: creditForm.amount,
              placeholder: "1000",
              type: "number",
              onChange: (value) => setCreditForm((prev) => ({ ...prev, amount: value })),
            },
            {
              label: "Reason",
              value: creditForm.reason,
              placeholder: "Contract adjustment, service issue, etc.",
              onChange: (value) => setCreditForm((prev) => ({ ...prev, reason: value })),
            },
          ]}
        />

        <ActionCard
          isOpen={openSection === "trial"}
          onToggle={() => toggleSection("trial")}
          title="Extend trial"
          description="POST /api/admin/billing/trial"
          state={trialState}
          onSubmit={() =>
            submit({
              endpoint: "/api/admin/billing/trial",
              payload: {
                organizationId: trialForm.organizationId.trim(),
                days: Number(trialForm.days),
              },
              setState: setTrialState,
              onSuccess: () => setTrialForm(INITIAL_TRIAL),
            })
          }
          submitLabel="Extend trial"
          disabled={trialDisabled}
          onReset={() => resetState(setTrialState)}
          onCancel={() => setTrialForm(INITIAL_TRIAL)}
          fields={[
            {
              label: "Organization ID",
              value: trialForm.organizationId,
              placeholder: "c9634d01-...",
              onChange: (value) => setTrialForm((prev) => ({ ...prev, organizationId: value })),
            },
            {
              label: "Additional days",
              value: trialForm.days,
              placeholder: "7",
              type: "number",
              onChange: (value) => setTrialForm((prev) => ({ ...prev, days: value })),
            },
          ]}
        />
      </div>
    </div>
  );
}

type FieldConfig = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
};

type ActionCardProps = {
  title: string;
  description: string;
  fields: FieldConfig[];
  submitLabel: string;
  disabled: boolean;
  state: ActionState;
  onSubmit: () => void;
  onReset: () => void;
  onCancel?: () => void;
  isOpen: boolean;
  onToggle: () => void;
};

function ActionCard({
  title,
  description,
  fields,
  submitLabel,
  disabled,
  state,
  onSubmit,
  onReset,
  onCancel,
  isOpen,
  onToggle,
}: ActionCardProps) {
  const handleToggle = () => {
    if (isOpen) {
      onReset();
    }
    onToggle();
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-soft transition-shadow duration-200",
        isOpen ? "shadow-hover" : "",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1 bg-[color:var(--color-growth-teal)] transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-60",
        )}
      />
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "relative flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors duration-200",
          isOpen ? "bg-[color:var(--color-surface)]" : "bg-[color:var(--color-surface-muted)]",
        )}
      >
        <div className="space-y-1">
          <span className="text-sm font-semibold text-primary underline decoration-dashed underline-offset-4">
            {title}
          </span>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[color:var(--color-growth-teal)] transition-transform",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {isOpen && (
        <div className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-6 py-4">
          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.label} className="space-y-1">
                <label className="text-xs font-medium text-muted">{field.label}</label>
                <Input
                  type={field.type ?? "text"}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder={field.placeholder}
                  className="text-sm"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={onSubmit} disabled={disabled} className="min-w-[140px]">
              {state.status === "pending" ? "Working…" : submitLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onReset();
                onCancel?.();
                if (isOpen) {
                  onToggle();
                }
              }}
              className="text-sm font-medium text-muted hover:text-primary"
            >
              Cancel
            </Button>
            {state.status === "success" && (
              <span className="text-xs font-medium text-[color:var(--color-success-green)]">
                {state.message ?? "Success"}
              </span>
            )}
            {state.status === "error" && (
              <span className="text-xs font-medium text-[color:var(--color-warning-red)]">
                {state.message ?? "Something went wrong. Check the console for details."}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
