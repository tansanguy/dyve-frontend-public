import { useMemo } from "react";
import { Checkbox } from "../ui/checkbox";

interface DateTimeSelectorProps {
  value: Date;
  onChange: (value: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  allowAllTimes: boolean;
  onAllowAllTimesChange: (checked: boolean) => void;
}

const pad2 = (value: number) => String(value).padStart(2, "0");

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

/**
 * 공연 등록 및 계약 기본 정보 입력용 공통 일시 선택 컴포넌트
 * - 년, 월, 일, 시, 분 5개 select UI 기반
 * - 윤달 및 월별 일수 동적 처리 지원
 * - 분 단위 선택 옵션 지원
 */
export function DateTimeSelector({
  value,
  onChange,
  minDate,
  maxDate,
  allowAllTimes,
  onAllowAllTimesChange,
}: DateTimeSelectorProps) {
  const selectedYear = value.getFullYear();
  const selectedMonth = value.getMonth() + 1;
  const selectedDay = value.getDate();
  const selectedHour = value.getHours();
  const selectedMinute = value.getMinutes();

  const minYear = minDate?.getFullYear() ?? selectedYear - 1;
  const maxYear = maxDate?.getFullYear() ?? selectedYear + 3;

  const yearOptions = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, idx) => minYear + idx),
    [minYear, maxYear]
  );
  const monthOptions = Array.from({ length: 12 }, (_, idx) => idx + 1);
  const dayOptions = useMemo(
    () => Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, idx) => idx + 1),
    [selectedYear, selectedMonth]
  );
  const hourOptions = Array.from({ length: 24 }, (_, idx) => idx);
  const minuteOptions = allowAllTimes ? Array.from({ length: 60 }, (_, idx) => idx) : [0, 30];

  const updateDate = (updates: Partial<{ y: number; m: number; d: number; h: number; min: number }>) => {
    const nextDate = new Date(value);
    if (updates.y !== undefined) nextDate.setFullYear(updates.y);
    if (updates.m !== undefined) nextDate.setMonth(updates.m - 1);
    if (updates.d !== undefined) nextDate.setDate(updates.d);
    if (updates.h !== undefined) nextDate.setHours(updates.h);
    if (updates.min !== undefined) nextDate.setMinutes(updates.min);
    onChange(nextDate);
  };

  const selectClass =
    "h-12 rounded-2xl bg-[var(--color-surface-soft)] px-3 text-center text-base font-semibold text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedYear}
          onChange={(e) => updateDate({ y: parseInt(e.target.value, 10) })}
          className={selectClass}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => updateDate({ m: parseInt(e.target.value, 10) })}
          className={selectClass}
        >
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              {pad2(month)}
            </option>
          ))}
        </select>
        <select
          value={selectedDay}
          onChange={(e) => updateDate({ d: parseInt(e.target.value, 10) })}
          className={selectClass}
        >
          {dayOptions.map((day) => (
            <option key={day} value={day}>
              {pad2(day)}
            </option>
          ))}
        </select>
        <select
          value={selectedHour}
          onChange={(e) => updateDate({ h: parseInt(e.target.value, 10) })}
          className={selectClass}
        >
          {hourOptions.map((hour) => (
            <option key={hour} value={hour}>
              {pad2(hour)}
            </option>
          ))}
        </select>
        <select
          value={selectedMinute}
          onChange={(e) => updateDate({ min: parseInt(e.target.value, 10) })}
          className={selectClass}
        >
          {minuteOptions.map((minute) => (
            <option key={minute} value={minute}>
              {pad2(minute)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2 pl-1">
        <Checkbox
          id="allow-all-times"
          checked={allowAllTimes}
          onCheckedChange={(checked) => onAllowAllTimesChange(Boolean(checked))}
          className="border-[var(--color-hairline-strong)] data-[state=checked]:border-[var(--color-primary)] data-[state=checked]:bg-[var(--color-primary)]"
        />
        <label htmlFor="allow-all-times" className="cursor-pointer text-xs text-[var(--color-muted)]">
          분 단위 시간 선택
        </label>
      </div>
    </div>
  );
}
