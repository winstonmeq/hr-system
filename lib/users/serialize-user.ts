export type SerializedUserStatus = "active" | "inactive" | "suspended";

export type SerializedUserRole = {
  id: string;
  _id: string;
  name: string;
  slug: string;
};

export type SerializedUser = {
  id: string;
  _id: string;
  email: string;
  name: {
    first: string;
    middle?: string;
    last: string;
  };
  role: SerializedUserRole | null;
  status: SerializedUserStatus;
  governmentId?: string;
  department?: string;
  position?: string;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function toDateString(value: unknown) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toStringId(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }

  return String(value);
}

export function serializeUser(user: any): SerializedUser {
  const role =
    user.role && typeof user.role === "object" && "name" in user.role
      ? {
          id: toStringId(user.role._id),
          _id: toStringId(user.role._id),
          name: user.role.name ?? "-",
          slug: user.role.slug ?? "-",
        }
      : null;

  return {
    id: toStringId(user._id),
    _id: toStringId(user._id),
    email: user.email,
    name: {
      first: user.name?.first ?? "",
      middle: user.name?.middle ?? "",
      last: user.name?.last ?? "",
    },
    role,
    status: user.status,
    governmentId: user.governmentId ?? "",
    department: user.department ?? "",
    position: user.position ?? "",
    lastLoginAt: toDateString(user.lastLoginAt),
    createdAt: toDateString(user.createdAt),
    updatedAt: toDateString(user.updatedAt),
  };
}