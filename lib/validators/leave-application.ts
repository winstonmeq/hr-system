import {
  leaveApplicationStatuses,
  leaveTypes,
  type LeaveApplicationStatus,
  type LeaveType,
} from "@/models/LeaveApplication";

type InputRecord = Record<string, unknown>;

function isRecord(value: unknown): value is InputRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown) {
  return value === true || value === "true" || value === "yes";
}

function readDate(value: unknown) {
  const valueString = readString(value);

  if (!valueString) {
    return undefined;
  }

  const date = new Date(valueString);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function readLeaveType(value: unknown): LeaveType {
  const leaveType = readString(value);

  if (!leaveTypes.includes(leaveType as LeaveType)) {
    throw new Error("Invalid leave type.");
  }

  return leaveType as LeaveType;
}

function readStatus(value: unknown): LeaveApplicationStatus {
  const status = readString(value);

  if (leaveApplicationStatuses.includes(status as LeaveApplicationStatus)) {
    return status as LeaveApplicationStatus;
  }

  return "submitted";
}

function readLeaveDetails(value: unknown) {
  const details = isRecord(value) ? value : {};

  const vacation = isRecord(details.vacation) ? details.vacation : {};
  const sick = isRecord(details.sick) ? details.sick : {};
  const women = isRecord(details.specialLeaveBenefitsWomen)
    ? details.specialLeaveBenefitsWomen
    : {};
  const study = isRecord(details.study) ? details.study : {};
  const otherPurpose = isRecord(details.otherPurpose)
    ? details.otherPurpose
    : {};

  return {
    vacation: {
      withinPhilippines: readBoolean(vacation.withinPhilippines),
      abroad: readBoolean(vacation.abroad),
      abroadSpecify: readString(vacation.abroadSpecify),
    },

    sick: {
      inHospital: readBoolean(sick.inHospital),
      outPatient: readBoolean(sick.outPatient),
      illnessSpecify: readString(sick.illnessSpecify),
    },

    specialLeaveBenefitsWomen: {
      illnessSpecify: readString(women.illnessSpecify),
    },

    study: {
      completionMastersDegree: readBoolean(study.completionMastersDegree),
      barBoardExaminationReview: readBoolean(
        study.barBoardExaminationReview,
      ),
    },

    otherPurpose: {
      monetizationOfLeaveCredits: readBoolean(
        otherPurpose.monetizationOfLeaveCredits,
      ),
      terminalLeave: readBoolean(otherPurpose.terminalLeave),
      details: readString(otherPurpose.details),
    },
  };
}

function readCommutation(value: unknown) {
  const commutation = isRecord(value) ? value : {};

  const requested = readBoolean(commutation.requested);
  const notRequested = readBoolean(commutation.notRequested);

  return {
    requested,
    notRequested: requested ? false : notRequested || true,
  };
}

export function parseLeaveApplicationInput(input: unknown) {
  if (!isRecord(input)) {
    throw new Error("Invalid request body.");
  }

  const employeeId = readString(input.employeeId || input.employee);

  if (!employeeId) {
    throw new Error("Employee is required.");
  }

  const dateOfFiling = readDate(input.dateOfFiling);

  if (!dateOfFiling) {
    throw new Error("Date of filing is required.");
  }

  return {
    employeeId,
    dateOfFiling,
    leaveType: readLeaveType(input.leaveType),
    otherLeaveType: readString(input.otherLeaveType),
    leaveDetails: readLeaveDetails(input.leaveDetails),
    numberOfWorkingDays: readString(input.numberOfWorkingDays),
    inclusiveDates: readString(input.inclusiveDates),
    commutation: readCommutation(input.commutation),
    status: readStatus(input.status),
    remarks: readString(input.remarks),

    employeeSnapshot: isRecord(input.employeeSnapshot)
      ? {
          employeeNumber: readString(input.employeeSnapshot.employeeNumber),
          lastName: readString(input.employeeSnapshot.lastName),
          firstName: readString(input.employeeSnapshot.firstName),
          middleName: readString(input.employeeSnapshot.middleName),
          officeDepartment: readString(
            input.employeeSnapshot.officeDepartment,
          ),
          position: readString(input.employeeSnapshot.position),
          salary: readString(input.employeeSnapshot.salary),
        }
      : undefined,
  };
}