"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EmployeeFormDialog,
  type EmployeeFormValues,
} from "./employee-form-dialog";

export type EmployeeStatus = "active" | "inactive" | "retired" | "separated";

export type EmployeeRow = {
  id: string;
  _id?: string;
  employeeNumber: string;
  status: EmployeeStatus;
  personalInfo: {
    name: {
      surname: string;
      firstName: string;
      middleName?: string;
      nameExtension?: string;
    };
    birthDate?: string;
    sex?: string;
    civilStatus?: string;
    contact?: {
      mobileNumber?: string;
      emailAddress?: string;
    };
  };
  workExperience?: Array<{
    positionTitle?: string;
    departmentAgencyOfficeCompany?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type EmployeesPageClientProps = {
  initialEmployees: EmployeeRow[];
  initialPagination: Pagination;
};

function formatEmployeeName(employee: EmployeeRow) {
  const name = employee.personalInfo?.name;

  return [
    name?.surname ? `${name.surname},` : "",
    name?.firstName,
    name?.middleName,
    name?.nameExtension,
  ]
    .filter(Boolean)
    .join(" ");
}

function getInitials(employee: EmployeeRow) {
  const name = employee.personalInfo?.name;

  return `${name?.firstName?.[0] ?? ""}${name?.surname?.[0] ?? ""}`.toUpperCase();
}

function getCurrentWork(employee: EmployeeRow) {
  const currentWork = employee.workExperience?.[0];

  return {
    position: currentWork?.positionTitle ?? "-",
    office: currentWork?.departmentAgencyOfficeCompany ?? "-",
  };
}

function statusClassName(status: EmployeeStatus) {
  if (status === "active") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (status === "retired") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "separated") {
    return "bg-orange-50 text-orange-700 ring-orange-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

export function EmployeesPageClient({
  initialEmployees,
  initialPagination,
}: EmployeesPageClientProps) {
  const [employees, setEmployees] = useState<EmployeeRow[]>(initialEmployees);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(
    null,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  const activeCount = useMemo(
    () => employees.filter((employee) => employee.status === "active").length,
    [employees],
  );

  const currentPage = pagination.page;

  const loadEmployees = useCallback(
    async (page = 1) => {
      setIsLoadingEmployees(true);

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
          `/api/admin/employees?${params.toString()}`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Failed to load employees.");
        }

        setEmployees(data.employees);
        setPagination(data.pagination);
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Failed to load employees.",
        );
      } finally {
        setIsLoadingEmployees(false);
      }
    },
    [pagination.limit, search, statusFilter],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEmployees(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [loadEmployees]);

  function openCreateForm() {
    setEditingEmployee(null);
    setIsFormOpen(true);
  }

  function openEditForm(employee: EmployeeRow) {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  }

  async function handleSubmitEmployee(values: EmployeeFormValues) {
    setIsSubmitting(true);

    try {
      const url = editingEmployee
        ? `/api/admin/employees/${editingEmployee.id}`
        : "/api/admin/employees";

      const method = editingEmployee ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to save employee.");
      }

      setIsFormOpen(false);
      setEditingEmployee(null);

      await loadEmployees(editingEmployee ? currentPage : 1);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to save employee.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivateEmployee(employee: EmployeeRow) {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${formatEmployeeName(employee)}?`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to deactivate employee.");
      }

      await loadEmployees(currentPage);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to deactivate employee.",
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
            Employee PDS Records
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage employee records based on Government Personal Data Sheet
            fields.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="h-11 rounded-xl bg-[#0f62fe] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Add Employee
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Total Results</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {pagination.total}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Active on Page</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Current Page</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {pagination.page}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee no., name, email, mobile, position, or office..."
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:max-w-lg"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="retired">Retired</option>
            <option value="separated">Separated</option>
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Current Work</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {employees.map((employee) => {
                  const work = getCurrentWork(employee);

                  return (
                    <tr key={employee.id} className="bg-white">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                            {getInitials(employee)}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-950">
                              {formatEmployeeName(employee)}
                            </p>
                            <p className="text-xs text-slate-500">
                              Employee No: {employee.employeeNumber}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {employee.personalInfo?.sex || "-"} •{" "}
                              {employee.personalInfo?.civilStatus || "-"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-slate-700">
                          {employee.personalInfo?.contact?.mobileNumber || "-"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {employee.personalInfo?.contact?.emailAddress || "-"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-slate-700">{work.position}</p>
                        <p className="text-xs text-slate-400">{work.office}</p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusClassName(
                            employee.status,
                          )}`}
                        >
                          {employee.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">

                            <a
                                href={`/dashboard/employees/${employee.id}/print-pds`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-blue-200 px-3 py-1 text-sm text-blue-700 hover:bg-blue-50"
                            >
                                Print PDS
                            </a>


                          <button
                            type="button"
                            onClick={() => openEditForm(employee)}
                            className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          {employee.status !== "inactive" ? (
                            <button
                              type="button"
                              onClick={() => handleDeactivateEmployee(employee)}
                              className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                            >
                              Deactivate
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      {isLoadingEmployees
                        ? "Loading employees..."
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
            {isLoadingEmployees ? " • Loading..." : ""}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!pagination.hasPreviousPage || isLoadingEmployees}
              onClick={() => loadEmployees(currentPage - 1)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!pagination.hasNextPage || isLoadingEmployees}
              onClick={() => loadEmployees(currentPage + 1)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <EmployeeFormDialog
        open={isFormOpen}
        employee={editingEmployee}
        submitting={isSubmitting}
        onClose={() => {
          setIsFormOpen(false);
          setEditingEmployee(null);
        }}
        onSubmit={handleSubmitEmployee}
      />
    </div>
  );
}