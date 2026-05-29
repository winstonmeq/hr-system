import "@/models/LeaveApplication";
import "@/models/LeaveCredit";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import {
  getAuditRequestMetadata,
  writeAuditLog,
} from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import { applyApprovedLeaveCredits } from "@/lib/leave/leave-credit-service";
import { serializeLeaveApplication } from "@/lib/leave/serialize-leave-application";
import { LeaveApplicationModel } from "@/models/LeaveApplication";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.leaveManage);

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

    if (!["approved", "disapproved"].includes(decision)) {
      return NextResponse.json(
        { message: "Decision must be approved or disapproved." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const leaveApplication = await LeaveApplicationModel.findById(id).lean();

    if (!leaveApplication) {
      return NextResponse.json(
        { message: "Leave application was not found." },
        { status: 404 },
      );
    }

    if (leaveApplication.status !== "recommended") {
      return NextResponse.json(
        {
          message:
            "Only leave applications recommended by Department Head can be finalized by HR.",
        },
        { status: 400 },
      );
    }

    let ledgerIds: string[] = [];

    if (decision === "approved") {
      const creditPostingResult = await applyApprovedLeaveCredits({
        leaveApplication,
        actorUserId: auth.session.user.id,
      });

      ledgerIds = creditPostingResult.ledgerIds.map((ledgerId: unknown) =>
        ledgerId?.toString?.() ?? String(ledgerId),
      );
    }

    const updatedLeave = await LeaveApplicationModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: decision,
          action: {
            ...((leaveApplication as any).action ?? {}),
            disapprovedDueTo: decision === "disapproved" ? reason : "",
            finalApproverName: auth.session.user.name ?? "HR Admin",
          },
          creditPosting:
            decision === "approved"
              ? {
                  posted: true,
                  postedAt: new Date(),
                  ledgerIds,
                  error: "",
                }
              : {
                  ...((leaveApplication as any).creditPosting ?? {}),
                  error: reason,
                },
        },
      },
      { new: true },
    ).lean();

    await writeAuditLog({
      actor: auth.session.user.id,
      action:
        decision === "approved"
          ? "LEAVE_APPROVED_BY_HR_AND_CREDITS_POSTED"
          : "LEAVE_DISAPPROVED_BY_HR",
      resource: "leave_application",
      resourceId: id,
      metadata: {
        decision,
        reason,
        previousStatus: leaveApplication.status,
        newStatus: decision,
        ledgerIds,
      },
      ...requestMeta,
    });

    return NextResponse.json({
      message:
        decision === "approved"
          ? "Leave application approved and leave credits posted successfully."
          : "Leave application disapproved successfully.",
      leaveApplication: serializeLeaveApplication(updatedLeave),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to finalize leave application.";

    await LeaveApplicationModel.findByIdAndUpdate(id, {
      $set: {
        "creditPosting.error": message,
      },
    });

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "LEAVE_HR_ACTION_FAILED",
      resource: "leave_application",
      resourceId: id,
      metadata: {
        error: message,
      },
      success: false,
      ...requestMeta,
    });

    return NextResponse.json({ message }, { status: 400 });
  }
}