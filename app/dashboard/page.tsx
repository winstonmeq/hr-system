import { requirePermission } from "@/lib/auth/guards";
import { permissions } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requirePermission(permissions.dashboardRead, "/dashboard");

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Government HR Management System
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Dashboard
        </h1>
      </div>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm text-slate-500">Account</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            {session.user.name}
          </h2>
          <p className="text-sm text-slate-600">{session.user.email}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Role</p>
            <p className="mt-1 font-medium text-slate-950">
              {session.user.roleName}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Session</p>
            <p className="mt-1 font-medium text-emerald-700">Authenticated</p>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Access</p>
            <p className="mt-1 font-medium text-slate-950">RBAC enforced</p>
          </div>
        </div>
      </section>
    </div>
  );
}
