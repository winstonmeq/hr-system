import type { NextRequest } from "next/server";
import type { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { AuditLogModel } from "@/models/AuditLog";

type AuditMetadata = Record<string, unknown>;

type WriteAuditLogInput = {
  actor?: string | Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
};

export function getAuditRequestMetadata(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || undefined;

  const userAgent = request.headers.get("user-agent") ?? undefined;

  return {
    ipAddress,
    userAgent,
  };
}

export async function writeAuditLog(input: WriteAuditLogInput) {
  try {
    await connectToDatabase();

    return await AuditLogModel.create({
      actor: input.actor,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      success: input.success ?? true,
    });
  } catch (error) {
    console.error("[audit-log] Failed to write audit log:", error);
    return null;
  }
}