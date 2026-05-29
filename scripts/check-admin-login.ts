import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

async function checkAdminLogin() {
  const [{ connectToDatabase }, , { UserModel }] = await Promise.all([
    import("@/lib/db/mongoose"),
    import("@/models/Role"),
    import("@/models/User"),
  ]);

  await connectToDatabase();

  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const user = email
    ? await UserModel.findOne({ email })
        .select("+passwordHash")
        .populate("role", "name slug")
    : null;

  const role = user?.role as
    | {
        name?: string;
        slug?: string;
      }
    | undefined;

  console.log(
    JSON.stringify(
      {
        envEmailPresent: Boolean(email),
        envPasswordPresent: Boolean(password),
        userFound: Boolean(user),
        userEmail: user?.email,
        status: user?.status,
        hasPasswordHash: Boolean(user?.passwordHash),
        passwordMatchesEnv:
          Boolean(user?.passwordHash) && Boolean(password)
            ? await bcrypt.compare(password!, user!.passwordHash!)
            : false,
        roleSlug: role?.slug,
        roleName: role?.name,
      },
      null,
      2,
    ),
  );
}

checkAdminLogin()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
