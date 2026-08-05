import { useCallback, useEffect, useMemo, useState } from "react";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { api, formatApiError, type EventInquiry } from "../services/api";

const STATUS_LABELS: Record<string, string> = {
  received: "접수",
  reviewing: "검토",
  proposal_sent: "제안 발송",
  converted: "공연 전환",
  closed: "종료",
  cancelled: "취소",
};

const NEXT_STATUSES = ["received", "reviewing", "proposal_sent", "converted", "closed", "cancelled"];

type InquiryKind = "group_dive" | "buddy_dive" | "event";
type InquiryFilter = "all" | InquiryKind;

const FILTERS: { id: InquiryFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "group_dive", label: "Group Dive" },
  { id: "buddy_dive", label: "Buddy Dive" },
  { id: "event", label: "공연 문의" },
];

const INQUIRY_KIND_LABELS: Record<InquiryKind, string> = {
  group_dive: "Group Dive",
  buddy_dive: "Buddy Dive",
  event: "공연 문의",
};

const PARTICIPATION_LABELS: Record<string, string> = {
  definite: "꼭 참여",
  if_available: "일정이 맞으면 참여",
  updates_only: "다음 소식만 받기",
};

const getInquiryKind = (item: EventInquiry): InquiryKind => {
  const requestType = item.metadata?.requestType;
  if (requestType === "group_dive_interest") return "group_dive";
  if (requestType === "buddy_dive_event_request") return "buddy_dive";
  return "event";
};

const toStringList = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export function AdminInquiriesPage() {
  const [items, setItems] = useState<EventInquiry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InquiryFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredItems = useMemo(
    () => filter === "all" ? items : items.filter((item) => getInquiryKind(item) === filter),
    [filter, items],
  );

  const selected = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null,
    [filteredItems, selectedId],
  );
  const selectedKind = selected ? getInquiryKind(selected) : null;
  const selectedMetadata = selected?.metadata ?? {};
  const selectedSchedules = toStringList(selectedMetadata.schedulePreferences);

  const load = useCallback(async () => {
    const controller = new AbortController();
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const result = await api.adminListInquiries({ limit: 100 }, controller.signal);
      setItems(result.data);
      setSelectedId((prev) => prev ?? result.data[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(formatApiError(error, "문의 목록을 불러오지 못했어요."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (status: string) => {
    if (!selected || isUpdating) return;
    try {
      setIsUpdating(true);
      const updated = await api.adminUpdateInquiryStatus(selected.id, { status });
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setErrorMessage(formatApiError(error, "상태를 변경하지 못했어요."));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 md:grid-cols-[360px_minmax(0,1fr)] md:px-8">
        <section className="space-y-4">
          <div className="border-b border-[var(--color-hairline)] pb-4">
            <div className="flex items-center gap-2">
              <DyveIcon name="clipboard-list" size="sm" tone="primary" className="h-4 w-4" />
              <span className="ty-micro font-bold uppercase text-[var(--color-primary)]">INQUIRIES</span>
            </div>
            <h1 className="mt-2 ty-section-title">문의·지역 수요 접수</h1>
            <p className="mt-2 ty-caption text-[var(--color-muted)]">
              공연 문의와 Buddy Dive 요청, Group Dive 지역 수요를 한곳에서 관리합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="문의 유형 필터">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`min-h-9 rounded-[var(--radius-pill)] border px-3 text-xs font-bold ${
                  filter === option.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                    : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-muted)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {isLoading && <p className="text-sm text-[var(--color-muted)]">불러오는 중...</p>}
          {errorMessage && (
            <div className="rounded-[var(--radius-card-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 p-3 text-sm text-[var(--color-primary)]">
              <p>{errorMessage}</p>
              <button type="button" className="mt-2 min-h-11 font-bold underline underline-offset-4" onClick={() => void load()}>
                다시 시도
              </button>
            </div>
          )}
          {!isLoading && filteredItems.length === 0 && (
            <div className="border-y border-[var(--color-hairline)] py-8 text-center text-sm text-[var(--color-muted)]">
              {items.length === 0 ? "접수된 문의가 없습니다." : "이 유형으로 접수된 항목이 없습니다."}
            </div>
          )}

          <div className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            {filteredItems.map((item) => {
              const active = selected?.id === item.id;
              const kind = getInquiryKind(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full p-4 text-left transition-colors ${
                    active
                      ? "bg-[var(--color-primary-soft)]"
                      : "hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{item.organizationName || item.requesterName}</p>
                      <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{item.region || "지역 미정"} · {item.dateRange || "일정 미정"}</p>
                    </div>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-[var(--radius-pill)] bg-[var(--color-primary-soft)] px-2 py-1 text-[10px] font-bold text-[var(--color-primary)]">
                        {INQUIRY_KIND_LABELS[kind]}
                      </span>
                      <span className="rounded-[var(--radius-pill)] border border-[var(--color-hairline)] px-2 py-1 text-[11px] font-bold text-[var(--color-muted)]">
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="min-h-[420px] rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-5">
          {selected ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 border-b border-[var(--color-hairline)] pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="ty-micro font-bold uppercase text-[var(--color-primary)]">
                    {selectedKind ? INQUIRY_KIND_LABELS[selectedKind] : ""} · {STATUS_LABELS[selected.status] ?? selected.status}
                  </p>
                  <h2 className="mt-2 text-xl font-bold">{selected.organizationName || selected.requesterName}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{selected.eventGoal}</p>
                </div>
                <select
                  value={selected.status}
                  disabled={isUpdating}
                  onChange={(event) => updateStatus(event.target.value)}
                  className="h-10 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm font-semibold"
                >
                  {NEXT_STATUSES.map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status] ?? status}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoTile label="연락처" value={selected.contactEmail || selected.contactPhone || "-"} />
                <InfoTile label="지역" value={selected.region || "-"} />
                <InfoTile label="일정" value={selected.dateRange || "-"} />
                <InfoTile
                  label={selectedKind === "group_dive" ? "지역 입력 방식" : "예산"}
                  value={
                    selectedKind === "group_dive"
                      ? selectedMetadata.regionSource === "custom" ? "직접 입력" : "서울 권역"
                      : selected.budgetRange || "-"
                  }
                />
              </div>

              {selectedKind === "group_dive" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <DetailPanel title="일정 선호" values={selectedSchedules} />
                  <InfoTile
                    label="다음 모임 참여 의향"
                    value={PARTICIPATION_LABELS[String(selectedMetadata.participationIntent ?? "")] ?? "-"}
                  />
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <DetailPanel title="필요한 도움" values={selected.requirements?.serviceNeeds ?? []} />
                  <DetailPanel title="보조 요소" values={selected.requirements?.addOnNeeds ?? []} />
                  <DetailPanel title="공연 감각" values={selected.requirements?.desiredGenres ?? []} />
                  <DetailPanel title="분위기" values={selected.requirements?.moodTags ?? []} />
                </div>
              )}

              {(selected.venueAddress || selected.requirements?.equipmentNotes) && (
                <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4">
                  <p className="text-xs font-bold uppercase text-[var(--color-muted)]">운영 참고</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {[selected.venueAddress, selected.requirements?.equipmentNotes].filter(Boolean).join("\n\n")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[360px] items-center justify-center text-sm text-[var(--color-muted)]">
              문의를 선택해 주세요.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4">
      <p className="text-[11px] font-bold uppercase text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function DetailPanel({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4">
      <p className="text-xs font-bold uppercase text-[var(--color-muted)]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span key={value} className="rounded-[var(--radius-pill)] bg-[var(--color-surface-soft)] px-3 py-1.5 text-xs font-semibold">
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-[var(--color-muted)]">-</span>
        )}
      </div>
    </div>
  );
}
