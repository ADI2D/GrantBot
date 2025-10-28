"use client";

import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { useOrg } from "@/hooks/use-org";
import { cn } from "@/lib/utils";

export function OrgSwitcher() {
  const { orgs, currentOrg, setCurrentOrgId } = useOrg();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm"
        onClick={() => setOpen((prev) => !prev)}
      >
        {currentOrg?.name ?? "Select org"}
        <ChevronsUpDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-lg">
          {orgs.map((org) => (
            <button
              key={org.id}
              className={cn(
                "w-full rounded-xl px-3 py-2 text-left text-sm",
                org.id === currentOrg?.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50",
              )}
              onClick={() => {
                setCurrentOrgId(org.id);
                setOpen(false);
              }}
            >
              {org.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
