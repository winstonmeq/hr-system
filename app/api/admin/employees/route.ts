import "@/models/Employee";

import { NextRequest, NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import {
  getAuditRequestMetadata,
  writeAuditLog,
} from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import { serializeEmployee } from "@/lib/employees/serialize-employee";
import { parseEmployeeInput } from "@/lib/validators/employee";
import { EmployeeModel, employeeStatuses } from "@/models/Employee";

type LooseEmployeeObject = {
  _id?: {
    toString?: () => string;
  };
  employeeNumber?: string;
  personalInfo?: {
    name?: {
      firstName?: string;
      surname?: string;
    };
  };
  [key: string]: unknown;
};

type LooseEmployeeDocument = {
  toObject: () => LooseEmployeeObject;
};

function readPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toStringId(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }

  return String(value);
}

function isValidEmployeeStatus(status: string) {
  return employeeStatuses.includes(
    status as (typeof employeeStatuses)[number],
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireApiPermission(permissions.employeesRead);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);

  const page = readPositiveInteger(searchParams.get("page"), 1);
  const limit = Math.min(
    readPositiveInteger(searchParams.get("limit"), 20),
    100,
  );

  const search = searchParams.get("search")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";

  const filter: Record<string, unknown> = {};

  if (status && status !== "all" && isValidEmployeeStatus(status)) {
    filter.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");

    filter.$or = [
      { employeeNumber: regex },
      { "personalInfo.name.surname": regex },
      { "personalInfo.name.firstName": regex },
      { "personalInfo.name.middleName": regex },
      { "personalInfo.contact.emailAddress": regex },
      { "personalInfo.contact.mobileNumber": regex },
      { "personalInfo.ids.agencyEmployeeNumber": regex },
      { "workExperience.positionTitle": regex },
      { "workExperience.departmentAgencyOfficeCompany": regex },
    ];
  }

  await connectToDatabase();

  const skip = (page - 1) * limit;

  const [employeesFromDb, total] = await Promise.all([
    EmployeeModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    EmployeeModel.countDocuments(filter),
  ]);

  const employees = employeesFromDb.map((employee) =>
    serializeEmployee(employee),
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    employees,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiPermission(permissions.employeesCreate);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);

  try {
    const input = parseEmployeeInput(await request.json());

    await connectToDatabase();

    const existingEmployee = await EmployeeModel.exists({
      employeeNumber: input.employeeNumber,
    });

    if (existingEmployee) {
      return NextResponse.json(
        { message: "Employee number is already used." },
        { status: 409 },
      );
    }

    const createdEmployeeDocument = (await EmployeeModel.create(
      input as Parameters<typeof EmployeeModel.create>[0],
    )) as unknown as LooseEmployeeDocument;

    const createdEmployeeObject = createdEmployeeDocument.toObject();

    const employeeId = toStringId(createdEmployeeObject._id);
    const employeeNumber = createdEmployeeObject.employeeNumber ?? "";
    const firstName =
      createdEmployeeObject.personalInfo?.name?.firstName ?? "";
    const surname = createdEmployeeObject.personalInfo?.name?.surname ?? "";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "EMPLOYEE_CREATED",
      resource: "employee",
      resourceId: employeeId,
      metadata: {
        employeeNumber,
        fullName: `${firstName} ${surname}`.trim(),
      },
      ...requestMeta,
    });

    return NextResponse.json(
      {
        message: "Employee created successfully.",
        employee: serializeEmployee(createdEmployeeObject),
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create employee.";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "EMPLOYEE_CREATE_FAILED",
      resource: "employee",
      metadata: {
        error: message,
      },
      success: false,
      ...requestMeta,
    });

    return NextResponse.json({ message }, { status: 400 });
  }
}