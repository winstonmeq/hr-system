import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import { hasPermission, permissions } from "@/lib/auth/permissions";
import type { RoleSlug } from "@/models/Role";

export type Permission = (typeof permissions)[keyof typeof permissions];

export async function requireApiPermission(permission: Permission) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 },
      ),
    };
  }

  const role = session.user.role as RoleSlug;

  if (!hasPermission(role, permission)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Forbidden." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    session,
  };
}