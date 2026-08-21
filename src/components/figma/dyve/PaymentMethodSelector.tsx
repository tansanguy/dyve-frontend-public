import type { PaymentMethod } from "../../../utils/nicepay";
import { DyveIcon } from "./DyveIcon";

type Props = {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  disabled?: boolean;
};

const METHODS = [
  {
    value: "card",
    label: "카드·간편결제",
    description: "신용·체크카드, 네이버페이, 카카오페이 등",
    icon: "credit-card",
  },
  {
    value: "bank",
    label: "계좌이체",
    description: "은행 계좌에서 바로 이체",
    icon: "landmark",
  },
] as const;

export function PaymentMethodSelector({ value, onChange, disabled = false }: Props) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-3 text-sm font-bold text-[var(--color-ink)]">결제 수단</legend>
      <div className="grid gap-2 min-[390px]:grid-cols-2">
        {METHODS.map((method) => {
          const selected = value === method.value;
          return (
            <label
              key={method.value}
              className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-card-md)] border p-4 transition-colors ${
                selected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)]"
              } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-primary)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60`}
            >
              <input
                type="radio"
                name="payment-method"
                value={method.value}
                checked={selected}
                onChange={() => onChange(method.value)}
                className="sr-only"
              />
              <DyveIcon name={method.icon} size="md" tone={selected ? "primary" : "muted"} className="mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[var(--color-ink)]">{method.label}</span>
                <span className="mt-1 block break-keep text-xs leading-5 text-[var(--color-muted)]">{method.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
