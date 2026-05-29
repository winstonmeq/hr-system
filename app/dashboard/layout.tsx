import type { ReactNode } from "react";

import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { requireAuth } from "@/lib/auth/guards";

import { DashboardSidebar } from "./dashboard-sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await requireAuth("/dashboard");

  const displayName = session.user.name ?? session.user.email ?? "User";
  const displayEmail = session.user.email ?? "";
  const roleName = session.user.roleName ?? session.user.role ?? "System User";

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardSidebar role={session.user.role} />

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f62fe] text-sm font-bold text-white lg:hidden">
                HR
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500">
                  {roleName}
                  {displayEmail ? ` • ${displayEmail}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="hidden h-10 min-w-[280px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 md:flex">
                Search modules, users, roles...
              </div>

              <span className="inline-flex h-10 items-center rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                Phase 1
              </span>

              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}