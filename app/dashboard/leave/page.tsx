import "@/models/Employee";
import "@/models/LeaveApplication";

import { requirePermission } from "@/lib/auth/guards";
import { permissions } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongoose";
import { serializeLeaveApplication } from "@/lib/leave/serialize-leave-application";
import { EmployeeModel } from "@/models/Employee";
import { LeaveApplicationModel } from "@/models/LeaveApplication";

import {
  LeavePageClient,
  type EmployeeOption,
  type LeaveApplicationRow,
} from "./leave-page-client";

export const dynamic = "force-dynamic";

function formatEmployeeName(employee: any) {
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

export default async function LeavePage() {

const session = await requirePermission(permissions.leaveRead, "/dashboard/leave",);

  await connectToDatabase();

  const limit = 20;

  const [leaveApplicationsFromDb, totalLeaveApplications, employeesFromDb] =
    await Promise.all([
      LeaveApplicationModel.find({})
        .sort({ dateOfFiling: -1, createdAt: -1 })
        .limit(limit)
        .lean(),

      LeaveApplicationModel.countDocuments({}),

      EmployeeModel.find({ status: "active" })
        .select(
          "employeeNumber personalInfo.name workExperience personalInfo.contact status",
        )
        .sort({
          "personalInfo.name.surname": 1,
          "personalInfo.name.firstName": 1,
        })
        .lean(),
    ]);

  const leaveApplications: LeaveApplicationRow[] =
    leaveApplicationsFromDb.map(serializeLeaveApplication);

  const employees: EmployeeOption[] = employeesFromDb.map((employee: any) => {
    const currentWork = Array.isArray(employee.workExperience)
      ? employee.workExperience[0]
      : null;

    return {
      id: employee._id.toString(),
      employeeNumber: employee.employeeNumber,
      fullName: formatEmployeeName(employee),
      lastName: employee.personalInfo?.name?.surname ?? "",
      firstName: employee.personalInfo?.name?.firstName ?? "",
      middleName: employee.personalInfo?.name?.middleName ?? "",
      officeDepartment: currentWork?.departmentAgencyOfficeCompany ?? "",
      position: currentWork?.positionTitle ?? "",
      salary: currentWork?.monthlySalary ?? "",
    };
  });

  return (
   <LeavePageClient
  initialLeaveApplications={leaveApplications}
  employees={employees}
  currentUserRole={session.user.role}
  initialPagination={{
    page: 1,
    limit,
    total: totalLeaveApplications,
    totalPages: Math.max(1, Math.ceil(totalLeaveApplications / limit)),
    hasNextPage: totalLeaveApplications > limit,
    hasPreviousPage: false,
  }}
/>
  );
}