import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { DyveImage } from "./DyveImage";
import { LoginPromptDialog } from "./LoginPromptDialog";
import { NavHeader } from "./NavHeader";
import { DyveIcon } from "./DyveIcon";
import { useAuth } from "../../../contexts/AuthContext";
import { useState } from "react";
import type { Project, Reward } from "../../../api/projects";

interface ProjectDetailScreenProps {
  project: Project;
  onBack: () => void;
  onPledge: () => void;
}

const computeDaysLeft = (deadline: string | undefined | null): number | null => {
  if (!deadline) return null;
  const target = new Date(deadline);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
};

const formatDeadline = (deadline: string | undefined | null): string => {
  if (!deadline) return "정보 없음";
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return deadline;
  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export function ProjectDetailScreen({ project, onBack, onPledge }: ProjectDetailScreenProps) {
  const navigate = useNavigate();
  const { isMember, user } = useAuth();
  const [isPromptOpen, setPromptOpen] = useState(false);

  const progress = useMemo(
    () =>
      project.targetAmount > 0
        ? Math.min(100, Math.round((project.currentAmount / project.targetAmount) * 100))
        : 0,
    [project.targetAmount, project.currentAmount],
  );

  const daysLeft = useMemo(() => computeDaysLeft(project.deadline), [project.deadline]);

  const isEnded = project.status === "CONFIRMED" || project.status === "FAILED" || daysLeft === 0;

  const handlePledge = () => {
    if (!isMember || !user) {
      setPromptOpen(true);
      return;
    }
    onPledge();
  };

  return (
    <div className="relative min-h-full animate-in slide-in-from-right bg-canvas pb-24 text-ink duration-300">
      {/* Hero Image */}
      <div className="relative overflow-hidden bg-canvas px-4 pb-8 pt-16">
        <NavHeader
          onBack={onBack}
          variant="overlay"
        />
        <div className="relative z-10 space-y-5">
          <div className="overflow-hidden rounded-xl border border-hairline/80 bg-canvas">
            <DyveImage
              src={project.image}
              alt={`${project.title} 포스터`}
              fallbackText="DYVE PROJECT"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <div className="min-w-0 px-1">
            {project.hostName && (
              <p className="mb-2 text-sm font-medium text-[var(--color-muted)]">{project.hostName}</p>
            )}
            <h1 className="mb-3 text-3xl font-bold leading-tight text-ink">
              {project.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              {project.status === "CONFIRMED" && (
                <Badge className="bg-[var(--color-success)] text-[var(--color-ink)]">목표 달성!</Badge>
              )}
              {project.status === "FAILED" && (
                <Badge className="border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  미달성 종료
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 pt-8 pb-[calc(var(--mobile-bottom-action-height)+3rem)]">
        <section className="mb-8 border-y border-hairline py-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-2xl font-bold text-ink">{progress}%</span>
            <span className="text-sm font-semibold text-[var(--color-muted)]">
              {project.currentAmount.toLocaleString()}원 모금
            </span>
          </div>
          <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className={`h-full rounded-full transition-colors duration-700 ${
                project.status === "CONFIRMED" ? "bg-[var(--color-success)]" : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <dl className="divide-y divide-hairline text-sm">
            {[
              ["현재 모금액", `${project.currentAmount.toLocaleString()}원`],
              ["목표 금액", `${project.targetAmount.toLocaleString()}원`],
              ["남은 기간", daysLeft !== null ? `${daysLeft}일` : "정보 없음"],
              ["후원자", project.pledgeCount !== null && project.pledgeCount !== undefined ? `${project.pledgeCount}명` : "-"],
              ["마감일", formatDeadline(project.deadline)],
              ["최소 후원", `${project.minPledgeAmount.toLocaleString()}원`],
              ...(project.hostName ? [["만든 사람", project.hostName]] : []),
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-4 py-3">
                <dt className="text-[var(--color-muted)]">{label}</dt>
                <dd className="text-right font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Description */}
        <section className="mb-10 border-b border-hairline pb-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <DyveIcon name="info" size="md" tone="primary" className="h-5 w-5" /> 응원 소개
          </h2>
          {project.description ? (
            <p data-user-content className="text-sm leading-relaxed text-[var(--color-body)]">
              {project.description}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">설명이 없습니다.</p>
          )}
        </section>

        {/* Rewards */}
        {project.rewards.length > 0 && (
          <section className="mb-10 border-b border-hairline pb-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <DyveIcon name="gift" size="md" tone="primary" className="h-5 w-5" /> 혜택
            </h2>
            <p className="mb-5 text-sm leading-6 text-[var(--color-muted)]">
              후원 금액에 따라 받을 수 있는 혜택을 한눈에 비교해 보세요.
            </p>
            <div className="divide-y divide-hairline border-y border-hairline">
              {project.rewards.map((reward: Reward) => (
                <div
                  key={reward.id}
                  className="py-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-lg font-bold text-ink">
                      {reward.price.toLocaleString()}원
                    </span>
                    {reward.quantityLimit && (
                      <Badge
                        variant="outline"
                        className="border-hairline text-[var(--color-muted)] text-xs"
                      >
                        {reward.quantityLimit}개 한정
                      </Badge>
                    )}
                  </div>
                  <h3 className="mb-1 font-semibold text-ink">{reward.title}</h3>
                  {reward.description && (
                    <p className="text-sm text-[var(--color-muted)]">{reward.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Funding notice */}
        <div className="mb-6 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4">
          <div className="flex items-start gap-2">
            <DyveIcon name="sparkles" size="sm" tone="primary" className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              마감일까지 목표 금액을 달성한 경우에만 혜택이 제공되며, 미달성 시 전액
              환불됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Fixed Button */}
      <div className="mobile-fixed-bar app-bottom-bar border-t p-4 pb-8">
        <Button
          onClick={handlePledge}
          disabled={isEnded}
          className={`w-full rounded-xl py-6 text-lg font-bold ${
            isEnded
              ? "bg-surface-muted text-[var(--color-muted)]"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isEnded
            ? project.status === "CONFIRMED"
              ? "목표 달성 완료"
              : "응원 종료"
            : "후원하기"}
        </Button>
      </div>

      <LoginPromptDialog
        open={isPromptOpen}
        onOpenChange={setPromptOpen}
        title="로그인 필요"
        description="로그인 후 후원할 수 있어요."
        confirmLabel="로그인하기"
        onConfirm={() => navigate("/my")}
      />
    </div>
  );
}
