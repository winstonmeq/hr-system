import "@/models/Role";

import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import {
  getAuditRequestMetadata,
  writeAuditLog,
} from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import { parseResetPasswordInput } from "@/lib/validators/user";
import { UserModel } from "@/models/User";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

function getRoleSlug(user: any) {
  return user?.role && typeof user.role === "object" ? user.role.slug : null;
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.usersResetPassword);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid user ID." }, { status: 400 });
  }

  try {
    const input = parseResetPasswordInput(await request.json());

    await connectToDatabase();

    const existingUser = await UserModel.findById(id)
      .select("email role")
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
        { message: "Only a super admin can reset a super admin password." },
        { status: 403 },
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    await UserModel.findByIdAndUpdate(id, {
      $set: {
        passwordHash,
      },
    });

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "USER_PASSWORD_RESET",
      resource: "user",
      resourceId: id,
      metadata: {
        email: existingUser.email,
      },
      ...requestMeta,
    });

    return NextResponse.json({
      message: "Password reset successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reset password.";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "USER_PASSWORD_RESET_FAILED",
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