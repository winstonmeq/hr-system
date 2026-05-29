import "@/models/Role";

import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongoose";
import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import { parseCreateUserInput } from "@/lib/validators/user";
import { RoleModel } from "@/models/Role";
import { UserModel } from "@/models/User";

export async function GET() {
  const auth = await requireApiPermission(permissions.usersRead);

  if (!auth.ok) {
    return auth.response;
  }

  await connectToDatabase();

  const users = await UserModel.find({})
    .select("-passwordHash")
    .populate("role", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    users,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiPermission(permissions.usersCreate);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const input = parseCreateUserInput(await request.json());

    await connectToDatabase();

    const role = await RoleModel.findById(input.roleId).lean();

    if (!role) {
      return NextResponse.json(
        { message: "Selected role was not found." },
        { status: 400 },
      );
    }

    const existingUser = await UserModel.exists({
      email: input.email,
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email is already used by another user." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const createdUser = await UserModel.create({
      email: input.email,
      name: input.name,
      passwordHash,
      role: role._id,
      status: input.status,
      governmentId: input.governmentId,
      department: input.department,
      position: input.position,
    });

    const user = await UserModel.findById(createdUser._id)
      .select("-passwordHash")
      .populate("role", "name slug")
      .lean();

    return NextResponse.json(
      {
        message: "User created successfully.",
        user,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create user.";

    return NextResponse.json({ message }, { status: 400 });
  }
}