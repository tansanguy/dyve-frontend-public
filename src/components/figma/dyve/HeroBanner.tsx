import { Badge } from "../ui/badge";
import { DyveImage } from "./DyveImage";

interface HeroBannerProps {
  image: string;
  title: string;
  isFeatured?: boolean;
  isDyvePick?: boolean;
  categoryLabel?: string;
  onAction?: () => void;
}

export function HeroBanner({
  image,
  title,
  isFeatured = false,
  isDyvePick = false,
  categoryLabel,
  onAction,
}: HeroBannerProps) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card-lg)] bg-[var(--color-ink)] text-white">
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <DyveImage
          src={image}
          alt={title}
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/42 to-black/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_8%,rgba(255,74,74,0.32),transparent_34%),radial-gradient(circle_at_12%_24%,rgba(206,175,191,0.22),transparent_28%)]" />
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          {isFeatured ? (
            <Badge
              variant="secondary"
              className="ty-micro rounded-[var(--radius-pill)] bg-white/12 px-3 py-1 font-semibold text-white shadow-[0_0_24px_rgba(255,74,74,0.20)] backdrop-blur"
            >
              {categoryLabel ?? "FEATURED"}
            </Badge>
          ) : null}
          {isDyvePick ? (
            <Badge
              variant="secondary"
              className="ty-micro rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-3 py-1 font-semibold text-white"
            >
              DYVE PICK
            </Badge>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 p-5">
          <h2 className="max-w-full overflow-hidden break-keep text-[30px] font-bold leading-[1.12] text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] [overflow-wrap:anywhere]">
            {title}
          </h2>
          <button type="button" onClick={onAction} className="mt-5 flex h-11 w-full items-center justify-center rounded-[18px] bg-[var(--color-primary)] text-sm font-semibold text-white shadow-[0_0_28px_rgba(255,74,74,0.24)]">
            상세 보기
          </button>
        </div>
      </div>
    </div>
  );
}
