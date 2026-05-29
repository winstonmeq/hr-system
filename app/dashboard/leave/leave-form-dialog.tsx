"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import type {
  EmployeeOption,
  LeaveApplicationRow,
  LeaveStatus,
} from "./leave-page-client";

export type LeaveFormValues = {
  employeeId: string;
  employeeSnapshot: {
    employeeNumber: string;
    lastName: string;
    firstName: string;
    middleName: string;
    officeDepartment: string;
    position: string;
    salary: string;
  };
  dateOfFiling: string;
  leaveType: string;
  otherLeaveType: string;
  leaveDetails: any;
  numberOfWorkingDays: string;
  inclusiveDates: string;
  commutation: {
    requested: boolean;
    notRequested: boolean;
  };
  status: LeaveStatus;
  remarks: string;
};

type LeaveFormDialogProps = {
  open: boolean;
  leaveApplication: LeaveApplicationRow | null;
  employees: EmployeeOption[];
  submitting: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onSubmit: (values: LeaveFormValues) => Promise<void>;
};

const emptyForm: LeaveFormValues = {
  employeeId: "",
  employeeSnapshot: {
    employeeNumber: "",
    lastName: "",
    firstName: "",
    middleName: "",
    officeDepartment: "",
    position: "",
    salary: "",
  },
  dateOfFiling: new Date().toISOString().slice(0, 10),
  leaveType: "vacation",
  otherLeaveType: "",
  leaveDetails: {
    vacation: {
      withinPhilippines: false,
      abroad: false,
      abroadSpecify: "",
    },
    sick: {
      inHospital: false,
      outPatient: false,
      illnessSpecify: "",
    },
    specialLeaveBenefitsWomen: {
      illnessSpecify: "",
    },
    study: {
      completionMastersDegree: false,
      barBoardExaminationReview: false,
    },
    otherPurpose: {
      monetizationOfLeaveCredits: false,
      terminalLeave: false,
      details: "",
    },
  },
  numberOfWorkingDays: "",
  inclusiveDates: "",
  commutation: {
    requested: false,
    notRequested: true,
  },
  status: "submitted",
  remarks: "",
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function readByPath(source: any, path: string[]) {
  return path.reduce((current, key) => current?.[key], source) ?? "";
}

function setByPath(source: any, path: string[], value: unknown) {
  const clone = deepClone(source);
  let current = clone;

  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];

    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }

    current = current[key];
  }

  current[path[path.length - 1]] = value;

  return clone;
}

function formatDateInput(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return "";
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      <span>{label}</span>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>

      <textarea
        value={value}
        rows={3}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export function LeaveFormDialog({
  open,
  leaveApplication,
  employees,
  submitting,
  readOnly = false,
  onClose,
  onSubmit,
}: LeaveFormDialogProps) {
  const [form, setForm] = useState<LeaveFormValues>(() =>
    deepClone(emptyForm),
  );

  const isEditing = Boolean(leaveApplication);

  useEffect(() => {
    if (!open) return;

    if (leaveApplication) {
      setForm({
        ...deepClone(emptyForm),
        ...deepClone(leaveApplication),
        employeeId: leaveApplication.employee,
        dateOfFiling: formatDateInput(leaveApplication.dateOfFiling),
      } as LeaveFormValues);
    } else {
      setForm(deepClone(emptyForm));
    }
  }, [open, leaveApplication]);

  if (!open) return null;

  function update(path: string[], value: string | boolean) {
    setForm((current) => setByPath(current, path, value));
  }

  function handleSelectEmployee(employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId);

    if (!employee) {
      update(["employeeId"], employeeId);
      return;
    }

    setForm((current) => ({
      ...current,
      employeeId,
      employeeSnapshot: {
        employeeNumber: employee.employeeNumber ?? "",
        lastName: employee.lastName ?? "",
        firstName: employee.firstName ?? "",
        middleName: employee.middleName ?? "",
        officeDepartment: employee.officeDepartment ?? "",
        position: employee.position ?? "",
        salary: employee.salary ?? "",
      },
    }));
  }

  function handleCommutationChange(value: "requested" | "notRequested") {
    setForm((current) => ({
      ...current,
      commutation: {
        requested: value === "requested",
        notRequested: value === "notRequested",
      },
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.employeeId) {
      alert("Please select an employee.");
      return;
    }

    await onSubmit({
      ...deepClone(form),
      employeeId: form.employeeId,
      dateOfFiling: form.dateOfFiling,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-xl"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {isEditing
                ? "Edit Leave Application"
                : "Add Leave Application"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Application for Leave record.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <fieldset disabled={readOnly} className="mt-6 space-y-8">
          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
              Basic Information
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <SelectField
                label="Employee"
                value={form.employeeId}
                onChange={handleSelectEmployee}
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} — {employee.employeeNumber}
                  </option>
                ))}
              </SelectField>

              <Field
                label="Date of Filing"
                type="date"
                value={form.dateOfFiling}
                onChange={(value) => update(["dateOfFiling"], value)}
              />

              <SelectField
                label="Status"
                value={form.status}
                onChange={(value) => update(["status"], value)}
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="recommended">Recommended</option>
                <option value="approved">Approved</option>
                <option value="disapproved">Disapproved</option>
                <option value="cancelled">Cancelled</option>
              </SelectField>

              <Field
                label="Office / Department"
                value={form.employeeSnapshot.officeDepartment}
                onChange={(value) =>
                  update(["employeeSnapshot", "officeDepartment"], value)
                }
              />

              <Field
                label="Position"
                value={form.employeeSnapshot.position}
                onChange={(value) =>
                  update(["employeeSnapshot", "position"], value)
                }
              />

              <Field
                label="Salary"
                value={form.employeeSnapshot.salary}
                onChange={(value) =>
                  update(["employeeSnapshot", "salary"], value)
                }
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
              6.A Type of Leave
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Leave Type"
                value={form.leaveType}
                onChange={(value) => update(["leaveType"], value)}
              >
                <option value="vacation">Vacation Leave</option>
                <option value="mandatoryForced">
                  Mandatory / Forced Leave
                </option>
                <option value="sick">Sick Leave</option>
                <option value="maternity">Maternity Leave</option>
                <option value="paternity">Paternity Leave</option>
                <option value="specialPrivilege">
                  Special Privilege Leave
                </option>
                <option value="soloParent">Solo Parent Leave</option>
                <option value="study">Study Leave</option>
                <option value="tenDayVawc">10-Day VAWC Leave</option>
                <option value="rehabilitation">
                  Rehabilitation Privilege
                </option>
                <option value="specialLeaveBenefitsWomen">
                  Special Leave Benefits for Women
                </option>
                <option value="specialEmergency">
                  Special Emergency Leave
                </option>
                <option value="adoption">Adoption Leave</option>
                <option value="others">Others</option>
              </SelectField>

              <Field
                label="Other Leave Type"
                value={form.otherLeaveType}
                onChange={(value) => update(["otherLeaveType"], value)}
                placeholder="Required only if Others"
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
              6.B Details of Leave
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Vacation / Special Privilege Leave
                </p>

                <div className="space-y-3">
                  <CheckboxField
                    label="Within the Philippines"
                    checked={Boolean(
                      readByPath(form, [
                        "leaveDetails",
                        "vacation",
                        "withinPhilippines",
                      ]),
                    )}
                    onChange={(checked) =>
                      update(
                        [
                          "leaveDetails",
                          "vacation",
                          "withinPhilippines",
                        ],
                        checked,
                      )
                    }
                  />

                  <CheckboxField
                    label="Abroad"
                    checked={Boolean(
                      readByPath(form, [
                        "leaveDetails",
                        "vacation",
                        "abroad",
                      ]),
                    )}
                    onChange={(checked) =>
                      update(["leaveDetails", "vacation", "abroad"], checked)
                    }
                  />

                  <Field
                    label="Abroad Specify"
                    value={readByPath(form, [
                      "leaveDetails",
                      "vacation",
                      "abroadSpecify",
                    ])}
                    onChange={(value) =>
                      update(
                        ["leaveDetails", "vacation", "abroadSpecify"],
                        value,
                      )
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Sick Leave
                </p>

                <div className="space-y-3">
                  <CheckboxField
                    label="In Hospital"
                    checked={Boolean(
                      readByPath(form, [
                        "leaveDetails",
                        "sick",
                        "inHospital",
                      ]),
                    )}
                    onChange={(checked) =>
                      update(["leaveDetails", "sick", "inHospital"], checked)
                    }
                  />

                  <CheckboxField
                    label="Out Patient"
                    checked={Boolean(
                      readByPath(form, [
                        "leaveDetails",
                        "sick",
                        "outPatient",
                      ]),
                    )}
                    onChange={(checked) =>
                      update(["leaveDetails", "sick", "outPatient"], checked)
                    }
                  />

                  <Field
                    label="Specify Illness"
                    value={readByPath(form, [
                      "leaveDetails",
                      "sick",
                      "illnessSpecify",
                    ])}
                    onChange={(value) =>
                      update(
                        ["leaveDetails", "sick", "illnessSpecify"],
                        value,
                      )
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Study Leave
                </p>

                <div className="space-y-3">
                  <CheckboxField
                    label="Completion of Master's Degree"
                    checked={Boolean(
                      readByPath(form, [
                        "leaveDetails",
                        "study",
                        "completionMastersDegree",
                      ]),
                    )}
                    onChange={(checked) =>
                      update(
                        [
                          "leaveDetails",
                          "study",
                          "completionMastersDegree",
                        ],
                        checked,
                      )
                    }
                  />

                  <CheckboxField
                    label="BAR / Board Examination Review"
                    checked={Boolean(
                      readByPath(form, [
                        "leaveDetails",
                        "study",
                        "barBoardExaminationReview",
                      ]),
                    )}
                    onChange={(checked) =>
                      update(
                        [
                          "leaveDetails",
                          "study",
                          "barBoardExaminationReview",
                        ],
                        checked,
                      )
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Other Purpose
                </p>

                <div className="space-y-3">
                  <CheckboxField
                    label="Monetization of Leave Credits"
                    checked={Boolean(
                      readByPath(form, [
                        "leaveDetails",
                        "otherPurpose",
                        "monetizationOfLeaveCredits",
                      ]),
                    )}
                    onChange={(checked) =>
                      update(
                        [
                          "leaveDetails",
                          "otherPurpose",
                          "monetizationOfLeaveCredits",
                        ],
                        checked,
                      )
                    }
                  />

                  <CheckboxField
                    label="Terminal Leave"
                    checked={Boolean(
                      readByPath(form, [
                        "leaveDetails",
                        "otherPurpose",
                        "terminalLeave",
                      ]),
                    )}
                    onChange={(checked) =>
                      update(
                        ["leaveDetails", "otherPurpose", "terminalLeave"],
                        checked,
                      )
                    }
                  />

                  <Field
                    label="Other Details"
                    value={readByPath(form, [
                      "leaveDetails",
                      "otherPurpose",
                      "details",
                    ])}
                    onChange={(value) =>
                      update(
                        ["leaveDetails", "otherPurpose", "details"],
                        value,
                      )
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Special Leave Benefits for Women
                </p>

                <Field
                  label="Specify Illness"
                  value={readByPath(form, [
                    "leaveDetails",
                    "specialLeaveBenefitsWomen",
                    "illnessSpecify",
                  ])}
                  onChange={(value) =>
                    update(
                      [
                        "leaveDetails",
                        "specialLeaveBenefitsWomen",
                        "illnessSpecify",
                      ],
                      value,
                    )
                  }
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
              6.C / 6.D Number of Days and Commutation
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Number of Working Days Applied For"
                value={form.numberOfWorkingDays}
                onChange={(value) => update(["numberOfWorkingDays"], value)}
              />

              <Field
                label="Inclusive Dates"
                value={form.inclusiveDates}
                onChange={(value) => update(["inclusiveDates"], value)}
                placeholder="Example: June 3-5, 2026"
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Commutation
                </p>

                <div className="flex flex-wrap gap-6">
                  <CheckboxField
                    label="Not Requested"
                    checked={form.commutation.notRequested}
                    onChange={() => handleCommutationChange("notRequested")}
                  />

                  <CheckboxField
                    label="Requested"
                    checked={form.commutation.requested}
                    onChange={() => handleCommutationChange("requested")}
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <TextArea
              label="Remarks"
              value={form.remarks}
              onChange={(value) => update(["remarks"], value)}
              placeholder="Optional notes"
            />
          </section>
        </fieldset>

        <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

         {!readOnly ? (
  <button
    type="submit"
    disabled={submitting}
    className="h-10 rounded-lg bg-[#0f62fe] px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {submitting
      ? "Saving..."
      : isEditing
        ? "Save Changes"
        : "Create Leave"}
  </button>
) : null}
        </div>
      </form>
    </div>
  );
}