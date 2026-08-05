import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const port = 4193;
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
  try { process.kill(-server.pid); } catch {}
};

const waitForServer = async () => {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (serverExited) throw new Error(`Vite server exited:\n${serverOutput}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Vite server did not start:\n${serverOutput}`);
};

const fulfill = (route, body, status = 200) => route.fulfill({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const meResponse = (phoneNumber) => ({
  data: {
    id: "00000000-0000-0000-0000-000000000001",
    ownerId: "00000000-0000-0000-0000-000000000001",
    name: "테스트 다이버",
    nickname: "테스트 다이버",
    hasArtistProfile: false,
    hasVenueProfile: false,
    accountInfo: {
      provider: "kakao",
      name: "테스트 다이버",
      email: null,
      gender: null,
      ageRange: null,
      phoneNumber,
      birthday: null,
      birthYear: null,
      age: null,
      ci: null,
      ciAuthenticatedAt: null,
      shippingAddresses: [],
    },
  },
  nextCursor: null,
});

const oauthResponse = (provider) => ({
  data: {
    accessToken: "phone-check-token",
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      role: "member",
      provider,
      nickname: "테스트 다이버",
    },
    redirectTo: "/privacy",
  },
  nextCursor: null,
});

let browser;
try {
  await waitForServer();
  browser = await chromium.launch(
    fs.existsSync(chromePath) ? { headless: true, executablePath: chromePath } : { headless: true },
  );

  for (const provider of ["kakao", "naver"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === `/api/auth/oauth/${provider}/callback/`) return fulfill(route, oauthResponse(provider));
      if (path === "/api/me") return fulfill(route, meResponse("01012345678"));
      return fulfill(route, { data: [], nextCursor: null });
    });
    await page.goto(`${baseUrl}/auth/callback/${provider}?code=code&state=state`);
    await page.waitForURL(`${baseUrl}/privacy`);
    assert.equal(page.url().includes("/account/phone"), false);
    await context.close();
  }

  const retryContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const retryPage = await retryContext.newPage();
  let meRequests = 0;
  await retryPage.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/oauth/kakao/callback/") return fulfill(route, oauthResponse("kakao"));
    if (path === "/api/me") {
      meRequests += 1;
      return meRequests === 1
        ? fulfill(route, { message: "Temporary failure" }, 500)
        : fulfill(route, meResponse(null));
    }
    return fulfill(route, { data: [], nextCursor: null });
  });
  await retryPage.goto(`${baseUrl}/auth/callback/kakao?code=code&state=state`);
  await retryPage.getByRole("heading", { name: "연락받을 번호를 알려주세요" }).waitFor();
  assert.equal(meRequests, 2);
  await retryContext.close();

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  let patchAttempts = 0;
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/oauth/kakao/callback/") return fulfill(route, oauthResponse("kakao"));
    if (path === "/api/me" && request.method() === "PATCH") {
      patchAttempts += 1;
      if (patchAttempts === 1) return fulfill(route, { message: "Temporary failure" }, 500);
      assert.deepEqual(request.postDataJSON(), { phoneNumber: "01012345678" });
      return fulfill(route, meResponse("01012345678"));
    }
    if (path === "/api/me") return fulfill(route, meResponse(null));
    return fulfill(route, { data: [], nextCursor: null });
  });

  await page.goto(`${baseUrl}/auth/callback/kakao?code=code&state=state`);
  await page.getByRole("heading", { name: "연락받을 번호를 알려주세요" }).waitFor();
  await page.getByLabel("휴대전화번호").fill("0212345678");
  await page.getByRole("button", { name: "번호 저장하고 계속하기" }).click();
  await page.getByText("010으로 시작하는 11자리 번호를 입력해 주세요.").waitFor();
  assert.equal(patchAttempts, 0);

  await page.getByLabel("휴대전화번호").fill("01012345678");
  await page.getByRole("button", { name: "번호 저장하고 계속하기" }).click();
  await page.getByText("번호를 저장하지 못했어요. 다시 시도해 주세요.").waitFor();
  assert.equal(await page.getByLabel("휴대전화번호").inputValue(), "01012345678");
  await page.getByRole("button", { name: "번호 저장하고 계속하기" }).click();
  await page.waitForURL(`${baseUrl}/privacy`);
  assert.equal(patchAttempts, 2);
  await context.close();

  for (const width of [320, 390, 430]) {
    const viewportContext = await browser.newContext({ viewport: { width, height: 844 } });
    const viewportPage = await viewportContext.newPage();
    await viewportPage.addInitScript(() => {
      localStorage.setItem("dyve_access_token", "phone-check-token");
      localStorage.setItem("dyve_auth_mode", "member");
    });
    await viewportPage.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      return path === "/api/me"
        ? fulfill(route, meResponse(null))
        : fulfill(route, { data: [], nextCursor: null });
    });
    await viewportPage.goto(`${baseUrl}/account/phone?redirectTo=%2Fprivacy`);
    await viewportPage.getByRole("heading", { name: "연락받을 번호를 알려주세요" }).waitFor();
    assert.equal(await viewportPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await viewportPage.getByRole("button", { name: "번호 저장하고 계속하기" }).waitFor();
    if (width === 390) await viewportPage.screenshot({ path: "/tmp/dyve-phone-collection-390.png", fullPage: true });
    await viewportContext.close();
  }

  console.log("Phone collection browser check passed.");
} finally {
  await browser?.close();
  stopServer();
}
