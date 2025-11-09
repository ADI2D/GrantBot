import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const toneMap = {
  neutral:
    "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-secondary)]",
  success: "bg-[color:var(--color-surface-positive)] text-[color:var(--color-success-green)]",
  warning: "bg-[color:var(--color-surface-warning)] text-[color:var(--color-warning-red)]",
  info: "bg-[color:var(--color-surface-info)] text-[color:var(--color-growth-teal)]",
};

type Tone = keyof typeof toneMap;

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold tracking-tight",
        toneMap[tone],
        className,
      )}
      {...props}
    />
  );
}
