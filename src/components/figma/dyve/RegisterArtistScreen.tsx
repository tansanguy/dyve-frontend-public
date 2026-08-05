import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { InlineAddButton } from "./InlineAddButton";
import { NavHeader } from "./NavHeader";
import { DyveIcon, DyveIconButton } from "./DyveIcon";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  type ArtistProfileDTO,
  type ArtistProfileSubmitPayload,
  type ArtistTeamType,
} from "../../../types/artistProfile";
import {
  buildArtistProfileSubmitPayload,
  extractInstagramId,
  mapArtistProfileDto,
  normalizeGenericUrl,
} from "../../../utils/artistProfile";
import { REGION_OPTIONS } from "../../../utils/regions";
import {
  ARTIST_MATCHING_PREFIXES,
  excludeProfileMatchingValues,
} from "../../../utils/profileMatching";
import { readCompressedImage, MAX_IMAGE_PAYLOAD_BYTES, estimateDataUrlBytes } from "../../../utils/imageUtils";
import { toast } from "sonner";

type InitialArtistData = ArtistProfileDTO;

interface RegisterArtistScreenProps {
  onBack: () => void;
  onSubmit: (payload: ArtistProfileSubmitPayload) => void;
  isSubmitDisabled?: boolean;
  submitNotice?: string;
  isSubmitting?: boolean;
  submitError?: string | null;
  initialData?: InitialArtistData | null;
  mode?: "create" | "edit";
  submitLabel?: string;
}

const MAX_GALLERY_IMAGES = 9;
const MAX_BIO_LENGTH = 500;
const MAX_SUBTITLE_LENGTH = 50;
const MAX_REQUIREMENTS_LENGTH = 200;
const TEAM_MEMBER_MIN = 2;
const TEAM_MEMBER_MAX = 20;
const sanitizeNumericInput = (value: string) => value.replace(/\D/g, "");
const ARTIST_MATCHING_PREFIX_LIST = Object.values(ARTIST_MATCHING_PREFIXES);

const dedupeStrings = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const teamSizeFromCount = (count: number) => {
  if (count <= 2) return "2" as const;
  if (count <= 4) return "3-4" as const;
  return "5+" as const;
};

const teamCountFromSize = (size?: string) => {
  if (!size) return "";
  if (size === "2") return "2";
  if (size === "3-4") return "3";
  if (size === "5+") return "5";
  return "";
};

const isInstagramUrl = (value: string) => /instagram\.com|instagr\.am/i.test(value);

const normalizeInstagramIdInput = (value: string) => {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed) && !isInstagramUrl(trimmed)) return "";
  return extractInstagramId(trimmed).slice(0, 50);
};

const fieldLabelClassName = "pl-1 text-xs font-bold uppercase tracking-[0.04em] text-primary";
const helperTextClassName = "text-xs text-[var(--color-muted)]";
const inputClassName =
  "h-12 rounded-xl border-hairline bg-surface-soft px-4 text-base text-ink placeholder:text-[var(--color-muted)] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40";
const textareaClassName =
  "rounded-[var(--radius-card-lg)] border-hairline bg-surface-soft text-ink placeholder:text-[var(--color-muted)] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40";
const chipClassName = "flex items-center gap-2 rounded-full border border-hairline bg-surface-soft px-3 py-2 text-sm text-ink";
const chipRemoveButtonClassName =
  "inline-flex min-h-8 min-w-8 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30";
const toSubtitleFromIntro = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, MAX_SUBTITLE_LENGTH);
const setupMinutesFromValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (/^\d+$/.test(normalized)) return normalized;
  if (normalized === "2h+") return "120";
  const match = normalized.match(/^(\d+)(m|h)$/);
  if (!match) return "";
  return String(Number(match[1]) * (match[2] === "h" ? 60 : 1));
};
const audienceCountFromValue = (value: string) => value.match(/\d+/g)?.at(-1) ?? "";

export function RegisterArtistScreen({
  onBack,
  onSubmit,
  isSubmitDisabled = false,
  submitNotice,
  isSubmitting = false,
  submitError,
  initialData,
  mode = "create",
  submitLabel,
}: RegisterArtistScreenProps) {
  const isEditMode = mode === "edit";
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const composingRef = useRef(false);

  const [activityName, setActivityName] = useState("");
  const [artistType, setArtistType] = useState("");
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [genreInput, setGenreInput] = useState("");
  const [bio, setBio] = useState("");

  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const [portfolioInput, setPortfolioInput] = useState("");
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);

  const [instagramIdInput, setInstagramIdInput] = useState("");

  const [performanceRequirements, setPerformanceRequirements] = useState("");
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);

  const [teamType, setTeamType] = useState<ArtistTeamType>("solo");
  const [teamMemberCount, setTeamMemberCount] = useState("");

  const [settingTime, setSettingTime] = useState("");

  const [venueRequiredEquipment, setVenueRequiredEquipment] = useState<string[]>([]);
  const [venueRequiredEquipmentInput, setVenueRequiredEquipmentInput] = useState("");
  const [artistBringableEquipment, setArtistBringableEquipment] = useState<string[]>([]);
  const [artistBringableEquipmentInput, setArtistBringableEquipmentInput] = useState("");

  const [expectedAudience, setExpectedAudience] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) return;
    const mapped = mapArtistProfileDto(initialData);
    setActivityName(mapped.activityName);
    setArtistType(mapped.artistTypes[0] ?? "");
    const matchingKeywords = mapped.performanceKeywords;
    setGenreTags(
      dedupeStrings([
        ...mapped.genreTags,
        ...excludeProfileMatchingValues(matchingKeywords, ARTIST_MATCHING_PREFIX_LIST),
      ]),
    );
    setBio(mapped.bio ?? mapped.subtitle ?? "");
    setProfileImageUrl(mapped.profileImageUrl);
    setImageFileName(mapped.profileImageUrl ? "기존 프로필" : "");
    setGalleryImages(mapped.galleryImages);
    setPortfolioLinks(dedupeStrings([...mapped.portfolioLinks, ...mapped.socialLinks.map((link) => link.url)]));
    setInstagramIdInput(mapped.instagramId ?? "");
    setPerformanceRequirements(mapped.performanceRequirements ?? "");
    setPreferredRegions(mapped.preferredRegions);
    setTeamType(mapped.teamType);
    setTeamMemberCount(
      typeof mapped.teamMemberCount === "number" && mapped.teamMemberCount > 0
        ? String(mapped.teamMemberCount)
        : teamCountFromSize(mapped.teamSize),
    );
    setSettingTime(setupMinutesFromValue(mapped.settingTime));
    setVenueRequiredEquipment(mapped.venueRequiredEquipment);
    setArtistBringableEquipment(mapped.artistBringableEquipment);
    setExpectedAudience(audienceCountFromValue(mapped.expectedAudience ?? ""));
  }, [initialData]);

  const handleCompositionStart = () => {
    composingRef.current = true;
  };

  const handleCompositionEnd = () => {
    composingRef.current = false;
  };

  const handleEnterKey = (event: KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (event.key !== "Enter") return;
    if (event.nativeEvent.isComposing || composingRef.current) return;
    event.preventDefault();
    action();
  };

  const showDuplicateInputAlert = () => {
    toast.info("이미 추가된 항목입니다.");
  };

  const addTag = (
    value: string,
    currentItems: string[],
    setter: (updater: (prev: string[]) => string[]) => void,
    clear: () => void,
  ) => {
    const next = value.trim();
    if (!next) return;
    const isDuplicate = currentItems.some((item) => item.trim() === next);
    if (isDuplicate) {
      showDuplicateInputAlert();
      return;
    }
    setter((prev) => dedupeStrings([...prev, next]));
    clear();
  };

  const removeTag = (value: string, setter: (updater: (prev: string[]) => string[]) => void) => {
    setter((prev) => prev.filter((item) => item !== value));
  };

  const handleImagePick = () => {
    imageInputRef.current?.click();
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("이미지 파일만 업로드할 수 있어요.");
      event.currentTarget.value = "";
      return;
    }

    try {
      const result = await readCompressedImage(file);
      if (!result) {
        setFormError("이미지를 불러오지 못했어요.");
        event.currentTarget.value = "";
        return;
      }
      const payloadBytes = estimateDataUrlBytes(result);
      if (payloadBytes > MAX_IMAGE_PAYLOAD_BYTES) {
        setFormError("이미지 용량이 너무 커요. 더 작은 이미지를 선택해 주세요.");
        event.currentTarget.value = "";
        return;
      }
      setProfileImageUrl(result);
      setImageFileName(file.name);
      setFormError(null);
    } catch {
      setFormError("이미지를 불러오지 못했어요.");
    } finally {
      event.currentTarget.value = "";
    }
  };

  const handleGalleryPick = () => {
    galleryInputRef.current?.click();
  };

  const handleGalleryChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      setFormError("갤러리는 이미지 파일만 업로드할 수 있어요.");
      event.currentTarget.value = "";
      return;
    }

    const remainingSlots = MAX_GALLERY_IMAGES - galleryImages.length;
    if (remainingSlots <= 0) {
      setFormError(`갤러리는 최대 ${MAX_GALLERY_IMAGES}장까지 등록할 수 있어요.`);
      event.currentTarget.value = "";
      return;
    }

    try {
      const selected = imageFiles.slice(0, remainingSlots);
      const compressed = await Promise.all(selected.map((file) => readCompressedImage(file)));
      setGalleryImages((prev) => [...prev, ...compressed.filter(Boolean)]);
      if (imageFiles.length > remainingSlots) {
        setFormError(`갤러리는 최대 ${MAX_GALLERY_IMAGES}장까지 등록할 수 있어요.`);
      } else {
        setFormError(null);
      }
    } catch {
      setFormError("갤러리 이미지를 불러오지 못했어요.");
    } finally {
      event.currentTarget.value = "";
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addPortfolioLink = () => {
    const normalized = normalizeGenericUrl(portfolioInput);
    if (!normalized) return;
    setPortfolioLinks((prev) => dedupeStrings([...prev, normalized]));
    setPortfolioInput("");
  };

  const removePortfolioLink = (value: string) => {
    setPortfolioLinks((prev) => prev.filter((item) => item !== value));
  };

  const validate = () => {
    if (!activityName.trim()) return "활동명을 입력해 주세요.";
    if (!artistType.trim()) return "아티스트 유형을 입력해 주세요.";
    if (!profileImageUrl) return "프로필 이미지 1장을 업로드해 주세요.";
    if (!normalizeInstagramIdInput(instagramIdInput)) return "인스타그램 ID 또는 URL을 입력해 주세요.";
    if (!bio.trim()) return "소개글을 입력해 주세요.";
    if (bio.trim().length > MAX_BIO_LENGTH) return `소개글은 ${MAX_BIO_LENGTH}자 이하로 입력해 주세요.`;
    if (performanceRequirements.trim().length > MAX_REQUIREMENTS_LENGTH) {
      return `공연시 요구사항은 ${MAX_REQUIREMENTS_LENGTH}자 이하로 입력해 주세요.`;
    }
    if (preferredRegions.length === 0) return "선호 활동지역을 하나 이상 선택해 주세요.";
    if (teamType === "team") {
      const count = Number.parseInt(teamMemberCount, 10);
      if (!Number.isFinite(count) || count < TEAM_MEMBER_MIN) {
        return "팀 인원수를 선택해 주세요.";
      }
      if (count > TEAM_MEMBER_MAX) {
        return `팀 인원수는 최대 ${TEAM_MEMBER_MAX}명까지 입력할 수 있어요.`;
      }
    }
    if (!settingTime.trim() || Number(settingTime) < 1) return "세팅시간을 1분 이상 입력해 주세요.";
    return null;
  };

  const handleSubmit = () => {
    if (isSubmitDisabled || isSubmitting) return;
    setFormError(null);

    const validationMessage = validate();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const teamMemberCountNumber = teamType === "team" ? Number.parseInt(teamMemberCount, 10) : undefined;
    const normalizedBio = bio.trim();
    const normalizedInstagramId = normalizeInstagramIdInput(instagramIdInput);

    const dto: ArtistProfileDTO = {
      type: "artist",
      activityName: activityName.trim(),
      subtitle: normalizedBio ? toSubtitleFromIntro(normalizedBio) : undefined,
      artistTypes: dedupeStrings([artistType]),
      genreTags: dedupeStrings(genreTags),
      bio: normalizedBio,
      profileImageUrl,
      galleryImages: dedupeStrings(galleryImages),
      portfolioLinks: dedupeStrings(portfolioLinks),
      socialLinks: [],
      performanceRequirements: performanceRequirements.trim() || undefined,
      preferredRegions: dedupeStrings(preferredRegions),
      teamType,
      teamSize:
        teamType === "team" && typeof teamMemberCountNumber === "number" && Number.isFinite(teamMemberCountNumber)
          ? teamSizeFromCount(teamMemberCountNumber)
          : undefined,
      teamMemberCount:
        teamType === "team" && typeof teamMemberCountNumber === "number" && Number.isFinite(teamMemberCountNumber)
          ? teamMemberCountNumber
          : undefined,
      needsSessionSupport: false,
      settingTime: settingTime.trim(),
      performanceKeywords: dedupeStrings(genreTags),
      venueRequiredEquipment: dedupeStrings(venueRequiredEquipment),
      artistBringableEquipment: dedupeStrings(artistBringableEquipment),
      equipmentList: dedupeStrings(artistBringableEquipment),
      equipment: dedupeStrings(artistBringableEquipment),
      expectedAudience: expectedAudience.trim() || undefined,
      instagramId: normalizedInstagramId,
      residencyArtists: [],
    };

    onSubmit(buildArtistProfileSubmitPayload(dto));
  };

  return (
    <div className="relative min-h-full animate-in slide-in-from-right bg-canvas pb-32 text-ink duration-300">
      <NavHeader
        title={isEditMode ? "아티스트 정보 수정" : "새 아티스트 프로필"}
        onBack={onBack}
      />

      <div className="space-y-10 p-6">
        <div className="border-y border-hairline py-4">
          <div className="flex items-start gap-3">
            <DyveIcon name="info" size="md" tone="primary" className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-base font-bold text-ink">
                {isEditMode ? "공개 정보 수정 시 재승인이 필요해요" : "운영팀 승인 후 프로필이 공개돼요"}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--color-muted)]">
                {isEditMode
                  ? "활동명, 이미지, 소개, 장르, 활동 지역, 팀 구성, 포트폴리오 등 핵심 정보를 수정하면 다시 심사가 진행됩니다."
                  : "요청한 프로필은 DYVE 운영팀이 확인합니다.\n승인 전에는 본인과 관리자만 프로필을 볼 수 있어요."}
              </p>
              {initialData?.approvalStatus === "rejected" && initialData.rejectionReason && (
                <p className="mt-2 text-sm font-medium text-[var(--color-primary)]">반려 사유: {initialData.rejectionReason}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center pt-4">
          <button
            type="button"
            aria-label="아티스트 프로필 사진 선택"
            onClick={handleImagePick}
            className="group relative flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-hairline bg-surface-soft transition-colors hover:border-primary hover:bg-surface-muted"
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="아티스트 프로필" className="h-full w-full object-cover" />
            ) : (
              <DyveIcon name="camera" size="lg" tone="muted" className="h-10 w-10 transition-colors group-hover:text-primary" />
            )}
            <div className="absolute bottom-2 right-2 z-10 rounded-full bg-primary p-2 shadow-lg">
              <DyveIcon name="plus" size="md" tone="inverse" />
            </div>
          </button>
          <span className="mt-4 text-base font-medium text-[var(--color-muted)]">
            {imageFileName ? `${imageFileName} 업로드됨` : "프로필 사진 업로드"}
          </span>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <Label className={fieldLabelClassName}>활동명</Label>
            <Input
              value={activityName}
              onChange={(event) => setActivityName(event.target.value)}
              placeholder="활동명 입력"
              className={`${inputClassName} text-lg font-bold`}
            />
          </div>

          <div className="space-y-3">
            <Label className={fieldLabelClassName}>아티스트 유형 (필수)</Label>
            <p className={helperTextClassName}>디제이, 밴드, 화가 등 큰 범주의 아티스트 유형을 입력해 주세요.</p>
            <Input
              value={artistType}
              onChange={(event) => setArtistType(event.target.value)}
              placeholder="예: DJ, 밴드, 화가"
              className={inputClassName}
            />
          </div>

          <div className="space-y-3">
            <Label className={fieldLabelClassName}>키워드 태그 선택 (선택)</Label>
            <p className={`${helperTextClassName} whitespace-pre-line`}>{"장르, 키워드를 입력해 주세요.\n목록 카드에도 함께 보여요."}</p>
            <div className="relative">
              <Input
                value={genreInput}
                onChange={(event) => setGenreInput(event.target.value)}
                onKeyDown={(event) => handleEnterKey(event, () => addTag(genreInput, genreTags, setGenreTags, () => setGenreInput("")))}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder="장르, 키워드 입력 + Enter"
                className={`${inputClassName} pr-24`}
              />
              <InlineAddButton onClick={() => addTag(genreInput, genreTags, setGenreTags, () => setGenreInput(""))} />
            </div>
            <div className="flex min-h-[32px] flex-wrap gap-2 pt-1">
              {genreTags.length === 0 && <span className="pl-1 text-sm italic text-[var(--color-muted)]">등록된 키워드 태그가 없습니다.</span>}
              {genreTags.map((tag) => (
                <div key={tag} className={chipClassName}>
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag, setGenreTags)}
                    className={chipRemoveButtonClassName}
                    aria-label={`${tag} 태그 삭제`}
                  >
                    <DyveIcon name="x" size="sm" tone="default" className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        <section className="space-y-6 border-t border-hairline/80 pt-4" aria-labelledby="artist-matching-title">
          <div>
            <h3 id="artist-matching-title" className="text-lg font-bold text-ink">더 잘 맞는 무대를 위한 정보</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
              베뉴가 제안 전에 활동 방식과 분위기를 빠르게 이해할 수 있어요.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={fieldLabelClassName}>소개글 (필수)</Label>
              <span className={helperTextClassName}>{bio.length}/{MAX_BIO_LENGTH}</span>
            </div>
            <p className={helperTextClassName}>활동 방식, 가능한 무대, 공연 분위기와 강점을 자유롭게 어필해 주세요.</p>
            <Textarea
              value={bio}
              onChange={(event) => setBio(event.target.value.slice(0, MAX_BIO_LENGTH))}
              placeholder="어떤 아티스트인지, 어떤 무대와 잘 맞는지 소개해 주세요."
              className={`min-h-[180px] resize-none p-4 text-lg leading-relaxed ${textareaClassName}`}
              required
            />
          </div>
        </section>

        <div className="space-y-3 border-t border-hairline/80 pt-4">
          <div className="flex items-center gap-2">
            <DyveIcon name="image-plus" size="md" tone="primary" />
            <Label className="text-lg font-bold text-ink">공연사진 갤러리 (선택)</Label>
          </div>
          <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryChange} className="sr-only" />
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleGalleryPick}
              className="flex aspect-square flex-col items-center justify-center rounded-[var(--radius-card-lg)] border border-dashed border-hairline bg-surface-soft transition-colors hover:border-primary hover:bg-surface-muted"
            >
              <DyveIcon name="image-plus" size="lg" tone="muted" className="mb-2 h-8 w-8" />
              <span className="text-[11px] text-[var(--color-muted)]">사진 추가</span>
            </button>
            {galleryImages.map((image, index) => (
              <div key={`${image}-${index}`} className="relative aspect-square overflow-hidden rounded-[var(--radius-card-lg)] border border-hairline">
                <img src={image} alt={`공연사진 ${index + 1}`} className="h-full w-full object-cover" />
                <DyveIconButton
                  name="x"
                  label={`공연사진 ${index + 1} 삭제`}
                  onClick={() => removeGalleryImage(index)}
                  variant="overlay"
                  iconTone="inverse"
                  iconSize="sm"
                  className="absolute right-2 top-2 h-11 w-11 rounded-full"
                />
              </div>
            ))}
          </div>
          <p className={helperTextClassName}>최대 {MAX_GALLERY_IMAGES}장까지 업로드할 수 있어요.</p>
        </div>

        <div className="space-y-4 border-t border-hairline/80 pt-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <DyveIcon name="globe" size="md" tone="primary" /> 포트폴리오 / 외부 링크
          </h3>
          <p className={helperTextClassName}>
            아티스트님의 작업물을 더 다양하게 보여줄 수록, 베뉴가 더 관심을 가질거에요.
            <br />
            SoundCloud, YouTube, 개인 사이트 등 인스타그램 외 링크를 입력해 주세요.
          </p>
          <div className="space-y-3">
            <div className="relative">
              <Input
                value={portfolioInput}
                onChange={(event) => setPortfolioInput(event.target.value)}
                onKeyDown={(event) => handleEnterKey(event, addPortfolioLink)}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder="외부 링크 URL + Enter"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`${inputClassName} pr-24`}
              />
              <InlineAddButton onClick={addPortfolioLink} />
            </div>
            <div className="flex min-h-[32px] flex-wrap gap-2 pt-1">
              {portfolioLinks.length === 0 && <span className="pl-1 text-sm italic text-[var(--color-muted)]">등록된 외부 링크가 없습니다.</span>}
              {portfolioLinks.map((link) => (
                <div key={link} className={chipClassName}>
                  <span className="max-w-[220px] truncate text-xs text-[var(--color-muted)]">{link}</span>
                  <button
                    type="button"
                    onClick={() => removePortfolioLink(link)}
                    className={chipRemoveButtonClassName}
                    aria-label={`${link} 링크 삭제`}
                  >
                    <DyveIcon name="x" size="sm" tone="default" className="h-3 w-3 hover:text-primary" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-hairline/80 pt-4">
          <div className="flex items-center gap-2">
            <DyveIcon name="instagram" size="md" className="text-[var(--color-primary)]" />
            <Label className="text-lg font-bold text-ink">인스타그램 / SNS (필수)</Label>
          </div>
          <p className={`${helperTextClassName} whitespace-pre-line`}>
            {"인스타그램 아이디 또는 instagram.com URL을 입력하세요.\nSoundCloud, 개인 사이트 등 작업물 링크는 위 포트폴리오에 추가해 주세요."}
          </p>
          <Input
            value={instagramIdInput}
            onChange={(event) => setInstagramIdInput(event.target.value.slice(0, 120))}
            placeholder="dyve_official 또는 instagram.com/dyve_official"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={inputClassName}
          />
          <p className={helperTextClassName}>저장 시 아이디만 정리됩니다. @는 생략해도 됩니다.</p>
        </div>

        <div className="space-y-2 border-t border-hairline/80 pt-4">
          <div className="flex items-center justify-between">
            <Label className={fieldLabelClassName}>공연시 요구사항 (선택)</Label>
            <span className={helperTextClassName}>
              {performanceRequirements.length}/{MAX_REQUIREMENTS_LENGTH}
            </span>
          </div>
          <Textarea
            value={performanceRequirements}
            onChange={(event) => setPerformanceRequirements(event.target.value.slice(0, MAX_REQUIREMENTS_LENGTH))}
            placeholder="무대/사운드/진행 관련 요청사항을 입력하세요"
            className={`min-h-[110px] resize-none p-4 text-base leading-relaxed ${textareaClassName}`}
          />
        </div>

        <div className="space-y-3 border-t border-hairline/80 pt-4">
          <div className="flex items-center gap-2">
            <DyveIcon name="map-pin" size="md" tone="primary" />
            <Label className="text-lg font-bold text-ink">선호 활동지역 (필수)</Label>
          </div>
          <p className="text-sm leading-6 text-[var(--color-muted)]">주로 활동하거나 공연하고 싶은 지역을 선택해 주세요.</p>
          <select
            multiple
            value={preferredRegions}
            onChange={(event) => setPreferredRegions(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}
            className="min-h-44 w-full rounded-[var(--radius-card-lg)] border border-hairline bg-surface-soft p-3 text-base text-ink"
            aria-label="선호 활동지역"
            required
          >
            {REGION_OPTIONS.map((region) => <option key={region.code} value={region.code}>{region.label}</option>)}
          </select>
          <p className={helperTextClassName}>여러 지역을 선택할 수 있어요.</p>
        </div>

        <div className="space-y-4 border-t border-hairline/80 pt-4">
          <div className="flex items-center gap-2">
            <DyveIcon name="users" size="md" tone="primary" />
            <Label className="text-lg font-bold text-ink">팀 여부 (필수)</Label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTeamType("solo");
                setTeamMemberCount("");
              }}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                teamType === "solo"
                  ? "border-primary bg-primary/10 text-ink"
                  : "border-hairline bg-surface-soft text-[var(--color-muted)] hover:border-hairline hover:text-[var(--color-ink)]"
              }`}
            >
              개인
            </button>
            <button
              type="button"
              onClick={() => {
                setTeamType("team");
              }}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                teamType === "team"
                  ? "border-primary bg-primary/10 text-ink"
                  : "border-hairline bg-surface-soft text-[var(--color-muted)] hover:border-hairline hover:text-[var(--color-ink)]"
              }`}
            >
              팀
            </button>
          </div>

          {teamType === "team" && (
            <div className="space-y-3 rounded-[var(--radius-card-lg)] border border-hairline bg-surface-soft p-4">
              <div className="space-y-2">
                <Label className={fieldLabelClassName}>팀 인원수</Label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={teamMemberCount}
                    onChange={(event) => setTeamMemberCount(sanitizeNumericInput(event.target.value))}
                    placeholder="예: 4"
                    className={`${inputClassName} pr-10`}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">명</span>
                </div>
                <p className="pl-1 text-xs text-[var(--color-muted)]">
                  세션 포함 최소 인원수를 직접 입력해 주세요. 최소 {TEAM_MEMBER_MIN}명, 최대 {TEAM_MEMBER_MAX}명
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-hairline/80 pt-4">
          <div className="flex items-center gap-2">
            <DyveIcon name="clock-3" size="md" tone="primary" />
            <Label className="text-lg font-bold text-ink">세팅시간 (필수)</Label>
          </div>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              value={settingTime}
              onChange={(event) => setSettingTime(sanitizeNumericInput(event.target.value))}
              placeholder="예: 30"
              className={`${inputClassName} pr-12`}
              required
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">분</span>
          </div>
        </div>

        <div className="space-y-5 border-t border-hairline/80 pt-4">
          <div className="space-y-3">
            <Label className="text-lg font-bold text-ink">베뉴에 있어야 할 필수 장비 (선택)</Label>
            <p className={helperTextClassName}>꼭 필요한 최소한의 장비만 입력해 주세요.</p>
            <div className="relative">
              <Input
                value={venueRequiredEquipmentInput}
                onChange={(event) => setVenueRequiredEquipmentInput(event.target.value)}
                onKeyDown={(event) =>
                  handleEnterKey(event, () =>
                    addTag(venueRequiredEquipmentInput, venueRequiredEquipment, setVenueRequiredEquipment, () => setVenueRequiredEquipmentInput("")),
                  )
                }
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder="베뉴 필수 장비 입력 + Enter"
                className={`${inputClassName} pr-24`}
              />
              <InlineAddButton
                onClick={() =>
                  addTag(venueRequiredEquipmentInput, venueRequiredEquipment, setVenueRequiredEquipment, () => setVenueRequiredEquipmentInput(""))
                }
              />
            </div>
            <div className="flex min-h-[32px] flex-wrap gap-2 pt-1">
              {venueRequiredEquipment.length === 0 && <span className="pl-1 text-sm italic text-[var(--color-muted)]">등록된 필수 장비가 없습니다.</span>}
              {venueRequiredEquipment.map((item) => (
                <div key={item} className={chipClassName}>
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(item, setVenueRequiredEquipment)}
                    className={chipRemoveButtonClassName}
                    aria-label={`${item} 필수 장비 삭제`}
                  >
                    <DyveIcon name="x" size="sm" className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-lg font-bold text-ink">가지고 갈 수 있는 장비 (선택)</Label>
            <p className={helperTextClassName}>아티스트가 직접 지참할 수 있는 장비를 입력해 주세요.</p>
            <div className="relative">
              <Input
                value={artistBringableEquipmentInput}
                onChange={(event) => setArtistBringableEquipmentInput(event.target.value)}
                onKeyDown={(event) =>
                  handleEnterKey(event, () =>
                    addTag(artistBringableEquipmentInput, artistBringableEquipment, setArtistBringableEquipment, () => setArtistBringableEquipmentInput("")),
                  )
                }
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder="지참 가능 장비 입력 + Enter"
                className={`${inputClassName} pr-24`}
              />
              <InlineAddButton
                onClick={() =>
                  addTag(artistBringableEquipmentInput, artistBringableEquipment, setArtistBringableEquipment, () => setArtistBringableEquipmentInput(""))
                }
              />
            </div>
            <div className="flex min-h-[32px] flex-wrap gap-2 pt-1">
              {artistBringableEquipment.length === 0 && <span className="pl-1 text-sm italic text-[var(--color-muted)]">등록된 지참 가능 장비가 없습니다.</span>}
              {artistBringableEquipment.map((item) => (
                <div key={item} className={chipClassName}>
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(item, setArtistBringableEquipment)}
                    className={chipRemoveButtonClassName}
                    aria-label={`${item} 지참 장비 삭제`}
                  >
                    <DyveIcon name="x" size="sm" className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-hairline/80 pt-4">
          <Label className="text-lg font-bold text-ink">예상 관객 수 (선택)</Label>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              value={expectedAudience}
              onChange={(event) => setExpectedAudience(sanitizeNumericInput(event.target.value))}
              placeholder="예: 50"
              className={`${inputClassName} pr-12`}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">명</span>
          </div>
        </div>
      </div>

      <div className="mobile-fixed-bar app-bottom-bar border-t p-4 pb-8">
        {(formError || submitError) && <p className="mb-2 text-center text-xs text-[var(--color-primary)]">{formError ?? submitError}</p>}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitDisabled || isSubmitting}
          className={`w-full rounded-xl py-6 text-lg font-bold ${
            isSubmitDisabled || isSubmitting
              ? "bg-surface-muted text-[var(--color-muted)]"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isSubmitting
            ? isEditMode
              ? "저장 중..."
              : "등록 중..."
            : submitLabel ?? (isEditMode ? "아티스트 정보 저장하기" : "프로필 생성 요청하기")}
        </Button>
        {isSubmitDisabled && submitNotice && <p className="mt-2 text-center text-xs text-[var(--color-muted)]">{submitNotice}</p>}
      </div>
    </div>
  );
}
