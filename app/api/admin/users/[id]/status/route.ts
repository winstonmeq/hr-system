import "@/models/Role";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import { parseUserStatusInput } from "@/lib/validators/user";
import { UserModel } from "@/models/User";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteParams) {
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
      { message: "You cannot change the status of your own account." },
      { status: 400 },
    );
  }

  try {
    const input = parseUserStatusInput(await request.json());

    await connectToDatabase();

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

    if (!user) {
      return NextResponse.json(
        { message: "User was not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "User status updated successfully.",
      user,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user status.";

    return NextResponse.json({ message }, { status: 400 });
  }
}