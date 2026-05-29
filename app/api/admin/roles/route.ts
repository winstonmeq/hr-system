import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongoose";
import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import { RoleModel } from "@/models/Role";

export async function GET() {
  const auth = await requireApiPermission(permissions.usersRead);

  if (!auth.ok) {
    return auth.response;
  }

  await connectToDatabase();

  const roles = await RoleModel.find({})
    .select("name slug description permissions")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({
    roles,
  });
}