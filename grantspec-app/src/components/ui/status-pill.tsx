import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const toneStyles: Record<string, string> = {
  default:
    "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-secondary)]",
  success: "bg-[color:var(--color-surface-positive)] text-[color:var(--color-success-green)]",
  warning: "bg-[color:var(--color-surface-warning)] text-[color:var(--color-warning-red)]",
  info: "bg-[color:var(--color-surface-info)] text-[color:var(--color-growth-teal)]",
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof toneStyles;
};

export function StatusPill({ className, tone = "default", ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
