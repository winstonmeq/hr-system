import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
  type Types,
} from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    name: {
      first: {
        type: String,
        required: true,
        trim: true,
      },
      middle: {
        type: String,
        trim: true,
      },
      last: {
        type: String,
        required: true,
        trim: true,
      },
    },
    passwordHash: {
      type: String,
      select: false,
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },
    governmentId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    collection: "users",
    timestamps: true,
  },
);

userSchema.index({ role: 1, status: 1 });

export type User = InferSchemaType<typeof userSchema> & {
  role: Types.ObjectId;
};

export type UserDocument = HydratedDocument<User>;

export const UserModel =
  (models.User as Model<User> | undefined) ?? model<User>("User", userSchema);
