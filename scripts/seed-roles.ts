import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

import { rolePermissions } from "@/lib/auth/permissions";
import type { RoleSlug } from "@/models/Role";

loadEnvConfig(process.cwd());

const roles: Array<{
  name: string;
  slug: RoleSlug;
  description: string;
  permissions: string[];
}> = [
  {
    name: "Super Admin",
    slug: "super-admin",
    description: "Full system access for platform ownership and configuration.",
    permissions: rolePermissions["super-admin"],
  },
  {
    name: "HR Admin",
    slug: "hr-admin",
    description: "Administrative access for HR operations and employee records.",
    permissions: rolePermissions["hr-admin"],
  },
  {
    name: "Department Head",
    slug: "department-head",
    description: "Department-level oversight for staff and approvals.",
    permissions: rolePermissions["department-head"],
  },
  {
    name: "Supervisor",
    slug: "supervisor",
    description: "Team-level oversight for direct reports.",
    permissions: rolePermissions.supervisor,
  },
  {
    name: "Employee",
    slug: "employee",
    description: "Default employee access for self-service workflows.",
    permissions: rolePermissions.employee,
  },
];

async function seedRoles() {
  const [{ connectToDatabase }, { RoleModel }] = await Promise.all([
    import("@/lib/db/mongoose"),
    import("@/models/Role"),
  ]);

  await connectToDatabase();

  const results = await Promise.all(
    roles.map((role) =>
      RoleModel.updateOne(
        { slug: role.slug },
        {
          $set: {
            name: role.name,
            description: role.description,
            permissions: role.permissions,
          },
          $setOnInsert: {
            slug: role.slug,
            isSystem: true,
          },
        },
        { upsert: true },
      ),
    ),
  );

  const upsertedCount = results.reduce(
    (total, result) => total + result.upsertedCount,
    0,
  );

  console.log(
    `Seeded ${roles.length} roles (${upsertedCount} inserted, ${
      roles.length - upsertedCount
    } updated).`,
  );
}

seedRoles()
  .catch((error) => {
    console.error("Failed to seed roles.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
