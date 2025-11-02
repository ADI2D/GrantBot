import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-soft transition-shadow duration-200 hover:shadow-hover",
        className,
      )}
      {...props}
    />
  );
}
