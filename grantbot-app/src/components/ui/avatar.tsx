import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  initials: string;
};

export function Avatar({ initials, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-surface-info)] text-sm font-semibold text-[color:var(--color-growth-teal)]",
        className,
      )}
      {...props}
    >
      {initials}
    </div>
  );
}
