import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";
import { authOptions } from "@/lib/auth/options";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Government HR Management System
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Use your administrator account to access the HR workspace.
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
