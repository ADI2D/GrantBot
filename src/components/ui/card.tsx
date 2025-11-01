import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
