import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";
import { NavHeader } from "./NavHeader";
import { DyveIcon } from "./DyveIcon";
import { DyveImage } from "./DyveImage";
import {
  MAX_ASSIGNED_SEAT_COLS,
  MAX_ASSIGNED_SEAT_ROWS,
} from "../../../api/eventForm";

type SeatInfo = {
  id: string;
  status: "available" | "held" | "sold";
};

type TableTicketOption = {
  id: string;
  label: string;
  tableCount: number;
  seatsPerTable: number;
  saleMode: "WHOLE_TABLE" | "SHARED_SEAT";
  pricePerSeat: number;
  description?: string;
  availableTables?: number;
  availableSeats?: number;
  isSoldOut?: boolean;
};

type AppliedDiscount = {
  code: string;
  discountAmountPerTicket: number;
};

export type CheckoutDraft = {
  quantity: number;
  admissionType: "assigned" | "standing" | "open" | "table";
  seatIds: string[];
  tableOptionId?: string;
  discountCode?: string;
  discountCodeInput?: string;
  groupDiveAnswers?: {
    nickname: string;
    gender: "male" | "female" | "other";
    enthusiasm: string;
  };
};

interface CheckoutScreenProps {
  event: any;
  seats?: SeatInfo[];
  seatLayout?: { rows: number; cols: number };
  standingQueue?: {
    nextNumber?: number;
    soldCount?: number;
    capacity?: number;
    isSoldOut?: boolean;
  };
  onBack: () => void;
  onComplete: (payload: CheckoutDraft) => void;
  initialDraft?: CheckoutDraft | null;
  isSubmitting?: boolean;
  preparedNicepay?: boolean;
  isNicepayReady?: boolean;
  onOpenNicepay?: () => void;
  onCancelNicepay?: () => void;
  errorMessage?: string | null;
  appliedDiscount?: AppliedDiscount | null;
  confirmedPricing?: {
    originalAmount: number;
    discountAmount: number;
    amount: number;
  } | null;
  discountError?: string | null;
  discountNotice?: string | null;
  isDiscountApplying?: boolean;
  onApplyDiscount?: (code: string) => void;
  onRemoveDiscount?: () => void;
  initialGroupDiveAnswers?: {
    nickname: string;
    gender: "male" | "female" | "other";
    enthusiasm: string;
  } | null;
}

const sanitizeNumericInput = (value: string) => value.replace(/\D/g, "");

export function CheckoutScreen({
  event,
  seats,
  seatLayout,
  standingQueue,
  onBack,
  onComplete,
  initialDraft,
  isSubmitting = false,
  preparedNicepay = false,
  isNicepayReady = false,
  onOpenNicepay,
  onCancelNicepay,
  errorMessage,
  appliedDiscount,
  confirmedPricing,
  discountError,
  discountNotice,
  isDiscountApplying = false,
  onApplyDiscount,
  onRemoveDiscount,
  initialGroupDiveAnswers,
}: CheckoutScreenProps) {
  const minimumBookingQuantity = Math.max(1, Number(event.minimumBookingQuantity) || 1);
  const restoredGroupDiveAnswers = initialDraft?.groupDiveAnswers ?? initialGroupDiveAnswers;
  const [quantityInput, setQuantityInput] = useState(
    String(initialDraft?.quantity ?? minimumBookingQuantity),
  );
  const [selectedSeats, setSelectedSeats] = useState<string[]>(initialDraft?.seatIds ?? []);
  const [selectedTableOptionId, setSelectedTableOptionId] = useState<string | null>(
    initialDraft?.tableOptionId ?? null,
  );
  const [discountCodeInput, setDiscountCodeInput] = useState(
    initialDraft?.discountCodeInput ?? appliedDiscount?.code ?? "",
  );
  const [groupDiveNickname, setGroupDiveNickname] = useState(restoredGroupDiveAnswers?.nickname ?? "");
  const [groupDiveGender, setGroupDiveGender] = useState<"male" | "female" | "other" | "">(
    restoredGroupDiveAnswers?.gender ?? "",
  );
  const [groupDiveEnthusiasm, setGroupDiveEnthusiasm] = useState(
    restoredGroupDiveAnswers?.enthusiasm ?? "",
  );
  const isGroupDive = Boolean(event.isNetworkingParty);

  useEffect(() => {
    if (!initialGroupDiveAnswers) return;
    setGroupDiveNickname(initialGroupDiveAnswers.nickname);
    setGroupDiveGender(initialGroupDiveAnswers.gender);
    setGroupDiveEnthusiasm(initialGroupDiveAnswers.enthusiasm);
  }, [initialGroupDiveAnswers]);

  useEffect(() => {
    if (appliedDiscount) setDiscountCodeInput(appliedDiscount.code);
  }, [appliedDiscount]);

  const admissionType =
    event.admissionType === "assigned" || event.admissionType === "standing" || event.admissionType === "open" || event.admissionType === "table"
      ? event.admissionType
      : null;
  const tableOptions: TableTicketOption[] = Array.isArray(event.tableTicketOptions) ? event.tableTicketOptions : [];
  const selectedTableOption =
    admissionType === "table"
      ? tableOptions.find((option) => option.id === selectedTableOptionId) ?? tableOptions.find((option) => !option.isSoldOut) ?? tableOptions[0]
      : null;
  const basePrice =
    admissionType === "table"
      ? selectedTableOption?.pricePerSeat ?? null
      : typeof event.price === "number"
        ? event.price
        : null;
  const dateDisplay = event.dateDisplay || "";
  const fees = event.isFree ? 0 : 1000;
  const isDataReady = Boolean(admissionType) && basePrice !== null;
  const isStandingSoldOut = admissionType === "standing" && standingQueue?.isSoldOut;
  const isTableSoldOut = admissionType === "table" && (!selectedTableOption || selectedTableOption.isSoldOut);

  // Dynamic Layout Logic
  // Default values if not provided
  const cols =
    seatLayout?.cols ||
    event.layout?.cols ||
    event.layout_cols ||
    event.layoutCols ||
    undefined;
  const rows =
    seatLayout?.rows ||
    event.layout?.rows ||
    event.layout_rows ||
    event.layoutRows ||
    undefined;
  const capacity = event.capacity || (rows && cols ? rows * cols : undefined);
  const effectiveRows = rows || (capacity && cols ? Math.ceil(capacity / cols) : undefined);
  const isAssignedLayoutUnsupported =
    admissionType === "assigned" &&
    ((typeof rows === "number" && rows > MAX_ASSIGNED_SEAT_ROWS) ||
      (typeof cols === "number" && cols > MAX_ASSIGNED_SEAT_COLS));

  // Generate Grid Data
  // Rows: A, B, C...
  const SEAT_ROWS =
    !isAssignedLayoutUnsupported && cols && effectiveRows
      ? Array.from({ length: effectiveRows }, (_, i) => String.fromCharCode(65 + i))
      : [];
  const SEATS_PER_ROW = cols || 0;
  const seatGap = SEATS_PER_ROW >= 15 ? 2 : SEATS_PER_ROW >= 12 ? 3 : 4;
  const seatStatusById = (seats || []).reduce<Record<string, SeatInfo["status"]>>((acc, seat) => {
    acc[seat.id] = seat.status;
    return acc;
  }, {});
  const parsedQuantity = Number(quantityInput);
  const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 0;

  const toggleSeat = (seatId: string) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatId));
    } else {
      if (selectedSeats.length < (isGroupDive ? 1 : Math.max(4, minimumBookingQuantity))) {
        setSelectedSeats([...selectedSeats, seatId]);
      }
    }
  };

  const currentQuantity =
    admissionType === "assigned"
      ? selectedSeats.length
      : admissionType
        ? isGroupDive
          ? 1
          : quantity
        : 0;
  const groupDiveAnswersComplete =
    !isGroupDive ||
    (groupDiveNickname.trim().length > 0 &&
      groupDiveGender.length > 0 &&
      groupDiveEnthusiasm.trim().length > 0);
  const ticketCount =
    admissionType === "table" && selectedTableOption
      ? selectedTableOption.saleMode === "WHOLE_TABLE"
        ? currentQuantity * selectedTableOption.seatsPerTable
        : currentQuantity
      : currentQuantity;
  const meetsMinimumBookingQuantity = isGroupDive || ticketCount >= minimumBookingQuantity;
  const tableSummary =
    admissionType === "table" && selectedTableOption
      ? selectedTableOption.saleMode === "WHOLE_TABLE"
        ? `${selectedTableOption.label} ${currentQuantity}개 / 티켓 ${ticketCount}매`
        : `${selectedTableOption.label} ${currentQuantity}석 / 티켓 ${ticketCount}매`
      : null;
  const ticketAmount = basePrice !== null ? basePrice * ticketCount : 0;
  const discountAmount = confirmedPricing?.discountAmount ?? (
    appliedDiscount
      ? Math.min(ticketAmount, appliedDiscount.discountAmountPerTicket * ticketCount)
      : 0
  );
  const total = confirmedPricing?.amount
    ?? ticketAmount - discountAmount + fees * ticketCount;

  return (
    <div className="relative min-h-full animate-in slide-in-from-right bg-[var(--color-canvas)] pb-28 text-[var(--color-ink)] duration-300">
      <NavHeader title="결제하기" onBack={onBack} />

      <div className="p-6 space-y-8">
        {/* Crowdfunding Notice */}
        {event.isHumanCrowdfunding && (
          <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4 flex gap-3">
            <DyveIcon name="flame" size="md" tone="primary" className="mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--color-ink)]">함께 여는 공연 안내</p>
              <p className="whitespace-pre-line text-xs leading-relaxed text-[var(--color-body)]">
                {"목표 인원이 모이면 열리는 공연이에요.\n공연이 열리지 않으면 결제 금액은 환불돼요."}
              </p>
            </div>
          </div>
        )}

        {/* Event Summary */}
        <div className="flex gap-4 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
          <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-md">
            <DyveImage src={event.image} alt={event.title} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="font-bold text-[var(--color-ink)] line-clamp-1">{event.title}</h3>
            <div className="mt-1 space-y-1 text-xs text-[var(--color-muted)]">
              <p className="flex items-center gap-1"><DyveIcon name="calendar" size="sm" tone="primary" className="h-3 w-3" /> {dateDisplay}</p>
              <p className="flex items-center gap-1"><DyveIcon name="map-pin" size="sm" tone="primary" className="h-3 w-3" /> {event.venue}</p>
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="border-[var(--color-primary)] text-[var(--color-primary)] text-[11px] h-5">
                {admissionType === "assigned" && "Assigned Seat"}
                {admissionType === "standing" && "Standing Queue"}
                {admissionType === "open" && "Free Seating"}
                {admissionType === "table" && "Table Booking"}
                {!admissionType && "정보 없음"}
              </Badge>
            </div>
          </div>
        </div>

        <dl className="grid gap-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 text-xs">
          <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted)]">서비스 제공일</dt><dd className="text-right font-medium text-[var(--color-ink)]">{dateDisplay} 공연 1회 관람</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted)]">사전예약 가능기간</dt><dd className="text-right font-medium text-[var(--color-ink)]">결제일부터 공연일 전까지 (최대 60일)</dd></div>
          {event.refundPolicy?.name && (
            <div className="flex flex-col gap-1.5">
              <dt className="text-[var(--color-muted)]">취소·환불 규정</dt>
              <dd className="space-y-1 text-left font-medium leading-5 text-[var(--color-ink)]">
                {event.refundPolicy.policies?.length
                  ? event.refundPolicy.policies.map((policy: { daysBefore: number; description: string }) => (
                      <p key={policy.daysBefore}>
                        <span className="text-[var(--color-muted)]">공연 {policy.daysBefore}일 전</span> {policy.description}
                      </p>
                    ))
                  : event.refundPolicy.name}
              </dd>
            </div>
          )}
        </dl>

        {/* Selection Logic */}
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.04em] text-[var(--color-muted)]">티켓 선택</h2>

          {/* 1. Assigned Seating UI - Dynamic Grid */}
          {admissionType === "assigned" && (
            <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
              <p className="mb-4 text-center text-xs tracking-[0.04em] text-[var(--color-muted)]">STAGE</p>
              <div className="mx-auto mb-6 h-1 w-full rounded-full bg-[var(--color-hairline)]" />
              {isAssignedLayoutUnsupported ? (
                <div
                  role="alert"
                  data-unsupported-seat-layout
                  className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-4 text-sm leading-6 text-[var(--color-body)]"
                >
                  <p className="font-bold text-[var(--color-ink)]">지원하지 않는 좌석 배치입니다</p>
                  <p className="mt-1">
                    모바일 예매는 최대 {MAX_ASSIGNED_SEAT_ROWS}행 × {MAX_ASSIGNED_SEAT_COLS}열까지 지원합니다.
                  </p>
                </div>
              ) : SEAT_ROWS.length > 0 && SEATS_PER_ROW > 0 ? (
                <>
                  <div
                    aria-label={`좌석 선택, ${SEAT_ROWS.length}행 ${SEATS_PER_ROW}열`}
                    data-seat-grid
                    data-seat-rows={SEAT_ROWS.length}
                    data-seat-cols={SEATS_PER_ROW}
                    className="mx-auto grid w-full"
                    style={{ rowGap: `${seatGap}px` }}
                  >
                    {SEAT_ROWS.map((row) => (
                      <div
                        key={row}
                        className="grid w-full items-center"
                        style={{
                          columnGap: `${seatGap}px`,
                          gridTemplateColumns: `14px repeat(${SEATS_PER_ROW}, minmax(0, 1fr))`,
                        }}
                      >
                        <span className="flex items-center justify-center text-[10px] font-bold text-[var(--color-muted-soft)]">{row}</span>
                        {Array.from({ length: SEATS_PER_ROW }).map((_, i) => {
                          const seatNum = i + 1;
                          const seatId = `${row}-${seatNum}`;
                          const altSeatId = `${row}${seatNum}`;
                          const seatStatus = seatStatusById[seatId] || seatStatusById[altSeatId];
                          const isSelected = selectedSeats.includes(seatId);
                          const isBooked = seatStatus ? seatStatus !== "available" : false;

                          return (
                            <button
                              key={seatId}
                              type="button"
                              aria-label={`${row}열 ${seatNum}번 좌석, ${isBooked ? "선택 불가" : isSelected ? "선택됨" : "선택 가능"}`}
                              aria-pressed={isSelected}
                              disabled={isBooked}
                              onClick={() => toggleSeat(seatId)}
                              className={`flex aspect-square min-w-0 items-center justify-center rounded-[3px] text-[clamp(6px,2.2vw,11px)] font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1
                                                        ${isBooked
                                  ? "bg-[var(--color-surface-muted)] text-[var(--color-disabled-text)] cursor-not-allowed"
                                  : isSelected
                                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                                    : "bg-[var(--color-disabled-surface)] text-[var(--color-disabled-text)] hover:bg-[var(--color-hairline-strong)] hover:text-[var(--color-ink)]"
                                }
                                                    `}
                            >
                              {seatNum}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-[var(--color-hairline)] pt-4 text-xs text-[var(--color-muted)]">
                    <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-[2px] bg-[var(--color-disabled-surface)]" /> 예매가능</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[var(--color-primary)] rounded-[2px]" /> 선택됨</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[var(--color-surface-muted)] rounded-[2px]" /> 매진</div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-overlay)] px-3 py-3 text-sm text-[var(--color-muted)]">
                  좌석 정보 없음
                </div>
              )}
            </div>
          )}

          {/* 2. Standing (Queue Number) UI */}
          {admissionType === "standing" && (
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block font-bold text-[var(--color-ink)]">스탠딩 (입장 번호)</span>
                  <span className="text-xs text-[var(--color-muted)]">빠른 번호부터 자동 배정됩니다.</span>
                </div>
                  {isGroupDive ? (
                    <span className="text-sm font-bold text-[var(--color-ink)]">1명</span>
                  ) : (
                  <div className="w-28">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={quantityInput}
                      onChange={(event) => setQuantityInput(sanitizeNumericInput(event.target.value))}
                      placeholder="1"
                      className="h-11 rounded-xl border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 text-center text-base font-bold text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    />
                  </div>
                  )}
                </div>

              <div className="mt-2 rounded-lg border border-dashed border-[var(--color-hairline)] bg-[var(--color-surface-overlay)] p-3">
                <span className="mb-1 block text-xs text-[var(--color-muted-soft)]">현재 발급될 입장 번호</span>
                {standingQueue ? (
                  <div className="space-y-1 text-xs text-[var(--color-muted)]">
                    <p className="font-bold text-[var(--color-primary)] text-sm">번호: {standingQueue.nextNumber ?? "-"}</p>
                    <p>
                      판매 수량: {standingQueue.soldCount ?? 0}
                      {standingQueue.capacity ? ` / ${standingQueue.capacity}` : ""}
                    </p>
                    {standingQueue.isSoldOut && (
                      <p className="text-[var(--color-primary)]">매진됨</p>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-muted-soft)]">대기 번호 정보 없음</div>
                )}
              </div>
            </div>
          )}

          {/* 3. Open Entry UI */}
          {admissionType === "open" && (
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
              <div>
                <span className="block font-bold text-[var(--color-ink)]">General Admission</span>
                <span className="text-xs text-[var(--color-muted)]">선착순 입장</span>
              </div>
              {isGroupDive ? (
                <span className="text-sm font-bold text-[var(--color-ink)]">1명</span>
              ) : (
              <div className="w-24">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={quantityInput}
                  onChange={(event) => setQuantityInput(sanitizeNumericInput(event.target.value))}
                  placeholder="1"
                  className="h-11 rounded-xl border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 text-center text-base font-bold text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
              </div>
              )}
            </div>
          )}

          {admissionType === "table" && (
            <div className="space-y-3">
              {tableOptions.length === 0 ? (
                <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-muted)]">
                  테이블 옵션 정보가 없습니다.
                </div>
              ) : (
                tableOptions.map((option) => {
                  const isSelected = selectedTableOption?.id === option.id;
                  const isSoldOut = Boolean(option.isSoldOut);
                  const remainingLabel =
                    option.saleMode === "WHOLE_TABLE"
                      ? `남은 테이블 ${option.availableTables ?? option.tableCount}개`
                      : `남은 좌석 ${option.availableSeats ?? option.tableCount * option.seatsPerTable}석`;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => setSelectedTableOptionId(option.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                          : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)]"
                      } ${isSoldOut ? "cursor-not-allowed opacity-50" : "hover:border-[var(--color-primary)]/50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[var(--color-ink)]">{option.label}</p>
                          <p className="mt-1 text-xs text-[var(--color-muted)]">{remainingLabel}</p>
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            {option.saleMode === "WHOLE_TABLE"
                              ? `1개 선택 시 티켓 ${option.seatsPerTable}매`
                              : "오픈 테이블은 여러 관객이 함께 앉는 좌석입니다."}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[var(--color-primary)]">
                          ₩ {option.pricePerSeat.toLocaleString()} / 1인
                        </span>
                      </div>
                      {option.description && (
                        <p data-user-content className="mt-3 rounded-lg bg-[var(--color-surface-overlay)] px-3 py-2 text-xs leading-relaxed text-[var(--color-body)]">
                          {option.description}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
              {selectedTableOption && (
                <div className="flex items-center justify-between rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
                  <div>
                    <span className="block font-bold text-[var(--color-ink)]">
                      {selectedTableOption.saleMode === "WHOLE_TABLE" ? "테이블 개수" : "좌석 수"}
                    </span>
                    <span className="text-xs text-[var(--color-muted)]">{tableSummary}</span>
                  </div>
                  <div className="w-24">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={quantityInput}
                      onChange={(event) => setQuantityInput(sanitizeNumericInput(event.target.value))}
                      placeholder="1"
                      className="h-11 rounded-xl border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 text-center text-base font-bold text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isGroupDive && (
          <section aria-labelledby="group-dive-application-title">
            <div className="mb-4">
              <h2 id="group-dive-application-title" className="text-base font-bold text-[var(--color-ink)]">
                Group Dive 신청정보
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                함께할 사람들에게 나를 소개할 간단한 정보를 적어 주세요.
              </p>
            </div>
            <div className="space-y-5 border-y border-[var(--color-hairline)] py-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--color-ink)]">닉네임</span>
                <Input
                  value={groupDiveNickname}
                  onChange={(event) => setGroupDiveNickname(event.target.value)}
                  maxLength={50}
                  placeholder="Group Dive에서 사용할 닉네임"
                  className="h-12 rounded-xl border-[var(--color-hairline)] bg-[var(--color-surface-soft)]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--color-ink)]">성별</span>
                <select
                  value={groupDiveGender}
                  onChange={(event) => setGroupDiveGender(event.target.value as typeof groupDiveGender)}
                  className="h-12 w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 text-sm text-[var(--color-ink)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">선택해 주세요</option>
                  <option value="female">여성</option>
                  <option value="male">남성</option>
                  <option value="other">기타</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--color-ink)]">
                  이 주제를 얼마나 좋아하나요?
                </span>
                <textarea
                  value={groupDiveEnthusiasm}
                  onChange={(event) => setGroupDiveEnthusiasm(event.target.value)}
                  maxLength={1000}
                  rows={5}
                  placeholder="좋아하게 된 계기나 기대하는 이야기를 자유롭게 적어 주세요."
                  className="w-full resize-none rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm leading-6 text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <span className="mt-1 block text-right text-xs text-[var(--color-muted)]">
                  {groupDiveEnthusiasm.length} / 1000
                </span>
              </label>
            </div>
          </section>
        )}

        <section aria-labelledby="discount-code-title">
          <h2 id="discount-code-title" className="mb-3 text-sm font-bold uppercase tracking-[0.04em] text-[var(--color-muted)]">
            할인코드
          </h2>
          <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
            <div className="flex gap-2">
              <Input
                value={discountCodeInput}
                onChange={(event) => {
                  const next = event.target.value.toUpperCase();
                  setDiscountCodeInput(next);
                  if (appliedDiscount && next.trim() !== appliedDiscount.code) {
                    onRemoveDiscount?.();
                  }
                }}
                maxLength={50}
                disabled={preparedNicepay}
                placeholder="할인코드 입력"
                aria-label="할인코드"
                className="h-11 min-w-0 flex-1 uppercase"
              />
              {appliedDiscount ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDiscountCodeInput("");
                    onRemoveDiscount?.();
                  }}
                  disabled={preparedNicepay}
                  className="h-11 shrink-0"
                >
                  해제
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => onApplyDiscount?.(discountCodeInput)}
                  disabled={!discountCodeInput.trim() || isDiscountApplying || preparedNicepay}
                  className="h-11 shrink-0"
                >
                  {isDiscountApplying ? "확인 중..." : "적용"}
                </Button>
              )}
            </div>
            {appliedDiscount && (
              <p className="mt-2 text-xs font-semibold text-[var(--color-success)]">
                {appliedDiscount.code} · 티켓당 ₩{appliedDiscount.discountAmountPerTicket.toLocaleString()} 할인
              </p>
            )}
            {discountError && (
              <p role="alert" className="mt-2 text-xs font-semibold text-[var(--color-error)]">
                {discountError}
              </p>
            )}
            {discountNotice && (
              <p className="mt-2 text-xs font-semibold text-[var(--color-muted)]">
                {discountNotice}
              </p>
            )}
          </div>
        </section>

        {/* Pricing */}
        {!meetsMinimumBookingQuantity && (
          <p role="alert" className="text-center text-sm font-semibold text-[var(--color-primary)]">
            이 공연은 최소 {minimumBookingQuantity}명부터 예매할 수 있어요.
          </p>
        )}
        <div className="space-y-2 border-t border-[var(--color-hairline)] pt-4">
          <div className="flex justify-between text-sm text-[var(--color-muted)]">
            <span>{tableSummary ?? `티켓 (${ticketCount}매)`}</span>
            <span>
              {basePrice !== null
                ? `₩ ${(basePrice * ticketCount).toLocaleString()}`
                : "가격 정보 없음"}
            </span>
          </div>
          <div className="flex justify-between text-sm text-[var(--color-muted)]">
            <span>예매 수수료</span>
            <span>₩ {(fees * ticketCount).toLocaleString()}</span>
          </div>
          {appliedDiscount && (
            <div className="flex justify-between text-sm font-semibold text-[var(--color-success)]">
              <span>할인코드 할인</span>
              <span>- ₩ {discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-[var(--color-ink)] pt-2">
            <span>총 결제금액</span>
            <span className="text-[var(--color-primary)]">
              {basePrice !== null ? `₩ ${total.toLocaleString()}` : "정보 없음"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mobile-fixed-bar app-bottom-bar border-t p-4 pb-8">
        {errorMessage && (
          <p className="mb-2 flex items-center justify-center gap-2 text-center text-xs text-[var(--color-primary)]">
            <DyveIcon name="wallet-failure" size="sm" className="h-4 w-4 text-[var(--color-primary)]" />
            <span>{errorMessage}</span>
          </p>
        )}
        {preparedNicepay ? (
          <div className="space-y-2">
            <p className="whitespace-pre-line text-center text-xs text-[var(--color-muted)]">
              {"결제 정보를 준비했어요.\n아래 버튼을 눌러 NICEPAY 결제창을 열어 주세요."}
            </p>
            <Button
              data-nicepay-open
              size="cta"
              onClick={onOpenNicepay}
              disabled={!isNicepayReady}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-active)] text-[var(--color-ink)] shadow-[0_0_20px_rgba(255,74,74,0.3)] disabled:opacity-50"
            >
              {isNicepayReady ? "결제창 열기" : "결제창 준비 중..."}
            </Button>
            <button
              type="button"
              onClick={onCancelNicepay}
              className="w-full py-2 text-sm font-medium text-[var(--color-muted)] underline underline-offset-4"
            >
              다시 선택하기
            </button>
          </div>
        ) : (
        <Button
          data-checkout-submit
          onClick={() => {
            if (!admissionType) return;
            if (isAssignedLayoutUnsupported) return;
            if (isStandingSoldOut) return;
            if (isTableSoldOut || (admissionType === "table" && !selectedTableOption)) return;
            onComplete({
              quantity: currentQuantity,
              admissionType,
              seatIds: selectedSeats,
              tableOptionId: selectedTableOption?.id,
              discountCode: appliedDiscount?.code,
              discountCodeInput: discountCodeInput.trim() || undefined,
              groupDiveAnswers: isGroupDive
                ? {
                    nickname: groupDiveNickname.trim(),
                    gender: groupDiveGender as "male" | "female" | "other",
                    enthusiasm: groupDiveEnthusiasm.trim(),
                  }
                : undefined,
            });
          }}
          disabled={!isDataReady || currentQuantity === 0 || !meetsMinimumBookingQuantity || !groupDiveAnswersComplete || isSubmitting || isDiscountApplying || isStandingSoldOut || isTableSoldOut || isAssignedLayoutUnsupported}
          size="cta"
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-active)] text-[var(--color-ink)] shadow-[0_0_20px_rgba(255,74,74,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "결제 처리 중..."
            : isDiscountApplying
              ? "할인 확인 중..."
            : isAssignedLayoutUnsupported
              ? "지원하지 않는 좌석 배치"
            : !isDataReady
              ? "정보 없음"
              : !meetsMinimumBookingQuantity
                ? `최소 ${minimumBookingQuantity}명 선택`
              : isStandingSoldOut
                ? "매진됨"
                : isTableSoldOut
                  ? "매진됨"
                  : "결제하기"}
        </Button>
        )}
      </div>
    </div>
  );
}
