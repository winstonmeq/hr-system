import "@/models/Employee";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import {
  getAuditRequestMetadata,
  writeAuditLog,
} from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import { serializeEmployee } from "@/lib/employees/serialize-employee";
import { parseEmployeeInput } from "@/lib/validators/employee";
import { EmployeeModel } from "@/models/Employee";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

function invalidEmployeeIdResponse() {
  return NextResponse.json(
    { message: "Invalid employee ID." },
    { status: 400 },
  );
}

export async function GET(_request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.employeesRead);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return invalidEmployeeIdResponse();
  }

  await connectToDatabase();

  const employee = await EmployeeModel.findById(id).lean();

  if (!employee) {
    return NextResponse.json(
      { message: "Employee was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    employee: serializeEmployee(employee),
  });
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.employeesUpdate);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return invalidEmployeeIdResponse();
  }

  try {
    const input = parseEmployeeInput(await request.json());

    await connectToDatabase();

    const existingEmployee = await EmployeeModel.findById(id).lean();

    if (!existingEmployee) {
      return NextResponse.json(
        { message: "Employee was not found." },
        { status: 404 },
      );
    }

    const duplicateEmployeeNumber = await EmployeeModel.exists({
      _id: { $ne: id },
      employeeNumber: input.employeeNumber,
    });

    if (duplicateEmployeeNumber) {
      return NextResponse.json(
        { message: "Employee number is already used." },
        { status: 409 },
      );
    }

    const employee = await EmployeeModel.findByIdAndUpdate(
      id,
      {
        $set: input,
      },
      { new: true },
    ).lean();

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "EMPLOYEE_UPDATED",
      resource: "employee",
      resourceId: id,
      metadata: {
        employeeNumber: input.employeeNumber,
      },
      ...requestMeta,
    });

    return NextResponse.json({
      message: "Employee updated successfully.",
      employee: serializeEmployee(employee),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update employee.";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "EMPLOYEE_UPDATE_FAILED",
      resource: "employee",
      resourceId: id,
      metadata: {
        error: message,
      },
      success: false,
      ...requestMeta,
    });

    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.employeesUpdate);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return invalidEmployeeIdResponse();
  }

  await connectToDatabase();

  const existingEmployee = await EmployeeModel.findById(id).lean();

  if (!existingEmployee) {
    return NextResponse.json(
      { message: "Employee was not found." },
      { status: 404 },
    );
  }

  const employee = await EmployeeModel.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "inactive",
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actor: auth.session.user.id,
    action: "EMPLOYEE_DEACTIVATED",
    resource: "employee",
    resourceId: id,
    metadata: {
      employeeNumber: existingEmployee.employeeNumber,
      previousStatus: existingEmployee.status,
      newStatus: "inactive",
    },
    ...requestMeta,
  });

  return NextResponse.json({
    message: "Employee deactivated successfully.",
    employee: serializeEmployee(employee),
  });
}