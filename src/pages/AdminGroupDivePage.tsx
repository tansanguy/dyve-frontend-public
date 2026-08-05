import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import DatePicker from "react-datepicker";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { toDateFromLocalInput, toLocalDateTimeInput } from "../api/eventForm";
import {
  formatDyveCalendarWeekDay,
  renderDyveDatePickerHeader,
} from "../components/figma/dyve/DyveDatePickerHeader";
import {
  api,
  formatApiError,
  type GroupDiveApplicationDto,
  type GroupDiveDto,
} from "../services/api";
import "react-datepicker/dist/react-datepicker.css";

const TABS = [
  ["info", "모집 정보"],
  ["options", "옵션 / 질문"],
  ["applications", "신청자"],
  ["regional", "권역 제안 검토"],
  ["sessions", "회차 / 배정"],
  ["payments", "결제 / 환불"],
] as const;
type Tab = (typeof TABS)[number][0];
type QuestionType = "short" | "long" | "single" | "multiple" | "consent";
type AreaForm = { label: string };
type ScheduleForm = {
  label: string;
  startsAt: string;
  endsAt: string;
  isGuaranteed: boolean;
};
type QuestionForm = {
  prompt: string;
  type: QuestionType;
  options: string[];
  required: boolean;
};
type GalleryEntry = {
  previewUrl: string;
  file?: File;
};

const DEFAULT_START_TIME = "19:00";
const DEFAULT_DURATION_MINUTES = 120;
const MAX_GALLERY_IMAGES = 9;
const GENDER_LABELS: Record<GroupDiveApplicationDto["gender"], string> = {
  female: "여성",
  male: "남성",
  other: "기타",
};
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});
const DURATION_OPTIONS = [
  [60, "1시간"],
  [90, "1시간 30분"],
  [120, "2시간"],
  [180, "3시간"],
] as const;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const getScheduleDurationMinutes = (schedule: ScheduleForm) => {
  const startsAt = toDateFromLocalInput(schedule.startsAt);
  const endsAt = toDateFromLocalInput(schedule.endsAt);
  if (!startsAt || !endsAt || endsAt <= startsAt) return null;
  return Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
};

const getLocalTime = (value: string) => {
  const date = toDateFromLocalInput(value);
  if (!date) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const formatScheduleSummary = (schedule: ScheduleForm) => {
  const startsAt = toDateFromLocalInput(schedule.startsAt);
  const endsAt = toDateFromLocalInput(schedule.endsAt);
  if (!startsAt) return "날짜와 시작 시간을 선택해 주세요.";
  const date = `${startsAt.getFullYear()}. ${startsAt.getMonth() + 1}. ${startsAt.getDate()}. (${WEEKDAY_LABELS[startsAt.getDay()]})`;
  const startTime = getLocalTime(schedule.startsAt);
  if (!endsAt) return `${date} ${startTime} 시작`;
  const sameDay =
    startsAt.getFullYear() === endsAt.getFullYear() &&
    startsAt.getMonth() === endsAt.getMonth() &&
    startsAt.getDate() === endsAt.getDate();
  if (sameDay) return `${date} ${startTime}–${getLocalTime(schedule.endsAt)}`;
  const endDate = `${endsAt.getFullYear()}. ${endsAt.getMonth() + 1}. ${endsAt.getDate()}.`;
  return `${date} ${startTime}–${endDate} ${getLocalTime(schedule.endsAt)}`;
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  final_payment_open: "잔금 결제 중",
  confirmed: "회차 확정",
  completed: "완료",
  cancelled: "취소",
};
const REGIONAL_STATUS_LABELS: Record<string, string> = {
  received: "검토 대기",
  invited: "승인 완료",
  converted: "전환 완료",
  closed: "반려",
};

const emptyForm = {
  title: "",
  summary: "",
  description: "",
  coverImage: "",
  region: "",
  status: "draft",
  minimumParticipants: "4",
  capacity: "8",
  participantFee: "25000",
  depositAmount: "10000",
  applicationFee: "1000",
  finalPaymentHours: "72",
  areas: [] as AreaForm[],
  schedules: [] as ScheduleForm[],
  questions: [] as QuestionForm[],
};

export function AdminGroupDivePage() {
  const [items, setItems] = useState<GroupDiveDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applications, setApplications] = useState<GroupDiveApplicationDto[]>([]);
  const [regionalRequests, setRegionalRequests] = useState<Record<string, unknown>[]>([]);
  const [reviewRegions, setReviewRegions] = useState<Record<string, string>>({});
  const [regionalActionId, setRegionalActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [form, setForm] = useState(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [galleryEntries, setGalleryEntries] = useState<GalleryEntry[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const galleryPreviewUrlsRef = useRef(new Set<string>());
  const loadRequestRef = useRef(0);
  const [sessionForm, setSessionForm] = useState({
    title: "",
    area: "",
    venue: "",
    address: "",
    startsAt: "",
    capacity: "8",
  });

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );
  const hasApplications = applications.length > 0;

  useEffect(
    () => () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    },
    [coverPreviewUrl],
  );

  const clearGalleryPreviewUrls = useCallback(() => {
    galleryPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    galleryPreviewUrlsRef.current.clear();
  }, []);

  useEffect(
    () => () => clearGalleryPreviewUrls(),
    [clearGalleryPreviewUrls],
  );

  const hydrateForm = useCallback((item: GroupDiveDto | null) => {
    setCoverFile(null);
    setCoverPreviewUrl("");
    clearGalleryPreviewUrls();
    setGalleryEntries(
      Array.isArray(item?.gallery)
        ? item.gallery.map((previewUrl) => ({ previewUrl }))
        : [],
    );
    setFormError(null);
    if (!item) {
      setForm(emptyForm);
      return;
    }
    setForm({
      title: item.title,
      summary: item.summary,
      description: item.description,
      coverImage: item.coverImage,
      region: item.region,
      status: item.status,
      minimumParticipants: String(item.minimumParticipants),
      capacity: String(item.capacity),
      participantFee: String(item.participantFee),
      depositAmount: String(item.depositAmount),
      applicationFee: String(item.applicationFee),
      finalPaymentHours: String(item.finalPaymentHours ?? 72),
      areas: item.areas.map((option) => ({ label: option.label })),
      schedules: item.schedules.map((option) => ({
        label: option.label,
        startsAt: option.startsAt
          ? toLocalDateTimeInput(new Date(option.startsAt))
          : "",
        endsAt: option.endsAt
          ? toLocalDateTimeInput(new Date(option.endsAt))
          : "",
        isGuaranteed: Boolean(option.isGuaranteed),
      })),
      questions: item.questions.map((question) => ({
        prompt: question.prompt,
        type: question.type,
        options: question.options,
        required: question.required,
      })),
    });
  }, [clearGalleryPreviewUrls]);

  const load = useCallback(async (preferredId?: string | null) => {
    const requestId = ++loadRequestRef.current;
    try {
      setIsLoading(true);
      setError(null);
      const [groups, requests] = await Promise.all([
        api.adminListGroupDives(),
        api.adminListGroupDiveRegionalRequests(),
      ]);
      if (requestId !== loadRequestRef.current) return;
      setItems(groups.data);
      setRegionalRequests(requests.data);
      const nextId = preferredId ?? selectedId ?? groups.data[0]?.id ?? null;
      setSelectedId(nextId);
      const next = groups.data.find((item) => item.id === nextId) ?? null;
      hydrateForm(next);
      const nextApplications = nextId
        ? (await api.adminListGroupDiveApplications(nextId)).data
        : [];
      if (requestId === loadRequestRef.current) setApplications(nextApplications);
    } catch (loadError) {
      if (requestId === loadRequestRef.current) {
        setError(formatApiError(loadError, "Group Dive 작업공간을 불러오지 못했습니다."));
      }
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  }, [hydrateForm, selectedId]);

  useEffect(() => {
    void load();
    // 첫 로드 후 선택 변경은 selectGroup이 담당한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectGroup = async (item: GroupDiveDto) => {
    const requestId = ++loadRequestRef.current;
    setSelectedId(item.id);
    hydrateForm(item);
    setSelectedApplications([]);
    try {
      const nextApplications = (await api.adminListGroupDiveApplications(item.id)).data;
      if (requestId === loadRequestRef.current) setApplications(nextApplications);
    } catch (loadError) {
      toast.error(formatApiError(loadError, "신청자를 불러오지 못했습니다."));
    }
  };

  const updateForm = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError(null);
  };

  const focusField = (tab: Tab, id: string, message: string) => {
    setActiveTab(tab);
    setFormError(message);
    requestAnimationFrame(() => document.getElementById(id)?.focus());
    return false;
  };

  const validateInfo = () => {
    if (!form.title.trim()) {
      return focusField("info", "group-dive-title", "모집명을 입력해 주세요.");
    }
    if (form.status === "open" && !coverFile && !form.coverImage.trim()) {
      return focusField(
        "info",
        "group-dive-cover",
        "공개 모집에는 포스터 이미지를 등록해 주세요.",
      );
    }
    const minimum = Number(form.minimumParticipants);
    const capacity = Number(form.capacity);
    const participantFee = Number(form.participantFee);
    const depositAmount = Number(form.depositAmount);
    if (!Number.isInteger(minimum) || minimum < 1) {
      return focusField("info", "group-dive-minimum", "최소 인원은 1명 이상이어야 합니다.");
    }
    if (!Number.isInteger(capacity) || capacity < minimum) {
      return focusField("info", "group-dive-capacity", "최대 인원은 최소 인원 이상이어야 합니다.");
    }
    if (depositAmount > participantFee) {
      return focusField("info", "group-dive-deposit", "보증금은 참가비보다 클 수 없습니다.");
    }
    return true;
  };

  const validateOptions = () => {
    const areaLabels = form.areas
      .map((area) => area.label.trim())
      .filter(Boolean);
    if (new Set(areaLabels).size !== areaLabels.length) {
      return focusField(
        "options",
        "group-dive-add-area",
        "같은 권역을 중복으로 등록할 수 없습니다.",
      );
    }
    const guaranteed = form.schedules.filter((schedule) => schedule.isGuaranteed);
    if (form.status === "open" && guaranteed.length !== 1) {
      return focusField(
        "options",
        "group-dive-add-schedule",
        "공개 모집에는 대표 일정을 하나 지정해 주세요.",
      );
    }
    for (const [index, schedule] of form.schedules.entries()) {
      if (!schedule.label.trim()) {
        return focusField(
          "options",
          `group-dive-schedule-label-${index}`,
          `${index + 1}번째 일정 이름을 입력해 주세요.`,
        );
      }
      if (schedule.isGuaranteed && !schedule.startsAt) {
        return focusField(
          "options",
          `group-dive-schedule-start-${index}`,
          "대표 일정의 시작 일시를 입력해 주세요.",
        );
      }
      const startsAt = schedule.startsAt
        ? toDateFromLocalInput(schedule.startsAt)
        : null;
      const endsAt = schedule.endsAt
        ? toDateFromLocalInput(schedule.endsAt)
        : null;
      if (schedule.startsAt && !startsAt) {
        return focusField(
          "options",
          `group-dive-schedule-start-${index}`,
          "올바른 시작 일시를 입력해 주세요.",
        );
      }
      if (schedule.endsAt && (!endsAt || !startsAt || endsAt <= startsAt)) {
        return focusField(
          "options",
          `group-dive-schedule-end-${index}`,
          "종료 일시는 시작 일시보다 늦어야 합니다.",
        );
      }
    }
    for (const [index, question] of form.questions.entries()) {
      if (!question.prompt.trim()) {
        return focusField(
          "options",
          `group-dive-question-prompt-${index}`,
          `${index + 1}번째 질문을 입력해 주세요.`,
        );
      }
      if (
        ["single", "multiple"].includes(question.type) &&
        !question.options.some((option) => option.trim())
      ) {
        return focusField(
          "options",
          `group-dive-question-add-option-${index}`,
          "선택형 질문에는 선택지를 하나 이상 추가해 주세요.",
        );
      }
    }
    return true;
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateInfo() || (!hasApplications && !validateOptions())) return;
    const areas = form.areas
      .map((area, sortOrder) => ({ label: area.label.trim(), sortOrder }))
      .filter((area) => area.label);
    const schedules = form.schedules.map((schedule, sortOrder) => ({
      label: schedule.label.trim(),
      sortOrder,
      isGuaranteed: schedule.isGuaranteed,
      ...(schedule.startsAt
        ? { startsAt: toDateFromLocalInput(schedule.startsAt)!.toISOString() }
        : {}),
      ...(schedule.endsAt
        ? { endsAt: toDateFromLocalInput(schedule.endsAt)!.toISOString() }
        : {}),
    }));
    const questions = form.questions.map((question, sortOrder) => ({
      prompt: question.prompt.trim(),
      type: question.type,
      options: question.options.map((option) => option.trim()).filter(Boolean),
      required: question.required,
      sortOrder,
    }));
    const galleryFiles = galleryEntries.flatMap((entry) =>
      entry.file ? [entry.file] : [],
    );
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      description: form.description.trim(),
      gallery: galleryEntries
        .filter((entry) => !entry.file)
        .map((entry) => entry.previewUrl),
      region: form.region.trim(),
      status: form.status,
      minimumParticipants: Number(form.minimumParticipants),
      capacity: Number(form.capacity),
      finalPaymentHours: Number(form.finalPaymentHours),
    };
    if (!selected || !hasApplications) {
      payload.participantFee = Number(form.participantFee);
      payload.depositAmount = Number(form.depositAmount);
      payload.applicationFee = Number(form.applicationFee);
    }
    if (!selected || applications.length === 0) {
      payload.areas = areas;
      payload.schedules = schedules;
      payload.questions = questions;
    }
    if (!coverFile) payload.coverImage = form.coverImage.trim();
    let requestPayload: Record<string, unknown> | FormData = payload;
    if (coverFile || galleryFiles.length > 0) {
      const multipart = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        multipart.append(
          key,
          ["areas", "schedules", "questions", "refundPolicy", "gallery"].includes(key)
            ? JSON.stringify(value)
            : String(value),
        );
      });
      if (coverFile) multipart.append("coverImageFile", coverFile);
      galleryFiles.forEach((file) => multipart.append("galleryFiles", file));
      requestPayload = multipart;
    }
    try {
      setIsSaving(true);
      const saved = selected
        ? await api.adminUpdateGroupDive(selected.id, requestPayload)
        : await api.adminCreateGroupDive(requestPayload);
      toast.success(selected ? "모집 정보를 저장했습니다." : "Group Dive 모집을 만들었습니다.");
      await load(saved.id);
    } catch (saveError) {
      toast.error(formatApiError(saveError, "Group Dive를 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const createNew = () => {
    loadRequestRef.current += 1;
    setIsLoading(false);
    setSelectedId(null);
    setApplications([]);
    setSelectedApplications([]);
    setForm(emptyForm);
    setCoverFile(null);
    setCoverPreviewUrl("");
    clearGalleryPreviewUrls();
    setGalleryEntries([]);
    setFormError(null);
    setActiveTab("info");
  };

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
    setFormError(null);
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreviewUrl("");
    updateForm("coverImage", "");
  };

  const handleGalleryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";
    const accepted = files.filter((file) => file.type.startsWith("image/"));
    const remaining = MAX_GALLERY_IMAGES - galleryEntries.length;
    if (accepted.length === 0) {
      setFormError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    const nextEntries = accepted.slice(0, Math.max(0, remaining)).map((file) => {
      const previewUrl = URL.createObjectURL(file);
      galleryPreviewUrlsRef.current.add(previewUrl);
      return { previewUrl, file };
    });
    if (nextEntries.length > 0) {
      setGalleryEntries((current) => [...current, ...nextEntries]);
    }
    setFormError(
      accepted.length > remaining
        ? `모임 소개 사진은 최대 ${MAX_GALLERY_IMAGES}장까지 등록할 수 있습니다.`
        : null,
    );
  };

  const removeGalleryEntry = (index: number) => {
    setGalleryEntries((current) => {
      const removed = current[index];
      if (removed?.file) {
        URL.revokeObjectURL(removed.previewUrl);
        galleryPreviewUrlsRef.current.delete(removed.previewUrl);
      }
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
    setFormError(null);
  };

  const moveGalleryEntry = (index: number, direction: -1 | 1) => {
    setGalleryEntries((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      if (Boolean(current[index]?.file) !== Boolean(current[target]?.file)) {
        return current;
      }
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setFormError(null);
  };

  const updateArea = (index: number, label: string) => {
    updateForm(
      "areas",
      form.areas.map((area, areaIndex) =>
        areaIndex === index ? { label } : area,
      ),
    );
  };

  const updateSchedule = (index: number, patch: Partial<ScheduleForm>) => {
    updateForm(
      "schedules",
      form.schedules.map((schedule, scheduleIndex) =>
        scheduleIndex === index ? { ...schedule, ...patch } : schedule,
      ),
    );
  };

  const updateScheduleDate = (index: number, date: Date | null) => {
    const schedule = form.schedules[index];
    if (!schedule) return;
    if (!date) {
      updateSchedule(index, { startsAt: "", endsAt: "" });
      return;
    }
    const currentStart = toDateFromLocalInput(schedule.startsAt);
    const [hours, minutes] = (currentStart ? getLocalTime(schedule.startsAt) : DEFAULT_START_TIME)
      .split(":")
      .map(Number);
    const startsAt = new Date(date);
    startsAt.setHours(hours, minutes, 0, 0);
    const duration = getScheduleDurationMinutes(schedule) ?? DEFAULT_DURATION_MINUTES;
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    updateSchedule(index, {
      startsAt: toLocalDateTimeInput(startsAt),
      endsAt: toLocalDateTimeInput(endsAt),
    });
  };

  const updateScheduleTime = (index: number, time: string) => {
    const schedule = form.schedules[index];
    const startsAt = schedule ? toDateFromLocalInput(schedule.startsAt) : null;
    if (!schedule || !startsAt) return;
    const [hours, minutes] = time.split(":").map(Number);
    startsAt.setHours(hours, minutes, 0, 0);
    const duration = getScheduleDurationMinutes(schedule) ?? DEFAULT_DURATION_MINUTES;
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    updateSchedule(index, {
      startsAt: toLocalDateTimeInput(startsAt),
      endsAt: toLocalDateTimeInput(endsAt),
    });
  };

  const updateScheduleDuration = (index: number, duration: number) => {
    const schedule = form.schedules[index];
    const startsAt = schedule ? toDateFromLocalInput(schedule.startsAt) : null;
    if (!startsAt) return;
    updateSchedule(index, {
      endsAt: toLocalDateTimeInput(new Date(startsAt.getTime() + duration * 60_000)),
    });
  };

  const addScheduleOneWeekLater = (index: number) => {
    const schedule = form.schedules[index];
    const startsAt = schedule ? toDateFromLocalInput(schedule.startsAt) : null;
    if (!schedule || !startsAt) return;
    const endsAt = toDateFromLocalInput(schedule.endsAt);
    startsAt.setDate(startsAt.getDate() + 7);
    if (endsAt) endsAt.setDate(endsAt.getDate() + 7);
    updateForm("schedules", [
      ...form.schedules,
      {
        ...schedule,
        label: schedule.label ? `${schedule.label} · 1주 뒤` : "",
        startsAt: toLocalDateTimeInput(startsAt),
        endsAt: endsAt ? toLocalDateTimeInput(endsAt) : "",
        isGuaranteed: false,
      },
    ]);
  };

  const updateQuestion = (index: number, patch: Partial<QuestionForm>) => {
    updateForm(
      "questions",
      form.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question,
      ),
    );
  };

  const updateStatus = async (applicationId: string, status: string) => {
    try {
      await api.adminUpdateGroupDiveApplicationStatus(applicationId, status);
      if (selectedId) setApplications((await api.adminListGroupDiveApplications(selectedId)).data);
    } catch (statusError) {
      toast.error(formatApiError(statusError, "신청 상태를 변경하지 못했습니다."));
    }
  };

  const createSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    try {
      await api.adminCreateGroupDiveSession(selected.id, {
        ...sessionForm,
        startsAt: new Date(sessionForm.startsAt).toISOString(),
        capacity: Number(sessionForm.capacity),
      });
      toast.success("실제 회차를 만들었습니다.");
      setSessionForm((current) => ({ ...current, title: "", startsAt: "" }));
      await load(selected.id);
    } catch (sessionError) {
      toast.error(formatApiError(sessionError, "회차를 만들지 못했습니다."));
    }
  };

  const assign = async (sessionId: string) => {
    if (selectedApplications.length === 0) {
      toast.error("배정할 신청자를 선택해 주세요.");
      return;
    }
    try {
      await api.adminAssignGroupDiveSession(sessionId, selectedApplications);
      toast.success(`${selectedApplications.length}명을 배정했습니다.`);
      setSelectedApplications([]);
      if (selectedId) await load(selectedId);
    } catch (assignError) {
      toast.error(formatApiError(assignError, "회차 배정에 실패했습니다."));
    }
  };

  const release = async (assignmentId: string) => {
    if (!window.confirm("미결제 회차 배정을 해제할까요?")) return;
    try {
      await api.adminReleaseGroupDiveAssignment(assignmentId);
      toast.success("회차 배정을 해제했습니다.");
      if (selectedId) setApplications((await api.adminListGroupDiveApplications(selectedId)).data);
    } catch (releaseError) {
      toast.error(formatApiError(releaseError, "회차 배정을 해제하지 못했습니다."));
    }
  };

  const refund = async (applicationId: string) => {
    const reason = window.prompt("환불 사유를 입력해 주세요.", "미배정 보증금 환불")?.trim();
    if (!reason || !window.confirm(`보증금 ${(selected?.depositAmount ?? 0).toLocaleString()}원을 환불하고 무료 탐색을 유지할까요?`)) return;
    try {
      await api.adminRefundGroupDiveApplication(applicationId, reason);
      toast.success("보증금 환불을 처리했습니다.");
      if (selectedId) setApplications((await api.adminListGroupDiveApplications(selectedId)).data);
    } catch (refundError) {
      toast.error(formatApiError(refundError, "환불에 실패했습니다. 같은 버튼으로 재시도할 수 있습니다."));
    }
  };

  const approveRegionalRequest = async (item: Record<string, unknown>) => {
    const regionalRequestId = String(item.id);
    const linkedGroupId = typeof item.groupDiveId === "string" ? item.groupDiveId : null;
    const targetGroupId = linkedGroupId ?? selected?.id ?? null;
    const region = (reviewRegions[regionalRequestId] ?? String(item.region)).trim();
    if (!region) {
      toast.error("승인할 최종 권역명을 입력해 주세요.");
      return;
    }
    if (!targetGroupId) {
      toast.error("권역을 추가할 모집을 선택해 주세요.");
      return;
    }
    try {
      setRegionalActionId(regionalRequestId);
      const result = await api.adminApproveGroupDiveRegionalRequest(regionalRequestId, {
        region,
        ...(linkedGroupId ? {} : { groupDiveId: targetGroupId }),
      });
      toast.success(`권역을 승인하고 정식 신청을 열었습니다. ${Number(result.affectedCount ?? 0)}건 처리`);
      await load(targetGroupId);
    } catch (approveError) {
      toast.error(formatApiError(approveError, "권역을 승인하지 못했습니다."));
    } finally {
      setRegionalActionId(null);
    }
  };

  const rejectRegionalRequest = async (item: Record<string, unknown>) => {
    const regionalRequestId = String(item.id);
    if (!window.confirm(`${String(item.region)} 권역 제안을 반려할까요?`)) return;
    try {
      setRegionalActionId(regionalRequestId);
      const result = await api.adminRejectGroupDiveRegionalRequest(regionalRequestId);
      toast.success(`권역 제안을 반려했습니다. ${Number(result.affectedCount ?? 0)}건 처리`);
      await load(selectedId);
    } catch (rejectError) {
      toast.error(formatApiError(rejectError, "권역 제안을 반려하지 못했습니다."));
    } finally {
      setRegionalActionId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-hairline)] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">Group Dive workspace</p>
          <h1 className="mt-1 text-2xl font-extrabold">모집 운영</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">모집부터 옵션, 배정, 결제와 환불을 한 곳에서 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/connection" className="rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] px-4 py-2 text-sm font-bold">회원 화면</Link>
          <button type="button" onClick={createNew} className="rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-on-primary)]">새 모집</button>
        </div>
      </header>

      {error && <p className="mt-4 text-sm text-[var(--color-error)]">{error}</p>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside>
          <h2 className="text-sm font-bold">모집 풀</h2>
          <div className="mt-3 grid gap-2">
            {isLoading ? <p className="text-sm text-[var(--color-muted)]">불러오는 중...</p> : items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void selectGroup(item)}
                className={`rounded-[var(--radius-card-md)] border p-3 text-left ${selectedId === item.id ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-hairline)]"}`}
              >
                <span className="block text-sm font-bold">{item.title}</span>
                <span className="mt-1 block text-xs text-[var(--color-muted)]">{item.status} · 신청 {item.applicantCount}명</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-current={activeTab === "regional" ? "page" : undefined}
            onClick={() => setActiveTab("regional")}
            className={`mt-7 w-full rounded-[var(--radius-card-md)] border p-3 text-left ${
              activeTab === "regional"
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                : "border-[var(--color-hairline)]"
            }`}
          >
            <span className="block text-sm font-bold">권역 제안 검토</span>
            <span className="mt-1 block text-xs text-[var(--color-muted)]">
              미처리 {regionalRequests.filter((item) => item.status === "received").length}건 · 전체 {regionalRequests.length}건
            </span>
          </button>
        </aside>

        <section className="min-w-0">
          <nav className="flex gap-1 overflow-x-auto border-b border-[var(--color-hairline)]" aria-label="Group Dive 관리 탭">
            {TABS.map(([value, label]) => (
              <button key={value} type="button" onClick={() => setActiveTab(value)} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-bold ${activeTab === value ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--color-muted)]"}`}>{label}</button>
            ))}
          </nav>

          <form onSubmit={(event) => void save(event)}>
            <fieldset disabled={isLoading} className="contents">
            {formError && (
              <p
                role="alert"
                className="mt-5 rounded-[var(--radius-card-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-3 text-sm font-semibold text-[var(--color-error)]"
              >
                {formError}
              </p>
            )}
            {activeTab === "info" && (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {hasApplications && <p className="md:col-span-2 rounded-[var(--radius-card-md)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-muted)]">신청자가 생긴 뒤에는 약정 금액 보호를 위해 참가비, 보증금, 신청 수수료를 변경할 수 없습니다.</p>}
                <Field label="모집명"><input id="group-dive-title" required value={form.title} onChange={(event) => updateForm("title", event.target.value)} /></Field>
                <Field label="상태"><select value={form.status} onChange={(event) => updateForm("status", event.target.value)}><option value="draft">초안</option><option value="open">공개 모집</option><option value="completed">완료</option><option value="cancelled">취소</option></select></Field>
                <Field label="권역"><input value={form.region} onChange={(event) => updateForm("region", event.target.value)} /></Field>
                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-[var(--color-body)]">커버 이미지</p>
                  <input
                    id="group-dive-cover"
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="sr-only"
                  />
                  {coverPreviewUrl || form.coverImage ? (
                    <div className="mt-2 overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)]">
                      <img
                        src={coverPreviewUrl || form.coverImage}
                        alt="Group Dive 커버 미리보기"
                        className="mx-auto aspect-[4/5] w-full max-w-sm object-cover"
                      />
                      <div className="flex items-center justify-between gap-3 p-3">
                        <span className="truncate text-xs text-[var(--color-muted)]">
                          {coverFile?.name || "등록된 커버 이미지"}
                        </span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => coverInputRef.current?.click()} className="min-h-11 px-3 text-xs font-bold text-[var(--color-primary)]">다시 선택</button>
                          <button type="button" onClick={removeCover} className="min-h-11 px-3 text-xs font-bold text-[var(--color-error)]">삭제</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="mt-2 flex min-h-40 w-full flex-col items-center justify-center rounded-[var(--radius-card-lg)] border-2 border-dashed border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-sm font-bold text-[var(--color-muted)] hover:border-[var(--color-primary)]"
                    >
                      <span>사진 선택</span>
                      <span className="mt-1 text-xs font-normal">JPG, PNG, WEBP 또는 GIF</span>
                    </button>
                  )}
                </div>
                <Field label="최소 인원"><input id="group-dive-minimum" min="1" type="number" value={form.minimumParticipants} onChange={(event) => updateForm("minimumParticipants", event.target.value)} /></Field>
                <Field label="최대 인원"><input id="group-dive-capacity" min="1" type="number" value={form.capacity} onChange={(event) => updateForm("capacity", event.target.value)} /></Field>
                <Field label="한 줄 소개"><input value={form.summary} onChange={(event) => updateForm("summary", event.target.value)} /></Field>
                <Field label="상세 소개"><textarea rows={4} value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></Field>
                <div className="md:col-span-2" data-group-dive-gallery-editor>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[var(--color-body)]">모임 소개 사진</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">상세 화면에서 4:5 카드뉴스로 표시됩니다.</p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--color-muted)]">
                      {galleryEntries.length} / {MAX_GALLERY_IMAGES}
                    </span>
                  </div>
                  <input
                    id="group-dive-gallery"
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryChange}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={galleryEntries.length >= MAX_GALLERY_IMAGES}
                    className="mt-3 flex min-h-28 w-full flex-col items-center justify-center rounded-[var(--radius-card-lg)] border-2 border-dashed border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-sm font-bold text-[var(--color-muted)] hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>소개 사진 추가</span>
                    <span className="mt-1 text-xs font-normal">최대 {MAX_GALLERY_IMAGES}장</span>
                  </button>
                  {galleryEntries.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {galleryEntries.map((entry, index) => (
                        <div
                          key={`${entry.previewUrl}-${index}`}
                          className="relative overflow-hidden rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]"
                        >
                          <img
                            src={entry.previewUrl}
                            alt={`모임 소개 사진 ${index + 1}`}
                            className="aspect-[4/5] w-full object-cover"
                          />
                          <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                            <button
                              type="button"
                              aria-label={`${index + 1}번째 사진 앞으로 이동`}
                              disabled={
                                index === 0 ||
                                Boolean(entry.file) !== Boolean(galleryEntries[index - 1]?.file)
                              }
                              onClick={() => moveGalleryEntry(index, -1)}
                              className="min-h-9 rounded bg-black/60 px-2 text-xs text-white disabled:opacity-30"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              aria-label={`${index + 1}번째 사진 삭제`}
                              onClick={() => removeGalleryEntry(index)}
                              className="min-h-9 rounded bg-black/60 px-2 text-xs text-white"
                            >
                              삭제
                            </button>
                            <button
                              type="button"
                              aria-label={`${index + 1}번째 사진 뒤로 이동`}
                              disabled={
                                index === galleryEntries.length - 1 ||
                                Boolean(entry.file) !== Boolean(galleryEntries[index + 1]?.file)
                              }
                              onClick={() => moveGalleryEntry(index, 1)}
                              className="min-h-9 rounded bg-black/60 px-2 text-xs text-white disabled:opacity-30"
                            >
                              →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Field label="참가비"><input disabled={hasApplications} type="number" value={form.participantFee} onChange={(event) => updateForm("participantFee", event.target.value)} /></Field>
                <Field label="보증금"><input id="group-dive-deposit" disabled={hasApplications} type="number" value={form.depositAmount} onChange={(event) => updateForm("depositAmount", event.target.value)} /></Field>
                <Field label="신청 수수료"><input disabled={hasApplications} type="number" value={form.applicationFee} onChange={(event) => updateForm("applicationFee", event.target.value)} /></Field>
                <Field label="잔금 기한(시간)"><input min="1" type="number" value={form.finalPaymentHours} onChange={(event) => updateForm("finalPaymentHours", event.target.value)} /></Field>
                <div className="md:col-span-2 rounded-[var(--radius-card-md)] bg-[var(--color-surface-soft)] p-4 text-sm">
                  서버 계산: 최초 <strong>₩{(Number(form.depositAmount) + Number(form.applicationFee)).toLocaleString()}</strong> · 일반 잔금 <strong>₩{(Number(form.participantFee) - Number(form.depositAmount)).toLocaleString()}</strong> · 환불 후 무료 탐색 성사 <strong>₩{Number(form.participantFee).toLocaleString()}</strong>
                </div>
              </div>
            )}

            {activeTab === "options" && (
              <div className="mt-5 grid gap-5">
                {applications.length > 0 && <p className="rounded-[var(--radius-card-md)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-muted)]">신청자가 생긴 뒤에는 응답 스냅샷 보호를 위해 옵션과 질문을 교체할 수 없습니다.</p>}
                <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold">권역 선택지</h3>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">관객이 희망 지역을 하나 선택합니다.</p>
                    </div>
                    <button
                      id="group-dive-add-area"
                      type="button"
                      disabled={hasApplications}
                      onClick={() => updateForm("areas", [...form.areas, { label: "" }])}
                      className="min-h-11 shrink-0 whitespace-nowrap rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] px-3 text-xs font-bold disabled:opacity-50"
                    >
                      + 권역 추가
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {form.areas.length === 0 && <p className="text-sm text-[var(--color-muted)]">등록된 권역이 없습니다.</p>}
                    {form.areas.map((area, index) => (
                      <div key={index} className="flex items-end gap-2">
                        <Field label={`권역 ${index + 1}`}><input disabled={hasApplications} value={area.label} onChange={(event) => updateArea(index, event.target.value)} /></Field>
                        <button
                          type="button"
                          disabled={hasApplications}
                          aria-label={`${index + 1}번째 권역 삭제`}
                          onClick={() => updateForm("areas", form.areas.filter((_, areaIndex) => areaIndex !== index))}
                          className="min-h-11 shrink-0 px-3 text-xs font-bold text-[var(--color-error)] disabled:opacity-50"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold">대표·후보 일정</h3>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">대표 일정은 신청 인원과 관계없이 진행됩니다.</p>
                    </div>
                    <button
                      id="group-dive-add-schedule"
                      type="button"
                      disabled={hasApplications}
                      onClick={() => updateForm("schedules", [...form.schedules, { label: "", startsAt: "", endsAt: "", isGuaranteed: form.schedules.length === 0 }])}
                      className="min-h-11 shrink-0 whitespace-nowrap rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] px-3 text-xs font-bold disabled:opacity-50"
                    >
                      + 일정 추가
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4">
                    {form.schedules.length === 0 && <p className="text-sm text-[var(--color-muted)]">등록된 일정이 없습니다.</p>}
                    {form.schedules.map((schedule, index) => (
                      <fieldset key={index} disabled={hasApplications} className="rounded-[var(--radius-card-md)] bg-[var(--color-surface-soft)] p-4 disabled:opacity-60">
                        <legend className="sr-only">{index + 1}번째 일정</legend>
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
                            <input
                              type="radio"
                              name="group-dive-guaranteed-schedule"
                              checked={schedule.isGuaranteed}
                              onChange={() => updateForm("schedules", form.schedules.map((item, itemIndex) => ({ ...item, isGuaranteed: itemIndex === index })))}
                            />
                            대표 일정 · 확정 진행
                          </label>
                          <button type="button" onClick={() => updateForm("schedules", form.schedules.filter((_, scheduleIndex) => scheduleIndex !== index))} className="min-h-11 px-3 text-xs font-bold text-[var(--color-error)]">삭제</button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <Field label="일정 이름"><input id={`group-dive-schedule-label-${index}`} value={schedule.label} onChange={(event) => updateSchedule(index, { label: event.target.value })} placeholder="예: 8월 1일 대표 모임" /></Field>
                          </div>
                          <div className="grid w-full gap-1.5 text-xs font-bold text-[var(--color-body)]">
                            <span>날짜</span>
                            <DatePicker
                              id={`group-dive-schedule-start-${index}`}
                              selected={toDateFromLocalInput(schedule.startsAt)}
                              onChange={(date: Date | null) => updateScheduleDate(index, date)}
                              renderCustomHeader={renderDyveDatePickerHeader}
                              formatWeekDay={formatDyveCalendarWeekDay}
                              calendarClassName="dyve-datepicker dyve-schedule-datepicker admin-group-dive-datepicker"
                              popperClassName="z-50"
                              popperPlacement="bottom-start"
                              showPopperArrow={false}
                              customInput={(
                                <button
                                  type="button"
                                  aria-label={schedule.startsAt ? `날짜 ${formatScheduleSummary({ ...schedule, endsAt: "" })}` : "날짜 선택"}
                                  className="flex min-h-11 w-full items-center justify-between rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-left text-sm font-semibold"
                                >
                                  <span>
                                    {schedule.startsAt
                                      ? formatScheduleSummary({ ...schedule, endsAt: "" }).replace(/ \d{2}:\d{2} 시작$/, "")
                                      : "날짜 선택"}
                                  </span>
                                  <span className="text-xs text-[var(--color-primary)]">선택</span>
                                </button>
                              )}
                            />
                          </div>
                          <Field label="시작 시간">
                            <select
                              id={`group-dive-schedule-time-${index}`}
                              disabled={!schedule.startsAt}
                              value={getLocalTime(schedule.startsAt)}
                              onChange={(event) => updateScheduleTime(index, event.target.value)}
                            >
                              {!schedule.startsAt && <option value="">날짜를 먼저 선택하세요</option>}
                              {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
                            </select>
                          </Field>
                          <fieldset className="md:col-span-2">
                            <legend className="text-xs font-bold text-[var(--color-body)]">소요 시간</legend>
                            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {DURATION_OPTIONS.map(([minutes, label]) => {
                                const selectedDuration = getScheduleDurationMinutes(schedule) === minutes;
                                return (
                                  <button
                                    key={minutes}
                                    type="button"
                                    disabled={!schedule.startsAt}
                                    aria-pressed={selectedDuration}
                                    onClick={() => updateScheduleDuration(index, minutes)}
                                    className={`min-h-11 rounded-[var(--radius-button-md)] border px-3 text-sm font-bold transition-colors disabled:opacity-50 ${
                                      selectedDuration
                                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                                        : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)]"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </fieldset>
                          <div
                            aria-live="polite"
                            className="md:col-span-2 rounded-[var(--radius-button-md)] border border-[var(--color-primary)]/20 bg-[var(--color-canvas)] px-3 py-3 text-sm font-bold text-[var(--color-body)]"
                          >
                            {formatScheduleSummary(schedule)}
                          </div>
                          <details className="md:col-span-2 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3">
                            <summary className="flex min-h-11 cursor-pointer items-center text-xs font-bold text-[var(--color-muted)]">
                              종료 시간 직접 설정
                            </summary>
                            <div className="pb-3">
                              <Field label="종료 일시">
                                <input
                                  id={`group-dive-schedule-end-${index}`}
                                  type="datetime-local"
                                  value={schedule.endsAt}
                                  onChange={(event) => updateSchedule(index, { endsAt: event.target.value })}
                                />
                              </Field>
                            </div>
                          </details>
                          {schedule.startsAt && (
                            <button
                              type="button"
                              onClick={() => addScheduleOneWeekLater(index)}
                              className="min-h-11 justify-self-start rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-xs font-bold text-[var(--color-primary)] md:col-span-2"
                            >
                              + 1주 뒤 후보 추가
                            </button>
                          )}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </div>

                <div className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold">신청 질문</h3>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">관객에게 필요한 정보만 질문하세요.</p>
                    </div>
                    <button
                      type="button"
                      disabled={hasApplications}
                      onClick={() => updateForm("questions", [...form.questions, { prompt: "", type: "short", options: [], required: true }])}
                      className="min-h-11 rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] px-3 text-xs font-bold disabled:opacity-50"
                    >
                      + 질문 추가
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4">
                    {form.questions.length === 0 && <p className="text-sm text-[var(--color-muted)]">등록된 질문이 없습니다.</p>}
                    {form.questions.map((question, questionIndex) => (
                      <fieldset key={questionIndex} disabled={hasApplications} className="rounded-[var(--radius-card-md)] bg-[var(--color-surface-soft)] p-4 disabled:opacity-60">
                        <legend className="sr-only">{questionIndex + 1}번째 질문</legend>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]">
                          <Field label={`질문 ${questionIndex + 1}`}><input id={`group-dive-question-prompt-${questionIndex}`} value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} /></Field>
                          <Field label="답변 유형">
                            <select value={question.type} onChange={(event) => updateQuestion(questionIndex, { type: event.target.value as QuestionType, options: ["single", "multiple"].includes(event.target.value) ? question.options : [] })}>
                              <option value="short">짧은 답변</option>
                              <option value="long">긴 답변</option>
                              <option value="single">하나 선택</option>
                              <option value="multiple">복수 선택</option>
                              <option value="consent">동의</option>
                            </select>
                          </Field>
                          <button type="button" onClick={() => updateForm("questions", form.questions.filter((_, index) => index !== questionIndex))} className="min-h-11 self-end px-3 text-xs font-bold text-[var(--color-error)]">삭제</button>
                        </div>
                        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-bold">
                          <input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(questionIndex, { required: event.target.checked })} />
                          필수 질문
                        </label>
                        {["single", "multiple"].includes(question.type) && (
                          <div className="mt-3 border-t border-[var(--color-hairline)] pt-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-bold">선택지</p>
                              <button
                                id={`group-dive-question-add-option-${questionIndex}`}
                                type="button"
                                onClick={() => updateQuestion(questionIndex, { options: [...question.options, ""] })}
                                className="min-h-11 px-3 text-xs font-bold text-[var(--color-primary)]"
                              >
                                + 선택지 추가
                              </button>
                            </div>
                            <div className="grid gap-2">
                              {question.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center gap-2">
                                  <input
                                    aria-label={`${questionIndex + 1}번째 질문의 ${optionIndex + 1}번째 선택지`}
                                    value={option}
                                    onChange={(event) => updateQuestion(questionIndex, { options: question.options.map((item, index) => index === optionIndex ? event.target.value : item) })}
                                    className="min-h-11 w-full rounded-[var(--radius-button-md)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm"
                                  />
                                  <button type="button" aria-label={`${optionIndex + 1}번째 선택지 삭제`} onClick={() => updateQuestion(questionIndex, { options: question.options.filter((_, index) => index !== optionIndex) })} className="min-h-11 shrink-0 px-3 text-xs font-bold text-[var(--color-error)]">삭제</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </fieldset>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(activeTab === "info" || activeTab === "options") && (
              !selected && activeTab === "info" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (validateInfo()) {
                      setFormError(null);
                      setActiveTab("options");
                    }
                  }}
                  className="mt-6 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-[var(--color-on-primary)]"
                >
                  다음: 옵션·질문
                </button>
              ) : (
                <button type="submit" disabled={isSaving} className="mt-6 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-[var(--color-on-primary)] disabled:opacity-50">{isSaving ? "저장 중..." : selected ? "변경 저장" : "모집 만들기"}</button>
              )
            )}
            </fieldset>
          </form>

          {activeTab === "regional" && (
            <div className="mt-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold">권역 제안 검토</h2>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    미처리 {regionalRequests.filter((item) => item.status === "received").length}건 · 전체 {regionalRequests.length}건
                  </p>
                </div>
                <span className="text-xs text-[var(--color-muted)]">
                  연결할 모집: {selected?.title ?? "선택 안 됨"}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {regionalRequests.length === 0 && (
                  <p className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] p-4 text-sm text-[var(--color-muted)]">
                    검토할 권역 제안이 없습니다.
                  </p>
                )}
                {regionalRequests.map((item) => {
                  const dates = Array.isArray(item.availableDates) ? item.availableDates : [];
                  const regionalRequestId = String(item.id);
                  const linkedGroupId = typeof item.groupDiveId === "string" ? item.groupDiveId : null;
                  const targetTitle = linkedGroupId
                    ? String(item.groupDiveTitle || item.interest)
                    : selected?.title ?? "모집 선택 필요";
                  const isPending = item.status === "received";
                  const isActing = regionalActionId === regionalRequestId;
                  return (
                    <div key={regionalRequestId} className="grid gap-3 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] p-4 text-sm">
                      <div>
                        <span className="flex flex-wrap items-center gap-2">
                          <strong>{String(item.region)}</strong>
                          <span className="rounded-[var(--radius-pill)] bg-[var(--color-surface-soft)] px-2 py-1 text-xs text-[var(--color-muted)]">
                            {REGIONAL_STATUS_LABELS[String(item.status)] ?? String(item.status)}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-[var(--color-muted)]">주제: {String(item.interest)}</span>
                        <span className="mt-1 block text-xs text-[var(--color-muted)]">대상 모집: {targetTitle}</span>
                        {dates.length > 0 && <span className="mt-1 block text-xs text-[var(--color-muted)]">가능 날짜: {dates.map(String).join(", ")}</span>}
                      </div>
                      {isPending && (
                        <div className="grid gap-3 rounded-[var(--radius-button-md)] bg-[var(--color-surface-soft)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                          <label className="grid gap-1 text-xs font-bold">
                            최종 권역명
                            <input
                              value={reviewRegions[regionalRequestId] ?? String(item.region)}
                              maxLength={80}
                              onChange={(event) => setReviewRegions((current) => ({
                                ...current,
                                [regionalRequestId]: event.target.value,
                              }))}
                              className="min-h-11 rounded-[var(--radius-button-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-canvas)] px-3 text-sm font-normal"
                            />
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isActing || !linkedGroupId && !selected}
                              onClick={() => void approveRegionalRequest(item)}
                              className="min-h-11 rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 text-xs font-bold text-[var(--color-on-primary)] disabled:opacity-50"
                            >
                              권역 승인
                            </button>
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => void rejectRegionalRequest(item)}
                              className="min-h-11 rounded-[var(--radius-button-md)] border border-[var(--color-error)] px-4 text-xs font-bold text-[var(--color-error)] disabled:opacity-50"
                            >
                              반려
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "applications" && (
            <ApplicationTable applications={applications} onStatus={updateStatus} onRelease={release} />
          )}

          {activeTab === "sessions" && (
            <div className="mt-5 grid gap-6">
              {!selected ? <p className="text-sm text-[var(--color-muted)]">먼저 모집을 선택하거나 만드세요.</p> : (
                <>
                  <form onSubmit={(event) => void createSession(event)} className="grid gap-3 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] p-4 md:grid-cols-2">
                    <Field label="회차명"><input required value={sessionForm.title} onChange={(event) => setSessionForm((current) => ({ ...current, title: event.target.value }))} /></Field>
                    <Field label="지역"><input required value={sessionForm.area} onChange={(event) => setSessionForm((current) => ({ ...current, area: event.target.value }))} /></Field>
                    <Field label="일시"><input required type="datetime-local" value={sessionForm.startsAt} onChange={(event) => setSessionForm((current) => ({ ...current, startsAt: event.target.value }))} /></Field>
                    <Field label="정원"><input required min={selected.minimumParticipants} type="number" value={sessionForm.capacity} onChange={(event) => setSessionForm((current) => ({ ...current, capacity: event.target.value }))} /></Field>
                    <Field label="장소"><input value={sessionForm.venue} onChange={(event) => setSessionForm((current) => ({ ...current, venue: event.target.value }))} /></Field>
                    <Field label="주소"><input value={sessionForm.address} onChange={(event) => setSessionForm((current) => ({ ...current, address: event.target.value }))} /></Field>
                    <button className="rounded-[var(--radius-button-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-on-primary)] md:col-span-2">회차 만들기</button>
                  </form>
                  <div>
                    <h3 className="text-sm font-bold">배정 대상 선택</h3>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {applications.filter((application) => ["deposit_paid", "under_review", "waitlisted", "free_search", "unassigned"].includes(application.status)).map((application) => (
                        <label key={application.id} className="flex gap-3 rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] p-3 text-sm">
                          <input type="checkbox" checked={selectedApplications.includes(application.id)} onChange={(event) => setSelectedApplications((current) => event.target.checked ? [...current, application.id] : current.filter((id) => id !== application.id))} />
                          <span><strong>{application.nickname}</strong><span className="ml-2 text-xs text-[var(--color-muted)]">{application.status}</span></span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {(selected.sessions ?? []).map((session) => (
                      <div key={session.id} className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] p-4">
                        <h3 className="font-bold">{session.title}</h3>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">{new Date(session.startsAt).toLocaleString("ko-KR")} · {session.assignedCount}/{session.capacity}명 · {SESSION_STATUS_LABELS[session.status] ?? session.status}</p>
                        <button type="button" onClick={() => void assign(session.id)} className="mt-3 text-sm font-bold text-[var(--color-primary)]">선택한 신청자 배정</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "payments" && (
            <div className="mt-5 grid gap-3">
              {applications.map((application) => (
                <div key={application.id} className="grid gap-3 rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] p-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <h3 className="text-sm font-bold">{application.nickname} · {application.status}</h3>
                    <p className="mt-2 text-xs text-[var(--color-muted)]">{application.payments.map((payment) => `${payment.purpose}: ₩${payment.amount.toLocaleString()} (${payment.status})`).join(" · ") || "결제 없음"}</p>
                  </div>
                  {["deposit_paid", "under_review", "waitlisted", "unassigned", "refund_pending"].includes(application.status) && <button type="button" onClick={() => void refund(application.id)} className="text-sm font-bold text-[var(--color-error)]">₩{(selected?.depositAmount ?? 0).toLocaleString()} 환불 / 재시도</button>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ApplicationTable({ applications, onStatus, onRelease }: { applications: GroupDiveApplicationDto[]; onStatus: (id: string, status: string) => Promise<void>; onRelease: (assignmentId: string) => Promise<void> }) {
  const [showDepositHoldersOnly, setShowDepositHoldersOnly] = useState(true);
  const visibleApplications = showDepositHoldersOnly
    ? applications.filter((application) =>
        application.payments.some(
          (payment) =>
            payment.purpose === "deposit_and_application_fee" &&
            payment.status === "paid",
        ),
      )
    : applications;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--color-body)]">
          <input
            type="checkbox"
            checked={showDepositHoldersOnly}
            onChange={(event) => setShowDepositHoldersOnly(event.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
          />
          보증금 보유 중만 보기
        </label>
        <span aria-live="polite" className="text-xs text-[var(--color-muted)]">
          표시 {visibleApplications.length}명 / 전체 {applications.length}명
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-[var(--color-hairline)] text-xs text-[var(--color-muted)]">
            <tr><th className="p-3">신청자</th><th className="p-3">성별</th><th className="p-3">지역 / 일정</th><th className="p-3">상태</th><th className="p-3">처리</th></tr>
          </thead>
          <tbody>
            {visibleApplications.map((application) => (
              <tr key={application.id} className="border-b border-[var(--color-hairline)]">
                <td className="p-3 font-bold">
                  {application.nickname}
                  <span className="block text-xs font-normal text-[var(--color-muted)]">{application.user?.name}</span>
                  {application.answers && application.answers.length > 0 && (
                    <details className="mt-2 font-normal">
                      <summary className="cursor-pointer text-xs font-bold text-[var(--color-primary)]">질문 답변 보기</summary>
                      <dl className="mt-2 grid gap-2 text-xs">
                        {application.answers.map((answer) => (
                          <div key={answer.questionId}>
                            <dt className="text-[var(--color-muted)]">{answer.prompt}</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap">{formatAnswer(answer.value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                </td>
                <td className="p-3">{GENDER_LABELS[application.gender] ?? "—"}</td>
                <td className="p-3 text-xs">
                  {application.selectedArea?.label || "협의"}
                  <span className="block text-[var(--color-muted)]">
                    {application.availableDates?.length
                      ? application.availableDates.join(", ")
                      : application.selectedSchedules.map((item) => item.label).join(", ")}
                  </span>
                </td>
                <td className="p-3">{application.status}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {application.status === "deposit_paid" && <button type="button" onClick={() => void onStatus(application.id, "under_review")} className="font-bold text-[var(--color-primary)]">검토 시작</button>}
                    {["deposit_paid", "under_review"].includes(application.status) && <button type="button" onClick={() => void onStatus(application.id, "waitlisted")} className="font-bold text-[var(--color-primary)]">대기</button>}
                    {application.assignment?.status === "pending_payment" && <button type="button" onClick={() => void onRelease(application.assignment!.id)} className="font-bold text-[var(--color-error)]">배정 해제</button>}
                  </div>
                </td>
              </tr>
            ))}
            {visibleApplications.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-[var(--color-muted)]">
                  {applications.length === 0 ? (
                    <span className="block">아직 신청자가 없습니다.</span>
                  ) : (
                    <>
                      <span className="block">현재 보증금을 보유 중인 신청자가 없습니다.</span>
                      <span className="mt-1 block">필터를 해제하면 전체 신청자를 볼 수 있습니다.</span>
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatAnswer(value: unknown) {
  if (Array.isArray(value)) return value.join(", ") || "미응답";
  if (value === true) return "동의";
  if (value === false) return "미동의";
  if (value == null || value === "") return "미응답";
  return String(value);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid w-full gap-1.5 text-xs font-bold text-[var(--color-body)]">{label}<span className="[&>input]:min-h-11 [&>input]:w-full [&>input]:rounded-[var(--radius-button-md)] [&>input]:border [&>input]:border-[var(--color-hairline)] [&>input]:bg-[var(--color-canvas)] [&>input]:px-3 [&>input]:text-sm [&>select]:min-h-11 [&>select]:w-full [&>select]:rounded-[var(--radius-button-md)] [&>select]:border [&>select]:border-[var(--color-hairline)] [&>select]:bg-[var(--color-canvas)] [&>select]:px-3 [&>textarea]:w-full [&>textarea]:rounded-[var(--radius-button-md)] [&>textarea]:border [&>textarea]:border-[var(--color-hairline)] [&>textarea]:bg-[var(--color-canvas)] [&>textarea]:p-3 [&>textarea]:text-sm">{children}</span></label>;
}
