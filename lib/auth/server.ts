import "server-only";

import NextAuth from "next-auth";

import { authConfig } from "./config";
import { getAuthEnv } from "./env";

/**
 * Server-only Auth.js entry point.
 *
 * `auth` — read the session in server components / route handlers / middleware.
 * `handlers` — GET/POST handlers for app/api/auth/[...nextauth]/route.ts.
 * `signIn`/`signOut` — call from server actions (see lib/auth/actions.ts).
 *
 * AUTH_SECRET is validated HERE, inside the factory call — at first runtime
 * use, not module import — so `next build` succeeds in environments without
 * auth credentials while requests fail fast with an actionable message.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  getAuthEnv(); // lazy validation boundary
  return authConfig;
});
