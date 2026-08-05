import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { PageState } from "../components/figma/dyve/PageState";
import { Button } from "../components/figma/ui/button";
import { Input } from "../components/figma/ui/input";
import { Textarea } from "../components/figma/ui/textarea";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError } from "../services/api";

export function BuddyDiveRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const me = await api.getMe() as Record<string, unknown>;
      const profileId = typeof me.profileId === "string" ? me.profileId : undefined;
      const requesterName = typeof me.name === "string" && me.name.trim()
        ? me.name.trim()
        : user?.nickname ?? "DYVE 회원";

      await api.createBuddyDiveRequest({
        requesterName,
        organizationName: title.trim(),
        eventGoal: content.trim(),
        metadata: {
          requestType: "buddy_dive_event_request",
          title: title.trim(),
          ...(profileId ? { profileId } : {}),
        },
      });
      setIsComplete(true);
    } catch (error) {
      setSubmitError(formatApiError(error, "신청을 접수하지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <PageState
        eyebrow="Buddy Dive"
        title="오픈 요청이 접수됐어요."
        description="DYVE 운영팀이 공연과 운영 가능 여부를 검토해 Buddy Dive가 열리면 안내할게요."
        primaryAction={{ label: "Connection으로 돌아가기", onClick: () => navigate("/connection", { replace: true }) }}
        secondaryAction={{ label: "홈으로", onClick: () => navigate("/", { replace: true }) }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] pb-10 text-[var(--color-ink)]">
      <NavHeader title="Buddy Dive 오픈 요청" />
      <main className="space-y-5 px-4 pt-3">
        <p className="ty-body-sm whitespace-pre-line leading-6 text-[var(--color-muted)]">
          {"원하는 페스티벌을 알려주세요.\nDYVE 운영팀이 검토해 Buddy Dive를 열고 신청자를 직접 매칭합니다."}
        </p>

        <div>
          <label htmlFor="buddy-dive-request-title" className="mb-2 block text-[13px] font-bold">
            제목
          </label>
          <Input
            id="buddy-dive-request-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 펜타포트 토요일 Buddy Dive 오픈 요청"
            maxLength={160}
          />
        </div>

        <div>
          <label htmlFor="buddy-dive-request-content" className="mb-2 block text-[13px] font-bold">
            내용
          </label>
          <Textarea
            id="buddy-dive-request-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="공연명과 날짜, Buddy Dive를 원하는 이유를 자유롭게 적어주세요."
            rows={8}
          />
        </div>

        {submitError && <p className="text-[13px] font-semibold text-[var(--color-error)]">{submitError}</p>}

        <Button
          className="w-full"
          disabled={!title.trim() || !content.trim() || isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting ? "접수 중..." : "오픈 요청 보내기"}
        </Button>
      </main>
    </div>
  );
}
