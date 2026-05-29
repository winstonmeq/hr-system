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
import { serializeUser } from "@/lib/users/serialize-user";
import {
  parseCreateUserInput,
  userStatuses,
} from "@/lib/validators/user";
import { RoleModel } from "@/models/Role";
import { UserModel } from "@/models/User";

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

export async function GET(request: NextRequest) {
  const auth = await requireApiPermission(permissions.usersRead);

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
  const roleId = searchParams.get("roleId")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";

  const filter: Record<string, unknown> = {};

  if (status && status !== "all" && userStatuses.includes(status as any)) {
    filter.status = status;
  }

  if (roleId && roleId !== "all" && Types.ObjectId.isValid(roleId)) {
    filter.role = roleId;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");

    filter.$or = [
      { email: regex },
      { "name.first": regex },
      { "name.middle": regex },
      { "name.last": regex },
      { governmentId: regex },
      { department: regex },
      { position: regex },
    ];
  }

  await connectToDatabase();

  const skip = (page - 1) * limit;

  const [usersFromDb, total] = await Promise.all([
    UserModel.find(filter)
      .select("-passwordHash")
      .populate("role", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(filter),
  ]);

  const users = usersFromDb.map(serializeUser);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    users,
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
  const auth = await requireApiPermission(permissions.usersCreate);

  if (!auth.ok) {
    return auth.response;
  }

  const requestMeta = getAuditRequestMetadata(request);

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

    const userFromDb = await UserModel.findById(createdUser._id)
      .select("-passwordHash")
      .populate("role", "name slug")
      .lean();

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "USER_CREATED",
      resource: "user",
      resourceId: createdUser._id.toString(),
      metadata: {
        email: input.email,
        roleId: input.roleId,
        status: input.status,
      },
      ...requestMeta,
    });

    return NextResponse.json(
      {
        message: "User created successfully.",
        user: serializeUser(userFromDb),
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create user.";

    await writeAuditLog({
      actor: auth.session.user.id,
      action: "USER_CREATE_FAILED",
      resource: "user",
      metadata: {
        error: message,
      },
      success: false,
      ...requestMeta,
    });

    return NextResponse.json({ message }, { status: 400 });
  }
}