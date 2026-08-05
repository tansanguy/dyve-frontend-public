import { Button } from "../ui/button";
import { DyveIcon } from "./DyveIcon";
import type { GroupDiveApplication } from "../../../api/tickets";

interface PaymentCompleteScreenProps {
  onGoHome: () => void;
  mode?: "ticket" | "pledge";
  projectTitle?: string | null;
  standingEntryNumbers?: number[];
  groupDiveApplication?: GroupDiveApplication | null;
}

export function PaymentCompleteScreen({
  onGoHome,
  mode = "ticket",
  projectTitle = null,
  standingEntryNumbers = [],
  groupDiveApplication = null,
}: PaymentCompleteScreenProps) {
  const hasStandingNumbers = standingEntryNumbers.length > 0;
  const standingNumberMessage =
    standingEntryNumbers.length === 1
      ? `입장번호는 ${standingEntryNumbers[0]}번이에요`
      : `입장번호는 ${standingEntryNumbers.join(", ")}번이에요`;
  const isPledge = mode === "pledge";
  const isGroupDive = Boolean(groupDiveApplication);
  const title = isPledge
    ? "후원이 완료됐어요"
    : isGroupDive
      ? "Group Dive 신청이 완료됐어요"
      : "결제가 완료됐어요";
  const description = isPledge
    ? projectTitle
      ? `${projectTitle} 후원이 반영됐어요.`
      : "후원이 반영됐어요."
    : isGroupDive
      ? "제출한 신청정보와 결제가 정상적으로 반영됐어요."
      : "티켓 예매가 완료됐어요.";
  const genderLabel =
    groupDiveApplication?.gender === "female"
      ? "여성"
      : groupDiveApplication?.gender === "male"
        ? "남성"
        : "기타";

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[var(--color-canvas)] px-6 py-10 text-[var(--color-ink)] animate-in zoom-in-95 duration-500">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-primary)]/10 shadow-[0_0_30px_rgba(255,74,74,0.2)]">
        <DyveIcon name="check" size="lg" tone="primary" className="h-10 w-10" strokeWidth={3} />
      </div>
      
      <h1 className="mb-2 max-w-[300px] break-keep text-center text-2xl font-bold">{title}</h1>
      {hasStandingNumbers ? (
        <>
          <p className="max-w-[300px] break-keep text-center text-base font-semibold text-[var(--color-ink)]">{standingNumberMessage}</p>
          <p className="mb-10 mt-2 max-w-[300px] break-keep text-center text-sm leading-6 text-[var(--color-muted)]">
            마이페이지에서 예매 내역을 확인할 수 있어요.
          </p>
        </>
      ) : (
        <p className={`${isGroupDive ? "mb-5" : "mb-10"} max-w-[300px] break-keep text-center text-sm leading-6 text-[var(--color-muted)]`}>
          {description}
          <br />
          {isPledge
            ? "상세 화면에서 최신 모금 현황을 확인할 수 있어요."
            : "마이페이지에서 예매 내역을 확인할 수 있어요."}
        </p>
      )}

      {groupDiveApplication && (
        <dl data-static-info className="mb-8 w-full max-w-[320px] text-sm">
          {[
            ["닉네임", groupDiveApplication.nickname],
            ["성별", genderLabel],
            ["주제에 대한 이야기", groupDiveApplication.enthusiasm],
            ["결제 상태", groupDiveApplication.paymentStatus === "paid" ? "결제 완료" : groupDiveApplication.paymentStatus],
            [
              "결제 금액",
              typeof groupDiveApplication.paidAmount === "number"
                ? `₩ ${groupDiveApplication.paidAmount.toLocaleString()}`
                : "-",
            ],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[7rem_1fr] gap-3 py-3">
              <dt className="text-[var(--color-muted)]">{label}</dt>
              <dd className="break-words text-right font-medium leading-5 text-[var(--color-ink)]">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {isGroupDive && (
        <p className="mb-6 max-w-[320px] break-keep text-center text-sm leading-6 text-[var(--color-muted)]">
          미선정 시 결제 수수료를 제외한 금액이 환불됩니다.
        </p>
      )}

      <Button 
        onClick={onGoHome}
        className="h-14 w-full max-w-[320px] rounded-xl bg-[var(--color-primary)] text-base font-bold shadow-[0_0_20px_rgba(255,74,74,0.3)] hover:bg-[var(--color-primary-active)]"
      >
        <DyveIcon name="home" size="md" tone="inverse" className="mr-2 h-5 w-5" />
        홈으로 돌아가기
      </Button>
    </div>
  );
}
