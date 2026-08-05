import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { LoadingIndicator } from "../../LoadingIndicator";
import { Badge } from "../ui/badge";
import type { Project, Reward } from "../../../api/projects";
import { NavHeader } from "./NavHeader";
import { DyveIcon } from "./DyveIcon";

interface ProjectPledgeScreenProps {
  project: Project;
  onBack: () => void;
  onComplete: (params: { rewardId?: string; amount: number }) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

const BASE_MIN_AMOUNT = 5000;
const sanitizeNumericInput = (value: string) => value.replace(/\D/g, "");

export function ProjectPledgeScreen({
  project,
  onBack,
  onComplete,
  isSubmitting,
  errorMessage,
}: ProjectPledgeScreenProps) {
  const minimumAmount = Math.max(BASE_MIN_AMOUNT, project.minPledgeAmount || BASE_MIN_AMOUNT);
  const hasRewards = project.rewards.length > 0;
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [freeAmountInput, setFreeAmountInput] = useState(String(minimumAmount));

  const selectedReward = useMemo(
    () => project.rewards.find((r) => r.id === selectedRewardId) ?? null,
    [project.rewards, selectedRewardId],
  );

  useEffect(() => {
    setFreeAmountInput((current) => {
      const parsed = Number(current);
      if (!Number.isFinite(parsed) || parsed < minimumAmount) {
        return String(minimumAmount);
      }
      return current;
    });
  }, [minimumAmount]);

  const freeAmount = Number(freeAmountInput);
  const resolvedFreeAmount = Number.isFinite(freeAmount) ? freeAmount : 0;
  const finalAmount = selectedReward ? selectedReward.price : resolvedFreeAmount;

  const handleSubmit = async () => {
    if (finalAmount < minimumAmount) return;
    await onComplete({
      rewardId: selectedRewardId ?? undefined,
      amount: finalAmount,
    });
  };

  return (
    <div className="relative min-h-full animate-in slide-in-from-right bg-[var(--color-canvas)] pb-36 text-[var(--color-ink)] duration-300">
      <NavHeader title="후원하기" onBack={onBack} />

      <div className="px-6 py-6">
        {/* Error */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-surface-overlay)] px-3 py-2 text-xs text-[var(--color-primary)]">
            <DyveIcon name="alert-circle" size="sm" className="h-4 w-4 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Reward selection (if rewards exist) */}
        {hasRewards && (
          <div className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <DyveIcon name="gift" size="md" tone="primary" className="h-5 w-5" /> 혜택 선택
            </h2>
            <div className="grid gap-3">
              {project.rewards.map((reward: Reward) => {
                const isSelected = selectedRewardId === reward.id;
                return (
                  <button
                    key={reward.id}
                    type="button"
                    onClick={() =>
                      setSelectedRewardId(isSelected ? null : reward.id)
                    }
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                        : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] hover:border-[var(--color-hairline-strong)]"
                      }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-lg font-bold text-[var(--color-ink)]">
                        {reward.price.toLocaleString()}원
                      </span>
                      <div className="flex items-center gap-2">
                        {reward.quantityLimit && (
                          <Badge
                            variant="outline"
                          className="border-[var(--color-hairline-strong)] text-[var(--color-muted)] text-xs"
                          >
                            {reward.quantityLimit}개 한정
                          </Badge>
                        )}
                        <div
                          className={`h-5 w-5 rounded-full border-2 transition-colors ${isSelected
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                              : "border-[var(--color-hairline-strong)]"
                            }`}
                        >
                          {isSelected && (
                            <div className="flex h-full w-full items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-[var(--color-canvas)]" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <h3 className="mb-1 font-semibold text-[var(--color-ink)]">{reward.title}</h3>
                    {reward.description && (
                      <p className="text-sm text-[var(--color-muted)]">{reward.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Free amount input (no reward selected or no rewards) */}
        {!selectedReward && (
          <div className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <DyveIcon name="sparkles" size="md" tone="primary" className="h-5 w-5" />
              {hasRewards ? "혜택 없이 후원" : "후원 금액 선택"}
            </h2>

            <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
              <p className="mb-3 text-xs text-[var(--color-muted)]">직접 금액 입력만 허용됩니다. 최소 {minimumAmount.toLocaleString()}원</p>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={freeAmountInput}
                  onChange={(event) => setFreeAmountInput(sanitizeNumericInput(event.target.value))}
                  placeholder={String(minimumAmount)}
                  className="h-12 rounded-xl border-[var(--color-hairline)] bg-[var(--color-surface-soft)] pr-10 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">원</span>
              </div>
              <p className="mt-3 text-xs text-[var(--color-muted-soft)]">
                입력 금액: {resolvedFreeAmount > 0 ? `${resolvedFreeAmount.toLocaleString()}원` : "-"}
              </p>
            </div>
          </div>
        )}

        {/* Notice */}
        <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4">
          <div className="flex items-start gap-2">
            <DyveIcon name="sparkles" size="sm" tone="primary" className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="whitespace-pre-line text-xs leading-relaxed text-[var(--color-body)]">
              {"마감일까지 목표 금액을 달성하지 못하면 전액 환불돼요.\n결제는 후원 확정 시 즉시 처리됩니다."}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Fixed */}
      <div className="mobile-fixed-bar app-bottom-bar border-t p-4 pb-8">
        <div className="mb-2 flex items-center justify-between px-1 text-sm">
          <span className="text-[var(--color-muted)]">후원 금액</span>
          <span className="text-lg font-bold text-[var(--color-ink)]">{finalAmount.toLocaleString()}원</span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || finalAmount < minimumAmount}
          className={`w-full rounded-xl py-6 text-lg font-bold ${isSubmitting || finalAmount < minimumAmount
              ? "bg-[var(--color-disabled-surface)] text-[var(--color-disabled-text)]"
              : "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)] shadow-[0_0_20px_rgba(255,74,74,0.2)]"
            }`}
        >
          {isSubmitting ? <LoadingIndicator className="text-lg text-[var(--color-disabled-text)]" /> : "후원 확정하기"}
        </Button>
      </div>
    </div>
  );
}
