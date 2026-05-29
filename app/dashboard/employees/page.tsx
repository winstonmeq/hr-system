import "@/models/Employee";

import { requirePermission } from "@/lib/auth/guards";
import { permissions } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongoose";
import { serializeEmployee } from "@/lib/employees/serialize-employee";
import { EmployeeModel } from "@/models/Employee";

import {
  EmployeesPageClient,
  type EmployeeRow,
} from "./employees-page-client";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  await requirePermission(permissions.employeesRead, "/dashboard/employees");

  await connectToDatabase();

  const limit = 20;

  const [employeesFromDb, totalEmployees] = await Promise.all([
    EmployeeModel.find({})
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean(),

    EmployeeModel.countDocuments({}),
  ]);

  const employees: EmployeeRow[] = employeesFromDb.map(serializeEmployee);

  return (
    <EmployeesPageClient
      initialEmployees={employees}
      initialPagination={{
        page: 1,
        limit,
        total: totalEmployees,
        totalPages: Math.max(1, Math.ceil(totalEmployees / limit)),
        hasNextPage: totalEmployees > limit,
        hasPreviousPage: false,
      }}
    />
  );
}