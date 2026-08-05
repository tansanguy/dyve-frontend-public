import logoImage from "../../assets/dyve-logo-compact-red.svg";

export function OnboardingFeaturedSlide({ onAction }: { onAction?: () => void }) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-white text-[var(--color-ink)]">
      <span className="ty-micro absolute left-5 top-5 rounded-[var(--radius-pill)] border border-[var(--color-primary)] px-3 py-1 font-bold text-[var(--color-primary)]">
        DYVE 소개
      </span>

      <img
        src={logoImage}
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-[36%] w-44 -translate-x-1/2 -translate-y-1/2 object-contain"
      />

      <div className="absolute inset-x-0 bottom-0 p-6">
        <h2 className="text-[30px] font-bold leading-none [font-family:var(--font-display)]">About DYVE</h2>
        <p className="mt-2.5 break-keep text-[15px] font-bold leading-6 text-[var(--color-body)]">
          재밌는 것은 어디에서나
        </p>
        <button type="button" onClick={onAction} className="mt-4 inline-flex h-11 items-center rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-5 text-[14px] font-bold text-[var(--color-on-primary)]">
          지금 확인하기
        </button>
      </div>
    </div>
  );
}
