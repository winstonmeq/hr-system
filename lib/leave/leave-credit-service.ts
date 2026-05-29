import { Types } from "mongoose";

import "@/models/LeaveCredit";

import { connectToDatabase } from "@/lib/db/mongoose";
import { EmployeeModel } from "@/models/Employee";
import {
  LeaveCreditLedgerModel,
  LeaveCreditSummaryModel,
} from "@/models/LeaveCredit";

const MONTHLY_VL_CREDIT = 1.25;
const MONTHLY_SL_CREDIT = 1.25;
const SPECIAL_PRIVILEGE_LIMIT = 3;

function roundDays(value: number) {
  return Math.round(value * 1000) / 1000;
}

function readNumber(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return roundDays(parsed);
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getAccrualMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

async function getOrCreateSummary(employeeId: string) {
  let summary = await LeaveCreditSummaryModel.findOne({
    employee: employeeId,
  });

  if (!summary) {
    summary = await LeaveCreditSummaryModel.create({
      employee: employeeId,
      vacationLeaveBalance: 0,
      sickLeaveBalance: 0,
      annualUsageYear: getCurrentYear(),
      specialPrivilegeLeaveUsed: 0,
      forcedLeaveUsed: 0,
    });
  }

  const currentYear = getCurrentYear();

  if (summary.annualUsageYear !== currentYear) {
    summary.annualUsageYear = currentYear;
    summary.specialPrivilegeLeaveUsed = 0;
    summary.forcedLeaveUsed = 0;
    await summary.save();
  }

  return summary;
}

async function createLedgerEntry(input: {
  employeeId: string;
  leaveApplicationId?: string;
  source:
    | "monthly_accrual"
    | "leave_application"
    | "manual_adjustment"
    | "system_reversal"
    | "opening_balance";
  transactionType: "credit" | "debit" | "adjustment" | "reversal" | "info";
  leaveType: string;
  accrualMonth?: string;
  vacationLeaveChange?: number;
  sickLeaveChange?: number;
  specialPrivilegeLeaveChange?: number;
  forcedLeaveChange?: number;
  previousVacationLeaveBalance: number;
  newVacationLeaveBalance: number;
  previousSickLeaveBalance: number;
  newSickLeaveBalance: number;
  previousSpecialPrivilegeLeaveUsed: number;
  newSpecialPrivilegeLeaveUsed: number;
  previousForcedLeaveUsed: number;
  newForcedLeaveUsed: number;
  remarks?: string;
  createdBy?: string;
}) {
  const ledger = await LeaveCreditLedgerModel.create({
    employee: input.employeeId,
    leaveApplication: input.leaveApplicationId,
    source: input.source,
    transactionType: input.transactionType,
    leaveType: input.leaveType,
    accrualMonth: input.accrualMonth,
    vacationLeaveChange: roundDays(input.vacationLeaveChange ?? 0),
    sickLeaveChange: roundDays(input.sickLeaveChange ?? 0),
    specialPrivilegeLeaveChange: roundDays(
      input.specialPrivilegeLeaveChange ?? 0,
    ),
    forcedLeaveChange: roundDays(input.forcedLeaveChange ?? 0),
    previousVacationLeaveBalance: roundDays(
      input.previousVacationLeaveBalance,
    ),
    newVacationLeaveBalance: roundDays(input.newVacationLeaveBalance),
    previousSickLeaveBalance: roundDays(input.previousSickLeaveBalance),
    newSickLeaveBalance: roundDays(input.newSickLeaveBalance),
    previousSpecialPrivilegeLeaveUsed: roundDays(
      input.previousSpecialPrivilegeLeaveUsed,
    ),
    newSpecialPrivilegeLeaveUsed: roundDays(
      input.newSpecialPrivilegeLeaveUsed,
    ),
    previousForcedLeaveUsed: roundDays(input.previousForcedLeaveUsed),
    newForcedLeaveUsed: roundDays(input.newForcedLeaveUsed),
    remarks: input.remarks,
    createdBy: input.createdBy,
  });

  return ledger;
}

export async function postMonthlyAccrualForEmployee(input: {
  employeeId: string;
  actorUserId?: string;
  date?: Date;
}) {
  await connectToDatabase();

  const accrualMonth = getAccrualMonth(input.date ?? new Date());

  const existing = await LeaveCreditLedgerModel.exists({
    employee: input.employeeId,
    source: "monthly_accrual",
    accrualMonth,
  });

  if (existing) {
    return {
      posted: false,
      message: `Monthly accrual for ${accrualMonth} already posted.`,
    };
  }

  const summary = await getOrCreateSummary(input.employeeId);

  const previousVacation = readNumber(summary.vacationLeaveBalance);
  const previousSick = readNumber(summary.sickLeaveBalance);

  const newVacation = roundDays(previousVacation + MONTHLY_VL_CREDIT);
  const newSick = roundDays(previousSick + MONTHLY_SL_CREDIT);

  summary.vacationLeaveBalance = newVacation;
  summary.sickLeaveBalance = newSick;
  summary.lastAccrualMonth = accrualMonth;
  summary.lastTransactionAt = new Date();

  await summary.save();

  const ledger = await createLedgerEntry({
    employeeId: input.employeeId,
    source: "monthly_accrual",
    transactionType: "credit",
    leaveType: "monthly_accrual",
    accrualMonth,
    vacationLeaveChange: MONTHLY_VL_CREDIT,
    sickLeaveChange: MONTHLY_SL_CREDIT,
    previousVacationLeaveBalance: previousVacation,
    newVacationLeaveBalance: newVacation,
    previousSickLeaveBalance: previousSick,
    newSickLeaveBalance: newSick,
    previousSpecialPrivilegeLeaveUsed: readNumber(
      summary.specialPrivilegeLeaveUsed,
    ),
    newSpecialPrivilegeLeaveUsed: readNumber(
      summary.specialPrivilegeLeaveUsed,
    ),
    previousForcedLeaveUsed: readNumber(summary.forcedLeaveUsed),
    newForcedLeaveUsed: readNumber(summary.forcedLeaveUsed),
    remarks: `Monthly accrual for ${accrualMonth}`,
    createdBy: input.actorUserId,
  });

  return {
    posted: true,
    ledgerId: ledger._id.toString(),
    message: `Monthly accrual for ${accrualMonth} posted.`,
  };
}

export async function postMonthlyAccrualForAllActiveEmployees(input: {
  actorUserId?: string;
  date?: Date;
}) {
  await connectToDatabase();

  const employees = await EmployeeModel.find({ status: "active" })
    .select("_id")
    .lean();

  const results = [];

  for (const employee of employees) {
    const employeeId = employee._id.toString();

    const result = await postMonthlyAccrualForEmployee({
      employeeId,
      actorUserId: input.actorUserId,
      date: input.date,
    });

    results.push({
      employeeId,
      ...result,
    });
  }

  return results;
}

export async function postManualLeaveCreditAdjustment(input: {
  employeeId: string;
  vacationLeaveChange: number;
  sickLeaveChange: number;
  remarks: string;
  actorUserId?: string;
  source?: "manual_adjustment" | "opening_balance";
}) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(input.employeeId)) {
    throw new Error("Invalid employee ID.");
  }

  const employee = await EmployeeModel.findById(input.employeeId).lean();

  if (!employee) {
    throw new Error("Employee was not found.");
  }

  const summary = await getOrCreateSummary(input.employeeId);

  const previousVacation = readNumber(summary.vacationLeaveBalance);
  const previousSick = readNumber(summary.sickLeaveBalance);

  const vacationChange = readNumber(input.vacationLeaveChange);
  const sickChange = readNumber(input.sickLeaveChange);

  const newVacation = roundDays(previousVacation + vacationChange);
  const newSick = roundDays(previousSick + sickChange);

  if (newVacation < 0) {
    throw new Error("Vacation leave balance cannot become negative.");
  }

  if (newSick < 0) {
    throw new Error("Sick leave balance cannot become negative.");
  }

  summary.vacationLeaveBalance = newVacation;
  summary.sickLeaveBalance = newSick;
  summary.lastTransactionAt = new Date();

  await summary.save();

  const ledger = await createLedgerEntry({
    employeeId: input.employeeId,
    source: input.source ?? "manual_adjustment",
    transactionType: "adjustment",
    leaveType: "manual_adjustment",
    vacationLeaveChange: vacationChange,
    sickLeaveChange: sickChange,
    previousVacationLeaveBalance: previousVacation,
    newVacationLeaveBalance: newVacation,
    previousSickLeaveBalance: previousSick,
    newSickLeaveBalance: newSick,
    previousSpecialPrivilegeLeaveUsed: readNumber(
      summary.specialPrivilegeLeaveUsed,
    ),
    newSpecialPrivilegeLeaveUsed: readNumber(
      summary.specialPrivilegeLeaveUsed,
    ),
    previousForcedLeaveUsed: readNumber(summary.forcedLeaveUsed),
    newForcedLeaveUsed: readNumber(summary.forcedLeaveUsed),
    remarks: input.remarks,
    createdBy: input.actorUserId,
  });

  return {
    summary,
    ledger,
  };
}

function getLeaveApplicationDays(leaveApplication: any) {
  const days = readNumber(leaveApplication.numberOfWorkingDays);

  if (days <= 0) {
    throw new Error("Number of working days must be greater than zero.");
  }

  return days;
}

export async function applyApprovedLeaveCredits(input: {
  leaveApplication: any;
  actorUserId?: string;
}) {
  await connectToDatabase();

  const leaveApplication = input.leaveApplication;

  if (!leaveApplication?._id) {
    throw new Error("Invalid leave application.");
  }

  if (leaveApplication.creditPosting?.posted) {
    return {
      alreadyPosted: true,
      ledgerIds: leaveApplication.creditPosting.ledgerIds ?? [],
    };
  }

  const employeeId =
    leaveApplication.employee?._id?.toString?.() ??
    leaveApplication.employee?.toString?.();

  if (!employeeId || !Types.ObjectId.isValid(employeeId)) {
    throw new Error("Invalid employee ID in leave application.");
  }

  const leaveType = leaveApplication.leaveType;
  const days = getLeaveApplicationDays(leaveApplication);
  const summary = await getOrCreateSummary(employeeId);

  const previousVacation = readNumber(summary.vacationLeaveBalance);
  const previousSick = readNumber(summary.sickLeaveBalance);
  const previousSpl = readNumber(summary.specialPrivilegeLeaveUsed);
  const previousForced = readNumber(summary.forcedLeaveUsed);

  let vacationChange = 0;
  let sickChange = 0;
  let splChange = 0;
  let forcedChange = 0;
  let transactionType: "debit" | "info" = "debit";
  let remarks = `Deducted from approved ${leaveType} leave application.`;

  if (leaveType === "vacation") {
    if (previousVacation < days) {
      throw new Error(
        `Insufficient vacation leave credits. Available: ${previousVacation}, requested: ${days}.`,
      );
    }

    vacationChange = -days;
  } else if (leaveType === "mandatoryForced") {
    if (previousVacation < days) {
      throw new Error(
        `Insufficient vacation leave credits for forced leave. Available: ${previousVacation}, requested: ${days}.`,
      );
    }

    vacationChange = -days;
    forcedChange = days;
  } else if (leaveType === "sick") {
    const totalAvailable = roundDays(previousSick + previousVacation);

    if (totalAvailable < days) {
      throw new Error(
        `Insufficient sick/vacation leave credits. Available SL: ${previousSick}, VL: ${previousVacation}, requested: ${days}.`,
      );
    }

    const sickToUse = Math.min(previousSick, days);
    const vacationToUse = roundDays(days - sickToUse);

    sickChange = -sickToUse;
    vacationChange = -vacationToUse;

    if (vacationToUse > 0) {
      remarks =
        `Deducted ${sickToUse} from SL and ${vacationToUse} from VL because SL was insufficient.`;
    }
  } else if (leaveType === "specialPrivilege") {
    if (previousSpl + days > SPECIAL_PRIVILEGE_LIMIT) {
      throw new Error(
        `Special Privilege Leave limit exceeded. Used: ${previousSpl}, requested: ${days}, annual limit: ${SPECIAL_PRIVILEGE_LIMIT}.`,
      );
    }

    splChange = days;
    remarks = "Recorded Special Privilege Leave usage.";
  } else {
    transactionType = "info";
    remarks =
      "No VL/SL deduction was posted for this leave type. Usage was recorded for audit.";
  }

  const newVacation = roundDays(previousVacation + vacationChange);
  const newSick = roundDays(previousSick + sickChange);
  const newSpl = roundDays(previousSpl + splChange);
  const newForced = roundDays(previousForced + forcedChange);

  summary.vacationLeaveBalance = newVacation;
  summary.sickLeaveBalance = newSick;
  summary.specialPrivilegeLeaveUsed = newSpl;
  summary.forcedLeaveUsed = newForced;
  summary.lastTransactionAt = new Date();

  await summary.save();

  const ledger = await createLedgerEntry({
    employeeId,
    leaveApplicationId: leaveApplication._id.toString(),
    source: "leave_application",
    transactionType,
    leaveType,
    vacationLeaveChange: vacationChange,
    sickLeaveChange: sickChange,
    specialPrivilegeLeaveChange: splChange,
    forcedLeaveChange: forcedChange,
    previousVacationLeaveBalance: previousVacation,
    newVacationLeaveBalance: newVacation,
    previousSickLeaveBalance: previousSick,
    newSickLeaveBalance: newSick,
    previousSpecialPrivilegeLeaveUsed: previousSpl,
    newSpecialPrivilegeLeaveUsed: newSpl,
    previousForcedLeaveUsed: previousForced,
    newForcedLeaveUsed: newForced,
    remarks,
    createdBy: input.actorUserId,
  });

  return {
    alreadyPosted: false,
    ledgerIds: [ledger._id.toString()],
    summary,
  };
}