import "@/models/LeaveCredit";

import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import {
  getAuditRequestMetadata,
  writeAuditLog,
} from "@/lib/audit/log";
import { postManualLeaveCreditAdjustment } from "@/lib/leave/leave-credit-service";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  const auth = await requireApiPermission(permissions.leaveManage);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);

  try {
    const body = await request.json();

    const employeeId = readString(body.employeeId);
    const vacationLeaveChange = readNumber(body.vacationLeaveChange);
    const sickLeaveChange = readNumber(body.sickLeaveChange);
    const remarks = readString(body.remarks);
    const source =
      readString(body.source) === "opening_balance"
        ? "opening_balance"
        : "manual_adjustment";

    if (!remarks) {
      throw new Error("Remarks are required for leave credit adjustment.");
    }

    const result = await postManualLeaveCreditAdjustment({
      employeeId,
      vacationLeaveChange,
      sickLeaveChange,
      remarks,
      source,
      actorUserId: auth.session.user.id,
    });

    await writeAuditLog({
      actor: auth.session.user.id,
      action:
        source === "opening_balance"
          ? "LEAVE_CREDIT_OPENING_BALANCE_POSTED"
          : "LEAVE_CREDIT_MANUAL_ADJUSTMENT_POSTED",
      resource: "leave_credit",
      resourceId: employeeId,
      metadata: {
        employeeId,
        vacationLeaveChange,
        sickLeaveChange,
        remarks,
        ledgerId: result.ledger._id.toString(),
      },
      ...requestMeta,
    });

    return NextResponse.json({
      message: "Leave credit adjustment posted successfully.",
      ledgerId: result.ledger._id.toString(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to post leave credit adjustment.";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "LEAVE_CREDIT_ADJUSTMENT_FAILED",
      resource: "leave_credit",
      metadata: {
        error: message,
      },
      success: false,
      ...requestMeta,
    });

    return NextResponse.json({ message }, { status: 400 });
  }
}