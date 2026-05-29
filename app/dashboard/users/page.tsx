import "@/models/Role";

import { requirePermission } from "@/lib/auth/guards";
import { permissions } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongoose";
import { serializeUser } from "@/lib/users/serialize-user";
import { RoleModel } from "@/models/Role";
import { UserModel } from "@/models/User";

import { UsersPageClient } from "./users-page-client";
import type { RoleOption, UserRow } from "./users-page-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePermission(permissions.usersRead, "/dashboard/users");

  await connectToDatabase();

  const limit = 20;

  const [usersFromDb, totalUsers, rolesFromDb] = await Promise.all([
    UserModel.find({})
      .select("-passwordHash")
      .populate({
        path: "role",
        select: "name slug",
      })
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean(),

    UserModel.countDocuments({}),

    RoleModel.find({})
      .select("name slug description")
      .sort({
        name: 1,
      })
      .lean(),
  ]);

  const users: UserRow[] = usersFromDb.map(serializeUser);

  const roles: RoleOption[] = rolesFromDb.map((role) => ({
    id: role._id.toString(),
    name: role.name,
    slug: role.slug,
    description: role.description,
  }));

  return (
    <UsersPageClient
      initialUsers={users}
      roles={roles}
      initialPagination={{
        page: 1,
        limit,
        total: totalUsers,
        totalPages: Math.max(1, Math.ceil(totalUsers / limit)),
        hasNextPage: totalUsers > limit,
        hasPreviousPage: false,
      }}
    />
  );
}