import { Types } from "mongoose";

export const userStatuses = ["active", "inactive", "suspended"] as const;

export type UserStatus = (typeof userStatuses)[number];

type InputRecord = Record<string, unknown>;

function isRecord(value: unknown): value is InputRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | undefined {
  const result = readString(value);
  return result.length > 0 ? result : undefined;
}

function readStatus(value: unknown): UserStatus {
  const status = readString(value);

  if (userStatuses.includes(status as UserStatus)) {
    return status as UserStatus;
  }

  return "active";
}

export function parseCreateUserInput(input: unknown) {
  if (!isRecord(input)) {
    throw new Error("Invalid request body.");
  }

  const name = isRecord(input.name) ? input.name : {};

  const first = readString(input.firstName ?? name.first);
  const middle = readOptionalString(input.middleName ?? name.middle);
  const last = readString(input.lastName ?? name.last);

  const email = readString(input.email).toLowerCase();
  const password = readString(input.password);
  const roleId = readString(input.roleId ?? input.role);

  if (!first) throw new Error("First name is required.");
  if (!last) throw new Error("Last name is required.");
  if (!email) throw new Error("Email is required.");
  if (!email.includes("@")) throw new Error("Invalid email address.");
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!Types.ObjectId.isValid(roleId)) {
    throw new Error("Valid role is required.");
  }

  return {
    email,
    password,
    roleId,
    status: readStatus(input.status),
    name: {
      first,
      middle,
      last,
    },
    governmentId: readOptionalString(input.governmentId),
    department: readOptionalString(input.department),
    position: readOptionalString(input.position),
  };
}

export function parseUpdateUserInput(input: unknown) {
  if (!isRecord(input)) {
    throw new Error("Invalid request body.");
  }

  const name = isRecord(input.name) ? input.name : {};

  const first = readString(input.firstName ?? name.first);
  const middle = readOptionalString(input.middleName ?? name.middle);
  const last = readString(input.lastName ?? name.last);

  const email = readString(input.email).toLowerCase();
  const roleId = readString(input.roleId ?? input.role);

  if (!first) throw new Error("First name is required.");
  if (!last) throw new Error("Last name is required.");
  if (!email) throw new Error("Email is required.");
  if (!email.includes("@")) throw new Error("Invalid email address.");
  if (!Types.ObjectId.isValid(roleId)) {
    throw new Error("Valid role is required.");
  }

  return {
    email,
    roleId,
    name: {
      first,
      middle,
      last,
    },
    governmentId: readOptionalString(input.governmentId),
    department: readOptionalString(input.department),
    position: readOptionalString(input.position),
  };
}

export function parseUserStatusInput(input: unknown) {
  if (!isRecord(input)) {
    throw new Error("Invalid request body.");
  }

  const status = readString(input.status);

  if (!userStatuses.includes(status as UserStatus)) {
    throw new Error("Invalid user status.");
  }

  return {
    status: status as UserStatus,
  };
}

export function parseResetPasswordInput(input: unknown) {
  if (!isRecord(input)) {
    throw new Error("Invalid request body.");
  }

  const password = readString(input.password);

  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  return {
    password,
  };
}