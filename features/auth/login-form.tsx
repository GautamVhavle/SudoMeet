"use client";

import { useActionState } from "react";

import {
  signInWithGitHub,
  signInWithMagicLink,
  type SignInActionState,
} from "@/lib/auth/actions";
import type { ProviderFlags } from "@/features/auth/provider-flags";

const initialState: SignInActionState = {};

export function LoginForm({ github, email }: ProviderFlags) {
  const [githubState, githubAction, githubPending] = useActionState(
    signInWithGitHub,
    initialState,
  );
  const [emailState, emailAction, emailPending] = useActionState(
    signInWithMagicLink,
    initialState,
  );

  return (
    <div className="mt-6 space-y-4">
      {github && (
        <form action={githubAction}>
          <button
            type="submit"
            disabled={githubPending}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            {githubPending ? "Redirecting…" : "Continue with GitHub"}
          </button>
        </form>
      )}

      <div className="relative py-1" role="separator">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground">
            or
          </span>
        </div>
      </div>

      {email && (
        <form action={emailAction} className="space-y-3">
          <label htmlFor="email" className="block text-sm text-muted-foreground">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={emailPending}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {emailPending ? "Sending link…" : "Send magic link"}
          </button>
        </form>
      )}

      {(githubState.error ?? emailState.error) && (
        <p role="alert" className="text-sm text-destructive">
          {githubState.error ?? emailState.error}
        </p>
      )}

      {!github && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          GitHub sign-in appears once OAuth credentials are configured — see README for
          setup steps.
        </p>
      )}
    </div>
  );
}
