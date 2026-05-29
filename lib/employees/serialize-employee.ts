export function serializeEmployee(employee: any) {
  const data = JSON.parse(JSON.stringify(employee));

  return {
    ...data,
    id: employee._id?.toString?.() ?? data._id?.toString?.() ?? "",
    _id: employee._id?.toString?.() ?? data._id?.toString?.() ?? "",
    user: employee.user?.toString?.() ?? data.user ?? undefined,
  };
}