"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Sparkles,
  Layers,
  ClipboardList,
  Target,
  BarChart3,
  FileText,
  CreditCard,
  Settings,
  Shield,
  Users,
  UserCog,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "Onboarding", href: "/onboarding", icon: Sparkles },
  { label: "Opportunities", href: "/opportunities", icon: Target },
  { label: "Proposals", href: "/proposals", icon: FileText },
  { label: "Workspace", href: "/workspace", icon: Layers },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Checklists", href: "/checklists", icon: ClipboardList },
  { label: "Billing", href: "/billing", icon: CreditCard },
];

const adminNavItems = [
  { label: "Admin Dashboard", href: "/admin", icon: Shield },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Users", href: "/admin/users", icon: UserCog },
  { label: "Connectors", href: "/admin/connectors", icon: Zap },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col gap-6 border-r border-slate-100 bg-white px-5 py-6 lg:flex">
      <div>
        <Link className="flex items-center gap-2" href="/dashboard">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white font-semibold">
            GB
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">GrantBot</p>
            <p className="text-xs text-slate-500">AI Grant Workspace</p>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 text-sm font-medium">
        {/* User Navigation */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 transition",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Admin Section Divider */}
        <div className="my-4 border-t border-slate-200 pt-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Admin
          </p>
        </div>

        {/* Admin Navigation */}
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 transition",
                isActive
                  ? "bg-rose-50 text-rose-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4">
        <p className="text-sm font-semibold text-blue-900">
          Ship proposals 4x faster
        </p>
        <p className="mt-1 text-xs text-blue-800/80">
          Track onboarding progress, invite editors, and monitor AI usage inside one workspace.
        </p>
        <Link
          href="/onboarding"
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
        >
          Launch onboarding
        </Link>
      </div>
    </aside>
  );
}
