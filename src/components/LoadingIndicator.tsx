import { useEffect, useState } from "react";

interface LoadingIndicatorProps {
  label?: string;
  className?: string;
  context?: string;
}

const DOT_STATES = [
  [true, false, false],
  [false, true, false],
  [false, false, true],
] as const;

export function LoadingIndicator({
  label = "불러오는 중",
  className = "",
  context,
}: LoadingIndicatorProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((prev) => (prev + 1) % DOT_STATES.length);
    }, 450);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <span
      className={`inline-flex items-center text-xs text-[var(--color-muted)] ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`${context ? `${context} ` : ""}${label}`}
    >
      <span>{label}</span>
      <span className="ml-1 inline-flex items-center gap-0.5" aria-hidden="true">
        {DOT_STATES[step].map((isActive, idx) => (
          <span
            key={idx}
            className={`h-1.5 w-1.5 rounded-full bg-current transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-30"}`}
          />
        ))}
      </span>
    </span>
  );
}
