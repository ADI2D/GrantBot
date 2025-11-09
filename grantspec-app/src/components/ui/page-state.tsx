import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm text-[color:var(--color-text-muted)]">
      <Loader2 className="h-5 w-5 animate-spin text-[color:var(--color-growth-teal)]" />
      <p>{label}…</p>
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-soft)] border border-[color:var(--color-warning-red)]/40 bg-[color:var(--color-surface-warning)] p-4 text-sm text-[color:var(--color-warning-red)]">
      {message}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-soft)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-6 text-center",
        className,
      )}
    >
      <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">{title}</p>
      <p className="text-xs text-[color:var(--color-text-muted)]">{description}</p>
    </div>
  );
}
