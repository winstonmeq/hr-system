import type { UserStatus } from "./users-page-client";

type UserStatusBadgeProps = {
  status: UserStatus;
};

function statusClasses(status: UserStatus) {
  switch (status) {
    case "active":
      return "border-green-200 bg-green-100 text-green-700";

    case "inactive":
      return "border-slate-200 bg-slate-100 text-slate-700";

    case "suspended":
      return "border-red-200 bg-red-100 text-red-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusClasses(
        status,
      )}`}
    >
      {status}
    </span>
  );
}