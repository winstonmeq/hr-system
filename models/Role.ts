import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

export const roleSlugs = [
  "super-admin",
  "hr-admin",
  "department-head",
  "supervisor",
  "employee",
] as const;

export type RoleSlug = (typeof roleSlugs)[number];

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      enum: roleSlugs,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: true,
      immutable: true,
    },
  },
  {
    collection: "roles",
    timestamps: true,
  },
);

export type Role = InferSchemaType<typeof roleSchema>;
export type RoleDocument = HydratedDocument<Role>;

export const RoleModel =
  (models.Role as Model<Role> | undefined) ?? model<Role>("Role", roleSchema);
