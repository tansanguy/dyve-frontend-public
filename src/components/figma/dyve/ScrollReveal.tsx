import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../ui/utils";

type RevealVariant = "rise" | "pop" | "slide-left" | "slide-right" | "fade";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  once?: boolean;
  rootMargin?: string;
  style?: CSSProperties;
  threshold?: number;
  variant?: RevealVariant;
};

export function ScrollReveal({
  children,
  className,
  delayMs = 0,
  once = true,
  rootMargin = "0px 0px 16% 0px",
  style,
  threshold = 0.08,
  variant = "rise",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const element = node;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const scrollRoot = element.closest("main");
    const rootElement = scrollRoot instanceof Element ? scrollRoot : null;

    let observer: IntersectionObserver | null = null;

    const removeScrollListener = () => {
      if (rootElement) {
        rootElement.removeEventListener("scroll", revealIfReached);
        return;
      }
      window.removeEventListener("scroll", revealIfReached);
    };

    const reveal = () => {
      setIsVisible(true);
      if (once) {
        observer?.disconnect();
        removeScrollListener();
      }
    };

    function revealIfReached() {
      const nodeRect = element.getBoundingClientRect();
      const rootRect = rootElement?.getBoundingClientRect();
      const rootTop = rootRect?.top ?? 0;
      const rootBottom = rootRect?.bottom ?? window.innerHeight;
      const isIntersectingRoot = nodeRect.top < rootBottom && nodeRect.bottom > rootTop;
      const hasPassedRoot = nodeRect.bottom < rootTop;

      if (isIntersectingRoot || hasPassedRoot) {
        reveal();
      }
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        const rootTop = entry.rootBounds?.top ?? 0;
        const hasPassedViewport = entry.boundingClientRect.bottom < rootTop;

        if (entry.isIntersecting || hasPassedViewport) {
          reveal();
          return;
        }

        if (!once) {
          setIsVisible(false);
        }
      },
      {
        root: rootElement,
        rootMargin,
        threshold,
      },
    );

    observer.observe(element);
    if (rootElement) {
      rootElement.addEventListener("scroll", revealIfReached, { passive: true });
    } else {
      window.addEventListener("scroll", revealIfReached, { passive: true });
    }
    revealIfReached();

    return () => {
      observer?.disconnect();
      removeScrollListener();
    };
  }, [once, rootMargin, threshold]);

  const revealStyle = {
    ...style,
    "--dyve-reveal-delay": `${delayMs}ms`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={cn("dyve-scroll-reveal", `dyve-scroll-reveal--${variant}`, className)}
      data-visible={isVisible ? "true" : "false"}
      style={revealStyle}
    >
      {children}
    </div>
  );
}
