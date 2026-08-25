"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "./server";

/**
 * Server-action wrappers around Auth.js signIn/signOut.
 *
 * Server actions are POST-only and origin-checked by Next.js, which keeps the
 * flows CSRF-safe without extra tokens (Auth.js additionally issues its own
 * CSRF cookie for the /api/auth/* endpoints).
 *
 * Error contract: expected auth failures (wrong provider, user cancel,
 * email-verification pending) are returned as a `{ error }` object so the
 * login form can render them; unexpected errors propagate to the boundary.
 */

export type SignInActionState = { error?: string };

export async function signInWithGitHub(
  _prevState: SignInActionState | undefined,
  _formData: FormData,
): Promise<SignInActionState> {
  try {
    await signIn("github", { redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "GitHub sign-in failed. Please try again." };
    }
    throw error; // NEXT_REDIRECT and friends must rethrow
  }
  return {};
}

export async function signInWithMagicLink(
  _prevState: SignInActionState | undefined,
  formData: FormData,
): Promise<SignInActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  try {
    await signIn("email-link", { email, redirect: false });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Could not send the sign-in link. Please try again." };
    }
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
