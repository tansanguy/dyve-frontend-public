import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import DatePicker from "react-datepicker";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { NavHeader } from "./NavHeader";
import { DyveIcon, DyveIconButton } from "./DyveIcon";
import "react-datepicker/dist/react-datepicker.css";
import "./register-venue-datepicker.css";

type RegisterProjectPayload = {
  title: string;
  description: string;
  imageData: string;
  targetAmount: number;
  minPledgeAmount: number;
  deadline: string;
  rewards: { title: string; description: string }[];
};

interface RegisterProjectScreenProps {
  onBack: () => void;
  onSubmit: (payload: RegisterProjectPayload) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

const MIN_TARGET_AMOUNT = 100000;
const MIN_PLEDGE_AMOUNT = 5000;
const DATA_IMAGE_PREFIX = /^data:image\//i;

const pad2 = (value: number) => String(value).padStart(2, "0");

const sanitizeNumericInput = (value: string) => value.replace(/\D/g, "");

const toDateInputValue = (value: Date) =>
  `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;

const toDateFromInputValue = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getTomorrow = () => {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + 1);
  return value;
};

const formatDateDisplay = (value: string) => {
  const parsed = toDateFromInputValue(value);
  if (!parsed) return "";
  return `${parsed.getFullYear()}.${pad2(parsed.getMonth() + 1)}.${pad2(parsed.getDate())}`;
};

const toDeadlineIsoString = (value: string) => {
  const parsed = toDateFromInputValue(value);
  if (!parsed) return null;
  parsed.setHours(23, 59, 59, 999);
  return parsed.toISOString();
};

export function RegisterProjectScreen({
  onBack,
  onSubmit,
  isSubmitting = false,
  submitError,
}: RegisterProjectScreenProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const deadlinePickerRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [minPledgeAmount, setMinPledgeAmount] = useState(String(MIN_PLEDGE_AMOUNT));
  const [deadline, setDeadline] = useState("");
  const [isDeadlinePickerOpen, setIsDeadlinePickerOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Rewards
  const [rewards, setRewards] = useState<{ title: string; description: string }[]>([]);
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");

  useEffect(() => {
    if (!isDeadlinePickerOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (deadlinePickerRef.current?.contains(target)) return;
      setIsDeadlinePickerOpen(false);
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDeadlinePickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isDeadlinePickerOpen]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("이미지 파일만 업로드할 수 있어요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setImageUrl(result);
      setImageFileName(file.name);
      setFormError(null);
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = "";
  };

  const handleEnterKey = (event: KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (event.key !== "Enter") return;
    if (event.nativeEvent.isComposing || composingRef.current) return;
    event.preventDefault();
    action();
  };

  const addReward = () => {
    const trimmedTitle = rewardTitle.trim();
    const trimmedDescription = rewardDescription.trim();

    if (!trimmedTitle) {
      setFormError("혜택 이름을 입력해 주세요.");
      return;
    }
    setRewards((prev) => [
      ...prev,
      { title: trimmedTitle, description: trimmedDescription },
    ]);
    setRewardTitle("");
    setRewardDescription("");
    setFormError(null);
  };

  const removeReward = (index: number) => {
    setRewards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    setFormError(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const amount = Number(targetAmount);
    const pledgeMin = Number(minPledgeAmount);
    const deadlineIsoString = toDeadlineIsoString(deadline);

    if (!trimmedTitle) {
      setFormError("후원 제목을 입력해 주세요.");
      return;
    }
    if (trimmedTitle.length > 100) {
      setFormError("후원 제목은 100자 이내로 입력해 주세요.");
      return;
    }
    if (!trimmedDescription) {
      setFormError("후원 상세 설명을 입력해 주세요.");
      return;
    }
    if (!imageUrl || !DATA_IMAGE_PREFIX.test(imageUrl)) {
      setFormError("대표 이미지를 업로드해 주세요.");
      return;
    }
    if (!Number.isFinite(amount) || amount < MIN_TARGET_AMOUNT) {
      setFormError(`목표 금액은 최소 ${MIN_TARGET_AMOUNT.toLocaleString()}원이어야 합니다.`);
      return;
    }
    if (!Number.isFinite(pledgeMin) || pledgeMin < MIN_PLEDGE_AMOUNT) {
      setFormError(`최소 후원 금액은 최소 ${MIN_PLEDGE_AMOUNT.toLocaleString()}원이어야 합니다.`);
      return;
    }
    if (!deadline) {
      setFormError("마감일을 선택해 주세요.");
      return;
    }
    const deadlineDate = toDateFromInputValue(deadline);
    if (!deadlineDate || !deadlineIsoString) {
      setFormError("올바른 마감일을 선택해 주세요.");
      return;
    }
    if (deadlineDate <= new Date()) {
      setFormError("마감일은 오늘 이후여야 합니다.");
      return;
    }

    onSubmit({
      title: trimmedTitle,
      description: trimmedDescription,
      imageData: imageUrl,
      targetAmount: amount,
      minPledgeAmount: pledgeMin,
      deadline: deadlineIsoString,
      rewards: rewards.map((r) => ({
        title: r.title,
        description: r.description,
      })),
    });
  };

  return (
    <div className="min-h-full animate-in slide-in-from-right bg-[var(--color-canvas)] pb-28 text-[var(--color-ink)] duration-300">
      <NavHeader
        title="창작 후원 등록하기"
        onBack={onBack}
        className="z-40 border-[var(--color-hairline)] bg-[var(--color-canvas)]/80 backdrop-blur-xl"
      />

      <div className="px-6 py-6 space-y-8">
        {/* Error */}
        {(formError || submitError) && (
          <div className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-primary)]">
            {formError || submitError}
          </div>
        )}

        {/* Project Title */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[var(--color-muted-soft)]">
            후원 한 줄 설명 <span className="text-[var(--color-primary)]">*</span>
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 인디밴드 '달빛' 1st EP 앨범 제작"
            maxLength={100}
            className="border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
          />
          <p className="text-xs text-[var(--color-muted)]">{title.length}/100</p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[var(--color-muted-soft)]">
            후원 상세 설명 <span className="text-[var(--color-primary)]">*</span>
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="왜 이 후원이 필요한지, 어떤 것을 만들고 싶은지 관객에게 이야기해 주세요."
            rows={6}
            className="border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 resize-none"
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[var(--color-muted-soft)]">
            대표 이미지 <span className="text-[var(--color-primary)]">*</span>
          </Label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          {imageUrl ? (
            <div className="relative overflow-hidden border-y border-[var(--color-hairline)] py-3">
              <div className="flex min-h-[18rem] items-center justify-center bg-[var(--color-surface-soft)] p-3">
                <img
                  src={imageUrl}
                  alt="대표 이미지 미리보기"
                  className="max-h-[22rem] w-full rounded-xl object-contain"
                />
              </div>
              <DyveIconButton
                name="x"
                label="대표 이미지 삭제"
                onClick={() => {
                  setImageUrl("");
                  setImageFileName("");
                }}
                variant="overlay"
                iconTone="inverse"
                iconSize="sm"
                className="absolute right-2 top-2 h-11 w-11 rounded-full"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-ink)]">전체 포스터 미리보기</p>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {imageFileName || "대표 이미지 업로드 완료"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="min-h-11 px-3 text-xs font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
                >
                  다시 선택
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex h-56 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)]/40"
            >
              <DyveIcon name="upload" size="lg" tone="muted" className="mb-2 h-8 w-8" />
              <span className="text-sm">이미지 업로드</span>
            </button>
          )}
        </div>

        {/* Target Amount */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[var(--color-muted-soft)]">
            목표 금액 <span className="text-[var(--color-primary)]">*</span>
          </Label>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              value={targetAmount}
              onChange={(e) => setTargetAmount(sanitizeNumericInput(e.target.value))}
              placeholder="100,000"
              className="border-[var(--color-hairline)] bg-[var(--color-surface-soft)] pr-8 text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">
              원
            </span>
          </div>
          {targetAmount ? (
            <p className="text-xs text-[var(--color-muted)]">입력값: {Number(targetAmount).toLocaleString()}원</p>
          ) : null}
          <p className="text-xs text-[var(--color-muted)]">최소 {MIN_TARGET_AMOUNT.toLocaleString()}원</p>
        </div>

        {/* Min Pledge Amount */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[var(--color-muted-soft)]">
            최소 후원 금액 <span className="text-[var(--color-primary)]">*</span>
          </Label>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              value={minPledgeAmount}
              onChange={(e) => {
                setMinPledgeAmount(sanitizeNumericInput(e.target.value));
                setFormError(null);
              }}
              placeholder="직접 금액 입력"
              className="h-12 rounded-xl border-[var(--color-hairline)] bg-[var(--color-surface-soft)] pr-8 text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">
              원
            </span>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            후원자가 참여하기 위한 최소 금액이에요. (최소 {MIN_PLEDGE_AMOUNT.toLocaleString()}원)
          </p>
          {minPledgeAmount ? (
            <p className="text-xs text-[var(--color-muted)]">선택 금액: {Number(minPledgeAmount).toLocaleString()}원</p>
          ) : null}
        </div>

        {/* Deadline */}
        <div ref={deadlinePickerRef} className="space-y-2">
          <Label className="text-sm font-semibold text-[var(--color-muted-soft)]">
            마감일 <span className="text-[var(--color-primary)]">*</span>
          </Label>
          <button
            type="button"
            onClick={() => setIsDeadlinePickerOpen((prev) => !prev)}
            className="flex h-12 w-full items-center justify-between rounded-2xl border border-transparent bg-[var(--color-surface-soft)] px-4 text-left transition-colors hover:border-[var(--color-hairline)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <span className={`text-base ${deadline ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"}`}>
              {deadline ? formatDateDisplay(deadline) : "후원 마감일 선택"}
            </span>
            <DyveIcon name="calendar-days" size="sm" tone="primary" className="h-4 w-4" />
          </button>
          {isDeadlinePickerOpen && (
            <div className="space-y-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-3">
              <div className="overflow-x-auto">
                <DatePicker
                  selected={toDateFromInputValue(deadline)}
                  onChange={(value: Date | null) => {
                    setDeadline(value ? toDateInputValue(value) : "");
                    if (value) {
                      setFormError(null);
                    }
                  }}
                  inline
                  minDate={getTomorrow()}
                  calendarClassName="dyve-datepicker"
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-1">
                <span className="text-[11px] text-[var(--color-muted)]">
                  {deadline ? `선택됨: ${formatDateDisplay(deadline)}` : "마감일을 선택해 주세요."}
                </span>
                <button
                  type="button"
                  onClick={() => setIsDeadlinePickerOpen(false)}
                  className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-1 text-[11px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)]/60 hover:text-[var(--color-ink)]"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rewards (기부자 베네핏) */}
        <div className="space-y-4">
          <Label className="text-sm font-semibold text-[var(--color-muted-soft)]">
            후원자 혜택
          </Label>
          <p className="whitespace-pre-line text-xs text-[var(--color-muted)]">
            {"후원자에게 제공할 보상을 등록하세요.\n없어도 자유 금액 후원은 가능합니다."}
          </p>

          {/* Existing rewards */}
          {rewards.length > 0 && (
            <div className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
              {rewards.map((reward, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-[var(--color-ink)]">{reward.title}</span>
                    </div>
                    {reward.description && (
                      <p className="text-xs text-[var(--color-muted)] line-clamp-2">{reward.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeReward(index)}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
                  >
                    <DyveIcon name="x" size="sm" tone="default" className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add reward form */}
          <div className="space-y-3 border-y border-[var(--color-hairline)] py-4">
            <Input
              value={rewardTitle}
              onChange={(e) => setRewardTitle(e.target.value)}
              placeholder="혜택 이름 (예: 친필 사인 CD)"
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={() => { composingRef.current = false; }}
              onKeyDown={(e) => handleEnterKey(e, addReward)}
              maxLength={50}
              className="border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
            />
            <div className="flex gap-2">
              <Input
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
                placeholder="혜택 설명 (선택)"
                maxLength={100}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={() => { composingRef.current = false; }}
                onKeyDown={(e) => handleEnterKey(e, addReward)}
                className="border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
              />
              <Button
                type="button"
                onClick={addReward}
                className="h-12 flex-shrink-0 rounded-xl bg-[var(--color-primary)] px-5 text-base font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
              >
                <DyveIcon name="plus" size="sm" tone="inverse" className="mr-1 h-4 w-4" /> 추가
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Fixed */}
      <div className="mobile-fixed-bar app-bottom-bar border-t p-4 pb-8">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full rounded-xl py-6 text-lg font-bold ${
            isSubmitting
              ? "bg-[var(--color-disabled-surface)] text-[var(--color-disabled-text)]"
              : "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
          }`}
        >
          {isSubmitting ? "등록 중..." : "후원 등록하기"}
        </Button>
      </div>
    </div>
  );
}
