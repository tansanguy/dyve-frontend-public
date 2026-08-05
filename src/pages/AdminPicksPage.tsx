import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "../services/api";
import { DyveImage } from "../components/figma/dyve/DyveImage";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";

type PickTarget = "event" | "connection" | "groupDive" | "profile";
type PickTab = "events" | "buddyDives" | "groupDives" | "profiles";

const PICK_TABS: Array<{ value: PickTab; label: string; target: PickTarget }> = [
    { value: "events", label: "공연", target: "event" },
    { value: "buddyDives", label: "Buddy Dive", target: "connection" },
    { value: "groupDives", label: "Group Dive", target: "groupDive" },
    { value: "profiles", label: "아티스트·공간", target: "profile" },
];

type PickItem = {
    id: string;
    target: PickTarget;
    title?: string;
    name?: string;
    type?: string;
    image?: string;
    imageUrl?: string;
    isFeatured?: boolean;
    featuredOrder?: number | null;
    isDyvePick?: boolean;
    isDyveResident?: boolean;
    isBlocked?: boolean;
};

export function AdminPicksPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<PickTab>("events");
    const [items, setItems] = useState<PickItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQ, setSearchQ] = useState("");
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [featuredItems, setFeaturedItems] = useState<PickItem[]>([]);
    const [featuredError, setFeaturedError] = useState<string | null>(null);
    const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);
    const [isOrdering, setIsOrdering] = useState(false);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const target = PICK_TABS.find((item) => item.value === tab)?.target ?? "event";
            const res = await api.adminListPicks({
                limit: 50,
                q: searchQ || undefined,
                target,
                tab: tab === "profiles" ? "pick" : "all",
            });
            setItems(res.data as PickItem[]);
        } catch {
            // Fallback: use regular list endpoint and client-side filter
            try {
                if (tab === "events") {
                    const res = await api.getEvents({ q: searchQ || undefined, limit: 50 });
                    setItems(
                        (res.data as Omit<PickItem, "target">[]).map((item) => ({
                            ...item,
                            target: "event" as const,
                        })),
                    );
                } else if (tab === "profiles") {
                    const res = await api.listProfiles({ limit: 50 });
                    setItems(
                        (res.data as Omit<PickItem, "target">[])
                            .filter((item) => item.isDyvePick)
                            .map((item) => ({ ...item, target: "profile" as const })),
                    );
                } else {
                    throw new Error("Dive PICK 목록을 불러오지 못했습니다.");
                }
            } catch (err: unknown) {
                setError(formatApiError(err, "목록을 불러오지 못했습니다."));
            }
        } finally {
            setIsLoading(false);
        }
    }, [searchQ, tab]);

    useEffect(() => { void load(); }, [load]);

    const loadFeatured = useCallback(async () => {
        setIsFeaturedLoading(true);
        setFeaturedError(null);
        try {
            const res = await api.adminListPicks({ limit: 200, target: "content", tab: "featured" });
            setFeaturedItems(res.data as PickItem[]);
        } catch (err: unknown) {
            setFeaturedError(formatApiError(err, "Featured 배너 순서를 불러오지 못했습니다."));
        } finally {
            setIsFeaturedLoading(false);
        }
    }, []);

    useEffect(() => {
        if (tab !== "profiles") void loadFeatured();
    }, [loadFeatured, tab]);

    const handleTogglePick = async (item: PickItem) => {
        if (togglingId) return;
        setTogglingId(item.id);
        const currentPick = !!item.isDyvePick;
        try {
            if (tab !== "profiles") {
                await api.adminUpdatePickBadges({
                    target: item.target as Exclude<PickTarget, "profile">,
                    id: item.id,
                    isDyvePick: !currentPick,
                });
            } else {
                await api.updateAdminProfileBadges(item.id, { isDyvePick: !currentPick });
            }
            setItems((prev) =>
                prev.map((i) => i.id === item.id ? { ...i, isDyvePick: !currentPick } : i)
            );
        } catch (err: unknown) {
            alert(formatApiError(err, "변경 실패"));
        } finally {
            setTogglingId(null);
        }
    };

    const handleToggleFeatured = async (item: PickItem) => {
        if (togglingId) return;
        setTogglingId(item.id);
        try {
            await api.adminUpdatePickBadges({
                target: item.target as Exclude<PickTarget, "profile">,
                id: item.id,
                isFeatured: !item.isFeatured,
            });
            setItems((prev) =>
                prev.map((i) => i.id === item.id ? { ...i, isFeatured: !item.isFeatured } : i)
            );
            await loadFeatured();
        } catch (err: unknown) {
            alert(formatApiError(err, "변경 실패"));
        } finally {
            setTogglingId(null);
        }
    };

    const handleMoveFeatured = async (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (isOrdering || targetIndex < 0 || targetIndex >= featuredItems.length) return;

        const previous = featuredItems;
        const reordered = [...featuredItems];
        [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
        setFeaturedItems(reordered);
        setIsOrdering(true);
        try {
            await api.adminUpdateFeaturedOrder(
                reordered.map((item) => ({
                    target: item.target as Exclude<PickTarget, "profile">,
                    id: item.id,
                })),
            );
            setFeaturedItems(reordered.map((item, itemIndex) => ({ ...item, featuredOrder: itemIndex + 1 })));
        } catch (err: unknown) {
            setFeaturedItems(previous);
            await loadFeatured();
            alert(formatApiError(err, "순서 변경 실패"));
        } finally {
            setIsOrdering(false);
        }
    };

    const handleToggleResident = async (item: PickItem) => {
        if (togglingId) return;
        setTogglingId(item.id);
        try {
            await api.updateAdminProfileBadges(item.id, { isDyveResident: !item.isDyveResident });
            setItems((prev) =>
                prev.map((i) => i.id === item.id ? { ...i, isDyveResident: !item.isDyveResident } : i)
            );
        } catch (err: unknown) {
            alert(formatApiError(err, "변경 실패"));
        } finally {
            setTogglingId(null);
        }
    };

    const displayLabel = (item: PickItem) => item.title ?? item.name ?? "이름 없음";
    const displayImage = (item: PickItem) => item.imageUrl ?? item.image;
    const selectedTab = PICK_TABS.find((item) => item.value === tab) ?? PICK_TABS[0];

    return (
        <div className="flex min-h-screen w-full flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--color-hairline)]">
                <button type="button" onClick={() => navigate(-1)} aria-label="이전 화면" className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-button-md)] hover:bg-[var(--color-surface-muted)]">
                    <DyveIcon name="chevron-left" size="md" tone="default" className="h-5 w-5" />
                </button>
                <DyveIcon name="star" size="sm" className="h-4 w-4" style={{ color: "var(--color-accent-pink)" }} />
                <h1 className="ty-body-lg font-bold flex-1">PICK·Featured 관리</h1>
                <span className="ty-micro font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2 py-0.5 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/20">
                    ADMIN
                </span>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 px-4 pt-4">
                {PICK_TABS.map((item) => (
                    <button
                        key={item.value}
                        onClick={() => setTab(item.value)}
                        className={`min-h-11 rounded-[var(--radius-button-md)] px-2 py-2 font-bold ty-caption transition-colors ${
                            tab === item.value ? "bg-[var(--color-accent-pink)] text-black" : "bg-[var(--color-surface-soft)] text-[var(--color-muted)] border border-[var(--color-hairline)]"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <details className="mx-4 mt-3 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-2">
                <summary className="cursor-pointer ty-caption font-bold text-[var(--color-body)]">배지와 노출 위치 보기</summary>
                <ul className="mt-2 space-y-1 break-keep ty-micro leading-5 text-[var(--color-muted)] [text-wrap:pretty]">
                    <li>PICK: 운영자가 선정한 공연·Dive·프로필 표시입니다.</li>
                    <li>
                        <span className="block">Featured: 공연과 Dive를 홈 최상단 캐러셀에 노출합니다.</span>
                        <span className="block">위 순서가 캐러셀 순서입니다.</span>
                    </li>
                    <li>Resident: 아티스트·베뉴 프로필의 DYVE Resident 표시입니다.</li>
                    <li>Official: Buddy Dive의 공식 운영 프로필 표시이며 ‘Buddy Dive 운영 프로필’에서 관리합니다.</li>
                </ul>
            </details>

            {tab !== "profiles" && (
                <section className="mx-4 mt-4 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
                    <div className="mb-3">
                        <h2 className="ty-body-sm font-bold">메인 최상단 Featured 배너 순서</h2>
                        <p className="mt-1 ty-caption text-[var(--color-muted)]">위에서부터 메인 캐러셀에 노출됩니다.</p>
                    </div>
                    {isFeaturedLoading && <p className="ty-caption text-[var(--color-muted)]">불러오는 중...</p>}
                    {featuredError && <p className="ty-caption text-[var(--color-error)]">{featuredError}</p>}
                    {!isFeaturedLoading && !featuredError && featuredItems.length === 0 && (
                        <p className="ty-caption text-[var(--color-muted)]">Featured로 지정된 공연이나 Dive가 없습니다.</p>
                    )}
                    <div className="space-y-2">
                        {featuredItems.map((item, index) => (
                            <div key={`${item.target}:${item.id}`} className="flex items-center gap-3 rounded-[var(--radius-card-md)] bg-[var(--color-canvas)] p-2">
                                <span className="w-6 text-center ty-caption font-bold text-[var(--color-primary)]">{index + 1}</span>
                                <DyveImage src={displayImage(item)} alt="" className="h-9 w-9 flex-shrink-0 rounded-[var(--radius-card-sm)] object-cover" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate ty-body-sm font-semibold">{displayLabel(item)}</span>
                                    <span className="block ty-micro text-[var(--color-muted)]">{item.type?.replace("_", " ")}</span>
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        disabled={isOrdering || index === 0}
                                        onClick={() => void handleMoveFeatured(index, -1)}
                                        aria-label={`${displayLabel(item)} 위로 이동`}
                                        className="h-9 w-9 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] disabled:opacity-30"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isOrdering || index === featuredItems.length - 1}
                                        onClick={() => void handleMoveFeatured(index, 1)}
                                        aria-label={`${displayLabel(item)} 아래로 이동`}
                                        className="h-9 w-9 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] disabled:opacity-30"
                                    >
                                        ↓
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Search */}
            <div className="px-4 pt-3 pb-2 flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-card-md)] px-3 py-2.5">
                    <DyveIcon name="search" size="sm" tone="muted" className="h-4 w-4 flex-shrink-0" />
                    <input
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && load()}
                        placeholder="이름으로 검색..."
                        aria-label="이름으로 검색"
                        className="min-h-6 flex-1 bg-transparent ty-body-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] outline-none"
                    />
                </div>
                <button
                    onClick={load}
                    className="px-4 py-2 bg-[var(--color-accent-pink)] text-black rounded-[var(--radius-card-md)] ty-body-sm font-bold"
                >
                    검색
                </button>
            </div>

            <div className="px-4 pb-2">
                {tab === "profiles" ? (
                    <div className="space-y-0.5 break-keep ty-caption text-[var(--color-muted)] [text-wrap:pretty]">
                        <p>현재 DYVE PICK 선정 목록입니다.</p>
                        <p>토글로 상태를 변경할 수 있습니다.</p>
                    </div>
                ) : (
                    <p className="break-keep ty-caption text-[var(--color-muted)] [text-wrap:pretty]">
                        전체 {selectedTab.label}에서 PICK과 Featured 상태를 변경할 수 있습니다.
                    </p>
                )}
            </div>

            {/* Content */}
            <main className="flex-1 px-4 pb-24 space-y-3 overflow-y-auto">
                {isLoading && (
                    <div className="text-center py-14 text-[var(--color-muted)] ty-body-sm">불러오는 중...</div>
                )}
                {error && (
                    <div className="text-center py-10 text-[var(--color-error)] ty-body-sm bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-[var(--radius-card-md)]">
                        <p>{error}</p>
                        <button type="button" className="mt-2 min-h-11 font-bold underline underline-offset-4" onClick={() => void load()}>
                            다시 시도
                        </button>
                    </div>
                )}
                {!isLoading && !error && items.length === 0 && (
                    <div className="text-center py-14 text-[var(--color-muted-soft)] ty-body-sm">
                        <DyveIcon name="eye-off" size="lg" tone="muted" className="mx-auto mb-2 h-8 w-8 opacity-40" />
                        {tab === "profiles" ? "PICK 선정된 항목이 없어요" : `${selectedTab.label} 검색 결과가 없어요`}
                    </div>
                )}
                {!isLoading && items.map((item) => (
                    <div
                        key={`${item.target}:${item.id}`}
                        className="flex items-center gap-3 bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-card-lg)] p-3"
                    >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-[var(--radius-card-md)] overflow-hidden bg-surface-strong flex-shrink-0">
                            <DyveImage src={displayImage(item)} alt="" className="w-full h-full object-cover" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            {item.type && (
                                <div className="ty-micro text-[var(--color-muted)] mb-0.5">{item.type.toUpperCase()}</div>
                            )}
                            <p className="ty-body-sm font-bold text-[var(--color-ink)] truncate">{displayLabel(item)}</p>
                            <p className="ty-micro text-[var(--color-muted-soft)] truncate mt-0.5">ID: {item.id}</p>
                        </div>

                        {/* Toggles */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                            {/* PICK */}
                            <div className="flex items-center gap-1.5">
                                <span className="ty-micro text-[var(--color-muted)] w-14 text-right">PICK</span>
                                <button
                                    disabled={Boolean(togglingId)}
                                    onClick={() => handleTogglePick(item)}
                                    className={`w-10 h-5 rounded-[var(--radius-pill)] transition-colors relative ${
                                        item.isDyvePick ? "bg-[var(--color-accent-pink)]" : "bg-surface-strong"
                                    }`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-[var(--radius-pill)] transition-transform ${
                                        item.isDyvePick ? "translate-x-5" : "translate-x-0"
                                    }`} />
                                </button>
                            </div>
                            {/* Featured (for banner-capable content) */}
                            {tab !== "profiles" && (
                                <div className="flex items-center gap-1.5">
                                    <span className="ty-micro text-[var(--color-muted)] w-14 text-right">Featured</span>
                                    <button
                                        disabled={Boolean(togglingId)}
                                        onClick={() => handleToggleFeatured(item)}
                                        className={`w-10 h-5 rounded-[var(--radius-pill)] transition-colors relative ${
                                            item.isFeatured ? "bg-[var(--color-primary)]" : "bg-surface-strong"
                                        }`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-[var(--radius-pill)] transition-transform ${
                                            item.isFeatured ? "translate-x-5" : "translate-x-0"
                                        }`} />
                                    </button>
                                </div>
                            )}
                            {/* Resident (for profiles) */}
                            {tab === "profiles" && (
                                <div className="flex items-center gap-1.5">
                                    <span className="ty-micro text-[var(--color-muted)] w-14 text-right">Resident</span>
                                    <button
                                        disabled={Boolean(togglingId)}
                                        onClick={() => handleToggleResident(item)}
                                        className={`w-10 h-5 rounded-[var(--radius-pill)] transition-colors relative ${
                                            item.isDyveResident ? "bg-[var(--color-success)]" : "bg-surface-strong"
                                        }`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-[var(--radius-pill)] transition-transform ${
                                            item.isDyveResident ? "translate-x-5" : "translate-x-0"
                                        }`} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
}
