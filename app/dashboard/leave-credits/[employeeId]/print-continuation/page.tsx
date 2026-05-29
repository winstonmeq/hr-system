import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";

import "@/models/Employee";
import "@/models/LeaveCredit";

import { requirePermission } from "@/lib/auth/guards";
import { permissions } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongoose";
import { EmployeeModel } from "@/models/Employee";
import { LeaveCreditLedgerModel } from "@/models/LeaveCredit";

import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

type PrintContinuationPageProps = {
  params: Promise<{
    employeeId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const ROWS_PER_PAGE = 20;

function readSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function readInteger(value: string, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return parsed;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatDate(value: unknown) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatNumber(value: unknown) {
  const numberValue = Number(value ?? 0);

  if (!Number.isFinite(numberValue)) {
    return "0";
  }

  return numberValue.toFixed(3).replace(/\.?0+$/, "");
}

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

function formatSource(value: string) {
  const labels: Record<string, string> = {
    monthly_accrual: "Monthly Accrual",
    leave_application: "Leave Application",
    manual_adjustment: "Manual Adjustment",
    system_reversal: "System Reversal",
    opening_balance: "Opening Balance",
  };

  return labels[value] ?? value;
}

function formatTransactionType(value: string) {
  const labels: Record<string, string> = {
    credit: "Credit",
    debit: "Debit",
    adjustment: "Adjustment",
    reversal: "Reversal",
    info: "Info",
  };

  return labels[value] ?? value;
}

function formatLeaveType(value: string) {
  const labels: Record<string, string> = {
    vacation: "Vacation Leave",
    mandatoryForced: "Mandatory / Forced Leave",
    sick: "Sick Leave",
    specialPrivilege: "Special Privilege Leave",
    monthly_accrual: "Monthly Accrual",
    manual_adjustment: "Manual Adjustment",
  };

  return labels[value] ?? value;
}

function shortText(value: unknown, maxLength = 42) {
  const text = String(value ?? "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

export default async function PrintContinuationPage({
  params,
  searchParams,
}: PrintContinuationPageProps) {
  await requirePermission(
    permissions.leaveRead,
    "/dashboard/leave-credits",
  );

  const { employeeId } = await params;

  if (!Types.ObjectId.isValid(employeeId)) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const skip = Math.max(
    0,
    readInteger(readSearchValue(resolvedSearchParams, "skip"), 0),
  );

  const startRow = clamp(
    readInteger(
      readSearchValue(resolvedSearchParams, "startRow"),
      skip + 1,
    ),
    1,
    ROWS_PER_PAGE,
  );

  const remainingSlots = ROWS_PER_PAGE - startRow + 1;

  const limit = clamp(
    readInteger(
      readSearchValue(resolvedSearchParams, "limit"),
      remainingSlots,
    ),
    1,
    remainingSlots,
  );

  await connectToDatabase();

  const [employee, ledger] = await Promise.all([
    EmployeeModel.findById(employeeId).lean(),

    LeaveCreditLedgerModel.find({
      employee: employeeId,
    })
      .sort({
        transactionDate: 1,
        createdAt: 1,
      })
      .lean(),
  ]);

  if (!employee) {
    notFound();
  }

  const rowsToPrint = ledger.slice(skip, skip + limit);

  const slots = Array.from({ length: ROWS_PER_PAGE }, (_, index) => {
    const slotNumber = index + 1;
    const rowIndex = slotNumber - startRow;

    return rowIndex >= 0 && rowIndex < rowsToPrint.length
      ? rowsToPrint[rowIndex]
      : null;
  });

  const printableFrom = skip + 1;
  const printableTo = skip + rowsToPrint.length;

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-950 print:bg-white print:p-0">
      <style>
        {`
          @media print {
            @page {
              size: legal landscape;
              margin: 10mm;
            }

            .no-print {
              display: none !important;
            }

            body {
              background: white !important;
            }

            .print-sheet {
              box-shadow: none !important;
              border: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
            }

            .continuation-spacer {
              visibility: hidden !important;
            }

            .continuation-table th,
            .continuation-table td {
              border-color: transparent !important;
            }

            .continuation-table thead {
              visibility: hidden !important;
            }
          }

          .continuation-table {
            table-layout: fixed;
          }

          .continuation-table th,
          .continuation-table td {
            height: 24px;
            max-height: 24px;
            padding: 2px 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            vertical-align: middle;
          }
        `}
      </style>

      <div className="no-print mx-auto mb-4 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Continuation Print Preview
          </p>

          <p className="text-xs text-slate-500">
            Employee: {formatEmployeeName(employee)}
          </p>

          <p className="text-xs text-slate-500">
            Printing ledger rows {rowsToPrint.length > 0 ? printableFrom : 0}–
            {rowsToPrint.length > 0 ? printableTo : 0} starting at row slot{" "}
            {startRow}.
          </p>

          <p className="mt-1 text-xs font-semibold text-red-600">
            Printer settings: Legal, Landscape, Scale 100%, do not use Fit to
            Page.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/leave-credits"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back
          </Link>

          <PrintButton />
        </div>
      </div>

      {rowsToPrint.length === 0 ? (
        <div className="no-print mx-auto mb-4 max-w-7xl rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          No new ledger rows found using skip={skip}. Go back and enter a lower
          already-printed row count.
        </div>
      ) : null}

      <main className="print-sheet mx-auto max-w-7xl bg-white p-8 shadow-sm ring-1 ring-slate-200 print:max-w-none">
        <header className="continuation-spacer text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em]">
            Republic of the Philippines
          </p>
          <h1 className="mt-2 text-xl font-bold uppercase">
            Employee Leave Credit Ledger
          </h1>
          <p className="mt-1 text-sm">
            Vacation Leave and Sick Leave Credit Record
          </p>
        </header>

        <section className="continuation-spacer mt-8 grid gap-4 border-y border-slate-300 py-4 text-sm md:grid-cols-4 print:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Employee Name
            </p>
            <p className="font-semibold">{formatEmployeeName(employee)}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Employee Number
            </p>
            <p className="font-semibold">
              {(employee as any).employeeNumber || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Office / Department
            </p>
            <p className="font-semibold">Department</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Position
            </p>
            <p className="font-semibold">Position</p>
          </div>
        </section>

        <section className="continuation-spacer mt-5 grid gap-4 text-sm md:grid-cols-6 print:grid-cols-6">
          <div className="rounded-lg border border-slate-300 p-3">VL</div>
          <div className="rounded-lg border border-slate-300 p-3">SL</div>
          <div className="rounded-lg border border-slate-300 p-3">SPL</div>
          <div className="rounded-lg border border-slate-300 p-3">Forced</div>
          <div className="rounded-lg border border-slate-300 p-3">Accrual</div>
          <div className="rounded-lg border border-slate-300 p-3">Printed</div>
        </section>

        <section className="mt-8">
          <table className="continuation-table w-full border-collapse text-xs">
            <colgroup>
              <col style={{ width: "8%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "11%" }} />
            </colgroup>

            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 text-left">Date</th>
                <th className="border border-slate-400 text-left">Source</th>
                <th className="border border-slate-400 text-left">Type</th>
                <th className="border border-slate-400 text-left">
                  Leave Type
                </th>
                <th className="border border-slate-400 text-right">
                  VL Change
                </th>
                <th className="border border-slate-400 text-right">
                  VL Balance
                </th>
                <th className="border border-slate-400 text-right">
                  SL Change
                </th>
                <th className="border border-slate-400 text-right">
                  SL Balance
                </th>
                <th className="border border-slate-400 text-right">
                  SPL Used
                </th>
                <th className="border border-slate-400 text-right">
                  Forced
                </th>
                <th className="border border-slate-400 text-left">Remarks</th>
              </tr>
            </thead>

            <tbody>
              {slots.map((entry: any, index) => (
                <tr key={index}>
                  <td className="border border-slate-300">
                    {entry ? formatDate(entry.transactionDate) : ""}
                  </td>

                  <td className="border border-slate-300">
                    {entry ? formatSource(entry.source) : ""}
                  </td>

                  <td className="border border-slate-300">
                    {entry ? formatTransactionType(entry.transactionType) : ""}
                  </td>

                  <td className="border border-slate-300">
                    {entry ? formatLeaveType(entry.leaveType) : ""}
                  </td>

                  <td className="border border-slate-300 text-right">
                    {entry ? formatNumber(entry.vacationLeaveChange) : ""}
                  </td>

                  <td className="border border-slate-300 text-right">
                    {entry
                      ? `${formatNumber(
                          entry.previousVacationLeaveBalance,
                        )} → ${formatNumber(entry.newVacationLeaveBalance)}`
                      : ""}
                  </td>

                  <td className="border border-slate-300 text-right">
                    {entry ? formatNumber(entry.sickLeaveChange) : ""}
                  </td>

                  <td className="border border-slate-300 text-right">
                    {entry
                      ? `${formatNumber(
                          entry.previousSickLeaveBalance,
                        )} → ${formatNumber(entry.newSickLeaveBalance)}`
                      : ""}
                  </td>

                  <td className="border border-slate-300 text-right">
                    {entry
                      ? formatNumber(entry.newSpecialPrivilegeLeaveUsed)
                      : ""}
                  </td>

                  <td className="border border-slate-300 text-right">
                    {entry ? formatNumber(entry.newForcedLeaveUsed) : ""}
                  </td>

                  <td className="border border-slate-300">
                    {entry ? shortText(entry.remarks) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}