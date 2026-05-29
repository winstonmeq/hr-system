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

import {
  hasPermission,
  permissions,
  type Permission,
} from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
  requiredPermission?: Permission;
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
        requiredPermission: permissions.dashboardRead,
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
        requiredPermission: permissions.usersRead,
      },
      {
        label: "Roles",
        href: "/dashboard/roles",
        icon: ShieldCheck,
        requiredPermission: permissions.rolesRead,
      },
      {
        label: "Audit Logs",
        href: "/dashboard/audit-logs",
        icon: ScrollText,
        requiredPermission: permissions.auditLogsRead,
      },
    ],
  },
  {
    title: "HR Management",
    items: [
      {
        label: "Employees",
         href: "/dashboard/employees",
        icon: Building2,
        requiredPermission: permissions.employeesRead,
      },
       {
      label: "Leave Management",
      href: "/dashboard/leave",
      icon: CalendarClock,
      requiredPermission: permissions.leaveRead,
    },


    {
  label: "Leave Credits",
  href: "/dashboard/leave-credits",
  icon: CalendarClock,
  requiredPermission: permissions.leaveRead,
},


      {
        label: "Attendance",
        icon: Clock3,
        badge: "Soon",
        disabled: true,
        requiredPermission: permissions.attendanceRead,
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

function canViewItem(role: string | undefined, item: NavItem) {
  if (!item.requiredPermission) {
    return true;
  }

  return hasPermission(role, item.requiredPermission);
}

export function DashboardSidebar({ role }: { role?: string }) {
  const pathname = usePathname();

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canViewItem(role, item)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white px-5 py-6 lg:block">
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f62fe] text-white shadow-sm">
          <BadgeCheck className="h-6 w-6" />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-950">Government HR</p>
          <p className="text-xs text-slate-500">Management System</p>
        </div>
      </Link>

      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
          <Sparkles className="h-4 w-4" />
          Phase 1 Foundation
        </div>
        <p className="mt-2 text-xs leading-5 text-blue-700/80">
          Users, roles, authentication, and audit-ready administration.
        </p>
      </div>

      <nav className="mt-7 space-y-7">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);

                const content = (
                  <>
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </span>

                    <span className="flex items-center gap-2">
                      {item.badge ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                          {item.badge}
                        </span>
                      ) : null}

                      {!item.disabled ? (
                        <ChevronRight className="h-4 w-4 opacity-40" />
                      ) : null}
                    </span>
                  </>
                );

                const className = cn(
                  "flex h-11 items-center justify-between rounded-xl px-3 text-sm font-medium transition",
                  sidebarItemClass(active, item.disabled),
                );

                if (item.disabled || !item.href) {
                  return (
                    <span key={item.label} className={className}>
                      {content}
                    </span>
                  );
                }

                return (
                  <Link key={item.label} href={item.href} className={className}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          System Status
        </p>
        <p className="mt-2 text-sm font-medium text-slate-700">
          Auth and RBAC active
        </p>
      </div>
    </aside>
  );
}