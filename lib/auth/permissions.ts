import type { RoleSlug } from "@/models/Role";

export const permissions = {
  all: "*",

  dashboardRead: "dashboard:read",

  usersRead: "users:read",
  usersCreate: "users:create",
  usersUpdate: "users:update",
  usersManageStatus: "users:manage-status",
  usersResetPassword: "users:reset-password",

  rolesRead: "roles:read",
  auditLogsRead: "audit_logs:read",

  departmentRead: "department:read",
  teamRead: "team:read",
  profileRead: "profile:read",
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];

export const rolePermissions: Record<RoleSlug, Permission[]> = {
  "super-admin": [permissions.all],

  "hr-admin": [
    permissions.dashboardRead,

    permissions.usersRead,
    permissions.usersCreate,
    permissions.usersUpdate,
    permissions.usersManageStatus,
    permissions.usersResetPassword,

    permissions.rolesRead,
    permissions.auditLogsRead,
  ],

  "department-head": [
    permissions.dashboardRead,
    permissions.departmentRead,
  ],

  supervisor: [
    permissions.dashboardRead,
    permissions.teamRead,
  ],

  employee: [
    permissions.dashboardRead,
    permissions.profileRead,
  ],
};

export function hasPermission(role: string | undefined, permission: Permission) {
  if (!role || !(role in rolePermissions)) {
    return false;
  }

  const grantedPermissions = rolePermissions[role as RoleSlug];

  return (
    grantedPermissions.includes(permissions.all) ||
    grantedPermissions.includes(permission)
  );
}