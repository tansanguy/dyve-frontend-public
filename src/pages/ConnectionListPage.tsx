import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { normalizeEventList, type Event } from "../api/events";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { ConnectionCard } from "../components/figma/dyve/ConnectionCard";
import { DyveImage } from "../components/figma/dyve/DyveImage";
import { Header } from "../components/figma/dyve/Header";
import { HorizontalRail } from "../components/figma/dyve/HorizontalRail";
import { PageState } from "../components/figma/dyve/PageState";
import { Button } from "../components/figma/ui/button";
import { api, formatApiError, type ConnectionDto, type GroupDiveDto } from "../services/api";

type DiveKind = "group" | "buddy";

export function ConnectionListPage() {
  const navigate = useNavigate();
  const [activeDive, setActiveDive] = useState<DiveKind>("group");
  const [connections, setConnections] = useState<ConnectionDto[]>([]);
  const [linkedEvents, setLinkedEvents] = useState<Record<string, Event>>({});
  const [groups, setGroups] = useState<GroupDiveDto[]>([]);
  const [isConnectionsLoading, setIsConnectionsLoading] = useState(true);
  const [isGroupsLoading, setIsGroupsLoading] = useState(true);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      setIsConnectionsLoading(true);
      setConnectionsError(null);
      const response = await api.listConnections({ limit: 50 });
      setConnections(response.data);
      const eventIds = [...new Set(
        response.data
          .filter((item) => item.sourceType === "dyve_event" && item.eventId)
          .map((item) => item.eventId as string),
      )];
      // ponytail: Connection 응답에 행사 표시 정보가 없어 상세를 조회한다. 백엔드가 포함하면 제거한다.
      const entries = await Promise.all(
        eventIds.map(async (eventId) => {
          try {
            const response = await api.getEvent(eventId);
            return [eventId, normalizeEventList([response.data])[0]] as const;
          } catch {
            return [eventId, undefined] as const;
          }
        }),
      );
      setLinkedEvents(Object.fromEntries(entries.filter((entry) => entry[1])) as Record<string, Event>);
    } catch (error) {
      setConnectionsError(formatApiError(error, "동행 모집을 불러오지 못했어요."));
      setConnections([]);
    } finally {
      setIsConnectionsLoading(false);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      setIsGroupsLoading(true);
      setGroupsError(null);
      setGroups((await api.listGroupDives()).data);
    } catch (error) {
      setGroupsError(formatApiError(error, "Group Dive 모집을 불러오지 못했어요."));
      setGroups([]);
    } finally {
      setIsGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnections();
    void loadGroups();
  }, [loadConnections, loadGroups]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-canvas font-sans text-ink">
      <Header
        onSearchClick={() => navigate("/search")}
        onNotificationClick={() => navigate("/notifications")}
        onChatClick={() => navigate("/chats")}
      />

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <div className="mb-5">
          <h1 className="text-lg font-bold">연결</h1>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">취향 모임과 공연 동행 중 지금 필요한 연결을 골라보세요.</p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-1" role="tablist" aria-label="연결 유형">
          {([
            ["group", "Group Dive", "취향 기반 만남"],
            ["buddy", "Buddy Dive", "공연, 페스티벌 동행"],
          ] as const).map(([value, title, description]) => {
            const selected = activeDive === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                id={`${value}-dive-tab`}
                aria-controls={`${value}-dive-panel`}
                aria-selected={selected}
                onClick={() => setActiveDive(value)}
                className={`min-h-16 rounded-[calc(var(--radius-card-lg)-4px)] px-3 py-2 text-left transition-colors ${
                  selected
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm"
                    : "text-[var(--color-body)]"
                }`}
              >
                <span className="block text-sm font-extrabold">{title}</span>
                <span className={`mt-0.5 block text-[11px] ${selected ? "opacity-80" : "text-[var(--color-muted)]"}`}>({description})</span>
              </button>
            );
          })}
        </div>

        <section
          id={`${activeDive}-dive-panel`}
          className="pt-7"
          role="tabpanel"
          aria-labelledby={`${activeDive}-dive-tab`}
        >
          {activeDive === "group" ? (
            <>
              <h2 className="break-keep text-[clamp(1.25rem,5.5vw,1.375rem)] font-bold leading-[1.35]">
                <span className="block" data-copy-line>내 취향, 내 동네에서</span>
                <span className="block" data-copy-line>작은 Group Dive를 시작해요.</span>
              </h2>
              <p className="mt-3 max-w-[24rem] break-keep text-[clamp(0.7rem,3.2vw,0.875rem)] leading-5 text-[var(--color-body)]">
                <span className="block" data-copy-line>원하는 지역과 날짜를 직접 신청할 수 있어요.</span>
              </p>
              <p data-progress-notice className="mt-3 text-[11px] leading-5 text-[var(--color-muted)]">
                <span className="block" data-copy-line>회차가 확정될 때까지,</span>
                <span className="block" data-copy-line>7일마다 진행 상황을 안내합니다.</span>
              </p>
            </>
          ) : (
            <>
              <h2 className="break-keep text-[22px] font-bold leading-[1.35]">
                <span className="block" data-copy-line>운영팀이 직접 찾는</span>
                <span className="block" data-copy-line>공연·페스티벌 동행</span>
              </h2>
              <p className="mt-3 max-w-[24rem] break-keep text-sm leading-6 text-[var(--color-body)]">
                <span className="block" data-copy-line>신청서를 한 명씩 읽고,</span>
                <span className="block" data-copy-line>보고 싶은 아티스트와 관람 스타일,</span>
                <span className="block" data-copy-line>원하는 동행 방식을 함께 살펴,</span>
                <span className="block" data-copy-line>잘 맞는 두 사람을 연결합니다.</span>
              </p>
            </>
          )}

          <div className="mt-5 flex gap-2">
            <Button asChild className="flex-1">
              <Link to={activeDive === "group" ? "/connection/group-dive#interest" : "/connection/new"}>
                {activeDive === "group" ? "지역·일정 직접 신청" : "오픈 요청"}
              </Link>
            </Button>
            <Button asChild className="flex-1" variant="outline-soft">
              <Link to={activeDive === "group" ? "/my#group-dive" : "/my/connection-applications"}>내 신청</Link>
            </Button>
          </div>

          <div className="mt-8">
            <h3 className="text-base font-bold">현재 모집 중</h3>
            {activeDive === "group" ? (
              isGroupsLoading ? (
                <div className="flex items-center justify-center py-16"><LoadingIndicator /></div>
              ) : groupsError ? (
                <PageState className="min-h-[220px] px-0" title="모집을 불러오지 못했어요" description={groupsError} primaryAction={{ label: "다시 시도", onClick: loadGroups }} />
              ) : groups.length === 0 ? (
                <PageState className="min-h-[220px] px-0" title="현재 열린 Group Dive가 없어요." description="지역과 일정을 직접 신청하면 새 모집이 열릴 때 안내해 드려요." />
              ) : (
                <HorizontalRail ariaLabel="Group Dive 목록" className="mt-3" indicator="pages">
                  {groups.map((group) => (
                    <div key={group.id} className="w-full shrink-0 snap-start snap-always">
                      <button
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
                        <h4 className="absolute inset-x-0 bottom-0 line-clamp-2 p-5 font-display text-[clamp(1.25rem,6vw,1.7rem)] font-extrabold leading-[1.18] tracking-[-0.02em] text-white">
                          {group.title}
                        </h4>
                      </button>
                    </div>
                  ))}
                </HorizontalRail>
              )
            ) : isConnectionsLoading ? (
              <div className="flex items-center justify-center py-16"><LoadingIndicator /></div>
            ) : connectionsError ? (
              <PageState className="min-h-[220px] px-0" title="동행 모집을 불러오지 못했어요" description={connectionsError} primaryAction={{ label: "다시 시도", onClick: loadConnections }} />
            ) : connections.length === 0 ? (
              <PageState className="min-h-[220px] px-0" title="현재 모집 중인 Buddy Dive가 없어요." description="원하는 공연을 알려주면 운영팀이 새로운 동행 모집을 검토합니다." />
            ) : (
              <HorizontalRail ariaLabel="Buddy Dive 목록" className="mt-3" indicator="pages">
                {connections.map((connection) => (
                  <div key={connection.id} className="w-full shrink-0 snap-start snap-always">
                    <ConnectionCard
                      connection={connection}
                      event={connection.eventId ? linkedEvents[connection.eventId] : null}
                      onClick={() => navigate(`/connection/${connection.id}`)}
                      displayVariant="dive"
                    />
                  </div>
                ))}
              </HorizontalRail>
            )}
          </div>

          {activeDive === "buddy" && (
            <Link to="/chat-invitations" className="mt-7 flex min-h-16 items-center justify-between border-y border-[var(--color-hairline)] py-3 text-sm font-bold">
              채팅 초대 <span aria-hidden="true">→</span>
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
