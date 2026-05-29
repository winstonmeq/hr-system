"use client";

import { useState } from "react";

type ResetPasswordDialogProps = {
  open: boolean;
  userName: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
};

export function ResetPasswordDialog({
  open,
  userName,
  submitting,
  onClose,
  onSubmit,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState("");

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit(password);

    setPassword("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Reset Password</h2>

          <p className="text-sm text-muted-foreground">
            Set a new password for {userName}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="text-sm font-medium">New Password</label>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border px-3 text-sm"
            />

            <p className="mt-1 text-xs text-muted-foreground">
              Minimum 8 characters.
            </p>
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
              {submitting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}