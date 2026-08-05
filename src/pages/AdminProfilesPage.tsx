import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  api,
  formatApiError,
  type AdminSettlementPreview,
  type AdminEventTicket,
  type AdminUserItem,
  type EventDiscountCode,
} from "../services/api";
import { DyveImage } from "../components/figma/dyve/DyveImage";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/figma/ui/dialog";
import { toast } from "sonner";

type ManageTab = "audience" | "artist" | "venue" | "events";
type ArtistApprovalFilter = "all" | "pending" | "approved" | "rejected" | "dummy";
type EventApprovalFilter = "all" | "pending" | "approved" | "rejected" | "dummy";

type ManagedItem = {
  id: string;
  userId?: string;
  title?: string;
  name?: string;
  type?: string;
  image?: string;
  imageUrl?: string;
  role?: string;
  status?: string;
  isBlocked?: boolean;
  isDyvePick?: boolean;
  isDyveResident?: boolean;
  isFeatured?: boolean;
  createdAt?: string;
  ticketCount?: number;
  eventCount?: number;
  email?: string;
  phoneNumber?: string;
  authProvider?: string;
  nickname?: string;
  profileName?: string;
  hostProfileName?: string | null;
  contractId?: string | null;
  eventStatus?: string;
  hasSettlement?: boolean;
  settlementStatus?: string | null;
  canComplete?: boolean;
  canSettle?: boolean;
  startAt?: string;
  region?: string | null;
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalReviewedAt?: string | null;
  rejectionReason?: string;
  checkinMessage?: string;
  minimumBookingQuantity?: number;
  address?: string | null;
  detailAddress?: string | null;
  admissionType?: string | null;
  refundPolicy?: { name?: string } | null;
  paymentSummary?: { issued?: number; paid?: number; cancelled?: number; refunded?: number };
  discountCode?: EventDiscountCode | null;
  isDummyCandidate?: boolean;
  bio?: string | null;
};

const TAB_CONFIG: { id: ManageTab; label: string }[] = [
  { id: "audience", label: "관객" },
  { id: "artist", label: "아티스트" },
  { id: "venue", label: "베뉴" },
  { id: "events", label: "공연" },
];

function isManageTab(value: string | null): value is ManageTab {
  return TAB_CONFIG.some(({ id }) => id === value);
}

const EVENT_STATUS_LABEL: Record<string, string> = {
  pending_checklist: "체크리스트 대기",
  active: "진행 예정/진행 중",
  completed: "공연 완료",
};

const ADMIN_STATUS_LABEL: Record<string, string> = {
  active: "정상",
  blocked: "차단",
};

const ARTIST_APPROVAL_LABEL: Record<"pending" | "approved" | "rejected", string> = {
  pending: "승인 대기",
  approved: "승인",
  rejected: "반려",
};

const ARTIST_APPROVAL_FILTERS: Array<{ id: ArtistApprovalFilter; label: string }> = [
  { id: "pending", label: "승인 대기" },
  { id: "approved", label: "승인" },
  { id: "rejected", label: "반려" },
  { id: "dummy", label: "더미 후보" },
  { id: "all", label: "전체" },
];

function formatDate(dateText?: string) {
  if (!dateText) return "-";
  return dateText.slice(0, 10);
}

function formatCurrency(amount: number) {
  return `₩${amount.toLocaleString()}`;
}

function AccountBlock({
  label,
  party,
}: {
  label: string;
  party: AdminSettlementPreview["artist"];
}) {
  return (
    <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="ty-body-sm font-bold text-[var(--color-ink)]">{label}</p>
        <p className="ty-body-sm font-bold text-[var(--color-accent-pink)]">{formatCurrency(party.amount)}</p>
      </div>
      <div className="space-y-1 ty-caption text-[var(--color-muted)]">
        <p>정산 대상: {party.name}</p>
        <p>은행명: {party.bankName ?? "-"}</p>
        <p>계좌번호: {party.accountNumber ?? "-"}</p>
        <p>예금주: {party.accountHolder ?? "-"}</p>
      </div>
    </div>
  );
}

export function AdminProfilesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: ManageTab = isManageTab(requestedTab) ? requestedTab : "artist";
  const [items, setItems] = useState<ManagedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [preview, setPreview] = useState<AdminSettlementPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmingSettlement, setConfirmingSettlement] = useState(false);
  const [completingEventId, setCompletingEventId] = useState<string | null>(null);
  const [artistApprovalFilter, setArtistApprovalFilter] = useState<ArtistApprovalFilter>("pending");
  const [eventApprovalFilter, setEventApprovalFilter] = useState<EventApprovalFilter>(
    searchParams.get("approval") === "pending" ? "pending" : "all",
  );
  const [processingArtistId, setProcessingArtistId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ManagedItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [checkinMessages, setCheckinMessages] = useState<Record<string, string>>({});
  const [savingCheckinMessageId, setSavingCheckinMessageId] = useState<string | null>(null);
  const [minimumBookingQuantities, setMinimumBookingQuantities] = useState<Record<string, string>>({});
  const [savingMinimumBookingQuantityId, setSavingMinimumBookingQuantityId] = useState<string | null>(null);
  const [discountCodeDrafts, setDiscountCodeDrafts] = useState<Record<string, {
    code: string;
    discountAmountPerTicket: string;
    isActive: boolean;
  }>>({});
  const [savingDiscountCodeId, setSavingDiscountCodeId] = useState<string | null>(null);
  const [eventTickets, setEventTickets] = useState<Record<string, AdminEventTicket[]>>({});
  const [loadingTicketsFor, setLoadingTicketsFor] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  const load = useCallback(async (reset = true, nextCursor?: string | null) => {
    if (reset) {
      setIsLoading(true);
      setCursor(null);
    }
    setError(null);
    try {
      const params: Record<string, string | number | boolean | null | undefined> = {
        limit: 30,
        q: searchQ || undefined,
        cursor: reset ? undefined : nextCursor ?? undefined,
        approvalStatus: tab === "artist" && artistApprovalFilter !== "all" && artistApprovalFilter !== "dummy" ? artistApprovalFilter : undefined,
        dummy: (tab === "artist" && artistApprovalFilter === "dummy") || (tab === "events" && eventApprovalFilter === "dummy") ? true : undefined,
      };
      let res;
      if (tab === "events") {
        res = await api.adminListEvents({
          ...params,
          approvalStatus: eventApprovalFilter !== "all" && eventApprovalFilter !== "dummy" ? eventApprovalFilter : undefined,
        });
      } else if (tab === "audience") {
        res = await api.adminListUsers({ ...params, profileType: "audience" });
      } else {
        res = await api.listProfiles({ ...params, type: tab }, undefined, true);
      }
      const newItems: ManagedItem[] = tab === "audience"
        ? (res.data as AdminUserItem[]).map((user) => ({
            id: user.ownerId,
            name: user.socialName ?? user.displayName ?? undefined,
            profileName: user.displayName ?? undefined,
            imageUrl: user.profileImageUrl ?? undefined,
            authProvider: user.authProvider ?? undefined,
            nickname: user.nickname ?? undefined,
            email: user.email ?? undefined,
            phoneNumber: user.phoneNumber ?? undefined,
            type: user.activeProfileType ?? undefined,
            status: user.status,
            isBlocked: user.status === "blocked",
            isDyvePick: user.badges.isDyvePick ?? undefined,
            isDyveResident: user.badges.isDyveResident ?? undefined,
          }))
        : res.data as ManagedItem[];
      setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
      setCheckinMessages((prev) => ({
        ...(reset ? {} : prev),
        ...Object.fromEntries(newItems.map((item) => [item.id, item.checkinMessage ?? ""])),
      }));
      setMinimumBookingQuantities((prev) => ({
        ...(reset ? {} : prev),
        ...Object.fromEntries(newItems.map((item) => [item.id, String(item.minimumBookingQuantity ?? 1)])),
      }));
      setDiscountCodeDrafts((prev) => ({
        ...(reset ? {} : prev),
        ...Object.fromEntries(newItems.map((item) => [
          item.id,
          {
            code: item.discountCode?.code ?? "",
            discountAmountPerTicket: item.discountCode
              ? String(item.discountCode.discountAmountPerTicket)
              : "",
            isActive: item.discountCode?.isActive ?? true,
          },
        ])),
      }));
      setCursor(res.nextCursor);
      setHasMore(Boolean(res.nextCursor));
    } catch (err: unknown) {
      if (tab === "artist" || tab === "audience") {
        setError(formatApiError(
          err,
          tab === "artist"
            ? "아티스트 승인 목록을 불러오지 못했습니다."
            : "관객 이용자 목록을 불러오지 못했습니다.",
        ));
        return;
      }
      try {
        let fallback;
        if (tab === "events") {
          fallback = await api.getEvents({ q: searchQ || undefined, limit: 30 });
        } else {
          fallback = await api.listProfiles(
            {
              type: tab,
              limit: 30,
            },
            undefined,
            true,
          );
        }
        setItems(fallback.data as ManagedItem[]);
        setHasMore(false);
      } catch (err: unknown) {
        setError(formatApiError(err, "목록을 불러오지 못했습니다."));
      }
    } finally {
      setIsLoading(false);
    }
  }, [artistApprovalFilter, eventApprovalFilter, searchQ, tab]);

  useEffect(() => {
    void load(true);
  }, [load]);

  const displayLabel = (item: ManagedItem) => item.title ?? item.name ?? "이름 없음";
  const displayImage = (item: ManagedItem) => item.imageUrl ?? item.image;

  const handleCompleteEvent = async (item: ManagedItem, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!item.startAt || completingEventId) return;
    setCompletingEventId(item.id);
    try {
      await api.adminCompleteEvent(item.id);
      toast.success("공연을 완료 상태로 변경했습니다.");
      await load(true);
    } catch (err: unknown) {
      toast.error(formatApiError(err, "공연 완료 처리에 실패했습니다."));
    } finally {
      setCompletingEventId(null);
    }
  };

  const handleOpenSettlement = async (item: ManagedItem, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (previewLoading) return;
    setPreviewLoading(true);
    try {
      const data = await api.adminPreviewSettlement(item.id);
      setPreview(data);
      setPreviewOpen(true);
    } catch (err: unknown) {
      toast.error(formatApiError(err, "정산 예상 내역을 불러오지 못했습니다."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmSettlement = async () => {
    if (!preview || confirmingSettlement) return;
    setConfirmingSettlement(true);
    try {
      await api.adminConfirmSettlement(preview.eventId);
      toast.success("정산을 완료로 기록했습니다.");
      setPreviewOpen(false);
      setPreview(null);
      await load(true);
    } catch (err: unknown) {
      toast.error(formatApiError(err, "정산 확정에 실패했습니다."));
    } finally {
      setConfirmingSettlement(false);
    }
  };

  const handleApproveArtist = async (item: ManagedItem, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (processingArtistId) return;
    setProcessingArtistId(item.id);
    try {
      await api.approveAdminArtistProfile(item.id);
      toast.success("아티스트 프로필을 승인했습니다.");
      await load(true);
    } catch (err: unknown) {
      toast.error(formatApiError(err, "아티스트 승인에 실패했습니다."));
    } finally {
      setProcessingArtistId(null);
    }
  };

  const handleApproveEvent = async (item: ManagedItem) => {
    try {
      await api.adminApproveEvent(item.id);
      toast.success("공연을 승인했습니다.");
      await load(true);
    } catch (err) {
      toast.error(formatApiError(err, "공연 승인에 실패했습니다."));
    }
  };

  const handleRejectEvent = async (item: ManagedItem) => {
    const reason = window.prompt("반려 사유를 입력해 주세요.");
    if (!reason?.trim()) return;
    try {
      await api.adminRejectEvent(item.id, { reason: reason.trim() });
      toast.success("공연을 반려했습니다.");
      await load(true);
    } catch (err) {
      toast.error(formatApiError(err, "공연 반려에 실패했습니다."));
    }
  };

  const handleDeleteEvent = async (item: ManagedItem) => {
    if (deletingEventId || !window.confirm(`'${displayLabel(item)}' 공연을 삭제할까요?\n삭제하면 서비스와 관리자 기본 목록에서 숨겨집니다.`)) return;
    setDeletingEventId(item.id);
    try {
      await api.deleteAdminEvent(item.id);
      setItems((current) => current.filter((event) => event.id !== item.id));
      toast.success("공연을 삭제했습니다.");
    } catch (err: unknown) {
      toast.error(formatApiError(err, "공연 삭제에 실패했습니다."));
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleDeleteProfile = async (item: ManagedItem) => {
    const profileType = tab === "artist" ? "아티스트" : "베뉴";
    if (
      deletingProfileId
      || !window.confirm(
        `'${displayLabel(item)}' ${profileType} 프로필을 삭제할까요?\n서비스에서 숨김 처리되며 운영 기록은 보존됩니다.`,
      )
    ) return;

    setDeletingProfileId(item.id);
    try {
      await api.deleteAdminProfile(item.id);
      setItems((current) => current.filter((profile) => profile.id !== item.id));
      toast.success(`${profileType} 프로필을 삭제했습니다.`);
    } catch (err: unknown) {
      toast.error(formatApiError(err, `${profileType} 프로필 삭제에 실패했습니다.`));
    } finally {
      setDeletingProfileId(null);
    }
  };

  const handleLoadTickets = async (eventId: string) => {
    try {
      setLoadingTicketsFor(eventId);
      const response = await api.adminListEventTickets(eventId);
      setEventTickets((current) => ({ ...current, [eventId]: response.data }));
    } catch (err) {
      toast.error(formatApiError(err, "예매 내역을 불러오지 못했습니다."));
    } finally {
      setLoadingTicketsFor(null);
    }
  };

  const handleAdminCancelTicket = async (eventId: string, ticket: AdminEventTicket) => {
    const reason = window.prompt(`${ticket.holderName ?? ticket.profileName ?? "예매자"}님의 예매를 취소하는 사유를 입력해 주세요.`);
    if (!reason?.trim()) return;
    try {
      await api.adminCancelTicket(ticket.id, { reason: reason.trim() });
      toast.success("예매 취소·환불을 처리했습니다.");
      await handleLoadTickets(eventId);
      await load(true);
    } catch (err) {
      toast.error(formatApiError(err, "예매 취소에 실패했습니다."));
    }
  };

  const handleSaveCheckinMessage = async (item: ManagedItem) => {
    if (savingCheckinMessageId) return;
    const message = (checkinMessages[item.id] ?? "").trim();
    setSavingCheckinMessageId(item.id);
    try {
      await api.adminUpdateEventCheckinMessage(item.id, message);
      setItems((current) => current.map((event) => (
        event.id === item.id ? { ...event, checkinMessage: message } : event
      )));
      setCheckinMessages((current) => ({ ...current, [item.id]: message }));
      toast.success("입장 멘트를 저장했습니다.");
    } catch (err: unknown) {
      toast.error(formatApiError(err, "입장 멘트 저장에 실패했습니다."));
    } finally {
      setSavingCheckinMessageId(null);
    }
  };

  const handleSaveMinimumBookingQuantity = async (item: ManagedItem) => {
    if (savingMinimumBookingQuantityId) return;
    const minimumBookingQuantity = Number(minimumBookingQuantities[item.id]);
    if (!Number.isInteger(minimumBookingQuantity) || minimumBookingQuantity < 1) {
      toast.error("최소 예매 인원은 1명 이상이어야 합니다.");
      return;
    }
    setSavingMinimumBookingQuantityId(item.id);
    try {
      await api.adminUpdateEventMinimumBookingQuantity(item.id, minimumBookingQuantity);
      setItems((current) => current.map((event) => (
        event.id === item.id ? { ...event, minimumBookingQuantity } : event
      )));
      toast.success(minimumBookingQuantity === 1 ? "최소 예매 인원 제한을 해제했습니다." : `최소 ${minimumBookingQuantity}명으로 저장했습니다.`);
    } catch (err: unknown) {
      toast.error(formatApiError(err, "최소 예매 인원 저장에 실패했습니다."));
    } finally {
      setSavingMinimumBookingQuantityId(null);
    }
  };

  const handleSaveDiscountCode = async (item: ManagedItem) => {
    if (savingDiscountCodeId) return;
    const draft = discountCodeDrafts[item.id];
    const code = draft?.code.trim() ?? "";
    const discountAmountPerTicket = Number(draft?.discountAmountPerTicket);
    if (!code) {
      toast.error("할인코드를 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(discountAmountPerTicket) || discountAmountPerTicket < 1) {
      toast.error("티켓당 할인액은 1원 이상이어야 합니다.");
      return;
    }
    setSavingDiscountCodeId(item.id);
    try {
      const updated = await api.adminUpdateEventDiscountCode(item.id, {
        code,
        discountAmountPerTicket,
        isActive: draft?.isActive ?? true,
      });
      setItems((current) => current.map((event) => (
        event.id === item.id ? { ...event, discountCode: updated } : event
      )));
      setDiscountCodeDrafts((current) => ({
        ...current,
        [item.id]: {
          code: updated.code,
          discountAmountPerTicket: String(updated.discountAmountPerTicket),
          isActive: updated.isActive,
        },
      }));
      toast.success("할인코드를 저장했습니다.");
    } catch (err: unknown) {
      toast.error(formatApiError(err, "할인코드 저장에 실패했습니다."));
    } finally {
      setSavingDiscountCodeId(null);
    }
  };

  const handleRejectArtist = async () => {
    if (!rejectTarget || !rejectReason.trim() || processingArtistId) return;
    setProcessingArtistId(rejectTarget.id);
    try {
      await api.rejectAdminArtistProfile(rejectTarget.id, rejectReason.trim());
      toast.success("아티스트 프로필을 반려했습니다.");
      setRejectTarget(null);
      setRejectReason("");
      await load(true);
    } catch (err: unknown) {
      toast.error(formatApiError(err, "아티스트 반려에 실패했습니다."));
    } finally {
      setProcessingArtistId(null);
    }
  };

  const renderEventActions = (item: ManagedItem) => {
    if (tab !== "events") return null;

    const hasSettlement = item.hasSettlement === true;
    const canComplete = item.canComplete === true;
    const canSettle = item.canSettle === true;
    const discountDraft = discountCodeDrafts[item.id] ?? {
      code: "",
      discountAmountPerTicket: "",
      isActive: true,
    };

    return (
      <details className="group mt-3 border-t border-[var(--color-hairline)] pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-[var(--radius-button-md)] px-2 ty-body-sm font-bold text-[var(--color-body)] hover:bg-[var(--color-surface-muted)] [&::-webkit-details-marker]:hidden">
          공연 관리 도구
          <DyveIcon name="chevron-right" size="sm" tone="muted" className="h-4 w-4 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-3 space-y-3">
        <div className="grid gap-1 ty-caption text-[var(--color-muted)]">
          {(item.address || item.detailAddress) && <p>주소: {[item.address, item.detailAddress].filter(Boolean).join(" ")}</p>}
          {item.admissionType && <p>입장 방식: {item.admissionType}</p>}
          {item.refundPolicy?.name && <p>취소 규정: {item.refundPolicy.name}</p>}
          {item.paymentSummary && <p>예매 {item.paymentSummary.paid ?? 0} · 취소 {item.paymentSummary.cancelled ?? 0} · 환불 {item.paymentSummary.refunded ?? 0}</p>}
        </div>
        <div>
          <button type="button" onClick={() => void handleLoadTickets(item.id)} disabled={loadingTicketsFor === item.id} className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] px-3 py-2 ty-caption font-bold text-[var(--color-body)] disabled:opacity-50">
            {loadingTicketsFor === item.id ? "예매 불러오는 중..." : "예매·환불 내역"}
          </button>
          {eventTickets[item.id] && (
            <div className="mt-2 space-y-2 rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)] p-3">
              {eventTickets[item.id].length === 0 ? <p className="ty-caption text-[var(--color-muted)]">예매 내역이 없습니다.</p> : eventTickets[item.id].map((ticket) => (
                <div key={ticket.id} className="flex items-start justify-between gap-3 ty-caption">
                  <div className="min-w-0 text-[var(--color-body)]">
                    <p className="font-bold">{ticket.holderName ?? ticket.profileName ?? "이름 없음"}</p>
                    {ticket.profileName && ticket.profileName !== ticket.holderName ? <p className="text-[var(--color-muted)]">프로필명 {ticket.profileName}</p> : null}
                    <p className="break-all text-[var(--color-muted)]">{ticket.authProvider ?? "가입 경로 없음"} · {ticket.email ?? "이메일 없음"} · {ticket.phoneNumber ?? "전화번호 없음"}</p>
                    <p className="break-all text-[var(--color-muted)]">예매번호 {ticket.bookingId} · {ticket.status} · {ticket.refundStatus ?? "환불 전"}</p>
                  </div>
                  {ticket.status !== "cancelled" && <button type="button" onClick={() => void handleAdminCancelTicket(item.id, ticket)} className="shrink-0 text-[var(--color-error)] underline underline-offset-2">취소</button>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label htmlFor={`minimum-booking-quantity-${item.id}`} className="ty-caption font-bold text-[var(--color-body)]">
            최소 예매 인원
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id={`minimum-booking-quantity-${item.id}`}
              type="number"
              min={1}
              step={1}
              value={minimumBookingQuantities[item.id] ?? "1"}
              onChange={(event) => setMinimumBookingQuantities((current) => ({
                ...current,
                [item.id]: event.target.value,
              }))}
              aria-describedby={`minimum-booking-quantity-help-${item.id}`}
              className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-3 ty-body-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => void handleSaveMinimumBookingQuantity(item)}
              disabled={Boolean(savingMinimumBookingQuantityId)}
              className="min-h-11 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 ty-body-sm font-bold text-[var(--color-on-primary)] disabled:opacity-50"
            >
              {savingMinimumBookingQuantityId === item.id ? "저장 중..." : "저장"}
            </button>
          </div>
          <p id={`minimum-booking-quantity-help-${item.id}`} className="mt-1 ty-micro text-[var(--color-muted)]">
            이벤트는 2명 이상, 1명은 제한 없음
          </p>
        </div>
        <div>
          <p className="ty-caption font-bold text-[var(--color-body)]">할인코드</p>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input
              aria-label={`${displayLabel(item)} 할인코드`}
              value={discountDraft.code}
              onChange={(event) => setDiscountCodeDrafts((current) => ({
                ...current,
                [item.id]: { ...discountDraft, code: event.target.value.toUpperCase() },
              }))}
              maxLength={50}
              placeholder="예: DYVE3000"
              className="min-h-11 min-w-0 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-3 ty-body-sm uppercase text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
            />
            <input
              aria-label={`${displayLabel(item)} 티켓당 할인액`}
              type="number"
              min={1}
              step={1}
              value={discountDraft.discountAmountPerTicket}
              onChange={(event) => setDiscountCodeDrafts((current) => ({
                ...current,
                [item.id]: { ...discountDraft, discountAmountPerTicket: event.target.value },
              }))}
              placeholder="티켓당 할인액"
              className="min-h-11 min-w-0 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-3 ty-body-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => void handleSaveDiscountCode(item)}
              disabled={Boolean(savingDiscountCodeId)}
              className="min-h-11 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 ty-body-sm font-bold text-[var(--color-on-primary)] disabled:opacity-50"
            >
              {savingDiscountCodeId === item.id ? "저장 중..." : "저장"}
            </button>
          </div>
          <label className="mt-2 flex min-h-11 items-center gap-2 ty-caption text-[var(--color-body)]">
            <input
              type="checkbox"
              checked={discountDraft.isActive}
              onChange={(event) => setDiscountCodeDrafts((current) => ({
                ...current,
                [item.id]: { ...discountDraft, isActive: event.target.checked },
              }))}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            할인코드 활성화
          </label>
          <p className="ty-micro text-[var(--color-muted)]">
            티켓당 정액 할인하며 예매 수수료는 유지됩니다.
          </p>
        </div>
        <div>
          <label htmlFor={`checkin-message-${item.id}`} className="ty-caption font-bold text-[var(--color-body)]">
            QR 입장 멘트
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id={`checkin-message-${item.id}`}
              value={checkinMessages[item.id] ?? ""}
              onChange={(event) => setCheckinMessages((current) => ({
                ...current,
                [item.id]: event.target.value,
              }))}
              maxLength={200}
              placeholder="비워 두면 기본 환영 멘트가 재생됩니다."
              className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-3 ty-body-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => void handleSaveCheckinMessage(item)}
              disabled={Boolean(savingCheckinMessageId)}
              className="min-h-11 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 ty-body-sm font-bold text-[var(--color-on-primary)] disabled:opacity-50"
            >
              {savingCheckinMessageId === item.id ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
        {item.approvalStatus !== "approved" && <button type="button" onClick={() => void handleApproveEvent(item)} className="rounded-[var(--radius-card-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 ty-caption font-bold text-[var(--color-success)]">승인</button>}
        {item.approvalStatus !== "rejected" && <button type="button" onClick={() => void handleRejectEvent(item)} className="rounded-[var(--radius-card-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2 ty-caption font-bold text-[var(--color-error)]">반려</button>}
        {canComplete && (
          <button
            type="button"
            onClick={(event) => void handleCompleteEvent(item, event)}
            disabled={Boolean(completingEventId)}
            className="rounded-[var(--radius-card-md)] border border-[var(--color-accent-pink)]/30 bg-[var(--color-accent-pink)]/10 px-3 py-2 ty-caption font-bold text-[var(--color-accent-pink)] disabled:opacity-50"
          >
            {completingEventId === item.id ? "처리 중..." : "공연 완료 처리"}
          </button>
        )}
        {hasSettlement ? (
          <span className="rounded-[var(--radius-card-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 ty-caption font-bold text-[var(--color-success)]">
            정산 완료
          </span>
        ) : null}
        {!hasSettlement && canSettle ? (
          <button
            type="button"
            onClick={(event) => void handleOpenSettlement(item, event)}
            disabled={previewLoading}
            className="rounded-[var(--radius-card-md)] border border-[var(--color-accent-pink)]/30 bg-[var(--color-accent-pink)]/10 px-3 py-2 ty-caption font-bold text-[var(--color-accent-pink)] disabled:opacity-50"
          >
            {previewLoading ? "불러오는 중..." : "정산하기"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void handleDeleteEvent(item)}
          disabled={Boolean(deletingEventId)}
          className="rounded-[var(--radius-card-md)] border border-[var(--color-error)]/30 px-3 py-2 ty-caption font-bold text-[var(--color-error)] disabled:opacity-50"
        >
          {deletingEventId === item.id ? "삭제 중..." : "공연 삭제"}
        </button>
        </div>
        </div>
      </details>
    );
  };

  const renderProfileActions = (item: ManagedItem) => {
    if (tab !== "artist" && tab !== "venue") return null;
    const isProcessing = processingArtistId === item.id;
    return (
      <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-hairline)] pt-3">
        <button
          type="button"
          onClick={() => navigate(tab === "artist" ? `/artist/${item.id}` : `/venue/${item.id}`)}
          className="min-h-11 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] px-3 ty-body-sm font-semibold text-[var(--color-body)]"
        >
          미리보기
        </button>
        {tab === "artist" && item.approvalStatus !== "approved" && (
          <button
            type="button"
            onClick={(event) => void handleApproveArtist(item, event)}
            disabled={Boolean(processingArtistId)}
            className="min-h-11 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-3 ty-body-sm font-bold text-[var(--color-on-primary)] disabled:opacity-50"
          >
            {isProcessing ? "처리 중..." : "승인"}
          </button>
        )}
        {tab === "artist" && item.approvalStatus !== "rejected" && (
          <button
            type="button"
            onClick={() => {
              setRejectTarget(item);
              setRejectReason("");
            }}
            disabled={Boolean(processingArtistId)}
            className="min-h-11 rounded-[var(--radius-button-md)] border border-[var(--color-primary)]/40 px-3 ty-body-sm font-bold text-[var(--color-primary)] disabled:opacity-50"
          >
            반려
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleDeleteProfile(item)}
          disabled={Boolean(deletingProfileId)}
          className="min-h-11 rounded-[var(--radius-button-md)] border border-[var(--color-error)]/30 px-3 ty-body-sm font-bold text-[var(--color-error)] disabled:opacity-50"
        >
          {deletingProfileId === item.id ? "삭제 중..." : "삭제"}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-full w-full bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 border-b border-[var(--color-hairline)] px-4 py-4">
        <button type="button" onClick={() => navigate(-1)} aria-label="이전 화면" className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-button-md)] hover:bg-[var(--color-surface-muted)]">
          <DyveIcon name="chevron-left" size="md" tone="default" className="h-5 w-5" />
        </button>
        <DyveIcon name="users" size="sm" className="h-4 w-4 text-[var(--color-accent-pink)]" />
        <h1 className="flex-1 ty-body-lg font-bold">프로필 & 공연 관리</h1>
        <span className="rounded-[var(--radius-pill)] border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-2 py-0.5 ty-micro font-bold text-[var(--color-primary)]">
          ADMIN
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-5xl gap-1.5 overflow-x-auto px-4 pb-1 pt-4">
        {TAB_CONFIG.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => {
              const nextSearchParams = new URLSearchParams(searchParams);
              nextSearchParams.set("tab", id);
              if (id !== "events") nextSearchParams.delete("approval");
              setSearchParams(nextSearchParams);
              setSearchQ("");
            }}
            className={`whitespace-nowrap rounded-[var(--radius-button-md)] px-4 py-2 ty-body-sm font-bold transition-colors ${
              tab === id
                ? "bg-[var(--color-accent-pink)] text-black"
                : "border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <details className="mx-auto mt-3 w-[calc(100%-2rem)] max-w-5xl rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-2">
        <summary className="cursor-pointer ty-caption font-bold text-[var(--color-body)]">상태와 삭제 기준 보기</summary>
        <div className="mt-2 space-y-1 ty-micro leading-5 text-[var(--color-muted)]">
          <p className="whitespace-pre-line">{"승인 상태와 운영 상태는 별개입니다.\n승인·반려는 공개 심사, 운영 차단은 서비스 노출 제한입니다."}</p>
          <p>프로필·공연 삭제는 DB에서 지우지 않고 차단 상태로 숨겨 운영 기록을 보존합니다.</p>
          <p>관객 탭의 한 행은 프로필 하나가 아니라 같은 Owner ID에 속한 이용자 한 명입니다.</p>
        </div>
      </details>

      <div className="mx-auto flex w-full max-w-5xl gap-2 px-4 pb-2 pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-2.5">
          <DyveIcon name="search" size="sm" tone="muted" className="h-4 w-4 flex-shrink-0" />
          <input
            value={searchQ}
            onChange={(event) => setSearchQ(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void load(true)}
            placeholder="이름 검색..."
            aria-label="프로필 이름 검색"
            className="min-h-6 min-w-0 flex-1 bg-transparent ty-body-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted-soft)]"
          />
        </div>
        <button
          onClick={() => void load(true)}
          className="rounded-[var(--radius-card-md)] bg-[var(--color-accent-pink)] px-4 py-2 ty-body-sm font-bold text-black"
        >
          검색
        </button>
      </div>

      {tab === "artist" && (
        <div className="mx-auto flex w-full max-w-5xl gap-2 overflow-x-auto px-4 pb-4 pt-1" aria-label="아티스트 승인 상태 필터">
          {ARTIST_APPROVAL_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setArtistApprovalFilter(filter.id)}
              aria-pressed={artistApprovalFilter === filter.id}
              className={`min-h-11 whitespace-nowrap rounded-[var(--radius-button-md)] px-3 ty-body-sm font-semibold ${
                artistApprovalFilter === filter.id
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                  : "border border-[var(--color-hairline)] text-[var(--color-body)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {tab === "events" && (
        <div className="mx-auto flex w-full max-w-5xl gap-2 overflow-x-auto px-4 pb-4 pt-1" aria-label="공연 상태 필터">
          {(["pending", "approved", "rejected", "dummy", "all"] as EventApprovalFilter[]).map((filter) => (
            <button key={filter} type="button" onClick={() => setEventApprovalFilter(filter)} className={`min-h-11 whitespace-nowrap rounded-[var(--radius-button-md)] px-3 ty-body-sm font-semibold ${eventApprovalFilter === filter ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "border border-[var(--color-hairline)] text-[var(--color-body)]"}`}>
              {{ pending: "승인 대기", approved: "승인", rejected: "반려", dummy: "더미 후보", all: "전체" }[filter]}
            </button>
          ))}
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl space-y-2 px-4 pb-24">
        {isLoading && <div className="py-14 text-center ty-body-sm text-[var(--color-muted)]">불러오는 중...</div>}
        {error && (
          <div className="rounded-[var(--radius-card-md)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 py-6 text-center ty-body-sm text-[var(--color-error)]">
            <p>{error}</p>
            <button type="button" className="mt-2 min-h-11 font-bold underline underline-offset-4" onClick={() => void load(true)}>
              다시 시도
            </button>
          </div>
        )}
        {!isLoading && !error && items.length === 0 && (
          <div className="py-14 text-center ty-body-sm text-[var(--color-muted-soft)]">항목이 없어요</div>
        )}
        {!isLoading &&
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-3 transition-colors hover:border-white/15"
            >
              <button
                type="button"
                onClick={() => navigate(`/admin/profiles/${item.id}?type=${tab}`)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-[var(--radius-card-md)] bg-surface-strong">
                  <DyveImage src={displayImage(item)} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate ty-body-sm font-bold text-[var(--color-ink)]">{displayLabel(item)}</p>
                    {item.isDyvePick && (
                      <span className="flex-shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-accent-pink)]/30 bg-[var(--color-accent-pink)]/20 px-1.5 ty-micro text-[var(--color-accent-pink)]">
                        PICK
                      </span>
                    )}
                    {item.hasSettlement && (
                      <span className="flex-shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/20 px-1.5 ty-micro text-[var(--color-success)]">
                        정산 완료
                      </span>
                    )}
                    {item.approvalStatus && (
                      <span className={`flex-shrink-0 rounded-[var(--radius-pill)] px-2 py-0.5 ty-micro font-bold ${
                        item.approvalStatus === "approved"
                          ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                          : item.approvalStatus === "rejected"
                            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            : "border border-[var(--color-hairline)] text-[var(--color-muted)]"
                      }`}>
                        {ARTIST_APPROVAL_LABEL[item.approvalStatus]}
                      </span>
                    )}
                    {(item.isBlocked || item.status === "blocked" || item.status === "BLOCKED") && (
                      <span className="flex-shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/20 px-1.5 ty-micro text-[var(--color-error)]">
                        차단
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 ty-micro text-[var(--color-muted)]">
                    {item.type ? <span>{item.type}</span> : null}
                    {item.status ? <span>운영 {ADMIN_STATUS_LABEL[item.status] ?? item.status}</span> : null}
                    {item.eventStatus ? (
                      <span>공연 {EVENT_STATUS_LABEL[item.eventStatus] ?? item.eventStatus}</span>
                    ) : null}
                    {item.startAt ? <span>{formatDate(item.startAt)}</span> : null}
                    {item.region ? <span>{item.region}</span> : null}
                  </div>
                  {tab === "artist" && item.bio ? (
                    <p className="mt-1 line-clamp-2 ty-caption text-[var(--color-muted)]">{item.bio}</p>
                  ) : null}
                  {tab === "artist" && item.rejectionReason ? (
                    <p className="mt-1 ty-caption text-[var(--color-primary)]">반려 사유: {item.rejectionReason}</p>
                  ) : null}
                  {tab === "audience" ? (
                    <div className="mt-1 space-y-0.5 ty-caption text-[var(--color-muted)]">
                      <p>{item.authProvider ?? "가입 경로 없음"}{item.nickname ? ` · 닉네임 ${item.nickname}` : ""}</p>
                      <p className="break-all">{item.email ?? "이메일 없음"} · {item.phoneNumber ?? "전화번호 없음"}</p>
                    </div>
                  ) : null}
                </div>
                <DyveIcon name="chevron-right" size="sm" tone="muted" className="h-4 w-4 flex-shrink-0" />
              </button>
              {renderEventActions(item)}
              {renderProfileActions(item)}
            </div>
          ))}
        {hasMore && !isLoading && (
          <button
            onClick={() => void load(false, cursor)}
            className="w-full py-3 text-center ty-body-sm font-bold text-[var(--color-accent-pink)]"
          >
            더 보기
          </button>
        )}
      </main>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--color-ink)]">
              <DyveIcon name="wallet" size="md" className="h-5 w-5 text-[var(--color-accent-pink)]" />
              정산 내역 확인
            </DialogTitle>
            <DialogDescription className="text-[var(--color-muted)]">
              {"실제 송금은 별도 수동 처리입니다.\n여기서는 플랫폼 내 정산 완료 기록만 남깁니다."}
            </DialogDescription>
          </DialogHeader>

          {preview ? (
            <div className="space-y-4">
              <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="ty-body-sm font-bold text-[var(--color-ink)]">{preview.title}</p>
                    <p className="ty-caption text-[var(--color-muted)]">계약 ID {preview.contractId}</p>
                  </div>
                  <span className="rounded-[var(--radius-pill)] border border-[var(--color-accent-pink)]/30 bg-[var(--color-accent-pink)]/10 px-2 py-1 ty-micro font-bold text-[var(--color-accent-pink)]">
                    수익배분형
                  </span>
                </div>
                <div className="grid gap-3 ty-body-sm sm:grid-cols-2">
                  <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-white/[0.03] p-3">
                    <p className="ty-caption text-[var(--color-muted)]">총 매출</p>
                    <p className="mt-1 ty-body-lg font-bold text-[var(--color-ink)]">{formatCurrency(preview.totalRevenue)}</p>
                  </div>
                  <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-white/[0.03] p-3">
                    <p className="ty-caption text-[var(--color-muted)]">분배 가능액</p>
                    <p className="mt-1 ty-body-lg font-bold text-[var(--color-accent-pink)]">
                      {formatCurrency(preview.distributableAmount)}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-white/[0.03] p-3">
                    <p className="ty-caption text-[var(--color-muted)]">PG 수수료</p>
                    <p className="mt-1 text-[var(--color-ink)]">{formatCurrency(preview.pgFee)}</p>
                  </div>
                  <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-white/[0.03] p-3">
                    <p className="ty-caption text-[var(--color-muted)]">DYVE 수수료</p>
                    <p className="mt-1 text-[var(--color-ink)]">{formatCurrency(preview.dyveFee)}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <AccountBlock label="아티스트 지급액" party={preview.artist} />
                <AccountBlock label="베뉴 지급액" party={preview.venue} />
              </div>
            </div>
          ) : (
            <div className="py-10 text-center ty-body-sm text-[var(--color-muted)]">정산 정보를 불러오는 중...</div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] px-4 py-3 ty-body-sm font-bold text-[var(--color-body)]"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmSettlement()}
              disabled={!preview || confirmingSettlement}
              className="flex items-center justify-center gap-2 rounded-[var(--radius-card-md)] bg-[var(--color-accent-pink)] px-4 py-3 ty-body-sm font-bold text-black disabled:opacity-50"
            >
              <DyveIcon name="calendar-check" size="sm" tone="default" className="h-4 w-4" />
              {confirmingSettlement ? "정산 확정 중..." : "정산 확정"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="border border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-ink)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>아티스트 프로필 반려</DialogTitle>
            <DialogDescription className="text-[var(--color-muted)]">
              {rejectTarget ? `${displayLabel(rejectTarget)} 님에게 전달할 보완 사유를 입력해 주세요.` : "보완 사유를 입력해 주세요."}
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={5}
            placeholder="예: 포트폴리오 링크와 활동 소개를 보완해 주세요."
            className="w-full resize-none rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-3 ty-body-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              className="min-h-11 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] px-4 ty-body-sm font-bold text-[var(--color-body)]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleRejectArtist()}
              disabled={!rejectReason.trim() || processingArtistId === rejectTarget?.id}
              className="min-h-11 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 ty-body-sm font-bold text-[var(--color-on-primary)] disabled:opacity-50"
            >
              {processingArtistId === rejectTarget?.id ? "처리 중..." : "반려하기"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
