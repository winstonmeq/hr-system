import { requirePermission } from "@/lib/auth/guards";
import { permissions } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongoose";

import { RoleModel } from "@/models/Role";

export default async function RolesPage() {
  await requirePermission(
    permissions.rolesRead,
    "/dashboard/roles",
  );

  await connectToDatabase();

  const roles = await RoleModel.find({})
    .sort({ name: 1 })
    .lean();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Roles & Permissions
          </h1>

          <p className="text-slate-500">
            Manage system roles and permissions.
          </p>
        </div>

        <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white">
          Add Role
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-6 py-4 text-left">
                Role
              </th>

              <th className="px-6 py-4 text-left">
                Slug
              </th>

              <th className="px-6 py-4 text-left">
                Permissions
              </th>

              <th className="px-6 py-4 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {roles.map((role: any) => (
              <tr
                key={role._id.toString()}
                className="border-b"
              >
                <td className="px-6 py-4 font-medium">
                  {role.name}
                </td>

                <td className="px-6 py-4">
                  {role.slug}
                </td>

                <td className="px-6 py-4">
                  {role.permissions.length}
                </td>

                <td className="px-6 py-4 text-right">
                  <button className="rounded border px-3 py-1 text-sm">
                    Edit
                  </button>
                </td>
              </tr>
            ))}

            {roles.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-slate-500"
                >
                  No roles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}