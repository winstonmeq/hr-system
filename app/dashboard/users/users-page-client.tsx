"use client";

import { useMemo, useState } from "react";

import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserFormDialog, type UserFormValues } from "./user-form-dialog";
import { UserStatusBadge } from "./user-status-badge";

export type UserStatus = "active" | "inactive" | "suspended";

export type RoleOption = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

export type UserRow = {
  id: string;
  email: string;
  name: {
    first: string;
    middle?: string;
    last: string;
  };
  role: {
    id: string;
    name: string;
    slug: string;
  } | null;
  status: UserStatus;
  governmentId?: string;
  department?: string;
  position?: string;
  lastLoginAt: string | null;
  createdAt: string | null;
};

type UsersPageClientProps = {
  initialUsers: UserRow[];
  roles: RoleOption[];
};

function formatName(user: UserRow) {
  return [user.name.first, user.name.middle, user.name.last]
    .filter(Boolean)
    .join(" ");
}

function getInitials(user: UserRow) {
  return `${user.name.first[0] ?? ""}${user.name.last[0] ?? ""}`.toUpperCase();
}

function formatDateTime(value: string | null) {
  if (!value) return "Never";

  return new Date(value).toLocaleString();
}

function normalizeUserFromApi(user: any): UserRow {
  return {
    id: user._id?.toString?.() ?? user.id,
    email: user.email,
    name: {
      first: user.name?.first ?? "",
      middle: user.name?.middle ?? "",
      last: user.name?.last ?? "",
    },
    role: user.role
      ? {
          id: user.role._id?.toString?.() ?? user.role.id,
          name: user.role.name ?? "-",
          slug: user.role.slug ?? "-",
        }
      : null,
    status: user.status,
    governmentId: user.governmentId ?? "",
    department: user.department ?? "",
    position: user.position ?? "",
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt ?? null,
  };
}

export function UsersPageClient({ initialUsers, roles }: UsersPageClientProps) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(
    null,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((user) => {
      const fullName = formatName(user).toLowerCase();

      const matchesSearch =
        !keyword ||
        fullName.includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.department?.toLowerCase().includes(keyword) ||
        user.position?.toLowerCase().includes(keyword);

      const matchesRole =
        roleFilter === "all" || user.role?.id === roleFilter;

      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === "active").length;
  const inactiveUsers = users.filter(
    (user) => user.status === "inactive",
  ).length;
  const suspendedUsers = users.filter(
    (user) => user.status === "suspended",
  ).length;

  function openCreateForm() {
    setEditingUser(null);
    setIsFormOpen(true);
  }

  function openEditForm(user: UserRow) {
    setEditingUser(user);
    setIsFormOpen(true);
  }

  async function handleSubmitUser(values: UserFormValues) {
    setIsSubmitting(true);

    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : "/api/admin/users";

      const method = editingUser ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to save user.");
      }

      const savedUser = normalizeUserFromApi(data.user);

      setUsers((currentUsers) => {
        if (editingUser) {
          return currentUsers.map((user) =>
            user.id === editingUser.id ? savedUser : user,
          );
        }

        return [savedUser, ...currentUsers];
      });

      setIsFormOpen(false);
      setEditingUser(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save user.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChangeStatus(user: UserRow, status: UserStatus) {
    const confirmed = window.confirm(
      `Are you sure you want to set ${formatName(user)} as ${status}?`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to update user status.");
      }

      const updatedUser = normalizeUserFromApi(data.user);

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id ? updatedUser : currentUser,
        ),
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update user status.",
      );
    }
  }

  async function handleDeactivateUser(user: UserRow) {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${formatName(user)}?`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to deactivate user.");
      }

      const updatedUser = normalizeUserFromApi(data.user);

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id ? updatedUser : currentUser,
        ),
      );
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to deactivate user.",
      );
    }
  }

  async function handleResetPassword(password: string) {
    if (!resetPasswordUser) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/users/${resetPasswordUser.id}/password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to reset password.");
      }

      alert("Password reset successfully.");
      setResetPasswordUser(null);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to reset password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            User Management
          </h1>

          <p className="text-muted-foreground">
            Manage system login accounts, access roles, and account status.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white hover:opacity-90"
        >
          + Add User
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="mt-2 text-3xl font-bold">{totalUsers}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {activeUsers}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Inactive</p>
          <p className="mt-2 text-3xl font-bold text-slate-600">
            {inactiveUsers}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Suspended</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {suspendedUsers}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, department, or position..."
            className="h-10 w-full rounded-lg border px-3 text-sm md:max-w-sm"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-10 rounded-lg border px-3 text-sm"
            >
              <option value="all">All Roles</option>

              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border px-3 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  User
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Role
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Department
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Status
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Last Login
                </th>

                <th className="px-6 py-4 text-right text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold">
                        {getInitials(user)}
                      </div>

                      <div>
                        <p className="font-medium">{formatName(user)}</p>

                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>

                        {user.governmentId ? (
                          <p className="text-xs text-muted-foreground">
                            Gov ID: {user.governmentId}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {user.role?.name ?? "-"}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    <div>
                      <p>{user.department || "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.position || ""}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <UserStatusBadge status={user.status} />
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {formatDateTime(user.lastLoginAt)}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(user)}
                        className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setResetPasswordUser(user)}
                        className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
                      >
                        Password
                      </button>

                      {user.status !== "active" ? (
                        <button
                          type="button"
                          onClick={() => handleChangeStatus(user, "active")}
                          className="rounded-md border border-green-200 px-3 py-1 text-sm text-green-700 hover:bg-green-50"
                        >
                          Activate
                        </button>
                      ) : null}

                      {user.status !== "suspended" ? (
                        <button
                          type="button"
                          onClick={() => handleChangeStatus(user, "suspended")}
                          className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                        >
                          Suspend
                        </button>
                      ) : null}

                      {user.status !== "inactive" ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivateUser(user)}
                          className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
                        >
                          Deactivate
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormDialog
        open={isFormOpen}
        roles={roles}
        user={editingUser}
        submitting={isSubmitting}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleSubmitUser}
      />

      <ResetPasswordDialog
        open={Boolean(resetPasswordUser)}
        userName={resetPasswordUser ? formatName(resetPasswordUser) : ""}
        submitting={isSubmitting}
        onClose={() => setResetPasswordUser(null)}
        onSubmit={handleResetPassword}
      />
    </div>
  );
}