import { Input } from "../ui/input";
import { useState, useEffect } from "react";
import { DyveImage } from "./DyveImage";
import { DyveEmptyState } from "./DyveEmptyState";
import { formatApiError } from "../../../services/api";
import { DyveIcon, DyveIconButton } from "./DyveIcon";

const SUGGESTED_QUERIES = ["홍대", "재즈", "인디", "성수", "DJ", "전시"];

const getResultTypeLabel = (type: string) => {
  if (type === "performance") return "공연";
  if (type === "artist") return "아티스트";
  if (type === "venue") return "베뉴";
  return "결과";
};

interface SearchScreenProps {
  onClose: () => void;
  onResultClick: (result: any) => void;
  onSearch?: (query: string, signal?: AbortSignal) => Promise<any[]>;
}

export function SearchScreen({ onClose, onResultClick, onSearch }: SearchScreenProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      setErrorMessage(null);
      return;
    }

    const controller = new AbortController();
    const runSearch = async () => {
      setIsSearching(true);
      setErrorMessage(null);
      try {
        if (!onSearch) {
          setResults([]);
          return;
        }

        const remoteResults = await onSearch(query, controller.signal);
        setResults(remoteResults);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Search failed", error);
          setResults([]);
          setErrorMessage(formatApiError(error, "검색 중 오류가 발생했습니다."));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    };

    void runSearch();
    return () => controller.abort();
  }, [query, onSearch, retryCount]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-canvas text-ink animate-in fade-in duration-200">
      {/* Header with Search Input */}
      <div data-app-top-bar className="flex items-center gap-2 border-b border-[var(--color-hairline)] bg-canvas p-4 pt-4">
        <DyveIconButton
          name="arrow-left"
          label="뒤로가기"
          onClick={onClose}
          className="rounded-full"
          iconTone="default"
        />
        <div className="relative flex-1">
          <DyveIcon name="search" size="sm" tone="muted" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="공연, 아티스트, 베뉴 검색"
            className="h-10 w-full rounded-full border-hairline bg-surface-soft pl-9 pr-4 text-ink placeholder:text-[var(--color-muted)] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40"
          />
        </div>
      </div>

      {/* Results or Empty State */}
      <main className="flex-1 overflow-y-auto p-4">
        {query.trim() === "" ? (
          <div className="mx-auto mt-4 max-w-full px-1">
            <h1 className="text-base font-bold text-ink">공연, 아티스트, 베뉴 검색</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--color-body)]">키워드 하나로 모든 것을 한 번에 찾아보세요.</p>
            <div className="mt-6 border-t border-hairline pt-5">
              <p className="text-sm font-semibold text-[var(--color-muted)]">추천 검색어</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTED_QUERIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuery(item)}
                    className="h-9 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : isSearching ? (
          <div className="mt-4 divide-y divide-hairline" aria-label="검색 결과를 불러오는 중">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3 py-4">
                <div className="h-11 w-11 rounded-xl bg-hairline animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-hairline animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-hairline animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <div className="mt-10 space-y-3 text-center text-[var(--color-muted)]">
            <p>{errorMessage}</p>
            <button
              onClick={() => setRetryCount((prev) => prev + 1)}
              className="ty-caption h-11 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
            >
              다시 시도
            </button>
          </div>
        ) : results.length > 0 ? (
          <div className="mt-2 divide-y divide-hairline border-y border-hairline">
            <p className="px-1 py-3 text-xs font-semibold text-[var(--color-muted)]">
              검색 결과 {results.length}개
            </p>
            {results.map((result) => (
              <button
                type="button"
                key={`${result.type}-${result.id}`}
                onClick={() => onResultClick(result)}
                className="group flex min-h-[72px] w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-[var(--color-surface-muted)]"
              >
                {/* Icon/Image Box */}
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
                  {result.image ? (
                    <DyveImage src={result.image} alt={result.name || result.title} className="h-full w-full object-cover" />
                  ) : (
                    <>
                      {result.type === 'venue' && <DyveIcon name="map-pin" size="md" tone="muted" className="h-5 w-5" />}
                      {result.type === 'artist' && <DyveIcon name="mic-2" size="md" tone="muted" className="h-5 w-5" />}
                      {result.type === 'performance' && <DyveIcon name="calendar" size="md" tone="muted" className="h-5 w-5" />}
                    </>
                  )}
                </div>

                {/* Text Info */}
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="inline-flex h-5 items-center rounded-[var(--radius-pill)] border border-[var(--color-primary)]/15 bg-[var(--color-primary)]/5 px-2 text-[11px] font-semibold text-[var(--color-primary)]">
                      {getResultTypeLabel(result.type)}
                    </span>
                  </div>
                  <h4 className="truncate text-sm font-bold text-ink">{result.name || result.title}</h4>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {result.type === 'performance' && `${result.date} • ${result.venue}`}
                    {result.type === 'venue' && result.address}
                    {result.type === 'artist' && "아티스트"}
                  </p>
                </div>

                <DyveIcon name="chevron-right" size="sm" tone="muted" className="h-4 w-4 flex-shrink-0 transition-colors group-hover:text-[var(--color-ink)]" />
              </button>
            ))}
          </div>
        ) : (
          <div className="py-10">
            <DyveEmptyState
              icon={<DyveIcon name="search" size="lg" tone="muted" className="h-10 w-10" strokeWidth={1.5} />}
              title="검색 결과가 없어요."
              description="다른 키워드로 다시 찾아보세요."
              action={
                <button
                  onClick={() => setQuery("")}
                  className="ty-caption h-11 px-5 font-bold text-[var(--color-primary)] underline-offset-4 hover:underline"
                >
                  검색어 지우고 다시 찾기
                </button>
              }
            />
          </div>
        )}
      </main>
    </div>
  );
}
