import { forwardRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { useAuth } from "../../../contexts/AuthContext";
import type { OnboardingRoleId } from "../../../constants/onboarding";
import { storePendingOnboardingRole, syncPendingOnboardingRole } from "../roleSync";

const ROLE_CARDS: Array<{
  id: OnboardingRoleId;
  title: string;
  description: string;
  ctaLabel: string;
  path: string;
  requiresLogin: boolean;
}> = [
  {
    id: "venue",
    title: "공간과 행사를 운영하고 싶어요",
    description: "공간을 활성화하거나 아이디어를 실제 문화행사로 만들고 싶어요.",
    ctaLabel: "행사 시작하기",
    path: "/register/venue",
    requiresLogin: true,
  },
  {
    id: "content_provider",
    title: "콘텐츠 파트너로 참여하고 싶어요",
    description: "음악, DJ, 미술, 강연, 워크숍 등 현장 콘텐츠를 제공하고 싶어요.",
    ctaLabel: "파트너 지원하기",
    path: "/register/artist",
    requiresLogin: true,
  },
  {
    id: "participant",
    title: "새로운 문화행사를 발견하고 싶어요",
    description: "내 취향에 맞는 행사에 참여하고 새로운 경험을 만나고 싶어요.",
    ctaLabel: "행사 둘러보기",
    path: "/",
    requiresLogin: false,
  },
];

const SELECT_TRANSITION_MS = 320;

export const RoleSection = forwardRef<HTMLElement>(function RoleSection(_, ref) {
  const navigate = useNavigate();
  const { isMember } = useAuth();
  const reduceMotion = useReducedMotion();
  const [selectedRole, setSelectedRole] = useState<OnboardingRoleId | null>(null);

  const handleSelect = (card: (typeof ROLE_CARDS)[number]) => {
    setSelectedRole(card.id);
    storePendingOnboardingRole(card.id);

    window.setTimeout(() => {
      if (card.requiresLogin && !isMember) {
        navigate("/my", { state: { redirectTo: card.path } });
        return;
      }
      if (isMember) {
        void syncPendingOnboardingRole();
      }
      navigate(card.path);
    }, SELECT_TRANSITION_MS);
  };

  const reveal = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.4 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section
      ref={ref}
      data-onboarding-theme="light"
      className="flex min-h-[100dvh] flex-col justify-center px-7 py-20 text-[var(--color-ink)]"
    >
      <motion.h2 {...reveal()} className="break-keep text-[24px] font-bold leading-[1.35] [font-family:var(--font-display)]">
        DYVE에 어떤 방식으로
        <br />
        참여할까요?
      </motion.h2>

      <div className="mt-8 grid gap-3.5">
        {ROLE_CARDS.map((card, index) => {
          const isActive = selectedRole === card.id;
          const isDimmed = selectedRole !== null && !isActive;
          return (
            <motion.button
              key={card.id}
              {...reveal(0.08 + index * 0.08)}
              type="button"
              onClick={() => handleSelect(card)}
              aria-label={card.ctaLabel}
              className={`w-full rounded-[var(--radius-card-lg)] border p-5 text-left transition-all duration-300 ease-out ${
                isActive
                  ? "scale-[1.02] border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                  : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)]"
              } ${isDimmed ? "scale-[0.97] opacity-45" : ""}`}
            >
              <h3 className="break-keep text-[18px] font-bold leading-tight">{card.title}</h3>
              <p className="mt-2 break-keep text-[13px] leading-6 text-[var(--color-body)]">{card.description}</p>
              <span className="mt-4 inline-flex items-center text-[14px] font-bold text-[var(--color-primary)]">
                {card.ctaLabel} →
              </span>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        {...reveal(0.32)}
        type="button"
        onClick={() => navigate("/")}
        disabled={selectedRole !== null}
        aria-label="아직 정하지 않았어요, 홈으로 가기"
        className={`mt-8 min-h-11 px-2 text-center text-[13px] font-bold text-[var(--color-muted)] underline-offset-4 transition-opacity duration-300 hover:text-[var(--color-ink)] ${
          selectedRole !== null ? "pointer-events-none opacity-0" : ""
        }`}
      >
        아직 정하지 않았어요, 홈으로 가기
      </motion.button>
    </section>
  );
});
