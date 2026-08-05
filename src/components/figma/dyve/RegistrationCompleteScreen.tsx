import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { DyveIcon } from "./DyveIcon";

interface RegistrationCompleteScreenProps {
  type: "performance" | "artist" | "venue" | "project";
  onConfirm: () => void;
}

export function RegistrationCompleteScreen({ type, onConfirm }: RegistrationCompleteScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const getContent = () => {
    switch (type) {
      case "performance":
        return {
          title: "공연 등록 완료",
          message: "새로운 공연이 등록됐어요.\n티켓 오픈 준비가 시작돼요."
        };
      case "artist":
        return {
          title: "프로필 생성 요청 완료",
          message: "아티스트 프로필 검토 요청이 접수됐어요.\n운영팀 승인 후 네트워킹 화면에 공개됩니다."
        };
      case "venue":
        return {
          title: "베뉴 등록 요청 완료",
          message: "베뉴 정보와 사업자 서류가 접수됐어요.\n운영팀 확인 후 제안과 계약을 진행할 수 있습니다."
        };
      case "project":
        return {
          title: "창작 후원 등록 완료",
          message: "새로운 후원 프로젝트가 등록됐어요.\n공연 목록에서 진행 현황을 확인할 수 있습니다."
        };
      default:
        return {
          title: "등록 완료",
          message: "요청한 작업이 완료됐어요."
        };
    }
  };

  const content = getContent();

  return (
    <div className="flex min-h-full w-full flex-1 flex-col items-center justify-center bg-[var(--color-canvas)] px-6 py-12 text-[var(--color-ink)] animate-in fade-in duration-300">
      <div className={`flex w-full max-w-md flex-col items-center space-y-8 text-center transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
        <div className="relative">
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)]">
            <DyveIcon name="check" size="lg" className="h-16 w-16 text-[var(--color-primary)] animate-in zoom-in duration-500 delay-150" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 -z-10 rounded-full bg-[var(--color-primary)]/10 blur-2xl" />
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-[var(--color-ink)]">{content.title}</h2>
          <p className="whitespace-pre-line text-base font-medium leading-7 text-[var(--color-body)]">
            {content.message}
          </p>
        </div>

        <div className="w-full max-w-xs pt-6">
          <Button
            onClick={onConfirm}
            size="lg"
            className="h-14 w-full rounded-[var(--radius-pill)] bg-[var(--color-primary)] text-lg font-bold text-[var(--color-on-primary)] shadow-[0_0_20px_rgba(255,74,74,0.18)] hover:bg-[var(--color-primary-active)]"
          >
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}
