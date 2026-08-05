import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { Input } from "../components/figma/ui/input";
import { api, formatApiError, type ProfileBadgeDto } from "../services/api";
import { mapProfileToUi } from "../utils/apiMappers";

type ProfileSearchResult = { id: string; name: string; type: "artist" | "venue" };

export function AdminConnectionHostsPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [officialProfiles, setOfficialProfiles] = useState<ProfileBadgeDto[]>([]);

  const loadOfficialProfiles = async (signal?: AbortSignal) => {
    const response = await api.adminListConnectionOrganizerProfiles(signal);
    setOfficialProfiles(response.data);
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadOfficialProfiles(controller.signal).catch((error) => {
      if (!controller.signal.aborted) toast.error(formatApiError(error, "공식 운영 프로필을 불러오지 못했습니다."));
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        setIsSearching(true);
        const response = await api.listProfiles({ q: query, limit: 10 }, controller.signal, true);
        if (controller.signal.aborted) return;
        setSearchResults(
          response.data
            .map((profile) => {
              const record = profile as Record<string, unknown>;
              if (record.type !== "artist" && record.type !== "venue") return null;
              const mapped = mapProfileToUi(profile);
              return {
                id: mapped.id,
                name: mapped.name ?? mapped.activityName ?? "이름 없음",
                type: record.type,
              };
            })
            .filter((profile): profile is ProfileSearchResult => profile !== null),
        );
      } catch (error) {
        if (!controller.signal.aborted) toast.error(formatApiError(error, "프로필을 검색하지 못했습니다."));
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    })();
    return () => controller.abort();
  }, [query]);

  const handleGrantDyveOfficial = async (profile: ProfileSearchResult) => {
    if (processingId) return;
    try {
      setProcessingId(profile.id);
      await api.adminGrantDyveOfficialBadge(profile.id);
      await loadOfficialProfiles();
      toast.success(`${profile.name}을 Buddy Dive 공식 운영 프로필로 지정했습니다.`);
    } catch (error) {
      toast.error(formatApiError(error, "공식 운영 프로필 지정에 실패했습니다."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevokeDyveOfficial = async (profile: ProfileBadgeDto) => {
    if (processingId) return;
    try {
      setProcessingId(profile.profileId);
      await api.adminRevokeDyveOfficialBadge(profile.profileId);
      await loadOfficialProfiles();
      toast.success(`${profile.name ?? "프로필"}의 공식 운영 지정을 해제했습니다.`);
    } catch (error) {
      toast.error(formatApiError(error, "공식 운영 프로필 해제에 실패했습니다."));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-hairline)] px-4 py-4">
        <DyveIcon name="shield" size="sm" className="h-4 w-4 text-[var(--color-accent-pink)]" />
        <h1 className="flex-1 ty-body-lg font-bold">Buddy Dive 운영 프로필</h1>
      </div>

      <main className="px-4 py-4">
        <p className="max-w-2xl whitespace-pre-line text-sm leading-6 text-[var(--color-muted)]">
          {"공연별 Buddy Dive의 공식 운영 주체로 사용할 아티스트 또는 베뉴 프로필을 지정하세요.\n지정된 프로필은 관리자 등록 화면에서 선택할 수 있습니다."}
        </p>
        <section className="mt-5">
          <h2 className="text-sm font-bold">현재 공식 운영 프로필</h2>
          <div className="mt-2 space-y-2">
            {officialProfiles.length === 0 ? (
              <p className="rounded-[var(--radius-card-md)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-[var(--color-muted)]">
                지정된 운영 프로필이 없습니다.
              </p>
            ) : officialProfiles.map((profile) => (
              <div key={profile.profileId} className="flex items-center justify-between gap-3 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3">
                <span className="text-sm font-semibold">{profile.name ?? "이름 없음"}</span>
                <button
                  type="button"
                  disabled={Boolean(processingId)}
                  onClick={() => void handleRevokeDyveOfficial(profile)}
                  className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] px-3 py-2 text-xs font-bold disabled:opacity-50"
                >
                  지정 해제
                </button>
              </div>
            ))}
          </div>
        </section>
        <h2 className="mt-7 text-sm font-bold">운영 프로필 추가</h2>
        <Input
          className="mt-4"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="운영 프로필 이름으로 검색"
        />
        {isSearching && <p className="mt-2 text-xs text-[var(--color-muted)]">검색 중...</p>}
        <div className="mt-3 space-y-2">
          {searchResults.map((profile) => (
            <div
              key={profile.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3"
            >
              <span className="text-sm font-semibold">
                {profile.name} <span className="text-xs text-[var(--color-muted)]">({profile.type})</span>
              </span>
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => void handleGrantDyveOfficial(profile)}
                className="rounded-[var(--radius-card-md)] bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-[var(--color-on-primary)] disabled:opacity-50"
              >
                공식 운영 프로필로 지정
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
