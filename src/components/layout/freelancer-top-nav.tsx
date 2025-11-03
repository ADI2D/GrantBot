"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { UserMenu } from "@/components/auth/user-menu";

export function FreelancerTopNav() {
  const left = (
    <div className="hidden text-xs uppercase tracking-wide text-blue-600 md:block">
      Freelancer workspace
    </div>
  );

  const right = (
    <>
      <Link
        href="/freelancer/clients/new"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <PlusCircle className="h-4 w-4" />
        New client
      </Link>
      <UserMenu />
    </>
  );

  return <HeaderShell left={left} right={right} />;
}
