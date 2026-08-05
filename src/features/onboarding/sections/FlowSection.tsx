import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import logoImage from "../../../assets/dyve-logo-compact-red.svg";

const STEPS = [
  {
    title: "발견과 매칭",
    body: "공간, 콘텐츠와 참여자의 조건과 취향을 바탕으로 행사에 적합한 조합과 기회를 만듭니다.",
  },
  {
    title: "계약과 정산",
    body: "행사의 목적과 역할, 일정과 비용, 책임 범위를 계약으로 확정하고, 현장 운영부터 정산까지 투명하게 관리합니다.",
  },
  {
    title: "예매와 만남",
    body: "예매와 입장의 경험이 같은 취향을 가진 참여자들과의 만남으로 이어지고, 그 경험이 다음 행사로 반복됩니다.",
  },
];

const RIPPLE_SIZES = [110, 190, 280];
const GLYPH_RING_SIZES = [16, 27, 38];

/** 한 번의 연결(물방울)이 파동으로 퍼진다 — 단계가 갈수록 링이 하나씩 늘어난다. */
function RippleGlyph({ rings }: { rings: number }) {
  return (
    <span className="relative inline-flex h-11 w-11 items-center justify-center" aria-hidden="true">
      <span className="absolute h-2 w-2 rounded-full bg-[var(--color-primary)]" />
      {GLYPH_RING_SIZES.slice(0, rings).map((size) => (
        <span
          key={size}
          className="absolute rounded-full border border-white/32"
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}

/** 풍덩 — 물방울이 떨어지고, DYVE 스플래시 마크가 터지며, 파동이 퍼진다. 1회 재생. */
function SplashMoment({ play, reduceMotion }: { play: boolean; reduceMotion: boolean }) {
  if (reduceMotion) {
    return (
      <div className="relative mx-auto flex h-[280px] w-full max-w-[320px] items-center justify-center">
        <span className="absolute h-[120px] w-[120px] rounded-full border border-white/18" aria-hidden="true" />
        <span className="absolute h-[200px] w-[200px] rounded-full border border-white/10" aria-hidden="true" />
        <img src={logoImage} alt="" aria-hidden="true" className="w-24 object-contain brightness-0 invert" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-[280px] w-full max-w-[320px] items-center justify-center">
      <motion.span
        className="absolute h-3.5 w-3.5 rounded-full bg-white"
        initial={{ y: -170, opacity: 0 }}
        animate={play ? { y: 0, opacity: [0, 1, 1, 0] } : undefined}
        transition={{
          y: { duration: 0.55, ease: [0.55, 0, 1, 0.45] },
          opacity: { duration: 0.62, times: [0, 0.2, 0.85, 1] },
        }}
        aria-hidden="true"
      />

      {RIPPLE_SIZES.map((size, index) => (
        <motion.span
          key={size}
          className="absolute rounded-full border border-white/45"
          style={{ width: size, height: size }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={play ? { scale: 1.12, opacity: [0, 0.5, 0] } : undefined}
          transition={{ delay: 0.52 + index * 0.16, duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        />
      ))}

      <motion.span
        className="absolute h-[120px] w-[120px] rounded-full border border-white/18"
        initial={{ opacity: 0 }}
        animate={play ? { opacity: 1 } : undefined}
        transition={{ delay: 1.15, duration: 0.5 }}
        aria-hidden="true"
      />
      <motion.span
        className="absolute h-[200px] w-[200px] rounded-full border border-white/10"
        initial={{ opacity: 0 }}
        animate={play ? { opacity: 1 } : undefined}
        transition={{ delay: 1.3, duration: 0.5 }}
        aria-hidden="true"
      />

      <motion.img
        src={logoImage}
        alt=""
        aria-hidden="true"
        className="w-24 object-contain brightness-0 invert"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={play ? { scale: 1, opacity: 1 } : undefined}
        transition={{ delay: 0.5, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function FlowSection() {
  const reduceMotion = useReducedMotion() ?? false;
  const splashRef = useRef<HTMLDivElement>(null);
  const splashInView = useInView(splashRef, { once: true, amount: 0.45 });

  const reveal = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.5 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section data-onboarding-theme="ink" className="px-7 text-white">
      <div ref={splashRef} className="flex min-h-[92dvh] flex-col items-center justify-center text-center">
        <SplashMoment play={splashInView} reduceMotion={reduceMotion} />
        <motion.h2
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={splashInView ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: reduceMotion ? 0 : 1.0, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 break-keep text-[24px] font-bold leading-[1.35] [font-family:var(--font-display)]"
        >
          발견에서 정산까지,
          <br />
          하나의 흐름으로.
        </motion.h2>
      </div>

      {STEPS.map((step, index) => (
        <motion.div key={step.title} {...reveal()} className="py-10">
          <RippleGlyph rings={index + 1} />
          <h3 className="mt-4 break-keep text-[22px] font-bold leading-tight">{step.title}</h3>
          <p className="mt-3 max-w-[26rem] break-keep text-[15px] leading-7 text-white/84">{step.body}</p>
        </motion.div>
      ))}

      <motion.p
        {...reveal()}
        className="max-w-[26rem] break-keep pb-28 pt-14 text-[22px] font-bold leading-[1.5]"
      >
        한 번의 연결을 <span className="text-[var(--color-primary)]">반복 가능한 문화 경험</span>으로
        만듭니다.
      </motion.p>
    </section>
  );
}
