import "@/models/Employee";
import "@/models/LeaveApplication";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import {
  getAuditRequestMetadata,
  writeAuditLog,
} from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import { serializeLeaveApplication } from "@/lib/leave/serialize-leave-application";
import { parseLeaveApplicationInput } from "@/lib/validators/leave-application";
import { EmployeeModel } from "@/models/Employee";
import {
  LeaveApplicationModel,
  leaveApplicationStatuses,
} from "@/models/LeaveApplication";
import { UserModel } from "@/models/User";

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

function isValidStatus(status: string) {
  return leaveApplicationStatuses.includes(
    status as (typeof leaveApplicationStatuses)[number],
  );
}

function buildEmployeeSnapshot(employee: any, inputSnapshot?: any) {
  const name = employee.personalInfo?.name ?? {};
  const currentWork = Array.isArray(employee.workExperience)
    ? employee.workExperience[0]
    : null;

  return {
    employeeNumber:
      inputSnapshot?.employeeNumber || employee.employeeNumber || "",
    lastName: inputSnapshot?.lastName || name.surname || "",
    firstName: inputSnapshot?.firstName || name.firstName || "",
    middleName: inputSnapshot?.middleName || name.middleName || "",
    officeDepartment:
      inputSnapshot?.officeDepartment ||
      currentWork?.departmentAgencyOfficeCompany ||
      "",
    position: inputSnapshot?.position || currentWork?.positionTitle || "",
    salary: inputSnapshot?.salary || currentWork?.monthlySalary || "",
  };
}

async function getCurrentUserDepartment(userId: string) {
  const user = await UserModel.findById(userId)
    .select("department")
    .lean();

  return user?.department?.trim() ?? "";
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
  const status = searchParams.get("status")?.trim() ?? "";
  const role = auth.session.user.role;

  await connectToDatabase();

  const filter: Record<string, unknown> = {};

  if (role === "department-head") {
    const department = await getCurrentUserDepartment(auth.session.user.id);

    if (!department) {
      return NextResponse.json({
        leaveApplications: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    filter["employeeSnapshot.officeDepartment"] = department;

    if (status && status !== "all" && isValidStatus(status)) {
      filter.status = status;
    } else {
      filter.status = "submitted";
    }
  } else if (role === "hr-admin") {
    if (status && status !== "all" && isValidStatus(status)) {
      filter.status = status;
    } else {
      filter.status = {
        $in: ["recommended", "approved", "disapproved", "cancelled"],
      };
    }
  } else {
    if (status && status !== "all" && isValidStatus(status)) {
      filter.status = status;
    }
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");

    filter.$or = [
      { "employeeSnapshot.employeeNumber": regex },
      { "employeeSnapshot.lastName": regex },
      { "employeeSnapshot.firstName": regex },
      { "employeeSnapshot.officeDepartment": regex },
      { "employeeSnapshot.position": regex },
      { leaveType: regex },
      { inclusiveDates: regex },
    ];
  }

  const skip = (page - 1) * limit;

  const [leaveApplicationsFromDb, total] = await Promise.all([
    LeaveApplicationModel.find(filter)
      .sort({ dateOfFiling: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    LeaveApplicationModel.countDocuments(filter),
  ]);

  const leaveApplications =
    leaveApplicationsFromDb.map(serializeLeaveApplication);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    leaveApplications,
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

export async function POST(request: NextRequest) {
  const auth = await requireApiPermission(permissions.leaveManage);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);

  try {
    const input = parseLeaveApplicationInput(await request.json());

    if (!Types.ObjectId.isValid(input.employeeId)) {
      return NextResponse.json(
        { message: "Invalid employee ID." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const employee = await EmployeeModel.findById(input.employeeId).lean();

    if (!employee) {
      return NextResponse.json(
        { message: "Employee was not found." },
        { status: 404 },
      );
    }

    const leaveApplication = await LeaveApplicationModel.create({
      employee: employee._id,
      employeeSnapshot: buildEmployeeSnapshot(
        employee,
        input.employeeSnapshot,
      ),
      dateOfFiling: input.dateOfFiling,
      leaveType: input.leaveType,
      otherLeaveType: input.otherLeaveType,
      leaveDetails: input.leaveDetails,
      numberOfWorkingDays: input.numberOfWorkingDays,
      inclusiveDates: input.inclusiveDates,
      commutation: input.commutation,

      // Important:
      // New leave applications always go to Department Head first.
      status: "submitted",

      remarks: input.remarks,
    });

    const leaveObject = leaveApplication.toObject() as any;

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "LEAVE_APPLICATION_CREATED",
      resource: "leave_application",
      resourceId: leaveObject._id?.toString?.() ?? "",
      metadata: {
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        status: "submitted",
      },
      ...requestMeta,
    });

    return NextResponse.json(
      {
        message:
          "Leave application created successfully and sent to Department Head.",
        leaveApplication: serializeLeaveApplication(leaveObject),
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create leave application.";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "LEAVE_APPLICATION_CREATE_FAILED",
      resource: "leave_application",
      metadata: { error: message },
      success: false,
      ...requestMeta,
    });

    return NextResponse.json({ message }, { status: 400 });
  }
}