import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  initials: string;
};

export function Avatar({ initials, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700",
        className,
      )}
      {...props}
    >
      {initials}
    </div>
  );
}
