import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  api,
  formatApiError,
  type AdminBusinessRegistrationItem,
} from "../services/api";
import { DyveImage } from "../components/figma/dyve/DyveImage";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";

type ReviewTab = "pending" | "approved" | "rejected";

const TAB_CONFIG: { id: ReviewTab; label: string }[] = [
  { id: "pending", label: "심사 중" },
  { id: "approved", label: "승인" },
  { id: "rejected", label: "거절" },
];

const STATUS_CLASS: Record<ReviewTab, string> = {
  pending: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  approved: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  rejected: "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-error)]",
};

const STATUS_LABEL: Record<ReviewTab, string> = {
  pending: "심사 중",
  approved: "승인",
  rejected: "거절",
};

export function AdminBusinessRegistrationPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReviewTab>("pending");
  const [items, setItems] = useState<AdminBusinessRegistrationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingProfileId, setProcessingProfileId] = useState<string | null>(null);

  const load = useCallback(async (nextTab: ReviewTab = tab) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.adminListBusinessRegistrations({ status: nextTab, limit: 50 });
      setItems(response.data);
    } catch (err) {
      setError(formatApiError(err, "사업자등록증 목록을 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  const handleApprove = async (profileId: string) => {
    if (processingProfileId) return;
    try {
      setProcessingProfileId(profileId);
      await api.adminApproveBusinessRegistration(profileId);
      toast.success("사업자등록증을 승인했습니다.");
      await load(tab);
    } catch (err) {
      toast.error(formatApiError(err, "승인 처리에 실패했습니다."));
    } finally {
      setProcessingProfileId(null);
    }
  };

  const handleReject = async (profileId: string) => {
    if (processingProfileId) return;
    const reason = window.prompt("거절 사유를 입력해 주세요.");
    if (!reason || !reason.trim()) return;
    try {
      setProcessingProfileId(profileId);
      await api.adminRejectBusinessRegistration(profileId, { reason: reason.trim() });
      toast.success("사업자등록증을 거절 처리했습니다.");
      await load(tab);
    } catch (err) {
      toast.error(formatApiError(err, "거절 처리에 실패했습니다."));
    } finally {
      setProcessingProfileId(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-hairline)] px-4 py-4">
        <button type="button" onClick={() => navigate(-1)} aria-label="이전 화면" className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-button-md)] hover:bg-[var(--color-surface-muted)]">
          <DyveIcon name="chevron-left" size="md" tone="default" className="h-5 w-5" />
        </button>
        <DyveIcon name="file-badge-2" size="sm" className="h-4 w-4 text-[var(--color-accent-pink)]" />
        <h1 className="flex-1 ty-body-lg font-bold">사업자등록증 심사</h1>
        <span className="rounded-[var(--radius-pill)] border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-2 py-0.5 ty-micro font-bold text-[var(--color-primary)]">
          ADMIN
        </span>
      </div>

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
            해당 상태의 심사 건이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              return (
                <div key={item.profileId} className="overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
                  <div className="aspect-[16/10] bg-[var(--color-canvas)]">
                    <DyveImage
                      src={item.businessRegistrationImage}
                      alt={`${item.venueName} 사업자등록증`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="ty-body-lg font-bold text-[var(--color-ink)]">{item.venueName}</p>
                        <p className="mt-1 ty-caption text-[var(--color-muted)]">ownerId {item.ownerId}</p>
                        <p className="mt-1 ty-caption text-[var(--color-muted)]">제출일 {item.createdAt.slice(0, 10)}</p>
                      </div>
                      <span className={`rounded-[var(--radius-pill)] border px-3 py-1 ty-micro font-semibold ${STATUS_CLASS[item.businessRegistrationStatus]}`}>
                        {STATUS_LABEL[item.businessRegistrationStatus]}
                      </span>
                    </div>

                    {item.businessRegistrationRejectionReason && (
                      <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-3 ty-caption leading-relaxed text-[var(--color-error)]">
                        거절 사유: {item.businessRegistrationRejectionReason}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/profiles/${item.profileId}`)}
                        className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] px-3 py-2 ty-caption font-semibold text-[var(--color-body)] hover:border-white/20"
                      >
                        프로필 보기
                      </button>
                      {item.businessRegistrationStatus !== "approved" && (
                        <button
                          type="button"
                          onClick={() => void handleApprove(item.profileId)}
                          disabled={Boolean(processingProfileId)}
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius-card-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 ty-caption font-semibold text-[var(--color-success)] disabled:opacity-50"
                        >
                          <DyveIcon name="check-circle-2" size="sm" className="h-3.5 w-3.5 text-[var(--color-success)]" />
                          승인
                        </button>
                      )}
                      {item.businessRegistrationStatus !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => void handleReject(item.profileId)}
                          disabled={Boolean(processingProfileId)}
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius-card-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2 ty-caption font-semibold text-[var(--color-error)] disabled:opacity-50"
                        >
                          <DyveIcon name="x-circle" size="sm" className="h-3.5 w-3.5 text-[var(--color-error)]" />
                          거절
                        </button>
                      )}
                    </div>
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
