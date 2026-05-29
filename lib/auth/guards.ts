import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import type { RoleSlug } from "@/models/Role";

export async function requireAuth(callbackUrl = "/dashboard") {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return session;
}

export async function requireRole(roles: RoleSlug[], callbackUrl = "/dashboard") {
  const session = await requireAuth(callbackUrl);

  if (!roles.includes(session.user.role as RoleSlug)) {
    redirect("/dashboard");
  }

  return session;
}

export async function requirePermission(
  permission: Permission,
  callbackUrl = "/dashboard",
) {
  const session = await requireAuth(callbackUrl);

  if (!hasPermission(session.user.role, permission)) {
    redirect("/dashboard");
  }

  return session;
}
