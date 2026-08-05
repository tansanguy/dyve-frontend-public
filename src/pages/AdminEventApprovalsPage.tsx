import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { api, formatApiError, type AdminEventItem } from "../services/api";

export function AdminEventApprovalsPage() {
  const [items, setItems] = useState<AdminEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.adminListEvents({ approvalStatus: "pending", limit: 50 });
      setItems(response.data);
    } catch (err) {
      setError(formatApiError(err, "승인 대기 목록을 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (eventId: string) => {
    if (processingId) return;
    try {
      setProcessingId(eventId);
      await api.adminApproveEvent(eventId);
      toast.success("승인했습니다.");
      await load();
    } catch (err) {
      toast.error(formatApiError(err, "승인에 실패했습니다."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (eventId: string) => {
    if (processingId) return;
    const reason = window.prompt("반려 사유를 입력해 주세요.");
    if (!reason || !reason.trim()) return;
    try {
      setProcessingId(eventId);
      await api.adminRejectEvent(eventId, { reason: reason.trim() });
      toast.success("반려했습니다.");
      await load();
    } catch (err) {
      toast.error(formatApiError(err, "반려에 실패했습니다."));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-hairline)] px-4 py-4">
        <DyveIcon name="badge-check" size="sm" className="h-4 w-4 text-[var(--color-accent-pink)]" />
        <h1 className="flex-1 ty-body-lg font-bold">Event 승인 대기</h1>
      </div>

      <div className="flex-1 px-4 py-4">
        {isLoading ? (
          <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-10 text-center ty-body-sm text-[var(--color-muted)]">
            불러오는 중...
          </div>
        ) : error ? (
          <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-4 ty-body-sm text-[var(--color-error)]">
            <p>{error}</p>
            <button type="button" className="mt-3 min-h-11 font-bold underline underline-offset-4" onClick={() => void load()}>
              다시 시도
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-10 text-center ty-body-sm text-[var(--color-muted)]">
            승인 대기 중인 Event가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              return (
                <div
                  key={item.id}
                  className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4"
                >
                  <p className="ty-body-lg font-bold text-[var(--color-ink)]">{item.title}</p>
                  <p className="mt-1 ty-caption text-[var(--color-muted)]">
                    {item.hostProfileName ?? item.hostProfileId} · {item.startAt?.slice(0, 16)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleApprove(item.id)}
                      disabled={Boolean(processingId)}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-card-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 ty-caption font-semibold text-[var(--color-success)] disabled:opacity-50"
                    >
                      <DyveIcon name="check-circle-2" size="sm" className="h-3.5 w-3.5 text-[var(--color-success)]" />
                      승인
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReject(item.id)}
                      disabled={Boolean(processingId)}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-card-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2 ty-caption font-semibold text-[var(--color-error)] disabled:opacity-50"
                    >
                      <DyveIcon name="x-circle" size="sm" className="h-3.5 w-3.5 text-[var(--color-error)]" />
                      반려
                    </button>
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
