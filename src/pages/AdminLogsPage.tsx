import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    api,
    formatApiError,
    type AdminAuditLog,
    type AdminProfileType,
    type AdminUserItem,
} from "../services/api";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";

const PROFILE_TYPES: AdminProfileType[] = ["audience", "artist", "venue"];

const PROFILE_TYPE_LABELS: Record<AdminProfileType, string> = {
    audience: "관객",
    artist: "아티스트",
    venue: "베뉴",
};

const PROFILE_TYPE_COLORS: Record<AdminProfileType, string> = {
    audience: "var(--color-accent-pink)",
    artist: "var(--color-accent-pink)",
    venue: "var(--color-accent-pink)",
};

export function AdminLogsPage() {
    const navigate = useNavigate();
    const [searchQ, setSearchQ] = useState("");
    const [users, setUsers] = useState<AdminUserItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Selected user panel
    const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
    const [logs, setLogs] = useState<AdminAuditLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [roleChanging, setRoleChanging] = useState(false);

    const handleSearch = async () => {
        if (!searchQ.trim()) return;
        setIsLoading(true);
        setError(null);
        setSearched(true);
        setSelectedUser(null);
        setLogs([]);
        try {
            const res = await api.adminListUsers({ q: searchQ, limit: 30 });
            setUsers(res.data);
        } catch (err: unknown) {
            setError(formatApiError(err, "검색 실패"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectUser = async (user: AdminUserItem) => {
        setSelectedUser(user);
        setLogs([]);
        setLogsLoading(true);
        try {
            const res = await api.adminGetAuditLogs(user.ownerId, { limit: 30 });
            setLogs(res.data);
        } catch {
            setLogs([]);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleSetActiveProfileType = async (profileType: AdminProfileType) => {
        if (!selectedUser || roleChanging) return;
        if (!window.confirm(`${selectedUser.displayName ?? "이 이용자"}의 기본 프로필을 '${PROFILE_TYPE_LABELS[profileType]}'(으)로 변경할까요?`)) return;
        setRoleChanging(true);
        try {
            const updated = await api.adminSetActiveProfileType(selectedUser.ownerId, profileType);
            setSelectedUser((prev) => prev ? {
                ...prev,
                activeProfileType: updated.activeProfileType,
                profileTypes: updated.profileTypes,
            } : prev);
            setUsers((prev) => prev.map((user) => user.ownerId === selectedUser.ownerId ? {
                ...user,
                activeProfileType: updated.activeProfileType,
                profileTypes: updated.profileTypes,
            } : user));
        } catch (err: unknown) {
            alert(formatApiError(err, "기본 프로필 변경 실패"));
        } finally {
            setRoleChanging(false);
        }
    };

    const currentProfileType = selectedUser?.activeProfileType;

    return (
        <div className="flex min-h-screen w-full flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--color-hairline)]">
                <button type="button" onClick={() => navigate(-1)} aria-label="이전 화면" className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-button-md)] hover:bg-[var(--color-surface-muted)]">
                    <DyveIcon name="chevron-left" size="md" tone="default" className="h-5 w-5" />
                </button>
                <DyveIcon name="clipboard-list" size="sm" className="h-4 w-4 text-[var(--color-accent-pink)]" />
                <h1 className="ty-body-lg font-bold flex-1">활동 로그 & 기본 프로필</h1>
                <span className="ty-micro font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2 py-0.5 rounded-[var(--radius-pill)] border border-[var(--color-primary)]/20">
                    ADMIN
                </span>
            </div>

            {/* Search */}
            <div className="px-4 pt-4 pb-2">
                <p className="mb-3 whitespace-pre-line ty-caption leading-5 text-[var(--color-muted)]">
                    {"여기서 바꾸는 것은 로그인 권한이 아니라 앱에서 먼저 사용할 프로필 유형입니다.\n관리자 권한은 변경되지 않습니다."}
                </p>
                <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-card-md)] px-3 py-2.5">
                    <DyveIcon name="search" size="sm" tone="muted" className="h-4 w-4 flex-shrink-0" />
                    <input
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="프로필 이름 검색..."
                        aria-label="프로필 이름 검색"
                        className="min-h-6 flex-1 bg-transparent ty-body-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] outline-none"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="px-4 py-2 bg-[var(--color-accent-pink)] text-[var(--color-ink)] rounded-[var(--radius-card-md)] ty-body-sm font-bold disabled:opacity-40"
                >
                    검색
                </button>
                </div>
            </div>

            <main className="flex-1 px-4 pb-24 overflow-y-auto">
                {isLoading && <div className="text-center py-12 text-[var(--color-muted)] ty-body-sm">검색 중...</div>}
                {error && (
                    <div className="py-6 text-center text-[var(--color-error)] ty-body-sm">
                        <p>{error}</p>
                        <button type="button" className="mt-2 min-h-11 font-bold underline underline-offset-4" onClick={() => void handleSearch()}>
                            다시 시도
                        </button>
                    </div>
                )}
                {!isLoading && !searched && (
                    <div className="text-center py-14 text-[var(--color-muted-soft)] ty-body-sm">
                        <DyveIcon name="clipboard-list" size="lg" tone="muted" className="mx-auto mb-2 h-8 w-8 opacity-30" />
                        이용자를 검색해서 활동 로그와 기본 프로필을 확인하세요
                    </div>
                )}
                {!isLoading && searched && users.length === 0 && (
                    <div className="text-center py-12 text-[var(--color-muted-soft)] ty-body-sm">검색 결과가 없어요</div>
                )}

                {/* User list */}
                {!isLoading && users.length > 0 && <div className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">{users.map((user) => (
                    <button
                        key={user.ownerId}
                        onClick={() => handleSelectUser(user)}
                        className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${
                            selectedUser?.ownerId === user.ownerId ? "bg-[var(--color-primary-soft)]" : "hover:bg-[var(--color-surface-muted)]"
                        }`}
                    >
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-card-md)] bg-surface-strong">
                            <DyveIcon name="users" size="sm" tone="muted" className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="ty-body-sm font-bold text-[var(--color-ink)] truncate">{user.displayName ?? "이름 없음"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {user.activeProfileType && (
                                    <span
                                        className="ty-micro font-bold px-1.5 py-0.5 rounded-[var(--radius-pill)]"
                                        style={{
                                            color: PROFILE_TYPE_COLORS[user.activeProfileType],
                                            backgroundColor: `${PROFILE_TYPE_COLORS[user.activeProfileType]}18`,
                                        }}
                                    >
                                        기본 {PROFILE_TYPE_LABELS[user.activeProfileType]}
                                    </span>
                                )}
                                {user.status === "blocked" && (
                                    <span className="ty-micro text-[var(--color-error)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded-[var(--radius-pill)]">차단됨</span>
                                )}
                            </div>
                        </div>
                    </button>
                ))}</div>}

                {/* Selected User Panel */}
                {selectedUser && (
                    <div className="mt-2 rounded-[var(--radius-card-lg)] border border-[var(--color-accent-pink)]/20 bg-[var(--color-accent-pink)]/5 overflow-hidden">
                        {/* User info */}
                        <div className="p-4 border-b border-[var(--color-hairline)]">
                            <p className="ty-caption text-[var(--color-muted)] mb-1">선택된 이용자</p>
                            <p className="ty-body-sm font-bold text-[var(--color-ink)]">{selectedUser.displayName ?? "이름 없음"}</p>
                            <p className="ty-caption text-[var(--color-muted)] mt-0.5">Owner ID: {selectedUser.ownerId}</p>
                            <p className="ty-caption text-[var(--color-muted)] mt-0.5">
                                보유 프로필: {selectedUser.profileTypes.map((type) => PROFILE_TYPE_LABELS[type]).join(", ") || "없음"}
                            </p>
                        </div>

                        {/* Active profile change */}
                        <div className="p-4 border-b border-[var(--color-hairline)]">
                            <p className="ty-caption font-bold text-[var(--color-accent-pink)] mb-2 flex items-center gap-1">
                                <DyveIcon name="users" size="sm" className="h-3 w-3 text-[var(--color-accent-pink)]" /> 기본 프로필 유형 변경
                            </p>
                            <p className="mb-2 whitespace-pre-line ty-micro leading-5 text-[var(--color-muted)]">
                                {"관객을 선택하면 관객 프로필이 없을 때 자동 생성됩니다.\n보유하지 않은 아티스트·베뉴 유형은 선택할 수 없습니다."}
                            </p>
                            <div className="flex gap-2">
                                {PROFILE_TYPES.map((profileType) => {
                                    const unavailable = profileType !== "audience" && !selectedUser.profileTypes.includes(profileType);
                                    return (
                                    <button
                                        key={profileType}
                                        disabled={roleChanging || unavailable}
                                        onClick={() => handleSetActiveProfileType(profileType)}
                                        className={`flex-1 py-2 rounded-[var(--radius-button-md)] ty-caption font-bold border transition-colors ${
                                            currentProfileType === profileType
                                                ? "border-transparent text-black"
                                                : "border-[var(--color-hairline)] text-[var(--color-muted)] disabled:opacity-40"
                                        }`}
                                        style={currentProfileType === profileType ? { backgroundColor: PROFILE_TYPE_COLORS[profileType] } : {}}
                                    >
                                        {PROFILE_TYPE_LABELS[profileType]}
                                    </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Audit logs */}
                        <div className="p-4">
                            <p className="ty-caption font-bold text-[var(--color-accent-pink)] mb-3 flex items-center gap-1">
                                <DyveIcon name="clipboard-list" size="sm" className="h-3 w-3" /> 최근 활동 로그
                            </p>
                            {logsLoading && (
                                <div className="text-center py-6 text-[var(--color-muted)] ty-caption">로그 불러오는 중...</div>
                            )}
                            {!logsLoading && logs.length === 0 && (
                                <div className="text-center py-6 text-[var(--color-muted-soft)] ty-caption">
                                    <DyveIcon name="shield-off" size="md" tone="muted" className="mx-auto mb-1 h-5 w-5 opacity-40" />
                                    기록된 관리자 활동이 없습니다
                                </div>
                            )}
                            {!logsLoading && logs.map((log, i) => (
                                <div key={log.id ?? i} className="flex items-start gap-3 py-2 border-t border-[var(--color-hairline)] first:border-0">
                                    <div className="w-1.5 h-1.5 rounded-[var(--radius-pill)] bg-[var(--color-accent-pink)] mt-1.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="ty-caption text-[var(--color-ink)] font-medium">{log.action}</p>
                                        {log.reason && <p className="ty-micro text-[var(--color-muted)] mt-0.5 truncate">{log.reason}</p>}
                                    </div>
                                    {log.createdAt && (
                                        <span className="ty-micro text-[var(--color-muted-soft)] flex-shrink-0">{log.createdAt.slice(0, 10)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
