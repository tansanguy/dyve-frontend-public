import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import {
  SETTLEMENT_TYPES,
  SETTLEMENT_TYPE_DESCRIPTION,
  SETTLEMENT_TYPE_LABEL,
  type SettlementType,
} from "../types/contract";

export function ContractGuidePage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [settlementType, setSettlementType] = useState<SettlementType>("fixed_fee");

  return (
    <div className="bg-[var(--color-canvas)] text-[var(--color-ink)]" data-contract-guide>
      <NavHeader title="공연 계약 안내" onBack={() => navigate(`/chats/${chatId ?? ""}`)} />
      <main className="px-4 pb-36">
        <section className="border-b border-[var(--color-hairline)] py-6">
          <p className="text-xs font-semibold text-[var(--color-primary)]">계약 전 1분 확인</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight">정산 기준을 먼저 맞춰두면<br />공연 뒤 분쟁을 줄일 수 있어요.</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            공연 일시, 양측 등록명, 정산 방식과 위약 조항을 확인한 뒤 두 사람이 각각 서명합니다.
          </p>
        </section>

        <section className="py-6">
          <h2 className="text-lg font-bold">이번 공연의 정산 방식</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-[var(--color-muted)]">{"가장 가까운 방식을 고르세요.\n금액과 비율은 다음 화면에서 입력합니다."}</p>
          <fieldset className="mt-4 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            <legend className="sr-only">정산 방식 선택</legend>
            {SETTLEMENT_TYPES.map((type) => (
              <label key={type} className="flex cursor-pointer items-start gap-3 py-4">
                <input
                  type="radio"
                  name="guideSettlementType"
                  value={type}
                  checked={settlementType === type}
                  onChange={() => setSettlementType(type)}
                  className="mt-0.5 h-5 w-5 accent-[var(--color-primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{SETTLEMENT_TYPE_LABEL[type]}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[var(--color-muted)]">
                    {SETTLEMENT_TYPE_DESCRIPTION[type]}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        </section>

        <section className="border-t border-[var(--color-hairline)] py-6">
          <h2 className="text-base font-bold">작성 후 진행 순서</h2>
          <ol className="mt-3 space-y-3 text-sm text-[var(--color-muted)]">
            <li><span className="mr-2 font-semibold text-[var(--color-ink)]">1.</span>한 사람이 조건을 작성하고 먼저 서명해요.</li>
            <li><span className="mr-2 font-semibold text-[var(--color-ink)]">2.</span>상대방이 채팅에서 조건을 확인하고 서명해요.</li>
            <li><span className="mr-2 font-semibold text-[var(--color-ink)]">3.</span>양측 서명이 끝나면 계약이 확정돼요.</li>
          </ol>
        </section>
      </main>

      <div className="mobile-fixed-bar border-t border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4">
        <button
          type="button"
          disabled={!chatId}
          onClick={() => navigate(`/chats/${chatId}/contract/new`, { state: { settlementType } })}
          className="w-full rounded-[var(--radius-card-lg)] bg-[var(--color-primary)] py-3.5 text-sm font-bold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-active)] disabled:opacity-50"
        >
          {SETTLEMENT_TYPE_LABEL[settlementType]}로 계약 작성
        </button>
      </div>
    </div>
  );
}
