"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import type { EmployeeRow, EmployeeStatus } from "./employees-page-client";

export type EmployeeFormValues = {
  employeeNumber: string;
  status: EmployeeStatus;
  personalInfo: any;
  familyBackground: any;
  educationalBackground: any[];
  civilServiceEligibility: any[];
  workExperience: any[];
  voluntaryWork: any[];
  learningAndDevelopment: any[];
  otherInformation: any;
  references: any[];
  governmentIssuedId: any;
  pdsMeta: any;
};

type EmployeeFormDialogProps = {
  open: boolean;
  employee: EmployeeRow | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
};

const emptyWorkExperienceRow = {
  fromDate: "",
  toDate: "",
  positionTitle: "",
  departmentAgencyOfficeCompany: "",
  monthlySalary: "",
  salaryGradeStep: "",
  statusOfAppointment: "",
  isGovernmentService: true,
  duties: "",
};

const emptyEducationRow = {
  level: "college",
  schoolName: "",
  degreeCourse: "",
  periodFrom: "",
  periodTo: "",
  highestLevelUnitsEarned: "",
  yearGraduated: "",
  scholarshipAcademicHonors: "",
};

const emptyEligibilityRow = {
  careerService: "",
  rating: "",
  examinationDate: "",
  examinationPlace: "",
  licenseNumber: "",
  licenseValidityDate: "",
};

const emptyVoluntaryWorkRow = {
  organizationNameAddress: "",
  fromDate: "",
  toDate: "",
  numberOfHours: "",
  positionNatureOfWork: "",
};

const emptyTrainingRow = {
  title: "",
  fromDate: "",
  toDate: "",
  numberOfHours: "",
  typeOfLd: "",
  conductedBy: "",
};

const emptyChildRow = {
  fullName: "",
  birthDate: "",
};

const emptyForm: EmployeeFormValues = {
  employeeNumber: "",
  status: "active",

  personalInfo: {
    name: {
      surname: "",
      firstName: "",
      middleName: "",
      nameExtension: "",
    },
    birthDate: "",
    placeOfBirth: "",
    sex: "",
    civilStatus: "",
    civilStatusOther: "",
    citizenship: "filipino",
    dualCitizenshipType: "",
    dualCitizenshipCountry: "",
    heightM: "",
    weightKg: "",
    bloodType: "",
    ids: {
      gsis: "",
      pagibig: "",
      philhealth: "",
      sss: "",
      tin: "",
      agencyEmployeeNumber: "",
    },
    residentialAddress: {},
    permanentAddress: {},
    contact: {
      telephoneNumber: "",
      mobileNumber: "",
      emailAddress: "",
    },
  },

  familyBackground: {
    spouse: {
      name: {
        surname: "",
        firstName: "",
        middleName: "",
        nameExtension: "",
      },
      occupation: "",
      employerBusinessName: "",
      businessAddress: "",
      telephoneNumber: "",
    },
    father: {
      name: {
        surname: "",
        firstName: "",
        middleName: "",
        nameExtension: "",
      },
    },
    mother: {
      maidenName: {
        surname: "",
        firstName: "",
        middleName: "",
        nameExtension: "",
      },
    },
    children: [emptyChildRow],
  },

  educationalBackground: [emptyEducationRow],
  civilServiceEligibility: [emptyEligibilityRow],
  workExperience: [emptyWorkExperienceRow],
  voluntaryWork: [emptyVoluntaryWorkRow],
  learningAndDevelopment: [emptyTrainingRow],

  otherInformation: {
    specialSkillsHobbies: [],
    nonAcademicDistinctions: [],
    memberships: [],
  },

  references: [],

  governmentIssuedId: {
    idType: "",
    idNumber: "",
    dateIssued: "",
    placeIssued: "",
  },

  pdsMeta: {
    dateAccomplished: "",
  },
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
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

function readByPath(source: any, path: string[]) {
  return path.reduce((current, key) => current?.[key], source) ?? "";
}

function formatDateInput(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
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

export function EmployeeFormDialog({
  open,
  employee,
  submitting,
  onClose,
  onSubmit,
}: EmployeeFormDialogProps) {
  const [form, setForm] = useState<EmployeeFormValues>(() =>
    deepClone(emptyForm),
  );

  const isEditing = Boolean(employee);

  useEffect(() => {
    if (!open) return;

    if (employee) {
      const nextForm = {
        ...deepClone(emptyForm),
        ...deepClone(employee),
      } as EmployeeFormValues;

      if (!nextForm.familyBackground) {
        nextForm.familyBackground = deepClone(emptyForm.familyBackground);
      }

      if (!Array.isArray(nextForm.familyBackground.children)) {
        nextForm.familyBackground.children = [];
      }

      if (!Array.isArray(nextForm.educationalBackground)) {
        nextForm.educationalBackground = [];
      }

      if (!Array.isArray(nextForm.civilServiceEligibility)) {
        nextForm.civilServiceEligibility = [];
      }

      if (!Array.isArray(nextForm.workExperience)) {
        nextForm.workExperience = [];
      }

      if (!Array.isArray(nextForm.voluntaryWork)) {
        nextForm.voluntaryWork = [];
      }

      if (!Array.isArray(nextForm.learningAndDevelopment)) {
        nextForm.learningAndDevelopment = [];
      }

      setForm(nextForm);
    } else {
      setForm({
        ...deepClone(emptyForm),
        educationalBackground: [deepClone(emptyEducationRow)],
        civilServiceEligibility: [deepClone(emptyEligibilityRow)],
        workExperience: [deepClone(emptyWorkExperienceRow)],
        voluntaryWork: [deepClone(emptyVoluntaryWorkRow)],
        learningAndDevelopment: [deepClone(emptyTrainingRow)],
        familyBackground: {
          ...deepClone(emptyForm.familyBackground),
          children: [deepClone(emptyChildRow)],
        },
      });
    }
  }, [open, employee]);

  if (!open) return null;

  function update(path: string[], value: string) {
    setForm((current) => setByPath(current, path, value));
  }

  function updateChild(index: number, key: string, value: string) {
    setForm((current) => {
      const clone = deepClone(current);

      if (!clone.familyBackground || typeof clone.familyBackground !== "object") {
        clone.familyBackground = {};
      }

      if (!Array.isArray(clone.familyBackground.children)) {
        clone.familyBackground.children = [];
      }

      clone.familyBackground.children[index] = {
        ...emptyChildRow,
        ...clone.familyBackground.children[index],
        [key]: value,
      };

      return clone;
    });
  }

  function addChild() {
    setForm((current) => {
      const clone = deepClone(current);

      if (!clone.familyBackground || typeof clone.familyBackground !== "object") {
        clone.familyBackground = {};
      }

      clone.familyBackground.children = [
        ...(Array.isArray(clone.familyBackground.children)
          ? clone.familyBackground.children
          : []),
        deepClone(emptyChildRow),
      ];

      return clone;
    });
  }

  function removeChild(index: number) {
    setForm((current) => {
      const clone = deepClone(current);

      clone.familyBackground.children = Array.isArray(
        clone.familyBackground?.children,
      )
        ? clone.familyBackground.children.filter(
            (_: unknown, itemIndex: number) => itemIndex !== index,
          )
        : [];

      return clone;
    });
  }

  function updateEducation(index: number, key: string, value: string) {
    setForm((current) => {
      const clone = deepClone(current);

      if (!Array.isArray(clone.educationalBackground)) {
        clone.educationalBackground = [];
      }

      clone.educationalBackground[index] = {
        ...emptyEducationRow,
        ...clone.educationalBackground[index],
        [key]: value,
      };

      return clone;
    });
  }

  function addEducation() {
    setForm((current) => ({
      ...deepClone(current),
      educationalBackground: [
        ...(Array.isArray(current.educationalBackground)
          ? current.educationalBackground
          : []),
        deepClone(emptyEducationRow),
      ],
    }));
  }

  function removeEducation(index: number) {
    setForm((current) => {
      const clone = deepClone(current);

      clone.educationalBackground = Array.isArray(clone.educationalBackground)
        ? clone.educationalBackground.filter(
            (_: unknown, itemIndex: number) => itemIndex !== index,
          )
        : [];

      return clone;
    });
  }

  function updateEligibility(index: number, key: string, value: string) {
    setForm((current) => {
      const clone = deepClone(current);

      if (!Array.isArray(clone.civilServiceEligibility)) {
        clone.civilServiceEligibility = [];
      }

      clone.civilServiceEligibility[index] = {
        ...emptyEligibilityRow,
        ...clone.civilServiceEligibility[index],
        [key]: value,
      };

      return clone;
    });
  }

  function addEligibility() {
    setForm((current) => ({
      ...deepClone(current),
      civilServiceEligibility: [
        ...(Array.isArray(current.civilServiceEligibility)
          ? current.civilServiceEligibility
          : []),
        deepClone(emptyEligibilityRow),
      ],
    }));
  }

  function removeEligibility(index: number) {
    setForm((current) => {
      const clone = deepClone(current);

      clone.civilServiceEligibility = Array.isArray(
        clone.civilServiceEligibility,
      )
        ? clone.civilServiceEligibility.filter(
            (_: unknown, itemIndex: number) => itemIndex !== index,
          )
        : [];

      return clone;
    });
  }

  function updateWorkExperience(
    index: number,
    key: string,
    value: string | boolean,
  ) {
    setForm((current) => {
      const clone = deepClone(current);

      if (!Array.isArray(clone.workExperience)) {
        clone.workExperience = [];
      }

      clone.workExperience[index] = {
        ...emptyWorkExperienceRow,
        ...clone.workExperience[index],
        [key]: value,
      };

      return clone;
    });
  }

  function addWorkExperience() {
    setForm((current) => ({
      ...deepClone(current),
      workExperience: [
        ...(Array.isArray(current.workExperience)
          ? current.workExperience
          : []),
        deepClone(emptyWorkExperienceRow),
      ],
    }));
  }

  function removeWorkExperience(index: number) {
    setForm((current) => {
      const clone = deepClone(current);

      clone.workExperience = Array.isArray(clone.workExperience)
        ? clone.workExperience.filter(
            (_: unknown, itemIndex: number) => itemIndex !== index,
          )
        : [];

      return clone;
    });
  }

  function updateVoluntaryWork(index: number, key: string, value: string) {
    setForm((current) => {
      const clone = deepClone(current);

      if (!Array.isArray(clone.voluntaryWork)) {
        clone.voluntaryWork = [];
      }

      clone.voluntaryWork[index] = {
        ...emptyVoluntaryWorkRow,
        ...clone.voluntaryWork[index],
        [key]: value,
      };

      return clone;
    });
  }

  function addVoluntaryWork() {
    setForm((current) => ({
      ...deepClone(current),
      voluntaryWork: [
        ...(Array.isArray(current.voluntaryWork) ? current.voluntaryWork : []),
        deepClone(emptyVoluntaryWorkRow),
      ],
    }));
  }

  function removeVoluntaryWork(index: number) {
    setForm((current) => {
      const clone = deepClone(current);

      clone.voluntaryWork = Array.isArray(clone.voluntaryWork)
        ? clone.voluntaryWork.filter(
            (_: unknown, itemIndex: number) => itemIndex !== index,
          )
        : [];

      return clone;
    });
  }

  function updateTraining(index: number, key: string, value: string) {
    setForm((current) => {
      const clone = deepClone(current);

      if (!Array.isArray(clone.learningAndDevelopment)) {
        clone.learningAndDevelopment = [];
      }

      clone.learningAndDevelopment[index] = {
        ...emptyTrainingRow,
        ...clone.learningAndDevelopment[index],
        [key]: value,
      };

      return clone;
    });
  }

  function addTraining() {
    setForm((current) => ({
      ...deepClone(current),
      learningAndDevelopment: [
        ...(Array.isArray(current.learningAndDevelopment)
          ? current.learningAndDevelopment
          : []),
        deepClone(emptyTrainingRow),
      ],
    }));
  }

  function removeTraining(index: number) {
    setForm((current) => {
      const clone = deepClone(current);

      clone.learningAndDevelopment = Array.isArray(
        clone.learningAndDevelopment,
      )
        ? clone.learningAndDevelopment.filter(
            (_: unknown, itemIndex: number) => itemIndex !== index,
          )
        : [];

      return clone;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      const payload: EmployeeFormValues = {
        ...deepClone(form),
        employeeNumber: form.employeeNumber.trim(),

        familyBackground: {
          ...form.familyBackground,
          children: Array.isArray(form.familyBackground?.children)
            ? form.familyBackground.children
            : [],
        },

        educationalBackground: Array.isArray(form.educationalBackground)
          ? form.educationalBackground
          : [],

        civilServiceEligibility: Array.isArray(form.civilServiceEligibility)
          ? form.civilServiceEligibility
          : [],

        workExperience: Array.isArray(form.workExperience)
          ? form.workExperience
          : [],

        voluntaryWork: Array.isArray(form.voluntaryWork)
          ? form.voluntaryWork
          : [],

        learningAndDevelopment: Array.isArray(form.learningAndDevelopment)
          ? form.learningAndDevelopment
          : [],
      };

      payload.personalInfo.contact.emailAddress =
        payload.personalInfo.contact.emailAddress?.trim().toLowerCase();

      await onSubmit(payload);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Invalid employee form.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-6xl rounded-3xl bg-white p-6 shadow-xl"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {isEditing ? "Edit Employee PDS" : "Add Employee PDS"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              PDS-based employee profile record.
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

        <div className="mt-6 space-y-8">
          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
              Basic Record
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Employee Number"
                value={form.employeeNumber}
                onChange={(value) => update(["employeeNumber"], value)}
              />

              <SelectField
                label="Status"
                value={form.status}
                onChange={(value) => update(["status"], value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="retired">Retired</option>
                <option value="separated">Separated</option>
              </SelectField>

              <Field
                label="Date Accomplished"
                type="date"
                value={formatDateInput(
                  readByPath(form, ["pdsMeta", "dateAccomplished"]),
                )}
                onChange={(value) =>
                  update(["pdsMeta", "dateAccomplished"], value)
                }
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
              I. Personal Information
            </h3>

            <div className="grid gap-4 md:grid-cols-4">
              <Field
                label="Surname"
                value={readByPath(form, ["personalInfo", "name", "surname"])}
                onChange={(value) =>
                  update(["personalInfo", "name", "surname"], value)
                }
              />

              <Field
                label="First Name"
                value={readByPath(form, ["personalInfo", "name", "firstName"])}
                onChange={(value) =>
                  update(["personalInfo", "name", "firstName"], value)
                }
              />

              <Field
                label="Middle Name"
                value={readByPath(form, ["personalInfo", "name", "middleName"])}
                onChange={(value) =>
                  update(["personalInfo", "name", "middleName"], value)
                }
              />

              <Field
                label="Name Extension"
                value={readByPath(form, [
                  "personalInfo",
                  "name",
                  "nameExtension",
                ])}
                onChange={(value) =>
                  update(["personalInfo", "name", "nameExtension"], value)
                }
                placeholder="Jr., Sr., III"
              />

              <Field
                label="Birth Date"
                type="date"
                value={formatDateInput(
                  readByPath(form, ["personalInfo", "birthDate"]),
                )}
                onChange={(value) =>
                  update(["personalInfo", "birthDate"], value)
                }
              />

              <Field
                label="Place of Birth"
                value={readByPath(form, ["personalInfo", "placeOfBirth"])}
                onChange={(value) =>
                  update(["personalInfo", "placeOfBirth"], value)
                }
              />

              <SelectField
                label="Sex"
                value={readByPath(form, ["personalInfo", "sex"])}
                onChange={(value) => update(["personalInfo", "sex"], value)}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </SelectField>

              <SelectField
                label="Civil Status"
                value={readByPath(form, ["personalInfo", "civilStatus"])}
                onChange={(value) =>
                  update(["personalInfo", "civilStatus"], value)
                }
              >
                <option value="">Select</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="widowed">Widowed</option>
                <option value="separated">Separated</option>
                <option value="other">Other</option>
              </SelectField>

              <Field
                label="Height M"
                value={readByPath(form, ["personalInfo", "heightM"])}
                onChange={(value) => update(["personalInfo", "heightM"], value)}
              />

              <Field
                label="Weight KG"
                value={readByPath(form, ["personalInfo", "weightKg"])}
                onChange={(value) =>
                  update(["personalInfo", "weightKg"], value)
                }
              />

              <Field
                label="Blood Type"
                value={readByPath(form, ["personalInfo", "bloodType"])}
                onChange={(value) =>
                  update(["personalInfo", "bloodType"], value)
                }
              />

              <Field
                label="Telephone Number"
                value={readByPath(form, [
                  "personalInfo",
                  "contact",
                  "telephoneNumber",
                ])}
                onChange={(value) =>
                  update(["personalInfo", "contact", "telephoneNumber"], value)
                }
              />

              <Field
                label="Mobile Number"
                value={readByPath(form, [
                  "personalInfo",
                  "contact",
                  "mobileNumber",
                ])}
                onChange={(value) =>
                  update(["personalInfo", "contact", "mobileNumber"], value)
                }
              />

              <Field
                label="Email Address"
                type="email"
                value={readByPath(form, [
                  "personalInfo",
                  "contact",
                  "emailAddress",
                ])}
                onChange={(value) =>
                  update(["personalInfo", "contact", "emailAddress"], value)
                }
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
              Government IDs
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                "gsis",
                "pagibig",
                "philhealth",
                "sss",
                "tin",
                "agencyEmployeeNumber",
              ].map((key) => (
                <Field
                  key={key}
                  label={key.toUpperCase()}
                  value={readByPath(form, ["personalInfo", "ids", key])}
                  onChange={(value) =>
                    update(["personalInfo", "ids", key], value)
                  }
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
              II. Family Background
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Spouse Surname"
                value={readByPath(form, [
                  "familyBackground",
                  "spouse",
                  "name",
                  "surname",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "spouse", "name", "surname"],
                    value,
                  )
                }
              />

              <Field
                label="Spouse First Name"
                value={readByPath(form, [
                  "familyBackground",
                  "spouse",
                  "name",
                  "firstName",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "spouse", "name", "firstName"],
                    value,
                  )
                }
              />

              <Field
                label="Spouse Middle Name"
                value={readByPath(form, [
                  "familyBackground",
                  "spouse",
                  "name",
                  "middleName",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "spouse", "name", "middleName"],
                    value,
                  )
                }
              />

              <Field
                label="Spouse Name Extension"
                value={readByPath(form, [
                  "familyBackground",
                  "spouse",
                  "name",
                  "nameExtension",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "spouse", "name", "nameExtension"],
                    value,
                  )
                }
              />

              <Field
                label="Spouse Occupation"
                value={readByPath(form, [
                  "familyBackground",
                  "spouse",
                  "occupation",
                ])}
                onChange={(value) =>
                  update(["familyBackground", "spouse", "occupation"], value)
                }
              />

              <Field
                label="Spouse Employer / Business Name"
                value={readByPath(form, [
                  "familyBackground",
                  "spouse",
                  "employerBusinessName",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "spouse", "employerBusinessName"],
                    value,
                  )
                }
              />

              <Field
                label="Spouse Business Address"
                value={readByPath(form, [
                  "familyBackground",
                  "spouse",
                  "businessAddress",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "spouse", "businessAddress"],
                    value,
                  )
                }
              />

              <Field
                label="Spouse Telephone Number"
                value={readByPath(form, [
                  "familyBackground",
                  "spouse",
                  "telephoneNumber",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "spouse", "telephoneNumber"],
                    value,
                  )
                }
              />

              <Field
                label="Father Surname"
                value={readByPath(form, [
                  "familyBackground",
                  "father",
                  "name",
                  "surname",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "father", "name", "surname"],
                    value,
                  )
                }
              />

              <Field
                label="Father First Name"
                value={readByPath(form, [
                  "familyBackground",
                  "father",
                  "name",
                  "firstName",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "father", "name", "firstName"],
                    value,
                  )
                }
              />

              <Field
                label="Father Middle Name"
                value={readByPath(form, [
                  "familyBackground",
                  "father",
                  "name",
                  "middleName",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "father", "name", "middleName"],
                    value,
                  )
                }
              />

              <Field
                label="Father Name Extension"
                value={readByPath(form, [
                  "familyBackground",
                  "father",
                  "name",
                  "nameExtension",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "father", "name", "nameExtension"],
                    value,
                  )
                }
              />

              <Field
                label="Mother Maiden Surname"
                value={readByPath(form, [
                  "familyBackground",
                  "mother",
                  "maidenName",
                  "surname",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "mother", "maidenName", "surname"],
                    value,
                  )
                }
              />

              <Field
                label="Mother First Name"
                value={readByPath(form, [
                  "familyBackground",
                  "mother",
                  "maidenName",
                  "firstName",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "mother", "maidenName", "firstName"],
                    value,
                  )
                }
              />

              <Field
                label="Mother Middle Name"
                value={readByPath(form, [
                  "familyBackground",
                  "mother",
                  "maidenName",
                  "middleName",
                ])}
                onChange={(value) =>
                  update(
                    ["familyBackground", "mother", "maidenName", "middleName"],
                    value,
                  )
                }
              />
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                  Children
                </h4>

                <button
                  type="button"
                  onClick={addChild}
                  className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  + Add Child
                </button>
              </div>

              <div className="space-y-4">
                {(Array.isArray(form.familyBackground?.children)
                  ? form.familyBackground.children
                  : []
                ).map((child: any, index: number) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        Child #{index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeChild(index)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Child Full Name"
                        value={child.fullName ?? ""}
                        onChange={(value) =>
                          updateChild(index, "fullName", value)
                        }
                      />

                      <Field
                        label="Birth Date"
                        type="date"
                        value={formatDateInput(child.birthDate)}
                        onChange={(value) =>
                          updateChild(index, "birthDate", value)
                        }
                      />
                    </div>
                  </div>
                ))}

                {(!Array.isArray(form.familyBackground?.children) ||
                  form.familyBackground.children.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                    <p className="text-sm text-slate-500">
                      No children added yet.
                    </p>

                    <button
                      type="button"
                      onClick={addChild}
                      className="mt-3 rounded-lg bg-[#0f62fe] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Add First Child
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                III. Educational Background
              </h3>

              <button
                type="button"
                onClick={addEducation}
                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                + Add Education
              </button>
            </div>

            <div className="space-y-4">
              {(Array.isArray(form.educationalBackground)
                ? form.educationalBackground
                : []
              ).map((education, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      Education #{index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <SelectField
                      label="Level"
                      value={education.level ?? "college"}
                      onChange={(value) =>
                        updateEducation(index, "level", value)
                      }
                    >
                      <option value="elementary">Elementary</option>
                      <option value="secondary">Secondary</option>
                      <option value="vocational">
                        Vocational / Trade Course
                      </option>
                      <option value="college">College</option>
                      <option value="graduate">Graduate Studies</option>
                    </SelectField>

                    <Field
                      label="School Name"
                      value={education.schoolName ?? ""}
                      onChange={(value) =>
                        updateEducation(index, "schoolName", value)
                      }
                    />

                    <Field
                      label="Degree / Course"
                      value={education.degreeCourse ?? ""}
                      onChange={(value) =>
                        updateEducation(index, "degreeCourse", value)
                      }
                    />

                    <Field
                      label="Period From"
                      value={education.periodFrom ?? ""}
                      onChange={(value) =>
                        updateEducation(index, "periodFrom", value)
                      }
                      placeholder="Example: 2015"
                    />

                    <Field
                      label="Period To"
                      value={education.periodTo ?? ""}
                      onChange={(value) =>
                        updateEducation(index, "periodTo", value)
                      }
                      placeholder="Example: 2019"
                    />

                    <Field
                      label="Highest Level / Units Earned"
                      value={education.highestLevelUnitsEarned ?? ""}
                      onChange={(value) =>
                        updateEducation(
                          index,
                          "highestLevelUnitsEarned",
                          value,
                        )
                      }
                    />

                    <Field
                      label="Year Graduated"
                      value={education.yearGraduated ?? ""}
                      onChange={(value) =>
                        updateEducation(index, "yearGraduated", value)
                      }
                      placeholder="Example: 2019"
                    />

                    <Field
                      label="Scholarship / Honors"
                      value={education.scholarshipAcademicHonors ?? ""}
                      onChange={(value) =>
                        updateEducation(
                          index,
                          "scholarshipAcademicHonors",
                          value,
                        )
                      }
                    />
                  </div>
                </div>
              ))}

              {(!Array.isArray(form.educationalBackground) ||
                form.educationalBackground.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    No educational background added yet.
                  </p>

                  <button
                    type="button"
                    onClick={addEducation}
                    className="mt-3 rounded-lg bg-[#0f62fe] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Add First Education
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                IV. Civil Service Eligibility
              </h3>

              <button
                type="button"
                onClick={addEligibility}
                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                + Add Eligibility
              </button>
            </div>

            <div className="space-y-4">
              {(Array.isArray(form.civilServiceEligibility)
                ? form.civilServiceEligibility
                : []
              ).map((eligibility, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      Eligibility #{index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeEligibility(index)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Field
                      label="Career Service / Eligibility"
                      value={eligibility.careerService ?? ""}
                      onChange={(value) =>
                        updateEligibility(index, "careerService", value)
                      }
                      placeholder="Career Service Professional, RA 1080, etc."
                    />

                    <Field
                      label="Rating"
                      value={eligibility.rating ?? ""}
                      onChange={(value) =>
                        updateEligibility(index, "rating", value)
                      }
                    />

                    <Field
                      label="Date of Examination / Conferment"
                      type="date"
                      value={formatDateInput(eligibility.examinationDate)}
                      onChange={(value) =>
                        updateEligibility(index, "examinationDate", value)
                      }
                    />

                    <Field
                      label="Place of Examination / Conferment"
                      value={eligibility.examinationPlace ?? ""}
                      onChange={(value) =>
                        updateEligibility(index, "examinationPlace", value)
                      }
                    />

                    <Field
                      label="License Number"
                      value={eligibility.licenseNumber ?? ""}
                      onChange={(value) =>
                        updateEligibility(index, "licenseNumber", value)
                      }
                    />

                    <Field
                      label="License Validity Date"
                      type="date"
                      value={formatDateInput(eligibility.licenseValidityDate)}
                      onChange={(value) =>
                        updateEligibility(index, "licenseValidityDate", value)
                      }
                    />
                  </div>
                </div>
              ))}

              {(!Array.isArray(form.civilServiceEligibility) ||
                form.civilServiceEligibility.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    No civil service eligibility added yet.
                  </p>

                  <button
                    type="button"
                    onClick={addEligibility}
                    className="mt-3 rounded-lg bg-[#0f62fe] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Add First Eligibility
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                V. Work Experience
              </h3>

              <button
                type="button"
                onClick={addWorkExperience}
                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                + Add Work Experience
              </button>
            </div>

            <div className="space-y-4">
              {(Array.isArray(form.workExperience)
                ? form.workExperience
                : []
              ).map((work, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      Work Experience #{index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeWorkExperience(index)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <Field
                      label="From Date"
                      type="date"
                      value={formatDateInput(work.fromDate)}
                      onChange={(value) =>
                        updateWorkExperience(index, "fromDate", value)
                      }
                    />

                    <Field
                      label="To Date"
                      type="date"
                      value={formatDateInput(work.toDate)}
                      onChange={(value) =>
                        updateWorkExperience(index, "toDate", value)
                      }
                    />

                    <Field
                      label="Position Title"
                      value={work.positionTitle ?? ""}
                      onChange={(value) =>
                        updateWorkExperience(index, "positionTitle", value)
                      }
                    />

                    <Field
                      label="Department / Agency / Office"
                      value={work.departmentAgencyOfficeCompany ?? ""}
                      onChange={(value) =>
                        updateWorkExperience(
                          index,
                          "departmentAgencyOfficeCompany",
                          value,
                        )
                      }
                    />

                    <Field
                      label="Monthly Salary"
                      value={work.monthlySalary ?? ""}
                      onChange={(value) =>
                        updateWorkExperience(index, "monthlySalary", value)
                      }
                    />

                    <Field
                      label="Salary Grade / Step"
                      value={work.salaryGradeStep ?? ""}
                      onChange={(value) =>
                        updateWorkExperience(index, "salaryGradeStep", value)
                      }
                    />

                    <Field
                      label="Status of Appointment"
                      value={work.statusOfAppointment ?? ""}
                      onChange={(value) =>
                        updateWorkExperience(
                          index,
                          "statusOfAppointment",
                          value,
                        )
                      }
                      placeholder="Permanent, Casual, Contractual"
                    />

                    <SelectField
                      label="Government Service"
                      value={work.isGovernmentService ? "yes" : "no"}
                      onChange={(value) =>
                        updateWorkExperience(
                          index,
                          "isGovernmentService",
                          value === "yes",
                        )
                      }
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </SelectField>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Duties / Responsibilities
                    </span>

                    <textarea
                      value={work.duties ?? ""}
                      onChange={(event) =>
                        updateWorkExperience(
                          index,
                          "duties",
                          event.target.value,
                        )
                      }
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      placeholder="Describe duties and responsibilities..."
                    />
                  </label>
                </div>
              ))}

              {(!Array.isArray(form.workExperience) ||
                form.workExperience.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    No work experience added yet.
                  </p>

                  <button
                    type="button"
                    onClick={addWorkExperience}
                    className="mt-3 rounded-lg bg-[#0f62fe] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Add First Work Experience
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                VI. Voluntary Work
              </h3>

              <button
                type="button"
                onClick={addVoluntaryWork}
                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                + Add Voluntary Work
              </button>
            </div>

            <div className="space-y-4">
              {(Array.isArray(form.voluntaryWork)
                ? form.voluntaryWork
                : []
              ).map((voluntary, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      Voluntary Work #{index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeVoluntaryWork(index)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Name and Address of Organization"
                      value={voluntary.organizationNameAddress ?? ""}
                      onChange={(value) =>
                        updateVoluntaryWork(
                          index,
                          "organizationNameAddress",
                          value,
                        )
                      }
                      placeholder="Organization name and address"
                    />

                    <Field
                      label="Position / Nature of Work"
                      value={voluntary.positionNatureOfWork ?? ""}
                      onChange={(value) =>
                        updateVoluntaryWork(
                          index,
                          "positionNatureOfWork",
                          value,
                        )
                      }
                      placeholder="Volunteer, coordinator, member, etc."
                    />

                    <Field
                      label="From Date"
                      type="date"
                      value={formatDateInput(voluntary.fromDate)}
                      onChange={(value) =>
                        updateVoluntaryWork(index, "fromDate", value)
                      }
                    />

                    <Field
                      label="To Date"
                      type="date"
                      value={formatDateInput(voluntary.toDate)}
                      onChange={(value) =>
                        updateVoluntaryWork(index, "toDate", value)
                      }
                    />

                    <Field
                      label="Number of Hours"
                      value={voluntary.numberOfHours ?? ""}
                      onChange={(value) =>
                        updateVoluntaryWork(index, "numberOfHours", value)
                      }
                      placeholder="Example: 40"
                    />
                  </div>
                </div>
              ))}

              {(!Array.isArray(form.voluntaryWork) ||
                form.voluntaryWork.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    No voluntary work added yet.
                  </p>

                  <button
                    type="button"
                    onClick={addVoluntaryWork}
                    className="mt-3 rounded-lg bg-[#0f62fe] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Add First Voluntary Work
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                VII. Learning and Development
              </h3>

              <button
                type="button"
                onClick={addTraining}
                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                + Add Training
              </button>
            </div>

            <div className="space-y-4">
              {(Array.isArray(form.learningAndDevelopment)
                ? form.learningAndDevelopment
                : []
              ).map((training, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      Training #{index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeTraining(index)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Field
                      label="Title of Learning and Development"
                      value={training.title ?? ""}
                      onChange={(value) =>
                        updateTraining(index, "title", value)
                      }
                      placeholder="Training / seminar / workshop title"
                    />

                    <Field
                      label="From Date"
                      type="date"
                      value={formatDateInput(training.fromDate)}
                      onChange={(value) =>
                        updateTraining(index, "fromDate", value)
                      }
                    />

                    <Field
                      label="To Date"
                      type="date"
                      value={formatDateInput(training.toDate)}
                      onChange={(value) =>
                        updateTraining(index, "toDate", value)
                      }
                    />

                    <Field
                      label="Number of Hours"
                      value={training.numberOfHours ?? ""}
                      onChange={(value) =>
                        updateTraining(index, "numberOfHours", value)
                      }
                      placeholder="Example: 24"
                    />

                    <Field
                      label="Type of LD"
                      value={training.typeOfLd ?? ""}
                      onChange={(value) =>
                        updateTraining(index, "typeOfLd", value)
                      }
                      placeholder="Managerial, Supervisory, Technical, etc."
                    />

                    <Field
                      label="Conducted / Sponsored By"
                      value={training.conductedBy ?? ""}
                      onChange={(value) =>
                        updateTraining(index, "conductedBy", value)
                      }
                      placeholder="CSC, agency, training provider"
                    />
                  </div>
                </div>
              ))}

              {(!Array.isArray(form.learningAndDevelopment) ||
                form.learningAndDevelopment.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    No learning and development record added yet.
                  </p>

                  <button
                    type="button"
                    onClick={addTraining}
                    className="mt-3 rounded-lg bg-[#0f62fe] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Add First Training
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
              Government Issued ID
            </h3>

            <div className="grid gap-4 md:grid-cols-4">
              <Field
                label="ID Type"
                value={readByPath(form, ["governmentIssuedId", "idType"])}
                onChange={(value) =>
                  update(["governmentIssuedId", "idType"], value)
                }
              />

              <Field
                label="ID Number"
                value={readByPath(form, ["governmentIssuedId", "idNumber"])}
                onChange={(value) =>
                  update(["governmentIssuedId", "idNumber"], value)
                }
              />

              <Field
                label="Date Issued"
                type="date"
                value={formatDateInput(
                  readByPath(form, ["governmentIssuedId", "dateIssued"]),
                )}
                onChange={(value) =>
                  update(["governmentIssuedId", "dateIssued"], value)
                }
              />

              <Field
                label="Place Issued"
                value={readByPath(form, ["governmentIssuedId", "placeIssued"])}
                onChange={(value) =>
                  update(["governmentIssuedId", "placeIssued"], value)
                }
              />
            </div>
          </section>
        </div>

        <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="h-10 rounded-lg bg-[#0f62fe] px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}