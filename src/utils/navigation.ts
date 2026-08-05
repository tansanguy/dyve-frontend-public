export type PrimaryTabId = "home" | "ticket" | "connection" | "networking" | "mypage";

export const tabToPath = (tabId: PrimaryTabId) => {
  if (tabId === "home") return "/";
  if (tabId === "ticket") return "/ticket";
  if (tabId === "connection") return "/connection";
  if (tabId === "networking") return "/network";
  if (tabId === "mypage") return "/my";
  return "/";
};

export const resolveActiveTab = (pathname: string): PrimaryTabId | null => {
  if (pathname === "/" || pathname.startsWith("/onboarding")) return "home";
  if (
    pathname.startsWith("/connection") ||
    pathname === "/my/connections" ||
    pathname === "/my/connection-applications" ||
    pathname === "/chat-invitations"
  ) return "connection";
  if (
    pathname === "/network" ||
    pathname.startsWith("/artist/") ||
    pathname.startsWith("/venue/") ||
    pathname.startsWith("/register/artist") ||
    pathname.startsWith("/register/venue") ||
    pathname.startsWith("/my/venue/")
  ) return "networking";
  if (
    pathname === "/ticket" ||
    pathname.startsWith("/ticket/") ||
    pathname.startsWith("/performance/") ||
    pathname.startsWith("/events/") ||
    pathname.startsWith("/register/performance") ||
    pathname.startsWith("/checkout/") ||
    pathname.startsWith("/checkin")
  ) return "ticket";
  if (
    pathname === "/my" ||
    pathname.startsWith("/my/likes") ||
    pathname.startsWith("/my/liked-") ||
    pathname.startsWith("/my/events/")
  ) return "mypage";
  return null;
};
