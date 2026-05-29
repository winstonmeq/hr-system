import "@/models/Role";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import { parseUpdateUserInput } from "@/lib/validators/user";
import { RoleModel } from "@/models/Role";
import { UserModel } from "@/models/User";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.usersRead);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: "Invalid user ID." },
      { status: 400 },
    );
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
    user,
  });
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.usersUpdate);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: "Invalid user ID." },
      { status: 400 },
    );
  }

  try {
    const input = parseUpdateUserInput(await request.json());

    await connectToDatabase();

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

    if (!user) {
      return NextResponse.json(
        { message: "User was not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "User updated successfully.",
      user,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user.";

    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.usersManageStatus);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: "Invalid user ID." },
      { status: 400 },
    );
  }

  if (auth.session.user.id === id) {
    return NextResponse.json(
      { message: "You cannot deactivate your own account." },
      { status: 400 },
    );
  }

  await connectToDatabase();

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

  if (!user) {
    return NextResponse.json(
      { message: "User was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    message: "User deactivated successfully.",
    user,
  });
}