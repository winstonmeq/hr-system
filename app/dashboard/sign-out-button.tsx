"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
    >
      Sign out
    </button>
  );
}
