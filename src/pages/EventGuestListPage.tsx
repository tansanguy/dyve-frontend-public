import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { LoadingIndicator } from "../components/LoadingIndicator";
import {
  api,
  formatApiError,
  type DoorSaleDto,
  type EventAccessInviteDto,
  type GuestEntryDto,
  type GuestListDto,
  type NightReportDto,
  type VenueIdCheckPolicy,
} from "../services/api";

type EntryFilter = "all" | "vip" | "checked";
const TIER_LABEL = { guest: "일반 초대", vip: "VIP", comp: "아티스트 게스트" };
const METHOD_LABEL = { card: "외부 카드", cash: "현금", free: "무료·관계자", dyve: "DYVE 결제" };
const toLocalInput = (value: unknown) => {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export function EventGuestListPage() {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [lists, setLists] = useState<GuestListDto[]>([]);
  const [entries, setEntries] = useState<GuestEntryDto[]>([]);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [invites, setInvites] = useState<EventAccessInviteDto[]>([]);
  const [doorSales, setDoorSales] = useState<DoorSaleDto[]>([]);
  const [report, setReport] = useState<NightReportDto | null>(null);
  const [canManageVenue, setCanManageVenue] = useState(false);
  const [listId, setListId] = useState("");
  const [filter, setFilter] = useState<EntryFilter>("all");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState<GuestEntryDto["tier"]>("guest");
  const [partySize, setPartySize] = useState(1);
  const [phoneLast4, setPhoneLast4] = useState("");
  const [note, setNote] = useState("");
  const [showListForm, setShowListForm] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [correctingEntryId, setCorrectingEntryId] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleMethod, setSaleMethod] = useState<"card" | "cash" | "free">("card");
  const [capacityReason, setCapacityReason] = useState("");
  const [venueIdCheckPolicy, setVenueIdCheckPolicy] = useState<VenueIdCheckPolicy>("unset");
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false);
  const [doorEnabled, setDoorEnabled] = useState(false);
  const [doorPrice, setDoorPrice] = useState(0);
  const [doorStart, setDoorStart] = useState("");
  const [doorEnd, setDoorEnd] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!eventId) return;
    try {
      if (!quiet) setIsLoading(true);
      const [eventResponse, listResponse, entryResponse, statusResponse] = await Promise.all([
        api.getEvent(eventId, undefined, true),
        api.listGuestLists(eventId),
        api.listGuestEntries(eventId),
        api.getEventCheckinStatus(eventId),
      ]);
      const eventData = eventResponse.data as Record<string, unknown>;
      setEvent(eventData);
      setLists(listResponse.data);
      setEntries(entryResponse.data);
      setStats(statusResponse as Record<string, unknown>);
      setListId((current) => current || listResponse.data.find((item) => item.isActive)?.id || "");
      if (!quiet) {
        setDoorEnabled(eventData.doorSalesEnabled === true);
        setDoorPrice(Number(eventData.doorPrice ?? 0));
        setDoorStart(toLocalInput(eventData.doorSaleStartAt));
        setDoorEnd(toLocalInput(eventData.doorSaleEndAt));
        setVenueIdCheckPolicy(
          eventData.venueIdCheckPolicy === "manual_required" || eventData.venueIdCheckPolicy === "not_required"
            ? eventData.venueIdCheckPolicy
            : "unset",
        );
      }
      const [inviteResult, saleResult, reportResult] = await Promise.allSettled([
        api.listEventAccessInvites(eventId),
        api.listExternalDoorSales(eventId),
        api.getEventNightReport(eventId),
      ]);
      if (inviteResult.status === "fulfilled") {
        setInvites(inviteResult.value.data);
        setCanManageVenue(true);
      } else {
        setCanManageVenue(false);
      }
      if (saleResult.status === "fulfilled") setDoorSales(saleResult.value.data);
      if (reportResult.status === "fulfilled") setReport(reportResult.value);
      else setReport(null);
      setMessage(null);
    } catch (error) {
      if (!quiet) setMessage(formatApiError(error, "입장 운영 정보를 불러오지 못했어요."));
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter === "vip" && entry.tier !== "vip") return false;
      if (filter === "checked" && entry.checkedInCount === 0) return false;
      return !query || entry.name.toLowerCase().includes(query) || entry.phoneLast4.includes(query);
    });
  }, [entries, filter, search]);

  const createFirstList = async () => {
    try {
      setIsSaving(true);
      const created = await api.createGuestList(eventId, "일반 초대");
      setLists([created]);
      setListId(created.id);
    } catch (error) { setMessage(formatApiError(error, "명단을 만들지 못했어요.")); }
    finally { setIsSaving(false); }
  };

  const createList = async () => {
    const listName = newListName.trim();
    if (!listName) return;
    try {
      const created = await api.createGuestList(eventId, listName);
      setLists((current) => [...current, created]);
      setListId(created.id);
      setNewListName("");
      setShowListForm(false);
    } catch (error) { setMessage(formatApiError(error, "명단을 만들지 못했어요.")); }
  };

  const addGuest = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (!listId || !name.trim()) return;
    try {
      setIsSaving(true);
      const created = await api.createGuestEntry(eventId, { listId, name: name.trim(), tier, partySize, phoneLast4, note: note.trim() });
      setEntries((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, "ko")));
      setName(""); setPhoneLast4(""); setNote(""); setPartySize(1);
    } catch (error) { setMessage(formatApiError(error, "게스트를 추가하지 못했어요.")); }
    finally { setIsSaving(false); }
  };

  const importCsv = async (file?: File) => {
    if (!file || !listId) return;
    try {
      setIsSaving(true);
      const response = await api.importGuestCsv(eventId, listId, file);
      setEntries(response.data);
    } catch (error) { setMessage(formatApiError(error, "CSV를 가져오지 못했어요.")); }
    finally { setIsSaving(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const copyPass = async (entry: GuestEntryDto) => {
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${entry.passToken}`);
    setMessage(`${entry.name}님의 초대 링크를 복사했어요.`);
  };

  const cancelGuest = async (entry: GuestEntryDto) => {
    try {
      const updated = await api.updateGuestEntry(eventId, entry.id, { status: "cancelled" });
      setEntries((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) { setMessage(formatApiError(error, "초대를 취소하지 못했어요.")); }
  };

  const reverseCheckin = async (entry: GuestEntryDto) => {
    if (!correctionReason.trim()) return;
    try {
      const updated = await api.reverseGuestCheckin(eventId, entry.id, 1, correctionReason.trim());
      setEntries((current) => current.map((item) => item.id === updated.id ? updated : item));
      setCorrectingEntryId(null); setCorrectionReason(""); void load(true);
    } catch (error) { setMessage(formatApiError(error, "입장 인원을 정정하지 못했어요.")); }
  };

  const saveAdmissionPolicy = async () => {
    if (venueIdCheckPolicy === "unset" || !responsibilityAccepted) {
      setMessage("정책을 선택하고 업장 운영 책임을 확인해 주세요.");
      return;
    }
    try {
      setIsSaving(true);
      const updated = await api.updateAdmissionSettings(eventId, venueIdCheckPolicy) as Record<string, unknown>;
      setEvent((current) => current ? { ...current, ...updated } : current);
      setResponsibilityAccepted(false);
      setMessage("현장 신분증 검사 정책과 책임 확인을 기록했어요.");
    } catch (error) { setMessage(formatApiError(error, "현장 신분증 검사 정책을 저장하지 못했어요.")); }
    finally { setIsSaving(false); }
  };

  const recordDoorSale = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    try {
      setIsSaving(true);
      const created = await api.createExternalDoorSale(eventId, {
        quantity: saleQuantity,
        paymentMethod: saleMethod,
        capacityOverrideReason: capacityReason.trim(),
      });
      setDoorSales((current) => [created, ...current]);
      setMessage(`${METHOD_LABEL[saleMethod]} ${saleQuantity}명 입장을 기록했어요.${created.overCapacity ? " 정원 초과 입장입니다." : ""}`);
      setSaleQuantity(1); setCapacityReason(""); void load(true);
    } catch (error) { setMessage(formatApiError(error, "현매 입장을 기록하지 못했어요.")); }
    finally { setIsSaving(false); }
  };

  const voidSale = async (sale: DoorSaleDto) => {
    const reason = window.prompt("취소 사유를 입력해 주세요.")?.trim();
    if (!reason) return;
    try {
      const updated = await api.voidExternalDoorSale(eventId, sale.id, reason);
      setDoorSales((current) => current.map((item) => item.id === sale.id ? updated : item));
      setMessage("원본은 유지하고 취소 이력을 남겼어요.");
      void load(true);
    } catch (error) { setMessage(formatApiError(error, "현매 기록을 취소하지 못했어요.")); }
  };

  const createInvite = async (role: "staff" | "promoter") => {
    try {
      const created = await api.createEventAccessInvite(eventId, role);
      const url = new URL(created.inviteUrl || "", window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setInvites((current) => [created, ...current]);
      setMessage(`${role === "staff" ? "스태프" : "프로모터"} 초대 링크를 복사했어요. 링크는 한 번만 사용할 수 있어요.`);
    } catch (error) { setMessage(formatApiError(error, "초대 링크를 만들지 못했어요.")); }
  };

  const revokeInvite = async (invite: EventAccessInviteDto) => {
    try {
      await api.revokeEventAccessInvite(eventId, invite.id);
      setInvites((current) => current.map((item) => item.id === invite.id ? { ...item, revokedAt: new Date().toISOString() } : item));
    } catch (error) { setMessage(formatApiError(error, "초대 권한을 철회하지 못했어요.")); }
  };

  const saveDoorSettings = async () => {
    if (!doorStart || !doorEnd) { setMessage("현매 판매 시작과 종료 시간을 입력해 주세요."); return; }
    try {
      setIsSaving(true);
      await api.updateDoorSettings(eventId, { enabled: doorEnabled, price: doorPrice, saleStartAt: new Date(doorStart).toISOString(), saleEndAt: new Date(doorEnd).toISOString() });
      setMessage("현매 판매 설정을 저장했어요.");
    } catch (error) { setMessage(formatApiError(error, "현매 설정을 저장하지 못했어요.")); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="min-h-screen bg-[var(--color-canvas)]"><NavHeader title="입장 운영" onBack={() => navigate(-1)} /><LoadingIndicator className="p-8" /></div>;

  const cards = [
    ["총 예정", Number(stats.totalExpected ?? 0)],
    ["누적 입장", Number(stats.checkedInPeople ?? 0)],
    ["티켓", `${Number(stats.checkedInTickets ?? 0)}/${Number(stats.expectedTickets ?? 0)}`],
    ["초대", `${Number(stats.checkedInGuests ?? 0)}/${Number(stats.expectedGuests ?? 0)}`],
    ["VIP 예정", Number(stats.expectedVip ?? 0)],
    ["현매", `${Number(stats.checkedInDoorSales ?? 0)}/${Number(stats.expectedDoorSales ?? 0)}`],
  ];

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <NavHeader title="입장 운영" onBack={() => navigate(-1)} />
      <main className="space-y-5 p-4 min-[390px]:p-6">
        <section><p className="ty-title-md break-keep font-bold">{String(event?.title ?? "행사")}</p><p className="ty-caption mt-1 text-[var(--color-muted)]">{String(event?.dateDisplay ?? "")} · {String(event?.venue ?? "")}</p></section>

        <section className="grid grid-cols-2 gap-2 min-[430px]:grid-cols-3">
          {cards.map(([label, value]) => <div key={String(label)} className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-3"><p className="ty-caption text-[var(--color-muted)]">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value}</p></div>)}
        </section>

        <button disabled={venueIdCheckPolicy === "unset"} onClick={() => navigate(`/checkin?event=${eventId}`)} className="w-full rounded-[var(--radius-card-md)] bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-[var(--color-on-primary)] disabled:opacity-50">도어 모드 열기</button>
        {venueIdCheckPolicy === "unset" && <p className="break-keep rounded-[var(--radius-card-md)] bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-body)]">현매와 도어 운영을 시작하려면 업장이 현장 신분증 검사 정책을 먼저 선택해야 합니다.</p>}
        {venueIdCheckPolicy === "manual_required" && <div className="space-y-1 rounded-[var(--radius-card-md)] bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-body)]"><p className="break-keep">이 행사는 업장 직원이 현장에서 실물 신분증을 직접 확인합니다.</p><p className="break-keep">DYVE는 신분증 정보를 수집하거나 인증하지 않습니다.</p></div>}
        {message && <p className="break-keep rounded-[var(--radius-card-md)] bg-[var(--color-surface-muted)] p-3 text-sm">{message}</p>}

        <details open className="group rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
          <summary className="cursor-pointer list-none font-bold">현매 입장 기록</summary>
          <form onSubmit={recordDoorSale} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3"><select value={saleMethod} onChange={(e) => setSaleMethod(e.target.value as typeof saleMethod)} className="h-11 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm"><option value="card">외부 카드</option><option value="cash">현금</option><option value="free">무료·관계자</option></select><input aria-label="현매 인원" type="number" min={1} max={50} value={saleQuantity} onChange={(e) => setSaleQuantity(Number(e.target.value))} className="h-11 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm" /><div className="flex h-11 items-center rounded-xl bg-[var(--color-surface-muted)] px-3 text-xs font-bold max-[389px]:col-span-2">{saleMethod === "free" ? "매출 제외" : `${doorPrice.toLocaleString()}원 × ${saleQuantity}명`}</div></div>
            {saleMethod === "free" && <input value={capacityReason} onChange={(e) => setCapacityReason(e.target.value)} placeholder="정원 초과 시 관리자 승인 사유" className="h-11 w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm" />}
            <button disabled={isSaving || venueIdCheckPolicy === "unset"} className="h-11 w-full rounded-xl bg-[var(--color-ink)] text-sm font-bold text-[var(--color-canvas)] disabled:opacity-50">결제 기록과 입장 확정</button>
          </form>
          {doorSales.length > 0 && <div className="mt-4 space-y-2 border-t border-[var(--color-hairline)] pt-3">{doorSales.slice(0, 8).map((sale) => <div key={sale.id} className={`flex items-center justify-between gap-3 text-xs ${sale.status === "voided" ? "opacity-50" : ""}`}><span>{METHOD_LABEL[sale.paymentMethod]} · {sale.partySize}명 · {sale.totalAmount.toLocaleString()}원{sale.overCapacity ? " · 정원 초과" : ""}</span>{sale.status !== "voided" && canManageVenue && <button onClick={() => void voidSale(sale)} className="shrink-0 text-[var(--color-error)]">기록 취소</button>}</div>)}</div>}
        </details>

        {canManageVenue && <details className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4"><summary className="cursor-pointer list-none font-bold">업장 설정과 운영 권한</summary><div className="mt-4 space-y-4"><div className="space-y-3"><p className="text-sm font-bold">현장 신분증 검사 정책</p><div className="space-y-2"><label className="flex items-start gap-2 rounded-xl bg-[var(--color-canvas)] p-3 text-sm"><input type="radio" name="venue-id-policy" className="mt-0.5" checked={venueIdCheckPolicy === "manual_required"} onChange={() => { setVenueIdCheckPolicy("manual_required"); setResponsibilityAccepted(false); }} /><span><strong className="block">직접 검사 필요</strong><span className="mt-1 block break-keep text-xs text-[var(--color-muted)]">업장 직원이 실물 신분증을 직접 확인합니다.</span></span></label><label className="flex items-start gap-2 rounded-xl bg-[var(--color-canvas)] p-3 text-sm"><input type="radio" name="venue-id-policy" className="mt-0.5" checked={venueIdCheckPolicy === "not_required"} onChange={() => { setVenueIdCheckPolicy("not_required"); setResponsibilityAccepted(false); }} /><span><strong className="block">검사 불필요</strong><span className="mt-1 block break-keep text-xs text-[var(--color-muted)]">업장이 검사 필요 여부를 판단해 불필요로 운영합니다.</span></span></label></div><div className="space-y-2 rounded-xl bg-[var(--color-surface-muted)] p-3 text-xs text-[var(--color-body)]"><p className="break-keep">DYVE QR은 입장 자격과 결제 상태만 확인하며, 신분증 진위나 나이를 판정하지 않습니다.</p><p className="break-keep">관련 법령 준수, 직원 교육과 최종 입장 판단은 업장 운영 책임입니다.</p></div><label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={responsibilityAccepted} onChange={(e) => setResponsibilityAccepted(e.target.checked)} /><span className="break-keep">위 내용을 확인했으며 이 행사에 선택한 정책으로 운영합니다.</span></label><button disabled={isSaving || venueIdCheckPolicy === "unset" || !responsibilityAccepted} onClick={() => void saveAdmissionPolicy()} className="h-11 w-full rounded-xl bg-[var(--color-ink)] text-sm font-bold text-[var(--color-canvas)] disabled:opacity-50">정책과 책임 확인 저장</button></div><div className="space-y-2 border-t border-[var(--color-hairline)] pt-4"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={doorEnabled} onChange={(e) => setDoorEnabled(e.target.checked)} /> DYVE 현매 판매</label><input aria-label="현매가" type="number" min={0} value={doorPrice} onChange={(e) => setDoorPrice(Number(e.target.value))} className="h-11 w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm" /><div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2"><label className="text-xs text-[var(--color-muted)]">판매 시작<input type="datetime-local" value={doorStart} onChange={(e) => setDoorStart(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2 text-sm text-[var(--color-ink)]" /></label><label className="text-xs text-[var(--color-muted)]">판매 종료<input type="datetime-local" value={doorEnd} onChange={(e) => setDoorEnd(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2 text-sm text-[var(--color-ink)]" /></label></div><button disabled={isSaving || venueIdCheckPolicy === "unset"} onClick={() => void saveDoorSettings()} className="h-11 w-full rounded-xl bg-[var(--color-primary)] text-sm font-bold text-[var(--color-on-primary)] disabled:opacity-50">현매 설정 저장</button></div><div className="border-t border-[var(--color-hairline)] pt-4"><p className="text-sm font-bold">행사별 1회용 초대</p><div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => void createInvite("staff")} className="h-11 rounded-xl bg-[var(--color-surface-muted)] text-xs font-bold">스태프 링크 복사</button><button onClick={() => void createInvite("promoter")} className="h-11 rounded-xl bg-[var(--color-surface-muted)] text-xs font-bold">프로모터 링크 복사</button></div>{invites.length > 0 && <div className="mt-3 space-y-2">{invites.map((invite) => <div key={invite.id} className="flex items-center justify-between gap-2 text-xs"><span>{invite.role === "staff" ? "스태프" : "프로모터"} · {invite.revokedAt ? "철회" : invite.acceptedAt ? "수락 완료" : "수락 대기"}</span>{!invite.revokedAt && <button onClick={() => void revokeInvite(invite)} className="text-[var(--color-error)]">철회</button>}</div>)}</div>}</div></div></details>}

        {lists.length === 0 ? <button disabled={isSaving} onClick={createFirstList} className="w-full rounded-[var(--radius-card-md)] border border-dashed border-[var(--color-primary)] p-6 text-sm font-bold text-[var(--color-primary)]">첫 게스트 명단 만들기</button> : <>
          <form onSubmit={addGuest} className="space-y-3 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4"><div className="flex items-center justify-between gap-2"><p className="font-bold">게스트 빠른 추가</p><select value={listId} onChange={(e) => setListId(e.target.value)} className="min-w-0 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2 py-2 text-sm">{lists.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" onClick={() => setShowListForm((current) => !current)} className="shrink-0 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-bold">명단 추가</button></div>{showListForm && <div className="flex gap-2"><input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="새 명단 이름" className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm" /><button type="button" disabled={!newListName.trim()} onClick={() => void createList()} className="rounded-xl bg-[var(--color-ink)] px-4 text-xs font-bold text-[var(--color-canvas)] disabled:opacity-50">만들기</button></div>}<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className="h-11 w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm" /><div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3"><select value={tier} onChange={(e) => setTier(e.target.value as GuestEntryDto["tier"])} className="h-11 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2 text-sm">{Object.entries(TIER_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input type="number" min={1} max={50} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} aria-label="총 인원" className="h-11 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm" /><input inputMode="numeric" maxLength={4} value={phoneLast4} onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="전화 뒤 4자리" className="h-11 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm max-[389px]:col-span-2" /></div><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="도어 메모 (선택)" className="h-11 w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm" /><button disabled={isSaving || !name.trim()} className="h-11 w-full rounded-xl bg-[var(--color-ink)] text-sm font-bold text-[var(--color-canvas)] disabled:opacity-50">명단에 추가</button></form>

          <section className="space-y-3"><div className="flex items-center gap-2"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3"><DyveIcon name="search" size="sm" tone="muted" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="이름 또는 전화번호 검색" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" /></div><input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void importCsv(e.target.files?.[0])} /><button onClick={() => fileRef.current?.click()} className="h-11 shrink-0 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 text-xs font-bold">CSV</button></div><div className="flex gap-2 overflow-x-auto">{(["all", "vip", "checked"] as EntryFilter[]).map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${filter === item ? "bg-[var(--color-ink)] text-[var(--color-canvas)]" : "bg-[var(--color-surface-muted)]"}`}>{{ all: "전체", vip: "VIP", checked: "입장 완료" }[item]}</button>)}</div><div className="space-y-2">{filtered.map((entry) => <article key={entry.id} className={`rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 ${entry.status === "cancelled" ? "opacity-50" : ""}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold">{entry.name}</p><span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-bold">{TIER_LABEL[entry.tier]}</span></div><p className="ty-caption mt-1 text-[var(--color-muted)]">{entry.listName} · {entry.checkedInCount}/{entry.partySize}명 입장{entry.phoneLast4 ? ` · ${entry.phoneLast4}` : ""}</p>{entry.note && <p className="ty-caption mt-1 break-keep text-[var(--color-body)]">{entry.note}</p>}</div>{entry.status === "active" && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${entry.remainingCount === 0 ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)]"}`} />}</div>{entry.status === "active" && <><div className="mt-3 flex gap-2"><button onClick={() => void copyPass(entry)} className="flex-1 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-bold">초대 링크 복사</button>{entry.checkedInCount > 0 && <button onClick={() => setCorrectingEntryId(entry.id)} className="rounded-lg px-3 py-2 text-xs font-bold text-[var(--color-warning)]">1명 정정</button>}<button onClick={() => void cancelGuest(entry)} className="rounded-lg px-3 py-2 text-xs text-[var(--color-error)]">취소</button></div>{correctingEntryId === entry.id && <div className="mt-2 flex gap-2"><input value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} placeholder="정정 사유" className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm" /><button disabled={!correctionReason.trim()} onClick={() => void reverseCheckin(entry)} className="rounded-lg bg-[var(--color-warning)] px-3 text-xs font-bold text-black disabled:opacity-50">정정 확정</button></div>}</>}</article>)}{filtered.length === 0 && <p className="py-8 text-center text-sm text-[var(--color-muted)]">조건에 맞는 게스트가 없어요.</p>}</div></section>
        </>}

        {report && <details className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4"><summary className="cursor-pointer list-none font-bold">행사 운영 보고서</summary><div className="mt-4 space-y-4 text-sm"><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><p className="text-xs text-[var(--color-muted)]">업장 정산 대상 현매</p><p className="mt-1 font-bold">{report.venueSettlementAmount.toLocaleString()}원</p></div><div className="rounded-xl bg-[var(--color-surface-muted)] p-3"><p className="text-xs text-[var(--color-muted)]">고객 수수료</p><p className="mt-1 font-bold">{report.customerFees.toLocaleString()}원</p></div></div><p>정원 초과 입장 {report.overCapacityAdmissions}명</p>{report.revenue.map((row) => <div key={`${row.channel}-${row.payment_method}`} className="flex justify-between gap-2"><span>{METHOD_LABEL[row.payment_method]} · {row.people}명</span><strong>{Number(row.amount).toLocaleString()}원</strong></div>)}{report.promoters.length > 0 && <div className="border-t border-[var(--color-hairline)] pt-3"><p className="mb-2 font-bold">프로모터 입장률</p>{report.promoters.map((row) => <div key={row.listId} className="flex justify-between gap-2 py-1"><span className="truncate">{row.promoterName || row.listName}</span><strong>{row.checkedIn}/{row.expected}명 · {row.entryRate}%</strong></div>)}</div>}</div></details>}
      </main>
    </div>
  );
}
