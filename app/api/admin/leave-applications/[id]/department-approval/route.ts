import "@/models/LeaveApplication";
import "@/models/User";

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
import { LeaveApplicationModel } from "@/models/LeaveApplication";
import { UserModel } from "@/models/User";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.leaveRecommend);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: "Invalid leave application ID." },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();

    const decision = readString(body.decision);
    const reason = readString(body.reason);

    if (!["recommended", "disapproved"].includes(decision)) {
      return NextResponse.json(
        { message: "Decision must be recommended or disapproved." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const leaveApplication =
      await LeaveApplicationModel.findById(id).lean();

    if (!leaveApplication) {
      return NextResponse.json(
        { message: "Leave application was not found." },
        { status: 404 },
      );
    }

    if (leaveApplication.status !== "submitted") {
      return NextResponse.json(
        {
          message:
            "Only submitted leave applications can be reviewed by Department Head.",
        },
        { status: 400 },
      );
    }

    const currentUser = await UserModel.findById(auth.session.user.id)
      .select("department name")
      .lean();

    const currentDepartment = currentUser?.department?.trim() ?? "";
    const leaveDepartment =
      leaveApplication.employeeSnapshot?.officeDepartment?.trim() ?? "";

    if (
      auth.session.user.role === "department-head" &&
      currentDepartment &&
      leaveDepartment &&
      currentDepartment !== leaveDepartment
    ) {
      return NextResponse.json(
        {
          message:
            "You can only review leave applications from your department.",
        },
        { status: 403 },
      );
    }

    const updatedLeave =
      await LeaveApplicationModel.findByIdAndUpdate(
        id,
        {
          $set: {
            status: decision,
            recommendation: {
              forApproval: decision === "recommended",
              forDisapproval: decision === "disapproved",
              disapprovalReason: reason,
              authorizedOfficerName:
                auth.session.user.name ?? "Department Head",
            },
          },
        },
        { new: true },
      ).lean();

    await writeAuditLog({
      actor: auth.session.user.id,
      action:
        decision === "recommended"
          ? "LEAVE_RECOMMENDED_BY_DEPARTMENT_HEAD"
          : "LEAVE_DISAPPROVED_BY_DEPARTMENT_HEAD",
      resource: "leave_application",
      resourceId: id,
      metadata: {
        decision,
        reason,
        previousStatus: leaveApplication.status,
        newStatus: decision,
      },
      ...requestMeta,
    });

    return NextResponse.json({
      message:
        decision === "recommended"
          ? "Leave application approved by Department Head and forwarded to HR."
          : "Leave application disapproved by Department Head.",
      leaveApplication: serializeLeaveApplication(updatedLeave),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to review leave application.";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "LEAVE_DEPARTMENT_REVIEW_FAILED",
      resource: "leave_application",
      resourceId: id,
      metadata: { error: message },
      success: false,
      ...requestMeta,
    });

    return NextResponse.json({ message }, { status: 400 });
  }
}