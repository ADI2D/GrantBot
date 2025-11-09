"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HeaderShellProps = {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export function HeaderShell({ left, right, className }: HeaderShellProps) {
  return (
    <header className={cn("sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur", className)}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">{left}</div>
        <div className="flex flex-1 items-center justify-end gap-3">{right}</div>
      </div>
    </header>
  );
}
