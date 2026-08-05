import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isAdminUser } from "../utils/auth";
import { Button } from "./figma/ui/button";
import { DyveIcon } from "./figma/dyve/DyveIcon";
import { RequireMember } from "./RequireMember";

interface RequireAdminProps {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const navigate = useNavigate();
  const { isMember, user } = useAuth();

  if (!isMember) {
    return (
      <RequireMember
        title="운영자 화면은 로그인이 필요해요"
        description="운영 도구와 관리 데이터를 보려면 먼저 로그인해 주세요."
      >
        {children}
      </RequireMember>
    );
  }

  if (isAdminUser(user)) return <>{children}</>;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-canvas)] px-6 py-5 text-[var(--color-ink)]">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex h-10 w-fit items-center gap-2 rounded-full px-2 text-sm font-semibold text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
      >
        <DyveIcon name="arrow-left" size="sm" tone="muted" className="h-4 w-4" />
        뒤로가기
      </button>

      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-[300px] rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-7 text-center shadow-[var(--shadow-card-soft)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
            <DyveIcon name="shield-alert" size="lg" tone="primary" className="h-6 w-6" />
          </div>
          <h1 className="break-keep text-lg font-bold leading-snug">운영자 권한이 필요해요</h1>
          <p className="mx-auto mt-2 max-w-[250px] break-keep text-sm leading-6 text-[var(--color-muted)]">
            DYVE 운영 도구는 관리자 계정으로만 접근할 수 있어요.
          </p>
          <Button
            onClick={() => navigate("/my")}
            className="mt-6 h-12 w-full rounded-[var(--radius-button-md)] bg-[var(--color-primary)] text-sm font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
          >
            마이페이지로 이동
          </Button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-3 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
