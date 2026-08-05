import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../ui/badge";
import { LoadingIndicator } from "../../LoadingIndicator";
import { api } from "../../../services/api";
import { normalizeEvent, type Event } from "../../../api/events";
import { normalizeProject, type Project } from "../../../api/projects";
import { DyveImage } from "./DyveImage";
import { useAuth } from "../../../contexts/AuthContext";
import { DyveIcon } from "./DyveIcon";

const computeDaysLeft = (deadline: string | undefined | null): number | null => {
  if (!deadline) return null;
  const target = new Date(deadline);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
};

export function CrowdfundingHubScreen() {
  const navigate = useNavigate();
  const { isMember } = useAuth();
  const [activeTab, setActiveTab] = useState<"human" | "money">("human");

  // Audience crowdfunding (human funding events)
  const [humanEvents, setHumanEvents] = useState<Event[]>([]);
  const [humanLoading, setHumanLoading] = useState(true);
  const [humanError, setHumanError] = useState<string | null>(null);

  // Project crowdfunding
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const loadHumanEvents = useCallback(async () => {
    setHumanLoading(true);
    setHumanError(null);
    try {
      const response = await api.getHumanFundingEvents();
      const events = (response.data ?? [])
        .map((item: unknown) => normalizeEvent(item as Record<string, unknown>))
        .filter((e): e is Event => Boolean(e.id));
      setHumanEvents(events);
    } catch (error) {
      console.error("Failed to load human funding events", error);
      setHumanError("함께 여는 공연을 불러오지 못했어요.");
    } finally {
      setHumanLoading(false);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setProjectLoading(true);
    setProjectError(null);
    try {
      const response = await api.listProjects();
      const items = (response.data ?? []).map((item: unknown) => normalizeProject(item));
      setProjects(items);
    } catch (error) {
      console.error("Failed to load projects", error);
      setProjectError("후원 목록을 불러오지 못했어요.");
    } finally {
      setProjectLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHumanEvents();
  }, [loadHumanEvents]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-20 text-[var(--color-muted)]">
      <LoadingIndicator className="text-sm text-[var(--color-muted)]" />
    </div>
  );

  const renderError = (message: string, onRetry: () => void) => (
    <div className="flex flex-col items-center justify-center py-20 text-[var(--color-muted)]">
      <DyveIcon name="alert-circle" size="lg" className="mb-3 h-8 w-8 text-[var(--color-primary)]" />
      <p className="mb-4 text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-full bg-[var(--color-surface-soft)] px-5 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
      >
        다시 시도
      </button>
    </div>
  );

  const renderEmpty = (message: string) => (
    <div className="flex flex-col items-center justify-center py-20 text-[var(--color-muted)]">
      <p className="text-sm">{message}</p>
    </div>
  );

  const renderHumanFundingCard = (event: Event) => {
    const fc = event.fundingConfig;
    const progress =
      fc && fc.minAttendees > 0
        ? Math.min(100, Math.round((fc.currentReservations / fc.minAttendees) * 100))
        : 0;
    const daysLeft = computeDaysLeft(fc?.deadline ?? event.startAt);
    const isConfirmed = Boolean(fc?.isConfirmed);

    return (
      <button
        type="button"
        key={event.id}
        className="group relative w-full overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] text-left transition-colors hover:border-[var(--color-primary)]/40"
        onClick={() => navigate(`/performance/${event.id}`)}
      >
        <div className="flex gap-4 p-4">
          <div className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-1.5">
            <DyveImage
              src={event.image}
              alt={event.title}
              className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-2">
              {isConfirmed ? (
                <Badge className="bg-[var(--color-primary)] text-[var(--color-on-primary)]">개최 확정!</Badge>
              ) : daysLeft !== null ? (
                <Badge className="border border-[var(--color-hairline)] bg-hairline text-[var(--color-ink)] backdrop-blur-md">D-{daysLeft}</Badge>
              ) : null}
            </div>

            <h3 className="line-clamp-2 text-base font-bold leading-snug text-[var(--color-ink)]">{event.title}</h3>
            <div className="mt-2 space-y-1.5 text-xs text-[var(--color-muted)]">
              {event.venue && <p className="line-clamp-1">{event.venue}</p>}
              {event.dateDisplay && (
                <p className="flex items-center gap-1.5">
                  <DyveIcon name="calendar-days" size="sm" tone="primary" className="h-3.5 w-3.5" />
                  <span className="line-clamp-1">{event.dateDisplay}</span>
                </p>
              )}
            </div>

            {fc && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className={`font-semibold ${isConfirmed ? "text-[var(--color-success)]" : "text-[var(--color-primary)]"}`}>
                    {progress}% 달성
                  </span>
                  <span className="shrink-0 text-[var(--color-muted)]">
                    {fc.currentReservations} / {fc.minAttendees}명
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-hairline">
                  <div
                    className={`h-full rounded-full ${isConfirmed ? "bg-[var(--color-success)]" : "bg-[var(--color-primary)]"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  const renderProjectFundingCard = (project: Project) => {
    const progress =
      project.targetAmount > 0
        ? Math.min(100, Math.round((project.currentAmount / project.targetAmount) * 100))
        : 0;
    const daysLeft = computeDaysLeft(project.deadline);

    return (
      <button
        type="button"
        key={project.id}
        className="group relative w-full overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] text-left transition-colors hover:border-[var(--color-primary)]/40"
        onClick={() => navigate(`/project/${project.id}`)}
      >
        <div className="flex gap-4 p-4">
          <div className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-1.5">
            <DyveImage
              src={project.image}
              alt={project.title}
              className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-2">
              {daysLeft !== null && (
                <Badge className="border border-[var(--color-hairline)] bg-hairline text-[var(--color-ink)] backdrop-blur-md">D-{daysLeft}</Badge>
              )}
              {project.status === "CONFIRMED" && (
                <Badge className="bg-[var(--color-success)] text-[var(--color-ink)]">달성!</Badge>
              )}
            </div>

            {project.hostName && (
              <p className="mb-1 flex items-center gap-1 text-xs text-[var(--color-muted-soft)]">
                <DyveIcon name="user" size="sm" tone="primary" className="h-3.5 w-3.5" />
                <span className="line-clamp-1">{project.hostName}</span>
              </p>
            )}
            <h3 className="line-clamp-2 text-base font-bold leading-snug text-[var(--color-ink)]">{project.title}</h3>
            {project.description && (
              <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">{project.description}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
              <span className="flex items-center gap-1">
                <DyveIcon name="target" size="sm" tone="primary" className="h-3.5 w-3.5" />
                목표 {project.targetAmount.toLocaleString()}원
              </span>
              <span>최소 후원 {project.minPledgeAmount.toLocaleString()}원</span>
              {typeof project.pledgeCount === "number" && <span>{project.pledgeCount}명 참여</span>}
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-[var(--color-ink)]">{progress}% 달성</span>
                <span className="shrink-0 text-[var(--color-muted-soft)]">{project.currentAmount.toLocaleString()}원 모금</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-hairline">
                <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-full animate-in fade-in duration-300">
      <div className="app-top-bar sticky top-0 z-40 border-b px-6 py-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <DyveIcon name="flame" size="lg" tone="primary" />
          공연 응원
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">작은 공연이 실제로 열리게 만드는 힘</p>
      </div>

      <div className="mx-auto w-full max-w-[820px] px-4 py-4">
        <div className="mb-5 border-b border-[var(--color-hairline)] px-1 pb-5">
          <p className="break-keep text-base font-bold leading-6 text-ink">
            함께 여는 공연과 창작 후원을 한곳에서 확인해요.
          </p>
          <p className="mt-1 break-keep text-sm leading-6 text-[var(--color-muted)]">
            공연을 여는 응원과 창작을 돕는 후원을 나눠 볼 수 있어요.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isMember) { navigate("/my"); return; }
              navigate("/register/performance");
            }}
            className="min-h-11 rounded-[var(--radius-button-lg)] bg-[var(--color-primary)] px-4 text-sm font-bold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-active)]"
          >
            함께 여는 공연 등록
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isMember) { navigate("/my"); return; }
              navigate("/register/project");
            }}
            className="min-h-11 rounded-[var(--radius-button-lg)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 text-sm font-bold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)]/40"
          >
            창작 후원 등록
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 rounded-[1.25rem] bg-[var(--color-surface-soft)] p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab("human")}
              aria-label="함께 여는 공연 보기"
              className={`rounded-lg py-2.5 text-sm font-semibold transition-all ${
                activeTab === "human"
                  ? "bg-[var(--color-canvas)] text-[var(--color-primary)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-muted-soft)]"
              }`}
            >
              공연 응원
            </button>
            <button
              onClick={() => setActiveTab("money")}
              aria-label="창작 후원 보기"
              className={`rounded-lg py-2.5 text-sm font-semibold transition-all ${
                activeTab === "money"
                  ? "bg-[var(--color-canvas)] text-[var(--color-ink)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-muted-soft)]"
              }`}
            >
              창작 후원
            </button>
          </div>
        </div>

        {/* Human Crowdfunding Tab */}
        {activeTab === "human" && (
          <div className="animate-in slide-in-from-left-2 duration-300">
            <div className="mb-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--color-ink)]">
                <DyveIcon name="ticket" size="md" tone="primary" className="h-5 w-5" />
                현재 모집 중인 공연
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">목표 관객 수가 모이면 실제 공연으로 이어져요.</p>
            </div>
            {humanLoading ? (
              renderLoading()
            ) : humanError ? (
              renderError(humanError, loadHumanEvents)
            ) : humanEvents.length === 0 ? (
              renderEmpty("현재 모집 중인 공연이 없어요.")
            ) : (
              <div className="grid gap-4">
                {humanEvents.map(renderHumanFundingCard)}
              </div>
            )}
          </div>
        )}

        {/* Money Crowdfunding Tab */}
        {activeTab === "money" && (
          <div className="animate-in slide-in-from-right-2 duration-300">
            <div className="mb-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--color-ink)]">
                <DyveIcon name="sparkles" size="md" tone="primary" className="h-5 w-5" />
                씬 서포트
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">공연 외에도 창작, 제작, 기록을 후원할 수 있어요.</p>
            </div>
            {projectLoading ? (
              renderLoading()
            ) : projectError ? (
              renderError(projectError, loadProjects)
            ) : projects.length === 0 ? (
              renderEmpty("현재 진행 중인 후원이 없어요.")
            ) : (
              <div className="grid gap-4">
                {projects.map(renderProjectFundingCard)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
