import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/figma/ui/button";
import { Input } from "../components/figma/ui/input";
import { api, formatApiError, type GroupDiveDto, type TestFixtureData } from "../services/api";
import { toast } from "sonner";

const genderLabel = { female: "여성", male: "남성" } as const;

export function AdminTestDataPage() {
  const [data, setData] = useState<TestFixtureData | null>(null);
  const [groupDives, setGroupDives] = useState<GroupDiveDto[]>([]);
  const [audienceId, setAudienceId] = useState("");
  const [groupDiveId, setGroupDiveId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [desiredGender, setDesiredGender] = useState("any");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [result, groupDiveResult] = await Promise.all([
        api.getAdminTestData(),
        api.adminListGroupDives(),
      ]);
      const openGroupDives = groupDiveResult.data.filter((item) => item.status === "open");
      setData(result);
      setGroupDives(openGroupDives);
      setAudienceId((current) =>
        result.audiences.some((audience) => audience.id === current)
          ? current
          : result.audiences[0]?.id || "",
      );
      setGroupDiveId((current) =>
        openGroupDives.some((groupDive) => groupDive.id === current)
          ? current
          : openGroupDives[0]?.id || "",
      );
    } catch (err) {
      setError(formatApiError(err, "테스트 데이터를 불러오지 못했습니다."));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = async (label: string, payload: Record<string, unknown>, confirmation?: string) => {
    if (confirmation && !window.confirm(confirmation)) return;
    try {
      setBusy(label);
      setError(null);
      await api.adminTestDataAction(payload);
      toast.success(`${label} 완료`);
      await load();
    } catch (err) {
      const text = formatApiError(err, `${label}에 실패했습니다.`);
      setError(text);
      toast.error(text);
    } finally {
      setBusy(null);
    }
  };

  const bookingPayload = (kind: "event" | "group_dive" | "buddy_dive") => ({
    action: "book",
    audienceId,
    kind,
    quantity: Number(quantity) || 1,
    message,
    desiredGender,
    ...(kind === "group_dive" ? { groupDiveId } : {}),
  });

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <header className="mb-6 border-b border-[var(--color-hairline)] pb-5">
          <p className="ty-micro font-bold tracking-[0.12em] text-[var(--color-primary)]">SANDBOX CONTROL</p>
          <h1 className="mt-2 ty-section-title font-bold">테스트 데이터</h1>
          <p className="mt-2 max-w-2xl ty-caption leading-5 text-[var(--color-muted)]">
            <span className="block" data-copy-line>실제 결제 없이 운영자 전용 관객·예매·채팅을 시뮬레이션합니다.</span>
            <span className="block" data-copy-line>Group Dive 신청은 선택한 모집의 참여 인원에 포함됩니다.</span>
          </p>
        </header>

        <section className="mb-6 grid gap-px overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-hairline)] sm:grid-cols-5" aria-label="테스트 데이터 현황">
          {[
            ["관객", data?.counts.audiences ?? 0],
            ["예매", data?.counts.tickets ?? 0],
            ["Group Dive", data?.counts.groupDiveApplications ?? 0],
            ["Buddy Dive", data?.counts.buddyApplications ?? 0],
            ["대화", data?.counts.conversations ?? 0],
          ].map(([label, count]) => (
            <div key={String(label)} className="bg-[var(--color-surface-white)] px-4 py-4">
              <p className="ty-micro font-bold text-[var(--color-muted)]">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{count}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 flex flex-wrap gap-3 border-b border-[var(--color-hairline)] pb-6">
          <Button onClick={() => void run("40명 초기화", { action: "reset" }, "기존 테스트 데이터가 모두 초기화됩니다.")} disabled={busy !== null}>40명 초기화</Button>
          <Button variant="outline-soft" onClick={() => void run("테스트 데이터 삭제", { action: "clear" }, "모든 테스트 관객·예매·채팅을 삭제합니다.")} disabled={busy !== null}>전체 삭제</Button>
        </section>

        {error ? <p className="mb-5 rounded-[var(--radius-card-md)] bg-[var(--color-error-soft)] px-4 py-3 ty-body-sm text-[var(--color-error)]">{error}</p> : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-white)] p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <div><h2 className="ty-body-lg font-bold">40명 테스트 관객</h2><p className="mt-1 ty-caption text-[var(--color-muted)]">홀수 여성 · 짝수 남성 · 페르소나는 초기화 때 복원됩니다.</p></div>
              <span className="ty-caption text-[var(--color-muted)]">{data?.audiences.length ?? 0}명</span>
            </div>
            {!data?.audiences.length ? (
              <div className="py-12 text-center ty-body-sm text-[var(--color-muted)]">초기화하면 테스트 관객을 만들 수 있습니다.</div>
            ) : (
              <div className="grid max-h-[540px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {data.audiences.map((audience) => (
                  <button key={audience.id} type="button" onClick={() => setAudienceId(audience.id)} className={`rounded-[var(--radius-card-md)] border p-3 text-left transition-colors ${audienceId === audience.id ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-hairline)] hover:bg-[var(--color-surface-muted)]"}`}>
                    <div className="flex items-center justify-between gap-2"><strong className="ty-body-sm">{audience.name}</strong><span className="ty-micro text-[var(--color-muted)]">{genderLabel[audience.gender]} · {audience.age}세</span></div>
                    <p className="mt-1 ty-caption text-[var(--color-muted)]">{audience.region} · {audience.genre}</p>
                    <p className="mt-2 line-clamp-2 ty-caption leading-5 text-[var(--color-body)]">{audience.persona}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-white)] p-5">
              <h2 className="ty-body-lg font-bold">시나리오</h2>
              <p className="mt-1 ty-caption leading-5 text-[var(--color-muted)]">선택한 관객을 무결제 상태로 참여시킵니다.</p>
              <div className="mt-4 grid gap-2">
                <Button variant="outline-soft" onClick={() => void run("공연 예매", bookingPayload("event"))} disabled={!audienceId || busy !== null}>일반 공연 예매</Button>
                <label className="ty-caption font-bold text-[var(--color-body)]" htmlFor="test-group-dive">신청할 Group Dive</label>
                <select
                  id="test-group-dive"
                  value={groupDiveId}
                  onChange={(event) => setGroupDiveId(event.target.value)}
                  className="h-11 w-full rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-white)] px-3 ty-body-sm outline-none focus:border-[var(--color-ink)]"
                >
                  {groupDives.length === 0 ? <option value="">현재 모집 중인 Group Dive 없음</option> : null}
                  {groupDives.map((groupDive) => <option key={groupDive.id} value={groupDive.id}>{groupDive.title}</option>)}
                </select>
                <Button variant="outline-soft" onClick={() => void run("Group Dive 신청", bookingPayload("group_dive"))} disabled={!audienceId || !groupDiveId || busy !== null}>Group Dive 신청</Button>
                <Button variant="outline-soft" onClick={() => void run("Buddy Dive 신청", bookingPayload("buddy_dive"))} disabled={!audienceId || busy !== null}>Buddy Dive 신청</Button>
                <Button variant="outline-soft" onClick={() => void run("Buddy 선정", { action: "selectBuddy", audienceId })} disabled={!audienceId || busy !== null}>Buddy 선정·그룹채팅 초대</Button>
              </div>
            </section>

            <section className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-white)] p-5">
              <h2 className="ty-body-lg font-bold">세부 입력</h2>
              <label className="mt-4 block ty-caption font-bold text-[var(--color-body)]">예매 수량</label>
              <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" className="mt-1 h-11" />
              <label className="mt-4 block ty-caption font-bold text-[var(--color-body)]">신청/채팅 메시지</label>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="선택 사항" className="mt-1 min-h-24 w-full rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-white)] p-3 ty-body-sm outline-none focus:border-[var(--color-ink)]" />
              <label className="mt-4 block ty-caption font-bold text-[var(--color-body)]">Buddy 선호 성별</label>
              <select value={desiredGender} onChange={(event) => setDesiredGender(event.target.value)} className="mt-1 h-11 w-full rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-white)] px-3 ty-body-sm outline-none focus:border-[var(--color-ink)]">
                <option value="any">무관</option><option value="female">여성</option><option value="male">남성</option>
              </select>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => void run("1:1 채팅 생성", { action: "chat", chatType: "direct", content: message || "[TEST] 1:1 채팅 메시지" })} disabled={busy !== null}>1:1 메시지</Button>
                <Button variant="secondary" onClick={() => void run("Buddy 채팅 생성", { action: "chat", chatType: "buddy", content: message || "[TEST] Buddy 채팅 메시지" })} disabled={busy !== null}>Buddy 메시지</Button>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
