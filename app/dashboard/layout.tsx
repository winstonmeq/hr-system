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
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <div className="flex min-h-screen">
        <DashboardSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f6f7fb]/90 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                  HR
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {displayName}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {roleName} {displayEmail ? `• ${displayEmail}` : ""}
                  </p>
                </div>
              </div>

              <div className="hidden flex-1 justify-center px-6 lg:flex">
                <div className="flex h-10 w-full max-w-xl items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500">
                  Search modules, users, roles...
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 sm:block">
                  Phase 1
                </div>

                <SignOutButton />
              </div>
            </div>
          </header>

          <section className="flex-1 px-4 py-5 md:px-6 md:py-6">
            <div className="mx-auto w-full max-w-[1500px]">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}