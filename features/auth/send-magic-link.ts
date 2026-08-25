import type { EmailConfig } from "next-auth/providers";

type VerificationMessage = Parameters<EmailConfig["sendVerificationRequest"]>[0];

/**
 * Magic-link delivery.
 *
 * Production: requires SMTP env vars (EMAIL_SERVER_HOST etc.) and sends the
 * email through nodemailer. Development without SMTP: logs the link to the
 * terminal so the full sign-in path is testable with zero external services.
 *
 * The provider in lib/auth/config.ts delegates here via
 * sendVerificationRequest, keeping Auth.js's token generation, hashing and
 * VerificationToken persistence untouched.
 */

const LOG_PREFIX = "[sudomeet:auth]";

async function sendViaSmtp(message: VerificationMessage): Promise<void> {
  // Imported lazily so builds never require nodemailer to resolve eagerly.
  const nodemailer = (await import("nodemailer")).default;

  const { getSmtpEnv } = await import("@/lib/auth/env");
  const smtp = getSmtpEnv();

  if (!smtp) {
    throw new Error(
      "❌ SMTP configured incompletely: set EMAIL_SERVER_HOST / EMAIL_SERVER_PORT / EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD.",
    );
  }

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });

  await transport.sendMail({
    to: message.identifier,

    subject: `Your SudoMeet sign-in link`,
    text: `Sign in to SudoMeet:\n\n${message.url}\n\nThe link expires in 10 minutes.`,
    html: `<p>Sign in to <strong>SudoMeet</strong>:</p><p><a href="${message.url}">Open your sign-in link</a></p><p>The link expires in 10 minutes.</p>`,
  });
}

function logLinkToTerminal(message: VerificationMessage): void {
  console.info(
    [
      "",
      `${LOG_PREFIX} ──────────────────────────────────────────────`,
      `${LOG_PREFIX}  MAGIC LINK (dev mode — no SMTP configured)`,
      `${LOG_PREFIX}  for: ${message.identifier}`,
      `${LOG_PREFIX}  url: ${message.url}`,
      `${LOG_PREFIX} ──────────────────────────────────────────────`,
      "",
    ].join("\n"),
  );
}

/**
 * Auth.js EmailProvider hook. Chooses SMTP vs dev-log based on environment —
 * production always uses SMTP; development falls back to terminal logging.
 */
export async function sendVerificationRequest(
  message: VerificationMessage,
): Promise<void> {
  if (process.env.NODE_ENV === "production" || process.env.EMAIL_SERVER_HOST) {
    await sendViaSmtp(message);
    return;
  }

  const hasSmtp = Boolean(process.env.EMAIL_SERVER_HOST);
  if (hasSmtp) {
    await sendViaSmtp(message);
    return;
  }

  logLinkToTerminal(message);
}
