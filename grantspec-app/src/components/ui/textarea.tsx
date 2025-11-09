import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-muted)] shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-growth-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-clean-white)]",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
