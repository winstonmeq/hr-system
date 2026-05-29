import { notFound } from "next/navigation";

import { connectToDatabase } from "@/lib/db/mongoose";
import { UserModel } from "@/models/User";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditUserPage({
  params,
}: Props) {
  const { id } = await params;

  await connectToDatabase();

  const user = await UserModel.findById(id)
    .populate("role")
    .lean();

  if (!user) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">
        Edit User
      </h1>

      <form className="space-y-4">
        <input
          defaultValue={user.name?.first}
          className="w-full rounded border p-3"
        />

        <input
          defaultValue={user.name?.middle ?? undefined}
          className="w-full rounded border p-3"
        />

        <input
          defaultValue={user.name?.last}
          className="w-full rounded border p-3"
        />

        <input
          defaultValue={user.email}
          disabled
          className="w-full rounded border p-3"
        />

        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}