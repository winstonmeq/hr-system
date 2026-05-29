import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
  type Types,
} from "mongoose";

export const leaveCreditTransactionTypes = [
  "credit",
  "debit",
  "adjustment",
  "reversal",
  "info",
] as const;

export const leaveCreditSources = [
  "monthly_accrual",
  "leave_application",
  "manual_adjustment",
  "system_reversal",
  "opening_balance",
] as const;

const leaveCreditSummarySchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      unique: true,
      index: true,
    },

    vacationLeaveBalance: {
      type: Number,
      default: 0,
    },

    sickLeaveBalance: {
      type: Number,
      default: 0,
    },

    annualUsageYear: {
      type: Number,
      default: () => new Date().getFullYear(),
      index: true,
    },

    specialPrivilegeLeaveUsed: {
      type: Number,
      default: 0,
    },

    forcedLeaveUsed: {
      type: Number,
      default: 0,
    },

    lastAccrualMonth: {
      type: String,
      trim: true,
    },

    lastTransactionAt: {
      type: Date,
    },
  },
  {
    collection: "leave_credit_summaries",
    timestamps: true,
  },
);

const leaveCreditLedgerSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    leaveApplication: {
      type: Schema.Types.ObjectId,
      ref: "LeaveApplication",
      index: true,
    },

    source: {
      type: String,
      enum: leaveCreditSources,
      required: true,
      index: true,
    },

    transactionType: {
      type: String,
      enum: leaveCreditTransactionTypes,
      required: true,
      index: true,
    },

    leaveType: {
      type: String,
      trim: true,
      index: true,
    },

    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    accrualMonth: {
      type: String,
      trim: true,
      index: true,
    },

    vacationLeaveChange: {
      type: Number,
      default: 0,
    },

    sickLeaveChange: {
      type: Number,
      default: 0,
    },

    specialPrivilegeLeaveChange: {
      type: Number,
      default: 0,
    },

    forcedLeaveChange: {
      type: Number,
      default: 0,
    },

    previousVacationLeaveBalance: {
      type: Number,
      default: 0,
    },

    newVacationLeaveBalance: {
      type: Number,
      default: 0,
    },

    previousSickLeaveBalance: {
      type: Number,
      default: 0,
    },

    newSickLeaveBalance: {
      type: Number,
      default: 0,
    },

    previousSpecialPrivilegeLeaveUsed: {
      type: Number,
      default: 0,
    },

    newSpecialPrivilegeLeaveUsed: {
      type: Number,
      default: 0,
    },

    previousForcedLeaveUsed: {
      type: Number,
      default: 0,
    },

    newForcedLeaveUsed: {
      type: Number,
      default: 0,
    },

    remarks: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  {
    collection: "leave_credit_ledgers",
    timestamps: true,
  },
);

leaveCreditLedgerSchema.index({
  employee: 1,
  transactionDate: -1,
});

leaveCreditLedgerSchema.index(
  {
    employee: 1,
    source: 1,
    accrualMonth: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      source: "monthly_accrual",
    },
  },
);

export type LeaveCreditSummary = InferSchemaType<
  typeof leaveCreditSummarySchema
> & {
  _id: Types.ObjectId;
};

export type LeaveCreditLedger = InferSchemaType<
  typeof leaveCreditLedgerSchema
> & {
  _id: Types.ObjectId;
};

export type LeaveCreditSummaryDocument =
  HydratedDocument<LeaveCreditSummary>;

export type LeaveCreditLedgerDocument =
  HydratedDocument<LeaveCreditLedger>;

export const LeaveCreditSummaryModel =
  (models.LeaveCreditSummary as Model<LeaveCreditSummary> | undefined) ??
  model<LeaveCreditSummary>(
    "LeaveCreditSummary",
    leaveCreditSummarySchema,
  );

export const LeaveCreditLedgerModel =
  (models.LeaveCreditLedger as Model<LeaveCreditLedger> | undefined) ??
  model<LeaveCreditLedger>("LeaveCreditLedger", leaveCreditLedgerSchema);