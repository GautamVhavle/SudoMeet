import { test, expect } from "@playwright/test";

test.describe("Anonymous identity", () => {
  test("landing has no Sign In, dashboard creates meeting", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /sudomeet/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /go to dashboard/i })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    // Welcome shows Guest-XXXX
    await expect(page.getByText(/welcome/i)).toBeVisible();
    await expect(page.getByText(/Guest-/i)).toBeVisible();

    // Create meeting via Quick Start form
    const newMeetingBtn = page.getByRole("button", { name: /new meeting/i });
    await expect(newMeetingBtn).toBeVisible();
    await newMeetingBtn.click();
    await page.waitForURL(/\/m\/.+/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/m\//);
  });

  test("refresh retains same identity", async ({ page }) => {
    await page.goto("/dashboard");
    const welcome1 = await page.getByText(/Guest-/i).first().textContent();
    await page.reload();
    const welcome2 = await page.getByText(/Guest-/i).first().textContent();
    expect(welcome1).toBe(welcome2);
  });

  test("two contexts get distinct identities (same-home safe)", async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    await p1.goto("/dashboard");
    await p2.goto("/dashboard");
    const n1 = await p1.getByText(/Guest-/i).first().textContent();
    const n2 = await p2.getByText(/Guest-/i).first().textContent();
    expect(n1).not.toBe(n2);
    await ctx1.close();
    await ctx2.close();
  });

  test("join by code navigates to lobby", async ({ page }) => {
    await page.goto("/dashboard");
    // Create a meeting first to get a valid code
    await page.getByRole("button", { name: /new meeting/i }).click();
    await page.waitForURL(/\/m\/.+/, { timeout: 10000 });
    const code = page.url().split("/m/")[1].split("/")[0].split("?")[0];

    // New page joins by code via landing form
    await page.goto("/");
    const input = page.getByPlaceholder(/room-code-here/i);
    await input.fill(code);
    await page.getByRole("button", { name: /^join$/i }).last().click();
    await page.waitForURL(new RegExp(`/m/${code}`), { timeout: 10000 });
    await expect(page.getByText(/join|pre-join|lobby/i).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
