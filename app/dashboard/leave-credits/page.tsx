import { requirePermission } from "@/lib/auth/guards";
import { permissions } from "@/lib/auth/permissions";

import { LeaveCreditsPageClient } from "./leave-credits-page-client";

export const dynamic = "force-dynamic";

export default async function LeaveCreditsPage() {
  await requirePermission(permissions.leaveRead, "/dashboard/leave-credits");

  return <LeaveCreditsPageClient />;
}