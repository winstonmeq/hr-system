"use client";

import { useCallback, useEffect, useState } from "react";

type LeaveCreditRow = {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  officeDepartment: string;
  position: string;
  vacationLeaveBalance: number;
  sickLeaveBalance: number;
  annualUsageYear: number;
  specialPrivilegeLeaveUsed: number;
  forcedLeaveUsed: number;
  lastAccrualMonth: string;
  lastTransactionAt: string | null;
};

type LedgerRow = {
  id: string;
  source: string;
  transactionType: string;
  leaveType: string;
  transactionDate: string;
  accrualMonth?: string;
  vacationLeaveChange: number;
  sickLeaveChange: number;
  specialPrivilegeLeaveChange: number;
  forcedLeaveChange: number;
  previousVacationLeaveBalance: number;
  newVacationLeaveBalance: number;
  previousSickLeaveBalance: number;
  newSickLeaveBalance: number;
  remarks?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function formatNumber(value: number) {
  return Number(value || 0).toFixed(3).replace(/\.?0+$/, "");
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString();
}

export function LeaveCreditsPageClient() {
  const [rows, setRows] = useState<LeaveCreditRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [selectedEmployee, setSelectedEmployee] =
    useState<LeaveCreditRow | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  const [adjustmentEmployee, setAdjustmentEmployee] =
    useState<LeaveCreditRow | null>(null);
  const [vacationLeaveChange, setVacationLeaveChange] = useState("");
  const [sickLeaveChange, setSickLeaveChange] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const currentPage = pagination.page;

  const loadLeaveCredits = useCallback(
    async (page = 1) => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pagination.limit),
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }

        const response = await fetch(
          `/api/admin/leave-credits?${params.toString()}`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Failed to load leave credits.");
        }

        setRows(data.leaveCredits);
        setPagination(data.pagination);
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Failed to load leave credits.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, search],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLeaveCredits(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [loadLeaveCredits]);

  function openAdjustment(row: LeaveCreditRow) {
    setAdjustmentEmployee(row);
    setVacationLeaveChange("");
    setSickLeaveChange("");
    setRemarks("");
  }

  function closeAdjustment() {
    setAdjustmentEmployee(null);
    setVacationLeaveChange("");
    setSickLeaveChange("");
    setRemarks("");
  }

  async function postAdjustment(source: "manual_adjustment" | "opening_balance") {
    if (!adjustmentEmployee) return;

    setIsPosting(true);

    try {
      const response = await fetch("/api/admin/leave-credits/adjustment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: adjustmentEmployee.employeeId,
          vacationLeaveChange: Number(vacationLeaveChange || 0),
          sickLeaveChange: Number(sickLeaveChange || 0),
          remarks,
          source,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to post adjustment.");
      }

      closeAdjustment();
      await loadLeaveCredits(currentPage);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to post adjustment.",
      );
    } finally {
      setIsPosting(false);
    }
  }

  async function postMonthlyAccrual() {
    const confirmed = window.confirm(
      "Post monthly +1.25 VL and +1.25 SL to all active employees? This can only be posted once per employee per month.",
    );

    if (!confirmed) return;

    setIsPosting(true);

    try {
      const response = await fetch("/api/admin/leave-credits/accrue-monthly", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to post monthly accrual.");
      }

      alert(data.message);
      await loadLeaveCredits(currentPage);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to post monthly accrual.",
      );
    } finally {
      setIsPosting(false);
    }
  }



function openContinuationPrint(row: LeaveCreditRow) {
  const alreadyPrintedRaw = window.prompt(
    "How many ledger rows are already printed on the paper?",
    "10",
  );

  if (alreadyPrintedRaw === null) return;

  const alreadyPrinted = Number(alreadyPrintedRaw);

  if (!Number.isInteger(alreadyPrinted) || alreadyPrinted < 0) {
    alert("Already printed rows must be a valid whole number.");
    return;
  }

  const startRowRaw = window.prompt(
    "What row number on the paper should the new entries start?",
    String(alreadyPrinted + 1),
  );

  if (startRowRaw === null) return;

  const startRow = Number(startRowRaw);

  if (!Number.isInteger(startRow) || startRow < 1) {
    alert("Start row must be a valid whole number.");
    return;
  }

  const limitRaw = window.prompt(
    "How many new rows do you want to print?",
    "3",
  );

  if (limitRaw === null) return;

  const limit = Number(limitRaw);

  if (!Number.isInteger(limit) || limit < 1) {
    alert("Rows to print must be a valid whole number.");
    return;
  }

  const params = new URLSearchParams({
    skip: String(alreadyPrinted),
    startRow: String(startRow),
    limit: String(limit),
  });

  window.open(
    `/dashboard/leave-credits/${row.employeeId}/print-continuation?${params.toString()}`,
    "_blank",
    "noopener,noreferrer",
  );
}




  async function openLedger(row: LeaveCreditRow) {
    setSelectedEmployee(row);
    setIsLedgerOpen(true);

    try {
      const response = await fetch(
        `/api/admin/leave-credits/${row.employeeId}/ledger`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to load ledger.");
      }

      setLedger(data.ledger);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to load ledger.");
    }
  }

  function closeLedger() {
    setSelectedEmployee(null);
    setLedger([]);
    setIsLedgerOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            HR Management
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Leave Credits
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Ledger-based VL/SL balances, monthly accruals, and adjustments.
          </p>
        </div>

        <button
          type="button"
          disabled={isPosting}
          onClick={postMonthlyAccrual}
          className="h-11 rounded-xl bg-[#0f62fe] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          Post Monthly Accrual
        </button>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, number, department, position..."
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:max-w-lg"
          />

          <p className="text-sm text-slate-500">
            {isLoading ? "Loading..." : `${pagination.total} employee/s`}
          </p>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Office / Position</th>
                  <th className="px-4 py-3 font-semibold">VL Balance</th>
                  <th className="px-4 py-3 font-semibold">SL Balance</th>
                  <th className="px-4 py-3 font-semibold">SPL Used</th>
                  <th className="px-4 py-3 font-semibold">Forced Used</th>
                  <th className="px-4 py-3 font-semibold">Last Accrual</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr key={row.employeeId} className="bg-white">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">
                        {row.employeeName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Employee No: {row.employeeNumber}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-slate-700">
                        {row.officeDepartment || "-"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {row.position || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4 font-semibold text-blue-700">
                      {formatNumber(row.vacationLeaveBalance)}
                    </td>

                    <td className="px-4 py-4 font-semibold text-green-700">
                      {formatNumber(row.sickLeaveBalance)}
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {formatNumber(row.specialPrivilegeLeaveUsed)} / 3
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {formatNumber(row.forcedLeaveUsed)} / 5
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {row.lastAccrualMonth || "-"}
                    </td>

                    <td className="px-4 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => openContinuationPrint(row)}
                        className="rounded-md border border-green-200 px-3 py-1 text-sm text-green-700 hover:bg-green-50"
                    >
                        Continue Print
                    </button>

                    <button
                        type="button"
                        onClick={() => openLedger(row)}
                        className="rounded-md border border-blue-200 px-3 py-1 text-sm text-blue-700 hover:bg-blue-50"
                    >
                        Ledger
                    </button>

                    <button
                        type="button"
                        onClick={() => openAdjustment(row)}
                        className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                    >
                        Adjust
                    </button>
                    </div>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      {isLoading
                        ? "Loading leave credits..."
                        : "No employees found."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!pagination.hasPreviousPage || isLoading}
              onClick={() => loadLeaveCredits(pagination.page - 1)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!pagination.hasNextPage || isLoading}
              onClick={() => loadLeaveCredits(pagination.page + 1)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {adjustmentEmployee ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-xl font-bold text-slate-950">
                Adjust Leave Credits
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {adjustmentEmployee.employeeName}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  VL Change
                </span>
                <input
                  type="number"
                  step="0.001"
                  value={vacationLeaveChange}
                  onChange={(event) =>
                    setVacationLeaveChange(event.target.value)
                  }
                  placeholder="Example: 5 or -1"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  SL Change
                </span>
                <input
                  type="number"
                  step="0.001"
                  value={sickLeaveChange}
                  onChange={(event) => setSickLeaveChange(event.target.value)}
                  placeholder="Example: 5 or -1"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Remarks
                </span>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Required. Example: Opening balance as of Jan 2026."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeAdjustment}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPosting}
                onClick={() => postAdjustment("opening_balance")}
                className="h-10 rounded-lg border border-blue-200 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
              >
                Post as Opening Balance
              </button>

              <button
                type="button"
                disabled={isPosting}
                onClick={() => postAdjustment("manual_adjustment")}
                className="h-10 rounded-lg bg-[#0f62fe] px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Post Adjustment
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isLedgerOpen && selectedEmployee ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Leave Credit Ledger
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedEmployee.employeeName}
                </p>
              </div>

              <button
                type="button"
                onClick={closeLedger}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Leave Type</th>
                      <th className="px-4 py-3">VL Change</th>
                      <th className="px-4 py-3">VL Balance</th>
                      <th className="px-4 py-3">SL Change</th>
                      <th className="px-4 py-3">SL Balance</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {ledger.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3">
                          {formatDate(entry.transactionDate)}
                        </td>
                        <td className="px-4 py-3">{entry.source}</td>
                        <td className="px-4 py-3">{entry.transactionType}</td>
                        <td className="px-4 py-3">{entry.leaveType}</td>
                        <td className="px-4 py-3">
                          {formatNumber(entry.vacationLeaveChange)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(entry.previousVacationLeaveBalance)} →{" "}
                          {formatNumber(entry.newVacationLeaveBalance)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(entry.sickLeaveChange)}
                        </td>
                        <td className="px-4 py-3">
                          {formatNumber(entry.previousSickLeaveBalance)} →{" "}
                          {formatNumber(entry.newSickLeaveBalance)}
                        </td>
                        <td className="px-4 py-3">{entry.remarks || "-"}</td>
                      </tr>
                    ))}

                    {ledger.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          No ledger entries found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}