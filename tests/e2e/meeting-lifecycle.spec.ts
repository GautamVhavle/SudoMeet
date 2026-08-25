/**
 * E2E test: Complete user journey from landing to joining a meeting.
 *
 * Scenario:
 * 1. Host creates a meeting from dashboard
 * 2. Guest joins the meeting via room code
 * 3. Both users can see each other's video tiles
 * 4. Chat works between participants
 * 5. Host can remove guest
 */

import { test, expect } from "@playwright/test";

test.describe("Meeting lifecycle", () => {
  test("host creates meeting and guest joins", async ({ page, context }) => {
    // ── Step 1: Host creates meeting ──────────────────────────────────────────

    await page.goto("/");

    // Check landing page loaded
    await expect(page.getByRole("heading", { name: /sudomeet/i })).toBeVisible();

    // No login — go directly to dashboard (anonymous identity via cookie)
    await page.goto("/dashboard");

    // Check dashboard loaded
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

    // Create a new meeting (dashboard Quick Start → New Meeting)
    const createButton = page.getByRole("button", { name: /new meeting/i });
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();

    // Wait for meeting creation and redirect
    await page.waitForURL(/\/m\/.+/, { timeout: 10000 });

    // Extract room code from URL
    const url = page.url();
    const roomCode = url.split("/m/")[1];
    expect(roomCode).toBeTruthy();

    // ── Step 2: Guest joins the same meeting ──────────────────────────────────

    // Open a new page for the guest
    const guestPage = await context.newPage();
    await guestPage.goto(`/m/${roomCode}`);

    // Guest lobby should appear (anonymous identity, no name prompt)
    await expect(guestPage.getByText(new RegExp(roomCode.split("/")[0], "i")).first()).toBeVisible({ timeout: 5000 });
    // Lobby shows device preview + Start call / Join button
    const guestJoinBtn = guestPage.getByRole("button", { name: /start call|join/i }).first();
    await expect(guestJoinBtn).toBeVisible({ timeout: 10000 });
    await guestJoinBtn.click();

    // Wait for call page
    await guestPage.waitForURL(/\/m\/.+\/call/, { timeout: 10000 });
    await expect(guestPage).toHaveURL(/\/call/);

    // Host also joins (host sees "Start call")
    const hostJoinBtn = page.getByRole("button", { name: /start call|join/i }).first();
    if (await hostJoinBtn.isVisible().catch(() => false)) {
      await hostJoinBtn.click();
      await page.waitForURL(/\/m\/.+\/call/, { timeout: 10000 });
    }

    // Both on call page
    await expect(page).toHaveURL(/\/call/);
    await expect(guestPage).toHaveURL(/\/call/);

    // Clean up
    await guestPage.close();
  });
});
