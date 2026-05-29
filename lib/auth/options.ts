import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { connectToDatabase } from "@/lib/db/mongoose";
import { env } from "@/lib/env";
import "@/models/Role";
import { UserModel } from "@/models/User";

type PopulatedRole = {
  name: string;
  slug: string;
};

if (!env.authSecret) {
  throw new Error("Missing required environment variable: AUTH_SECRET");
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        await connectToDatabase();

        const user = await UserModel.findOne({ email, status: "active" })
          .select("+passwordHash")
          .populate("role", "name slug");

        if (!user?.passwordHash) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        const role = user.role as unknown as PopulatedRole;
        const firstName = user.get("name.first") as string;
        const lastName = user.get("name.last") as string;

        return {
          id: user._id.toString(),
          email: user.email,
          name: [firstName, lastName].filter(Boolean).join(" "),
          role: role.slug,
          roleName: role.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.roleName = user.roleName;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? "";
        session.user.role = token.role ?? "";
        session.user.roleName = token.roleName ?? "";
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  logger: {
    error(code, metadata) {
      if (code === "JWT_SESSION_ERROR") {
        return;
      }

      console.error("[next-auth][error]", code, metadata);
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: env.authSecret,
};
