import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { DyveImage } from "../components/figma/dyve/DyveImage";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { Button } from "../components/figma/ui/button";
import { Input } from "../components/figma/ui/input";
import { Textarea } from "../components/figma/ui/textarea";
import { useAuth } from "../contexts/AuthContext";
import {
  api,
  formatApiError,
  type GroupDiveDto,
  type GroupDiveInterestMetadata,
} from "../services/api";

const PRESET_REGIONS = ["서울 동북부", "서울 서북부", "서울 동남부", "서울 서남부"] as const;
const SCHEDULE_OPTIONS = ["평일 저녁", "금요일 저녁", "토요일", "일요일", "일정 협의 가능"] as const;
const PARTICIPATION_OPTIONS = [
  { value: "definite", label: "꼭 참여하고 싶어요" },
  { value: "if_available", label: "일정이 맞으면 참여할게요" },
  { value: "updates_only", label: "다음 소식만 받고 싶어요" },
] as const;

type RegionChoice = (typeof PRESET_REGIONS)[number] | "custom" | "";
type SchedulePreference = (typeof SCHEDULE_OPTIONS)[number];
type ParticipationIntent = GroupDiveInterestMetadata["participationIntent"] | "";

const participationLabel = (value: ParticipationIntent) =>
  PARTICIPATION_OPTIONS.find((option) => option.value === value)?.label ?? "";

function ChoiceChip({
  checked,
  label,
  name,
  type,
  value,
  onChange,
}: {
  checked: boolean;
  label: string;
  name: string;
  type: "checkbox" | "radio";
  value: string;
  onChange: () => void;
}) {
  return (
    <label
      data-choice-name={name}
      data-choice-value={value}
      className={`inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-bold transition-colors ${
        checked
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
          : "border-[var(--color-hairline-strong)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-ink)]"
      }`}
    >
      <input
        className="sr-only"
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
}

export function GroupDivePage() {
  const navigate = useNavigate();
  const { isMember } = useAuth();
  const [groups, setGroups] = useState<GroupDiveDto[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [interest, setInterest] = useState("");
  const [regionChoice, setRegionChoice] = useState<RegionChoice>("");
  const [customRegion, setCustomRegion] = useState("");
  const [schedulePreferences, setSchedulePreferences] = useState<SchedulePreference[]>([]);
  const [participationIntent, setParticipationIntent] = useState<ParticipationIntent>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      setIsEventsLoading(true);
      setEventsError(null);
      const response = await api.listGroupDives();
      setGroups(response.data);
    } catch (error) {
      setGroups([]);
      setEventsError(formatApiError(error, "현재 모집을 불러오지 못했어요."));
    } finally {
      setIsEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (window.location.hash !== "#interest") return;
    window.requestAnimationFrame(() => {
      document.getElementById("interest")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const goToInterest = () => {
    if (!isMember) {
      navigate("/my", { state: { redirectTo: "/connection/group-dive#interest" } });
      return;
    }
    document.getElementById("interest")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleSchedule = (value: SchedulePreference) => {
    setSchedulePreferences((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const selectRegion = (value: RegionChoice) => {
    setRegionChoice(value);
    if (value !== "custom") setCustomRegion("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isMember) {
      navigate("/my", { state: { redirectTo: "/connection/group-dive#interest" } });
      return;
    }

    const trimmedInterest = interest.trim();
    const region = regionChoice === "custom" ? customRegion.trim() : regionChoice;
    if (!trimmedInterest) {
      setSubmitError("참여하고 싶은 프로그램이나 취향을 입력해 주세요.");
      return;
    }
    if (!region) {
      setSubmitError(regionChoice === "custom" ? "직접 입력할 지역을 적어 주세요." : "희망 지역을 선택해 주세요.");
      return;
    }
    if (schedulePreferences.length === 0) {
      setSubmitError("가능한 일정을 하나 이상 선택해 주세요.");
      return;
    }
    if (!participationIntent) {
      setSubmitError("다음 모임 참여 의향을 선택해 주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await api.createGroupDiveRegionalRequest({
        interest: trimmedInterest,
        region,
        schedules: schedulePreferences,
        participationIntent,
      });
      setIsComplete(true);
    } catch (error) {
      setSubmitError(formatApiError(error, "지역 수요 신청을 접수하지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolvedRegion = regionChoice === "custom" ? customRegion.trim() : regionChoice;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <NavHeader title="Group Dive" />
      <main className="min-h-0 flex-1 overflow-y-auto scroll-smooth pb-12">
        <section className="border-b border-[var(--color-hairline)] px-5 pb-10 pt-8">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Group Dive
          </p>
          <h1 className="mt-3 max-w-[24rem] break-keep font-display text-[clamp(1.35rem,6.4vw,1.75rem)] font-extrabold leading-[1.3] tracking-[-0.025em]">
            <span className="block" data-copy-line>내 취향, 내 동네에서</span>
            <span className="block" data-copy-line>작은 Group Dive를 시작해요.</span>
          </h1>
          <p className="mt-4 max-w-[24rem] break-keep text-[clamp(0.7rem,3.2vw,0.875rem)] leading-5 text-[var(--color-body)]">
            <span className="block" data-copy-line>원하는 지역과 날짜를 직접 신청할 수 있어요.</span>
          </p>
          <p data-progress-notice className="mt-3 text-[11px] leading-5 text-[var(--color-muted)]">
            <span className="block" data-copy-line>회차가 확정될 때까지,</span>
            <span className="block" data-copy-line>7일마다 진행 상황을 안내합니다.</span>
          </p>
          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              size="lg"
              data-group-dive-interest-cta
              onClick={goToInterest}
              className="w-full"
            >
              {isMember ? "내 지역에서 신청하기" : "로그인하고 신청하기"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("open-group-dives")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full"
            >
              현재 모집 보기
            </Button>
          </div>
        </section>

        <div id="open-group-dives" className="scroll-mt-4 border-b border-[var(--color-hairline)] px-4 py-6">
          {isEventsLoading ? (
            <div className="flex min-h-52 items-center justify-center"><LoadingIndicator /></div>
          ) : groups.length > 0 ? (
            <div>
              <div className="mb-4 px-1">
                <h2 className="text-xl font-bold">지금 열려 있는 Group Dive</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">보증금을 결제해 신청하고, 회차 배정 뒤 잔금을 결제해요.</p>
              </div>
              <div className="grid gap-3">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    aria-label={`${group.title} 상세 보기`}
                    onClick={() => navigate(`/connection/group-dive/${group.id}`)}
                    className="group relative aspect-[210/297] w-full overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-ink)] text-left shadow-[0_8px_24px_rgba(0,0,0,0.06)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
                  >
                    <DyveImage
                      src={group.coverImage}
                      alt=""
                      aria-hidden="true"
                      fallbackText={group.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/22 to-transparent" />
                    {group.isDyvePick && (
                      <span className="absolute left-4 top-4 rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-3 py-1 text-[11px] font-bold text-white">
                        DYVE PICK
                      </span>
                    )}
                    <h3 className="absolute inset-x-0 bottom-0 line-clamp-2 p-5 font-display text-[clamp(1.25rem,6vw,1.7rem)] font-extrabold leading-[1.18] tracking-[-0.02em] text-white">
                      {group.title}
                    </h3>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-[var(--color-muted)]">{eventsError ?? "현재 모집 중인 Group Dive가 없어요. 아래에서 다음 지역을 제안해 주세요."}</p>
              {eventsError && <Button type="button" variant="outline" className="mt-4" onClick={() => void loadGroups()}>다시 시도</Button>}
            </div>
          )}
        </div>

        <section className="border-b border-[var(--color-hairline)] px-5 py-10" aria-labelledby="group-dive-process">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">How it opens</p>
          <h2 id="group-dive-process" className="mt-2 font-display text-2xl font-bold">신청이 모임이 되는 과정</h2>
          <ol className="mt-7 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            {[
              ["01", "취향 접수", "참여하고 싶은 음악·작품·주제와 지역, 가능한 일정을 알려주세요."],
              ["02", "지역별 수요 확인", "DYVE가 같은 지역의 비슷한 취향을 확인해 작은 인원으로 묶습니다."],
              ["03", "모임 제안", "가장 적합한 주제와 일정이 정해지면 실제 Group Dive를 제안하고 개설합니다."],
            ].map(([number, title, description]) => (
              <li key={number} className="grid grid-cols-[2.5rem_1fr] gap-3 py-5">
                <span className="font-display text-sm font-extrabold text-[var(--color-primary)]">{number}</span>
                <div>
                  <h3 className="text-base font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-b border-[var(--color-hairline)] px-5 py-10" aria-labelledby="group-dive-regions">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">Local circles</p>
          <h2 id="group-dive-regions" className="mt-2 font-display text-2xl font-bold">현재 모집 지역</h2>
          <p className="mt-3 break-keep text-sm leading-6 text-[var(--color-muted)]">
            서울은 4개 권역을 중심으로 신청을 받고 있습니다. 원하는 지역이 없으면 직접 입력할 수 있어요.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-hairline)]">
            {PRESET_REGIONS.map((region) => (
              <div key={region} className="bg-[var(--color-surface-soft)] px-4 py-5">
                <span className="text-sm font-bold">{region}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-l-2 border-[var(--color-primary)] pl-4 text-sm leading-6 text-[var(--color-body)]">
            <p><strong>광역시</strong>는 권역 단위, <strong>지방</strong>은 거점도시 단위로 제안할 수 있습니다.</p>
            <p className="mt-2 text-[var(--color-muted)]">
              운영 기준에 맞지 않는 직접 입력 지역은 관련 권역 또는 거점으로 조정될 수 있어요.
            </p>
          </div>
        </section>

        <section id="interest" className="scroll-mt-4 border-b border-[var(--color-hairline)] px-5 py-10" aria-labelledby="group-dive-interest">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">Your turn</p>
          <h2 id="group-dive-interest" className="mt-2 font-display text-2xl font-bold">내 지역에서 신청하기</h2>
          <p className="mt-3 break-keep text-sm leading-6 text-[var(--color-muted)]">
            단순한 대기가 아니라, 같은 취향과 지역의 수요를 모아 실제 모임으로 연결하는 신청입니다.
          </p>

          {isComplete ? (
            <div
              className="mt-7 rounded-[var(--radius-card-lg)] border border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-5"
              role="status"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">Application received</p>
              <h3 className="mt-2 text-lg font-bold">지역 수요 신청이 접수됐어요.</h3>
              <dl className="mt-5 space-y-3 border-y border-[var(--color-primary)]/20 py-4 text-sm">
                <div><dt className="text-[var(--color-muted)]">취향</dt><dd className="mt-1 font-semibold">{interest.trim()}</dd></div>
                <div><dt className="text-[var(--color-muted)]">지역</dt><dd className="mt-1 font-semibold">{resolvedRegion}</dd></div>
                <div><dt className="text-[var(--color-muted)]">일정</dt><dd className="mt-1 font-semibold">{schedulePreferences.join(" · ")}</dd></div>
                <div><dt className="text-[var(--color-muted)]">참여 의향</dt><dd className="mt-1 font-semibold">{participationLabel(participationIntent)}</dd></div>
              </dl>
              <Button
                type="button"
                variant="outline"
                className="mt-5 w-full"
                onClick={() => document.getElementById("open-group-dives")?.scrollIntoView({ behavior: "smooth" })}
              >
                모집 중인 Group Dive 보기
              </Button>
            </div>
          ) : (
            <form className="mt-7 space-y-8" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="group-dive-interest-text" className="mb-2 block text-sm font-bold">
                  참여하고 싶은 프로그램 또는 취향
                </label>
                <Textarea
                  id="group-dive-interest-text"
                  value={interest}
                  onChange={(event) => setInterest(event.target.value)}
                  maxLength={500}
                  rows={5}
                  placeholder="예: 검정치마 〈201〉 LP를 처음부터 함께 듣고 이야기하고 싶어요."
                  className="min-h-32"
                />
                <span className="mt-1 block text-right text-xs text-[var(--color-muted)]">{interest.length} / 500</span>
              </div>

              <fieldset>
                <legend className="mb-3 text-sm font-bold">희망 지역</legend>
                <div className="flex flex-wrap gap-2">
                  {PRESET_REGIONS.map((region) => (
                    <ChoiceChip
                      key={region}
                      checked={regionChoice === region}
                      label={region}
                      name="group-dive-region"
                      type="radio"
                      value={region}
                      onChange={() => selectRegion(region)}
                    />
                  ))}
                  <ChoiceChip
                    checked={regionChoice === "custom"}
                    label="직접 입력"
                    name="group-dive-region"
                    type="radio"
                    value="custom"
                    onChange={() => selectRegion("custom")}
                  />
                </div>
                {regionChoice === "custom" && (
                  <div className="mt-3">
                    <label htmlFor="group-dive-custom-region" className="sr-only">직접 입력 지역</label>
                    <Input
                      id="group-dive-custom-region"
                      value={customRegion}
                      onChange={(event) => setCustomRegion(event.target.value)}
                      maxLength={40}
                      placeholder="권역 또는 거점도시를 입력해 주세요"
                    />
                  </div>
                )}
                <p className="mt-3 break-keep text-xs leading-5 text-[var(--color-muted)]">
                  원하는 지역이 목록에 없어도 괜찮아요. 새로운 지역 제안은 DYVE가 우선 검토하며, 운영 기준에 따라 관련 권역 또는 거점으로 조정할 수 있습니다.
                </p>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-sm font-bold">일정 선호</legend>
                <div className="flex flex-wrap gap-2">
                  {SCHEDULE_OPTIONS.map((schedule) => (
                    <ChoiceChip
                      key={schedule}
                      checked={schedulePreferences.includes(schedule)}
                      label={schedule}
                      name="group-dive-schedule"
                      type="checkbox"
                      value={schedule}
                      onChange={() => toggleSchedule(schedule)}
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-sm font-bold">다음 모임 참여 의향</legend>
                <div className="grid gap-2">
                  {PARTICIPATION_OPTIONS.map((option) => (
                    <ChoiceChip
                      key={option.value}
                      checked={participationIntent === option.value}
                      label={option.label}
                      name="group-dive-participation"
                      type="radio"
                      value={option.value}
                      onChange={() => setParticipationIntent(option.value)}
                    />
                  ))}
                </div>
              </fieldset>

              {submitError && (
                <p role="alert" className="rounded-[var(--radius-button-md)] border border-[var(--color-error)]/30 bg-[var(--color-primary-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-error)]">
                  {submitError}
                </p>
              )}

              <Button
                type="submit"
                size="cta"
                data-group-dive-submit
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "접수 중..."
                  : isMember
                    ? "지역 수요 신청하기"
                    : "로그인하고 신청하기"}
              </Button>
            </form>
          )}
        </section>

        <section className="px-5 py-10" aria-labelledby="group-dive-faq">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">FAQ</p>
          <h2 id="group-dive-faq" className="mt-2 font-display text-2xl font-bold">자주 묻는 질문</h2>
          <div className="mt-6 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            {[
              ["원하는 지역이 목록에 없어요.", "괜찮습니다. 직접 입력해 주세요. 처음 접수된 새로운 권역 또는 거점이라면 DYVE가 우선 검토 후 반영합니다."],
              ["아무 지역이나 직접 입력할 수 있나요?", "직접 입력은 가능하지만 서울은 4개 권역, 광역시는 권역 단위, 지방은 거점도시 단위로 정리됩니다. 필요하면 유사 권역으로 조정할 수 있습니다."],
              ["내 지역에 아직 모임이 없어도 신청할 수 있나요?", "네. 그 신청이 새로운 지역 오픈의 시작이 될 수 있습니다. DYVE가 같은 지역의 비슷한 취향을 찾아 연결합니다."],
            ].map(([question, answer]) => (
              <details key={question} className="group">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
                  <span>{question}</span>
                  <span aria-hidden="true" className="text-lg font-normal text-[var(--color-primary)] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="break-keep pb-5 pr-8 text-sm leading-6 text-[var(--color-muted)]">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
