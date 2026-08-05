import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { DyveIcon } from "./DyveIcon";
import { api } from "../../../services/api";
import type { LineupItem } from "../../../services/api";
import { mapNaverGender } from "../../../utils/accountInfo";

type Props = {
  isSubmitting: boolean;
  lineup: LineupItem[];
  participationFee: number;
  onSubmit: (payload: FormData) => Promise<void>;
};

const GENDERS = [
  { value: "female", label: "여성" },
  { value: "male", label: "남성" },
  { value: "other", label: "기타" },
] as const;

const DESIRED_GENDERS = [
  { value: "female", label: "여성" },
  { value: "male", label: "남성" },
  { value: "any", label: "모두 좋아요" },
] as const;

export function BuddyDiveApplicationForm({ isSubmitting, lineup, participationFee, onSubmit }: Props) {
  const { user } = useAuth();
  const proofPreviewRef = useRef<HTMLLabelElement>(null);
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [gender, setGender] = useState<"female" | "male" | "other" | "">("");
  const [age, setAge] = useState("");
  const [accountAgeRange, setAccountAgeRange] = useState<string | null>(null);
  const [instagramProof, setInstagramProof] = useState<File | null>(null);
  const [instagramPreview, setInstagramPreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [desiredGender, setDesiredGender] = useState<"female" | "male" | "any" | "">("");
  const [festivalStyle, setFestivalStyle] = useState("");
  const [mustSeeArtists, setMustSeeArtists] = useState("");
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [activities, setActivities] = useState("");
  const hasLineup = lineup.length > 0;

  useEffect(() => () => {
    if (instagramPreview) URL.revokeObjectURL(instagramPreview);
  }, [instagramPreview]);

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    void api
      .getMe(controller.signal)
      .then((me) => {
        const accountInfo = me.accountInfo;
        if (!accountInfo || accountInfo.provider !== "naver") return;
        const savedGender = mapNaverGender(accountInfo.gender);
        const savedAge = accountInfo.age;
        if (savedGender) setGender((current) => current || savedGender);
        if (savedAge) setAge((current) => current || String(savedAge));
        setAccountAgeRange(accountInfo.ageRange);
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.warn("Failed to prefill Buddy Dive account info", error);
      });
    return () => controller.abort();
  }, [user?.id]);

  useEffect(() => {
    if (!instagramPreview) return;
    const keepPreviewAboveActions = () => {
      proofPreviewRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    };
    const frame = requestAnimationFrame(keepPreviewAboveActions);
    let resizeFrame = 0;
    const handleResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(keepPreviewAboveActions);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, [instagramPreview]);

  const isCurrentStepValid = (() => {
    if (step === 1) return nickname.trim().length > 0;
    if (step === 2) return gender !== "";
    if (step === 3) {
      const value = Number(age);
      return Number.isInteger(value) && value >= 1 && value <= 120;
    }
    if (step === 4) return instagramProof !== null;
    if (step === 5) return desiredGender !== "";
    if (step === 6) return festivalStyle.trim().length > 0;
    if (step === 7) return hasLineup ? selectedArtists.length > 0 : mustSeeArtists.trim().length > 0;
    return activities.trim().length > 0;
  })();

  const handleImage = (file?: File) => {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setImageError("JPG, PNG, WEBP 이미지를 5MB 이하로 올려주세요.");
      return;
    }
    setInstagramProof(file);
    setInstagramPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!instagramProof || !isCurrentStepValid) return;
    const payload = new FormData();
    payload.append("nickname", nickname.trim());
    payload.append("gender", gender);
    payload.append("age", age);
    payload.append("instagramProofImage", instagramProof);
    payload.append("desiredGender", desiredGender);
    payload.append("festivalStyle", festivalStyle.trim());
    payload.append("mustSeeArtists", hasLineup ? selectedArtists.join(", ") : mustSeeArtists.trim());
    payload.append("activities", activities.trim());
    await onSubmit(payload);
  };

  return (
    <section className="mt-6" aria-labelledby="buddy-application-title" data-buddy-application-form>
      <div className="flex items-center justify-between gap-3">
        <h2 id="buddy-application-title" className="text-base font-bold">Buddy Dive 신청</h2>
        <span className="text-xs font-semibold text-[var(--color-muted)]">{step} / 8</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        답변은 공개 게시되지 않으며, DYVE 운영팀이 잘 맞는 Buddy를 찾는 데만 사용됩니다.
      </p>

      <div className="mt-3 flex gap-1" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full ${index < step ? "bg-[var(--color-primary)]" : "bg-[var(--color-hairline)]"}`}
          />
        ))}
      </div>

      <div className="mt-6" data-buddy-step-content>
        {step === 1 && (
          <div>
            <label htmlFor="buddy-nickname" className="text-lg font-bold">어떤 닉네임으로 불러드릴까요?</label>
            <p className="mt-1 text-sm text-[var(--color-muted)]">매칭된 다이브 버디에게 공개됩니다.</p>
            <Input
              id="buddy-nickname"
              className="mt-5"
              value={nickname}
              maxLength={50}
              autoFocus
              onChange={(event) => setNickname(event.target.value)}
              placeholder="닉네임"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-lg font-bold">성별을 알려주세요.</h3>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {GENDERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={gender === item.value}
                  onClick={() => setGender(item.value)}
                  className={`h-14 rounded-[var(--radius-button-md)] border text-sm font-bold transition-colors ${
                    gender === item.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--color-hairline)] bg-[var(--color-surface-white)] text-[var(--color-body)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <label htmlFor="buddy-age" className="text-lg font-bold">나이를 알려주세요.</label>
            <Input
              id="buddy-age"
              className="mt-5"
              type="text"
              inputMode="numeric"
              min={1}
              max={120}
              value={age}
              autoFocus
              onChange={(event) => setAge(event.target.value.replace(/\D/g, ""))}
              placeholder="예: 27"
            />
            {accountAgeRange && !age && (
              <p className="mt-2 whitespace-pre-line text-sm text-[var(--color-muted)]">
                {`네이버 가입 정보의 연령대는 ${accountAgeRange}세예요.\n정확한 나이를 입력해 주세요.`}
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="text-lg font-bold">Instagram 본인 인증 사진을 올려주세요.</h3>
            <p className="mt-1 whitespace-pre-line break-keep text-sm leading-relaxed text-[var(--color-muted)]">
              {"로그인된 본인 프로필 화면을 캡처해 주세요.\nDYVE 인증 후에만 매칭 대상이 됩니다."}
            </p>
            <input
              id="buddy-instagram-proof"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => handleImage(event.target.files?.[0])}
            />
            <label
              ref={proofPreviewRef}
              htmlFor="buddy-instagram-proof"
              className={`mt-5 flex scroll-mb-[calc(var(--mobile-bottom-action-height)+1rem)] cursor-pointer items-center justify-center overflow-hidden rounded-[var(--radius-card-md)] border border-dashed border-[var(--color-hairline)] bg-[var(--color-surface-soft)] ${instagramPreview ? "p-2" : "min-h-36"}`}
            >
              {instagramPreview ? (
                <img
                  src={instagramPreview}
                  alt="Instagram 인증 사진 미리보기"
                  className="max-h-[min(16rem,32dvh)] w-full object-contain"
                  data-buddy-proof-preview
                />
              ) : (
                <span className="flex items-center gap-2 text-sm font-bold text-[var(--color-muted)]">
                  <DyveIcon name="upload" size="sm" /> 사진 선택
                </span>
              )}
            </label>
            {imageError && <p className="mt-2 text-sm text-[var(--color-error)]">{imageError}</p>}
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="text-lg font-bold">어떤 성별의 버디를 원하시나요?</h3>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {DESIRED_GENDERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={desiredGender === item.value}
                  onClick={() => setDesiredGender(item.value)}
                  className={`h-14 rounded-[var(--radius-button-md)] border text-sm font-bold transition-colors ${
                    desiredGender === item.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--color-hairline)] bg-[var(--color-surface-white)] text-[var(--color-body)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <label htmlFor="buddy-festival-style" className="text-lg font-bold">페스티벌을 어떻게 즐기시나요?</label>
            <Textarea
              id="buddy-festival-style"
              className="mt-5"
              rows={5}
              maxLength={1000}
              value={festivalStyle}
              autoFocus
              onChange={(event) => setFestivalStyle(event.target.value)}
              placeholder="예: 앞쪽에서 신나게 즐기고, 중간중간 쉬면서 맛있는 것도 먹어요."
            />
          </div>
        )}

        {step === 7 && (
          <div>
            <h3 className="text-lg font-bold">
              {hasLineup
                ? "이번 페스티벌에서 꼭 보고 싶은 아티스트를 골라주세요."
                : "꼭 봐야 하는 아티스트는 누구인가요?"}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
              선택한 아티스트와 관람 스타일을 함께 살펴 Buddy를 매칭해요.
            </p>
            {hasLineup ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {lineup.map((artist) => {
                  const selected = selectedArtists.includes(artist.name);
                  return (
                    <button
                      key={artist.name}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedArtists((current) => (
                        selected
                          ? current.filter((name) => name !== artist.name)
                          : [...current, artist.name]
                      ))}
                      className={`min-h-11 rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-bold transition-colors ${
                        selected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                          : "border-[var(--color-hairline)] bg-[var(--color-surface-white)] text-[var(--color-body)]"
                      }`}
                    >
                      {artist.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <Textarea
                id="buddy-artists"
                className="mt-5"
                rows={4}
                maxLength={500}
                value={mustSeeArtists}
                autoFocus
                onChange={(event) => setMustSeeArtists(event.target.value)}
                placeholder="예: 잔나비, 검정치마"
              />
            )}
          </div>
        )}

        {step === 8 && (
          <div>
            <label htmlFor="buddy-activities" className="text-lg font-bold">버디와 함께 무엇을 하고 싶나요?</label>
            <Textarea
              id="buddy-activities"
              className="mt-5"
              rows={5}
              maxLength={1000}
              value={activities}
              autoFocus
              onChange={(event) => setActivities(event.target.value)}
              placeholder="예: 공연 전에 같이 식사하고, 서로 사진도 찍어주고 싶어요."
            />
            <p className="mt-4 whitespace-pre-line break-keep rounded-[var(--radius-card-md)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--color-body)]">
              {"공연 3일 전, 매칭 확정 이후 채팅방이 만들어질 예정입니다.\n세부 동행 계획은 나의 다이브 버디와 직접 논의해주세요!"}
            </p>
          </div>
        )}
      </div>

      <div className="mobile-fixed-bar app-bottom-bar border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]" data-buddy-form-actions>
        <div className="flex gap-2">
          {step > 1 && (
            <Button type="button" variant="outline-soft" className="flex-1" onClick={() => setStep(step - 1)}>
              이전
            </Button>
          )}
          <Button
            type="button"
            className="flex-1"
            disabled={!isCurrentStepValid || isSubmitting}
            onClick={() => step < 8 ? setStep(step + 1) : void handleSubmit()}
          >
            {step < 8
              ? "다음"
              : isSubmitting
                ? "신청 중..."
                : participationFee > 0
                  ? "매칭 신청하고 결제하기"
                  : "나에게 맞는 Buddy 찾기"}
          </Button>
        </div>
      </div>
    </section>
  );
}
