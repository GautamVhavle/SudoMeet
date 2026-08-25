import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";

import { prisma } from "@/lib/db";
import { getGitHubOAuthEnv } from "@/lib/auth/env";
import { sendVerificationRequest } from "@/features/auth/send-magic-link";

/**
 * Auth.js v5 configuration.
 *
 * Resilience contract (mirrors lib/env.ts): the app builds and boots without
 * OAuth/SMTP credentials. Providers are added only when their env vars exist,
 * so /api/auth/providers always answers — GitHub simply won't be listed until
 * AUTH_GITHUB_ID/AUTH_GITHUB_SECRET are set. AUTH_SECRET is validated lazily
 * via getAuthEnv() inside `secret` (a function), not at module load.
 *
 * Session strategy: database sessions are required by the Prisma adapter for
 * OAuth/email flows. Guest identity (Phase 4+) is a separate transient
 * mechanism and never touches this session store.
 */
export const authConfig = {
  adapter: PrismaAdapter(prisma),
  // Must be a plain string in NextAuthConfig — validated lazily by getAuthEnv()
  // inside the NextAuth() factory call (see lib/auth/server.ts), not at module
  // import time, so builds without AUTH_SECRET still succeed.
  secret: process.env.AUTH_SECRET,

  // Database sessions (JWT would break VerificationToken-based magic links
  // with an adapter attached).
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // refresh once per day of activity
  },

  providers: [
    // Official GitHub provider — included only when credentials exist so
    // /api/auth/providers never crashes on an unconfigured setup.
    ...(getGitHubOAuthEnv() ? [GitHub] : []),

    {
      id: "email-link",
      name: "Email",
      type: "email" as const,
      from: process.env.EMAIL_FROM ?? "SudoMeet <noreply@sudomeet.app>",
      maxAge: 10 * 60, // magic link valid for 10 minutes
      async sendVerificationRequest(message) {
        await sendVerificationRequest(message);
      },
    },
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    /**
     * Propagate the database user id onto the session object so server code
     * can authorize with `session.user.id` without extra queries.
     */
    session({ session, user }) {
      if (user?.id) session.user.id = user.id;
      return session;
    },
  },
} satisfies NextAuthConfig;
