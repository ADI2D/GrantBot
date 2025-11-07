import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  current?: boolean;
};

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHomeIcon?: boolean;
}

export function Breadcrumb({ items, className, showHomeIcon = false }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
      <ol className="flex items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = item.current || isLast;

          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              )}

              {showHomeIcon && index === 0 && (
                <Home className="h-4 w-4 mr-1 inline-block" aria-hidden="true" />
              )}

              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "font-medium",
                    isCurrent ? "text-slate-900" : "text-slate-600"
                  )}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
