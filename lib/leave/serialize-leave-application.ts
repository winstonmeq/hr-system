export function serializeLeaveApplication(leave: any) {
  const data = JSON.parse(JSON.stringify(leave));

  return {
    ...data,
    id: leave._id?.toString?.() ?? data._id?.toString?.() ?? "",
    _id: leave._id?.toString?.() ?? data._id?.toString?.() ?? "",
    employee:
      leave.employee?._id?.toString?.() ??
      leave.employee?.toString?.() ??
      data.employee ??
      "",
  };
}