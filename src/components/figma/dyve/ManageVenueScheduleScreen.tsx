import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { Button } from "../ui/button";
import { NavHeader } from "./NavHeader";
import { DyveIcon } from "./DyveIcon";
import {
  formatDyveCalendarWeekDay,
  renderDyveDatePickerHeader,
} from "./DyveDatePickerHeader";

interface ManageVenueScheduleScreenProps {
  initialDates: Date[];
  isSubmitting?: boolean;
  submitError?: string | null;
  onSubmit: (dates: string[]) => void;
  onBack: () => void;
}

const FIXED_WEEKDAY_OPTIONS = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" },
] as const;

const getWeekdayNumber = (weekdayStr: string): number => {
  const map: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  return map[weekdayStr] ?? -1;
};

const toIsoDate = (date: Date | null | undefined) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFutureWeekdayDates = (baseDate: Date, weekdayNum: number, monthsAhead = 6): Date[] => {
  const dates: Date[] = [];
  const limitDate = new Date(baseDate);
  limitDate.setMonth(limitDate.getMonth() + monthsAhead);

  const current = new Date(baseDate);
  current.setHours(12, 0, 0, 0);

  while (current.getDay() !== weekdayNum) {
    current.setDate(current.getDate() + 1);
  }

  while (current <= limitDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return dates;
};

export function ManageVenueScheduleScreen({
  initialDates,
  isSubmitting = false,
  submitError = null,
  onSubmit,
  onBack,
}: ManageVenueScheduleScreenProps) {
  const [scheduleDates, setScheduleDates] = useState<Date[]>([]);
  const [fixedWeekdays, setFixedWeekdays] = useState<string[]>([]);
  
  useEffect(() => {
    if (initialDates.length > 0) {
      setScheduleDates(initialDates.sort((a, b) => a.getTime() - b.getTime()));
    }
  }, [initialDates]);

  const handleWeekdayToggle = (weekdayStr: string) => {
    setFixedWeekdays((prev) => {
      const isSelected = prev.includes(weekdayStr);
      const nextFixedWeekdays = isSelected
        ? prev.filter((item) => item !== weekdayStr)
        : [...prev, weekdayStr];

      const weekdayNum = getWeekdayNumber(weekdayStr);
      if (weekdayNum !== -1) {
        setScheduleDates((prevDates) => {
          const today = new Date();
          const autoDates = getFutureWeekdayDates(today, weekdayNum);
          const autoIsoDates = new Set(autoDates.map(toIsoDate));

          if (isSelected) {
            return prevDates.filter((d) => !autoIsoDates.has(toIsoDate(d)));
          } else {
            const currentIsoDates = new Set(prevDates.map(toIsoDate));
            const distinctDates = [...prevDates];
            for (const d of autoDates) {
              if (!currentIsoDates.has(toIsoDate(d))) {
                distinctDates.push(d);
              }
            }
            return distinctDates.sort((a, b) => a.getTime() - b.getTime());
          }
        });
      }
      return nextFixedWeekdays;
    });
  };

  const handleSave = () => {
    const isoDates = Array.from(new Set(scheduleDates.map(toIsoDate).filter(Boolean))).sort();
    onSubmit(isoDates);
  };

  return (
    <div className="relative min-h-full bg-[var(--color-canvas)] pb-32 text-[var(--color-ink)] animate-in slide-in-from-right duration-300">
      <NavHeader title="휴무일/대관 일정 관리" onBack={onBack} />

      <div className="space-y-8 p-6">
        <div className="space-y-3">
          <div className="mb-1 flex items-center gap-2">
            <DyveIcon name="calendar-days-series" size="md" tone="primary" className="h-5 w-5" />
            <h2 className="text-lg font-bold text-[var(--color-ink)]">가용 일정 설정</h2>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            공연이나 대관 운영이 가능한 정기 일정을 고정 요일로 한 번에 설정하고,<br />
            휴무가 예정된 예외 날짜는 달력에서 클릭해 취소하세요.
          </p>

          <div className="mt-4 space-y-4 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4 shadow-[0_14px_34px_rgba(35,35,35,0.07)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-primary)]">Calendar</p>
                <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">가용 날짜</p>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--color-primary)]/35 bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                {scheduleDates.length > 0 ? `${scheduleDates.length}일` : "미선택"}
              </span>
            </div>
            <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-2">
              <div className="overflow-x-auto overscroll-x-contain">
                <DatePicker
                  selectsMultiple
                  selectedDates={scheduleDates}
                  onChange={(dates) => setScheduleDates(dates ?? [])}
                  shouldCloseOnSelect={false}
                  inline
                  renderCustomHeader={renderDyveDatePickerHeader}
                  formatWeekDay={formatDyveCalendarWeekDay}
                  calendarClassName="dyve-datepicker dyve-schedule-datepicker"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <h3 className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">고정 요일 빠른 선택 (향후 6개월)</h3>
            <div className="flex flex-wrap gap-2">
              {FIXED_WEEKDAY_OPTIONS.map((option) => {
                const selected = fixedWeekdays.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleWeekdayToggle(option.value)}
                    className={`h-10 min-w-10 rounded-full border px-3 text-sm font-bold transition-all ${
                      selected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_8px_18px_rgba(255,74,74,0.22)]"
                        : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-muted)] hover:border-[var(--color-primary)]/60 hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {(scheduleDates.length > 0 || fixedWeekdays.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setScheduleDates([]);
                setFixedWeekdays([]);
              }}
              className="mt-6 rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-2 text-xs text-[var(--color-muted-soft)] hover:border-[var(--color-primary)]/60 hover:text-[var(--color-ink)]"
            >
              모든 일정 초기화
            </button>
          )}

        </div>
      </div>

      <div className="mobile-fixed-bar app-bottom-bar border-t p-4 pb-8">
        {submitError && (
          <p className="mb-2 text-center text-xs text-[var(--color-primary)]">{submitError}</p>
        )}
        <Button
          onClick={handleSave}
          disabled={isSubmitting}
          className={`w-full rounded-xl py-6 text-lg font-bold shadow-[0_0_20px_rgba(255,74,74,0.3)] ${
            isSubmitting
              ? "bg-[var(--color-disabled-surface)] text-[var(--color-disabled-text)]"
              : "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
          }`}
        >
          {isSubmitting ? "저장 중..." : "달력 변경사항 저장하기"}
        </Button>
      </div>
    </div>
  );
}
