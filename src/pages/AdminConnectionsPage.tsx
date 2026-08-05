import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { ConnectionCard } from "../components/figma/dyve/ConnectionCard";
import { api, formatApiError, type ConnectionApprovalStatus, type ConnectionDto } from "../services/api";

const TAB_CONFIG: { id: ConnectionApprovalStatus; label: string }[] = [
  { id: "approved", label: "운영 목록" },
  { id: "pending", label: "기존 검토 대기" },
  { id: "rejected", label: "반려" },
];

export function AdminConnectionsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ConnectionApprovalStatus>("approved");
  const [items, setItems] = useState<ConnectionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async (nextTab: ConnectionApprovalStatus) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.adminListConnections({ approvalStatus: nextTab, limit: 50 });
      setItems(response.data);
    } catch (err) {
      setError(formatApiError(err, "Buddy Dive 목록을 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  const handleApprove = async (connectionId: string) => {
    if (processingId) return;
    try {
      setProcessingId(connectionId);
      await api.adminApproveConnection(connectionId);
      toast.success("승인했습니다.");
      await load(tab);
    } catch (err) {
      toast.error(formatApiError(err, "승인에 실패했습니다."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleClose = async (connection: ConnectionDto) => {
    if (processingId || !window.confirm(`'${connection.title}' 신청을 마감할까요?`)) return;
    try {
      setProcessingId(connection.id);
      await api.closeConnection(connection.id);
      toast.success("Buddy Dive 신청을 마감했습니다.");
      await load(tab);
    } catch (err) {
      toast.error(formatApiError(err, "신청 마감에 실패했습니다."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (connectionId: string) => {
    if (processingId) return;
    const reason = window.prompt("반려 사유를 입력해 주세요.");
    if (!reason || !reason.trim()) return;
    try {
      setProcessingId(connectionId);
      await api.adminRejectConnection(connectionId, { reason: reason.trim() });
      toast.success("반려했습니다.");
      await load(tab);
    } catch (err) {
      toast.error(formatApiError(err, "반려에 실패했습니다."));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-hairline)] px-4 py-4">
        <DyveIcon name="clipboard-list" size="sm" className="h-4 w-4 text-[var(--color-accent-pink)]" />
        <h1 className="flex-1 ty-body-lg font-bold">Buddy Dive 운영</h1>
        <button
          type="button"
          onClick={() => navigate("/admin/connections/new")}
          className="rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-[var(--color-on-primary)]"
        >
          Buddy Dive 등록
        </button>
      </div>

      <p className="px-4 pt-4 text-[12px] leading-5 text-[var(--color-muted)]">
        페스티벌 정보와 라인업, 참가비를 등록하고 신청서를 검토해 잘 맞는 두 사람을 직접 연결하세요.
      </p>

      <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 pt-4">
        {TAB_CONFIG.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`whitespace-nowrap rounded-[var(--radius-button-md)] px-4 py-2 ty-body-sm font-bold transition-colors ${
              tab === id
                ? "bg-[var(--color-accent-pink)] text-black"
                : "border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-4">
        {isLoading ? (
          <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-10 text-center ty-body-sm text-[var(--color-muted)]">
            불러오는 중...
          </div>
        ) : error ? (
          <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-4 ty-body-sm text-[var(--color-error)]">
            <p>{error}</p>
            <button type="button" className="mt-3 min-h-11 font-bold underline underline-offset-4" onClick={() => void load(tab)}>
              다시 시도
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-10 text-center ty-body-sm text-[var(--color-muted)]">
            해당 상태의 Buddy Dive가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              return (
                <div key={item.id} className="space-y-2">
                  <ConnectionCard connection={item} />
                  <div className="flex flex-wrap gap-2 px-1">
                    {item.approvalStatus === "approved" && (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/connections/${item.id}/applications`)}
                        className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] px-3 py-2 ty-caption font-semibold text-[var(--color-body)]"
                      >
                        신청자·페어링 관리
                      </button>
                    )}
                    {item.approvalStatus === "approved" && (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/connections/${item.id}/edit`)}
                        className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] px-3 py-2 ty-caption font-semibold text-[var(--color-body)]"
                      >
                        수정
                      </button>
                    )}
                    {item.approvalStatus === "approved" && item.lifecycleStatus === "open" && (
                      <button
                        type="button"
                        onClick={() => void handleClose(item)}
                        disabled={Boolean(processingId)}
                        className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] px-3 py-2 ty-caption font-semibold text-[var(--color-body)] disabled:opacity-50"
                      >
                        신청 마감
                      </button>
                    )}
                    {item.approvalStatus !== "approved" && (
                      <button
                        type="button"
                        onClick={() => void handleApprove(item.id)}
                        disabled={Boolean(processingId)}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-card-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 ty-caption font-semibold text-[var(--color-success)] disabled:opacity-50"
                      >
                        <DyveIcon name="check-circle-2" size="sm" className="h-3.5 w-3.5 text-[var(--color-success)]" />
                        승인
                      </button>
                    )}
                    {item.approvalStatus !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => void handleReject(item.id)}
                        disabled={Boolean(processingId)}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-card-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2 ty-caption font-semibold text-[var(--color-error)] disabled:opacity-50"
                      >
                        <DyveIcon name="x-circle" size="sm" className="h-3.5 w-3.5 text-[var(--color-error)]" />
                        반려
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
