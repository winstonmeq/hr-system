import type { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { AuditLogModel } from "@/models/AuditLog";

type WriteAuditLogInput = {
  actor?: string | Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
};

export async function writeAuditLog(input: WriteAuditLogInput) {
  await connectToDatabase();

  return AuditLogModel.create({
    actor: input.actor,
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId,
    metadata: input.metadata ?? {},
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    success: input.success ?? true,
  });
}
