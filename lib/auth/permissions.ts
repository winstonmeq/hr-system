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

  employeesRead: "employees:read",
  employeesCreate: "employees:create",
  employeesUpdate: "employees:update",

  leaveRead: "leave:read",
  leaveManage: "leave:manage",
  leaveRecommend: "leave:recommend",




  attendanceRead: "attendance:read",
  attendanceManage: "attendance:manage",

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

    permissions.employeesRead,
    permissions.employeesCreate,
    permissions.employeesUpdate,

    permissions.leaveRead,
    permissions.leaveManage,

    permissions.attendanceRead,
    permissions.attendanceManage,
  ],

  "department-head": [
    permissions.dashboardRead,
    permissions.departmentRead,
    permissions.teamRead,
    permissions.employeesRead,
    permissions.leaveRead,
    permissions.attendanceRead,
    permissions.leaveRecommend,
    permissions.attendanceRead,
  ],

  supervisor: [
    permissions.dashboardRead,
    permissions.teamRead,
    permissions.employeesRead,
    permissions.leaveRead,
    permissions.attendanceRead,
  ],

  employee: [
    permissions.dashboardRead,
    permissions.profileRead,
    permissions.leaveRead,
    permissions.attendanceRead,
  ],
};

export function hasPermission(
  role: string | undefined | null,
  permission: Permission,
) {
  if (!role || !(role in rolePermissions)) {
    return false;
  }

  const grantedPermissions = rolePermissions[role as RoleSlug];

  return (
    grantedPermissions.includes(permissions.all) ||
    grantedPermissions.includes(permission)
  );
}