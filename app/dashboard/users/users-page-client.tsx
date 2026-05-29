"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type UsersPageClientProps = {
  initialUsers: UserRow[];
  roles: RoleOption[];
  initialPagination: Pagination;
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
    id: user.id ?? user._id?.toString?.(),
    email: user.email,
    name: {
      first: user.name?.first ?? "",
      middle: user.name?.middle ?? "",
      last: user.name?.last ?? "",
    },
    role: user.role
      ? {
          id: user.role.id ?? user.role._id?.toString?.(),
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

export function UsersPageClient({
  initialUsers,
  roles,
  initialPagination,
}: UsersPageClientProps) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(
    null,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const currentPage = pagination.page;

  const activeUsersOnPage = useMemo(
    () => users.filter((user) => user.status === "active").length,
    [users],
  );

  const inactiveUsersOnPage = useMemo(
    () => users.filter((user) => user.status === "inactive").length,
    [users],
  );

  const suspendedUsersOnPage = useMemo(
    () => users.filter((user) => user.status === "suspended").length,
    [users],
  );

  const loadUsers = useCallback(
    async (page = 1) => {
      setIsLoadingUsers(true);

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pagination.limit),
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (roleFilter !== "all") {
          params.set("roleId", roleFilter);
        }

        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }

        const response = await fetch(`/api/admin/users?${params.toString()}`, {
          method: "GET",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Failed to load users.");
        }

        setUsers(data.users.map(normalizeUserFromApi));
        setPagination(data.pagination);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to load users.");
      } finally {
        setIsLoadingUsers(false);
      }
    },
    [pagination.limit, roleFilter, search, statusFilter],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsers(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [loadUsers]);

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

      setIsFormOpen(false);
      setEditingUser(null);

      await loadUsers(editingUser ? currentPage : 1);
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

      await loadUsers(currentPage);
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

      await loadUsers(currentPage);
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
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            User Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage system login accounts, access roles, and account status.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="h-11 rounded-xl bg-[#0f62fe] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Add User
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Total Results</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {pagination.total}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Active on Page</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {activeUsersOnPage}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Inactive on Page</p>
          <p className="mt-2 text-2xl font-bold text-slate-700">
            {inactiveUsersOnPage}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Suspended on Page</p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {suspendedUsersOnPage}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, government ID, department, or position..."
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:max-w-sm"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Last Login</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="bg-white">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                          {getInitials(user)}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-950">
                            {formatName(user)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user.email}
                          </p>
                          {user.governmentId ? (
                            <p className="mt-1 text-xs text-slate-400">
                              Gov ID: {user.governmentId}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {user.role?.name ?? "-"}
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-slate-700">
                        {user.department || "-"}
                      </p>
                      {user.position ? (
                        <p className="text-xs text-slate-400">
                          {user.position}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4">
                      <UserStatusBadge status={user.status} />
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {formatDateTime(user.lastLoginAt)}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(user)}
                          className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => setResetPasswordUser(user)}
                          className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
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
                            onClick={() =>
                              handleChangeStatus(user, "suspended")
                            }
                            className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                          >
                            Suspend
                          </button>
                        ) : null}

                        {user.status !== "inactive" ? (
                          <button
                            type="button"
                            onClick={() => handleDeactivateUser(user)}
                            className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                          >
                            Deactivate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}

                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      {isLoadingUsers ? "Loading users..." : "No users found."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
            {isLoadingUsers ? " • Loading..." : ""}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!pagination.hasPreviousPage || isLoadingUsers}
              onClick={() => loadUsers(currentPage - 1)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!pagination.hasNextPage || isLoadingUsers}
              onClick={() => loadUsers(currentPage + 1)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
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