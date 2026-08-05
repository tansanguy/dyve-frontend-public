import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "../services/api";
import { DyveImage } from "../components/figma/dyve/DyveImage";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";

type BlockTab = "events" | "profiles";

type BlockItem = {
    id: string;
    title?: string;
    name?: string;
    type?: string;
    image?: string;
    imageUrl?: string;
    isBlocked?: boolean;
    isActive?: boolean;
    status?: string;
};

const BLOCK_REASONS = [
    "스팸 / 허위 정보",
    "부적절한 콘텐츠",
    "비매너 행위",
    "저작권 침해",
    "기타",
];

export function AdminBlockPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<BlockTab>("events");
    const [searchQ, setSearchQ] = useState("");
    const [items, setItems] = useState<BlockItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    // Block modal state
    const [blockTarget, setBlockTarget] = useState<BlockItem | null>(null);
    const [blockReason, setBlockReason] = useState(BLOCK_REASONS[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!searchQ.trim()) return;
        setIsLoading(true);
        setError(null);
        setSearched(true);
        try {
            if (tab === "events") {
                const res = await api.adminListEvents({ q: searchQ, limit: 30 });
                setItems(res.data as BlockItem[]);
            } else {
                const res = await api.adminListUsers({ q: searchQ, limit: 30 });
                setItems(res.data.map((user) => ({
                    id: user.ownerId,
                    name: user.displayName ?? undefined,
                    type: user.activeProfileType ?? undefined,
                    isBlocked: user.status === "blocked",
                    status: user.status,
                })));
            }
        } catch (err: unknown) {
            setError(formatApiError(err, "검색 결과를 불러오지 못했습니다."));
        } finally {
            setIsLoading(false);
        }
    };

    const isBlocked = (item: BlockItem) =>
        item.isBlocked === true || item.isActive === false || item.status?.toLowerCase() === "blocked";

    const handleBlockConfirm = async () => {
        if (!blockTarget || isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (tab === "events") {
                await api.adminBlockEvent(blockTarget.id, { reason: blockReason });
            } else {
                await api.adminBlockUser(blockTarget.id, { reason: blockReason });
            }
            setItems((prev) => prev.map((i) => i.id === blockTarget.id ? { ...i, isBlocked: true, status: "blocked" } : i));
            setBlockTarget(null);
        } catch (err: unknown) {
            alert(formatApiError(err, "차단 처리 실패"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnblock = async (item: BlockItem) => {
        if (processingId) return;
        if (!window.confirm(`'${item.title ?? item.name}'의 차단을 해제할까요?`)) return;
        setProcessingId(item.id);
        try {
            if (tab === "events") {
                await api.adminUnblockEvent(item.id);
            } else {
                await api.adminUnblockUser(item.id);
            }
            setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isBlocked: false, status: "active" } : i));
        } catch (err: unknown) {
            alert(formatApiError(err, "차단 해제 실패"));
        } finally {
            setProcessingId(null);
        }
    };

    const displayLabel = (item: BlockItem) => item.title ?? item.name ?? "이름 없음";
    const displayImage = (item: BlockItem) => item.imageUrl ?? item.image;

    return (
        <div className="flex min-h-screen w-full flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--color-hairline)]">
                <button type="button" onClick={() => navigate(-1)} aria-label="이전 화면" className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-button-md)] hover:bg-[var(--color-surface-muted)]">
                    <DyveIcon name="chevron-left" size="md" tone="default" className="h-5 w-5" />
                </button>
                <DyveIcon name="eye-off" size="sm" className="h-4 w-4 text-[var(--color-primary)]" />
                <h1 className="ty-body-lg font-bold flex-1">Block / 숨기기</h1>
                <span className="ty-micro font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2 py-0.5 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/20">
                    ADMIN
                </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-4 pt-4">
                {(["events", "profiles"] as BlockTab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => { setTab(t); setItems([]); setSearched(false); setError(null); }}
                        className={`flex-1 py-2 rounded-[var(--radius-button-md)] font-bold ty-body-sm transition-colors ${
                            tab === t ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "bg-[var(--color-surface-soft)] text-[var(--color-muted)] border border-[var(--color-hairline)]"
                        }`}
                    >
                        {t === "events" ? "공연" : "이용자 전체"}
                    </button>
                ))}
            </div>

            <p className="whitespace-pre-line px-4 pt-3 ty-caption leading-5 text-[var(--color-muted)]">
                {tab === "events"
                    ? "공연 차단은 해당 공연만 서비스에서 숨깁니다.\n차단 해제로 다시 노출할 수 있습니다."
                    : "이용자 차단은 Owner ID 기준이며 그 이용자의 모든 프로필과 서비스 접근에 영향을 줍니다.\n개별 프로필 숨김은 프로필 & 공연 관리에서 처리하세요."}
            </p>

            {/* Search */}
            <div className="px-4 pt-2 pb-2 flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-card-md)] px-3 py-2.5">
                    <DyveIcon name="search" size="sm" tone="muted" className="h-4 w-4 flex-shrink-0" />
                    <input
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="이름 또는 키워드 검색..."
                        aria-label="이름 또는 키워드 검색"
                        className="min-h-6 flex-1 bg-transparent ty-body-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] outline-none"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={!searchQ.trim() || isLoading}
                    className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--radius-card-md)] ty-body-sm font-bold disabled:opacity-40"
                >
                    검색
                </button>
            </div>

            {/* Results */}
            <main className="flex-1 px-4 pb-24 space-y-3 overflow-y-auto">
                {isLoading && <div className="text-center py-14 text-[var(--color-muted)] ty-body-sm">검색 중...</div>}
                {error && (
                    <div className="py-8 text-center text-[var(--color-error)] ty-body-sm bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-[var(--radius-card-md)]">
                        <p>{error}</p>
                        <button type="button" className="mt-2 min-h-11 font-bold underline underline-offset-4" onClick={() => void handleSearch()}>
                            다시 시도
                        </button>
                    </div>
                )}
                {!isLoading && !error && searched && items.length === 0 && (
                    <div className="text-center py-14 text-[var(--color-muted-soft)] ty-body-sm">검색 결과가 없어요</div>
                )}
                {!isLoading && !searched && (
                    <div className="text-center py-14 text-[var(--color-muted-soft)] ty-body-sm">
                        <DyveIcon name="eye-off" size="lg" tone="muted" className="mx-auto mb-2 h-8 w-8 opacity-30" />
                        <p>이름이나 키워드로 검색하세요</p>
                    </div>
                )}
                {!isLoading && items.map((item) => {
                    const blocked = isBlocked(item);
                    return (
                        <div
                            key={item.id}
                            className={`flex items-center gap-3 bg-[var(--color-surface-soft)] border rounded-[var(--radius-card-lg)] p-3 ${
                                blocked ? "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5" : "border-[var(--color-hairline)]"
                            }`}
                        >
                            <div className="w-12 h-12 rounded-[var(--radius-card-md)] overflow-hidden bg-surface-strong flex-shrink-0">
                                <DyveImage src={displayImage(item)} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="ty-body-sm font-bold text-[var(--color-ink)] truncate">{displayLabel(item)}</p>
                                    {blocked && (
                                        <span className="ty-micro bg-[var(--color-primary)] text-[var(--color-on-primary)] px-1.5 py-0.5 rounded-[var(--radius-pill)] font-bold flex-shrink-0">
                                            차단됨
                                        </span>
                                    )}
                                </div>
                                {item.type && <p className="ty-micro text-[var(--color-muted)] mt-0.5">{item.type.toUpperCase()}</p>}
                                <p className="ty-micro text-[var(--color-muted-soft)]">ID: {item.id.slice(0, 16)}...</p>
                            </div>
                            {blocked ? (
                                <button
                                    onClick={() => handleUnblock(item)}
                                    disabled={Boolean(processingId)}
                                    className="px-3 py-1.5 ty-caption font-bold text-[var(--color-ink)] bg-surface-strong rounded-[var(--radius-button-md)] hover:bg-surface-muted flex-shrink-0"
                                >
                                    차단 해제
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setBlockTarget(item); setBlockReason(BLOCK_REASONS[0]); }}
                                    disabled={isSubmitting || Boolean(processingId)}
                                    className="px-3 py-1.5 ty-caption font-bold text-[var(--color-ink)] bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 rounded-[var(--radius-button-md)] hover:bg-[var(--color-primary)]/30 flex-shrink-0"
                                >
                                    차단
                                </button>
                            )}
                        </div>
                    );
                })}
            </main>

            {/* Block Modal */}
            {blockTarget && (
                <div className="fixed inset-0 z-50 flex items-end bg-[rgba(35,35,35,0.48)] backdrop-blur-sm">
                    <div className="w-full bg-[var(--color-surface-soft)] border-t border-[var(--color-hairline)] rounded-t-[var(--radius-card-lg)] p-6 space-y-4">
                        <h2 className="ty-body-lg font-bold">차단 사유 선택</h2>
                        <p className="whitespace-pre-line ty-body-sm text-[var(--color-muted)]">
                            <span className="text-[var(--color-ink)] font-bold">{blockTarget.title ?? blockTarget.name}</span>
                            {tab === "events"
                                ? " 공연을 비공개 처리합니다.\n사유를 선택해 주세요."
                                : " 이용자와 모든 프로필을 차단합니다.\n사유를 선택해 주세요."}
                        </p>
                        <div className="space-y-2">
                            {BLOCK_REASONS.map((reason) => (
                                <button
                                    key={reason}
                                    onClick={() => setBlockReason(reason)}
                                    className={`w-full text-left px-4 py-3 rounded-[var(--radius-card-md)] ty-body-sm font-medium border transition-colors ${
                                        blockReason === reason
                                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-ink)]"
                                            : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-muted)]"
                                    }`}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setBlockTarget(null)}
                                className="flex-1 py-3 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] ty-body-sm font-bold text-[var(--color-muted)]"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleBlockConfirm}
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-[var(--radius-card-md)] bg-[var(--color-primary)] text-[var(--color-on-primary)] ty-body-sm font-bold disabled:opacity-50"
                            >
                                {isSubmitting ? "처리 중..." : "차단 처리"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
