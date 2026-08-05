import { motion, useReducedMotion } from "motion/react";
import logoImage from "../../../assets/dyve-logo-compact-red.svg";

const DECLARATION_LINES = [
  { lead: "공간", rest: "에는 원하는 양질의 콘텐츠를," },
  { lead: "콘텐츠 제공자", rest: "에게는 간편함과 신뢰를," },
  { lead: "참여자", rest: "에게는 개선된 경험과 남는 네트워크를." },
];

export function DiveHeroSection() {
  const reduceMotion = useReducedMotion();

  const reveal = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.6 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section data-onboarding-theme="red" className="px-7 text-white">
      {/* 비트 1 — 로고 + 브랜드 선언만 */}
      <div className="relative flex min-h-[100dvh] flex-col justify-center pb-20 pt-16">
        <motion.img
          src={logoImage}
          alt="DYVE"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-24 object-contain brightness-0 invert"
        />

        <h1 className="mt-10 break-keep text-[23px] font-bold leading-[1.45] [font-family:var(--font-display)]">
          {DECLARATION_LINES.map((line, index) => (
            <span key={line.lead} className="block overflow-hidden">
              <motion.span
                className="block"
                initial={reduceMotion ? false : { y: "112%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.75, delay: 0.3 + index * 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="text-[#1F1F1F]">{line.lead}</span>
                {line.rest}
              </motion.span>
            </span>
          ))}
        </h1>

        {!reduceMotion && (
          <div className="absolute bottom-8 left-1/2 h-12 w-px -translate-x-1/2 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-0 bg-white/25" />
            <motion.div
              className="absolute left-0 top-0 h-5 w-px bg-white"
              animate={{ y: [-20, 48] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
            />
          </div>
        )}
      </div>

      {/* 비트 2 — 플랫폼 정의 한 문장 */}
      <motion.div {...reveal()} className="py-12">
        <p className="max-w-[24rem] break-keep text-[18px] font-bold leading-[1.6]">
          검증된 공간과 콘텐츠를 연결하고, 계약부터 정산까지 완결하는 문화행사 운영 플랫폼.
        </p>
      </motion.div>

      {/* 비트 3 — 약속 한 문장 */}
      <motion.div {...reveal()} className="pb-24 pt-4">
        <p className="max-w-[24rem] break-keep text-[18px] font-bold leading-[1.6]">
          좋은 만남이 한 번의 행사로 끝나지 않도록 연결합니다.
        </p>
      </motion.div>
    </section>
  );
}
