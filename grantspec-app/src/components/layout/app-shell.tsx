import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1">
          <TopNav />
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
