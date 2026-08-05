import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const port = 4190;
const baseUrl = `http://127.0.0.1:${port}`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let serverOutput = "";
let serverExited = false;
const server = spawn(
  "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  },
);
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });
server.once("exit", () => { serverExited = true; });

const stopServer = () => {
  try {
    process.kill(-server.pid);
  } catch {}
};

const waitForServer = async () => {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (serverExited) throw new Error(`Vite server exited:\n${serverOutput}`);
    const ready = await new Promise((resolve) => {
      const socket = net.createConnection(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
    if (ready) return;
    await delay(100);
  }
  throw new Error(`Vite server did not start:\n${serverOutput}`);
};

const json = (route, status, body) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

const candidate = (id, name) => ({
  profileId: id,
  profileType: "artist",
  name,
  isActive: true,
});

const openForm = async (browser, organizerHandler) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem("dyve_access_token", "test-token");
    localStorage.setItem("dyve_auth_mode", "member");
    localStorage.setItem(
      "dyve_user",
      JSON.stringify({
        id: "00000000-0000-0000-0000-000000000001",
        nickname: "Admin",
        provider: "dev-admin",
        role: "admin",
        createdAt: new Date(0).toISOString(),
      }),
    );
  });
  const page = await context.newPage();
  let submittedPayload;
  await page.route("**/api/admin/connection-hosts/**", organizerHandler);
  await page.route("**/api/admin/connections/", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    submittedPayload = route.request().postDataJSON();
    return json(route, 201, { data: { id: "connection-id" } });
  });
  await page.goto(`${baseUrl}/admin/connections/new`);
  return {
    context,
    page,
    submittedPayload: () => submittedPayload,
  };
};

const fillRequiredFields = async (page) => {
  await page.getByRole("button", { name: "외부 행사" }).click();
  await page.getByPlaceholder("예: 펜타포트 토요일 Buddy Dive").fill("회귀 테스트");
  await page.getByPlaceholder("운영 안내, 매칭 기준, 참가 전 유의사항을 적어 주세요.").fill("테스트 설명");
  await page.getByLabel("신청 마감").fill("2030-01-01T12:00");
  await page.getByPlaceholder("행사 제목").fill("외부 행사");
  await page.getByLabel("외부 행사 시작 일시").fill("2030-01-05T12:00");
  await page.getByPlaceholder("장소").fill("서울");
};

const submitButton = (page) => page.locator("[data-connection-submit]");

let browser;
try {
  await waitForServer();
  browser = await chromium.launch(
    fs.existsSync(chromePath) ? { headless: true, executablePath: chromePath } : { headless: true },
  );
  let releaseLoading;
  const loading = await openForm(browser, async (route) => {
    await new Promise((resolve) => {
      releaseLoading = resolve;
    });
    return json(route, 200, { data: [], nextCursor: null });
  });
  await loading.page.locator('[data-organizer-profile-status="loading"]').waitFor();
  assert.equal(await submitButton(loading.page).isDisabled(), true);
  releaseLoading();
  await loading.page.locator('[data-organizer-profile-status="ready"]').waitFor();
  await loading.context.close();

  let attempts = 0;
  const retry = await openForm(browser, (route) => {
    attempts += 1;
    return attempts === 1
      ? json(route, 500, { code: "TEST_ERROR", message: "failed" })
      : json(route, 200, { data: [], nextCursor: null });
  });
  await retry.page.locator('[data-organizer-profile-status="error"]').waitFor();
  assert.equal(await submitButton(retry.page).isDisabled(), true);
  await retry.page.getByRole("button", { name: "다시 시도" }).click();
  await retry.page.locator('[data-organizer-profile-status="ready"]').waitFor();
  await retry.context.close();

  const empty = await openForm(browser, (route) =>
    json(route, 200, { data: [], nextCursor: null }));
  await empty.page.locator('[data-organizer-profile-status="ready"]').waitFor();
  await fillRequiredFields(empty.page);
  assert.equal(await submitButton(empty.page).isEnabled(), true);
  await submitButton(empty.page).click();
  await empty.page.getByText("Buddy Dive를 등록했어요.").waitFor();
  assert.equal("organizerProfileId" in empty.submittedPayload(), false);
  await empty.context.close();

  const onlyId = "00000000-0000-0000-0000-000000000101";
  const single = await openForm(browser, (route) =>
    json(route, 200, { data: [candidate(onlyId, "Official A")], nextCursor: null }));
  await single.page.locator('[data-organizer-profile-status="ready"]').waitFor();
  await fillRequiredFields(single.page);
  assert.equal(await submitButton(single.page).isEnabled(), true);
  await submitButton(single.page).click();
  await single.page.getByText("Buddy Dive를 등록했어요.").waitFor();
  assert.equal(single.submittedPayload().organizerProfileId, onlyId);
  await single.context.close();

  const firstId = "00000000-0000-0000-0000-000000000201";
  const multiple = await openForm(browser, (route) =>
    json(route, 200, {
      data: [
        candidate(firstId, "Official A"),
        candidate("00000000-0000-0000-0000-000000000202", "Official B"),
      ],
      nextCursor: null,
    }));
  await multiple.page.locator('[data-organizer-profile-status="ready"]').waitFor();
  await fillRequiredFields(multiple.page);
  assert.equal(await submitButton(multiple.page).isDisabled(), true);
  await multiple.page.getByRole("button", { name: /공식 운영 프로필.*선택하기/ }).click();
  await multiple.page.getByRole("dialog").getByRole("button", { name: /Official A/ }).click();
  assert.equal(await submitButton(multiple.page).isEnabled(), true);
  await submitButton(multiple.page).click();
  await multiple.page.getByText("Buddy Dive를 등록했어요.").waitFor();
  assert.equal(multiple.submittedPayload().organizerProfileId, firstId);
  await multiple.context.close();

  console.log("Connection organizer regression check passed.");
} finally {
  await browser?.close();
  stopServer();
}
