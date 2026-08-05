import { Input } from "../ui/input";

interface PriceInputProps {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  prefix?: string;
}

/**
 * 티켓 가격 및 금액 입력용 공통 컴포넌트
 * - 숫자만 입력 가능
 * - 앞자리에 불필요한 0 제거 (010 -> 10)
 * - ₩ 또는 원 등 Suffix/Prefix 처리 지원
 */
export function PriceInput({
  value,
  onChange,
  placeholder = "0",
  className = "",
  disabled = false,
  prefix = "₩",
}: PriceInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // 숫자만 남기기
    const numericValue = rawValue.replace(/\D/g, "");
    // 앞자리 0 제거 (단, 값이 "0" 하나인 경우는 유지)
    const sanitizedValue = numericValue.replace(/^0+(?!$)/, "");
    onChange(sanitizedValue);
  };

  return (
    <div className={`relative ${disabled ? "opacity-50" : ""}`}>
      {prefix && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-[var(--color-muted)]">
          {prefix}
        </span>
      )}
      <Input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`h-12 rounded-2xl border-transparent bg-[var(--color-surface-soft)] text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
          prefix ? "pl-10" : "pl-4"
        } ${className}`}
      />
    </div>
  );
}
