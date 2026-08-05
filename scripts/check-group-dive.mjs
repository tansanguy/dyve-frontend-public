import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const port = 4191;
const baseUrl = `http://127.0.0.1:${port}`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const connectionPageSource = fs.readFileSync(
  new URL("../src/pages/ConnectionListPage.tsx", import.meta.url),
  "utf8",
);
const groupPageSource = fs.readFileSync(
  new URL("../src/pages/GroupDivePage.tsx", import.meta.url),
  "utf8",
);
const detailPageSource = fs.readFileSync(
  new URL("../src/pages/GroupDiveDetailPage.tsx", import.meta.url),
  "utf8",
);
const applicationPageSource = fs.readFileSync(
  new URL("../src/pages/GroupDiveApplicationPage.tsx", import.meta.url),
  "utf8",
);
const myPageSource = fs.readFileSync(
  new URL("../src/pages/MyPage.tsx", import.meta.url),
  "utf8",
);
assert.match(connectionPageSource, /useState<DiveKind>\("group"\)/);
assert.match(connectionPageSource, /Group Dive/);
assert.match(connectionPageSource, /취향 기반 만남/);
assert.match(connectionPageSource, /Buddy Dive/);
assert.match(connectionPageSource, /공연, 페스티벌 동행/);
assert.match(connectionPageSource, /내 취향, 내 동네에서/);
assert.match(connectionPageSource, /작은 Group Dive를 시작해요/);
assert.match(connectionPageSource, /회차가 확정될 때까지,/);
assert.match(connectionPageSource, /7일마다 진행 상황을 안내합니다/);
assert.match(connectionPageSource, /text-\[11px\].*text-\[var\(--color-muted\)\]/s);
assert.match(connectionPageSource, /data-copy-line/);
assert.match(connectionPageSource, /ariaLabel="Group Dive 목록"/);
assert.match(connectionPageSource, /aspect-\[210\/297\]/);
assert.match(groupPageSource, /aspect-\[210\/297\]/);
assert.match(groupPageSource, /bg-gradient-to-t from-black\/90/);
assert.match(groupPageSource, /line-clamp-2/);
assert.match(detailPageSource, /group\.questions\.map/);
assert.match(detailPageSource, /deposit_and_application_fee/);
assert.match(detailPageSource, /updateMe\(\{ email:/);
assert.match(detailPageSource, /대표 일정 · 확정 진행/);
assert.match(detailPageSource, /개인정보 수집·이용에 동의합니다/);
assert.match(detailPageSource, /동의와 결제 확인/);
assert.doesNotMatch(detailPageSource, /신청 전 필수 준비/);
assert.doesNotMatch(detailPageSource, /신청 수수료는 결제 직전에 안내합니다/);
assert.match(detailPageSource, /잘 맞을 것 같은 사람끼리 모임을 구성/);
assert.match(detailPageSource, /data-meeting-introduction/);
assert.match(detailPageSource, /빨간 점은 대표 일정입니다/);
assert.match(detailPageSource, /희망 지역 \*/);
assert.match(detailPageSource, /저녁에 가능한 날짜 \*/);
assert.match(detailPageSource, /data-gallery-image/);
assert.match(detailPageSource, /aria-invalid:border-\[var\(--color-hairline\)\]/);
assert.match(detailPageSource, /DateAvailabilityPicker/);
assert.match(detailPageSource, /다른 지역 제안하기 · 무료/);
assert.doesNotMatch(detailPageSource, /group\.proposedRegions/);
assert.match(detailPageSource, /승인되면 정식 신청 안내를 보내드릴게요/);
assert.match(detailPageSource, /저녁 시간\(오후 7시 이후\)/);
assert.match(detailPageSource, /AVAILABILITY_DAYS_BEFORE = 7/);
assert.match(detailPageSource, /AVAILABILITY_DAYS_AFTER = 28/);
assert.match(detailPageSource, /대표 일정 1주 전부터 4주 후까지/);
assert.match(detailPageSource, /모임 전 채팅방과 당일 모임에서 불릴 이름/);
assert.match(detailPageSource, /inputMode="numeric"/);
assert.match(detailPageSource, /placeholder="01012345678"/);
assert.match(detailPageSource, /예: 경남 진주시 · 부산광역시 북부/);
assert.match(detailPageSource, /data-group-dive-checkout/);
assert.match(detailPageSource, /신청 수수료는 이중 부과되지 않습니다/);
assert.match(detailPageSource, /회차 배정 전 신청을 취소하면 보증금을 환불합니다/);
assert.doesNotMatch(detailPageSource, /GroupDivePaymentReviewDialog/);
assert.match(applicationPageSource, /final_payment/);
assert.match(applicationPageSource, /내 신청이 취소됐어요/);
assert.match(applicationPageSource, /다시 신청하기/);
assert.doesNotMatch(applicationPageSource, /continueGroupDiveSearch/);
assert.doesNotMatch(applicationPageSource, /신청 종료|모집 마감/);
assert.match(myPageSource, /listMyGroupDiveApplications/);
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

const multipartField = (body, name) => {
  const match = body.match(new RegExp(`name="${name}"\\r?\\n\\r?\\n([^\\r\\n]*)`));
  if (!match) throw new Error(`Missing multipart field: ${name}`);
  return match[1];
};

const addMemberState = (context) =>
  context.addInitScript(() => {
    localStorage.setItem("dyve_access_token", "group-dive-test-token");
    localStorage.setItem("dyve_auth_mode", "member");
    localStorage.setItem(
      "dyve_user",
      JSON.stringify({
        id: "00000000-0000-0000-0000-000000000001",
        nickname: "테스트 다이버",
        provider: "dev",
        role: "member",
        createdAt: new Date(0).toISOString(),
      }),
    );
  });

const addAdminState = (context) =>
  context.addInitScript(() => {
    localStorage.setItem("dyve_access_token", "group-dive-admin-token");
    localStorage.setItem("dyve_auth_mode", "member");
    localStorage.setItem(
      "dyve_user",
      JSON.stringify({
        id: "00000000-0000-0000-0000-000000000099",
        nickname: "admin",
        provider: "dev-admin",
        role: "admin",
        createdAt: new Date(0).toISOString(),
      }),
    );
  });

const groupDiveId = "00000000-0000-0000-0000-000000000010";
const applicationId = "00000000-0000-0000-0000-000000000020";
const regionalRequestId = "00000000-0000-0000-0000-000000000030";
const groupFixture = {
  id: groupDiveId,
  title: "맞춤 금액 Group Dive",
  summary: "커스텀 결제 테스트",
  description: "취향이 맞는 사람들과 만나요.",
  coverImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  gallery: [
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500'%3E%3Crect width='400' height='500' fill='%23efefef'/%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500'%3E%3Crect width='400' height='500' fill='%23d8d8d8'/%3E%3C/svg%3E",
  ],
  region: "서울",
  status: "open",
  minimumParticipants: 4,
  capacity: 8,
  participantFee: 32000,
  depositAmount: 12000,
  applicationFee: 1500,
  depositCheckoutAmount: 13500,
  finalPaymentAmount: 20000,
  finalPaymentHours: 72,
  applicantCount: 8,
  genderCounts: {
    male: 3,
    female: 4,
    other: 1,
    total: 8,
  },
  areas: [
    {
      id: "00000000-0000-0000-0000-000000000070",
      label: "서울 동북부",
      sortOrder: 0,
    },
  ],
  schedules: [
    {
      id: "00000000-0000-0000-0000-000000000071",
      label: "8월 1일 대표 모임",
      startsAt: "2026-08-01T19:00:00+09:00",
      endsAt: "2026-08-01T21:00:00+09:00",
      isGuaranteed: true,
      sortOrder: 0,
    },
    {
      id: "00000000-0000-0000-0000-000000000072",
      label: "8월 8일 추가 회차",
      startsAt: "2026-08-08T19:00:00+09:00",
      endsAt: "2026-08-08T21:00:00+09:00",
      isGuaranteed: false,
      sortOrder: 1,
    },
  ],
  questions: [
    {
      id: "00000000-0000-0000-0000-000000000073",
      prompt: "좋아하는 앨범은?",
      type: "long",
      options: [],
      required: true,
      sortOrder: 0,
    },
  ],
  sessions: [
    {
      id: "00000000-0000-0000-0000-000000000030",
      title: "서울 저녁 회차",
      area: "서울",
      venue: "DYVE",
      address: "",
      startsAt: "2026-08-20T19:00:00+09:00",
      endsAt: null,
      capacity: 8,
      assignedCount: 1,
      status: "final_payment_open",
    },
  ],
};
const applicationFixture = (status = "payment_pending") => ({
  id: applicationId,
  source: "recruitment",
  groupDiveId,
  canReapply: status === "cancelled",
  eventId: null,
  title: groupFixture.title,
  coverImage: "",
  status,
  legacyPaymentStatus: "pending",
  participantFee: groupFixture.participantFee,
  depositAmount: groupFixture.depositAmount,
  applicationFee: groupFixture.applicationFee,
  depositCheckoutAmount: groupFixture.depositCheckoutAmount,
  finalPaymentAmount: groupFixture.finalPaymentAmount,
  nickname: "테스트 다이버",
  gender: "male",
  selectedArea: null,
  selectedSchedules: [],
  availableDates: ["2026-08-01"],
  depositPaidAt: null,
  progressNoticeCount: 0,
  finalPaymentDueAt: null,
  confirmedAt: null,
  createdAt: "2026-07-29T00:00:00+09:00",
  payments: status === "deposit_paid" ? [{
    paymentId: "00000000-0000-0000-0000-000000000060",
    applicationId,
    purpose: "deposit_and_application_fee",
    amount: groupFixture.depositCheckoutAmount,
    currency: "KRW",
    provider: "mock",
    providerPaymentId: "mock-payment",
    status: "paid",
    expiresAt: "2026-07-29T01:00:00+09:00",
  }] : [],
  assignment: null,
  user: {
    profileId: "00000000-0000-0000-0000-000000000040",
    ownerId: "00000000-0000-0000-0000-000000000001",
    name: "테스트 다이버",
  },
  answers: [
    {
      questionId: "00000000-0000-0000-0000-000000000050",
      prompt: "좋아하는 장르는?",
      value: ["인디", "록"],
    },
  ],
});

const mockGroups = (page, groups = []) =>
  page.route(/\/api\/group-dives\/(?:\?|$)/, (route) =>
    json(route, 200, { data: groups, nextCursor: null }));

const mockConnections = (page) =>
  page.route(/\/api\/connections\/(?:\?|$)/, (route) =>
    json(route, 200, { data: [], nextCursor: null }));

const choose = (page, name, value) =>
  page.locator(`[data-choice-name="${name}"][data-choice-value="${value}"]`).click();

const assertNoVisibleShadow = (shadow) =>
  assert.doesNotMatch(shadow, / [1-9][\d.]*px/);

const fillInterestForm = async (page, { custom = true } = {}) => {
  await page.getByLabel("참여하고 싶은 프로그램 또는 취향").fill("검정치마 201 LP 음감회");
  if (custom) {
    await choose(page, "group-dive-region", "custom");
    await page.getByLabel("직접 입력 지역").fill("수원");
  } else {
    await choose(page, "group-dive-region", "서울 동북부");
  }
  await choose(page, "group-dive-schedule", "토요일");
  await choose(page, "group-dive-schedule", "일정 협의 가능");
  await choose(page, "group-dive-participation", "if_available");
};

const assertCopyLinesStaySingleLine = async (page) => {
  const lines = page.locator("[data-copy-line]:visible");
  const count = await lines.count();
  assert.ok(count > 0, "Expected visible Korean copy lines");
  for (let index = 0; index < count; index += 1) {
    const line = lines.nth(index);
    const result = await line.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const tops = [...range.getClientRects()].map((rect) => Math.round(rect.top));
      return {
        text: element.textContent?.trim(),
        renderedLines: new Set(tops).size,
      };
    });
    assert.equal(result.renderedLines, 1, `Copy wrapped unexpectedly: ${result.text}`);
  }
};

const assertNoHorizontalOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({
    contentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  assert.ok(
    dimensions.contentWidth <= dimensions.viewportWidth,
    `Horizontal overflow: ${dimensions.contentWidth}px > ${dimensions.viewportWidth}px`,
  );
};

const assertNoSingleCharacterLines = async (locator) => {
  const lines = await locator.evaluate((element) => {
    const text = element.textContent?.trim() ?? "";
    const grouped = new Map();
    for (let index = 0; index < text.length; index += 1) {
      const range = document.createRange();
      range.setStart(element.firstChild, index);
      range.setEnd(element.firstChild, index + 1);
      const rect = range.getBoundingClientRect();
      if (!rect.width) continue;
      const top = Math.round(rect.top);
      grouped.set(top, `${grouped.get(top) ?? ""}${text[index]}`);
    }
    return [...grouped.values()].map((line) => line.trim()).filter(Boolean);
  });
  assert.ok(
    lines.every((line) => line.replace(/\s/g, "").length > 1),
    `Single-character line found: ${JSON.stringify(lines)}`,
  );
};

const assertCheckoutContentIsVisible = async (page) => {
  const layout = await page.evaluate(() => {
    const checkout = document.querySelector("[data-group-dive-checkout]");
    const content = checkout?.children[1];
    const footer = checkout?.children[2];
    if (!checkout || !content || !footer) throw new Error("Checkout layout is incomplete");
    checkout.scrollTop = checkout.scrollHeight;
    return {
      contentBottom: content.getBoundingClientRect().bottom,
      footerTop: footer.getBoundingClientRect().top,
    };
  });
  assert.ok(layout.contentBottom <= layout.footerTop + 1, JSON.stringify(layout));
};

const assertBottomNavAnchored = async (page) => {
  const layout = await page.evaluate(() => {
    const shell = document.querySelector(".mobile-shell");
    const main = document.querySelector("main");
    const interest = document.getElementById("interest");
    const bottomNav = document.querySelector("[data-bottom-nav]");
    if (!shell || !main || !interest || !bottomNav) throw new Error("Mobile layout is incomplete");

    return {
      shellScrollTop: shell.scrollTop,
      shellBottom: shell.getBoundingClientRect().bottom,
      mainScrollTop: main.scrollTop,
      mainTop: main.getBoundingClientRect().top,
      interestTop: interest.getBoundingClientRect().top,
      bottomNavBottom: bottomNav.getBoundingClientRect().bottom,
    };
  });

  assert.equal(layout.shellScrollTop, 0);
  assert.ok(Math.abs(layout.shellBottom - layout.bottomNavBottom) < 1, JSON.stringify(layout));
  assert.ok(layout.mainScrollTop > 0, JSON.stringify(layout));
  assert.ok(layout.interestTop >= layout.mainTop - 1 && layout.interestTop <= layout.mainTop + 96, JSON.stringify(layout));
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch(
    fs.existsSync(chromePath) ? { headless: true, executablePath: chromePath } : { headless: true },
  );

  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guestPage = await guestContext.newPage();
  await mockGroups(guestPage);
  await guestPage.goto(`${baseUrl}/connection/group-dive`);
  await guestPage.getByRole("heading", { name: "내 취향, 내 동네에서 작은 Group Dive를 시작해요." }).waitFor();
  await guestPage.locator("[data-progress-notice]").waitFor();
  await assertCopyLinesStaySingleLine(guestPage);
  await assertNoHorizontalOverflow(guestPage);
  await guestPage.getByRole("heading", { name: "현재 모집 지역" }).waitFor();
  await guestPage.getByText("원하는 지역이 목록에 없어요.", { exact: true }).click();
  await guestPage.getByText("처음 접수된 새로운 권역 또는 거점이라면", { exact: false }).waitFor();
  await guestPage.locator("[data-group-dive-interest-cta]").click();
  await guestPage.waitForURL(`${baseUrl}/my`);
  const redirectTo = await guestPage.evaluate(() => history.state?.usr?.redirectTo);
  assert.equal(redirectTo, "/connection/group-dive#interest");
  await guestContext.close();

  for (const width of [320, 390, 430]) {
    const connectionContext = await browser.newContext({ viewport: { width, height: 844 } });
    await addMemberState(connectionContext);
    const connectionPage = await connectionContext.newPage();
    await mockGroups(connectionPage, [groupFixture]);
    await mockConnections(connectionPage);
    await connectionPage.goto(`${baseUrl}/connection`);
    await connectionPage.getByRole("heading", { name: "내 취향, 내 동네에서 작은 Group Dive를 시작해요." }).waitFor();
    const poster = connectionPage.getByRole("button", { name: `${groupFixture.title} 상세 보기` });
    const posterBox = await poster.boundingBox();
    assert.ok(posterBox, "Group Dive poster is missing");
    assert.ok(Math.abs(posterBox.width / posterBox.height - 210 / 297) < 0.01, JSON.stringify(posterBox));
    assert.equal((await poster.innerText()).trim(), groupFixture.title);
    const progressNotice = connectionPage.locator("[data-progress-notice]");
    const progressNoticeStyle = await progressNotice.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, fontSize: style.fontSize };
    });
    assert.deepEqual(progressNoticeStyle, { color: "rgb(104, 104, 104)", fontSize: "11px" });
    await assertCopyLinesStaySingleLine(connectionPage);
    await assertNoHorizontalOverflow(connectionPage);
    await connectionPage.getByRole("tab", { name: /Buddy Dive/ }).click();
    await connectionPage.getByRole("heading", { name: "운영팀이 직접 찾는 공연·페스티벌 동행" }).waitFor();
    assert.equal(await progressNotice.count(), 0);
    await assertCopyLinesStaySingleLine(connectionPage);
    await assertNoHorizontalOverflow(connectionPage);
    await connectionContext.close();
  }

  const memberContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await addMemberState(memberContext);
  const memberPage = await memberContext.newPage();
  await mockGroups(memberPage);
  let submittedPayload;
  let authorization;
  await memberPage.route("**/api/group-dive-regional-requests/", (route) => {
    submittedPayload = route.request().postDataJSON();
    authorization = route.request().headers().authorization;
    return json(route, 201, { data: { id: "group-dive-interest-id" } });
  });
  await memberPage.goto(`${baseUrl}/connection/group-dive`);
  await memberPage.locator("[data-group-dive-interest-cta]").click();
  await memberPage.waitForTimeout(500);
  await assertBottomNavAnchored(memberPage);
  await memberPage.locator("[data-group-dive-submit]").click();
  await memberPage.getByRole("alert").getByText("참여하고 싶은 프로그램이나 취향을 입력해 주세요.").waitFor();
  await fillInterestForm(memberPage);
  await memberPage.locator("[data-group-dive-submit]").click();
  await memberPage.getByText("지역 수요 신청이 접수됐어요.").waitFor();
  assert.equal(authorization, "Bearer group-dive-test-token");
  assert.deepEqual(submittedPayload, {
    interest: "검정치마 201 LP 음감회",
    region: "수원",
    schedules: ["토요일", "일정 협의 가능"],
    participationIntent: "if_available",
  });
  await memberContext.close();

  const errorContext = await browser.newContext({ viewport: { width: 320, height: 800 } });
  await addMemberState(errorContext);
  const errorPage = await errorContext.newPage();
  await mockGroups(errorPage);
  await errorPage.route("**/api/group-dive-regional-requests/", (route) =>
    json(route, 500, { code: "TEST_ERROR", message: "failed" }));
  await errorPage.goto(`${baseUrl}/connection/group-dive#interest`);
  await fillInterestForm(errorPage, { custom: false });
  await errorPage.locator("[data-group-dive-submit]").click();
  await errorPage.getByRole("alert").getByText("지역 수요 신청을 접수하지 못했어요. 잠시 후 다시 시도해 주세요.").waitFor();
  assert.equal(await errorPage.getByLabel("참여하고 싶은 프로그램 또는 취향").inputValue(), "검정치마 201 LP 음감회");
  await errorContext.close();

  for (const width of [320, 390, 430]) {
    const detailContext = await browser.newContext({ viewport: { width, height: 844 } });
    const detailPage = await detailContext.newPage();
    await detailPage.route(`**/api/group-dives/${groupDiveId}/`, (route) =>
      json(route, 200, { data: groupFixture }));
    await detailPage.goto(`${baseUrl}/connection/group-dive/${groupDiveId}`);
    await detailPage.getByText("총 8명 · 남자 3명 · 여자 4명 · 미공개 1명", { exact: true }).waitFor();
    await detailPage.getByText("총 참가비 ₩32,000", { exact: true }).waitFor();
    await detailPage.getByText("보증금 ₩12,000", { exact: true }).waitFor();
    assert.equal(await detailPage.getByText("신청 수수료는 결제 직전에 안내합니다.", { exact: true }).count(), 0);
    assert.equal(await detailPage.getByRole("heading", { name: "신청 전 필수 준비" }).count(), 0);
    await detailPage.getByText("빨간 점은 대표 일정입니다.", { exact: true }).waitFor();
    await detailPage.locator("#group-dive-area legend").getByText("희망 지역 *", { exact: true }).waitFor();
    await detailPage.locator("#group-dive-available-dates legend").getByText("저녁에 가능한 날짜 *", { exact: true }).waitFor();
    const representativeDayStyles = await detailPage.locator(".group-dive-guaranteed-day").evaluate((day) => ({
      boxShadow: getComputedStyle(day).boxShadow,
      dotWidth: getComputedStyle(day, "::after").width,
    }));
    assert.equal(representativeDayStyles.boxShadow, "none");
    assert.notEqual(representativeDayStyles.dotWidth, "0px");
    const gallery = detailPage.locator("[data-meeting-introduction] [data-gallery-image]");
    assert.equal(await gallery.count(), 2);
    await detailPage.getByRole("region", { name: `${groupFixture.title} 소개 사진` }).waitFor();
    const galleryBox = await gallery.first().boundingBox();
    assert.ok(galleryBox && Math.abs(galleryBox.height / galleryBox.width - 1.25) < 0.05);
    assert.equal(await detailPage.getByText("30일 안에 모임이 성사되지 않으면", { exact: false }).count(), 0);
    assert.equal(await detailPage.getByText("신청 인원과 관계없이 진행됩니다.", { exact: true }).count(), 0);
    assert.equal(await detailPage.getByText("₩1,500", { exact: true }).count(), 0);
    await detailPage.getByLabel("닉네임 *").waitFor();
    await detailPage.getByLabel("이메일 *").waitFor();
    await detailPage.getByLabel("전화번호 *").waitFor();
    const order = await detailPage.evaluate(() => {
      const basic = document.querySelector("[data-static-info]");
      const form = document.querySelector("form");
      const introduction = document.querySelector("[data-meeting-introduction]");
      if (!basic || !form || !introduction) throw new Error("Detail cards are incomplete");
      const top = (element) => element.getBoundingClientRect().top + window.scrollY;
      return [top(basic), top(introduction), top(form)];
    });
    assert.ok(order[0] < order[1] && order[1] < order[2], order.join(", "));
    await assertNoHorizontalOverflow(detailPage);
    await detailContext.close();
  }

  const legacyDetailContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const legacyDetailPage = await legacyDetailContext.newPage();
  const { genderCounts: _ignoredGenderCounts, ...legacyGroupFixture } = groupFixture;
  await legacyDetailPage.route(`**/api/group-dives/${groupDiveId}/`, (route) =>
    json(route, 200, { data: legacyGroupFixture }));
  await legacyDetailPage.goto(`${baseUrl}/connection/group-dive/${groupDiveId}`);
  await legacyDetailPage.getByText("총 8명 · 남자 0명 · 여자 0명 · 미공개 8명", { exact: true }).waitFor();
  assert.equal(await legacyDetailPage.getByRole("heading", { name: "화면을 불러오지 못했어요." }).count(), 0);
  await legacyDetailContext.close();

  const reappliedContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await addAdminState(reappliedContext);
  const reappliedPage = await reappliedContext.newPage();
  let listedApplicationStatus = "cancelled";
  await reappliedPage.route(`**/api/group-dives/${groupDiveId}/`, (route) =>
    json(route, 200, { data: groupFixture }));
  await reappliedPage.route("**/api/me", (route) =>
    json(route, 200, {
      data: {
        nickname: "admin",
        name: "admin",
        accountInfo: { email: "admin@example.com", phoneNumber: "010-1234-5678" },
      },
    }));
  await reappliedPage.route("**/api/me/group-dive-applications/", (route) =>
    json(route, 200, {
      data: [applicationFixture(listedApplicationStatus)],
      nextCursor: null,
    }));
  await reappliedPage.goto(`${baseUrl}/connection/group-dive/${groupDiveId}`);
  await reappliedPage.getByRole("heading", { name: "신청 정보" }).waitFor();
  assert.equal(await reappliedPage.getByRole("heading", { name: "이미 신청한 Group Dive예요." }).count(), 0);
  listedApplicationStatus = "deposit_paid";
  await reappliedPage.reload();
  await reappliedPage.getByRole("heading", { name: "이미 신청한 Group Dive예요." }).waitFor();
  assert.equal(await reappliedPage.getByRole("heading", { name: "신청 정보" }).count(), 0);
  await reappliedContext.close();

  const applyContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await addMemberState(applyContext);
  await applyContext.addInitScript(() => {
    window.__groupDiveNicepayRequests = [];
    window.AUTHNICE = {
      requestPay: (options) => window.__groupDiveNicepayRequests.push(options),
    };
  });
  const applyPage = await applyContext.newPage();
  applyPage.setDefaultTimeout(15_000);
  let applicationPayload;
  let contactPayload;
  let proposalPayload;
  let paymentIntentCount = 0;
  await applyPage.route(`**/api/group-dives/${groupDiveId}/`, (route) =>
    json(route, 200, { data: groupFixture }));
  await applyPage.route("**/api/me", (route) => {
    if (route.request().method() === "PATCH") contactPayload = route.request().postDataJSON();
    return json(route, 200, {
      data: {
        nickname: "테스트 다이버",
        name: "테스트 다이버",
        accountInfo: {
          email: "dive@example.com",
          phoneNumber: "010-1234-5678",
          gender: "female",
        },
      },
    });
  });
  await applyPage.route("**/api/me/group-dive-applications/", (route) =>
    json(route, 200, { data: [], nextCursor: null }));
  await applyPage.route(`**/api/group-dives/${groupDiveId}/applications/`, (route) => {
    applicationPayload = route.request().postDataJSON();
    return json(route, 201, { data: applicationFixture("payment_pending") });
  });
  await applyPage.route("**/api/group-dive-regional-requests/", (route) => {
    proposalPayload = route.request().postDataJSON();
    return json(route, 201, { data: { id: "group-dive-proposal-id", status: "received" } });
  });
  await applyPage.route(`**/api/group-dive-applications/${applicationId}/payments/`, (route) => {
    paymentIntentCount += 1;
    return json(route, 201, {
      data: {
        paymentId: "00000000-0000-0000-0000-000000000060",
        applicationId,
        purpose: "deposit_and_application_fee",
        amount: groupFixture.depositCheckoutAmount,
        currency: "KRW",
        provider: "nicepay",
        providerPaymentId: "",
        status: "ready",
        expiresAt: "2026-07-29T01:00:00+09:00",
        checkout: {
          type: "nicepay-js",
          clientId: "nicepay-client",
          method: "card",
          orderId: "group-dive-order",
          amount: groupFixture.depositCheckoutAmount,
          goodsName: groupFixture.title,
          returnUrl: `${baseUrl}/payment-return`,
        },
      },
    });
  });
  await applyPage.route(`**/api/group-dive-applications/${applicationId}/payments/*/confirm/`, (route) =>
    json(route, 200, { data: { status: "paid" } }));
  await applyPage.route(`**/api/group-dive-applications/${applicationId}/`, (route) =>
    json(route, 200, { data: applicationFixture("deposit_paid") }));
  await applyPage.goto(`${baseUrl}/connection/group-dive/${groupDiveId}`);
  const phoneInput = applyPage.getByLabel("전화번호 *");
  await phoneInput.waitFor();
  assert.equal(await phoneInput.inputValue(), "01012345678");
  await phoneInput.fill("+82 10-1234-5678");
  await phoneInput.blur();
  assert.equal(await phoneInput.inputValue(), "01012345678");
  await applyPage.getByRole("button", { name: "다른 지역 제안하기 · 무료" }).click();
  await applyPage.getByText("예: 경남 진주시 · 부산광역시 북부", { exact: true }).waitFor();
  await applyPage.getByLabel("제안할 지역").fill("부산 해운대");
  await applyPage.locator("#group-dive-proposal-dates .react-datepicker__day--001:not(.react-datepicker__day--outside-month)").click();
  await applyPage.getByRole("button", { name: "무료로 지역 제안 보내기" }).click();
  await applyPage.getByText("지역 제안이 접수됐어요.").waitFor();
  await applyPage.getByText("승인되면 정식 신청 안내를 보내드릴게요.", { exact: true }).waitFor();
  assert.deepEqual(proposalPayload, {
    groupDiveId,
    region: "부산 해운대",
    availableDates: ["2026-08-01"],
  });
  const applyButton = applyPage.getByRole("button", { name: "결제 내용 확인하고 신청" });
  const nicknameInput = applyPage.getByLabel("닉네임 *");
  const genderGroup = applyPage.getByRole("group", { name: "성별 *" });
  const maleGender = genderGroup.getByRole("radio", { name: "남성" });
  const femaleGender = genderGroup.getByRole("radio", { name: "여성" });
  assert.equal(await maleGender.isChecked(), false);
  assert.equal(await femaleGender.isChecked(), false);
  await nicknameInput.fill("");
  await applyButton.click();
  await applyPage.getByText("닉네임을 입력해 주세요.").waitFor();
  await applyPage.waitForTimeout(200);
  assert.equal(await applyPage.evaluate(() => document.activeElement?.id), "group-dive-nickname");
  assert.equal(await nicknameInput.getAttribute("aria-invalid"), "true");
  const invalidFieldStyles = await applyPage.evaluate(() => {
    const invalid = document.getElementById("group-dive-nickname");
    const neutral = document.getElementById("group-dive-email");
    if (!invalid || !neutral) throw new Error("Contact fields are missing");
    return {
      invalidBorder: getComputedStyle(invalid).borderColor,
      neutralBorder: getComputedStyle(neutral).borderColor,
      invalidShadow: getComputedStyle(invalid).boxShadow,
    };
  });
  assert.equal(invalidFieldStyles.invalidBorder, invalidFieldStyles.neutralBorder);
  assertNoVisibleShadow(invalidFieldStyles.invalidShadow);
  await nicknameInput.fill("테스트 다이버");
  await applyButton.click();
  await applyPage.getByText("성별을 선택해 주세요.").waitFor();
  await applyPage.waitForTimeout(50);
  assert.equal(await applyPage.evaluate(() => document.activeElement?.id), "group-dive-gender");
  await maleGender.check();
  for (const width of [320, 390, 430]) {
    await applyPage.setViewportSize({ width, height: 844 });
    await assertNoHorizontalOverflow(applyPage);
  }
  await applyPage.setViewportSize({ width: 390, height: 844 });
  await applyButton.click();
  await applyPage.getByText("희망 지역을 선택해 주세요.").waitFor();
  await applyPage.waitForTimeout(50);
  assert.equal(await applyPage.evaluate(() => document.activeElement?.id), "group-dive-area");
  assertNoVisibleShadow(await applyPage.locator("#group-dive-area").evaluate((field) => getComputedStyle(field).boxShadow));
  await applyPage.locator("#group-dive-area").getByRole("button", { name: "선택" }).click();
  await applyPage.mouse.move(0, 0);
  await applyPage.waitForTimeout(200);
  const selectedAreaButtonStyle = await applyPage.getByRole("button", { name: "선택됨" }).evaluate((button) => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--color-primary)";
    document.body.appendChild(probe);
    const result = {
      backgroundColor: getComputedStyle(button).backgroundColor,
      primaryColor: getComputedStyle(probe).backgroundColor,
      color: getComputedStyle(button).color,
    };
    probe.remove();
    return result;
  });
  assert.equal(selectedAreaButtonStyle.backgroundColor, selectedAreaButtonStyle.primaryColor);
  assert.equal(selectedAreaButtonStyle.color, "rgb(255, 255, 255)");
  await applyButton.click();
  await applyPage.getByText("저녁 시간에 참여 가능한 날짜를 하나 이상 선택해 주세요.").waitFor();
  await applyPage.waitForTimeout(50);
  assert.equal(await applyPage.evaluate(() => document.activeElement?.id), "group-dive-available-dates");
  assertNoVisibleShadow(await applyPage.locator("#group-dive-available-dates").evaluate((field) => getComputedStyle(field).boxShadow));
  await applyPage.locator("#group-dive-available-dates .react-datepicker__day--001:not(.react-datepicker__day--outside-month)").click();
  await applyPage.locator("#group-dive-available-dates").getByText("선택한 날짜 8/1", { exact: true }).waitFor();
  await applyButton.click();
  await applyPage.getByText("필수 질문에 답해 주세요.").waitFor();
  await applyPage.waitForTimeout(50);
  assert.equal(
    await applyPage.evaluate(() => document.activeElement?.id),
    `group-dive-question-${groupFixture.questions[0].id}`,
  );
  assertNoVisibleShadow(
    await applyPage.locator(`#group-dive-question-${groupFixture.questions[0].id}`).evaluate((field) => getComputedStyle(field).boxShadow),
  );
  const questionBorderColors = await applyPage.evaluate((questionId) => {
    const question = document.getElementById(`group-dive-question-${questionId}`);
    const agreements = document.getElementById("group-dive-agreements");
    const textarea = question?.querySelector("textarea");
    const neutral = document.getElementById("group-dive-email");
    if (!question || !agreements || !textarea || !neutral) {
      throw new Error("Question validation fields are missing");
    }
    return [
      getComputedStyle(question).borderColor,
      getComputedStyle(agreements).borderColor,
      getComputedStyle(textarea).borderColor,
      getComputedStyle(neutral).borderColor,
    ];
  }, groupFixture.questions[0].id);
  assert.equal(questionBorderColors[0], questionBorderColors[1]);
  assert.equal(questionBorderColors[2], questionBorderColors[3]);
  const questionBackgroundColors = await applyPage.evaluate((questionId) => {
    const question = document.getElementById(`group-dive-question-${questionId}`);
    const textarea = question?.querySelector("textarea");
    if (!question || !textarea) throw new Error("Question fields are missing");
    return [
      getComputedStyle(question).backgroundColor,
      getComputedStyle(textarea).backgroundColor,
    ];
  }, groupFixture.questions[0].id);
  assert.notEqual(questionBackgroundColors[0], questionBackgroundColors[1]);
  await applyPage.getByRole("group", { name: "좋아하는 앨범은? *" }).getByRole("textbox").fill("201");
  await applyButton.click();
  await applyPage.getByText("필수 동의 항목을 모두 확인해 주세요.").waitFor();
  await applyPage.waitForTimeout(50);
  assert.equal(await applyPage.evaluate(() => document.activeElement?.id), "group-dive-agreements");
  assertNoVisibleShadow(await applyPage.locator("#group-dive-agreements").evaluate((field) => getComputedStyle(field).boxShadow));
  await applyPage.getByText("모임 운영과 안내를 위한 개인정보 수집·이용에 동의합니다.", { exact: true }).click();
  await applyButton.click();
  await applyPage.locator("[data-group-dive-checkout]").waitFor();
  await applyPage.locator("[data-app-top-bar]").getByText("결제하기", { exact: true }).waitFor();
  await applyPage.getByText("보증금", { exact: true }).waitFor();
  await applyPage.getByText("신청 수수료", { exact: true }).waitFor();
  await applyPage.getByText("총 결제금액", { exact: true }).waitFor();
  await applyPage.getByText("₩ 12,000", { exact: true }).waitFor();
  await applyPage.getByText("₩ 1,500", { exact: true }).waitFor();
  await applyPage.getByText("₩ 13,500", { exact: true }).waitFor();
  const checkoutNotices = applyPage.locator("[data-group-dive-checkout] .app-bottom-bar p");
  assert.equal(await checkoutNotices.count(), 2);
  await applyPage.getByText("신청 수수료는 이중 부과되지 않습니다.", { exact: true }).waitFor();
  await applyPage.getByText("회차 배정 전 신청을 취소하면 보증금을 환불합니다.", { exact: true }).waitFor();
  assert.equal(await applyPage.getByText("전체 결제 예정액", { exact: true }).count(), 0);
  assert.equal(await applyPage.getByText("모임 확정 후 잔금", { exact: false }).count(), 0);
  assert.equal(await applyPage.getByRole("heading", { name: "결제 전 마지막 확인" }).count(), 0);
  assert.equal(contactPayload, undefined);
  assert.equal(applicationPayload, undefined);
  assert.equal(paymentIntentCount, 0);
  for (const width of [320, 390, 430]) {
    await applyPage.setViewportSize({ width, height: 844 });
    await assertNoHorizontalOverflow(applyPage);
    await assertCheckoutContentIsVisible(applyPage);
    await assertNoSingleCharacterLines(
      applyPage.getByText("신청 수수료는 이중 부과되지 않습니다.", { exact: true }),
    );
    await assertNoSingleCharacterLines(
      applyPage.getByText("회차 배정 전 신청을 취소하면 보증금을 환불합니다.", { exact: true }),
    );
  }
  await applyPage.getByRole("button", { name: "뒤로가기" }).click();
  await applyPage.getByRole("heading", { name: "신청 정보" }).waitFor();
  assert.equal(await phoneInput.inputValue(), "01012345678");
  assert.equal(await maleGender.isChecked(), true);
  assert.equal(await applyPage.getByRole("button", { name: "선택됨" }).count(), 1);
  assert.equal(
    await applyPage.getByRole("group", { name: "좋아하는 앨범은? *" }).getByRole("textbox").inputValue(),
    "201",
  );
  assert.equal(contactPayload, undefined);
  assert.equal(applicationPayload, undefined);
  assert.equal(paymentIntentCount, 0);
  await applyButton.click();
  await applyPage.locator("[data-group-dive-checkout]").waitFor();
  await applyPage.getByRole("button", { name: "결제하기" }).click();
  await applyPage.getByRole("button", { name: "결제창 열기" }).waitFor();
  assert.equal(paymentIntentCount, 1);
  assert.deepEqual(contactPayload, {
    email: "dive@example.com",
    phoneNumber: "01012345678",
  });
  assert.deepEqual(applicationPayload, {
    nickname: "테스트 다이버",
    gender: "male",
    selectedAreaId: groupFixture.areas[0].id,
    selectedScheduleIds: [groupFixture.schedules[0].id],
    availableDates: ["2026-08-01"],
    answers: [{ questionId: groupFixture.questions[0].id, value: "201" }],
    agreements: { privacy: true },
  });
  await applyPage.getByRole("button", { name: "결제창 열기" }).click();
  assert.equal(
    await applyPage.evaluate(() => window.__groupDiveNicepayRequests.length),
    1,
  );
  await applyContext.close();

  const retryContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await addMemberState(retryContext);
  const retryPage = await retryContext.newPage();
  let depositPurpose;
  let paymentConfirmed = false;
  await retryPage.route(`**/api/group-dive-applications/${applicationId}/`, (route) =>
    json(route, 200, { data: applicationFixture(paymentConfirmed ? "deposit_paid" : "payment_pending") }));
  await retryPage.route(`**/api/group-dive-applications/${applicationId}/payments/`, (route) => {
    depositPurpose = route.request().postDataJSON()?.purpose;
    return json(route, 201, {
      data: {
        paymentId: "00000000-0000-0000-0000-000000000060",
        applicationId,
        purpose: "deposit_and_application_fee",
        amount: groupFixture.depositCheckoutAmount,
        currency: "KRW",
        provider: "mock",
        providerPaymentId: "mock-payment",
        confirmationToken: "mock-token",
        status: "authorized",
        expiresAt: "2026-07-29T01:00:00+09:00",
      },
    });
  });
  await retryPage.route(`**/api/group-dive-applications/${applicationId}/payments/*/confirm/`, (route) => {
    paymentConfirmed = true;
    return json(route, 200, { data: { status: "paid" } });
  });
  await retryPage.goto(`${baseUrl}/connection/group-dive/applications/${applicationId}`);
  await retryPage.getByText("결제 내용을 확인하고 보증 신청 결제를 마치면 모집 추적이 시작돼요.").waitFor();
  const retryButton = retryPage.getByRole("button", { name: "보증 신청 결제 내용 확인" });
  await retryButton.click();
  await retryPage.getByRole("heading", { name: "결제 전 마지막 확인" }).waitFor();
  assert.equal(depositPurpose, undefined);
  await retryPage.getByRole("button", { name: "닫기" }).click();
  assert.equal(depositPurpose, undefined);
  await retryButton.click();
  await retryPage.getByRole("button", { name: "₩13,500 결제하고 신청" }).click();
  await retryPage.getByText("신청 완료", { exact: true }).waitFor();
  assert.equal(depositPurpose, "deposit_and_application_fee");
  await retryContext.close();

  const cancelledContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await addMemberState(cancelledContext);
  const cancelledPage = await cancelledContext.newPage();
  await cancelledPage.route(`**/api/group-dive-applications/${applicationId}/`, (route) =>
    json(route, 200, { data: applicationFixture("cancelled") }));
  await cancelledPage.goto(`${baseUrl}/connection/group-dive/applications/${applicationId}`);
  await cancelledPage.getByRole("heading", { name: "내 신청이 취소됐어요" }).waitFor();
  await cancelledPage.getByText("이 Group Dive의 전체 모집은 계속 진행 중입니다.", { exact: true }).waitFor();
  await cancelledPage.getByText("원하면 다시 신청할 수 있어요.", { exact: true }).waitFor();
  await cancelledPage.getByRole("button", { name: "다시 신청하기" }).waitFor();
  assert.equal(await cancelledPage.getByText(/모집 마감|신청 종료/).count(), 0);
  for (const width of [320, 390, 430]) {
    await cancelledPage.setViewportSize({ width, height: 844 });
    await assertNoHorizontalOverflow(cancelledPage);
  }
  await cancelledContext.close();

  const finalContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await addMemberState(finalContext);
  const finalPage = await finalContext.newPage();
  let finalPurpose;
  let finalConfirmed = false;
  const refundedFinalApplication = () => ({
    ...applicationFixture(finalConfirmed ? "confirmed" : "assigned_final_payment_pending"),
    payments: [
      {
        purpose: "deposit_and_application_fee",
        status: "partially_refunded",
      },
    ],
  });
  await finalPage.route(`**/api/group-dive-applications/${applicationId}/`, (route) =>
    json(route, 200, { data: refundedFinalApplication() }));
  await finalPage.route(`**/api/group-dive-applications/${applicationId}/payments/`, (route) => {
    finalPurpose = route.request().postDataJSON()?.purpose;
    return json(route, 201, {
      data: {
        paymentId: "00000000-0000-0000-0000-000000000061",
        applicationId,
        purpose: "final_payment",
        amount: groupFixture.participantFee,
        currency: "KRW",
        provider: "mock",
        providerPaymentId: "mock-final-payment",
        confirmationToken: "mock-final-token",
        status: "authorized",
        expiresAt: "2026-07-29T01:00:00+09:00",
      },
    });
  });
  await finalPage.route(`**/api/group-dive-applications/${applicationId}/payments/*/confirm/`, (route) => {
    finalConfirmed = true;
    return json(route, 200, { data: { status: "paid" } });
  });
  await finalPage.goto(`${baseUrl}/connection/group-dive/applications/${applicationId}`);
  await finalPage.getByRole("button", { name: "잔금 결제 내용 확인" }).click();
  await finalPage.getByRole("heading", { name: "잔금 결제 확인" }).waitFor();
  await finalPage.getByText("환불된 보증금").waitFor();
  await finalPage.getByText("추가 수수료").waitFor();
  await finalPage.getByText("₩0", { exact: true }).waitFor();
  await finalPage.getByText("보증금이 이미 환불되어 이번에는 총 참가비 전액을 결제합니다.").waitFor();
  assert.equal(finalPurpose, undefined);
  await finalPage.getByRole("button", { name: "₩32,000 잔금 결제" }).click();
  await finalPage.getByText("참여 확정", { exact: true }).waitFor();
  assert.equal(finalPurpose, "final_payment");
  await finalContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await addAdminState(adminContext);
  const adminPage = await adminContext.newPage();
  let regionalApproved = false;
  let regionalApprovalPayload;
  await adminPage.route("**/api/admin/group-dives/", (route) =>
    json(route, 200, { data: [groupFixture], nextCursor: null }));
  await adminPage.route("**/api/admin/group-dive-regional-requests/", (route) =>
    json(route, 200, {
      data: [{
        id: regionalRequestId,
        interest: groupFixture.title,
        region: regionalApproved ? "부산광역시 북부" : "부산 해운대",
        availableDates: ["2026-08-01"],
        status: regionalApproved ? "invited" : "received",
        groupDiveId,
        groupDiveTitle: groupFixture.title,
      }],
      nextCursor: null,
    }));
  await adminPage.route(`**/api/admin/group-dive-regional-requests/${regionalRequestId}/approve/`, (route) => {
    regionalApprovalPayload = route.request().postDataJSON();
    regionalApproved = true;
    return json(route, 200, {
      data: {
        id: regionalRequestId,
        status: "invited",
        groupDiveId,
        area: { id: "00000000-0000-0000-0000-000000000031", label: "부산광역시 북부" },
        affectedCount: 1,
      },
    });
  });
  await adminPage.route(`**/api/admin/group-dives/${groupDiveId}/applications/`, (route) =>
    json(route, 200, { data: [applicationFixture("deposit_paid")], nextCursor: null }));
  await adminPage.goto(`${baseUrl}/admin/group-dives`);
  await adminPage.getByText("신청자가 생긴 뒤에는 약정 금액 보호를 위해", { exact: false }).waitFor();
  assert.equal(await adminPage.getByLabel("상태").locator('option[value="closed"]').count(), 0);
  assert.equal(await adminPage.getByLabel("참가비").isDisabled(), true);
  assert.equal(await adminPage.getByLabel("보증금").isDisabled(), true);
  assert.equal(await adminPage.getByLabel("신청 수수료").isDisabled(), true);
  await adminPage.getByRole("button", { name: "신청자" }).click();
  await adminPage.getByText("질문 답변 보기").click();
  await adminPage.getByText("인디, 록").waitFor();
  await adminPage.getByRole("button", { name: "회차 / 배정" }).click();
  await adminPage.getByText("잔금 결제 중").waitFor();
  await adminPage.getByRole("button", { name: "권역 제안 검토" }).first().click();
  await adminPage.getByLabel("최종 권역명").fill("부산광역시 북부");
  await adminPage.getByRole("button", { name: "권역 승인" }).click();
  await adminPage.getByText("승인 완료", { exact: true }).waitFor();
  assert.deepEqual(regionalApprovalPayload, { region: "부산광역시 북부" });
  await adminContext.close();

  const createContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await addAdminState(createContext);
  const createPage = await createContext.newPage();
  const adminCreatePayloads = [];
  await createPage.route("**/api/admin/group-dives/", (route) => {
    if (route.request().method() === "POST") {
      const contentType = route.request().headers()["content-type"] ?? "";
      adminCreatePayloads.push(
        contentType.includes("multipart/form-data")
          ? route.request().postData()
          : route.request().postDataJSON(),
      );
      return json(route, 201, { data: groupFixture });
    }
    return json(route, 200, { data: [], nextCursor: null });
  });
  await createPage.route("**/api/admin/group-dive-regional-requests/", (route) =>
    json(route, 200, { data: [], nextCursor: null }));
  await createPage.route(`**/api/admin/group-dives/${groupDiveId}/applications/`, (route) =>
    json(route, 200, { data: [], nextCursor: null }));
  await createPage.goto(`${baseUrl}/admin/group-dives`);
  await createPage.getByText("불러오는 중...").waitFor({ state: "hidden" });
  await createPage.getByRole("button", { name: "새 모집" }).click();
  await createPage.locator("#group-dive-cover").setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await createPage.getByRole("img", { name: "Group Dive 커버 미리보기" }).waitFor();
  await createPage.getByRole("button", { name: "다시 선택" }).waitFor();
  await createPage.getByRole("button", { name: "삭제" }).click();
  await createPage.getByRole("button", { name: "사진 선택 JPG, PNG, WEBP 또는 GIF" }).waitFor();
  await createPage.getByRole("button", { name: "다음: 옵션·질문" }).click();
  await createPage.getByRole("alert").getByText("모집명을 입력해 주세요.").waitFor();
  await createPage.getByLabel("모집명").fill("새 Group Dive");
  await createPage.getByLabel("상태").selectOption("open");
  await createPage.getByRole("button", { name: "다음: 옵션·질문" }).click();
  await createPage.getByRole("alert").getByText("공개 모집에는 포스터 이미지를 등록해 주세요.").waitFor();
  await createPage.locator("#group-dive-cover").setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await createPage.getByRole("img", { name: "Group Dive 커버 미리보기" }).waitFor();
  await createPage.locator("#group-dive-gallery").setInputFiles([
    {
      name: "intro-1.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    },
    {
      name: "intro-2.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    },
  ]);
  assert.equal(await createPage.locator("[data-group-dive-gallery-editor] img").count(), 2);
  await createPage.getByRole("button", { name: "2번째 사진 앞으로 이동" }).click();
  await createPage.getByRole("button", { name: "다음: 옵션·질문" }).click();
  await createPage.getByRole("button", { name: "+ 권역 추가" }).click();
  await createPage.getByLabel("권역 1").fill("서울 동북부");
  await createPage.getByRole("button", { name: "+ 일정 추가" }).click();
  await createPage.getByLabel("일정 이름").fill("8월 1일 대표 모임");
  await createPage.getByRole("button", { name: "날짜 선택" }).click();
  await createPage.locator(".react-datepicker__day:not(.react-datepicker__day--outside-month)").first().click();
  await createPage.getByLabel("시작 시간").selectOption("19:00");
  await createPage.getByRole("button", { name: "1시간 30분" }).click();
  await createPage.getByText(/19:00–20:30/).waitFor();
  assert.equal(
    await createPage.getByRole("radio", { name: "대표 일정 · 확정 진행" }).isChecked(),
    true,
  );
  await createPage.getByRole("button", { name: "+ 질문 추가" }).click();
  await createPage.getByLabel("질문 1").fill("좋아하는 장르는?");
  await createPage.getByLabel("답변 유형").selectOption("multiple");
  await createPage.getByRole("button", { name: "+ 선택지 추가" }).click();
  await createPage.getByLabel("1번째 질문의 1번째 선택지").fill("록");
  assert.equal(await createPage.getByLabel("권역 1").inputValue(), "서울 동북부");
  assert.equal(await createPage.getByLabel("일정 이름").inputValue(), "8월 1일 대표 모임");
  assert.equal(await createPage.getByLabel("질문 1").inputValue(), "좋아하는 장르는?");
  await createPage.getByRole("button", { name: "+ 1주 뒤 후보 추가" }).click();
  assert.equal(await createPage.getByLabel("일정 이름").count(), 2);
  await assertNoHorizontalOverflow(createPage);
  await createPage.getByRole("button", { name: "모집 만들기" }).click();
  for (let attempt = 0; attempt < 50 && adminCreatePayloads.length === 0; attempt += 1) await delay(20);
  assert.ok(
    adminCreatePayloads.length,
    `Admin create did not submit: ${(await createPage.getByRole("alert").allTextContents()).join(" | ")}`,
  );
  const adminCreatePayload = adminCreatePayloads[0];
  assert.equal(adminCreatePayloads.length, 1, JSON.stringify(adminCreatePayloads));
  assert.equal(typeof adminCreatePayload, "string");
  const adminAreas = JSON.parse(multipartField(adminCreatePayload, "areas"));
  const adminSchedules = JSON.parse(multipartField(adminCreatePayload, "schedules"));
  const adminQuestions = JSON.parse(multipartField(adminCreatePayload, "questions"));
  const adminGallery = JSON.parse(multipartField(adminCreatePayload, "gallery"));
  assert.deepEqual(adminAreas, [
    { label: "서울 동북부", sortOrder: 0 },
  ], JSON.stringify(adminCreatePayload));
  assert.equal(adminSchedules[0].label, "8월 1일 대표 모임");
  assert.equal(adminSchedules[0].isGuaranteed, true);
  assert.equal(adminSchedules[1].isGuaranteed, false);
  assert.deepEqual(adminQuestions, [
    {
      prompt: "좋아하는 장르는?",
      type: "multiple",
      options: ["록"],
      required: true,
      sortOrder: 0,
    },
  ]);
  assert.deepEqual(adminGallery, []);
  assert.ok(
    adminCreatePayload.indexOf('filename="intro-2.png"') <
      adminCreatePayload.indexOf('filename="intro-1.png"'),
    adminCreatePayload,
  );
  await createContext.close();

  console.log("Group Dive regression check passed.");
} finally {
  await browser?.close();
  stopServer();
}
