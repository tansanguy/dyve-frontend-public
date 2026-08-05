import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

interface FeaturedCarouselProps {
  children: ReactNode;
  autoAdvanceMs?: number;
}

const DRAG_CLICK_THRESHOLD_PX = 8;

export function FeaturedCarousel({ children, autoAdvanceMs = 5000 }: FeaturedCarouselProps) {
  const slides = useMemo(() => Children.toArray(children), [children]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dragState = useRef({ pointerId: -1, startX: 0, startScrollLeft: 0, moved: false });
  const interactedAtRef = useRef(0);

  // snap-center 기준: 뷰포트 중앙에 중심이 가장 가까운 카드가 현재 슬라이드다.
  const nearestIndex = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.children.length === 0) return 0;
    const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    Array.from(scroller.children).forEach((child, index) => {
      const el = child as HTMLElement;
      const distance = Math.abs(el.offsetLeft + el.offsetWidth / 2 - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  }, []);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const scroller = scrollerRef.current;
    const child = scroller?.children[index] as HTMLElement | undefined;
    if (!scroller || !child) return;
    const left = child.offsetLeft - (scroller.clientWidth - child.offsetWidth) / 2;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({ left, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
  }, []);

  const handleScroll = useCallback(() => {
    setActiveIndex(nearestIndex());
  }, [nearestIndex]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      // 사용자가 방금 만졌으면 이번 턴은 쉰다.
      if (Date.now() - interactedAtRef.current < autoAdvanceMs) return;
      scrollToIndex((nearestIndex() + 1) % slides.length);
    }, autoAdvanceMs);
    return () => window.clearInterval(interval);
  }, [autoAdvanceMs, nearestIndex, scrollToIndex, slides.length]);

  const markInteracted = useCallback(() => {
    interactedAtRef.current = Date.now();
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    markInteracted();
    if (event.pointerType !== "mouse") return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    const scroller = scrollerRef.current;
    if (!scroller || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > DRAG_CLICK_THRESHOLD_PX && !drag.moved) {
      drag.moved = true;
      try {
        scroller.setPointerCapture(event.pointerId);
      } catch {
        // 포인터가 이미 해제된 경우 캡처 없이 드래그를 이어간다.
      }
    }
    if (drag.moved) {
      scroller.scrollLeft = drag.startScrollLeft - dx;
    }
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    const scroller = scrollerRef.current;
    if (drag.pointerId !== event.pointerId) return;
    dragState.current = { ...drag, pointerId: -1 };
    setIsDragging(false);
    markInteracted();
    if (drag.moved && scroller) {
      scrollToIndex(nearestIndex());
    }
  };

  return (
    <div data-featured-carousel className="relative">
      <div
        data-featured-scroller
        ref={scrollerRef}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onTouchStart={markInteracted}
        onWheel={markInteracted}
        style={{ touchAction: "pan-x pan-y" }}
        className={`no-scrollbar touch-auto flex gap-3 overflow-x-auto px-6 ${
          isDragging ? "cursor-grabbing select-none" : "cursor-grab snap-x snap-mandatory"
        }`}
      >
        {slides.map((slide, index) => (
          <div
            data-featured-slide
            key={index}
            className="w-full shrink-0 snap-center overflow-hidden rounded-[var(--radius-card-lg)] shadow-[var(--shadow-card-hover)]"
          >
            {slide}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="추천 슬라이드 선택">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`${slides.length}개 중 ${index + 1}번째 슬라이드로 이동`}
              onClick={() => {
                markInteracted();
                scrollToIndex(index);
              }}
              className="group flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)]"
            >
              <span
                aria-hidden="true"
                className={`h-1.5 rounded-[var(--radius-pill)] transition-all duration-300 ease-out ${
                  index === activeIndex
                    ? "w-5 bg-[var(--color-primary)]"
                    : "w-1.5 bg-[var(--color-hairline-strong)] group-hover:bg-[var(--color-muted)]"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
