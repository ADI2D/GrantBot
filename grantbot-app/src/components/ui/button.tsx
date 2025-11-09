import { Slot } from "@radix-ui/react-slot";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonSize = "md" | "sm";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
};

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-soft)] font-semibold transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-growth-teal)] focus-visible:ring-offset-[color:var(--color-clean-white)] disabled:pointer-events-none disabled:opacity-60";

const sizeStyles: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-xs",
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[color:var(--color-growth-teal)] text-white shadow-soft hover:shadow-hover hover:brightness-105",
  secondary:
    "bg-[color:var(--color-surface)] text-[color:var(--color-text-primary)] border border-[color:var(--color-border)] shadow-soft hover:bg-[color:var(--color-surface-muted)] hover:shadow-hover",
  ghost:
    "text-[color:var(--color-growth-teal)] hover:bg-[color:var(--color-surface-info)]",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", size = "md", asChild, ...props }, ref) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
