"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/auth/user-menu";
import { adminNavItems, getRoleLabel, roleTone, type AdminRole } from "@/lib/admin";

export function AdminShell({
  children,
  role,
  email,
}: {
  children: ReactNode;
  role: AdminRole;
  email: string | null;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white px-5 py-6 lg:flex lg:flex-col">
        <div>
          <Link href="/admin" className="block text-lg font-semibold text-slate-900">
            GrantBot Admin
          </Link>
          <p className="mt-1 text-xs text-slate-500">Internal operations</p>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1 text-sm font-medium">
          {adminNavItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 transition",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Need help?</p>
          <p>Contact the product team in Slack or hello@grantbot.ai.</p>
        </div>
      </aside>
      <main className="flex-1">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs uppercase text-slate-400">Signed in as</p>
              <p className="text-sm font-medium text-slate-700">{email ?? "Unknown"}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={roleTone(role)}>{getRoleLabel(role)}</Badge>
              <UserMenu />
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-6 py-10">{children}</div>
      </main>
    </div>
  );
}
