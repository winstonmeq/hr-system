import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import { parseResetPasswordInput } from "@/lib/validators/user";
import { UserModel } from "@/models/User";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.usersResetPassword);

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
    const input = parseResetPasswordInput(await request.json());

    await connectToDatabase();

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await UserModel.findByIdAndUpdate(
      id,
      {
        $set: {
          passwordHash,
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
      message: "Password reset successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reset password.";

    return NextResponse.json({ message }, { status: 400 });
  }
}