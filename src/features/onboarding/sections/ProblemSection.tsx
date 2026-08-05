import { motion, useReducedMotion, type Variants } from "motion/react";

const PROCESS_CHIPS = [
  { label: "기획과 조건 협의", offset: "ml-0", tilt: "-rotate-2" },
  { label: "계약", offset: "ml-24", tilt: "rotate-1" },
  { label: "홍보와 예매", offset: "ml-8", tilt: "rotate-2" },
  { label: "현장 준비", offset: "ml-32", tilt: "-rotate-1" },
  { label: "입장 관리", offset: "ml-3", tilt: "rotate-1" },
  { label: "비용 정산", offset: "ml-20", tilt: "-rotate-2" },
];

const PAIN_POINTS = [
  { role: "공간", text: "콘텐츠를 찾아도, 운영할 인력이 부족합니다." },
  { role: "콘텐츠", text: "무대를 원해도, 계약과 정산이 불확실합니다." },
  { role: "참여자", text: "취향에 맞는 행사를 발견하기 어렵습니다." },
];

const scatterContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};

const scatterItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export function ProblemSection() {
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
    <section data-onboarding-theme="ink" className="px-7 text-white">
      {/* 비트 1 — 헤드라인 */}
      <motion.div {...reveal()} className="pb-14 pt-28">
        <h2 className="break-keep text-[23px] font-bold leading-[1.4] [font-family:var(--font-display)]">
          행사는 연결만으로
          <br />
          완성되지 않습니다.
        </h2>
      </motion.div>

      {/* 비트 2 — 흩어진 과정들 */}
      <motion.div
        className="flex flex-col py-10"
        initial={reduceMotion ? undefined : "hidden"}
        whileInView={reduceMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.45 }}
        variants={reduceMotion ? undefined : scatterContainer}
      >
        <motion.p
          variants={reduceMotion ? undefined : scatterItem}
          className="break-keep text-[18px] font-bold leading-[1.5]"
        >
          문화행사에는 더 많은 과정이 필요합니다.
        </motion.p>

        <div className="mt-8 flex max-w-[22rem] flex-col items-start gap-3" aria-label="문화행사에 필요한 과정들">
          {PROCESS_CHIPS.map((chip) => (
            <motion.span
              key={chip.label}
              variants={reduceMotion ? undefined : scatterItem}
              className={`${chip.offset} ${chip.tilt} rounded-[var(--radius-pill)] border border-white/28 bg-white/[0.05] px-4 py-2 text-[14px] font-semibold text-white/90`}
            >
              {chip.label}
            </motion.span>
          ))}
        </div>

        <motion.p
          variants={reduceMotion ? undefined : scatterItem}
          className="mt-9 max-w-[22rem] break-keep text-[18px] font-bold leading-[1.55]"
        >
          이 과정이 <span className="text-[var(--color-primary)]">흩어져 있으면</span>, 좋은 아이디어도 행사가
          되지 못합니다.
        </motion.p>
      </motion.div>

      {/* 비트 3~5 — 역할별 문제 */}
      {PAIN_POINTS.map((point) => (
        <motion.div key={point.role} {...reveal()} className="py-9">
          <p className="text-[15px] font-bold text-[var(--color-primary)]">{point.role}</p>
          <p className="mt-2.5 max-w-[24rem] break-keep text-[19px] font-bold leading-[1.5]">{point.text}</p>
        </motion.div>
      ))}

      {/* 비트 6 — 전환 선언 */}
      <motion.div {...reveal()} className="pb-28 pt-14">
        <p className="max-w-[24rem] break-keep text-[20px] font-bold leading-[1.5]">
          DYVE는 소개에서 멈추지 않고,{" "}
          <span className="text-[var(--color-primary)]">행사가 끝나는 순간까지</span> 연결합니다.
        </p>
      </motion.div>
    </section>
  );
}
