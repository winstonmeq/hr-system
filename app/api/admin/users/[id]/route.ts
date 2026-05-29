import "@/models/Role";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import {
  getAuditRequestMetadata,
  writeAuditLog,
} from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import { serializeUser } from "@/lib/users/serialize-user";
import { parseUpdateUserInput } from "@/lib/validators/user";
import { RoleModel } from "@/models/Role";
import { UserModel } from "@/models/User";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

function invalidUserIdResponse() {
  return NextResponse.json({ message: "Invalid user ID." }, { status: 400 });
}

function getRoleSlug(user: any) {
  return user?.role && typeof user.role === "object" ? user.role.slug : null;
}

export async function GET(_request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.usersRead);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return invalidUserIdResponse();
  }

  await connectToDatabase();

  const user = await UserModel.findById(id)
    .select("-passwordHash")
    .populate("role", "name slug")
    .lean();

  if (!user) {
    return NextResponse.json(
      { message: "User was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    user: serializeUser(user),
  });
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.usersUpdate);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return invalidUserIdResponse();
  }

  try {
    const input = parseUpdateUserInput(await request.json());

    await connectToDatabase();

    const existingUser = await UserModel.findById(id)
      .select("-passwordHash")
      .populate("role", "name slug")
      .lean();

    if (!existingUser) {
      return NextResponse.json(
        { message: "User was not found." },
        { status: 404 },
      );
    }

    const targetRoleSlug = getRoleSlug(existingUser);

    if (
      targetRoleSlug === "super-admin" &&
      auth.session.user.role !== "super-admin"
    ) {
      return NextResponse.json(
        { message: "Only a super admin can update a super admin account." },
        { status: 403 },
      );
    }

    const role = await RoleModel.findById(input.roleId).lean();

    if (!role) {
      return NextResponse.json(
        { message: "Selected role was not found." },
        { status: 400 },
      );
    }

    const duplicateEmail = await UserModel.exists({
      _id: { $ne: id },
      email: input.email,
    });

    if (duplicateEmail) {
      return NextResponse.json(
        { message: "Email is already used by another user." },
        { status: 409 },
      );
    }

    const user = await UserModel.findByIdAndUpdate(
      id,
      {
        $set: {
          email: input.email,
          name: input.name,
          role: role._id,
          governmentId: input.governmentId,
          department: input.department,
          position: input.position,
        },
      },
      { new: true },
    )
      .select("-passwordHash")
      .populate("role", "name slug")
      .lean();

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "USER_UPDATED",
      resource: "user",
      resourceId: id,
      metadata: {
        email: input.email,
        roleId: input.roleId,
      },
      ...requestMeta,
    });

    return NextResponse.json({
      message: "User updated successfully.",
      user: serializeUser(user),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user.";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "USER_UPDATE_FAILED",
      resource: "user",
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

export async function DELETE(_request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.usersManageStatus);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(_request);
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return invalidUserIdResponse();
  }

  if (auth.session.user.id === id) {
    return NextResponse.json(
      { message: "You cannot deactivate your own account." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const existingUser = await UserModel.findById(id)
    .select("-passwordHash")
    .populate("role", "name slug")
    .lean();

  if (!existingUser) {
    return NextResponse.json(
      { message: "User was not found." },
      { status: 404 },
    );
  }

  const targetRoleSlug = getRoleSlug(existingUser);

  if (
    targetRoleSlug === "super-admin" &&
    auth.session.user.role !== "super-admin"
  ) {
    return NextResponse.json(
      { message: "Only a super admin can deactivate a super admin account." },
      { status: 403 },
    );
  }

  const user = await UserModel.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "inactive",
      },
    },
    { new: true },
  )
    .select("-passwordHash")
    .populate("role", "name slug")
    .lean();

  await writeAuditLog({
    actor: auth.session.user.id,
    action: "USER_DEACTIVATED",
    resource: "user",
    resourceId: id,
    metadata: {
      previousStatus: existingUser.status,
      newStatus: "inactive",
    },
    ...requestMeta,
  });

  return NextResponse.json({
    message: "User deactivated successfully.",
    user: serializeUser(user),
  });
}