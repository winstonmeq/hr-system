import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";

import "@/models/Employee";

import { requirePermission } from "@/lib/auth/guards";
import { permissions } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongoose";
import { EmployeeModel } from "@/models/Employee";

export const dynamic = "force-dynamic";

type PrintPdsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatEmployeeName(employee: any) {
  const name = employee.personalInfo?.name ?? {};

  return [
    name.surname ? `${name.surname},` : "",
    name.firstName,
    name.middleName,
    name.nameExtension,
  ]
    .filter(Boolean)
    .join(" ");
}

export default async function PrintPdsPage({ params }: PrintPdsPageProps) {
  await requirePermission(permissions.employeesRead, "/dashboard/employees");

  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  await connectToDatabase();

  const employee = await EmployeeModel.findById(id).lean();

  if (!employee) {
    notFound();
  }

  const employeeName = formatEmployeeName(employee);
  const pdfUrl = `/api/admin/employees/${id}/pds-pdf`;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
              Printable PDS
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              {employeeName || "Employee PDS"}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Employee No: {(employee as any).employeeNumber}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/employees"
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </Link>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-lg border border-blue-200 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Open PDF
            </a>

            <a
              href={pdfUrl}
              download
              className="inline-flex h-10 items-center rounded-lg bg-[#0f62fe] px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Download PDF
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <iframe
            title="Employee PDS PDF"
            src={pdfUrl}
            className="h-[calc(100vh-170px)] w-full"
          />
        </div>
      </div>
    </div>
  );
}