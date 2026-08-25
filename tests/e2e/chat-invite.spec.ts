import { test, expect } from "@playwright/test";

/**
 * Chat history and sending both returned 4xx in production: history because
 * absent query params arrived as null, sending because rooms sit in DRAFT.
 */

test("chat history loads and messages send between peers", async ({ browser }) => {
  test.setTimeout(120_000);

  const a = await browser.newContext();
  const b = await browser.newContext();

  const setup = await a.newPage();
  const room = (
    await (await setup.request.post("/api/meetings", { data: { title: "chat" } })).json()
  ).roomCode;
  await setup.close();

  const pageA = await a.newPage();
  await pageA.goto(`/m/${room}/call`);
  await expect(pageA.locator('[data-testid="video-tile"]')).toHaveCount(1, {
    timeout: 30_000,
  });

  // History must return 200, not 400.
  const history = await pageA.request.get(`/api/chat/${room}`);
  expect(history.status(), await history.text()).toBe(200);

  // Sending must return 2xx, not 403.
  const send = await pageA.request.post(`/api/chat/${room}`, {
    data: { body: "hello from A" },
  });
  expect(send.status(), await send.text()).toBeLessThan(300);

  // And the message must come back in history.
  const after = await pageA.request.get(`/api/chat/${room}`);
  const payload = await after.json();
  expect(JSON.stringify(payload.messages)).toContain("hello from A");

  const pageB = await b.newPage();
  await pageB.goto(`/m/${room}/call`);
  await expect(pageB.locator('[data-testid="video-tile"]')).toHaveCount(2, {
    timeout: 30_000,
  });

  // B must actually receive a message typed by A.
  await pageB.mouse.move(400, 400);
  await pageB.getByRole("button", { name: /chat/i }).first().click();
  await expect(pageB.getByText("hello from A")).toBeVisible({ timeout: 15_000 });

  await a.close();
  await b.close();
});

test("invite dialog exposes a shareable join link", async ({ browser }) => {
  test.setTimeout(90_000);
  const context = await browser.newContext();

  const setup = await context.newPage();
  const room = (
    await (await setup.request.post("/api/meetings", { data: { title: "inv" } })).json()
  ).roomCode;
  await setup.close();

  const page = await context.newPage();
  await page.goto(`/m/${room}/call`);
  await page.getByRole("button", { name: /invite/i }).click();

  const link = page.getByLabel("Meeting link");
  await expect(link).toBeVisible();
  await expect(link).toHaveValue(new RegExp(`/m/${room}$`));

  await context.close();
});
