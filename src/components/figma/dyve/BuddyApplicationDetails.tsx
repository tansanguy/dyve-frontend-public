import type { ConnectionApplicationDto } from "../../../services/api";
import { formatConnectionDeadline } from "../../../utils/connectionDisplay";
import { resolveMediaSrc } from "../../../utils/media";

const GENDER_LABEL = {
  female: "여성",
  male: "남성",
  other: "기타",
  any: "모두 좋아요",
  "": "정보 없음",
} as const;

const PAYMENT_LABEL = {
  not_required: "결제 없음",
  pending: "결제 대기",
  authorized: "승인 대기",
  paid: "결제 완료",
  failed: "결제 실패",
} as const;

const REFUND_LABEL = {
  not_required: "해당 없음",
  none: "환불 없음",
  requested: "환불 요청",
  approved: "환불 승인",
  completed: "전액 환불 완료",
  failed: "환불 실패",
} as const;

const MATCH_LABEL = {
  pending: "매칭 대기",
  prepared: "페어 준비 완료",
  matched: "매칭 완료",
  unmatched: "매칭 불발",
} as const;

type Props = {
  application: ConnectionApplicationDto;
  matchingAt?: string | null;
  surface?: "plain" | "soft";
};

const valueOrFallback = (value?: string | null) => value?.trim() || "정보 없음";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-2.5">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd data-user-content className="text-right font-medium leading-5 text-[var(--color-body)]">{value}</dd>
    </div>
  );
}

export function BuddyApplicationDetails({ application, matchingAt, surface = "plain" }: Props) {
  const proofImage = resolveMediaSrc(application.instagramProofImageUrl);
  const matchResult = application.matchedPartner
    ? `${MATCH_LABEL[application.matchStatus]} · ${application.matchedPartner.name}`
    : MATCH_LABEL[application.matchStatus];

  return (
    <div
      className={surface === "soft" ? "rounded-[var(--radius-card-lg)] bg-[var(--color-surface-soft)] p-4" : ""}
      data-buddy-application-details
    >
      <section aria-labelledby={`buddy-basic-${application.id}`}>
        <h3 id={`buddy-basic-${application.id}`} className="text-[13px] font-bold text-[var(--color-ink)]">기본 정보</h3>
        <dl data-static-info className="mt-1 divide-y divide-[var(--color-hairline)] text-[13px]">
          <Row label="닉네임" value={valueOrFallback(application.nickname)} />
          <Row label="성별" value={GENDER_LABEL[application.gender]} />
          <Row label="나이" value={application.age ? `${application.age}세` : "정보 없음"} />
          <Row label="원하는 성별" value={GENDER_LABEL[application.desiredGender]} />
        </dl>
      </section>

      <section className="mt-5 border-t border-[var(--color-hairline)] pt-5" aria-labelledby={`buddy-preference-${application.id}`}>
        <h3 id={`buddy-preference-${application.id}`} className="text-[13px] font-bold text-[var(--color-ink)]">취향과 계획</h3>
        <dl data-static-info className="mt-3 space-y-4 text-[13px]">
          {[
            ["페스티벌 스타일", application.festivalStyle],
            ["꼭 보고 싶은 아티스트", application.mustSeeArtists],
            ["함께 하고 싶은 활동", application.activities || application.message],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[var(--color-muted)]">{label}</dt>
              <dd data-user-content className="mt-1 leading-5 text-[var(--color-body)]">{valueOrFallback(value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-5 border-t border-[var(--color-hairline)] pt-5" aria-labelledby={`buddy-progress-${application.id}`}>
        <h3 id={`buddy-progress-${application.id}`} className="text-[13px] font-bold text-[var(--color-ink)]">진행 상태</h3>
        <dl data-static-info className="mt-1 divide-y divide-[var(--color-hairline)] text-[13px]">
          <Row label="Instagram 인증" value={application.instagramVerificationStatus === "verified" ? "인증 완료" : "DYVE 인증 대기"} />
          <Row label="결제" value={PAYMENT_LABEL[application.paymentStatus]} />
          <Row label="환불" value={REFUND_LABEL[application.refundStatus]} />
          <Row label="매칭 예정" value={matchingAt ? formatConnectionDeadline(matchingAt).replace(" 마감", "") : "일정 미정"} />
          <Row label="매칭 결과" value={matchResult} />
        </dl>

        {proofImage && (
          <a
            href={proofImage}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <img
              src={proofImage}
              alt="내 Instagram 인증 사진"
              loading="lazy"
              decoding="async"
              className="max-h-32 w-full object-contain"
            />
            <span className="mt-2 block text-center text-xs font-semibold text-[var(--color-primary)]">원본 보기</span>
          </a>
        )}
      </section>
    </div>
  );
}
