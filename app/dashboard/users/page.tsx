import "@/models/Role";

import { requirePermission } from "@/lib/auth/guards";
import { permissions } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongoose";
import { RoleModel } from "@/models/Role";
import { UserModel } from "@/models/User";

import { UsersPageClient } from "./users-page-client";
import type { RoleOption, UserRow } from "./users-page-client";

function toDateString(value: unknown) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export default async function UsersPage() {
  await requirePermission(permissions.usersRead, "/dashboard/users");

  await connectToDatabase();

  const [usersFromDb, rolesFromDb] = await Promise.all([
    UserModel.find({})
      .select(
        "email name role status governmentId department position lastLoginAt createdAt",
      )
      .populate({
        path: "role",
        select: "name slug",
      })
      .sort({
        createdAt: -1,
      })
      .lean(),

    RoleModel.find({})
      .select("name slug description")
      .sort({
        name: 1,
      })
      .lean(),
  ]);

  const users: UserRow[] = usersFromDb.map((user) => {
    const populatedRole = user.role as unknown as {
      _id: { toString: () => string };
      name?: string;
      slug?: string;
    } | null;

    return {
      id: user._id.toString(),
      email: user.email,
      name: {
        first: user.name?.first ?? "",
        middle: user.name?.middle ?? "",
        last: user.name?.last ?? "",
      },
      role: populatedRole
        ? {
            id: populatedRole._id.toString(),
            name: populatedRole.name ?? "-",
            slug: populatedRole.slug ?? "-",
          }
        : null,
      status: user.status,
      governmentId: user.governmentId ?? "",
      department: user.department ?? "",
      position: user.position ?? "",
      lastLoginAt: toDateString(user.lastLoginAt),
      createdAt: toDateString(user.createdAt),
    };
  });

  const roles: RoleOption[] = rolesFromDb.map((role) => ({
    id: role._id.toString(),
    name: role.name,
    slug: role.slug,
    description: role.description,
  }));

  return <UsersPageClient initialUsers={users} roles={roles} />;
}