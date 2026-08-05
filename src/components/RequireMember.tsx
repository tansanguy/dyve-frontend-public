import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "./figma/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { DyveIcon } from "./figma/dyve/DyveIcon";
import { NavHeader } from "./figma/dyve/NavHeader";

interface RequireMemberProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  secondaryLink?: {
    label: string;
    to: string;
  };
}

export function RequireMember({
  children,
  title = "로그인이 필요해요",
  description = "로그인 후 이용할 수 있어요.",
  secondaryLink,
}: RequireMemberProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMember } = useAuth();
  const currentPath = `${location.pathname}${location.search}`;

  if (isMember) return <>{children}</>;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <NavHeader title={title} />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-8">
        <div className="w-full max-w-[300px] rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-7 text-center shadow-[var(--shadow-card-soft)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
            <DyveIcon name="lock" size="lg" tone="primary" className="h-6 w-6" />
          </div>
          <h1 className="break-keep text-lg font-bold leading-snug">{title}</h1>
      <p className="mx-auto mt-2 max-w-[250px] whitespace-pre-line break-keep text-sm leading-6 text-[var(--color-muted)]">
            {description}
          </p>
          <Button
            onClick={() => navigate("/my", { state: { redirectTo: currentPath } })}
            className="mt-6 h-12 w-full rounded-[var(--radius-button-md)] bg-[var(--color-primary)] text-sm font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
          >
            로그인하러 가기
          </Button>
          {secondaryLink && (
            <button
              type="button"
              onClick={() => navigate(secondaryLink.to)}
              className="mt-3 block min-h-11 w-full text-xs font-bold text-[var(--color-primary)] underline-offset-4 hover:underline"
            >
              {secondaryLink.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/")}
            className={`${secondaryLink ? "mt-0" : "mt-3"} min-h-11 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]`}
          >
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
