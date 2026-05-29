import "@/models/LeaveCredit";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongoose";
import { LeaveCreditLedgerModel } from "@/models/LeaveCredit";

type RouteParams = {
  params: Promise<{
    employeeId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.leaveRead);

  if (!auth.ok) {
    return auth.response;
  }

  const { employeeId } = await context.params;

  if (!Types.ObjectId.isValid(employeeId)) {
    return NextResponse.json(
      { message: "Invalid employee ID." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const ledger = await LeaveCreditLedgerModel.find({
    employee: employeeId,
  })
    .sort({
      transactionDate: -1,
      createdAt: -1,
    })
    .limit(100)
    .lean();

  return NextResponse.json({
    ledger: ledger.map((entry: any) => ({
      ...JSON.parse(JSON.stringify(entry)),
      id: entry._id.toString(),
      _id: entry._id.toString(),
      employee: entry.employee?.toString?.() ?? "",
      leaveApplication: entry.leaveApplication?.toString?.() ?? "",
    })),
  });
}