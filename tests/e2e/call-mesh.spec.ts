import { test, expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Two real browser contexts join the same room and must see and hear each
 * other. This is the regression guard for the mesh: mock participants, broken
 * signal fanout, or a dropped handshake all fail here.
 */

const FAKE_MEDIA_ARGS = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  "--allow-file-access-from-files",
  "--autoplay-policy=no-user-gesture-required",
];

test.use({
  launchOptions: { args: FAKE_MEDIA_ARGS },
  permissions: ["camera", "microphone"],
});

async function createRoom(page: Page): Promise<string> {
  const response = await page.request.post("/api/meetings", {
    data: { title: "Mesh smoke test" },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  return body.meeting?.roomCode ?? body.roomCode;
}

async function joinCall(context: BrowserContext, roomCode: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`/m/${roomCode}/call`);
  return page;
}

/** Count peer connections that reached the `connected` ICE state. */
async function connectedPeerCount(page: Page): Promise<number> {
  return page.locator('[data-testid="video-tile"]').count();
}

test("two participants see and hear each other", async ({ browser }) => {
  test.setTimeout(120_000);

  const contextA = await browser.newContext({
    permissions: ["camera", "microphone"],
  });
  const contextB = await browser.newContext({
    permissions: ["camera", "microphone"],
  });

  try {
    const setupPage = await contextA.newPage();
    const roomCode = await createRoom(setupPage);
    await setupPage.close();

    const pageA = await joinCall(contextA, roomCode);
    await expect(pageA.locator('[data-testid="video-tile"]')).toHaveCount(1, {
      timeout: 20_000,
    });

    const pageB = await joinCall(contextB, roomCode);

    // Each side must render a tile for itself and the remote peer.
    await expect(pageA.locator('[data-testid="video-tile"]')).toHaveCount(2, {
      timeout: 30_000,
    });
    await expect(pageB.locator('[data-testid="video-tile"]')).toHaveCount(2, {
      timeout: 30_000,
    });

    expect(await connectedPeerCount(pageA)).toBe(2);

    // The remote tile must carry live audio and video tracks.
    const remoteTracks = await pageB.evaluate(() => {
      const media = Array.from(document.querySelectorAll("video, audio"));
      return media
        .map((el) => (el as HTMLMediaElement).srcObject as MediaStream | null)
        .filter((s): s is MediaStream => Boolean(s))
        .map((s) => ({
          audio: s.getAudioTracks().length,
          video: s.getVideoTracks().length,
          live: s.getTracks().every((t) => t.readyState === "live"),
        }));
    });

    expect(remoteTracks.some((t) => t.audio > 0 && t.live)).toBeTruthy();
    expect(remoteTracks.some((t) => t.video > 0 && t.live)).toBeTruthy();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test("control bar fits a phone viewport without horizontal scroll", async ({
  browser,
}) => {
  const context = await browser.newContext({
    permissions: ["camera", "microphone"],
    viewport: { width: 375, height: 667 },
  });

  try {
    const setupPage = await context.newPage();
    const roomCode = await createRoom(setupPage);
    await setupPage.close();

    const page = await joinCall(context, roomCode);
    const bar = page.locator('[data-testid="call-control-bar"]');
    await expect(bar).toBeVisible({ timeout: 20_000 });

    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      vertical:
        document.documentElement.scrollHeight - document.documentElement.clientHeight,
    }));

    expect(overflow.doc).toBeLessThanOrEqual(1);
    expect(overflow.vertical).toBeLessThanOrEqual(1);
  } finally {
    await context.close();
  }
});
