import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DyveIcon } from "../components/figma/dyve/DyveIcon";
import { Input } from "../components/figma/ui/input";
import { Textarea } from "../components/figma/ui/textarea";
import { api, formatApiError } from "../services/api";

const GENRE_OPTIONS = ["인디", "재즈", "힙합", "DJ", "클래식", "어쿠스틱"];
const SERVICE_OPTIONS = ["아티스트 섭외", "기획 조율", "타임테이블", "현장 운영", "티켓 세팅", "정산"];
const ADD_ON_OPTIONS = ["음식", "작은 체험", "콘텐츠 촬영"];
const MOOD_OPTIONS = ["새로운 조합", "부담 없는 분위기", "브랜드 행사", "로컬 상권", "학교/기업", "아파트/커뮤니티"];

const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

function ChipGroup({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = values.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(toggle(values, option))}
            className={`rounded-[var(--radius-pill)] border px-3 py-2 text-xs font-semibold transition-colors ${
              selected
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function InquiryPage() {
  const navigate = useNavigate();
  const [requesterName, setRequesterName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [eventGoal, setEventGoal] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [region, setRegion] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [audienceSize, setAudienceSize] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [desiredGenres, setDesiredGenres] = useState<string[]>([]);
  const [serviceNeeds, setServiceNeeds] = useState<string[]>([]);
  const [addOnNeeds, setAddOnNeeds] = useState<string[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [equipmentNotes, setEquipmentNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedAudienceSize = useMemo(() => {
    const parsed = Number.parseInt(audienceSize.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [audienceSize]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!requesterName.trim()) {
      setSubmitError("이름을 입력해 주세요.");
      return;
    }
    if (!contactEmail.trim() && !contactPhone.trim()) {
      setSubmitError("연락 가능한 이메일 또는 전화번호를 입력해 주세요.");
      return;
    }
    if (!eventGoal.trim()) {
      setSubmitError("공연이 필요한 상황을 입력해 주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const inquiry = await api.createInquiry({
        requesterName: requesterName.trim(),
        organizationName: organizationName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        eventGoal: eventGoal.trim(),
        dateRange: dateRange.trim(),
        region: region.trim(),
        venueAddress: venueAddress.trim(),
        audienceSize: parsedAudienceSize,
        budgetRange: budgetRange.trim(),
        desiredGenres,
        moodTags,
        serviceNeeds,
        addOnNeeds,
        equipmentNotes: equipmentNotes.trim(),
      });
      setSubmittedId(inquiry.id);
    } catch (error) {
      setSubmitError(formatApiError(error, "문의 접수에 실패했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] pb-28 text-[var(--color-ink)]">
      <header data-app-top-bar className="sticky top-0 z-30 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)]/95 px-5 py-4 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
          aria-label="뒤로"
        >
          <DyveIcon name="arrow-left" size="sm" className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-card-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <DyveIcon name="music" size="md" className="h-5 w-5" />
          </div>
          <div>
            <p className="ty-micro font-bold uppercase text-[var(--color-primary)]">DYVE REQUEST</p>
            <h1 className="mt-1 ty-section-title">공연 섭외/운영 문의</h1>
            <p className="mt-2 ty-caption leading-5 text-[var(--color-muted)]">
              공연이 필요한 행사, 공간, 브랜드 상황을 남기면 DYVE가 아티스트와 운영 범위를 검토합니다.
            </p>
          </div>
        </div>
      </header>

      <main className="space-y-5 px-5 py-6">
        {submittedId ? (
          <section className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-5">
            <DyveIcon name="check-circle-2" size="lg" tone="primary" className="h-8 w-8" />
            <h2 className="mt-4 text-lg font-bold">문의가 접수됐어요.</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              DYVE가 공연 중심으로 가능한 구성과 필요한 도움을 확인할게요.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-5 w-full rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-[var(--color-on-primary)]"
            >
              홈으로
            </button>
          </section>
        ) : (
          <>
            <section className="space-y-3 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
              <h2 className="text-sm font-bold">문의자 정보</h2>
              <Input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} placeholder="이름 *" />
              <Input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="소속/행사명" />
              <div className="grid gap-3">
                <Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="이메일" />
                <Input
                  value={contactPhone}
                  inputMode="numeric"
                  onChange={(event) => setContactPhone(event.target.value.replace(/\D/g, ""))}
                  placeholder="전화번호 (숫자만)"
                />
              </div>
            </section>

            <section className="space-y-3 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
              <h2 className="text-sm font-bold">공연이 필요한 상황</h2>
              <Textarea value={eventGoal} onChange={(event) => setEventGoal(event.target.value)} placeholder="어떤 행사나 공간에 공연이 필요한지 적어주세요. *" className="min-h-[120px]" />
              <div className="grid gap-3">
                <Input value={dateRange} onChange={(event) => setDateRange(event.target.value)} placeholder="희망 일정" />
                <Input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="지역" />
                <Input value={audienceSize} onChange={(event) => setAudienceSize(event.target.value)} placeholder="예상 관객 수" />
                <Input value={budgetRange} onChange={(event) => setBudgetRange(event.target.value)} placeholder="예산 범위" />
              </div>
              <Input value={venueAddress} onChange={(event) => setVenueAddress(event.target.value)} placeholder="장소 주소 또는 후보 공간" />
            </section>

            <section className="space-y-4 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
              <div className="space-y-2">
                <h2 className="text-sm font-bold">원하는 공연 감각</h2>
                <ChipGroup options={GENRE_OPTIONS} values={desiredGenres} onChange={setDesiredGenres} />
              </div>
              <div className="space-y-2">
                <h2 className="text-sm font-bold">필요한 도움</h2>
                <ChipGroup options={SERVICE_OPTIONS} values={serviceNeeds} onChange={setServiceNeeds} />
              </div>
              <div className="space-y-2">
                <h2 className="text-sm font-bold">함께 붙일 요소</h2>
                <ChipGroup options={ADD_ON_OPTIONS} values={addOnNeeds} onChange={setAddOnNeeds} />
              </div>
              <div className="space-y-2">
                <h2 className="text-sm font-bold">분위기</h2>
                <ChipGroup options={MOOD_OPTIONS} values={moodTags} onChange={setMoodTags} />
              </div>
              <textarea value={equipmentNotes} onChange={(event) => setEquipmentNotes(event.target.value)} aria-label="공간 활용 참고사항" placeholder="장비, 소음, 동선, 음식 가능 여부 등 참고사항" className="min-h-[92px] w-full rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]" />
            </section>

            {submitError && <p className="text-center text-sm font-semibold text-[var(--color-primary)]">{submitError}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 py-4 text-sm font-bold text-[var(--color-on-primary)] disabled:opacity-60"
            >
              {isSubmitting ? "접수 중..." : "문의 접수하기"}
            </button>
          </>
        )}
      </main>

    </div>
  );
}
