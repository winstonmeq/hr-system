"use client";

import type { ComponentType } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

type NavItem = {
  label: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "General",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Users",
        href: "/dashboard/users",
        icon: UsersRound,
      },
      {
        label: "Roles",
        href: "/dashboard/roles",
        icon: ShieldCheck,
      },
      {
        label: "Audit Logs",
        href: "/dashboard/audit-logs",
        icon: ScrollText,
      },
    ],
  },
  {
    title: "HR Management",
    items: [
      {
        label: "Employees",
        icon: Building2,
        badge: "Soon",
        disabled: true,
      },
      {
        label: "Leave Management",
        icon: CalendarClock,
        badge: "Soon",
        disabled: true,
      },
      {
        label: "Attendance",
        icon: Clock3,
        badge: "Soon",
        disabled: true,
      },
    ],
  },
];

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;

  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function sidebarItemClass(active: boolean, disabled?: boolean) {
  if (disabled) {
    return "cursor-not-allowed text-slate-400";
  }

  if (active) {
    return "bg-[#ecf4ff] text-[#0f62fe] shadow-sm ring-1 ring-blue-100";
  }

  return "text-slate-600 hover:bg-slate-100 hover:text-slate-950";
}

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-[292px] shrink-0 border-r border-slate-200 bg-white p-4 lg:flex lg:flex-col">
      <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-950">
            G
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Government HR</p>
            <p className="truncate text-xs text-slate-300">
              Management System
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-300" />

            <p className="text-xs font-medium text-slate-200">
              Phase 1 Foundation
            </p>
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Users, roles, authentication, and audit-ready administration.
          </p>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto rounded-3xl border border-slate-200 bg-[#fbfbfd] p-3">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <BadgeCheck className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                Admin Workspace
              </p>

              <p className="truncate text-xs text-slate-500">
                HR system control center
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {group.title}
              </p>

              <div className="grid gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);

                  const content = (
                    <div
                      className={`group flex h-11 items-center justify-between rounded-2xl px-3 text-sm font-medium transition ${sidebarItemClass(
                        active,
                        item.disabled,
                      )}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" />

                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge ? (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {item.badge}
                        </span>
                      ) : (
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 transition ${
                            active
                              ? "text-[#0f62fe]"
                              : "text-slate-300 group-hover:text-slate-500"
                          }`}
                        />
                      )}
                    </div>
                  );

                  if (item.disabled || !item.href) {
                    return <div key={item.label}>{content}</div>;
                  }

                  return (
                    <Link key={item.href} href={item.href}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-[#fbfbfd] p-4">
        <p className="text-xs font-semibold text-slate-950">System Status</p>

        <div className="mt-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-500">Auth and RBAC active</span>
        </div>
      </div>
    </aside>
  );
}