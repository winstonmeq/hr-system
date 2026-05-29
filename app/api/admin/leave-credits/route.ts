import "@/models/Employee";
import "@/models/LeaveCredit";

import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongoose";
import { EmployeeModel } from "@/models/Employee";
import { LeaveCreditSummaryModel } from "@/models/LeaveCredit";

function readPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function employeeFullName(employee: any) {
  const name = employee.personalInfo?.name ?? {};

  return [
    name.surname ? `${name.surname},` : "",
    name.firstName,
    name.middleName,
    name.nameExtension,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function GET(request: NextRequest) {
  const auth = await requireApiPermission(permissions.leaveRead);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);

  const page = readPositiveInteger(searchParams.get("page"), 1);
  const limit = Math.min(
    readPositiveInteger(searchParams.get("limit"), 20),
    100,
  );
  const search = searchParams.get("search")?.trim() ?? "";

  await connectToDatabase();

  const employeeFilter: Record<string, unknown> = {
    status: "active",
  };

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");

    employeeFilter.$or = [
      { employeeNumber: regex },
      { "personalInfo.name.surname": regex },
      { "personalInfo.name.firstName": regex },
      { "personalInfo.name.middleName": regex },
      { "workExperience.positionTitle": regex },
      { "workExperience.departmentAgencyOfficeCompany": regex },
    ];
  }

  const skip = (page - 1) * limit;

  const [employees, total] = await Promise.all([
    EmployeeModel.find(employeeFilter)
      .select("employeeNumber personalInfo.name workExperience status")
      .sort({
        "personalInfo.name.surname": 1,
        "personalInfo.name.firstName": 1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    EmployeeModel.countDocuments(employeeFilter),
  ]);

  const employeeIds = employees.map((employee: any) => employee._id);

  const summaries = await LeaveCreditSummaryModel.find({
    employee: { $in: employeeIds },
  }).lean();

  const summaryMap = new Map(
    summaries.map((summary: any) => [
      summary.employee?.toString?.() ?? "",
      summary,
    ]),
  );

  const leaveCredits = employees.map((employee: any) => {
    const summary = summaryMap.get(employee._id.toString());
    const currentWork = Array.isArray(employee.workExperience)
      ? employee.workExperience[0]
      : null;

    return {
      employeeId: employee._id.toString(),
      employeeNumber: employee.employeeNumber,
      employeeName: employeeFullName(employee),
      officeDepartment: currentWork?.departmentAgencyOfficeCompany ?? "",
      position: currentWork?.positionTitle ?? "",
      vacationLeaveBalance: summary?.vacationLeaveBalance ?? 0,
      sickLeaveBalance: summary?.sickLeaveBalance ?? 0,
      annualUsageYear: summary?.annualUsageYear ?? new Date().getFullYear(),
      specialPrivilegeLeaveUsed: summary?.specialPrivilegeLeaveUsed ?? 0,
      forcedLeaveUsed: summary?.forcedLeaveUsed ?? 0,
      lastAccrualMonth: summary?.lastAccrualMonth ?? "",
      lastTransactionAt: summary?.lastTransactionAt ?? null,
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    leaveCredits,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
}