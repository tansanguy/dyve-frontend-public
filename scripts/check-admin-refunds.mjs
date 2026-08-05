import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const source = fs.readFileSync(new URL("../src/pages/AdminRefundsPage.tsx", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const nav = fs.readFileSync(new URL("../src/components/layout/AdminLayout.tsx", import.meta.url), "utf8");
assert.match(source, /확인 필요/);
assert.match(source, /정책 환불액/);
assert.match(source, /처리 타임라인/);
assert.match(source, /adminRetryRefund/);
assert.match(app, /path="refunds"/);
assert.match(nav, /path: "\/admin\/refunds"/);

const port = 4194;
const baseUrl = `http://127.0.0.1:${port}`;
let serverOutput = "";
let serverExited = false;
const server = spawn(
  "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: fileURLToPath(new URL("..", import.meta.url)), stdio: ["ignore", "pipe", "pipe"], detached: true },
);
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });
server.once("exit", () => { serverExited = true; });
const stopServer = () => { try { process.kill(-server.pid); } catch {} };

for (let attempt = 0; attempt < 200; attempt += 1) {
  if (serverExited) throw new Error(`Vite server exited:\n${serverOutput}`);
  try {
    if ((await fetch(baseUrl)).ok) break;
  } catch {}
  if (attempt === 199) throw new Error(`Vite server did not start:\n${serverOutput}`);
  await delay(100);
}

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch(fs.existsSync(chromePath) ? { executablePath: chromePath } : {});
const id = "00000000-0000-0000-0000-000000000101";
const candidateId = "00000000-0000-0000-0000-000000000102";
const customer = { profileId: null, ownerId: null, name: "김다이버", email: "dive@example.com", phone: "010-1234-5678" };
const baseRefund = {
  id,
  sourceType: "group_dive",
  referenceId: candidateId,
  title: "<201>을 좋아하세요",
  customer,
  status: "failed",
  paidAmount: 11000,
  refundAmount: 10000,
  currency: "KRW",
  reason: "고객 요청",
  providerRefundId: null,
  attemptCount: 1,
  lastAttemptedAt: "2026-08-03T10:00:00+09:00",
  lastAttemptedBy: { ownerId: "00000000-0000-0000-0000-000000000099", email: "admin@dyve.kr" },
  lastErrorCode: "PAYMENT_REFUND_FAILED",
  lastErrorMessage: "PG 환불 요청에 실패했습니다.",
  requestedAt: "2026-08-03T09:59:00+09:00",
  approvedAt: "2026-08-03T10:00:00+09:00",
  completedAt: null,
  failedAt: "2026-08-03T10:00:02+09:00",
  canRetry: true,
  sourcePath: "/admin/group-dives",
};
const candidate = {
  sourceType: "group_dive",
  referenceId: candidateId,
  title: "<201>을 좋아하세요",
  customer,
  paidAmount: 11000,
  refundAmount: 10000,
  currency: "KRW",
  policy: "회차 배정 전 보증금 환불",
  consequence: "신청은 보증금 없이 계속 탐색합니다.",
};

try {
  for (const width of [320, 390, 430, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      localStorage.setItem("dyve_access_token", "refund-admin-token");
      localStorage.setItem("dyve_auth_mode", "member");
      localStorage.setItem("dyve_user", JSON.stringify({
        id: "00000000-0000-0000-0000-000000000099",
        nickname: "admin",
        provider: "dev-admin",
        role: "admin",
        createdAt: new Date(0).toISOString(),
      }));
    });
    let refund = { ...baseRefund };
    const page = await context.newPage();
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (path.endsWith("/admin/refunds/summary/")) return json({ data: { actionRequired: refund.canRetry ? 1 : 0, processing: 0, completedTodayCount: refund.status === "completed" ? 1 : 0, completedTodayAmount: refund.status === "completed" ? 10000 : 0 } });
      if (path.endsWith(`/admin/refunds/${id}/retry/`)) {
        refund = { ...refund, status: "completed", attemptCount: 2, canRetry: false, lastErrorCode: null, lastErrorMessage: null, providerRefundId: "pg-refund-1", completedAt: "2026-08-03T10:03:00+09:00" };
        return json({ data: refund });
      }
      if (path.endsWith("/admin/refund-candidates/")) return json({ data: [candidate], nextCursor: null });
      if (path.endsWith("/admin/refunds/") && request.method() === "POST") return json({ data: { ...refund, id: candidateId, status: "completed", canRetry: false } });
      if (path.endsWith("/admin/refunds/")) return json({ data: [refund], nextCursor: null });
      return json({ data: {} });
    });
    await page.goto(`${baseUrl}/admin/refunds`);
    await page.getByRole("heading", { name: "환불 센터" }).waitFor();
    await page.getByText("<201>을 좋아하세요").first().waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${width}px horizontal overflow`);

    if (width === 1280) {
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "₩10,000 재처리" }).click();
      await page.getByText("환불 재처리를 완료했습니다.").waitFor();
      await page.getByRole("button", { name: "새 환불" }).click();
      await page.getByLabel("환불 대상 검색").fill("김다이버");
      await page.getByRole("button", { name: "검색" }).last().click();
      await page.getByRole("button", { name: /김다이버/ }).click();
      await page.getByLabel("환불 사유").fill("고객 요청 확인");
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "₩10,000 환불 확인" }).click();
      await page.getByText("환불을 처리했습니다.").waitFor();
    }
    await context.close();
  }
  console.log("Admin refund center browser check passed (320, 390, 430, 1280px).");
} finally {
  await browser.close();
  stopServer();
}
