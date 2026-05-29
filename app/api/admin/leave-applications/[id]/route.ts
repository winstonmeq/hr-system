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
import { LeaveApplicationModel } from "@/models/LeaveApplication";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

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

function invalidLeaveIdResponse() {
  return NextResponse.json(
    { message: "Invalid leave application ID." },
    { status: 400 },
  );
}

export async function GET(_request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.leaveRead);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return invalidLeaveIdResponse();
  }

  await connectToDatabase();

  const leaveApplication = await LeaveApplicationModel.findById(id).lean();

  if (!leaveApplication) {
    return NextResponse.json(
      { message: "Leave application was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    leaveApplication: serializeLeaveApplication(leaveApplication),
  });
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.leaveManage);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return invalidLeaveIdResponse();
  }

  try {
    const input = parseLeaveApplicationInput(await request.json());

    if (!Types.ObjectId.isValid(input.employeeId)) {
      return NextResponse.json(
        { message: "Invalid employee ID." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existingLeave = await LeaveApplicationModel.findById(id).lean();

    if (!existingLeave) {
      return NextResponse.json(
        { message: "Leave application was not found." },
        { status: 404 },
      );
    }

    const employee = await EmployeeModel.findById(input.employeeId).lean();

    if (!employee) {
      return NextResponse.json(
        { message: "Employee was not found." },
        { status: 404 },
      );
    }

    const leaveApplication =
      await LeaveApplicationModel.findByIdAndUpdate(
        id,
        {
          $set: {
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
            status: input.status,
            remarks: input.remarks,
          },
        },
        { new: true },
      ).lean();

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "LEAVE_APPLICATION_UPDATED",
      resource: "leave_application",
      resourceId: id,
      metadata: {
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        status: input.status,
      },
      ...requestMeta,
    });

    return NextResponse.json({
      message: "Leave application updated successfully.",
      leaveApplication: serializeLeaveApplication(leaveApplication),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update leave application.";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "LEAVE_APPLICATION_UPDATE_FAILED",
      resource: "leave_application",
      resourceId: id,
      metadata: { error: message },
      success: false,
      ...requestMeta,
    });

    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.leaveManage);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return invalidLeaveIdResponse();
  }

  await connectToDatabase();

  const existingLeave = await LeaveApplicationModel.findById(id).lean();

  if (!existingLeave) {
    return NextResponse.json(
      { message: "Leave application was not found." },
      { status: 404 },
    );
  }

  const leaveApplication =
    await LeaveApplicationModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "cancelled",
        },
      },
      { new: true },
    ).lean();

  await writeAuditLog({
    actor: auth.session.user.id,
    action: "LEAVE_APPLICATION_CANCELLED",
    resource: "leave_application",
    resourceId: id,
    metadata: {
      previousStatus: existingLeave.status,
      newStatus: "cancelled",
    },
    ...requestMeta,
  });

  return NextResponse.json({
    message: "Leave application cancelled successfully.",
    leaveApplication: serializeLeaveApplication(leaveApplication),
  });
}