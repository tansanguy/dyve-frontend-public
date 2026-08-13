import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { api, formatApiError } from "../services/api";

export function EventAccessInvitePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.acceptEventAccessInvite(token)
      .then((result) => navigate(result.role === "staff" ? `/checkin?event=${result.eventId}` : `/events/${result.eventId}/guests`, { replace: true }))
      .catch((reason) => setError(formatApiError(reason, "초대 링크를 사용할 수 없어요.")));
  }, [navigate, token]);
  return <main className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] p-6 text-center text-[var(--color-ink)]">{error ? <div><p className="break-keep">{error}</p><button onClick={() => navigate("/my/events/edit")} className="mt-4 rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-bold text-[var(--color-on-primary)]">행사 운영으로 이동</button></div> : <div><LoadingIndicator /><p className="mt-3 text-sm text-[var(--color-muted)]">행사 운영 권한을 연결하고 있어요.</p></div>}</main>;
}
