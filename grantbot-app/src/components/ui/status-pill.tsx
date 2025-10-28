import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const toneStyles: Record<string, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-blue-50 text-blue-600",
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof toneStyles;
};

export function StatusPill({ className, tone = "default", ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
