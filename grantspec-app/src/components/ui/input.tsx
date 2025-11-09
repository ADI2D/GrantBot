import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-muted)] shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-growth-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-clean-white)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
