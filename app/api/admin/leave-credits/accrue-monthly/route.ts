import "@/models/LeaveCredit";

import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import {
  getAuditRequestMetadata,
  writeAuditLog,
} from "@/lib/audit/log";
import { postMonthlyAccrualForAllActiveEmployees } from "@/lib/leave/leave-credit-service";

export async function POST(request: NextRequest) {
  const auth = await requireApiPermission(permissions.leaveManage);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);

  try {
    const results = await postMonthlyAccrualForAllActiveEmployees({
      actorUserId: auth.session.user.id,
      date: new Date(),
    });

    const postedCount = results.filter((item) => item.posted).length;

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "MONTHLY_LEAVE_CREDITS_POSTED",
      resource: "leave_credit",
      metadata: {
        postedCount,
        totalEmployees: results.length,
      },
      ...requestMeta,
    });

    return NextResponse.json({
      message: `Monthly leave credits posted. Posted: ${postedCount}. Skipped: ${
        results.length - postedCount
      }.`,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to post monthly leave credits.";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "MONTHLY_LEAVE_CREDITS_FAILED",
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