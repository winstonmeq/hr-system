import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
  type Types,
} from "mongoose";

export const leaveApplicationStatuses = [
  "draft",
  "submitted",
  "recommended",
  "approved",
  "disapproved",
  "cancelled",
] as const;

export type LeaveApplicationStatus =
  (typeof leaveApplicationStatuses)[number];

export const leaveTypes = [
  "vacation",
  "mandatoryForced",
  "sick",
  "maternity",
  "paternity",
  "specialPrivilege",
  "soloParent",
  "study",
  "tenDayVawc",
  "rehabilitation",
  "specialLeaveBenefitsWomen",
  "specialEmergency",
  "adoption",
  "others",
] as const;

export type LeaveType = (typeof leaveTypes)[number];

const leaveApplicationSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    employeeSnapshot: {
      employeeNumber: { type: String, trim: true },
      lastName: { type: String, trim: true },
      firstName: { type: String, trim: true },
      middleName: { type: String, trim: true },
      officeDepartment: { type: String, trim: true },
      position: { type: String, trim: true },
      salary: { type: String, trim: true },
    },

    dateOfFiling: {
      type: Date,
      required: true,
      index: true,
    },

    leaveType: {
      type: String,
      enum: leaveTypes,
      required: true,
      index: true,
    },

    otherLeaveType: {
      type: String,
      trim: true,
    },

    leaveDetails: {
      vacation: {
        withinPhilippines: { type: Boolean, default: false },
        abroad: { type: Boolean, default: false },
        abroadSpecify: { type: String, trim: true },
      },

      sick: {
        inHospital: { type: Boolean, default: false },
        outPatient: { type: Boolean, default: false },
        illnessSpecify: { type: String, trim: true },
      },

      specialLeaveBenefitsWomen: {
        illnessSpecify: { type: String, trim: true },
      },

      study: {
        completionMastersDegree: { type: Boolean, default: false },
        barBoardExaminationReview: { type: Boolean, default: false },
      },

      otherPurpose: {
        monetizationOfLeaveCredits: { type: Boolean, default: false },
        terminalLeave: { type: Boolean, default: false },
        details: { type: String, trim: true },
      },
    },

    numberOfWorkingDays: {
      type: String,
      trim: true,
    },

    inclusiveDates: {
      type: String,
      trim: true,
    },

    commutation: {
      requested: { type: Boolean, default: false },
      notRequested: { type: Boolean, default: true },
    },

    status: {
      type: String,
      enum: leaveApplicationStatuses,
      default: "submitted",
      index: true,
    },

    certification: {
      vacationLeave: {
        totalEarned: { type: String, trim: true },
        lessThisApplication: { type: String, trim: true },
        balance: { type: String, trim: true },
      },
      sickLeave: {
        totalEarned: { type: String, trim: true },
        lessThisApplication: { type: String, trim: true },
        balance: { type: String, trim: true },
      },
      hrOfficerName: { type: String, trim: true },
    },

    recommendation: {
      forApproval: { type: Boolean, default: false },
      forDisapproval: { type: Boolean, default: false },
      disapprovalReason: { type: String, trim: true },
      authorizedOfficerName: { type: String, trim: true },
    },

    action: {
      approvedDaysWithPay: { type: String, trim: true },
      approvedDaysWithoutPay: { type: String, trim: true },
      approvedOthers: { type: String, trim: true },
      disapprovedDueTo: { type: String, trim: true },
      finalApproverName: { type: String, trim: true },
    },

    creditPosting: {
      posted: { type: Boolean, default: false },
      postedAt: { type: Date },
      ledgerIds: [{ type: Schema.Types.ObjectId, ref: "LeaveCreditLedger" }],
      error: { type: String, trim: true },
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    collection: "leave_applications",
    timestamps: true,
  },
);

leaveApplicationSchema.index({
  status: 1,
  dateOfFiling: -1,
});

leaveApplicationSchema.index({
  "employeeSnapshot.lastName": 1,
  "employeeSnapshot.firstName": 1,
});

export type LeaveApplication = InferSchemaType<
  typeof leaveApplicationSchema
> & {
  _id: Types.ObjectId;
};

export type LeaveApplicationDocument =
  HydratedDocument<LeaveApplication>;

export const LeaveApplicationModel =
  (models.LeaveApplication as Model<LeaveApplication> | undefined) ??
  model<LeaveApplication>("LeaveApplication", leaveApplicationSchema);