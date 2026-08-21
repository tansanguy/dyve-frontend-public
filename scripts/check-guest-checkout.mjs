import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const port = 4192;
const baseUrl = `http://127.0.0.1:${port}`;
const eventId = "00000000-0000-0000-0000-000000000010";
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
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
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

const event = {
  id: eventId,
  title: "비회원 예매 회귀 테스트",
  image: "",
  venue: "DYVE 테스트홀",
  isFeatured: false,
  isNetworkingParty: true,
  dateDisplay: "2026. 8. 1. 19:00",
  admissionType: "assigned",
  price: 30000,
  isFree: false,
  capacity: 2,
  minimumBookingQuantity: 1,
  isSoldOut: false,
  layout: { rows: 1, cols: 2 },
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch(
    fs.existsSync(chromePath) ? { headless: true, executablePath: chromePath } : { headless: true },
  );
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => { serverOutput += `\nBrowser error: ${error.stack}`; });
  page.on("console", (message) => {
    if (message.type() === "error") serverOutput += `\nBrowser console: ${message.text()}`;
  });
  let paymentIntentPayload;
  let paymentIntentCount = 0;

  await page.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    if (path === `/api/events/${eventId}`) {
      return json(route, 200, { data: event });
    }
    if (path === `/api/events/${eventId}/seats` && request.method() === "GET") {
      return json(route, 200, {
        data: {
          seats: [
            { id: "A-1", status: "available" },
            { id: "A-2", status: "available" },
          ],
          layout: { rows: 1, cols: 2 },
        },
      });
    }
    if (path === `/api/events/${eventId}/discount-code/validate`) {
      return json(route, 200, {
        data: { code: "SAVE10", discountAmountPerTicket: 2000 },
      });
    }
    if (path === `/api/events/${eventId}/seats/hold` && request.method() === "POST") {
      return json(route, 200, { data: { holdId: "00000000-0000-0000-0000-000000000011" } });
    }
    if (path.includes("/seats/hold/") && request.method() === "DELETE") {
      return json(route, 200, { data: null });
    }
    if (path === "/api/payments/intent") {
      paymentIntentCount += 1;
      paymentIntentPayload = request.postDataJSON();
      return json(route, 200, {
        data: {
          paymentId: "00000000-0000-0000-0000-000000000012",
          status: "paid",
          provider: "mock",
          originalAmount: 30000,
          discountAmount: 2000,
          amount: 29000,
        },
      });
    }
    return json(route, 200, { data: [] });
  });

  await page.goto(`${baseUrl}/performance/${eventId}`);
  await page.getByText(event.title).waitFor({ timeout: 5000 }).catch(async () => {
    throw new Error(`Performance page did not load:\n${await page.locator("body").innerText()}\n${serverOutput}`);
  });
  await page.getByRole("button", { name: "예매하기" }).click();
  await page.waitForURL(`${baseUrl}/checkout/${eventId}`);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
      false,
      `checkout must not overflow at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /A열 1번 좌석/ }).click();
  await page.getByLabel("닉네임").fill("게스트다이버");
  await page.getByLabel("성별").selectOption("female");
  await page.getByLabel("이 주제를 얼마나 좋아하나요?").fill("매우 좋아해요");
  await page.getByRole("textbox", { name: "할인코드" }).fill("save10");
  await page.getByRole("button", { name: "적용" }).click();
  await page.getByText("로그인 후 할인 여부를 확인해요.").waitFor();
  await page.getByRole("radio", { name: /계좌이체/ }).check();

  await page.locator("[data-checkout-submit]").click();
  await page.getByRole("heading", { name: "예매는 로그인이 필요해요" }).waitFor();
  await page.getByRole("button", { name: "카카오로 시작하기" }).waitFor();
  await page.getByRole("button", { name: "네이버로 시작하기" }).waitFor();
  assert.equal(paymentIntentCount, 0);

  const savedDraft = await page.evaluate((id) => (
    JSON.parse(sessionStorage.getItem(`dyve_checkout_draft:${id}`))
  ), eventId);
  assert.deepEqual(savedDraft, {
    quantity: 1,
    admissionType: "assigned",
    seatIds: ["A-1"],
    discountCodeInput: "SAVE10",
    paymentMethod: "bank",
    groupDiveAnswers: {
      nickname: "게스트다이버",
      gender: "female",
      enthusiasm: "매우 좋아해요",
    },
  });

  await page.evaluate(() => {
    localStorage.setItem("dyve_access_token", "guest-checkout-test-token");
    localStorage.setItem("dyve_auth_mode", "member");
    localStorage.setItem(
      "dyve_user",
      JSON.stringify({
        id: "00000000-0000-0000-0000-000000000001",
        nickname: "테스트 다이버",
        provider: "kakao",
        role: "member",
        createdAt: new Date(0).toISOString(),
      }),
    );
  });
  await page.reload();

  await page.getByText("SAVE10 · 티켓당 ₩2,000 할인").waitFor();
  assert.equal(await page.getByRole("button", { name: /A열 1번 좌석/ }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.getByLabel("닉네임").inputValue(), "게스트다이버");
  assert.equal(await page.getByLabel("성별").inputValue(), "female");
  assert.equal(await page.getByLabel("이 주제를 얼마나 좋아하나요?").inputValue(), "매우 좋아해요");
  assert.equal(await page.getByRole("textbox", { name: "할인코드" }).inputValue(), "SAVE10");
  assert.equal(
    await page.evaluate((id) => sessionStorage.getItem(`dyve_checkout_draft:${id}`), eventId),
    null,
  );

  await page.locator("[data-checkout-submit]").click();
  await page.waitForURL(`${baseUrl}/payment-complete`);
  assert.equal(paymentIntentCount, 1);
  assert.deepEqual(paymentIntentPayload, {
    eventId,
    admissionType: "assigned",
    quantity: 1,
    seatIds: ["A-1"],
    discountCode: "SAVE10",
    method: "bank",
    groupDiveAnswers: {
      nickname: "게스트다이버",
      gender: "female",
      enthusiasm: "매우 좋아해요",
    },
  });

  console.log("Guest checkout regression check passed.");
} finally {
  await browser?.close();
  stopServer();
}
