import { useEffect, useRef, useState } from "react";
import { motion, useScroll } from "motion/react";
import { DiveHeroSection } from "./sections/DiveHeroSection";
import { ProblemSection } from "./sections/ProblemSection";
import { FlowSection } from "./sections/FlowSection";
import { RoleSection } from "./sections/RoleSection";

type OnboardingTheme = "red" | "ink" | "light";

const THEME_BACKGROUND: Record<OnboardingTheme, string> = {
  red: "#FF4A4A",
  ink: "#1B1B1F",
  light: "#FFFFFF",
};

export function OnboardingFlow() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const roleSectionRef = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<OnboardingTheme>("red");

  const { scrollYProgress } = useScroll({ container: scrollerRef });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const sections = Array.from(scroller.querySelectorAll<HTMLElement>("[data-onboarding-theme]"));
    // 화면 세로 중앙을 지나는 섹션의 테마를 채택한다.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const nextTheme = (entry.target as HTMLElement).dataset.onboardingTheme as OnboardingTheme | undefined;
          if (nextTheme) setTheme(nextTheme);
        }
      },
      { root: scroller, rootMargin: "-46% 0px -46% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const onDark = theme !== "light";

  const handleSkip = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    roleSectionRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <div
      className="relative h-full w-full font-sans transition-colors duration-700 ease-out motion-reduce:transition-none"
      style={{ backgroundColor: THEME_BACKGROUND[theme] }}
    >
      <motion.div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 z-30 h-[3px] origin-left transition-colors duration-700 ${
          onDark ? "bg-white" : "bg-[var(--color-primary)]"
        }`}
        style={{ scaleX: scrollYProgress }}
      />

      <button
        type="button"
        onClick={handleSkip}
        aria-label="온보딩 건너뛰고 역할 선택으로 이동"
        className={`ty-micro absolute right-5 top-[max(1.1rem,env(safe-area-inset-top))] z-30 rounded-[var(--radius-pill)] border px-3 py-1.5 font-bold uppercase backdrop-blur-md transition-all duration-500 ${
          onDark
            ? "border-white/36 bg-black/20 text-white hover:border-white"
            : "pointer-events-none opacity-0"
        }`}
      >
        건너뛰기
      </button>

      <div ref={scrollerRef} className="h-full overflow-y-auto overscroll-contain">
        <DiveHeroSection />
        <ProblemSection />
        <FlowSection />
        <RoleSection ref={roleSectionRef} />
      </div>
    </div>
  );
}
