import type { ReactDatePickerCustomHeaderProps } from "react-datepicker";
import { DyveIcon } from "./DyveIcon";
import "./register-venue-datepicker.css";

const WEEKDAY_LABELS: Record<string, string> = {
  sun: "일",
  sunday: "일",
  mon: "월",
  monday: "월",
  tue: "화",
  tuesday: "화",
  wed: "수",
  wednesday: "수",
  thu: "목",
  thursday: "목",
  fri: "금",
  friday: "금",
  sat: "토",
  saturday: "토",
};

export const formatDyveCalendarWeekDay = (dayName: string) => {
  const key = dayName.trim().toLowerCase();
  return WEEKDAY_LABELS[key] ?? WEEKDAY_LABELS[key.slice(0, 3)] ?? dayName.slice(0, 1);
};

export function renderDyveDatePickerHeader({
  date,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: ReactDatePickerCustomHeaderProps) {
  const label = date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="dyve-datepicker__custom-header">
      <button
        type="button"
        className="dyve-datepicker__nav-button"
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        aria-label="이전 달"
      >
        <DyveIcon name="chevron-left" size="sm" tone="default" className="h-4 w-4" />
      </button>
      <span className="dyve-datepicker__month-label">{label}</span>
      <button
        type="button"
        className="dyve-datepicker__nav-button"
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        aria-label="다음 달"
      >
        <DyveIcon name="chevron-right" size="sm" tone="default" className="h-4 w-4" />
      </button>
    </div>
  );
}
