"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Briefcase, Clock, Target, Activity, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { FreelancerTopNav } from "@/components/layout/freelancer-top-nav";

const navItems = [
  {
    label: "Clients",
    href: "/freelancer/clients",
    icon: Briefcase,
  },
  {
    label: "Opportunities",
    href: "/freelancer/opportunities",
    icon: Target,
  },
  {
    label: "Time tracking",
    href: "/freelancer/time-tracking",
    icon: Clock,
  },
  {
    label: "Invoices",
    href: "/freelancer/invoices",
    icon: FileText,
  },
  {
    label: "Token usage",
    href: "/freelancer/usage",
    icon: Activity,
  },
];

export function FreelancerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-6 lg:flex">
          <Link href="/freelancer/clients" className="block">
            <div className="flex w-full items-center justify-center py-4">
              <div className="relative h-8" style={{ width: '160px' }}>
                <Image
                  src="/grantspec-logo.png"
                  alt="GrantSpec"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-center text-base font-bold uppercase mt-1" style={{ color: '#4A9B7F' }}>Freelancer</h1>
          </Link>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-400")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">
          <FreelancerTopNav />
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
