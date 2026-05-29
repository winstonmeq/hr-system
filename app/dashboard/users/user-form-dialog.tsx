"use client";

import { useEffect, useState } from "react";

import type { RoleOption, UserRow, UserStatus } from "./users-page-client";

export type UserFormValues = {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password?: string;
  roleId: string;
  status: UserStatus;
  governmentId?: string;
  department?: string;
  position?: string;
};

type UserFormDialogProps = {
  open: boolean;
  roles: RoleOption[];
  user: UserRow | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
};

const emptyForm: UserFormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  password: "",
  roleId: "",
  status: "active",
  governmentId: "",
  department: "",
  position: "",
};

export function UserFormDialog({
  open,
  roles,
  user,
  submitting,
  onClose,
  onSubmit,
}: UserFormDialogProps) {
  const [form, setForm] = useState<UserFormValues>(emptyForm);

  const isEditing = Boolean(user);

  useEffect(() => {
    if (!open) return;

    if (user) {
      setForm({
        firstName: user.name.first,
        middleName: user.name.middle ?? "",
        lastName: user.name.last,
        email: user.email,
        password: "",
        roleId: user.role?.id ?? "",
        status: user.status,
        governmentId: user.governmentId ?? "",
        department: user.department ?? "",
        position: user.position ?? "",
      });
    } else {
      setForm({
        ...emptyForm,
        roleId: roles[0]?.id ?? "",
      });
    }
  }, [open, user, roles]);

  if (!open) return null;

  function updateForm<K extends keyof UserFormValues>(
    key: K,
    value: UserFormValues[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: UserFormValues = {
      ...form,
      email: form.email.trim().toLowerCase(),
      firstName: form.firstName.trim(),
      middleName: form.middleName?.trim(),
      lastName: form.lastName.trim(),
      governmentId: form.governmentId?.trim(),
      department: form.department?.trim(),
      position: form.position?.trim(),
    };

    if (isEditing) {
      delete payload.password;
    }

    await onSubmit(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit User" : "Add User"}
          </h2>

          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Update the selected system account."
              : "Create a new system login account."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <input
                required
                value={form.firstName}
                onChange={(event) => updateForm("firstName", event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Middle Name</label>
              <input
                value={form.middleName ?? ""}
                onChange={(event) =>
                  updateForm("middleName", event.target.value)
                }
                className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Last Name</label>
              <input
                required
                value={form.lastName}
                onChange={(event) => updateForm("lastName", event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
              />
            </div>

            {!isEditing ? (
              <div>
                <label className="text-sm font-medium">Password</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={form.password ?? ""}
                  onChange={(event) =>
                    updateForm("password", event.target.value)
                  }
                  className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
                />

                <p className="mt-1 text-xs text-muted-foreground">
                  Minimum 8 characters.
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                required
                value={form.roleId}
                onChange={(event) => updateForm("roleId", event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="">Select role</option>

                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={form.status}
                onChange={(event) =>
                  updateForm("status", event.target.value as UserStatus)
                }
                className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Government ID</label>
              <input
                value={form.governmentId ?? ""}
                onChange={(event) =>
                  updateForm("governmentId", event.target.value)
                }
                className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Department</label>
              <input
                value={form.department ?? ""}
                onChange={(event) =>
                  updateForm("department", event.target.value)
                }
                className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Position</label>
              <input
                value={form.position ?? ""}
                onChange={(event) => updateForm("position", event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {submitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}