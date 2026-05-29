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
import { parseUserStatusInput } from "@/lib/validators/user";
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
  const auth = await requireApiPermission(permissions.usersManageStatus);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid user ID." }, { status: 400 });
  }

  if (auth.session.user.id === id) {
    return NextResponse.json(
      { message: "You cannot change the status of your own account." },
      { status: 400 },
    );
  }

  try {
    const input = parseUserStatusInput(await request.json());

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
        {
          message: "Only a super admin can change a super admin account status.",
        },
        { status: 403 },
      );
    }

    const user = await UserModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: input.status,
        },
      },
      { new: true },
    )
      .select("-passwordHash")
      .populate("role", "name slug")
      .lean();

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "USER_STATUS_UPDATED",
      resource: "user",
      resourceId: id,
      metadata: {
        previousStatus: existingUser.status,
        newStatus: input.status,
      },
      ...requestMeta,
    });

    return NextResponse.json({
      message: "User status updated successfully.",
      user: serializeUser(user),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user status.";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "USER_STATUS_UPDATE_FAILED",
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