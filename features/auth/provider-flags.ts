/**
 * Server-computed provider availability flags.
 *
 * Auth.js only lists providers whose credentials resolve, so the login UI
 * mirrors that logic: GitHub's button renders only when AUTH_GITHUB_ID +
 * AUTH_GITHUB_SECRET exist. The email provider is always available (dev mode
 * logs magic links to the terminal).
 */

export interface ProviderFlags {
  github: boolean;
  email: boolean;
}

export async function providersAreConfigured(): Promise<ProviderFlags> {
  const { getGitHubOAuthEnv } = await import("@/lib/auth/env");

  return {
    github: getGitHubOAuthEnv() !== null,
    email: true,
  };
}
