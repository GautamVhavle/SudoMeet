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

    // Navigate to login
    const loginButton = page.getByRole("link", { name: /sign in/i });
    await loginButton.click();

    // Wait for login page
    await expect(page).toHaveURL(/\/login/);

    // For demo/test: skip OAuth and directly set auth cookie if possible
    // In real E2E, you'd use a test OAuth provider or mock auth
    // For now, we'll skip auth and just verify the flow exists

    // Navigate to dashboard (assuming auth is bypassed or mocked)
    await page.goto("/dashboard");

    // Check dashboard loaded
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

    // Create a new meeting
    const createButton = page.getByRole("button", { name: /create meeting/i });
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

    // Guest pre-join page should appear
    await expect(guestPage.getByRole("heading", { name: /join meeting/i })).toBeVisible();

    // Enter guest name
    const nameInput = guestPage.getByPlaceholder(/your name/i);
    await nameInput.fill("Test Guest");

    // Join the meeting
    const joinButton = guestPage.getByRole("button", { name: /join/i });
    await joinButton.click();

    // Wait for call interface to load
    await guestPage.waitForSelector("[data-testid='call-interface']", { timeout: 15000 });

    // ── Step 3: Verify both users can see video tiles ────────────────────────

    // Host should see their own tile and guest tile
    await expect(page.getByTestId("video-tile")).toHaveCount(2, { timeout: 10000 });

    // Guest should see their own tile and host tile
    await expect(guestPage.getByTestId("video-tile")).toHaveCount(2, { timeout: 10000 });

    // ── Step 4: Test chat ─────────────────────────────────────────────────────

    // Host opens chat panel
    const chatToggle = page.getByRole("button", { name: /chat/i });
    await chatToggle.click();

    // Send a message
    const chatInput = page.getByPlaceholder(/type a message/i);
    await chatInput.fill("Hello from host!");
    await chatInput.press("Enter");

    // Verify message appears in host chat
    await expect(page.getByText("Hello from host!")).toBeVisible();

    // Guest should receive the message
    const guestChatToggle = guestPage.getByRole("button", { name: /chat/i });
    await guestChatToggle.click();
    await expect(guestPage.getByText("Hello from host!")).toBeVisible();

    // ── Step 5: Host removes guest ───────────────────────────────────────────

    // Host opens participants panel
    const participantsToggle = page.getByRole("button", { name: /participants/i });
    await participantsToggle.click();

    // Find guest in participant list and remove
    const guestRow = page.getByText("Test Guest");
    await guestRow.hover();
    const removeButton = page.getByRole("button", { name: /remove/i });
    await removeButton.click();

    // Confirm removal
    const confirmButton = page.getByRole("button", { name: /confirm/i });
    await confirmButton.click();

    // Guest page should redirect or show "removed" message
    await expect(guestPage.getByText(/removed from meeting/i)).toBeVisible({ timeout: 5000 });

    // Clean up
    await guestPage.close();
  });
});
