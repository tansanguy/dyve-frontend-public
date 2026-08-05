import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import useEmblaCarousel from "embla-carousel-react";
import { NavHeader } from "./NavHeader";
import { DyveIcon, DyveIconButton } from "./DyveIcon";
import { toast } from "sonner";
import type { GroupDiveApplication } from "../../../api/tickets";

interface TicketDetailScreenProps {
  tickets: {
    id: string;
    title: string;
    image: string;
    dateDisplay: string;
    venue: string;
    admissionType?: "assigned" | "standing" | "open" | "table" | null;
    tableLabel?: string | null;
    tableSeatSummary?: string | null;
    seat?: string;
    price?: number;
    bookingDate?: string;
    bookingId?: string;
    ticketNumber?: string;
    entryPassword?: string;
    qrPayload?: string;
    qrText?: string;
    status?: string;
    checkedInAt?: string;
    paymentMethod?: string;
    paidAmount?: number;
    amount?: number;
    totalAmount?: number;
    refundStatus?: string;
    refundState?: string;
    refundedAmount?: number;
    refundAmount?: number;
    groupDiveApplication?: GroupDiveApplication | null;
  }[];
  initialIndex?: number;
  onBack: () => void;
}

const ADMISSION_LABELS = {
  assigned: "지정좌석",
  standing: "스탠딩",
  open: "자율입장",
  table: "테이블 예매",
} as const;

export function TicketDetailScreen({ tickets, initialIndex = 0, onBack }: TicketDetailScreenProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: initialIndex });
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    });
  }, [emblaApi]);

  const ticket = tickets[selectedIndex] || tickets[0];
  const isCheckedIn = ticket.status === "checked_in" || ticket.status === "used";
  const admissionLabel = ticket.admissionType ? ADMISSION_LABELS[ticket.admissionType] : "정보 없음";
  const [isEntered, setIsEntered] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `DYVE Ticket: ${ticket.title}`,
        text: `${ticket.title} @ ${ticket.venue} - ${ticket.dateDisplay}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      toast.info("이 브라우저에서는 공유를 사용할 수 없어요.");
    }
  };

  const handleManualCheck = () => {
    const correctPassword = ticket.entryPassword || "";
    if (!correctPassword) {
      setErrorMsg("비밀번호 정보가 없습니다.");
      return;
    }
    if (password === correctPassword) {
      setIsEntered(true);
      setShowPasswordInput(false);
    } else {
      setErrorMsg("비밀번호가 일치하지 않습니다.");
    }
  };

  if (isEntered) {
    return (
      <div className="min-h-full bg-[var(--color-surface-soft)] pb-8 text-[var(--color-ink)] animate-in fade-in zoom-in duration-500 flex flex-col">
        <NavHeader
          title="입장 확인 완료"
          onBack={onBack}
          titleClassName="text-[var(--color-ink)]"
        />
        <div className="p-5 flex-1 flex flex-col items-center">
            <p className="mb-6 text-sm text-[var(--color-muted)] font-medium font-sans">입장 완료: {ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }) : new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}</p>
            <div className="w-full max-w-md bg-white shadow-[0_10px_40px_-15px_rgba(35,35,35,0.2)] rounded-[var(--radius-card-lg)] overflow-hidden relative">
                <div className="p-6 pb-8 bg-white relative z-10">
                    <div className="flex justify-between items-start mb-6 font-sans">
                         <div>
                            <span className="text-xs font-bold text-[var(--color-muted)]">공연</span>
                            <h2 className="text-2xl font-bold text-black leading-tight mt-1">{ticket.title}</h2>
                         </div>
                         <div className="h-10 w-10 rounded-full border-2 border-black flex items-center justify-center">
                             <DyveIcon name="ticket-issued" size="md" className="h-5 w-5 text-black" />
                         </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-2">
                        <div>
                            <span className="text-xs font-bold text-[var(--color-muted)] font-sans">일시</span>
                            <p className="font-bold text-lg mt-1">{ticket.dateDisplay.split(" • ")[0]}</p>
                            <p className="text-sm text-[var(--color-muted)]">{ticket.dateDisplay.split(" • ")[1]}</p>
                        </div>
                         <div>
                            <span className="text-xs font-bold text-[var(--color-muted)] font-sans">장소</span>
                            <p className="font-bold text-lg mt-1 truncate">{ticket.venue}</p>
                        </div>
                    </div>
                </div>
                <div className="relative flex items-center justify-between px-0 bg-white z-10">
                    <div className="h-8 w-4 rounded-r-full bg-[var(--color-surface-soft)]"></div>
                    <div className="h-[1px] w-full border-t-2 border-dashed border-[var(--color-hairline)]"></div>
                    <div className="h-8 w-4 rounded-l-full bg-[var(--color-surface-soft)]"></div>
                </div>
                <div className="p-6 pt-8 bg-[var(--color-surface-soft)] relative z-10">
                    <div className="flex flex-col items-center justify-center text-center">
                        <span className="mb-2 text-sm font-bold text-[var(--color-muted)] font-sans">좌석 정보</span>
                        <div className="text-5xl font-bold text-black tracking-normal mb-2">
                            {ticket.seat || "자율입장"}
                        </div>
                        <span className="inline-block rounded-full bg-[var(--color-surface-strong)] px-3 py-1 text-xs font-bold uppercase text-[var(--color-ink)]">
                            {admissionLabel}
                        </span>
                    </div>
                    <div className="mt-8 pt-6 border-t border-[var(--color-hairline)]">
                        <Button onClick={() => setIsEntered(false)} variant="outline" className="w-full border-[var(--color-hairline)] text-black hover:bg-black/5 rounded-full">
                            QR 티켓으로 돌아가기
                        </Button>
                        <p className="mt-3 text-center text-xs text-[var(--color-muted)]">기념으로 보관할 수 있는 디지털 티켓입니다.</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full animate-in slide-in-from-right bg-[var(--color-canvas)] pb-8 text-[var(--color-ink)] duration-300 flex flex-col font-sans">
      <NavHeader
        title="모바일 티켓"
        onBack={onBack}
        rightAction={
          <DyveIconButton
            name="share"
            label="티켓 공유"
            onClick={handleShare}
            variant="surface"
            iconTone="default"
            className="h-11 w-11 rounded-full"
          />
        }
      />

      <div className="flex-1 flex flex-col items-center justify-center py-6">
        <div className="w-full overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {tickets.map((t) => {
              const tIsCheckedIn = t.status === "checked_in" || t.status === "used";
              const tIsCancelled = t.status === "cancelled";
              const tQrData = (t.qrPayload || t.qrText || "").trim();
              const hasQrData = Boolean(tQrData);
              const tQrCodeUrl = hasQrData
                ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tQrData)}`
                : "";
              const tHolderName = (t as any).holderName || (t as any).ownerName || "";
              const tAdmissionLabel = t.admissionType ? ADMISSION_LABELS[t.admissionType] : "정보 없음";

              return (
                <div key={t.id} className="flex-[0_0_100%] min-w-0 px-6 flex flex-col items-center">
                  <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold mb-2">{t.title}</h2>
                      <div className="flex items-center justify-center gap-2 font-sans text-[var(--color-muted)]">
                          <DyveIcon name="calendar-booked" size="sm" tone="muted" className="h-4 w-4" />
                          <span>{t.dateDisplay}</span>
                      </div>
                  </div>

                  {tIsCancelled ? (
                    <div className="w-full max-w-sm rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-6 shadow-[0_0_40px_rgba(255,243,243,0.08)]">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                        <DyveIcon name="wallet-refund" size="sm" className="h-4 w-4 text-[var(--color-primary)]" />
                        결제 정보 (취소됨)
                      </div>
                      <p className="text-sm text-[var(--color-muted)]">이 티켓은 취소되었습니다.</p>
                    </div>
                  ) : (
                    <div className={`relative w-full max-w-sm overflow-hidden rounded-[var(--radius-card-lg)] bg-white p-8 pb-10 shadow-[0_0_50px_rgba(255,243,243,0.1)] ${tIsCheckedIn ? "pt-16" : ""}`}>
                        {tIsCheckedIn && (
                          <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-center gap-2 border-b border-[var(--color-success)]/30 bg-[var(--color-success-soft)] px-4 py-2.5">
                            <DyveIcon name="check-circle-2" size="sm" className="h-4 w-4 text-[var(--color-success)]" />
                            <span className="text-sm font-bold text-[var(--color-ink)]">입장 완료</span>
                          </div>
                        )}
                        <div className="flex flex-col items-center relative">
                            <div className="w-full aspect-square bg-[var(--color-surface-soft)] rounded-xl mb-6 p-4 flex items-center justify-center relative overflow-hidden">
                                 {hasQrData ? (
                                   <img 
                                     src={tQrCodeUrl} 
                                     alt="입장 확인용 QR 코드"
                                     className="h-full w-full object-contain mix-blend-multiply"
                                   />
                                 ) : (
                                   <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-hairline)] text-center text-[var(--color-muted)]">
                                     <DyveIcon name="lock" size="lg" tone="muted" className="h-8 w-8" />
                                     <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">QR 정보 없음</p>
                                     <p className="mt-1 px-4 text-sm">서명된 QR이 준비되면 이 영역에 표시됩니다.</p>
                                   </div>
                                 )}
                            </div>
                            <div className="space-y-1 text-center">
                                <p className="text-lg font-bold text-black">{tIsCheckedIn ? "입장이 확인되었습니다" : hasQrData ? "입장 확인용 QR" : "QR 발급 대기"}</p>
                                <p className="text-sm text-[var(--color-muted)]">{tIsCheckedIn ? "재입장 시에도 이 QR을 보여주세요." : hasQrData ? "입장 시 직원에게 이 화면을 보여주세요." : "티켓 QR이 아직 발급되지 않았습니다."}</p>
                            </div>
                            <div className="mt-5 w-full rounded-xl bg-[var(--color-surface-soft)] px-4 py-3 text-center">
                              <p className="text-xs font-bold text-[var(--color-muted)]">티켓 ID</p>
                              <p className="mt-1 font-mono text-3xl font-bold tabular-nums tracking-[0.14em] text-black">
                                {t.ticketNumber || "-------"}
                              </p>
                            </div>
                            <dl className="mt-6 w-full space-y-3 border-t-2 border-dashed border-[var(--color-hairline)] pt-6 font-sans">
                                <div className="flex justify-between gap-4 text-sm">
                                    <dt className="font-bold text-[var(--color-muted)]">예매자</dt>
                                    <dd className="text-right text-black font-bold">{tHolderName || "정보 없음"}</dd>
                                </div>
                                <div className="flex justify-between gap-4 text-sm">
                                    <dt className="font-bold text-[var(--color-muted)]">좌석</dt>
                                    <dd className="text-right text-black font-bold">{t.seat || tAdmissionLabel}</dd>
                                </div>
                                <div className="flex justify-between gap-4 text-sm">
                                    <dt className="font-bold text-[var(--color-muted)]">장소</dt>
                                    <dd className="min-w-0 text-right text-black font-bold">{t.venue}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {tickets.length > 1 && (
          <div className="flex items-center gap-2 mt-4 mb-8">
            {tickets.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-colors duration-300 ${idx === selectedIndex ? 'w-6 bg-[var(--color-primary)]' : 'w-1.5 bg-[var(--color-hairline-strong)]'}`}
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {ticket.groupDiveApplication && (
          <section className="mb-6 mt-6 w-full px-6" aria-labelledby="group-dive-application-title">
            <div className="mx-auto w-full max-w-sm rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-5">
              <h3 id="group-dive-application-title" className="text-base font-bold text-[var(--color-ink)]">
                Group Dive 신청 정보
              </h3>
              <dl data-static-info className="mt-3 divide-y divide-[var(--color-hairline)] text-sm">
                {[
                  ["닉네임", ticket.groupDiveApplication.nickname],
                  [
                    "성별",
                    ticket.groupDiveApplication.gender === "female"
                      ? "여성"
                      : ticket.groupDiveApplication.gender === "male"
                        ? "남성"
                        : "기타",
                  ],
                  ["주제에 대한 이야기", ticket.groupDiveApplication.enthusiasm],
                  [
                    "결제",
                    ticket.groupDiveApplication.paymentStatus === "paid"
                      ? `완료 · ₩ ${(ticket.groupDiveApplication.paidAmount ?? 0).toLocaleString()}`
                      : ticket.groupDiveApplication.paymentStatus,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-3 py-3">
                    <dt className="text-[var(--color-muted)]">{label}</dt>
                    <dd className="break-words text-right font-medium leading-5 text-[var(--color-ink)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        <div className="px-6 w-full flex flex-col items-center">
          {isCheckedIn ? (
             <Button 
                 onClick={() => setIsEntered(true)} 
                 className="bg-white text-black hover:bg-[var(--color-surface-muted)] w-full max-w-sm rounded-[var(--radius-card-lg)] h-14 font-bold text-base shadow-[0_0_20px_rgba(255,243,243,0.1)] gap-2"
             >
                 <DyveIcon name="ticket-checked" size="md" tone="default" className="h-5 w-5" />
                 디지털 기념 티켓 보기
             </Button>
          ) : (
            <>
              {showPasswordInput ? (
                <div className="w-full max-w-sm bg-[var(--color-surface-soft)] rounded-[var(--radius-card-lg)] p-4 border border-[var(--color-hairline)] animate-in slide-in-from-bottom-2">
                    <p className="mb-3 text-center text-sm text-[var(--color-muted)]">직원용 비밀번호를 입력하세요</p>
                    <div className="flex gap-2">
                        <Input 
                            type="password" 
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setErrorMsg("");
                            }}
                            placeholder="직원용 비밀번호"
                            className="border-[var(--color-hairline-strong)] bg-[var(--color-surface-strong)] text-center tracking-[0.04em] text-[var(--color-ink)]"
                            autoFocus
                        />
                        <Button 
                            onClick={handleManualCheck}
                            className="bg-[var(--color-primary-strong)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
                        >
                            확인
                        </Button>
                    </div>
                    {errorMsg && <p className="mt-2 rounded-[var(--radius-button-md)] bg-[var(--color-primary-soft)] px-3 py-2 text-center text-sm font-medium text-[var(--color-ink)]">{errorMsg}</p>}
                    <button 
                        onClick={() => setShowPasswordInput(false)}
                        className="mt-3 w-full text-center text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                    >
                        취소
                    </button>
                </div>
              ) : (
                <Button 
                    variant="outline" 
                    onClick={() => setShowPasswordInput(true)}
                    className="h-12 w-full max-w-sm border-[var(--color-hairline-strong)] bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-ink)]"
                >
                    <DyveIcon name="lock" size="sm" tone="muted" className="mr-2 h-4 w-4" /> 직원 확인
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
