import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

export type HorizontalRailIndicator = "track" | "pages";

interface HorizontalRailProps {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  indicator?: HorizontalRailIndicator;
}

type RailState = {
  overflow: boolean;
  size: number;
  offset: number;
  activeIndex: number;
  pageCount: number;
};

const DRAG_CLICK_THRESHOLD_PX = 8;

const nearestItemIndex = (rail: HTMLDivElement) => {
  const railCenter = rail.getBoundingClientRect().left + rail.clientWidth / 2;
  let activeIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  Array.from(rail.children).forEach((item, index) => {
    const rect = item.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - railCenter);
    if (distance < closestDistance) {
      activeIndex = index;
      closestDistance = distance;
    }
  });
  return activeIndex;
};

export function HorizontalRail({
  ariaLabel,
  children,
  className = "",
  contentClassName = "",
  indicator = "track",
}: HorizontalRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ pointerId: -1, startX: 0, startScrollLeft: 0, moved: false });
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<RailState>({
    overflow: false,
    size: 100,
    offset: 0,
    activeIndex: 0,
    pageCount: 0,
  });

  const updateState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const items = Array.from(rail.children) as HTMLElement[];
    const maxScroll = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    const size = rail.scrollWidth > 0 ? Math.min(100, (rail.clientWidth / rail.scrollWidth) * 100) : 100;
    setState({
      overflow: maxScroll > 1,
      size,
      offset: maxScroll > 0 ? (rail.scrollLeft / maxScroll) * (100 - size) : 0,
      activeIndex: nearestItemIndex(rail),
      pageCount: items.length,
    });
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    updateState();
    const observer = new ResizeObserver(updateState);
    observer.observe(rail);
    for (const child of rail.children) observer.observe(child);
    return () => observer.disconnect();
  }, [children, updateState]);

  const scrollToPage = (index: number, behavior: ScrollBehavior = "smooth") => {
    const rail = railRef.current;
    const item = rail?.children.item(index) as HTMLElement | null;
    if (!rail || !item) return;
    const left = item.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft;
    rail.scrollTo({
      left: Math.min(Math.max(rail.scrollWidth - rail.clientWidth, 0), Math.max(0, left)),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : behavior,
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const rail = railRef.current;
    if (!rail) return;
    if (indicator === "pages") {
      const direction = event.key === "ArrowRight" ? 1 : -1;
      scrollToPage(Math.min(state.pageCount - 1, Math.max(0, state.activeIndex + direction)));
      return;
    }
    const maxScroll = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    const step = Math.max(rail.clientWidth * 0.85, 1);
    const target = rail.scrollLeft + (event.key === "ArrowRight" ? step : -step);
    rail.scrollTo({ left: Math.min(maxScroll, Math.max(0, target)), behavior: "auto" });
    updateState();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (event.pointerType !== "mouse" || event.button !== 0 || !rail || rail.scrollWidth <= rail.clientWidth) return;
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: rail.scrollLeft,
      moved: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    const drag = dragState.current;
    if (!rail || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > DRAG_CLICK_THRESHOLD_PX) {
      drag.moved = true;
      setIsDragging(true);
      try {
        rail.setPointerCapture(event.pointerId);
      } catch {
        // The pointer may already have been released outside the rail.
      }
    }
    if (drag.moved) {
      event.preventDefault();
      rail.scrollLeft = drag.startScrollLeft - dx;
    }
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    const drag = dragState.current;
    if (!rail || drag.pointerId !== event.pointerId) return;
    dragState.current = { ...drag, pointerId: -1 };
    setIsDragging(false);
    if (!drag.moved) return;
    suppressClickRef.current = true;
    scrollToPage(nearestItemIndex(rail));
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const suppressDraggedClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  return (
    <div
      className={className}
      data-horizontal-rail
      data-rail-indicator={indicator}
      data-rail-overflow={state.overflow ? "true" : "false"}
      data-active-index={state.activeIndex}
      data-page-count={state.pageCount}
      data-dragging={isDragging ? "true" : "false"}
    >
      <div
        ref={railRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={state.overflow ? 0 : -1}
        onScroll={updateState}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={suppressDraggedClick}
        onDragStart={(event) => event.preventDefault()}
        className={`no-scrollbar flex w-full flex-nowrap gap-4 overflow-x-auto overscroll-x-contain px-1 pb-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${isDragging ? "cursor-grabbing select-none" : "cursor-grab snap-x snap-mandatory"} ${contentClassName}`}
        style={{ touchAction: "pan-x pan-y" }}
      >
        {children}
      </div>
      {state.overflow && indicator === "track" && (
        <div className="mx-1 h-1 overflow-hidden rounded-full bg-[var(--color-hairline)]" aria-hidden="true" data-rail-track>
          <div
            className="h-full rounded-full bg-[var(--color-muted)] transition-[width,left] duration-150"
            style={{ left: `${state.offset}%`, width: `${state.size}%`, position: "relative" }}
          />
        </div>
      )}
      {state.overflow && indicator === "pages" && state.pageCount > 1 && (
        state.pageCount <= 8 ? (
          <div className="flex items-center justify-center gap-1" role="group" aria-label={`${ariaLabel} 페이지`} data-rail-pages>
            <button type="button" aria-label="이전 사진" disabled={state.activeIndex === 0} onClick={() => scrollToPage(state.activeIndex - 1)} className="size-9 rounded-full text-[var(--color-muted)] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">←</button>
            {Array.from({ length: state.pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`${state.pageCount}개 중 ${index + 1}번째 카드`}
                aria-current={state.activeIndex === index ? "true" : undefined}
                onClick={() => scrollToPage(index)}
                className="flex size-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)]"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-150 ${
                    state.activeIndex === index
                      ? "w-5 bg-[var(--color-primary)]"
                      : "w-1.5 bg-[var(--color-hairline-strong)]"
                  }`}
                />
              </button>
            ))}
            <button type="button" aria-label="다음 사진" disabled={state.activeIndex === state.pageCount - 1} onClick={() => scrollToPage(state.activeIndex + 1)} className="size-9 rounded-full text-[var(--color-muted)] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">→</button>
          </div>
        ) : (
          <p className="ty-caption text-center font-semibold text-[var(--color-muted)]" aria-live="polite" data-rail-counter>
            <span className="text-[var(--color-ink)]">{state.activeIndex + 1}</span> / {state.pageCount}
          </p>
        )
      )}
    </div>
  );
}
