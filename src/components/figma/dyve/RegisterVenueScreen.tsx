import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useEffect, useRef, useState } from "react";
import { AddressSearchSheet } from "./AddressSearchSheet";
import { NavHeader } from "./NavHeader";
import { DyveIcon } from "./DyveIcon";
import {
  normalizeVenueTypeForSubmit,
} from "../../../utils/venueTypes";
import { readCompressedImage } from "../../../utils/imageUtils";
import { scrollAppMainToTop } from "../../../utils/scroll";
import {
  VENUE_MATCHING_PREFIXES,
  excludeProfileMatchingValues,
  readProfileMatchingValues,
} from "../../../utils/profileMatching";
const OPERATION_PURPOSE_NOTE_PREFIX = "__purpose_note__:";
const VENUE_MATCHING_PREFIX_LIST = Object.values(VENUE_MATCHING_PREFIXES);
const DATA_IMAGE_PREFIX = /^data:image\//i;
const sanitizeNumericInput = (value: string) => value.replace(/\D/g, "");

type InitialVenueData = {
  id?: string;
  name?: string;
  imageUrl?: string;
  image?: string;
  venueType?: string;
  venue_type?: string;
  subtitle?: string;
  tags?: string[] | string;
  venueFeatureTags?: string[] | string;
  venue_feature_tags?: string[] | string;
  capacity?: string | number | null;
  capacityStanding?: string | number | null;
  capacity_standing?: string | number | null;
  capacitySeated?: string | number | null;
  capacity_seated?: string | number | null;
  bio?: string;
  socialLinks?: string[] | string;
  social_links?: string[] | string;
  amenities?: string[] | string | Record<string, unknown>;
  address?: string;
  detailAddress?: string;
  detail_address?: string;
  instagramId?: string;
  instagram_id?: string;
  instagramUrl?: string;
  instagram_url?: string;
  gallery?: string[] | string;
  venueEventTypes?: string[] | string;
  venue_event_types?: string[] | string;
  venueCautionNotes?: string[] | string;
  venue_caution_notes?: string[] | string;
  soundproofingLevel?: string | null;
  soundproofing_level?: string;
  schedulePolicy?: Record<string, unknown> | string;
  schedule_policy?: Record<string, unknown> | string;
  settlementModes?: string[] | string;
  settlement_modes?: string[] | string;
  preferredPerformanceMoods?: string[] | string;
  preferred_performance_moods?: string[] | string;
  operationPurposes?: string[] | string;
  operation_purposes?: string[] | string;
  residencyArtists?: string[] | string;
  residency_artists?: string[] | string;
  businessRegistrationStatus?: "pending" | "approved" | "rejected" | null;
  business_registration_status?: "pending" | "approved" | "rejected" | null;
  businessRegistrationRejectionReason?: string;
  business_registration_rejection_reason?: string;
};

type RegisterVenuePayload = {
  type: "venue";
  name: string;
  imageUrl?: string;
  image?: string;
  venueType: string;
  subtitle: string;
  bio?: string;
  address: string;
  detailAddress?: string;
  tags?: string[];
  venueFeatureTags?: string[];
  capacity?: number;
  capacityStanding?: number;
  capacitySeated?: number;
  amenities: Record<string, unknown>;
  venueEventTypes: string[];
  venueCautionNotes?: string[];
  soundproofingLevel?: string | null;
  schedulePolicy?: Record<string, unknown>;
  preferredPerformanceMoods?: string[];
  operationPurposes: string[];
  socialLinks?: string[];
  instagramId?: string;
  instagramUrl?: string;
  gallery?: string[];
  galleryFiles?: File[];
  businessRegistrationFile?: File;
};

interface RegisterVenueScreenProps {
  onBack: () => void;
  onSubmit: (payload: RegisterVenuePayload) => void;
  isSubmitDisabled?: boolean;
  submitNotice?: string;
  isSubmitting?: boolean;
  submitError?: string | null;
  initialData?: InitialVenueData | null;
  mode?: "create" | "edit";
  submitLabel?: string;
}

const BUSINESS_REGISTRATION_STATUS_LABEL: Record<"pending" | "approved" | "rejected", string> = {
  pending: "사업자 심사 중",
  approved: "사업자 인증 완료",
  rejected: "사업자 심사 거절",
};

const BUSINESS_REGISTRATION_STATUS_STYLE: Record<"pending" | "approved" | "rejected", string> = {
  pending: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  approved: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  rejected: "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-error)]",
};

const SOUNDPROOFING_LABEL: Record<string, string> = {
  excellent: "방음 상태가 우수합니다.",
  normal: "일반적인 수준의 방음이 되어 있습니다.",
  complaint_risk: "소음 민원 가능성이 있어 사전 협의가 필요합니다.",
};

const parseStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      if (typeof parsed === "string") {
        const parsedTrimmed = parsed.trim();
        return parsedTrimmed ? [parsedTrimmed] : [];
      }
    } catch {
      // ignore JSON parse errors and fall back
    }
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

const parseObject = (value: unknown): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const parsePositiveInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const normalizeInstagramHandle = (value: string) => {
  const trimEdge = (raw: string) => {
    const edgeChars = "[]\"'` \t\r\n.,;:!?)";
    let start = 0;
    let end = raw.length;
    while (start < end && edgeChars.includes(raw[start])) start += 1;
    while (end > start && edgeChars.includes(raw[end - 1])) end -= 1;
    return raw.slice(start, end);
  };

  const fromSerialized = (() => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const first = parsed.find((item): item is string => typeof item === "string" && item.trim().length > 0);
        return first ?? trimmed;
      }
      if (typeof parsed === "string" && parsed.trim()) {
        return parsed;
      }
    } catch {
      // ignore JSON parse errors and fall back
    }
    return trimmed;
  })();

  const trimmed = trimEdge(fromSerialized);
  if (!trimmed) return "";

  const hasDomain = /instagram\.com|instagr\.am/i.test(trimmed);
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  if (hasDomain) {
    const sanitized = /^(https?:)?\/\//i.test(withoutAt) ? withoutAt : `https://${withoutAt}`;
    try {
      const url = new URL(sanitized);
      const handle =
        url.pathname
          .replace(/^\/+/, "")
          .split("/")
          .find((segment) => segment.trim().length > 0) ?? "";
      return handle.replace(/[^A-Za-z0-9._]/g, "");
    } catch {
      const match = sanitized.match(/(?:instagram\.com|instagr\.am)\/([^/?#]+)/i);
      return (match?.[1] ?? "").replace(/[^A-Za-z0-9._]/g, "");
    }
  }

  return withoutAt.replace(/[^A-Za-z0-9._]/g, "");
};

const dedupeStrings = (items: string[]) =>
  Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

export function RegisterVenueScreen({
  onBack,
  onSubmit,
  isSubmitDisabled = false,
  submitNotice,
  isSubmitting = false,
  submitError,
  initialData,
  mode = "create",
  submitLabel,
}: RegisterVenueScreenProps) {
  const isEditMode = mode === "edit";
  const MAX_GALLERY_IMAGES = 9;
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [hasImageFile, setHasImageFile] = useState(false);
  const [businessRegistrationFile, setBusinessRegistrationFile] = useState<File | null>(null);
  const [businessRegistrationFileName, setBusinessRegistrationFileName] = useState("");
  const [hasBusinessRegistrationOnFile, setHasBusinessRegistrationOnFile] = useState(false);
  const [businessRegistrationStatus, setBusinessRegistrationStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [businessRegistrationRejectionReason, setBusinessRegistrationRejectionReason] = useState("");
  const [name, setName] = useState("");
  const [venueTypeCustom, setVenueTypeCustom] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [capacityStanding, setCapacityStanding] = useState("");
  const [capacitySeated, setCapacitySeated] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const maxSteps = 2;

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const businessRegistrationInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [eventAndAtmosphere, setEventAndAtmosphere] = useState("");
  const [operationSummary, setOperationSummary] = useState("");
  const [facilitiesEquipment, setFacilitiesEquipment] = useState("");
  const [accessDescription, setAccessDescription] = useState("");
  const [cautionAndSoundproofing, setCautionAndSoundproofing] = useState("");

  const [galleryEntries, setGalleryEntries] = useState<Array<{ preview: string; file?: File }>>([]);
  const [instagramHandle, setInstagramHandle] = useState("");
  const canUploadBusinessRegistration =
    !hasBusinessRegistrationOnFile || businessRegistrationStatus === null || businessRegistrationStatus === "rejected";

  useEffect(() => {
    if (!initialData) return;

    const record = initialData as Record<string, unknown>;
    const read = (...keys: string[]) => {
      for (const key of keys) {
        const value = record[key];
        if (value !== undefined && value !== null) return value;
      }
      return undefined;
    };

    setName(typeof initialData.name === "string" ? initialData.name : "");
    const rawVenueType =
      typeof read("venueType", "venue_type") === "string" ? String(read("venueType", "venue_type")).trim() : "";
    setVenueTypeCustom(rawVenueType);
    setSubtitle(typeof initialData.subtitle === "string" ? initialData.subtitle : "");
    setBio(typeof initialData.bio === "string" ? initialData.bio : "");
    setAddress(typeof initialData.address === "string" ? initialData.address : "");
    setDetailAddress(typeof read("detailAddress", "detail_address") === "string" ? String(read("detailAddress", "detail_address")) : "");
    const legacySoundproofing =
      typeof read("soundproofingLevel", "soundproofing_level") === "string"
        ? String(read("soundproofingLevel", "soundproofing_level")).trim()
        : "";

    const standing = parsePositiveInteger(read("capacityStanding", "capacity_standing"));
    const seated = parsePositiveInteger(read("capacitySeated", "capacity_seated"));
    const legacy = parsePositiveInteger(read("capacity"));

    setCapacityStanding(standing ? String(standing) : legacy ? String(legacy) : "");
    setCapacitySeated(seated ? String(seated) : "");

    const resolvedImage = typeof initialData.imageUrl === "string" && initialData.imageUrl.trim()
      ? initialData.imageUrl
      : typeof initialData.image === "string"
        ? initialData.image
        : "";
    if (resolvedImage) {
      setImageUrl(resolvedImage);
      setImageFileName("기존 프로필");
      setHasImageFile(Boolean(resolvedImage));
    }

    const resolvedBusinessRegistrationStatus = read(
      "businessRegistrationStatus",
      "business_registration_status",
    );
    setBusinessRegistrationStatus(
      resolvedBusinessRegistrationStatus === "pending" ||
      resolvedBusinessRegistrationStatus === "approved" ||
      resolvedBusinessRegistrationStatus === "rejected"
        ? resolvedBusinessRegistrationStatus
        : null,
    );
    setBusinessRegistrationRejectionReason(
      typeof read(
        "businessRegistrationRejectionReason",
        "business_registration_rejection_reason",
      ) === "string"
        ? String(
            read(
              "businessRegistrationRejectionReason",
              "business_registration_rejection_reason",
            ),
          )
        : "",
    );
    const resolvedHasBusinessRegistration = read(
      "hasBusinessRegistration",
      "has_business_registration",
    );
    const resolvedBusinessRegistrationImage = read(
      "businessRegistrationImage",
      "business_registration_image",
    );
    const hasSubmittedBusinessRegistration =
      typeof resolvedHasBusinessRegistration === "boolean"
        ? resolvedHasBusinessRegistration
        : typeof resolvedBusinessRegistrationImage === "string" && resolvedBusinessRegistrationImage.trim().length > 0;
    setHasBusinessRegistrationOnFile(hasSubmittedBusinessRegistration);
    setBusinessRegistrationFileName(
      hasSubmittedBusinessRegistration ? "기존 제출본" : "",
    );
    setBusinessRegistrationFile(null);

    const parsedOperationPurposes = dedupeStrings(
      parseStringArray(read("operationPurposes", "operation_purposes")),
    );
    const operationTagsFromPayload = excludeProfileMatchingValues(
      parsedOperationPurposes.filter((item) => !item.startsWith(OPERATION_PURPOSE_NOTE_PREFIX)),
      VENUE_MATCHING_PREFIX_LIST,
    );
    const parsedTags = dedupeStrings(parseStringArray(read("tags")));
    const encodedSpaceUses = readProfileMatchingValues(parsedOperationPurposes, VENUE_MATCHING_PREFIXES.spaceUse);
    setOperationSummary(
      dedupeStrings([
        ...operationTagsFromPayload,
        ...readProfileMatchingValues(parsedOperationPurposes, VENUE_MATCHING_PREFIXES.experience),
        ...encodedSpaceUses,
        ...parsedTags,
        ...readProfileMatchingValues(parsedOperationPurposes, VENUE_MATCHING_PREFIXES.supportNeed),
        ...readProfileMatchingValues(parsedOperationPurposes, VENUE_MATCHING_PREFIXES.budget),
      ]).join("\n"),
    );

    const venueEvents = dedupeStrings(
      parseStringArray(read("venueEventTypes", "venue_event_types")),
    );
    const preferredMoods = dedupeStrings(
      parseStringArray(read("preferredPerformanceMoods", "preferred_performance_moods")),
    );
    setEventAndAtmosphere(dedupeStrings([...venueEvents, ...preferredMoods]).join("\n"));
    const cautionNotes = dedupeStrings(parseStringArray(read("venueCautionNotes", "venue_caution_notes")));
    setCautionAndSoundproofing(
      dedupeStrings([
        ...cautionNotes,
        ...(legacySoundproofing ? [SOUNDPROOFING_LABEL[legacySoundproofing] ?? legacySoundproofing] : []),
      ]).join("\n"),
    );
    const amenitiesRaw = read("amenities");
    const amenityObject = parseObject(amenitiesRaw);
    const nextCustom: string[] = [];
    const nextEquipment: string[] = [];
    let nextAccess = "";

    const collectAmenityText = (value: unknown, keyHint?: string) => {
      if (Array.isArray(value)) {
        value.forEach((item) => collectAmenityText(item, keyHint));
        return;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return;
        if (keyHint?.toLowerCase().includes("access")) {
          nextAccess = trimmed;
          return;
        }
        if (keyHint?.toLowerCase().includes("equipment")) {
          nextEquipment.push(trimmed);
          return;
        }
        nextCustom.push(trimmed);
        return;
      }
      if (value && typeof value === "object") {
        Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => collectAmenityText(nested, key));
      }
    };

    if (amenityObject) {
      collectAmenityText(amenityObject);
    } else {
      const amenityList = parseStringArray(amenitiesRaw);
      amenityList.forEach((item) => {
        const trimmed = item.trim();
        if (!trimmed) return;
        const accessMatch = trimmed.match(/^오시는\s*길\s*[:-]?\s*(.*)$/);
        if (accessMatch) {
          const resolvedAccess = (accessMatch[1] || "").trim();
          if (resolvedAccess) nextAccess = resolvedAccess;
          return;
        }
        nextCustom.push(trimmed);
      });
    }

    setFacilitiesEquipment(dedupeStrings([...nextCustom, ...nextEquipment]).join("\n"));
    setAccessDescription(nextAccess);

    const socialLinks = parseStringArray(read("socialLinks", "social_links"));
    const instagramUrlFromFields =
      typeof read("instagramUrl", "instagram_url") === "string" && String(read("instagramUrl", "instagram_url")).trim()
        ? String(read("instagramUrl", "instagram_url"))
        : typeof read("instagramId", "instagram_id") === "string" && String(read("instagramId", "instagram_id")).trim()
          ? `https://instagram.com/${String(read("instagramId", "instagram_id")).replace(/^@/, "").trim()}`
          : "";
    const allLinks = [instagramUrlFromFields, ...socialLinks].filter(Boolean);
    const instagramLink = allLinks.find((url) => /instagram\.com|instagr\.am|^@/i.test(url));
    if (instagramLink) {
      setInstagramHandle(normalizeInstagramHandle(instagramLink));
    }

    const galleryList = parseStringArray(read("gallery"));
    if (galleryList.length > 0) {
      setGalleryEntries(galleryList.map((src) => ({ preview: src })));
    }
  }, [initialData]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("이미지 파일만 업로드할 수 있어요.");
      return;
    }
    try {
      const result = await readCompressedImage(file);
      if (!result) {
        setFormError("이미지를 불러오지 못했어요.");
        return;
      }
      setImageUrl(result);
      setImageFileName(file.name);
      setHasImageFile(true);
      setFormError(null);
    } catch {
      setFormError("이미지를 불러오지 못했어요.");
    } finally {
      event.currentTarget.value = "";
    }
  };

  const handleBusinessRegistrationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("사업자등록증은 이미지 파일만 업로드할 수 있어요.");
      event.currentTarget.value = "";
      return;
    }
    setBusinessRegistrationFile(file);
    setBusinessRegistrationFileName(file.name);
    setHasBusinessRegistrationOnFile(true);
    setBusinessRegistrationStatus("pending");
    setBusinessRegistrationRejectionReason("");
    setFormError(null);
    event.currentTarget.value = "";
  };

  const handleGalleryPick = () => {
    galleryInputRef.current?.click();
  };

  const handleGalleryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      setFormError("이미지 파일만 업로드할 수 있어요.");
      event.currentTarget.value = "";
      return;
    }
    const remainingSlots = MAX_GALLERY_IMAGES - galleryEntries.length;
    if (remainingSlots <= 0) {
      setFormError(`갤러리는 최대 ${MAX_GALLERY_IMAGES}장까지 등록할 수 있어요.`);
      event.currentTarget.value = "";
      return;
    }
    const selectedFiles = imageFiles.slice(0, remainingSlots);
    try {
      const previews = await Promise.all(selectedFiles.map(readFileAsDataUrl));
      const appended = previews
        .map((preview, index) => ({ preview, file: selectedFiles[index] }))
        .filter((item) => item.preview);
      setGalleryEntries((prev) => [...prev, ...appended]);
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

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (isSubmitDisabled || isSubmitting) return;
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedSubtitle = subtitle.trim();
    const trimmedBio = bio.trim();
    const baseAddress = address.trim();
    const extraAddress = detailAddress.trim();

    if (!trimmedName) {
      setFormError("공간명을 입력해 주세요.");
      return;
    }
    if (trimmedName.length > 120) {
      setFormError("공간명은 120자 이내로 입력해 주세요.");
      return;
    }
    const trimmedVenueTypeCustom = venueTypeCustom.trim();
    if (!trimmedVenueTypeCustom) {
      setFormError("공간 유형을 입력해 주세요.");
      return;
    }
    if (!trimmedSubtitle) {
      setFormError("한 줄 소개를 입력해 주세요.");
      return;
    }
    if (trimmedSubtitle.length > 100) {
      setFormError("한 줄 소개는 100자 이내로 입력해 주세요.");
      return;
    }
    if (!trimmedBio) {
      setFormError("공간 소개 및 분위기를 입력해 주세요.");
      return;
    }
    if (trimmedBio.length > 300) {
      setFormError("공간 소개 및 분위기는 300자 이내로 입력해 주세요.");
      return;
    }
    if (!baseAddress) {
      setFormError("주소를 입력해 주세요.");
      return;
    }
    if (!imageUrl || (!hasImageFile && !DATA_IMAGE_PREFIX.test(imageUrl))) {
      setFormError("대표 이미지를 업로드해 주세요.");
      return;
    }
    const standing = parsePositiveInteger(capacityStanding);
    const seated = parsePositiveInteger(capacitySeated);

    if (capacityStanding.trim() && !standing) {
      setFormError("스탠딩 수용인원은 1 이상의 숫자여야 합니다.");
      return;
    }
    if (capacitySeated.trim() && !seated) {
      setFormError("좌석 수용인원은 1 이상의 숫자여야 합니다.");
      return;
    }
    if (!standing && !seated) {
      setFormError("수용인원은 스탠딩/좌석 중 최소 1개를 입력해 주세요.");
      return;
    }

    const trimmedEventAndAtmosphere = eventAndAtmosphere.trim();
    const trimmedOperationSummary = operationSummary.trim();
    const trimmedFacilitiesEquipment = facilitiesEquipment.trim();
    const trimmedAccess = accessDescription.trim();
    const trimmedCautionAndSoundproofing = cautionAndSoundproofing.trim();

    if (!trimmedEventAndAtmosphere) {
      setFormError("열고 싶은 행사와 공간 분위기를 입력해 주세요.");
      return;
    }
    if (!trimmedOperationSummary) {
      setFormError("공연 운영 경험과 필요한 지원을 입력해 주세요.");
      return;
    }
    if (!trimmedFacilitiesEquipment) {
      setFormError("편의시설과 보유 장비를 입력해 주세요.");
      return;
    }
    if (!trimmedCautionAndSoundproofing) {
      setFormError("주의사항과 방음 정보를 입력해 주세요.");
      return;
    }

    const amenitiesPayload: Record<string, unknown> = { details: trimmedFacilitiesEquipment };
    if (trimmedAccess) amenitiesPayload.access = trimmedAccess;

    const normalizedInstagram = normalizeInstagramHandle(instagramHandle);
    const instagramUrl = normalizedInstagram ? `https://instagram.com/${normalizedInstagram}` : "";

    const gallery = galleryEntries.map((entry) => entry.preview);
    const galleryFiles = galleryEntries
      .map((entry) => entry.file)
      .filter((file): file is File => Boolean(file));

    const legacyCapacity = Math.max(standing ?? 0, seated ?? 0);
    const normalizedVenueType = normalizeVenueTypeForSubmit("other", trimmedVenueTypeCustom);

    onSubmit({
      type: "venue",
      name: trimmedName,
      imageUrl,
      image: imageUrl,
      venueType: normalizedVenueType.venueType,
      venueFeatureTags: normalizedVenueType.venueFeatureTags,
      subtitle: trimmedSubtitle,
      bio: trimmedBio,
      address: baseAddress,
      detailAddress: extraAddress || undefined,
      tags: [],
      capacityStanding: standing ?? undefined,
      capacitySeated: seated ?? undefined,
      capacity: legacyCapacity > 0 ? legacyCapacity : undefined,
      amenities: amenitiesPayload,
      venueEventTypes: [trimmedEventAndAtmosphere],
      venueCautionNotes: [trimmedCautionAndSoundproofing],
      soundproofingLevel: null,
      preferredPerformanceMoods: [],
      operationPurposes: [trimmedOperationSummary],
      socialLinks: instagramUrl ? [instagramUrl] : [],
      instagramId: normalizedInstagram || undefined,
      instagramUrl: instagramUrl || undefined,
      gallery,
      galleryFiles: galleryFiles.length > 0 ? galleryFiles : undefined,
      businessRegistrationFile: businessRegistrationFile ?? undefined,
    });
  };

  return (
    <div className="relative min-h-full bg-[var(--color-canvas)] pb-32 text-[var(--color-ink)] animate-in slide-in-from-right duration-300">
      <NavHeader
        title={isEditMode ? "베뉴 정보 수정" : "베뉴 등록하기"}
        onBack={onBack}
      />

      <div className="space-y-10 p-6">
        {/* Stepper Progress Indicator */}
        <div className="mb-2 flex items-center justify-between">
          {Array.from({ length: maxSteps }, (_, index) => index + 1).map((s) => (
            <div key={s} className="flex-1 flex items-center">
              <div className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-[var(--color-primary)]" : "bg-[var(--color-hairline)]"}`} />
              {s < maxSteps && <div className="w-2" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center pt-2">
              <input
                ref={imageInputRef}
                id="venue-image-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="sr-only"
              />
              <label
                htmlFor="venue-image-input"
                className="group relative flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[var(--color-hairline)] bg-[var(--color-surface-soft)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="베뉴 이미지" className="h-full w-full object-cover" />
                ) : (
                  <DyveIcon name="upload" size="lg" tone="muted" className="h-10 w-10 transition-colors group-hover:text-[var(--color-primary)]" />
                )}
                <div className="absolute bottom-2 right-2 z-10 rounded-full bg-[var(--color-primary)] p-2 shadow-lg">
                  <DyveIcon name="plus" size="md" tone="inverse" />
                </div>
              </label>
              <span className="mt-4 text-base font-medium text-[var(--color-muted)]">
                {imageFileName ? `${imageFileName} 업로드됨` : "베뉴 대표 이미지 업로드"}
              </span>
            </div>

            {!isEditMode && (
              <div className="mt-8 border-y border-[var(--color-hairline)] py-4">
                <p className="text-sm font-bold text-[var(--color-ink)]">사업자등록증은 등록 후 제출</p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[var(--color-muted)]">
                  {"베뉴 등록을 먼저 완료한 뒤 마이페이지에서 제출할 수 있어요.\n승인이 끝나면 제안과 계약을 진행할 수 있어요."}
                </p>
              </div>
            )}

            {isEditMode && (
              <div className="mt-8 space-y-3 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-5">
                <input
                  ref={businessRegistrationInputRef}
                  id="business-registration-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleBusinessRegistrationChange}
                  className="sr-only"
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-ink)]">사업자등록증</p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[var(--color-muted)]">
                      {"JPEG, PNG 파일을 업로드해 주세요.\n심사가 끝나면 제안과 계약을 진행할 수 있어요."}
                    </p>
                  </div>
                  {hasBusinessRegistrationOnFile && businessRegistrationStatus && (
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${BUSINESS_REGISTRATION_STATUS_STYLE[businessRegistrationStatus]}`}
                    >
                      {BUSINESS_REGISTRATION_STATUS_LABEL[businessRegistrationStatus]}
                    </span>
                  )}
                </div>
                {hasBusinessRegistrationOnFile && businessRegistrationStatus === "rejected" && businessRegistrationRejectionReason && (
                  <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-error)]">
                    <p className="font-semibold">거절 사유</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-primary-soft)]/90">
                      {businessRegistrationRejectionReason}
                    </p>
                  </div>
                )}
                {hasBusinessRegistrationOnFile && businessRegistrationStatus === "approved" && (
                  <div className="whitespace-pre-line rounded-2xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/10 px-4 py-3 text-xs text-[var(--color-success)]">
                    {"사업자등록증 심사가 완료됐어요.\n이제 제안과 계약을 진행할 수 있어요."}
                  </div>
                )}
                {hasBusinessRegistrationOnFile && businessRegistrationStatus === "pending" && (
                  <div className="whitespace-pre-line rounded-2xl border border-[var(--color-warning)]/20 bg-[var(--color-warning)]/10 px-4 py-3 text-xs text-[var(--color-warning)]">
                    {"현재 사업자등록증을 심사 중입니다.\n승인 전에는 계약을 진행할 수 없습니다."}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!canUploadBusinessRegistration) return;
                    businessRegistrationInputRef.current?.click();
                  }}
                  disabled={!canUploadBusinessRegistration}
                  className="flex w-full items-center justify-between rounded-[var(--radius-card-md)] border border-dashed border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-4 text-left transition-colors hover:border-[var(--color-primary)]/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {hasBusinessRegistrationOnFile && businessRegistrationStatus === "rejected"
                        ? "사업자등록증 재제출"
                        : "사업자등록증 등록"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {businessRegistrationFileName
                        ? `${businessRegistrationFileName} 선택됨`
                        : hasBusinessRegistrationOnFile
                          ? "기존 제출본이 등록되어 있습니다."
                          : "파일을 선택해 주세요."}
                    </p>
                    {!canUploadBusinessRegistration && (
                      <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                        심사 결과가 나올 때까지 새 파일은 올릴 수 없어요.
                      </p>
                    )}
                  </div>
                  <DyveIcon name="upload" size="md" tone="muted" className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="space-y-8 mt-10">
              <div className="space-y-2">
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">공간명 *</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="공간명 입력"
                  className="h-12 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 text-lg font-bold text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                />
              </div>

              <div className="space-y-3">
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">공간 유형 *</Label>
                <Input
                  value={venueTypeCustom}
                  onChange={(event) => setVenueTypeCustom(event.target.value)}
                  placeholder="예: 북카페, 복합바, 아트라운지"
                  className="h-12 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">한 줄 소개 * (100자)</Label>
                <Input
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  maxLength={100}
                  placeholder="공간을 한 문장으로 소개해 주세요"
                  className="h-12 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                />
                <p className="text-right text-xs text-[var(--color-muted)]">{subtitle.length}/100</p>
              </div>

              <div className="space-y-2">
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">공간 소개 및 분위기 * (300자)</Label>
                <Textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={300}
                  placeholder="공간 소개와 분위기를 함께 적어 주세요."
                  className="min-h-[120px] resize-none rounded-2xl border-transparent bg-[var(--color-surface-soft)] p-4 text-base leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                />
                <p className="text-right text-xs text-[var(--color-muted)]">{bio.length}/300</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">주소 *</Label>
                  <button
                    type="button"
                    onClick={() => setIsAddressSheetOpen(true)}
                    className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-1 text-[11px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)]/60 hover:text-[var(--color-ink)]"
                  >
                    도로명주소 검색
                  </button>
                </div>
                <div className="relative">
                  <Input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="주소 검색을 눌러주세요"
                    className="h-12 w-full rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 pr-10 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                  />
                  <DyveIcon name="map-pin" size="md" tone="muted" className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" />
                </div>
                <Input
                  value={detailAddress}
                  onChange={(event) => setDetailAddress(event.target.value)}
                  placeholder="상세주소 입력 (예: 1층 203호)"
                  className="mt-2 h-12 w-full rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                />
                <p className="text-xs text-[var(--color-muted)]">주소를 기준으로 지역이 자동으로 정리돼요.</p>
              </div>

              <div className="space-y-3">
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">수용인원 * (둘 중 하나 이상)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={capacityStanding}
                      onChange={(event) => setCapacityStanding(sanitizeNumericInput(event.target.value))}
                      placeholder="스탠딩"
                      className="h-12 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 pr-10 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <DyveIcon name="users" size="sm" tone="muted" className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={capacitySeated}
                      onChange={(event) => setCapacitySeated(sanitizeNumericInput(event.target.value))}
                      placeholder="좌석"
                      className="h-12 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 pr-10 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <DyveIcon name="users" size="sm" tone="muted" className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-lg font-bold text-[var(--color-ink)]">열고 싶은 행사와 공간 분위기 *</Label>
                <Textarea
                  value={eventAndAtmosphere}
                  onChange={(event) => setEventAndAtmosphere(event.target.value)}
                  placeholder="열고 싶은 행사와 공간이 지향하는 분위기를 자유롭게 적어 주세요."
                  className="min-h-32 resize-none rounded-xl bg-[var(--color-surface-soft)] p-4"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-lg font-bold text-[var(--color-ink)]">공연 운영 경험과 필요한 지원 *</Label>
                <Textarea
                  value={operationSummary}
                  onChange={(event) => setOperationSummary(event.target.value)}
                  placeholder="공연 경험, 도움받고 싶은 부분과 가능한 예산을 함께 적어 주세요."
                  className="min-h-32 resize-none rounded-xl bg-[var(--color-surface-soft)] p-4"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-lg font-bold text-[var(--color-ink)]">편의시설과 보유 장비 *</Label>
                <Textarea
                  value={facilitiesEquipment}
                  onChange={(event) => setFacilitiesEquipment(event.target.value)}
                  placeholder="대기실, 주차, 음향·조명 등 제공 가능한 시설과 장비를 적어 주세요."
                  className="min-h-32 resize-none rounded-xl bg-[var(--color-surface-soft)] p-4"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-lg font-bold text-[var(--color-ink)]">오시는 길 한 줄 설명</Label>
                <Input
                  value={accessDescription}
                  onChange={(event) => setAccessDescription(event.target.value)}
                  placeholder="예: 합정역 5번 출구에서 도보 3분"
                  className="h-12 rounded-xl bg-[var(--color-surface-soft)] px-4"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-lg font-bold text-[var(--color-ink)]">주의사항과 방음 정보 *</Label>
                <Textarea
                  value={cautionAndSoundproofing}
                  onChange={(event) => setCautionAndSoundproofing(event.target.value)}
                  placeholder="사용 제한, 주변 민원 가능성, 방음 상태 등 꼭 알아야 할 내용을 적어 주세요."
                  className="min-h-32 resize-none rounded-xl bg-[var(--color-surface-soft)] p-4"
                  required
                />
              </div>
            </div>


            <div className="space-y-3 border-t border-[var(--color-hairline)] pt-4">
              <div className="flex items-center gap-2">
                <DyveIcon name="instagram" size="md" className="text-[var(--color-primary)]" />
                <Label className="text-lg font-bold text-[var(--color-ink)]">Instagram (선택)</Label>
              </div>
              <Input
                value={instagramHandle}
                onChange={(event) => setInstagramHandle(normalizeInstagramHandle(event.target.value).slice(0, 50))}
                placeholder="dyve_official"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-12 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
              />
              <p className="whitespace-pre-line text-xs text-[var(--color-muted)]">{"URL이 아니라 아이디만 입력하세요.\n@는 생략해도 됩니다."}</p>
            </div>

            <div className="space-y-3 border-t border-[var(--color-hairline)] pt-4">
              <Label className="pl-1 text-lg font-bold text-[var(--color-ink)]">공간 사진 갤러리 (선택)</Label>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryChange}
                className="sr-only"
              />
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={handleGalleryPick}
                  className="aspect-square cursor-pointer rounded-2xl border border-dashed border-[var(--color-hairline-strong)] bg-[var(--color-surface-soft)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
                >
                  <div className="flex h-full w-full flex-col items-center justify-center">
                    <DyveIcon name="upload" size="lg" tone="muted" className="mb-2 h-8 w-8" />
                    <span className="text-[11px] text-[var(--color-muted)]">사진 추가</span>
                  </div>
                </button>
                {galleryEntries.map((entry, index) => (
                  <div key={`${entry.preview}-${index}`} className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--color-hairline)]">
                    <img src={entry.preview} alt={`갤러리 이미지 ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(index)}
                      className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-[var(--color-ink)] hover:bg-black/90"
                      aria-label="갤러리 이미지 삭제"
                    >
                      <DyveIcon name="x" size="sm" tone="inverse" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mobile-fixed-bar app-bottom-bar border-t p-4 pb-8">
        {(formError || submitError) && (
          <p className="mb-2 text-center text-xs text-[var(--color-primary)]">{formError ?? submitError}</p>
        )}
        <div className="flex gap-2">
          {step > 1 && (
            <Button
              onClick={() => {
                setStep(s => s - 1);
                scrollAppMainToTop("auto");
              }}
              className="w-1/3 rounded-xl bg-[var(--color-surface-soft)] py-6 font-bold text-[var(--color-ink)] transition-all hover:scale-[0.98] hover:bg-[var(--color-surface-muted)]"
            >
              이전
            </Button>
          )}
          <Button
            onClick={() => {
              if (step < maxSteps) {
                if (step === 1 && !name.trim()) {
                  setFormError("공간명을 입력해 주세요.");
                  return;
                }
                setFormError(null);
                setStep(s => s + 1);
                scrollAppMainToTop("smooth");
              } else {
                handleSubmit();
              }
            }}
            disabled={isSubmitDisabled || isSubmitting}
            className={`flex-1 rounded-xl py-6 text-lg font-bold transition-colors ${isSubmitDisabled || isSubmitting
              ? "bg-[var(--color-surface-muted)] text-[var(--color-muted)]"
              : "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
              }`}
          >
            {step < maxSteps
              ? "다음 단계로"
              : isSubmitting
                ? isEditMode
                  ? "저장 중..."
                  : "등록 중..."
                : submitLabel ?? (isEditMode ? "베뉴 정보 저장하기" : "베뉴 등록하기")}
          </Button>
        </div>
        {isSubmitDisabled && submitNotice && (
          <p className="mt-2 text-center text-xs text-[var(--color-muted)]">{submitNotice}</p>
        )}
      </div>

      <AddressSearchSheet
        isOpen={isAddressSheetOpen}
        onClose={() => setIsAddressSheetOpen(false)}
        onSelect={(roadAddr) => {
          setAddress(roadAddr);
          setDetailAddress("");
        }}
      />
    </div >
  );
}
