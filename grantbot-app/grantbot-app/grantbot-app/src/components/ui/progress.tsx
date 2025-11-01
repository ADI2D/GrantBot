import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLDivElement> & {
  value: number;
};

export function Progress({ value, className, ...props }: Props) {
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-slate-100",
        className,
      )}
      {...props}
    >
      <span
        className="absolute left-0 top-0 h-full rounded-full bg-blue-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
