"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  LeaveFormDialog,
  type LeaveFormValues,
} from "./leave-form-dialog";

export type LeaveStatus =
  | "draft"
  | "submitted"
  | "recommended"
  | "approved"
  | "disapproved"
  | "cancelled";

export type EmployeeOption = {
  id: string;
  employeeNumber: string;
  fullName: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  officeDepartment?: string;
  position?: string;
  salary?: string;
};

export type LeaveApplicationRow = {
  id: string;
  employee: string;
  employeeSnapshot: {
    employeeNumber?: string;
    lastName?: string;
    firstName?: string;
    middleName?: string;
    officeDepartment?: string;
    position?: string;
    salary?: string;
  };
  dateOfFiling: string;
  leaveType: string;
  otherLeaveType?: string;
  numberOfWorkingDays?: string;
  inclusiveDates?: string;
  commutation?: {
    requested?: boolean;
    notRequested?: boolean;
  };
  status: LeaveStatus;
  remarks?: string;
  leaveDetails?: any;
  recommendation?: any;
  action?: any;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type LeavePageClientProps = {
  initialLeaveApplications: LeaveApplicationRow[];
  employees: EmployeeOption[];
  currentUserRole: string;
  initialPagination: Pagination;
};

type FormMode = "create" | "edit" | "view";

function statusClassName(status: LeaveStatus) {
  if (status === "approved") return "bg-green-50 text-green-700 ring-green-200";
  if (status === "disapproved") return "bg-red-50 text-red-700 ring-red-200";
  if (status === "recommended") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (status === "cancelled") return "bg-slate-50 text-slate-700 ring-slate-200";
  if (status === "draft") return "bg-yellow-50 text-yellow-700 ring-yellow-200";

  return "bg-indigo-50 text-indigo-700 ring-indigo-200";
}

function formatDate(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString();
}

function formatLeaveType(value: string, other?: string) {
  const labels: Record<string, string> = {
    vacation: "Vacation Leave",
    mandatoryForced: "Mandatory/Forced Leave",
    sick: "Sick Leave",
    maternity: "Maternity Leave",
    paternity: "Paternity Leave",
    specialPrivilege: "Special Privilege Leave",
    soloParent: "Solo Parent Leave",
    study: "Study Leave",
    tenDayVawc: "10-Day VAWC Leave",
    rehabilitation: "Rehabilitation Privilege",
    specialLeaveBenefitsWomen: "Special Leave Benefits for Women",
    specialEmergency: "Special Emergency Leave",
    adoption: "Adoption Leave",
    others: other || "Others",
  };

  return labels[value] ?? value;
}

export function LeavePageClient({
  initialLeaveApplications,
  employees,
  currentUserRole,
  initialPagination,
}: LeavePageClientProps) {
  const [leaveApplications, setLeaveApplications] = useState(
    initialLeaveApplications,
  );
  const [pagination, setPagination] = useState(initialPagination);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    currentUserRole === "department-head" ? "submitted" : "all",
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [selectedLeave, setSelectedLeave] =
    useState<LeaveApplicationRow | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentPage = pagination.page;

  const canCreateLeave = currentUserRole !== "department-head";
  const canDepartmentReview = currentUserRole === "department-head";
  const canHrFinalize =
    currentUserRole === "hr-admin" || currentUserRole === "super-admin";

  const pendingCount = useMemo(
    () =>
      leaveApplications.filter(
        (item) => item.status === "submitted" || item.status === "recommended",
      ).length,
    [leaveApplications],
  );

  const approvedCount = useMemo(
    () => leaveApplications.filter((item) => item.status === "approved").length,
    [leaveApplications],
  );

  const loadLeaveApplications = useCallback(
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

        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }

        const response = await fetch(
          `/api/admin/leave-applications?${params.toString()}`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Failed to load leave applications.");
        }

        setLeaveApplications(data.leaveApplications);
        setPagination(data.pagination);
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Failed to load leave applications.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, search, statusFilter],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLeaveApplications(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [loadLeaveApplications]);

  function openCreateForm() {
    setSelectedLeave(null);
    setFormMode("create");
    setIsFormOpen(true);
  }

  function openEditForm(leave: LeaveApplicationRow) {
    setSelectedLeave(leave);
    setFormMode("edit");
    setIsFormOpen(true);
  }

  function openViewForm(leave: LeaveApplicationRow) {
    setSelectedLeave(leave);
    setFormMode("view");
    setIsFormOpen(true);
  }

  function closeForm() {
    setSelectedLeave(null);
    setFormMode("create");
    setIsFormOpen(false);
  }

  async function handleSubmitLeave(values: LeaveFormValues) {
    setIsSubmitting(true);

    try {
      const url = selectedLeave
        ? `/api/admin/leave-applications/${selectedLeave.id}`
        : "/api/admin/leave-applications";

      const method = selectedLeave ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to save leave application.");
      }

      closeForm();

      await loadLeaveApplications(selectedLeave ? currentPage : 1);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save leave application.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelLeave(leave: LeaveApplicationRow) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this leave application?",
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/admin/leave-applications/${leave.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to cancel leave application.");
      }

      await loadLeaveApplications(currentPage);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to cancel leave application.",
      );
    }
  }

  async function handleDepartmentDecision(
    leave: LeaveApplicationRow,
    decision: "recommended" | "disapproved",
  ) {
    const reason =
      decision === "disapproved"
        ? window.prompt("Reason for disapproval:")
        : "";

    if (decision === "disapproved" && !reason) {
      return;
    }

    const confirmed = window.confirm(
      decision === "recommended"
        ? "Approve this leave application and forward it to HR?"
        : "Disapprove this leave application?",
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/admin/leave-applications/${leave.id}/department-approval`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            reason,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to review leave application.");
      }

      await loadLeaveApplications(currentPage);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to review leave application.",
      );
    }
  }

  async function handleHrDecision(
    leave: LeaveApplicationRow,
    decision: "approved" | "disapproved",
  ) {
    const reason =
      decision === "disapproved"
        ? window.prompt("Reason for disapproval:")
        : "";

    if (decision === "disapproved" && !reason) {
      return;
    }

    const confirmed = window.confirm(
      decision === "approved"
        ? "Final approve this leave application?"
        : "Final disapprove this leave application?",
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/admin/leave-applications/${leave.id}/hr-action`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            reason,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to finalize leave application.");
      }

      await loadLeaveApplications(currentPage);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to finalize leave application.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            HR Management
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Leave Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Department Head reviews first. HR Admin finalizes after recommendation.
          </p>
        </div>

        {canCreateLeave ? (
          <button
            type="button"
            onClick={openCreateForm}
            className="h-11 rounded-xl bg-[#0f62fe] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + Add Leave Application
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Total Results</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {pagination.total}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Pending on Page</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Approved on Page</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {approvedCount}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, department, position, leave type, dates..."
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:max-w-lg"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="recommended">Recommended</option>
            <option value="approved">Approved</option>
            <option value="disapproved">Disapproved</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Leave Type</th>
                  <th className="px-4 py-3 font-semibold">Filing Date</th>
                  <th className="px-4 py-3 font-semibold">Days / Dates</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {leaveApplications.map((leave) => (
                  <tr key={leave.id} className="bg-white">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">
                        {leave.employeeSnapshot?.lastName},{" "}
                        {leave.employeeSnapshot?.firstName}{" "}
                        {leave.employeeSnapshot?.middleName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Employee No:{" "}
                        {leave.employeeSnapshot?.employeeNumber || "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {leave.employeeSnapshot?.officeDepartment || "-"} •{" "}
                        {leave.employeeSnapshot?.position || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {formatLeaveType(
                        leave.leaveType,
                        leave.otherLeaveType,
                      )}
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {formatDate(leave.dateOfFiling)}
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-slate-700">
                        {leave.numberOfWorkingDays || "-"} working day/s
                      </p>
                      <p className="text-xs text-slate-400">
                        {leave.inclusiveDates || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusClassName(
                          leave.status,
                        )}`}
                      >
                        {leave.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openViewForm(leave)}
                          className="rounded-md border border-blue-200 px-3 py-1 text-sm text-blue-700 hover:bg-blue-50"
                        >
                          View Form
                        </button>

                        {canDepartmentReview && leave.status === "submitted" ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleDepartmentDecision(leave, "recommended")
                              }
                              className="rounded-md border border-green-200 px-3 py-1 text-sm text-green-700 hover:bg-green-50"
                            >
                              Approve to HR
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDepartmentDecision(leave, "disapproved")
                              }
                              className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                            >
                              Disapprove
                            </button>
                          </>
                        ) : null}

                        {canHrFinalize && leave.status === "recommended" ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleHrDecision(leave, "approved")
                              }
                              className="rounded-md border border-green-200 px-3 py-1 text-sm text-green-700 hover:bg-green-50"
                            >
                              Final Approve
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleHrDecision(leave, "disapproved")
                              }
                              className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                            >
                              Final Disapprove
                            </button>
                          </>
                        ) : null}

                        {currentUserRole !== "department-head" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditForm(leave)}
                              className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                            >
                              Edit
                            </button>

                            {leave.status !== "cancelled" ? (
                              <button
                                type="button"
                                onClick={() => handleCancelLeave(leave)}
                                className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}

                {leaveApplications.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      {isLoading
                        ? "Loading leave applications..."
                        : "No leave applications found."}
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
            {isLoading ? " • Loading..." : ""}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!pagination.hasPreviousPage || isLoading}
              onClick={() => loadLeaveApplications(currentPage - 1)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!pagination.hasNextPage || isLoading}
              onClick={() => loadLeaveApplications(currentPage + 1)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <LeaveFormDialog
        open={isFormOpen}
        leaveApplication={selectedLeave}
        employees={employees}
        submitting={isSubmitting}
        readOnly={formMode === "view"}
        onClose={closeForm}
        onSubmit={handleSubmitLeave}
      />
    </div>
  );
}