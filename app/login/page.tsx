import { auth } from "@/lib/auth/server";
import { providersAreConfigured } from "@/features/auth/provider-flags";
import { LoginForm } from "@/features/auth/login-form";
import { SignOutButton } from "@/features/auth/sign-out-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

/**
 * Sign-in page (Phase 5: design system applied).
 * Dark-first, GitHub button + magic-link form, signed-in state with sign-out.
 */
export default async function LoginPage() {
  const session = await auth();
  const flags = await providersAreConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background-elevated p-8 shadow-lg">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sign in to SudoMeet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Authentication is optional for joining — required for hosting.
        </p>

        {session ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-foreground">
              Signed in as{" "}
              <span className="font-medium font-mono text-accent">
                {session.user?.email ?? session.user?.name ?? "a user"}
              </span>
            </p>
            <SignOutButton />
          </div>
        ) : (
          <LoginForm github={flags.github} email={flags.email} />
        )}
      </div>
    </main>
  );
}
