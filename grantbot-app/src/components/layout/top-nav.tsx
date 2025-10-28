 "use client";

import { Bell, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrgSwitcher } from "@/components/org/org-switcher";
import { UserMenu } from "@/components/auth/user-menu";

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="hidden text-sm text-slate-500 md:block">
            <p className="text-xs uppercase text-slate-400">This week</p>
            <p className="font-semibold text-slate-800">8 proposals in flight</p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
          <OrgSwitcher />
          <div className="hidden flex-1 max-w-md items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 lg:flex">
            <Search className="h-4 w-4" />
            <input
              className="w-full bg-transparent outline-none"
              placeholder="Search opportunities, proposals, collaborators"
            />
          </div>
          <Button variant="secondary" className="gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Draft proposal
          </Button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
            <Bell className="h-4 w-4" />
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
