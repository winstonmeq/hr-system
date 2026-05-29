import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

const auditLogSchema = new Schema(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resourceId: {
      type: String,
      trim: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    success: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    collection: "audit_logs",
    timestamps: true,
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema>;
export type AuditLogDocument = HydratedDocument<AuditLog>;

export const AuditLogModel =
  (models.AuditLog as Model<AuditLog> | undefined) ??
  model<AuditLog>("AuditLog", auditLogSchema);
