import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      roleName: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    roleName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    roleName?: string;
  }
}
