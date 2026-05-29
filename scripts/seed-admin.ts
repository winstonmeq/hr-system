import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function seedAdmin() {
  const [{ connectToDatabase }, { RoleModel }, { UserModel }] =
    await Promise.all([
      import("@/lib/db/mongoose"),
      import("@/models/Role"),
      import("@/models/User"),
    ]);

  const email = getRequiredEnv("SEED_ADMIN_EMAIL").toLowerCase().trim();
  const password = getRequiredEnv("SEED_ADMIN_PASSWORD");
  const firstName = getRequiredEnv("SEED_ADMIN_FIRST_NAME").trim();
  const lastName = getRequiredEnv("SEED_ADMIN_LAST_NAME").trim();

  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  }

  await connectToDatabase();

  const superAdminRole = await RoleModel.findOne({ slug: "super-admin" });

  if (!superAdminRole) {
    throw new Error(
      'Missing "super-admin" role. Run "npm run db:seed:roles" first.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await UserModel.updateOne(
    { email },
    {
      $set: {
        email,
        name: {
          first: firstName,
          last: lastName,
        },
        passwordHash,
        role: superAdminRole._id,
        status: "active",
      },
      $setOnInsert: {
        governmentId: "SYSTEM-ADMIN",
        department: "System Administration",
        position: "Super Admin",
      },
    },
    { upsert: true },
  );

  const action = result.upsertedCount > 0 ? "created" : "updated";

  console.log(`Super Admin user ${action}: ${email}`);
}

seedAdmin()
  .catch((error) => {
    console.error("Failed to seed Super Admin user.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
