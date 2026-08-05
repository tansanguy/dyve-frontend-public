import { useEffect, useState, useRef } from "react";
import { api, type AddressSearchResult } from "../../../services/api";
import { useDebounce } from "../../../hooks/useDebounce";
import { LoadingIndicator } from "../../LoadingIndicator";
import { DyveEmptyState } from "./DyveEmptyState";
import { DyveIcon, DyveIconButton } from "./DyveIcon";

interface AddressSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (roadAddr: string) => void;
}

export function AddressSearchSheet({ isOpen, onClose, onSelect }: AddressSearchSheetProps) {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);

  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to track if we should animate in
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setKeyword("");
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmed = debouncedKeyword.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }
    if (trimmed.length < 2) {
      setResults([]);
      setError("검색어는 두 글자 이상 입력해 주세요.");
      return;
    }

    const abortController = new AbortController();

    const fetchAddresses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response: any = await api.searchAddress({ keyword: trimmed, page: 1, count: 20 }, abortController.signal);

        let items: AddressSearchResult[] = [];
        if (Array.isArray(response)) {
          items = response;
        } else if (response?.results && Array.isArray(response.results)) {
          items = response.results;
        } else if (response?.data?.results && Array.isArray(response.data.results)) {
          items = response.data.results;
        } else if (response?.juso && Array.isArray(response.juso)) {
          // Fallback if backend returned raw juso.go.kr format
          items = response.juso;
        }

        setResults(items);
        if (items.length === 0) {
          setError("검색 결과가 없습니다. 도로명이나 지번을 정확히 입력했는지 확인해 주세요.");
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Failed to search address", err);
        setError(err.message || "주소를 검색하는 중 오류가 발생했습니다.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAddresses();

    return () => {
      abortController.abort();
    };
  }, [debouncedKeyword]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* 닫기용 투명 배경 영역 */}
      <button type="button" aria-label="주소 검색 닫기" className="flex-1" onClick={onClose} />

      {/* 바텀 시트 컨텐츠 */}
      <div
        ref={sheetRef}
        className="flex h-[80vh] w-full flex-col rounded-t-[32px] bg-[var(--color-surface-soft)] shadow-2xl animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--color-ink)]">도로명주소 검색</h2>
          <DyveIconButton
            name="x"
            label="닫기"
            onClick={onClose}
            className="rounded-full bg-[var(--color-surface-muted)]"
            iconTone="muted"
          />
        </div>

        <div className="p-6 pb-2">
          <div className="relative">
            <DyveIcon name="search" size="md" tone="muted" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="도로명, 지번, 건물명 등 입력"
              className="h-14 w-full rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] pl-12 pr-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingIndicator className="text-sm text-[var(--color-muted)]" />
            </div>
          )}

          {!isLoading && error && (
            <div className="py-12">
              <DyveEmptyState
                icon={<DyveIcon name="map-pin" size="lg" className="h-10 w-10 text-[var(--color-error)]/50" />}
                title={error.includes("결과가 없") ? "검색 결과가 없어요 🗺️" : "앗, 오류가 발생했어요"}
                description={error.includes("결과가 없") ? "도로명이나 지번을 다시 한 번 확인해 주시겠어요?" : error}
                className="p-0"
              />
            </div>
          )}

          {!isLoading && !error && results.length === 0 && keyword.trim().length > 1 && (
            <div className="py-12">
              <DyveEmptyState
                icon={<DyveIcon name="map-pin" size="lg" tone="muted" className="h-10 w-10" />}
                title="해당하는 주소가 없어요 🗺️"
                description="도로명이나 지번을 정확히 입력했는지 확인해 주세요."
                className="p-0"
              />
            </div>
          )}

          {!isLoading && !error && results.length > 0 && (
            <ul className="space-y-3 pt-2">
              {results.map((item, idx) => (
                <li key={`${item.roadAddr}-${idx}`}>
                  <button
                    onClick={() => {
                      onSelect(item.roadAddr);
                      onClose();
                    }}
                    className="flex w-full flex-col items-start gap-1 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4 text-left transition-all hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 active:scale-[0.98]"
                  >
                    <div className="flex w-full items-start gap-3">
                      <div className="mt-0.5 rounded pl-1">
                        <span className="rounded bg-[var(--color-primary)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--color-on-primary)]">도로명</span>
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-sm font-medium text-[var(--color-ink)] break-words">{item.roadAddr}</p>
                        <div className="flex items-start gap-2 text-[11px] text-[var(--color-muted)]">
                          <span className="shrink-0 rounded border border-[var(--color-border-ink)] px-1">지번</span>
                          <span className="break-words">{item.jibunAddr}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[11px] font-medium text-[var(--color-muted)]">[{item.zipNo}]</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
