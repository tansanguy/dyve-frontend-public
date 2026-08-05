import { useEffect, useState, type FormEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DyveImage } from "./DyveImage";
import { LoadingIndicator } from "../../LoadingIndicator";
import type { AuthMode, AuthUser } from "../../../services/storage";
import { REGION_OPTIONS } from "../../../utils/regions";
import { formatDateDisplay } from "../../../utils/formatters";
import { isAdminUser } from "../../../utils/auth";
import { DyveIcon } from "./DyveIcon";
import { DyveSelect } from "./DyveSelect";
import { HorizontalRail } from "./HorizontalRail";
import { KAKAO_LOGIN_ASSET, NAVER_LOGIN_ASSET } from "../../../assets/socialLoginAssets";
import type { AccountInfo } from "../../../services/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

type WaitingCardItem = {
  eventId: string;
  title: string;
  image: string;
  venue: string;
  dateDisplay: string;
  status?: "waiting" | "booked";
  position?: number;
  total?: number;
  bookingIds?: string[];
};

type TicketListItem = {
  id: string;
  image: string;
  title: string;
  dateDisplay: string;
  status?: string;
  canCancel: boolean;
};

type MyEventItem = Record<string, unknown>;

interface MyPageScreenProps {
  profile?: {
    name?: string;
    imageUrl?: string;
  };
  profileType?: "artist" | "venue" | null;
  accountInfo?: AccountInfo | null;
  authMode: AuthMode;
  authUser?: AuthUser;
  onNicknameChange?: (nickname: string) => Promise<void>;
  onLoginProvider?: (provider: "kakao" | "naver") => void;
  onLoginDev?: () => void;
  onLoginAdminDev?: () => void;
  onReviewLogin?: (loginId: string, password: string) => Promise<void>;
  onLogout?: () => void;
  errorMessage?: string | null;
  ticketActionError?: string | null;
  cancellingTicketId?: string | null;
  onCreateArtist?: () => void;
  onCreateVenue?: () => void;
  onManageVenueSchedule?: () => void;
  onCreateGig?: () => void;
  onEditEvents?: () => void;
  hasArtistProfile?: boolean;
  hasVenueProfile?: boolean;
  venueBusinessRegistrationSubmitted?: boolean;
  venueBusinessRegistrationStatus?: "pending" | "approved" | "rejected" | null;
  venueBusinessRegistrationRejectionReason?: string | null;
  canQrCheckin?: boolean;
  onQrCheckin?: () => void;
  preferredRegions?: string[];
  onPreferredRegionsChange?: (regions: string[]) => void;
  onTicketClick?: (ticket: TicketListItem) => void;
  onTicketCancel?: (ticket: TicketListItem) => void;
  waitingItems?: WaitingCardItem[];
  isWaitingLoading?: boolean;
  waitingErrorMessage?: string | null;
  onWaitingClick?: (item: WaitingCardItem) => void;
  events?: MyEventItem[]; // Legacy fallback events
  myEvents?: MyEventItem[];
  isEventsLoading?: boolean;
  eventsErrorMessage?: string | null;
  onEventClick?: (event: MyEventItem) => void;
  onViewAllEvents?: () => void;
  onLoginAction?: () => void;
  isTicketsLoading?: boolean;
  tickets?: TicketListItem[];
  onAdminDashboard?: () => void;
  onAdminChats?: () => void;
  onViewLikes?: () => void;
  onViewLikedArtists?: () => void;
  onViewLikedVenues?: () => void;
}

const sectionClassName = "px-6 py-6";
const surfaceClassName = "bg-[var(--color-canvas)]";
const tileClassName = "bg-[var(--color-canvas)] transition-colors hover:bg-[var(--color-surface-muted)]";
const secondaryTextClassName = "ty-body-sm text-[var(--color-muted)]";
const subtleTextClassName = "ty-caption text-[var(--color-muted)]";
const pillToggleBaseClassName = "flex-1 min-w-0 rounded-[var(--radius-pill)] border h-11 px-3 text-center text-sm font-bold leading-tight transition-colors";
const outlinedActionClassName = "ty-caption h-11 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] px-4 text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-ink)]";

const sanitizeDisplayName = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (/^(dev|devuser|devadmin)(\b|-)/i.test(trimmed)) return null;
  return trimmed;
};

const formatLoginProvider = (provider?: string) => {
  if (provider === "kakao") return "카카오";
  if (provider === "naver") return "네이버";
  if (provider === "dev" || provider === "dev-admin") return "개발용";
  if (provider === "review") return "NICEPAY 심사";
  return "DYVE";
};

const nicknameError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "닉네임을 입력해 주세요.";
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9]+$/.test(trimmed)) return "한글, 영문, 숫자만 사용할 수 있어요.";
  if (new TextEncoder().encode(trimmed).length > 30) return "닉네임은 30바이트 이하여야 해요.";
  return null;
};

type DisplayAccountInfoKey = Exclude<keyof AccountInfo, "provider" | "age" | "shippingAddresses">;

const accountInfoRows: Array<{ key: DisplayAccountInfoKey; label: string; purpose: string }> = [
  { key: "name", label: "회원이름", purpose: "회원 식별" },
  { key: "email", label: "이메일 주소", purpose: "계정 및 연락 정보" },
  { key: "gender", label: "성별", purpose: "Buddy Dive 신청 정보" },
  { key: "ageRange", label: "연령대", purpose: "Buddy Dive 신청 정보" },
  { key: "phoneNumber", label: "휴대전화번호", purpose: "계정 및 연락 정보" },
  { key: "birthYear", label: "출생연도", purpose: "Buddy Dive 나이 계산" },
  { key: "birthday", label: "생일", purpose: "Buddy Dive 나이 계산 (선택)" },
  { key: "ci", label: "CI(연계정보)", purpose: "중복 계정 및 회원 식별 (선택)" },
  { key: "ciAuthenticatedAt", label: "CI 발급시각", purpose: "CI 유효성 확인 (선택)" },
];

const formatAccountInfo = (key: DisplayAccountInfoKey, value: string | null, reveal: boolean) => {
  if (!value) return "제공되지 않음";
  if (key === "ci") return `••••${value.slice(-4)}`;
  if (reveal) {
    if (key === "gender") {
      if (value === "M" || value === "male") return "남성";
      if (value === "F" || value === "female") return "여성";
    }
    if (key === "ageRange") return `${value}세`;
    return value;
  }
  if (key === "name") {
    const chars = Array.from(value);
    return `${chars[0]}${"*".repeat(Math.max(1, chars.length - 1))}`;
  }
  if (key === "email") {
    const [local, domain] = value.split("@");
    return domain ? `${local.slice(0, 2)}***@${domain}` : "***";
  }
  if (key === "phoneNumber") return value.replace(/\d(?=(?:\D*\d){4})/g, "*");
  if (key === "birthYear") return `${value.slice(0, 2)}**`;
  if (key === "birthday") return "**-**";
  if (key === "gender") return "비공개";
  if (key === "ageRange") return "**세";
  return "비공개";
};


export function MyPageScreen({
  profile,
  profileType,
  accountInfo,
  authMode,
  authUser,
  onNicknameChange,
  onLoginProvider,
  onLoginDev,
  onLoginAdminDev,
  onReviewLogin,
  onLogout,
  errorMessage,
  ticketActionError,
  cancellingTicketId,
  onCreateArtist,
  onCreateVenue,
  onManageVenueSchedule,
  onCreateGig,
  onEditEvents,
  hasArtistProfile,
  hasVenueProfile,
  venueBusinessRegistrationSubmitted = false,
  venueBusinessRegistrationStatus,
  canQrCheckin = false,
  onQrCheckin,
  preferredRegions,
  onPreferredRegionsChange,
  onTicketClick,
  onTicketCancel,
  waitingItems,
  isWaitingLoading = false,
  waitingErrorMessage,
  onWaitingClick,
  events = [],
  myEvents,
  isEventsLoading = false,
  eventsErrorMessage,
  onEventClick,
  onViewAllEvents,
  onLoginAction,
  isTicketsLoading = false,
  tickets,
  onAdminDashboard,
  onAdminChats,
  onViewLikes,
  onViewLikedArtists,
  onViewLikedVenues,
}: MyPageScreenProps) {
  const [viewMode, setViewMode] = useState<"audience" | "host">("audience");
  const [selectedRegionCode, setSelectedRegionCode] = useState("");
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(authUser?.nickname ?? "");
  const [nicknameSaveError, setNicknameSaveError] = useState<string | null>(null);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isAccountInfoOpen, setIsAccountInfoOpen] = useState(false);
  const [isAccountInfoRevealed, setIsAccountInfoRevealed] = useState(false);
  const [reviewLoginId, setReviewLoginId] = useState("");
  const [reviewLoginPassword, setReviewLoginPassword] = useState("");
  const [reviewLoginError, setReviewLoginError] = useState<string | null>(null);
  const [isReviewLoggingIn, setIsReviewLoggingIn] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const isAdmin = isAdminUser(authUser);
  const canCreateProfile = authMode === "member";
  const canCreateEvent = authMode === "member";
  const resolvedMyEvents = (myEvents ?? events).slice(0, 3);
  const myTickets = tickets ?? [];
  const myWaitingItems = waitingItems ?? [];
  const accountDisplayName = sanitizeDisplayName(authUser?.nickname) ?? sanitizeDisplayName(profile?.name) ?? "DYVE 회원";
  const displayName = profileType
    ? sanitizeDisplayName(profile?.name) ?? accountDisplayName
    : accountDisplayName;
  const selectedRegions = preferredRegions ?? [];
  const avatarImageSrc = profile?.imageUrl || `${import.meta.env.BASE_URL}images/dyve-avatar.svg`;
  const authDescription =
    authMode === "member"
      ? "로그인됨"
      : "로그인하고 공연을 더 편하게 만나보세요";
  const nicknameValidationError = nicknameError(nicknameDraft);
  const nicknameBytes = new TextEncoder().encode(nicknameDraft.trim()).length;

  useEffect(() => {
    setNicknameDraft(authUser?.nickname ?? "");
  }, [authUser?.nickname]);

  const saveNickname = async () => {
    if (!onNicknameChange || nicknameValidationError) return;
    setIsSavingNickname(true);
    setNicknameSaveError(null);
    try {
      await onNicknameChange(nicknameDraft.trim());
      setIsEditingNickname(false);
    } catch {
      setNicknameSaveError("닉네임을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsSavingNickname(false);
    }
  };
  const submitReviewLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onReviewLogin || !reviewLoginId.trim() || !reviewLoginPassword) return;
    setIsReviewLoggingIn(true);
    setReviewLoginError(null);
    try {
      await onReviewLogin(reviewLoginId.trim(), reviewLoginPassword);
    } catch {
      setReviewLoginError("심사 계정 정보를 확인해 주세요. 심사 기간이 아니면 로그인이 제한될 수 있어요.");
    } finally {
      setIsReviewLoggingIn(false);
    }
  };
  const renderSectionLoading = (className = "") => (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <LoadingIndicator className="text-sm text-[var(--color-muted)]" />
    </div>
  );
  const canSubmitBusinessRegistration =
    !venueBusinessRegistrationSubmitted || venueBusinessRegistrationStatus === "rejected";
  const venueBusinessRegistrationFooterText =
    !hasVenueProfile || !canSubmitBusinessRegistration
      ? null
      : venueBusinessRegistrationSubmitted
        ? "사업자등록증 심사가 거절됐어요.\n필요하면 다시 제출해 주세요."
        : "제안과 계약을 진행하려면 사업자등록증을 등록해 주세요.";

  if (authMode !== "member") {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--color-canvas)] px-6 pb-24 text-center text-[var(--color-ink)]">
        <DyveIcon name="user-circle-2" size="lg" tone="primary" className="mb-4 h-10 w-10" />
        <h1 className="text-xl font-bold">마이페이지</h1>
        <button
          type="button"
          onClick={() => setIsLoginDialogOpen(true)}
          className="mt-6 flex h-12 w-full max-w-xs items-center justify-center rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-on-primary)] shadow-[0_0_12px_rgba(255,74,74,0.18)] hover:bg-[var(--color-primary-active)]"
        >
          로그인
        </button>
        <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>로그인</DialogTitle>
              <DialogDescription>로그인하고 찜, 예매, 동행 기능을 이용해 보세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <button type="button" onClick={() => onLoginProvider?.("kakao")} className="relative flex h-12 items-center justify-center overflow-hidden rounded-xl bg-[#FEE500] px-14 text-sm font-semibold text-black/85">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-12 overflow-hidden"><img data-provider-logo="kakao" src={KAKAO_LOGIN_ASSET} alt="" className="h-12 w-[320px] max-w-none object-left" /></span>
                카카오로 시작하기
              </button>
              <button type="button" onClick={() => onLoginProvider?.("naver")} className="relative flex h-12 items-center justify-center overflow-hidden rounded-xl bg-[#03C75A] px-14 text-sm font-semibold text-white">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-12 overflow-hidden border-r border-white/20"><img data-provider-logo="naver" src={NAVER_LOGIN_ASSET} alt="" className="h-12 w-[126px] max-w-none object-left" /></span>
                네이버로 시작하기
              </button>
              <details className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-3 text-left">
                <summary className="cursor-pointer text-sm font-semibold">NICEPAY 심사 계정 로그인</summary>
                <form className="mt-3 grid gap-2" onSubmit={(event) => void submitReviewLogin(event)}>
                  <input value={reviewLoginId} onChange={(event) => setReviewLoginId(event.target.value)} autoComplete="username" placeholder="ID" className="h-10 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm" required />
                  <input type="password" value={reviewLoginPassword} onChange={(event) => setReviewLoginPassword(event.target.value)} autoComplete="current-password" placeholder="비밀번호" className="h-10 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm" required />
                  {reviewLoginError && <p className="text-xs text-[var(--color-error)]">{reviewLoginError}</p>}
                  <button type="submit" disabled={isReviewLoggingIn} className="h-10 rounded-lg bg-[var(--color-primary)] text-sm font-semibold text-white disabled:opacity-50">{isReviewLoggingIn ? "로그인 중" : "심사 계정으로 로그인"}</button>
                </form>
              </details>
              {import.meta.env.DEV && <div className="grid grid-cols-2 gap-2"><button type="button" onClick={onLoginDev} className="h-10 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-xs font-semibold">개발용 로그인</button><button type="button" onClick={onLoginAdminDev} className="h-10 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-xs font-semibold">관리자 로그인</button></div>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-canvas pb-6 text-ink animate-in fade-in duration-500">
      {/* Header */}
      <div className="px-6 py-6 pb-2">
        <h1 className="text-2xl font-bold text-ink">마이페이지</h1>
      </div>

      {/* User Info (Placeholder) */}
      <div className="flex items-center gap-4 px-6 py-6">
        <Avatar className="h-16 w-16 border-2 border-[var(--color-primary)]">
          <AvatarImage src={avatarImageSrc} alt={`${displayName} 프로필`} />
          <AvatarFallback>DY</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-bold text-ink">{displayName}</h2>
          <p className={secondaryTextClassName}>{authDescription}</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="app-top-bar sticky top-0 z-10 flex gap-2 px-6 py-4">
        <button
          onClick={() => setViewMode("audience")}
          className={`${pillToggleBaseClassName} ${viewMode === "audience" ? "border-primary bg-primary text-primary-foreground" : "border-hairline bg-surface-soft text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
        >
          관객
        </button>
        <button
          onClick={() => setViewMode("host")}
          className={`${pillToggleBaseClassName} ${viewMode === "host" ? "border-primary bg-primary text-primary-foreground" : "border-hairline bg-surface-soft text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
        >
          공연 만들기
        </button>
      </div>

      {/* Account Section */}
      <div className={sectionClassName}>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
          <h3 className="text-sm font-bold text-ink">계정</h3>
        </div>
        {authMode === "member" ? (
          <div className={`flex flex-col gap-3 py-4 ${surfaceClassName}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{accountDisplayName}</p>
                <p className={subtleTextClassName}>로그인 방식: {formatLoginProvider(authUser?.provider)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNicknameDraft(authUser?.nickname ?? "");
                    setNicknameSaveError(null);
                    setIsEditingNickname(true);
                  }}
                  className={outlinedActionClassName}
                >
                  닉네임 설정/변경
                </button>
                <button type="button" onClick={onLogout} className={outlinedActionClassName}>
                  로그아웃
                </button>
              </div>
            </div>
            {isEditingNickname && (
              <div className="pt-3">
                <label htmlFor="account-nickname" className="ty-caption font-semibold text-[var(--color-ink)]">
                  닉네임
                </label>
                <input
                  id="account-nickname"
                  value={nicknameDraft}
                  onChange={(event) => setNicknameDraft(event.target.value)}
                  autoComplete="off"
                  className="mt-2 h-11 w-full rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
                  placeholder="한글, 영문, 숫자"
                />
                <div className="mt-1 flex justify-between gap-3 text-xs">
                  <span className={nicknameValidationError ? "text-[var(--color-error)]" : "text-[var(--color-muted)]"}>
                    {nicknameValidationError ?? "한글, 영문, 숫자만 사용할 수 있어요."}
                  </span>
                  <span className={nicknameBytes > 30 ? "text-[var(--color-error)]" : "text-[var(--color-muted)]"}>
                    {nicknameBytes}/30바이트
                  </span>
                </div>
                {nicknameSaveError && <p className="mt-2 text-xs text-[var(--color-error)]">{nicknameSaveError}</p>}
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsEditingNickname(false)} className={outlinedActionClassName}>
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveNickname()}
                    disabled={Boolean(nicknameValidationError) || isSavingNickname}
                    className="ty-caption h-11 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-4 font-bold text-white disabled:opacity-50"
                  >
                    {isSavingNickname ? "저장 중" : "저장"}
                  </button>
                </div>
              </div>
            )}
            {(accountInfo?.provider === "naver" || accountInfo?.provider === "kakao") && (
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setIsAccountInfoOpen((open) => !open)}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold text-[var(--color-ink)]"
                >
                  <span>{formatLoginProvider(accountInfo.provider)} 가입 정보</span>
                  <span className="text-xs text-[var(--color-muted)]">{isAccountInfoOpen ? "접기" : "보기"}</span>
                </button>
                {isAccountInfoOpen && (
                  <div className="mt-3 rounded-[var(--radius-card-md)] bg-[var(--color-surface-soft)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs leading-5 text-[var(--color-muted)]">
                        회원 확인과 Buddy Dive 신청 정보로 사용되며 본인에게만 보여요.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAccountInfoRevealed((revealed) => !revealed)}
                        className="shrink-0 text-xs font-semibold text-[var(--color-primary)]"
                      >
                        {isAccountInfoRevealed ? "숨기기" : "전체 보기"}
                      </button>
                    </div>
                    <dl className="mt-3">
                      {accountInfoRows.map((row) => (
                        <div key={row.key} className="grid grid-cols-[6rem_1fr] gap-3 py-2 text-xs">
                          <dt className="text-[var(--color-muted)]">{row.label}</dt>
                          <dd>
                            <p className="font-semibold text-[var(--color-ink)]">
                              {formatAccountInfo(row.key, accountInfo[row.key], isAccountInfoRevealed)}
                            </p>
                            <p className="mt-0.5 text-[var(--color-muted)]">{row.purpose}</p>
                          </dd>
                        </div>
                      ))}
                      <div className="grid grid-cols-[6rem_1fr] gap-3 py-2 text-xs">
                        <dt className="text-[var(--color-muted)]">배송지정보</dt>
                        <dd>
                          <p className="font-semibold text-[var(--color-ink)]">
                            {accountInfo.shippingAddresses.length > 0
                              ? `${accountInfo.shippingAddresses.length}개 등록`
                              : "제공되지 않음"}
                          </p>
                          <p className="mt-0.5 text-[var(--color-muted)]">수령 및 배송 처리 (선택)</p>
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => onLoginProvider?.("kakao")}
              aria-label="카카오로 시작하기"
              className="relative flex h-12 items-center justify-center overflow-hidden rounded-xl bg-[#FEE500] px-14 text-sm font-semibold text-black/85 transition-opacity hover:opacity-90"
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-12 overflow-hidden">
                <img
                  data-provider-logo="kakao"
                  src={KAKAO_LOGIN_ASSET}
                  alt=""
                  className="h-12 w-[320px] max-w-none object-left"
                />
              </span>
              <span>카카오로 시작하기</span>
            </button>
            <button
              type="button"
              onClick={() => onLoginProvider?.("naver")}
              aria-label="네이버로 시작하기"
              className="relative flex h-12 items-center justify-center overflow-hidden rounded-xl bg-[#03C75A] px-14 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-12 overflow-hidden border-r border-white/20">
                <img
                  data-provider-logo="naver"
                  src={NAVER_LOGIN_ASSET}
                  alt=""
                  className="h-12 w-[126px] max-w-none object-left"
                />
              </span>
              <span>네이버로 시작하기</span>
            </button>
            <details className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)]">NICEPAY 심사 계정 로그인</summary>
              <form className="mt-3 grid gap-2" onSubmit={(event) => void submitReviewLogin(event)}>
                <label className="text-xs text-[var(--color-muted)]">
                  ID
                  <input value={reviewLoginId} onChange={(event) => setReviewLoginId(event.target.value)} autoComplete="username" className="mt-1 h-10 w-full rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm text-[var(--color-ink)]" required />
                </label>
                <label className="text-xs text-[var(--color-muted)]">
                  비밀번호
                  <input type="password" value={reviewLoginPassword} onChange={(event) => setReviewLoginPassword(event.target.value)} autoComplete="current-password" className="mt-1 h-10 w-full rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm text-[var(--color-ink)]" required />
                </label>
                {reviewLoginError && <p className="text-xs text-[var(--color-error)]">{reviewLoginError}</p>}
                <button type="submit" disabled={isReviewLoggingIn} className="h-10 rounded-lg bg-[var(--color-primary)] text-sm font-semibold text-white disabled:opacity-50">
                  {isReviewLoggingIn ? "로그인 중" : "심사 계정으로 로그인"}
                </button>
              </form>
            </details>
            {import.meta.env.DEV ? (
              <div className="grid gap-2">
                <button
                  onClick={onLoginDev}
                  className={`flex items-center justify-between px-4 py-3 text-sm font-bold text-ink ${surfaceClassName} hover:bg-surface-muted`}
                >
                  개발용 로그인
                  <span className="text-xs text-[var(--color-muted)]">토큰 발급</span>
                </button>
                <button
                  onClick={onLoginAdminDev}
                  className={`flex items-center justify-between px-4 py-3 text-sm font-bold text-ink ${surfaceClassName} hover:bg-surface-muted`}
                >
                  관리자 개발 로그인
                  <span className="text-xs text-[var(--color-muted)]">admin</span>
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {viewMode === "host" && (
        <div className="animate-in fade-in duration-300 space-y-2">

          {/* 아티스트 / 베뉴 등록 — 탭 바로 아래 최상단 */}
          <div className="px-6 py-4">
            <button
              onClick={() => { if (!canCreateProfile) { onLoginAction?.(); return; } onCreateArtist?.(); }}
              className={`group flex w-full items-center justify-between p-4 ${tileClassName} ${!canCreateProfile ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 text-[var(--color-primary)]">
                  <DyveIcon name="mic-2" size="md" tone="primary" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-ink">
                    {hasArtistProfile ? "아티스트 프로필 수정" : "아티스트 등록하기"}
                  </span>
                  <span className="text-[11px] text-[var(--color-muted)]">
                    {hasArtistProfile ? "내 아티스트 정보 수정" : "활동 정보를 등록하고 어울리는 무대 찾기"}
                  </span>
                </div>
              </div>
              <DyveIcon name="chevron-right" size="md" tone="muted" className="transition-colors group-hover:text-[var(--color-ink)]" />
            </button>

            <button
              onClick={() => { if (!canCreateProfile) { onLoginAction?.(); return; } onCreateVenue?.(); }}
              className={`group flex w-full items-center justify-between p-4 ${tileClassName} ${!canCreateProfile ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 text-[var(--color-primary)]">
                  <DyveIcon name="building-2" size="md" tone="primary" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-ink">
                    {hasVenueProfile ? "베뉴 프로필 수정" : "베뉴 등록하기"}
                  </span>
                  <span className="text-[11px] text-[var(--color-muted)]">
                    {hasVenueProfile ? "내 공간 정보 수정" : "공간 정보를 등록하고 어울리는 아티스트 찾기"}
                  </span>
                </div>
              </div>
              <DyveIcon name="chevron-right" size="md" tone="muted" className="transition-colors group-hover:text-[var(--color-ink)]" />
            </button>
          </div>

          {/* Partner Center */}
          <div className={sectionClassName}>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              <h3 className="text-sm font-bold text-ink">파트너 센터</h3>
            </div>

            {authMode !== "member" && (
              <div className="mb-4 border-l-2 border-[var(--color-primary)] pl-3 text-xs leading-5 text-[var(--color-muted)]">
                로그인 후 등록할 수 있어요.
              </div>
            )}
            <div>
              {/* Venue Schedule */}
              {hasVenueProfile && (
                <button
                  onClick={() => { if (!canCreateProfile) { onLoginAction?.(); return; } onManageVenueSchedule?.(); }}
                  className={`group flex w-full items-center justify-between p-4 ${tileClassName} ${!canCreateProfile ? "opacity-80" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 text-[var(--color-primary)]">
                      <DyveIcon name="calendar-days" size="md" tone="primary" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-ink">공연 가능 일정 관리</span>
                      <span className="text-[11px] text-[var(--color-muted)]">대관 및 공연이 가능한 날짜 정보</span>
                    </div>
                  </div>
                  <DyveIcon name="chevron-right" size="md" tone="muted" className="transition-colors group-hover:text-[var(--color-ink)]" />
                </button>
              )}

              {/* Gig Register */}
              <button
                onClick={() => { if (!canCreateEvent) { onLoginAction?.(); return; } onCreateGig?.(); }}
                className={`group flex w-full items-center justify-between p-4 ${!canCreateEvent ? "opacity-80" : ""} bg-[var(--color-primary)] text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-active)]`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5">
                    <DyveIcon name="ticket" size="md" tone="inverse" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-bold">새 공연 등록하기</span>
                    <span className="text-[11px] text-[var(--color-on-primary)]/75">프로필 없이 신청 가능 · 승인 후 공개</span>
                  </div>
                </div>
                <DyveIcon name="chevron-right" size="md" tone="inverse" />
              </button>

              {/* Edit Events */}
              <button
                onClick={() => { if (!canCreateEvent) { onLoginAction?.(); return; } onEditEvents?.(); }}
                disabled={!canCreateEvent}
                className={`group flex w-full items-center justify-between p-4 ${tileClassName} ${!canCreateEvent ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 text-[var(--color-primary)]">
                    <DyveIcon name="file-text" size="md" tone="primary" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-bold text-ink">등록한 공연 정보 수정</span>
                    <span className="text-[11px] text-[var(--color-muted)]">내 공연 목록에서 선택</span>
                  </div>
                </div>
                <DyveIcon name="chevron-right" size="md" tone="muted" className="transition-colors group-hover:text-[var(--color-ink)]" />
              </button>

              {/* QR Checkin */}
              {canQrCheckin && (
                <button
                  onClick={onQrCheckin}
                  className={`group flex w-full items-center justify-between p-4 ${tileClassName}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 text-[var(--color-primary)]">
                      <DyveIcon name="qr-code" size="md" tone="primary" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-ink">QR 입장</span>
                      <span className="text-[11px] text-[var(--color-muted)]">스태프 전용 체크인</span>
                    </div>
                  </div>
                  <DyveIcon name="chevron-right" size="md" tone="muted" className="transition-colors group-hover:text-[var(--color-ink)]" />
                </button>
              )}
            </div>
          </div>

          {/* My Events (Artist / Venue Side) */}
          <div className="px-6 py-2 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
                <DyveIcon name="calendar-days" size="md" tone="primary" />
                내 공연
              </h3>
              <button
                onClick={onViewAllEvents}
                className="text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
              >
                  전체 보기
              </button>
            </div>

            {isEventsLoading ? (
              renderSectionLoading()
            ) : resolvedMyEvents.length > 0 ? (
              <HorizontalRail ariaLabel="내 공연 목록" className="-mx-6" contentClassName="px-6">
                {resolvedMyEvents.map((event, index) => {
                  const eventRecord = event as Record<string, unknown>;
                  const eventId = String(
                    (eventRecord.id as string | number | undefined) ??
                    (eventRecord.eventId as string | number | undefined) ??
                    (eventRecord.event_id as string | number | undefined) ??
                    (eventRecord.uuid as string | number | undefined) ??
                    "",
                  );
                  const image =
                    (eventRecord.image as string | undefined) ??
                    (eventRecord.imageUrl as string | undefined) ??
                    (eventRecord.thumbnail as string | undefined) ??
                    "";
                  const title = (eventRecord.title as string | undefined) ?? "";
                  const venue = (eventRecord.venue as string | undefined) ?? "";
                  const dateDisplay =
                    (eventRecord.dateDisplay as string | undefined) ??
                    (eventRecord.date as string | undefined) ??
                    formatDateDisplay((eventRecord.startAt as string | null) ?? null);
                  return (
                    <button
                      type="button"
                      key={eventId || `event-${index}`}
                      onClick={() => onEventClick?.(event)}
                      className="group w-60 flex-shrink-0 overflow-hidden rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] text-left transition-colors hover:border-[var(--color-primary)]/30"
                    >
                      <div className="h-32 w-full">
                        <DyveImage src={image} alt={title} className="h-full w-full bg-[var(--color-surface-muted)] object-contain p-1.5" />
                      </div>
                      <div className="p-3">
                        <h4 className="ty-body-sm mb-2 truncate font-bold text-[var(--color-ink)]">{title}</h4>
                        <dl data-static-info className="text-xs">
                          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 py-1.5"><dt className="text-[var(--color-muted)]">일시</dt><dd className="truncate font-medium text-[var(--color-body)]">{dateDisplay || "일정 미정"}</dd></div>
                          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 py-1.5"><dt className="text-[var(--color-muted)]">장소</dt><dd className="truncate font-medium text-[var(--color-body)]">{venue || "장소 미정"}</dd></div>
                        </dl>
                      </div>
                    </button>
                  );
                })}
              </HorizontalRail>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-[var(--color-muted)]">
                  {authMode !== "member"
                    ? "로그인 후 확인할 수 있어요."
                    : eventsErrorMessage ?? "등록한 공연이 아직 없습니다."}
                </p>
                {authMode !== "member" && (
                  <button
                    onClick={onLoginAction}
                    className="ty-caption mt-3 h-11 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
                  >
                    로그인하러 가기
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "audience" && (
        <div className="animate-in fade-in duration-300 space-y-2">

          {/* Preferred Regions */}
          <div className={sectionClassName}>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              <h3 className="text-sm font-bold text-ink uppercase tracking-[0.04em]">선호 지역</h3>
            </div>
            <p className="text-sm font-medium leading-6 text-ink">
              선호 지역을 설정하면 가까운 공연을 더 쉽게 볼 수 있어요.
            </p>
            <p className="mb-4 mt-2 whitespace-pre-line text-xs leading-5 text-[var(--color-muted)]">
              {"아티스트와 베뉴 활동 지역과는 별도로 저장돼요.\n특별시·도 단위로 여러 지역을 선택할 수 있어요."}
            </p>
            <div className="flex gap-2">
              <DyveSelect
                value={selectedRegionCode}
                onValueChange={setSelectedRegionCode}
                options={REGION_OPTIONS.filter((region) => !selectedRegions.includes(region.code)).map((region) => ({
                  value: region.code,
                  label: region.label,
                }))}
                placeholder="지역 선택"
                triggerClassName="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (!selectedRegionCode || !onPreferredRegionsChange) return;
                  onPreferredRegionsChange([...selectedRegions, selectedRegionCode]);
                  setSelectedRegionCode("");
                }}
                className="rounded-[var(--radius-card-lg)] bg-[var(--color-primary)] px-4 text-sm font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)] transition-colors"
              >
                추가
              </button>
            </div>
            <div className="mt-3 flex min-h-[44px] flex-wrap gap-2">
              {selectedRegions.map((code) => {
                const region = REGION_OPTIONS.find((option) => option.code === code);
                return (
                  <div key={code} className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
                    <span>{region?.label ?? code}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!onPreferredRegionsChange) return;
                        onPreferredRegionsChange(selectedRegions.filter((item) => item !== code));
                      }}
                      className="text-primary/70 hover:text-primary"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {selectedRegions.length === 0 && (
                <span className="pl-1 text-sm text-[var(--color-muted)]">선택된 지역이 아직 없습니다.</span>
              )}
            </div>
            <div className="mt-3 text-[11px] text-[var(--color-muted)]">
              {selectedRegions.length > 0
                ? `선택됨: ${selectedRegions
                    .map((code) => REGION_OPTIONS.find((option) => option.code === code)?.label ?? code)
                    .join(", ")}`
                : "선호 지역을 선택해 주세요."}
            </div>
          </div>

          {/* Liked Section */}
          {(onViewLikes || onViewLikedArtists || onViewLikedVenues) && (
            <div className={sectionClassName}>
              <div>
                {onViewLikes && (
                  <button
                    type="button"
                    onClick={onViewLikes}
                    className="flex min-h-14 w-full items-center justify-between px-2 py-4 transition-colors hover:bg-[var(--color-surface-muted)]"
                  >
                    <div className="flex items-center gap-3">
                      <DyveIcon name="heart-filled" size="md" tone="primary" className="h-5 w-5 text-[var(--color-primary)]" />
                      <span className="text-sm font-bold text-[var(--color-ink)]">관심 공연</span>
                    </div>
                    <DyveIcon name="chevron-right" size="sm" tone="muted" className="h-4 w-4" />
                  </button>
                )}
                {onViewLikedArtists && (
                  <button
                    type="button"
                    onClick={onViewLikedArtists}
                    className="flex min-h-14 w-full items-center justify-between px-2 py-4 transition-colors hover:bg-[var(--color-surface-muted)]"
                  >
                    <div className="flex items-center gap-3">
                      <DyveIcon name="heart-filled" size="md" tone="primary" className="h-5 w-5 text-[var(--color-primary)]" />
                      <span className="text-sm font-bold text-[var(--color-ink)]">관심 아티스트</span>
                    </div>
                    <DyveIcon name="chevron-right" size="sm" tone="muted" className="h-4 w-4" />
                  </button>
                )}
                {onViewLikedVenues && (
                  <button
                    type="button"
                    onClick={onViewLikedVenues}
                    className="flex min-h-14 w-full items-center justify-between px-2 py-4 transition-colors hover:bg-[var(--color-surface-muted)]"
                  >
                    <div className="flex items-center gap-3">
                      <DyveIcon name="heart-filled" size="md" tone="primary" className="h-5 w-5 text-[var(--color-primary)]" />
                      <span className="text-sm font-bold text-[var(--color-ink)]">관심 베뉴</span>
                    </div>
                    <DyveIcon name="chevron-right" size="sm" tone="muted" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* My Tickets Section */}
          <div className={sectionClassName}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
                <DyveIcon name="ticket" size="md" tone="primary" className="h-5 w-5" />
                예매 내역
              </h3>
            </div>

            <div>
              {ticketActionError && (
                <div className="rounded-xl border border-[var(--color-primary)]/40 bg-primary/5 p-3 text-center text-xs text-[var(--color-primary)]">
                  <div className="flex items-center justify-center gap-2">
                    <DyveIcon name="wallet-chargeback" size="sm" className="h-4 w-4 text-[var(--color-primary)]" />
                    <span>{ticketActionError}</span>
                  </div>
                </div>
              )}
              {isTicketsLoading ? (
                renderSectionLoading()
              ) : myTickets.length > 0 ? (
                myTickets.map((ticket) => (
                  <div key={ticket.id} className="py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onTicketClick?.(ticket)} className="flex min-w-0 flex-1 gap-4 rounded-lg p-1 text-left transition-colors hover:bg-[var(--color-surface-muted)]">
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                          <DyveImage src={ticket.image} alt={ticket.title} className="h-full w-full bg-surface-muted object-contain p-1" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center">
                          <h4 className="truncate text-base font-bold text-ink">{ticket.title}</h4>
                          <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted)]">
                            <DyveIcon name="clock" size="sm" tone="muted" className="h-3 w-3" />
                            {ticket.dateDisplay}
                          </p>
                          <p className={`mt-2 text-xs font-semibold ${ticket.status === "cancelled" ? "text-[var(--color-muted)]" : "text-[var(--color-primary)]"}`}>
                            {ticket.status === "cancelled" ? "취소됨" : "예매 완료"}
                          </p>
                        </div>
                        <DyveIcon name="chevron-right" size="md" tone="muted" className="my-auto h-5 w-5 flex-shrink-0" />
                      </button>
                      {ticket.canCancel && onTicketCancel && (
                        <button
                          type="button"
                          onClick={() => onTicketCancel(ticket)}
                          disabled={cancellingTicketId === ticket.id}
                          className="ty-micro min-h-11 flex-shrink-0 px-2 font-semibold text-[var(--color-muted)] underline-offset-4 hover:text-[var(--color-primary)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cancellingTicketId === ticket.id ? "취소 중..." : "취소"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-[var(--color-muted)]">
                  {authMode !== "member"
                    ? "로그인 후 확인할 수 있어요."
                    : errorMessage ?? "예매된 공연이 없습니다."}
                  {authMode !== "member" && (
                    <div className="mt-3">
                      <button
                        onClick={onLoginAction}
                        className="ty-caption h-11 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
                      >
                        로그인하러 가기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* My Waiting Section */}
          <div className={sectionClassName}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
                <DyveIcon name="clock" size="md" tone="primary" className="h-5 w-5" />
                대기 내역
              </h3>
            </div>

            <div>
              {waitingErrorMessage && (
                <div className="rounded-xl border border-[var(--color-primary)]/40 bg-primary/5 p-3 text-center text-xs text-[var(--color-primary)]">
                  {waitingErrorMessage}
                </div>
              )}
              {isWaitingLoading ? (
                renderSectionLoading()
              ) : myWaitingItems.length > 0 ? (
                myWaitingItems.map((item) => (
                  <button
                    type="button"
                    key={item.eventId}
                    onClick={() => onWaitingClick?.(item)}
                    className="relative flex w-full gap-4 p-3 pr-24 text-left transition-colors hover:bg-surface-muted"
                  >
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                      <DyveImage src={item.image} alt={item.title} className="h-full w-full bg-surface-muted object-contain p-1" />
                    </div>
                    <div className="flex flex-col justify-center flex-1 overflow-hidden">
                      <h4 className="truncate text-base font-bold text-ink">{item.title}</h4>
                      <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted)]">
                        <DyveIcon name="clock" size="sm" tone="muted" className="h-3 w-3" />
                        {item.dateDisplay}
                      </p>
                    </div>
                    <div className="flex items-start pt-1">
                      <DyveIcon name="chevron-right" size="md" tone="muted" className="h-5 w-5 text-[var(--color-muted)]" />
                    </div>
                    <div
                      className={`absolute bottom-3 right-3 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.status === "booked"
                        ? "border-[var(--color-info)]/40 bg-[var(--color-info)]/10 text-[var(--color-info)]"
                        : "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        }`}
                    >
                      {item.status === "booked"
                        ? "예매 성공"
                        : typeof item.position === "number"
                          ? `대기 ${item.position}번`
                          : "대기 중"}
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-[var(--color-muted)]">
                  {authMode !== "member"
                    ? "로그인 후 확인할 수 있어요."
                    : "대기 등록한 공연이 없습니다."}
                  {authMode !== "member" && (
                    <div className="mt-3">
                      <button
                        onClick={onLoginAction}
                        className="ty-caption h-11 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
                      >
                        로그인하러 가기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="mt-3 text-[11px] text-[var(--color-muted)]">
              대기 관련 알림이 발송되면 알림 탭에서 확인할 수 있어요.
            </p>
          </div>
        </div>
      )}

      {/* Admin Section */}
      {isAdmin && (
        <div className="px-6 space-y-1 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
              <DyveIcon name="shield" size="md" tone="primary" className="h-5 w-5" />
              DYVE 스태프 메뉴
            </h3>
          </div>
          {[
            { iconName: "qr-code" as const, label: "QR 입장", onClick: onQrCheckin },
            { iconName: "shield" as const, label: "DYVE 관리자 대시보드", onClick: onAdminDashboard },
            { iconName: "message-square-support" as const, label: "관리자용 전체 채팅 목록", onClick: onAdminChats }
          ].map((item, idx) => (
            <button key={idx} onClick={item.onClick} className="group flex w-full items-center justify-between p-4 hover:bg-surface-muted">
              <div className="flex items-center gap-3">
                <DyveIcon name={item.iconName} size="md" tone="primary" className="h-5 w-5 rotate-0 transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-ink">{item.label}</span>
              </div>
              <DyveIcon name="chevron-right" size="sm" tone="muted" className="h-4 w-4 text-[var(--color-muted)]" />
            </button>
          ))}
        </div>
      )}

      {venueBusinessRegistrationFooterText && (
        <div className="px-6 pb-10 pt-4 text-center text-[11px] leading-5 text-[var(--color-muted)]">
          <span className="whitespace-pre-line">{venueBusinessRegistrationFooterText}</span>
          <button
            type="button"
            onClick={onCreateVenue}
            className="ml-2 font-semibold text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-ink)]"
          >
            {venueBusinessRegistrationSubmitted ? "재제출" : "등록"}
          </button>
        </div>
      )}
    </div>
  );
}
