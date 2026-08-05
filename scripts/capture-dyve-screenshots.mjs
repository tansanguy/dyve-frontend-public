import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const backendRoot = path.resolve(process.env.DYVE_BACKEND_ROOT || path.join(repoRoot, "backend"));
const outputRoot = path.resolve(process.env.DYVE_CAPTURE_OUTPUT || path.join(frontendRoot, "artifacts", "dyve-capture"));
const screenshotsDir = path.join(outputRoot, "screenshots");
const sheetDir = path.join(outputRoot, "sheet");
const sheetHtmlPath = path.join(sheetDir, "contact-sheet.html");
const sheetPngPath = path.join(sheetDir, "contact-sheet.png");
const qaDbPath = path.join("/tmp", `dyve-qa-${process.pid}.sqlite3`);
const strictAudit = process.argv.includes("--assert");

const systemChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chromePath = process.env.DYVE_CHROME_PATH || (fs.existsSync(systemChromePath) ? systemChromePath : chromium.executablePath());
const backendPython = process.env.DYVE_PYTHON || (fs.existsSync(path.join(backendRoot, "venv", "bin", "python"))
  ? path.join(backendRoot, "venv", "bin", "python")
  : "python3");
const frontendUrl = "http://127.0.0.1:4180";
const backendUrl = "http://127.0.0.1:8010";

const routes = [
  { key: "home-guest", path: "/", name: "Home", context: "guest", viewport: "mobile" },
  { key: "onboarding", path: "/onboarding", name: "Onboarding", context: "guest", viewport: "mobile" },
  { key: "ticket", path: "/ticket", name: "Ticket", context: "guest", viewport: "mobile" },
  { key: "crowdfunding", path: "/crowdfunding", name: "Crowdfunding", context: "guest", viewport: "mobile" },
  { key: "network", path: "/network", name: "Network", context: "guest", viewport: "mobile" },
  { key: "search", path: "/search", name: "Search", context: "guest", viewport: "mobile" },
  { key: "notifications-guest", path: "/notifications", name: "Notifications", context: "guest", viewport: "mobile" },
  { key: "my-guest", path: "/my", name: "My", context: "guest", viewport: "mobile" },
  { key: "auth-callback", path: "/auth/callback/kakao", name: "OAuth Callback", context: "guest", viewport: "mobile" },
  { key: "liked-events", path: "/my/likes", name: "Liked Events", context: "member", viewport: "mobile" },
  { key: "liked-artists", path: "/my/liked-artists", name: "Liked Artists", context: "member", viewport: "mobile" },
  { key: "liked-venues", path: "/my/liked-venues", name: "Liked Venues", context: "member", viewport: "mobile" },
  { key: "performance", path: "/performance/__EVENT_ID__", name: "Performance Detail", context: "guest", viewport: "mobile" },
  { key: "artist", path: "/artist/__PROFILE_ARTIST_ID__", name: "Artist Detail", context: "guest", viewport: "mobile" },
  { key: "venue", path: "/venue/__PROFILE_VENUE_ID__", name: "Venue Detail", context: "guest", viewport: "mobile" },
  { key: "checkout", path: "/checkout/__EVENT_ID__", name: "Checkout", context: "guest", viewport: "mobile" },
  { key: "checkout-seats-6x10", path: "/checkout/__EVENT_ID__", name: "Checkout Seats 6x10", context: "member", viewport: "mobile", mockSeatLayout: { rows: 6, cols: 10 } },
  { key: "checkout-seats-10x12", path: "/checkout/__EVENT_ID__", name: "Checkout Seats 10x12", context: "member", viewport: "mobile", mockSeatLayout: { rows: 10, cols: 12 } },
  { key: "checkout-seats-12x15", path: "/checkout/__EVENT_ID__", name: "Checkout Seats 12x15", context: "member", viewport: "mobile", mockSeatLayout: { rows: 12, cols: 15 } },
  { key: "checkout-seats-legacy-13x15", path: "/checkout/__EVENT_ID__", name: "Checkout Unsupported Seats 13x15", context: "member", viewport: "mobile", mockSeatLayout: { rows: 13, cols: 15 } },
  { key: "project", path: "/project/__PROJECT_ID__", name: "Project Detail", context: "guest", viewport: "mobile" },
  { key: "project-pledge", path: "/project/__PROJECT_ID__/pledge", name: "Project Pledge", context: "member", viewport: "mobile" },
  { key: "payment-complete", path: "/payment-complete", name: "Payment Complete", context: "guest", viewport: "mobile" },
  { key: "checkin-scan", path: "/checkin", name: "QR Checkin", context: "member", viewport: "mobile" },
  { key: "checkin-audience", path: "/checkin/__EVENT_ID__", name: "Audience Checkin", context: "guest", viewport: "mobile" },
  { key: "register-performance", path: "/register/performance", name: "Register Performance", context: "member", viewport: "mobile" },
  { key: "register-performance-edit", path: "/register/performance/__EVENT_ID__", name: "Edit Performance", context: "member", viewport: "mobile" },
  { key: "my-events-edit", path: "/my/events/edit", name: "My Events Edit", context: "member", viewport: "mobile" },
  { key: "register-artist", path: "/register/artist", name: "Register Artist", context: "member", viewport: "mobile" },
  { key: "register-artist-edit", path: "/register/artist/__PROFILE_ARTIST_ID__", name: "Edit Artist", context: "member", viewport: "mobile" },
  { key: "register-venue", path: "/register/venue", name: "Register Venue", context: "member", viewport: "mobile" },
  { key: "register-venue-edit", path: "/register/venue/__PROFILE_VENUE_ID__", name: "Edit Venue", context: "member", viewport: "mobile" },
  { key: "venue-schedule", path: "/my/venue/__PROFILE_VENUE_ID__/schedule", name: "Venue Schedule", context: "member", viewport: "mobile" },
  { key: "register-project", path: "/register/project", name: "Register Project", context: "member", viewport: "mobile" },
  { key: "registration-complete-performance", path: "/registration-complete/performance", name: "Performance Registration Complete", context: "guest", viewport: "mobile", expectedHeading: "공연 등록 완료" },
  { key: "registration-complete-artist", path: "/registration-complete/artist", name: "Artist Registration Complete", context: "guest", viewport: "mobile", expectedHeading: "프로필 생성 요청 완료" },
  { key: "registration-complete-venue", path: "/registration-complete/venue", name: "Venue Registration Complete", context: "guest", viewport: "mobile", expectedHeading: "베뉴 등록 요청 완료" },
  { key: "registration-complete-project", path: "/registration-complete/project", name: "Project Registration Complete", context: "guest", viewport: "mobile", expectedHeading: "창작 후원 등록 완료" },
  { key: "chat-start", path: "/chat/venue/__PROFILE_VENUE_ID__", name: "Chat Start", context: "admin", viewport: "mobile" },
  { key: "chats", path: "/chats", name: "Chat List", context: "admin", viewport: "mobile" },
  { key: "chat-detail", path: "/chats/__CHAT_ID__", name: "Chat Detail", context: "admin", viewport: "mobile" },
  { key: "contract-guide", path: "/chats/__CHAT_ID__/contract/guide", name: "Contract Guide", context: "admin", viewport: "mobile" },
  { key: "chat-contract", path: "/chats/__CHAT_ID__/contract/new", name: "Contract Wizard", context: "admin", viewport: "mobile" },
  { key: "contract-detail", path: "/contract/__CONTRACT_ID__", name: "Contract Detail", context: "admin", viewport: "mobile" },
  { key: "inquiry", path: "/inquiries/new", name: "Inquiry", context: "guest", viewport: "mobile" },
  { key: "connection", path: "/connection", name: "Connection", context: "member", viewport: "mobile" },
  { key: "group-dive-guest", path: "/connection/group-dive", name: "Group Dive Public", context: "guest", viewport: "mobile" },
  { key: "group-dive-member", path: "/connection/group-dive#interest", name: "Group Dive Interest", context: "member", viewport: "mobile" },
  { key: "connection-request", path: "/connection/new", name: "Buddy Dive Request", context: "member", viewport: "mobile" },
  { key: "connection-detail", path: "/connection/__CONNECTION_ID__", name: "Buddy Dive Detail", context: "member", viewport: "mobile" },
  { key: "buddy-payment-failed", path: "/connection/__CONNECTION_ID__", name: "Buddy Payment Failed", context: "member", viewport: "mobile", mockPaymentStatus: "failed" },
  { key: "buddy-payment-expired", path: "/connection/__CONNECTION_ID__", name: "Buddy Payment Expired", context: "member", viewport: "mobile", mockPaymentStatus: "expired" },
  { key: "connection-edit", path: "/admin/connections/__CONNECTION_ID__/edit", name: "Buddy Dive Edit", context: "admin", viewport: "desktop" },
  { key: "connection-manage-new", path: "/admin/connections/new", name: "Buddy Dive Create", context: "admin", viewport: "desktop" },
  { key: "connection-applications", path: "/admin/connections/__CONNECTION_ID__/applications", name: "Buddy Dive Applicants", context: "admin", viewport: "desktop" },
  { key: "my-connection-applications", path: "/my/connection-applications", name: "My Buddy Applications", context: "member", viewport: "mobile" },
  { key: "chat-invitations", path: "/chat-invitations", name: "Chat Invitations", context: "member", viewport: "mobile" },
  { key: "group-checkout", path: "/checkout/__GROUP_EVENT_ID__", name: "Group Dive Checkout", context: "member", viewport: "mobile" },
  { key: "admin-root", path: "/admin", name: "Admin Dashboard", context: "admin", viewport: "desktop" },
  { key: "admin-inquiries", path: "/admin/inquiries", name: "Admin Inquiries", context: "admin", viewport: "desktop" },
  { key: "admin-chats", path: "/admin/chats", name: "Admin Chats", context: "admin", viewport: "desktop" },
  { key: "admin-picks", path: "/admin/picks", name: "Admin Picks", context: "admin", viewport: "desktop" },
  { key: "admin-block", path: "/admin/block", name: "Admin Block", context: "admin", viewport: "desktop" },
  { key: "admin-profiles", path: "/admin/profiles", name: "Admin Profiles", context: "admin", viewport: "desktop" },
  { key: "admin-business", path: "/admin/business-registrations", name: "Admin Business", context: "admin", viewport: "desktop" },
  { key: "admin-logs", path: "/admin/logs", name: "Admin Logs", context: "admin", viewport: "desktop" },
  { key: "admin-stats", path: "/admin/stats", name: "Admin Stats", context: "admin", viewport: "desktop" },
  { key: "admin-settlements", path: "/admin/settlements", name: "Admin Settlements", context: "admin", viewport: "desktop" },
  { key: "admin-profile-edit", path: "/admin/profiles/__PENDING_ARTIST_ID__?type=artist", name: "Admin Profile Edit", context: "admin", viewport: "desktop" },
  { key: "admin-connections", path: "/admin/connections", name: "Admin Connections", context: "admin", viewport: "desktop" },
  { key: "admin-event-approvals", path: "/admin/event-approvals", name: "Admin Event Approvals", context: "admin", viewport: "desktop" },
  { key: "admin-connection-hosts", path: "/admin/connection-hosts", name: "Admin Connection Hosts", context: "admin", viewport: "desktop" },
  { key: "not-found", path: "/no-such-page", name: "404", context: "guest", viewport: "mobile" },
];

const fallbackIds = {
  event: "00000000-0000-0000-0000-000000000001",
  project: "00000000-0000-0000-0000-000000000101",
  artistProfile: "00000000-0000-0000-0000-000000000201",
  venueProfile: "00000000-0000-0000-0000-000000000202",
  chat: "00000000-0000-0000-0000-000000000301",
  contract: "00000000-0000-0000-0000-000000000401",
  connection: "11939fb0-9886-5b18-ad97-d80950858621",
  groupEvent: "65b6c337-ed30-5f8a-8748-d5394ed8fc31",
};

const viewportByKind = {
  compact: { width: 320, height: 800 },
  mobile: { width: 390, height: 844 },
  wideMobile: { width: 450, height: 900 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 1200 },
};
const runningProcesses = [];

const selectedRouteKeys = new Set(
  (process.env.DYVE_CAPTURE_ROUTES ?? "").split(",").map((value) => value.trim()).filter(Boolean),
);
const selectedRoutes = selectedRouteKeys.size > 0
  ? routes.filter((route) => selectedRouteKeys.has(route.key))
  : routes;

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const assertPortAvailable = (port) => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", (error) => reject(new Error(`127.0.0.1:${port} 포트를 사용할 수 없습니다: ${error.message}`)));
  server.listen(port, "127.0.0.1", () => server.close(resolve));
});

const run = async (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(child);
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });

const startDetached = (command, args, options = {}) => {
  const child = spawn(command, args, { stdio: "inherit", detached: true, ...options });
  child.unref();
  runningProcesses.push(child);
  return child;
};

const stopRunningProcesses = () => {
  for (const child of runningProcesses) {
    try { process.kill(-child.pid); } catch {}
  }
};

process.once("SIGINT", () => {
  stopRunningProcesses();
  fs.rmSync(qaDbPath, { force: true });
  process.exit(130);
});

const waitForHttp = async (url, timeoutMs = 120000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) return;
    } catch {}
    await delay(1000);
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const authState = {
  guest: null,
};

const encodeJson = (value) => JSON.stringify(value);

const setAuthState = async (page, context) => {
  const state = authState[context];
  await page.addInitScript((payload) => {
    localStorage.clear();
    if (!payload) return;
    localStorage.setItem("dyve_access_token", payload.accessToken);
    localStorage.setItem("dyve_user", JSON.stringify(payload.user));
    localStorage.setItem("dyve_user_id", payload.userId);
    localStorage.setItem("dyve_auth_mode", payload.user.role === "admin" ? "member" : "member");
    localStorage.setItem("dyve_dev_user_key", payload.user.id);
  }, state);
};

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${backendUrl}${path}`, {
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    method: options.method ?? "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) return null;
  return response.json();
};

const loginDev = async (userKey) => {
  const payload = await apiRequest("/api/auth/dev/login/", { method: "POST", body: { userKey, user_key: userKey } });
  const data = payload?.data ?? payload;
  const user = data?.user ?? data?.data?.user ?? null;
  const accessToken =
    data?.accessToken ??
    data?.access_token ??
    data?.data?.accessToken ??
    data?.data?.access_token ??
    null;
  if (!accessToken || !user) {
    throw new Error(`Failed to login dev user: ${userKey}`);
  }
  return {
    accessToken,
    user,
    userId: data?.userId ?? data?.user_id ?? user?.id ?? userKey,
  };
};

const exerciseArtistApprovalFlow = async (member, admin) => {
  const form = new FormData();
  form.append("type", "artist");
  form.append("name", "QA Approval Artist");
  form.append("bio", "라이브 공연과 관객 소통에 강한 QA 아티스트입니다.");
  form.append("artistTypes", encodeJson(["보컬"]));
  form.append("genreRoleTags", encodeJson(["인디팝"]));
  form.append("preferredRegions", encodeJson(["서울"]));
  form.append("isTeam", "false");
  form.append("setupTime", "30");
  form.append("performanceKeywords", encodeJson(["라이브"]));
  form.append("instagramId", "qa_approval_artist");
  form.append(
    "imageFile",
    new Blob([Buffer.from("R0lGODdhAQABAIAAAP///////ywAAAAAAQABAAACAkQBADs=", "base64")], { type: "image/gif" }),
    "qa-artist.gif",
  );

  const createResponse = await fetch(`${backendUrl}/api/profiles`, {
    method: "POST",
    headers: { Authorization: `Bearer ${member.accessToken}` },
    body: form,
  });
  const created = await createResponse.json();
  if (!createResponse.ok || created?.data?.approvalStatus !== "pending") {
    throw new Error(`Artist approval QA create failed: ${createResponse.status}`);
  }
  const profileId = created.data.id;

  const hiddenDetail = await fetch(`${backendUrl}/api/profiles/${profileId}`);
  if (hiddenDetail.status !== 404) throw new Error("Pending artist must be hidden from public detail.");
  const publicArtists = await apiRequest("/api/profiles?type=artist&limit=100");
  if (publicArtists?.data?.some((item) => item.id === profileId)) {
    throw new Error("Pending artist must be hidden from public list.");
  }

  const rejected = await apiRequest(`/api/admin/profiles/${profileId}/reject/`, {
    token: admin.accessToken,
    method: "POST",
    body: { reason: "포트폴리오 정보를 보완해 주세요." },
  });
  if (rejected?.data?.approvalStatus !== "rejected") throw new Error("Artist rejection QA failed.");

  const revised = await apiRequest(`/api/profiles/${profileId}`, {
    token: member.accessToken,
    method: "PATCH",
    body: { name: "QA Approval Artist Revised" },
  });
  if (revised?.data?.approvalStatus !== "pending") throw new Error("Rejected artist edit must return to pending.");

  const approved = await apiRequest(`/api/admin/profiles/${profileId}/approve/`, {
    token: admin.accessToken,
    method: "POST",
  });
  if (approved?.data?.approvalStatus !== "approved") throw new Error("Artist approval QA failed.");
  const publicDetail = await fetch(`${backendUrl}/api/profiles/${profileId}`);
  if (!publicDetail.ok) throw new Error("Approved artist must be public.");

  const pendingAgain = await apiRequest(`/api/profiles/${profileId}`, {
    token: member.accessToken,
    method: "PATCH",
    body: { name: "QA Approval Artist Final" },
  });
  if (pendingAgain?.data?.approvalStatus !== "pending") {
    throw new Error("Approved artist core edit must require reapproval.");
  }
  await apiRequest("/api/me", {
    token: member.accessToken,
    method: "PATCH",
    body: { activeProfileType: "audience" },
  });
  return profileId;
};

const pickFirstId = (payload, keys) => {
  const array = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  for (const item of array) {
    for (const key of keys) {
      const value = item?.[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return null;
};

const resolveIds = async () => {
  const member = await loginDev("member");
  const admin = await loginDev("admin");
  authState.member = member;
  authState.admin = admin;
  const needsPendingArtist = selectedRoutes.some((route) => route.key === "admin-profile-edit");
  const pendingArtistProfileId = needsPendingArtist
    ? await exerciseArtistApprovalFlow(member, admin)
    : fallbackIds.artistProfile;

  const home = await apiRequest("/api/home/events");
  const homeData = home?.data ?? home;
  const events = [
    ...(homeData?.featured ?? []),
    ...(homeData?.upcoming ?? []),
    ...(homeData?.nearby ?? []),
  ];
  const eventId = pickFirstId(events, ["id"]) ?? fallbackIds.event;

  const profiles = await apiRequest("/api/profiles?limit=20");
  const profileItems = Array.isArray(profiles?.data) ? profiles.data : [];
  const adminProfiles = await apiRequest("/api/profiles?type=artist&limit=100", { token: authState.admin.accessToken });
  const adminProfileItems = Array.isArray(adminProfiles?.data) ? adminProfiles.data : [];
  const artistProfileId =
    profileItems.find((item) => item?.type === "artist")?.id ?? fallbackIds.artistProfile;
  const venueProfileId =
    profileItems.find((item) => item?.type === "venue")?.id ??
    fallbackIds.venueProfile;

  await apiRequest(`/api/events/${eventId}/like/`, { token: member.accessToken, method: "POST" });
  await apiRequest(`/api/profiles/${artistProfileId}/like/`, { token: member.accessToken, method: "POST" });
  await apiRequest(`/api/profiles/${venueProfileId}/like/`, { token: member.accessToken, method: "POST" });

  const projects = await apiRequest("/api/projects?limit=20");
  const projectId = pickFirstId(projects, ["id"]) ?? fallbackIds.project;

  const adminArtist = adminProfileItems.find((item) => item?.name === "admin artist");
  const adminVenuePeer = profileItems.find((item) => item?.type === "venue");
  let chatId = fallbackIds.chat;
  let contractId = fallbackIds.contract;
  if (adminArtist?.id && adminVenuePeer?.id) {
    await apiRequest("/api/me", {
      token: authState.admin.accessToken,
      method: "PATCH",
      body: { activeProfileType: "artist" },
    });
    await apiRequest(`/api/admin/profiles/${adminArtist.id}/badges/dyve-official/`, {
      token: authState.admin.accessToken,
      method: "PUT",
    });
    await apiRequest("/api/admin/connections/", {
      token: authState.admin.accessToken,
      method: "POST",
      body: {
        organizerProfileId: adminArtist.id,
        title: "QA 무료 Buddy Dive",
        description: "DYVE 운영 등록과 수동 페어링 흐름을 검증합니다.",
        sourceType: "external_event",
        externalEvent: {
          title: "QA Free Buddy Concert",
          startAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          venue: "Seoul QA Hall",
          ticketUrl: "https://example.com/qa-free-buddy",
        },
        capacity: 4,
        participationFee: 0,
        applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    const contractChat = await apiRequest(`/api/chats/with/${adminVenuePeer.id}/`, {
      token: authState.admin.accessToken,
      method: "POST",
      body: { profileId: adminArtist.id },
    });
    const contractChatId = contractChat?.data?.id ?? contractChat?.data?.chatId;
    if (contractChatId) {
      chatId = contractChatId;
      await apiRequest(`/api/chats/${contractChatId}/invite-admin/`, {
        token: authState.admin.accessToken,
        method: "POST",
      });
      await apiRequest(`/api/chats/${contractChatId}/messages/`, {
        token: authState.admin.accessToken,
        method: "POST",
        body: { text: "안녕하세요. DYVE 스태프가 정산 협의를 도와드릴게요." },
      });
      const contract = await apiRequest("/api/contracts/", {
        token: authState.admin.accessToken,
        method: "POST",
        body: {
          chatRoomId: contractChatId,
          profileId: adminArtist.id,
          eventDateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          partyADisplayName: adminArtist.name,
          partyBDisplayName: adminVenuePeer.name,
          partyBLegalType: "corporation",
          artistBankName: "국민은행",
          artistAccountNumber: "123-456-7890",
          artistAccountHolder: adminArtist.name,
          venueBankName: "신한은행",
          venueAccountNumber: "555-777-9999",
          venueAccountHolder: adminVenuePeer.name,
          settlementType: "fixed_fee",
          fixedFeeAmount: 150000,
          fixedFeeDueAt: "after_1day",
          penaltyTemplateVersion: "mvp-v1",
          penaltyAgreed: true,
        },
      });
      contractId = contract?.data?.contractId ?? contract?.data?.id ?? contractId;
    }
  }

  const connections = await apiRequest("/api/connections/?limit=20", { token: authState.member.accessToken });
  const connectionId = pickFirstId(connections, ["id"]) ?? fallbackIds.connection;

  const groupEvents = await apiRequest("/api/events/?isNetworkingParty=true&limit=20");
  const groupEventId = pickFirstId(groupEvents, ["id"]) ?? fallbackIds.groupEvent;

  return { eventId, artistProfileId, venueProfileId, pendingArtistProfileId, projectId, chatId, contractId, connectionId, groupEventId };
};

const viewportFor = (kind) => viewportByKind[kind] ?? viewportByKind.mobile;

const renderContactSheet = (items) => {
  const cards = items
    .map(
      (item) => `
        <figure class="card">
          <img src="../screenshots/${path.basename(item.file)}" alt="${item.name}" />
          <figcaption>
            <div class="title">${item.name}</div>
            <div class="meta">${item.path}</div>
          </figcaption>
        </figure>`,
    )
    .join("\n");
  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DYVE contact sheet</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; padding: 24px; background: #f5f1ea; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; }
      h1 { margin: 0 0 16px; font-size: 28px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
      .card { margin: 0; background: #fff; border: 1px solid #ddd; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,.08); }
      img { width: 100%; display: block; max-height: 680px; object-fit: contain; object-position: top; background: #fafafa; }
      figcaption { padding: 10px 12px 12px; }
      .title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
      .meta { font-size: 12px; color: #666; word-break: break-all; }
    </style>
  </head>
  <body>
    <h1>DYVE Screenshots</h1>
    <section class="grid">${cards}</section>
  </body>
  </html>`;
};

const screenshotOptions = {
  animations: "disabled",
  caret: "hide",
  scale: "css",
};

const auditPage = async (page) => {
  const issues = await page.evaluate(() => {
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      if (element.getClientRects().length === 0 || style.visibility === "hidden" || style.display === "none") return false;
      const rect = element.getBoundingClientRect();
      return !(style.position === "absolute" && rect.width <= 1 && rect.height <= 1 && (style.clip !== "auto" || style.clipPath !== "none"));
    };
    const accessibleName = (element) => {
      const labelledBy = element.getAttribute("aria-labelledby")
        ?.split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
      const imageAlt = [...element.querySelectorAll("img[alt]")]
        .map((image) => image.getAttribute("alt")?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
      return element.getAttribute("aria-label")?.trim() || labelledBy || element.getAttribute("title")?.trim() || element.textContent?.trim() || imageAlt || "";
    };
    const nestedSelector = [
      "button button", "button a", "a button", "a a",
      '[role="button"] button', '[role="button"] a',
      'button [role="button"]', 'a [role="button"]',
    ].join(",");
    const nestedInteractive = [...document.querySelectorAll(nestedSelector)]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => element.outerHTML.slice(0, 180));
    const staticInfoInteractive = [...document.querySelectorAll('[data-static-info] button, [data-static-info] a, [data-static-info] [role="button"]')]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => element.outerHTML.slice(0, 180));
    const unnamedInteractive = [...document.querySelectorAll('button, a[href], [role="button"]')]
      .filter((element) => isVisible(element) && !accessibleName(element))
      .map((element) => element.outerHTML.slice(0, 180));
    const unlabeledFields = [...document.querySelectorAll("input:not([type=hidden]), select, textarea")]
      .filter((element) => isVisible(element))
      .filter((element) => {
        const labels = "labels" in element ? element.labels : null;
        return !labels?.length && !element.getAttribute("aria-label")?.trim() && !element.getAttribute("aria-labelledby")?.trim();
      })
      .map((element) => element.outerHTML.slice(0, 180));
    const positiveTabIndexes = [...document.querySelectorAll("[tabindex]")]
      .filter((element) => isVisible(element) && Number(element.getAttribute("tabindex")) > 0)
      .map((element) => element.outerHTML.slice(0, 180));
    const duplicateIds = [...document.querySelectorAll("[id]")]
      .map((element) => element.id)
      .filter((id, index, ids) => id && ids.indexOf(id) !== index)
      .filter((id, index, ids) => ids.indexOf(id) === index);
    const imagesWithoutAlt = [...document.querySelectorAll("img:not([alt])")]
      .filter(isVisible)
      .map((element) => element.outerHTML.slice(0, 180));
    const brokenProviderLogos = [...document.querySelectorAll("img[data-provider-logo]")]
      .filter((element) => !element.complete || element.naturalWidth === 0)
      .map((element) => element.getAttribute("data-provider-logo") ?? "unknown");
    const undersizedControls = [...document.querySelectorAll('button, [role="button"], input:not([type=hidden]), select, textarea')]
      .filter(isVisible)
      .filter((element) => {
        if (element.closest("[data-seat-grid]")) return false;
        if (element.matches('input[type="checkbox"], input[type="radio"]')) {
          const labelRect = element.closest("label")?.getBoundingClientRect();
          if (labelRect && labelRect.width >= 24 && labelRect.height >= 24) return false;
        }
        const rect = element.getBoundingClientRect();
        return rect.width < 24 || rect.height < 24;
      })
      .map((element) => element.outerHTML.slice(0, 180));
    const undersizedPrimaryControls = [...document.querySelectorAll("[data-bottom-nav] button, .mobile-fixed-bar button")]
      .filter(isVisible)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      })
      .map((element) => element.outerHTML.slice(0, 180));

    const parseColor = (value) => {
      const hex = value.trim().match(/^#([\da-f]{6})$/i)?.[1];
      if (hex) return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
      const rgb = value.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
      return rgb ? rgb.slice(1).map(Number) : null;
    };
    const luminance = (rgb) => rgb
      .map((channel) => channel / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (foreground, background) => {
      const foregroundRgb = parseColor(foreground);
      const backgroundRgb = parseColor(background);
      if (!foregroundRgb || !backgroundRgb) return null;
      const first = luminance(foregroundRgb);
      const second = luminance(backgroundRgb);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    };
    const rootStyle = getComputedStyle(document.documentElement);
    const contrastPairs = [
      ["--color-primary", "--color-canvas"],
      ["--color-on-primary", "--color-primary"],
      ["--color-muted", "--color-canvas"],
      ["--color-muted-soft", "--color-canvas"],
      ["--color-error", "--color-canvas"],
      ["--color-success", "--color-canvas"],
      ["--color-info", "--color-canvas"],
      ["--color-warning", "--color-canvas"],
    ];
    const contrastFailures = contrastPairs.flatMap(([foreground, background]) => {
      const ratio = contrast(rootStyle.getPropertyValue(foreground), rootStyle.getPropertyValue(background));
      return ratio !== null && ratio < 4.5 ? [`${foreground}/${background}=${ratio.toFixed(2)}`] : [];
    });
    const horizontalOverflow = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    ) - window.innerWidth;
    const railState = [...document.querySelectorAll("[data-horizontal-rail]")].map((rail) => {
      const scroller = rail.querySelector('[role="region"]');
      const overflow = Boolean(scroller && scroller.scrollWidth - scroller.clientWidth > 1);
      return {
        label: scroller?.getAttribute("aria-label") ?? "unnamed rail",
        overflow,
        indicator: rail.getAttribute("data-rail-indicator") ?? "track",
        hasTrack: Boolean(rail.querySelector("[data-rail-track]")),
        hasPages: Boolean(rail.querySelector("[data-rail-pages]")),
        hasCounter: Boolean(rail.querySelector("[data-rail-counter]")),
        activePageCount: rail.querySelectorAll('[data-rail-pages] [aria-current="true"]').length,
        activeIndex: Number(rail.getAttribute("data-active-index") ?? 0),
        pageCount: Number(rail.getAttribute("data-page-count") ?? 0),
      };
    });
    const shellExpected = !location.pathname.startsWith("/admin") && !location.pathname.startsWith("/auth/callback/");
    const mobileRouteRoot = document.querySelector(".mobile-route-content > *");
    const directScrollableMain = mobileRouteRoot?.querySelector(":scope > main:not(.mobile-main-static)");
    const mobileScrollRegion = directScrollableMain instanceof HTMLElement
      ? directScrollableMain
      : mobileRouteRoot instanceof HTMLElement
        ? mobileRouteRoot
        : null;
    const mobileScrollHasOverflow = Boolean(
      shellExpected && mobileScrollRegion && mobileScrollRegion.scrollHeight > mobileScrollRegion.clientHeight + 1,
    );
    let mobileScrollCanReachEnd = true;
    if (mobileScrollHasOverflow && mobileScrollRegion) {
      const initialScrollTop = mobileScrollRegion.scrollTop;
      mobileScrollRegion.scrollTop = mobileScrollRegion.scrollHeight;
      mobileScrollCanReachEnd = mobileScrollRegion.scrollTop + mobileScrollRegion.clientHeight >= mobileScrollRegion.scrollHeight - 1;
      mobileScrollRegion.scrollTop = initialScrollTop;
    }
    const bottomNavs = [...document.querySelectorAll("[data-bottom-nav]")];
    const topBars = [...document.querySelectorAll("[data-app-top-bar]")];
    const activeTabs = [...document.querySelectorAll('[data-bottom-nav] [data-active="true"]')];
    const bottomNavLabels = [...document.querySelectorAll("[data-bottom-nav-label]")]
      .map((label) => label.textContent?.trim() ?? "");
    const bottomNavRect = bottomNavs[0]?.getBoundingClientRect() ?? null;
    const overlapsBottomNav = (element) => {
      if (!bottomNavRect || element.getClientRects().length === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.left < bottomNavRect.right && rect.right > bottomNavRect.left &&
        rect.top < bottomNavRect.bottom && rect.bottom > bottomNavRect.top;
    };
    const fixedBarOverlapCount = [...document.querySelectorAll(".mobile-fixed-bar")].filter(overlapsBottomNav).length;
    const composerOverlapCount = [...document.querySelectorAll("[data-chat-composer]")].filter(overlapsBottomNav).length;
    const seatGridState = [...document.querySelectorAll("[data-seat-grid]")].map((grid) => {
      const rows = Number(grid.getAttribute("data-seat-rows"));
      const cols = Number(grid.getAttribute("data-seat-cols"));
      return {
        label: grid.getAttribute("aria-label") ?? "seat grid",
        overflow: grid.scrollWidth - grid.clientWidth,
        expectedSeats: rows * cols,
        renderedSeats: grid.querySelectorAll("button").length,
      };
    });
    const fullWidthCardState = [...document.querySelectorAll('[data-event-section][data-full-width="true"]')]
      .flatMap((section) => {
        const scroller = section.querySelector('[data-horizontal-rail] [role="region"]');
        if (!scroller) return [];
        const style = getComputedStyle(scroller);
        const expectedWidth = scroller.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        return [...section.querySelectorAll("[data-event-card-item]")].map((card) => ({
          expectedWidth,
          actualWidth: card.getBoundingClientRect().width,
        }));
      });
    const posterCardState = [...document.querySelectorAll('[data-event-card-variant="poster"]')]
      .map((card) => {
        const rect = card.getBoundingClientRect();
        const image = card.querySelector("img");
        return {
          aspectRatio: rect.height > 0 ? rect.width / rect.height : 0,
          objectFit: image ? getComputedStyle(image).objectFit : null,
          headingCount: card.querySelectorAll("h3").length,
          dateCount: card.querySelectorAll("p").length,
          buttonCount: card.querySelectorAll("button").length,
          detailCount: card.querySelectorAll("dl").length,
        };
      });
    const featuredCarouselState = [...document.querySelectorAll("[data-featured-carousel]")]
      .flatMap((carousel) => {
        const scroller = carousel.querySelector("[data-featured-scroller]");
        const firstSlide = scroller?.querySelector("[data-featured-slide]");
        if (!(scroller instanceof HTMLElement) || !(firstSlide instanceof HTMLElement)) return [];
        const scrollerStyle = getComputedStyle(scroller);
        const scrollerRect = scroller.getBoundingClientRect();
        const slideRect = firstSlide.getBoundingClientRect();
        return [{
          expectedWidth: scroller.clientWidth - parseFloat(scrollerStyle.paddingLeft) - parseFloat(scrollerStyle.paddingRight),
          actualWidth: slideRect.width,
          centerDelta: Math.abs(
            (slideRect.left + slideRect.width / 2) -
            (scrollerRect.left + scrollerRect.width / 2),
          ),
        }];
      });
    const ticketFilters = [...document.querySelectorAll("[data-ticket-filter]")]
      .map((filter) => filter.getAttribute("data-ticket-filter"))
      .filter(Boolean)
      .sort();
    const bookingInfoLabels = [...document.querySelectorAll("[data-booking-info] dt")]
      .map((label) => label.textContent?.trim() ?? "");
    const unsupportedSeatLayoutCount = document.querySelectorAll("[data-unsupported-seat-layout]").length;
    const unsupportedCheckoutEnabledCount = unsupportedSeatLayoutCount > 0
      ? [...document.querySelectorAll("[data-checkout-submit]")].filter((button) => !button.disabled).length
      : 0;
    const adminLayouts = [...document.querySelectorAll("[data-admin-layout]")];
    const adminScrollRegions = [...document.querySelectorAll("[data-admin-scroll-region]")];
    const visibleAdminNavs = [...document.querySelectorAll("[data-admin-nav]")]
      .filter((element) => element.getClientRects().length > 0);
    const adminScrollRegion = adminScrollRegions[0];
    let adminScrollCanReachEnd = true;
    if (adminScrollRegion instanceof HTMLElement && adminScrollRegion.scrollHeight > adminScrollRegion.clientHeight + 1) {
      adminScrollRegion.scrollTop = adminScrollRegion.scrollHeight;
      adminScrollCanReachEnd = adminScrollRegion.scrollTop + adminScrollRegion.clientHeight >= adminScrollRegion.scrollHeight - 1;
    }
    const applicationScrollRegions = [...document.querySelectorAll("[data-connection-applications-scroll]")];
    const applicationScrollRegion = applicationScrollRegions[0];
    const applicationItems = [...document.querySelectorAll("[data-connection-application-item]")];
    let applicationLastItemReachable = true;
    if (applicationScrollRegion instanceof HTMLElement && applicationItems.length > 0) {
      applicationScrollRegion.scrollTop = applicationScrollRegion.scrollHeight;
      const regionRect = applicationScrollRegion.getBoundingClientRect();
      const lastRect = applicationItems.at(-1).getBoundingClientRect();
      applicationLastItemReachable = lastRect.bottom <= regionRect.bottom + 1;
    }
    const applicationActionOverlapCount = [...document.querySelectorAll("[data-connection-application-item] button")]
      .filter(overlapsBottomNav).length;
    return {
      nestedInteractive,
      staticInfoInteractive,
      unnamedInteractive,
      unlabeledFields,
      positiveTabIndexes,
      duplicateIds,
      imagesWithoutAlt,
      brokenProviderLogos,
      undersizedControls,
      undersizedPrimaryControls,
      contrastFailures,
      horizontalOverflow,
      railState,
      shellExpected,
      mobileScrollHasOverflow,
      mobileScrollCanReachEnd,
      bottomNavCount: bottomNavs.length,
      bottomNavLabels,
      topBarCount: topBars.length,
      activeTabCount: activeTabs.length,
      fixedBarOverlapCount,
      composerOverlapCount,
      seatGridState,
      fullWidthCardState,
      posterCardState,
      featuredCarouselState,
      ticketFilters,
      bookingInfoLabels,
      currentPath: location.pathname,
      unsupportedSeatLayoutCount,
      unsupportedCheckoutEnabledCount,
      adminExpected: location.pathname.startsWith("/admin"),
      adminLayoutCount: adminLayouts.length,
      adminScrollRegionCount: adminScrollRegions.length,
      visibleAdminNavCount: visibleAdminNavs.length,
      adminScrollCanReachEnd,
      applicationScrollRegionCount: applicationScrollRegions.length,
      applicationItemCount: applicationItems.length,
      applicationLastItemReachable,
      applicationActionOverlapCount,
    };
  });

  const auditIssues = [];
  if (issues.nestedInteractive.length > 0) {
    auditIssues.push(`nested interactive: ${issues.nestedInteractive.join(" | ")}`);
  }
  if (issues.staticInfoInteractive.length > 0) {
    auditIssues.push(`interactive control inside static info: ${issues.staticInfoInteractive.join(" | ")}`);
  }
  if (issues.unnamedInteractive.length > 0) {
    auditIssues.push(`unnamed interactive: ${issues.unnamedInteractive.join(" | ")}`);
  }
  if (issues.unlabeledFields.length > 0) {
    auditIssues.push(`unlabeled fields: ${issues.unlabeledFields.join(" | ")}`);
  }
  if (issues.positiveTabIndexes.length > 0) {
    auditIssues.push(`positive tabindex: ${issues.positiveTabIndexes.join(" | ")}`);
  }
  if (issues.duplicateIds.length > 0) {
    auditIssues.push(`duplicate ids: ${issues.duplicateIds.join(",")}`);
  }
  if (issues.imagesWithoutAlt.length > 0) {
    auditIssues.push(`images without alt: ${issues.imagesWithoutAlt.join(" | ")}`);
  }
  if (issues.brokenProviderLogos.length > 0) {
    auditIssues.push(`provider logos failed to load: ${issues.brokenProviderLogos.join(",")}`);
  }
  if (issues.undersizedControls.length > 0) {
    auditIssues.push(`controls smaller than 24px: ${issues.undersizedControls.join(" | ")}`);
  }
  if (issues.undersizedPrimaryControls.length > 0) {
    auditIssues.push(`primary controls smaller than 44px: ${issues.undersizedPrimaryControls.join(" | ")}`);
  }
  if (issues.contrastFailures.length > 0) {
    auditIssues.push(`token contrast: ${issues.contrastFailures.join(",")}`);
  }
  if (issues.horizontalOverflow > 1) {
    auditIssues.push(`document horizontal overflow: ${issues.horizontalOverflow}px`);
  }
  for (const rail of issues.railState) {
    if (rail.indicator === "track" && rail.overflow !== rail.hasTrack) {
      auditIssues.push(`${rail.label}: overflow=${rail.overflow}, track=${rail.hasTrack}`);
    }
    if (rail.indicator === "pages" && rail.overflow) {
      const expectedDots = rail.pageCount <= 8;
      if (expectedDots !== rail.hasPages || expectedDots === rail.hasCounter) {
        auditIssues.push(`${rail.label}: invalid page indicator for ${rail.pageCount} cards`);
      }
      if (rail.hasPages && rail.activePageCount !== 1) {
        auditIssues.push(`${rail.label}: active page count=${rail.activePageCount}`);
      }
      if (rail.activeIndex < 0 || rail.activeIndex >= rail.pageCount) {
        auditIssues.push(`${rail.label}: active page index=${rail.activeIndex}/${rail.pageCount}`);
      }
    }
  }
  if (issues.shellExpected && issues.bottomNavCount !== 1) {
    auditIssues.push(`bottom nav count: ${issues.bottomNavCount}`);
  }
  if (issues.shellExpected && issues.bottomNavLabels.join(",") !== "메인,공연 & 티켓,연결,네트워킹,마이페이지") {
    auditIssues.push(`bottom nav labels: ${issues.bottomNavLabels.join(",")}`);
  }
  if (issues.shellExpected && issues.topBarCount !== 1) {
    auditIssues.push(`top bar count: ${issues.topBarCount}`);
  }
  if (issues.shellExpected && issues.activeTabCount > 1) {
    auditIssues.push(`active bottom tabs: ${issues.activeTabCount}`);
  }
  if (issues.mobileScrollHasOverflow && !issues.mobileScrollCanReachEnd) {
    auditIssues.push("mobile route scroll region cannot reach its final content");
  }
  if (issues.shellExpected && issues.fixedBarOverlapCount > 0) {
    auditIssues.push(`fixed CTA overlaps bottom nav: ${issues.fixedBarOverlapCount}`);
  }
  if (issues.shellExpected && issues.composerOverlapCount > 0) {
    auditIssues.push(`chat composer overlaps bottom nav: ${issues.composerOverlapCount}`);
  }
  for (const grid of issues.seatGridState) {
    if (grid.overflow > 1) {
      auditIssues.push(`${grid.label}: horizontal overflow=${grid.overflow}px`);
    }
    if (grid.renderedSeats !== grid.expectedSeats) {
      auditIssues.push(`${grid.label}: rendered=${grid.renderedSeats}, expected=${grid.expectedSeats}`);
    }
  }
  for (const card of issues.fullWidthCardState) {
    if (Math.abs(card.actualWidth - card.expectedWidth) > 1) {
      auditIssues.push(`home event card width=${card.actualWidth}, expected=${card.expectedWidth}`);
    }
  }
  for (const card of issues.posterCardState) {
    if (Math.abs(card.aspectRatio - 0.75) > 0.01 || card.objectFit !== "contain") {
      auditIssues.push(`poster card ratio=${card.aspectRatio}, object-fit=${card.objectFit}`);
    }
    if (card.headingCount !== 1 || card.dateCount !== 1 || card.buttonCount !== 1 || card.detailCount !== 0) {
      auditIssues.push(`poster card content=${JSON.stringify(card)}`);
    }
  }
  for (const carousel of issues.featuredCarouselState) {
    if (Math.abs(carousel.actualWidth - carousel.expectedWidth) > 1) {
      auditIssues.push(`featured slide width=${carousel.actualWidth}, expected=${carousel.expectedWidth}`);
    }
    if (carousel.centerDelta > 1) {
      auditIssues.push(`featured first slide center delta=${carousel.centerDelta}px`);
    }
  }
  if (issues.ticketFilters.length > 0 && issues.ticketFilters.join(",") !== "culture,live") {
    auditIssues.push(`ticket filters: ${issues.ticketFilters.join(",")}`);
  }
  if (issues.bookingInfoLabels.length > 0) {
    const expectedLabels = issues.currentPath.startsWith("/performance/") || issues.currentPath.startsWith("/events/")
      ? ["입장 방식", "입장 시간", "좌석예매 안내"]
      : ["공연 시간", "입장 시작", "수용 인원", "좌석 배치", "좌석 예매 정책"];
    const labelIndexes = issues.bookingInfoLabels.map((label) => expectedLabels.indexOf(label));
    const hasUnexpectedLabel = labelIndexes.some((index) => index === -1);
    const isOutOfOrder = labelIndexes.some((index, position) => position > 0 && index <= labelIndexes[position - 1]);
    if (hasUnexpectedLabel || isOutOfOrder) {
      auditIssues.push(`booking info order: ${issues.bookingInfoLabels.join(",")}`);
    }
  }
  if (issues.unsupportedSeatLayoutCount > 0 && issues.unsupportedCheckoutEnabledCount > 0) {
    auditIssues.push("unsupported seat layout can be submitted");
  }
  if (issues.adminExpected && issues.adminLayoutCount !== 1) {
    auditIssues.push(`admin layout count: ${issues.adminLayoutCount}`);
  }
  if (issues.adminExpected && issues.adminScrollRegionCount !== 1) {
    auditIssues.push(`admin scroll region count: ${issues.adminScrollRegionCount}`);
  }
  if (issues.adminExpected && issues.visibleAdminNavCount !== 1) {
    auditIssues.push(`visible admin nav count: ${issues.visibleAdminNavCount}`);
  }
  if (issues.adminExpected && !issues.adminScrollCanReachEnd) {
    auditIssues.push("admin scroll region cannot reach its final content");
  }
  if (issues.applicationScrollRegionCount > 0 && issues.applicationScrollRegionCount !== 1) {
    auditIssues.push(`application scroll region count: ${issues.applicationScrollRegionCount}`);
  }
  if (issues.applicationItemCount > 0 && !issues.applicationLastItemReachable) {
    auditIssues.push("last connection application is not reachable");
  }
  if (issues.applicationActionOverlapCount > 0) {
    auditIssues.push(`application actions overlap bottom nav: ${issues.applicationActionOverlapCount}`);
  }

  const eventCardRail = page.locator('[data-event-section] [data-horizontal-rail][data-rail-overflow="true"] [role="region"]').first();
  if (await eventCardRail.count()) {
    await eventCardRail.evaluate((element) => { element.scrollLeft = 0; });
    const beforeUrl = page.url();
    const box = await eventCardRail.boundingBox();
    if (box) {
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width - 24, y);
      await page.mouse.down();
      await page.mouse.move(box.x + 24, y, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(350);
      const draggedScrollLeft = await eventCardRail.evaluate((element) => element.scrollLeft);
      if (draggedScrollLeft <= 0) {
        auditIssues.push(`event card mouse drag did not scroll: ${draggedScrollLeft}`);
      }
      if (page.url() !== beforeUrl) {
        auditIssues.push(`event card mouse drag navigated: ${beforeUrl} -> ${page.url()}`);
      }
      await eventCardRail.evaluate((element) => { element.scrollLeft = 0; });
      await page.waitForTimeout(50);
    }
  }

  const overflowingRails = page.locator('[data-horizontal-rail][data-rail-overflow="true"] [role="region"]');
  for (let index = 0; index < await overflowingRails.count(); index += 1) {
    const rail = overflowingRails.nth(index);
    const label = (await rail.getAttribute("aria-label")) ?? `rail ${index + 1}`;
    const before = await rail.evaluate((element) => element.scrollLeft);
    const beforeState = await rail.evaluate((element) => ({
      indicator: element.parentElement?.getAttribute("data-rail-indicator") ?? "track",
      activeIndex: Number(element.parentElement?.getAttribute("data-active-index") ?? 0),
      pageCount: Number(element.parentElement?.getAttribute("data-page-count") ?? 0),
    }));
    await rail.focus();
    await rail.dispatchEvent("keydown", { key: "ArrowRight", code: "ArrowRight", bubbles: true });
    await page.waitForTimeout(350);
    const after = await rail.evaluate((element) => element.scrollLeft);
    if (after <= before) {
      const dimensions = await rail.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        tabIndex: element.tabIndex,
        active: document.activeElement === element,
      }));
      auditIssues.push(`${label}: ArrowRight did not move scrollLeft (${before}->${after}, ${JSON.stringify(dimensions)})`);
    }
    if (beforeState.indicator === "pages") {
      const afterIndex = await rail.evaluate((element) => Number(element.parentElement?.getAttribute("data-active-index") ?? 0));
      const expectedIndex = Math.min(beforeState.activeIndex + 1, beforeState.pageCount - 1);
      if (afterIndex !== expectedIndex) {
        auditIssues.push(`${label}: ArrowRight moved page ${beforeState.activeIndex}->${afterIndex}, expected ${expectedIndex}`);
      }
    }
  }
  return auditIssues;
};

const resetScrollForScreenshot = (page) => page.evaluate(() => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  window.scrollTo(0, 0);
  for (const element of document.querySelectorAll("*")) {
    if (element instanceof HTMLElement && element.scrollTop !== 0) element.scrollTop = 0;
  }
});

const main = async () => {
  if (!fs.existsSync(path.join(backendRoot, "manage.py"))) {
    throw new Error(`DYVE backend를 찾을 수 없습니다: ${backendRoot}`);
  }
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chromium 실행 파일을 찾을 수 없습니다: ${chromePath}`);
  }
  await Promise.all([assertPortAvailable(4180), assertPortAvailable(8010)]);

  ensureDir(outputRoot);
  ensureDir(screenshotsDir);
  ensureDir(sheetDir);

  await run("npm", ["run", "build"], {
    cwd: frontendRoot,
    env: { ...process.env, VITE_API_BASE_URL: backendUrl },
  });

  const backendEnv = {
    ...process.env,
    ENV: "local",
    DEBUG: "true",
    ALLOW_DEV_LOGIN: "true",
    DJANGO_USE_ENV_LOCAL: "false",
    DATABASE_URL: `sqlite:///${qaDbPath}`,
    DB_SSL_REQUIRE: "false",
    PAYMENT_PROVIDER: "mock",
    BUDDY_PAID_ENABLED: "false",
    CORS_ALLOWED_ORIGINS: frontendUrl,
    CSRF_TRUSTED_ORIGINS: frontendUrl,
    PYTHONUNBUFFERED: "1",
  };
  await run(backendPython, ["manage.py", "migrate", "--noinput"], { cwd: backendRoot, env: backendEnv });
  await run(backendPython, ["manage.py", "seed_dev_data", "--reset", "--events", "12", "--soldout", "2", "--with_seats", "1", "--with_waitlist", "1"], { cwd: backendRoot, env: backendEnv });

  startDetached(backendPython, ["manage.py", "runserver", "127.0.0.1:8010", "--noreload"], {
    cwd: backendRoot,
    env: backendEnv,
  });

  startDetached("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4180", "--strictPort"], {
    cwd: frontendRoot,
    env: { ...process.env, VITE_API_BASE_URL: backendUrl },
  });

  try {
    await waitForHttp(`${backendUrl}/api/home/events`);
    await waitForHttp(`${frontendUrl}/`);

    const ids = await resolveIds();
    const browser = await chromium.launch({
      headless: true,
      executablePath: chromePath,
      args: ["--no-sandbox"],
    });
    let page = await browser.newPage();

    const results = [];
    const auditFailures = [];
    if (process.env.DYVE_SKIP_FLOWS !== "1") {
      await page.setViewportSize(viewportFor("mobile"));
      await setAuthState(page, "member");

      await page.goto(`${frontendUrl}/checkout/${ids.groupEventId}`, { waitUntil: "domcontentloaded" });
      await page.getByPlaceholder("Group Dive에서 사용할 닉네임").fill("다이브메이트");
      await page.locator("select").selectOption("female");
      await page.getByPlaceholder("좋아하게 된 계기나 기대하는 이야기를 자유롭게 적어 주세요.").fill("같은 음악을 오래 좋아한 사람들과 공연 이야기를 나누고 싶어요.");
      await page.getByRole("button", { name: /Group Dive 신청하기/ }).click();
      await page.waitForURL("**/payment-complete", { timeout: 15000 });
      await page.getByRole("heading", { name: "Group Dive 신청이 완료됐어요" }).waitFor();
      const groupIssues = await auditPage(page);
      if (groupIssues.length > 0) auditFailures.push({ route: "group-payment-complete", viewport: "mobile", issues: groupIssues });
      await resetScrollForScreenshot(page);
      const groupFile = path.join(screenshotsDir, "group-payment-complete-mobile.png");
      await page.screenshot({ path: groupFile, fullPage: false, ...screenshotOptions });
      results.push({ key: "group-payment-complete", name: "Group Dive Payment Complete", context: "member", viewport: "mobile", url: "/payment-complete", file: groupFile });

      await page.goto(`${frontendUrl}/connection/${ids.connectionId}`, { waitUntil: "domcontentloaded" });
      await page.getByLabel("어떤 닉네임으로 불러드릴까요?").fill("락페메이트");
      await page.getByRole("button", { name: "다음" }).click();
      await page.getByRole("button", { name: "여성" }).click();
      await page.getByRole("button", { name: "다음" }).click();
      await page.getByLabel("나이를 알려주세요.").fill("27");
      await page.getByRole("button", { name: "다음" }).click();
      await page.locator("#buddy-instagram-proof").setInputFiles({
        name: "instagram-proof.png",
        mimeType: "image/png",
        buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
      });
      await page.locator("[data-buddy-proof-preview]").waitFor();
      for (const viewportKind of ["compact", "mobile", "wideMobile"]) {
        await page.setViewportSize(viewportFor(viewportKind));
        await page.waitForTimeout(50);
        const layout = await page.evaluate(() => {
          const preview = document.querySelector("[data-buddy-proof-preview]")?.getBoundingClientRect();
          const actions = document.querySelector("[data-buddy-form-actions]")?.getBoundingClientRect();
          const bottomNav = document.querySelector("[data-bottom-nav]")?.getBoundingClientRect();
          return {
            previewActionsOverlap: Boolean(preview && actions && preview.bottom > actions.top && preview.top < actions.bottom),
            actionsNavOverlap: Boolean(actions && bottomNav && actions.bottom > bottomNav.top && actions.top < bottomNav.bottom),
          };
        });
        if (layout.previewActionsOverlap || layout.actionsNavOverlap) {
          auditFailures.push({ route: "buddy-photo-step", viewport: viewportKind, issues: [JSON.stringify(layout)] });
        }
      }
      await page.setViewportSize(viewportFor("mobile"));
      await page.getByRole("button", { name: "다음" }).click();
      await page.getByRole("button", { name: "모두 좋아요" }).click();
      await page.getByRole("button", { name: "다음" }).click();
      await page.getByLabel("페스티벌을 어떻게 즐기시나요?").fill("좋아하는 무대는 앞에서 보고 중간에는 여유롭게 쉬어요.");
      await page.getByRole("button", { name: "다음" }).click();
      await page.getByLabel("꼭 봐야 하는 아티스트는 누구인가요?").fill("검정치마, 잔나비");
      await page.getByRole("button", { name: "다음" }).click();
      await page.getByLabel("버디와 함께 무엇을 하고 싶나요?").fill("공연 전에 식사하고 서로 사진을 찍어주고 싶어요.");
      await page.getByRole("button", { name: "신청하기" }).click();
      const applicationHeading = page.getByRole("heading", { name: "내 신청 정보" });
      await applicationHeading.waitFor({ timeout: 15000 });
      const buddyIssues = await auditPage(page);
      if (buddyIssues.length > 0) auditFailures.push({ route: "buddy-application-complete", viewport: "mobile", issues: buddyIssues });
      await applicationHeading.scrollIntoViewIfNeeded();
      const buddyFile = path.join(screenshotsDir, "buddy-application-complete-mobile.png");
      await page.screenshot({ path: buddyFile, fullPage: false, ...screenshotOptions });
      results.push({ key: "buddy-application-complete", name: "Buddy Dive Application Complete", context: "member", viewport: "mobile", url: `/connection/${ids.connectionId}`, file: buddyFile });

      const applications = await apiRequest(`/api/connections/${ids.connectionId}/applications/?limit=100`, {
        token: authState.admin.accessToken,
      });
      const qaApplication = applications?.data?.find((item) => item.nickname === "락페메이트");
      if (qaApplication?.id) {
        await apiRequest(`/api/admin/connections/${ids.connectionId}/applications/${qaApplication.id}/verify-instagram/`, {
          token: authState.admin.accessToken,
          method: "POST",
        });
        await apiRequest(`/api/connections/${ids.connectionId}/applications/${qaApplication.id}/select/`, {
          token: authState.admin.accessToken,
          method: "POST",
        });
      }
    }

    for (const route of selectedRoutes) {
      await page.close();
      page = await browser.newPage();
      await setAuthState(page, route.context);
      const url = route.path
        .replace("__EVENT_ID__", ids.eventId)
        .replace("__PROFILE_ARTIST_ID__", ids.artistProfileId)
        .replace("__PENDING_ARTIST_ID__", ids.pendingArtistProfileId)
        .replace("__PROFILE_VENUE_ID__", ids.venueProfileId)
        .replace("__PROJECT_ID__", ids.projectId)
        .replace("__CHAT_ID__", ids.chatId)
        .replace("__CONTRACT_ID__", ids.contractId)
        .replace("__CONNECTION_ID__", ids.connectionId)
        .replace("__GROUP_EVENT_ID__", ids.groupEventId);

      const viewportKinds = route.path.startsWith("/admin")
        ? ["mobile", "tablet", "desktop"]
        : ["compact", "mobile", "wideMobile"];
      for (const viewportKind of viewportKinds) {
        console.log(`[capture] ${route.key}:${viewportKind} -> ${url}`);
        await page.setViewportSize(viewportFor(viewportKind));
        const file = path.join(screenshotsDir, `${route.key}-${viewportKind}.png`);
        const detailApiUrl = `${backendUrl}/api/connections/${ids.connectionId}/`;
        const eventApiUrl = `${backendUrl}/api/events/${ids.eventId}`;
        const seatsApiUrl = `${backendUrl}/api/events/${ids.eventId}/seats`;
        const applicationsApiPattern = `**/api/connections/${ids.connectionId}/applications/**`;
        try {
          if (route.mockPaymentStatus) {
            const payload = await apiRequest(`/api/connections/${ids.connectionId}/`, { token: authState.member.accessToken });
            const mocked = structuredClone(payload);
            if (mocked?.data?.myApplication) {
              mocked.data.participationFee = 12000;
              mocked.data.myApplication.paymentStatus = route.mockPaymentStatus;
            }
            await page.route(detailApiUrl, (request) => request.fulfill({
              status: 200,
              contentType: "application/json",
              headers: { "Access-Control-Allow-Origin": frontendUrl },
              body: JSON.stringify(mocked),
            }));
          }
          if (route.mockSeatLayout) {
            const payload = await apiRequest(`/api/events/${ids.eventId}`);
            const mocked = structuredClone(payload);
            mocked.data = {
              ...mocked.data,
              admissionType: "assigned",
              layoutRows: route.mockSeatLayout.rows,
              layoutCols: route.mockSeatLayout.cols,
              capacity: route.mockSeatLayout.rows * route.mockSeatLayout.cols,
              isSoldOut: false,
            };
            await page.route(eventApiUrl, (request) => request.fulfill({
              status: 200,
              contentType: "application/json",
              headers: { "Access-Control-Allow-Origin": frontendUrl },
              body: JSON.stringify(mocked),
            }));
            await page.route(seatsApiUrl, (request) => request.fulfill({
              status: 200,
              contentType: "application/json",
              headers: { "Access-Control-Allow-Origin": frontendUrl },
              body: JSON.stringify({ data: { seats: [], layout: route.mockSeatLayout } }),
            }));
          }
          if (route.key === "connection-applications") {
            const payload = await apiRequest(`/api/connections/${ids.connectionId}/applications/?limit=100`, {
              token: authState.admin.accessToken,
            });
            const sample = payload?.data?.[0];
            if (sample) {
              const mocked = {
                ...payload,
                data: Array.from({ length: 18 }, (_, index) => ({
                  ...structuredClone(sample),
                  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
                  nickname: `QA 신청자 ${String(index + 1).padStart(2, "0")}`,
                  status: "pending",
                  matchStatus: null,
                  matchedPartner: null,
                  instagramVerificationStatus: "verified",
                  paymentStatus: "paid",
                  applicant: {
                    ...structuredClone(sample.applicant),
                    name: `QA 신청자 ${String(index + 1).padStart(2, "0")}`,
                  },
                })),
              };
              await page.route(applicationsApiPattern, (request) => request.fulfill({
                status: 200,
                contentType: "application/json",
                headers: { "Access-Control-Allow-Origin": frontendUrl },
                body: JSON.stringify(mocked),
              }));
            }
          }
          await page.goto(`${frontendUrl}${url}`, { waitUntil: "domcontentloaded", timeout: 20000 });
          await page.waitForLoadState("networkidle", { timeout: 1500 }).catch(() => {});
          await page.waitForTimeout(500);
          if (route.expectedHeading) {
            await page.getByRole("heading", { name: route.expectedHeading }).waitFor({ timeout: 5000 });
            if (new URL(page.url()).pathname !== route.path) {
              throw new Error(`Unexpected redirect: ${new URL(page.url()).pathname}`);
            }
          }
          if (route.key === "admin-profiles") {
            await page.getByRole("button", { name: "아티스트" }).click();
            await page.getByText("QA Approval Artist Final").waitFor({ timeout: 10000 });
          }
          const issues = await auditPage(page);
          if (issues.length > 0) {
            auditFailures.push({ route: route.key, viewport: viewportKind, issues });
            console.warn(`[audit] ${route.key}:${viewportKind}: ${issues.join("; ")}`);
          }
          await resetScrollForScreenshot(page);
          if (route.mockPaymentStatus) {
            await page.getByRole("heading", { name: "내 신청 정보" }).scrollIntoViewIfNeeded();
          }
          await page.screenshot({ path: file, fullPage: false, ...screenshotOptions });
        } catch (error) {
          auditFailures.push({ route: route.key, viewport: viewportKind, issues: [error.message] });
          console.warn(`[capture] failed ${route.key}:${viewportKind}: ${error.message}`);
          await page.screenshot({ path: file, fullPage: false, ...screenshotOptions }).catch(() => {});
        } finally {
          if (route.mockPaymentStatus) await page.unroute(detailApiUrl);
          if (route.key === "connection-applications") await page.unroute(applicationsApiPattern);
          if (route.mockSeatLayout) {
            await page.unroute(eventApiUrl);
            await page.unroute(seatsApiUrl);
          }
        }
        results.push({ ...route, viewport: viewportKind, url, file });
      }
    }

    await browser.close();

    fs.writeFileSync(sheetHtmlPath, renderContactSheet(results), "utf8");
    await run(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1920,1080",
      `--screenshot=${sheetPngPath}`,
      `file://${sheetHtmlPath}`,
    ]);

    fs.writeFileSync(
      path.join(outputRoot, "index.json"),
      JSON.stringify({ capturedAt: new Date().toISOString(), routes: results, auditFailures }, null, 2),
      "utf8",
    );
    if (strictAudit && auditFailures.length > 0) {
      throw new Error(`DOM audit failed on ${auditFailures.length} route/viewports. See ${path.join(outputRoot, "index.json")}`);
    }
  } finally {
    stopRunningProcesses();
    fs.rmSync(qaDbPath, { force: true });
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
