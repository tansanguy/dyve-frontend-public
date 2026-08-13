import DatePicker from "react-datepicker";
import { useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Checkbox } from "../ui/checkbox";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import "react-datepicker/dist/react-datepicker.css";
import "./register-venue-datepicker.css";
import { AddressSearchSheet } from "./AddressSearchSheet";
import { DateTimeSelector } from "./DateTimeSelector";
import { InlineAddButton } from "./InlineAddButton";
import { NavHeader } from "./NavHeader";
import { PriceInput } from "./PriceInput";
import { PerformanceChecklistStep } from "./PerformanceChecklistStep";
import { DyveIcon } from "./DyveIcon";
import {
  createEmptyPerformanceChecklistAnswers,
  haveChecklistAnswersChanged,
  isPerformanceChecklistComplete,
  type PerformanceChecklistAnswers,
  type PerformanceChecklistItemKey,
  type PerformanceChecklistRecord,
} from "../../../types/performanceChecklist";
import {
  ALWAYS_ENTRY_LINE,
  DEFAULT_GENRES,
  MAX_ASSIGNED_SEAT_COLS,
  MAX_ASSIGNED_SEAT_ROWS,
  buildEventFormData,
  extractFileName,
  formatLocalDateTimeDisplay,
  fromSeatKey,
  getDaysInMonth,
  getRoundedDateTime,
  getStartOfToday,
  initialEventToFormState,
  pad2,
  sanitizeNumericInput,
  sanitizeOptionId,
  toDateFromLocalInput,
  toLocalDateTimeInput,
  toPositiveInt,
  toSeatKey,
  toSeatLabel,
  type EventFundingFormPayload,
  type InitialPerformanceData,
  type NormalizedTableTicketOptionPayload,
  type RefundPolicyInput,
  type TableSaleMode,
  type TableTicketOptionForm,
} from "../../../api/eventForm";
import { scrollAppMainToTop } from "../../../utils/scroll";
import { toast } from "sonner";

type VenueProfilePrefill = {
  id: string;
  name: string;
  address?: string;
  detailAddress?: string;
  capacity?: string;
};

type VenueOption = VenueProfilePrefill;

type GalleryEntry = { previewUrl: string; file?: File };
type RefundPolicyForm = { mode: "full" | "partial" | "none"; daysBefore: string; cancellationFeePercent: string; description: string };

const EMPTY_REFUND_POLICY: RefundPolicyForm = {
  mode: "full",
  daysBefore: "7",
  cancellationFeePercent: "0",
  description: "",
};

export type RegisterPerformanceChecklistSubmission = {
  answers: PerformanceChecklistAnswers;
  signedByName: string;
  shouldSign: boolean;
  hasChanges: boolean;
};

export type RegisterPerformanceOperationSubmission = {
  serviceScope: string[];
  requiredHelp: string[];
  addOnNeeds: string[];
  budgetNotes: string;
};

export type RegisterPerformanceSubmission = {
  eventPayload: FormData;
  checklist: RegisterPerformanceChecklistSubmission | null;
  operation: RegisterPerformanceOperationSubmission | null;
};

interface RegisterPerformanceScreenProps {
  onBack: () => void;
  onSubmit: (data: RegisterPerformanceSubmission) => void;
  isSubmitDisabled?: boolean;
  submitNotice?: ReactNode;
  isSubmitting?: boolean;
  submitError?: string | null;
  initialData?: InitialPerformanceData | null;
  initialChecklist?: PerformanceChecklistRecord | null;
  mode?: "create" | "edit";
  submitLabel?: string;
  venueProfile?: VenueProfilePrefill | null;
  venueOptions?: VenueOption[];
  viewerProfileType?: "artist" | "venue" | null;
  isMatchedFromChat?: boolean;
}

const TABLE_TYPE_OPTIONS = [
  { label: "2인 테이블", seatsPerTable: "2", saleMode: "WHOLE_TABLE" as TableSaleMode },
  { label: "4인 테이블", seatsPerTable: "4", saleMode: "WHOLE_TABLE" as TableSaleMode },
  { label: "단체 테이블", seatsPerTable: "6", saleMode: "WHOLE_TABLE" as TableSaleMode },
  { label: "바 테이블", seatsPerTable: "1", saleMode: "SHARED_SEAT" as TableSaleMode },
  { label: "직접 입력", seatsPerTable: "", saleMode: "WHOLE_TABLE" as TableSaleMode },
];

export function RegisterPerformanceScreen({
  onBack,
  onSubmit,
  isSubmitDisabled = false,
  submitNotice,
  isSubmitting = false,
  submitError,
  initialData,
  initialChecklist = null,
  mode = "create",
  submitLabel,
  venueProfile = null,
  venueOptions = [],
  viewerProfileType = null,
  isMatchedFromChat = false,
}: RegisterPerformanceScreenProps) {
  const isEditMode = mode === "edit";
  const [title, setTitle] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [initialPosterUrl, setInitialPosterUrl] = useState("");
  const [posterPreviewUrl, setPosterPreviewUrl] = useState("");
  const [posterFileName, setPosterFileName] = useState("");
  const [step, setStep] = useState(1);
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const maxSteps = 3;

  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [selectedVenueProfileId, setSelectedVenueProfileId] = useState("");
  const [doorSalesEnabled, setDoorSalesEnabled] = useState(false);
  const [doorPrice, setDoorPrice] = useState("");
  const [doorSaleStartAt, setDoorSaleStartAt] = useState("");
  const [doorSaleEndAt, setDoorSaleEndAt] = useState("");
  const [runtimeMinutes, setRuntimeMinutes] = useState("");
  const [entryOffsetMinutes, setEntryOffsetMinutes] = useState(30);
  const [isAlwaysEntry, setIsAlwaysEntry] = useState(false);
  const [seatBookingInfo, setSeatBookingInfo] = useState("");
  const [description, setDescription] = useState("");
  const [goodsInfo, setGoodsInfo] = useState("");
  const [freeDrinkCount, setFreeDrinkCount] = useState("");

  const [artists, setArtists] = useState<string[]>([]);
  const [artistInput, setArtistInput] = useState("");
  const [galleryEntries, setGalleryEntries] = useState<GalleryEntry[]>([]);

  const [ticketType, setTicketType] = useState<"standing" | "assigned" | "open" | "table">("standing");
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState("");

  const [capacity, setCapacity] = useState("");
  const [cols, setCols] = useState("");
  const [rows, setRows] = useState("");
  const [disabledSeatKeys, setDisabledSeatKeys] = useState<string[]>([]);
  const [tableOptions, setTableOptions] = useState<TableTicketOptionForm[]>([]);

  const [isRecommended, setIsRecommended] = useState(false);
  const [hasGoods, setHasGoods] = useState(false);
  const [isDyveOriginal, setIsDyveOriginal] = useState(false);
  const location = useLocation();
  const stateIsCrowdfunding = Boolean((location.state as any)?.isCrowdfunding);
  const [isHumanCrowdfunding, setIsHumanCrowdfunding] = useState(stateIsCrowdfunding);
  const [isDyvePick, setIsDyvePick] = useState(false);
  const [isFreeDrink, setIsFreeDrink] = useState(false);
  const [initialIsFreeDrink, setInitialIsFreeDrink] = useState(false);

  const [fundingMinAttendees, setFundingMinAttendees] = useState("");
  const [fundingCurrentReservations, setFundingCurrentReservations] = useState("0");
  const [fundingIsConfirmed, setFundingIsConfirmed] = useState(false);
  const [fundingDeadlineLocal, setFundingDeadlineLocal] = useState("");
  const [isFundingDeadlinePickerOpen, setIsFundingDeadlinePickerOpen] = useState(false);
  const [isCrowdfunding, setIsCrowdfunding] = useState(false);
  const [crowdfundingTargetAmount, setCrowdfundingTargetAmount] = useState("");
  const [operationBudgetNotes, setOperationBudgetNotes] = useState("");
  const [refundPolicies, setRefundPolicies] = useState<RefundPolicyForm[]>(
    isEditMode ? [] : [{ ...EMPTY_REFUND_POLICY }],
  );

  const [genre, setGenre] = useState<string>(DEFAULT_GENRES[0] ?? "공연");
  const [subGenre, setSubGenre] = useState("");

  const [allowAllTimes, setAllowAllTimes] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [checklistAnswers, setChecklistAnswers] = useState<PerformanceChecklistAnswers>(
    createEmptyPerformanceChecklistAnswers(),
  );
  const [checklistSignatureName, setChecklistSignatureName] = useState("");
  const [isChecklistSigned, setIsChecklistSigned] = useState(false);
  const [checklistSignedByName, setChecklistSignedByName] = useState<string | null>(null);
  const [checklistSignedAt, setChecklistSignedAt] = useState<string | null>(null);
  const [isTableTypeMenuOpen, setIsTableTypeMenuOpen] = useState(false);
  const posterInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const fundingDeadlinePickerRef = useRef<HTMLDivElement | null>(null);
  const tableTypeMenuRef = useRef<HTMLDivElement | null>(null);

  const [initialDateTime] = useState(() => getRoundedDateTime());
  const minDate = useMemo(() => (isEditMode ? new Date(2000, 0, 1) : getStartOfToday()), [isEditMode]);
  const [maxDate] = useState(() => {
    const max = getStartOfToday();
    max.setDate(max.getDate() + 60);
    return max;
  });
  const [selectedYear, setSelectedYear] = useState(initialDateTime.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialDateTime.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(initialDateTime.getDate());
  const [selectedHour, setSelectedHour] = useState(initialDateTime.getHours());
  const [selectedMinute, setSelectedMinute] = useState(initialDateTime.getMinutes());
  const canSelfSignChecklist = isMatchedFromChat && viewerProfileType === "venue";

  const minYear = minDate.getFullYear();
  const maxYear = maxDate.getFullYear();
  const minMonth = selectedYear === minYear ? minDate.getMonth() + 1 : 1;
  const maxMonth = selectedYear === maxYear ? maxDate.getMonth() + 1 : 12;
  const minDay =
    selectedYear === minYear && selectedMonth === minDate.getMonth() + 1 ? minDate.getDate() : 1;
  const maxDay =
    selectedYear === maxYear && selectedMonth === maxDate.getMonth() + 1
      ? maxDate.getDate()
      : getDaysInMonth(selectedYear, selectedMonth);

  const layoutCols = toPositiveInt(cols);
  const layoutRows = toPositiveInt(rows);
  const seatLayoutError =
    ticketType === "assigned" &&
    ((cols.length > 0 && (!layoutCols || layoutCols > MAX_ASSIGNED_SEAT_COLS)) ||
      (rows.length > 0 && (!layoutRows || layoutRows > MAX_ASSIGNED_SEAT_ROWS)))
      ? `지정좌석은 1–${MAX_ASSIGNED_SEAT_ROWS}행, 1–${MAX_ASSIGNED_SEAT_COLS}열까지 등록할 수 있어요.`
      : null;
  const assignedSeatTotal =
    ticketType === "assigned" && layoutCols && layoutRows ? layoutCols * layoutRows : 0;
  const normalizedDisabledSeatKeys = useMemo(() => {
    if (assignedSeatTotal <= 0 || !layoutCols || !layoutRows) return [];
    const unique = Array.from(new Set(disabledSeatKeys));
    return unique.filter((key) => {
      const parsed = fromSeatKey(key);
      if (!parsed) return false;
      return parsed.row < layoutRows && parsed.col < layoutCols;
    });
  }, [assignedSeatTotal, layoutCols, layoutRows, disabledSeatKeys]);
  const disabledSeatCount = normalizedDisabledSeatKeys.length;
  const assignedActiveSeatCount = Math.max(0, assignedSeatTotal - disabledSeatCount);
  const tableTotalCapacity = useMemo(
    () =>
      tableOptions.reduce((sum, option) => {
        const tableCount = toPositiveInt(option.tableCount) ?? 0;
        const seatsPerTable = toPositiveInt(option.seatsPerTable) ?? 0;
        return sum + tableCount * seatsPerTable;
      }, 0),
    [tableOptions],
  );
  const disabledSeatLabels = useMemo(() => {
    return normalizedDisabledSeatKeys
      .map((key) => {
        const parsed = fromSeatKey(key);
        if (!parsed) return null;
        return toSeatLabel(parsed.row, parsed.col);
      })
      .filter((label): label is string => Boolean(label))
      .sort((a, b) => a.localeCompare(b, "en"));
  }, [normalizedDisabledSeatKeys]);
  const checklistHasChanges = haveChecklistAnswersChanged(initialChecklist?.answers, checklistAnswers);
  const checklistNeedsSignature = canSelfSignChecklist && (!isChecklistSigned || checklistHasChanges);
  const isChecklistReadyForSubmit =
    !canSelfSignChecklist ||
    (isPerformanceChecklistComplete(checklistAnswers) &&
      (!checklistNeedsSignature || checklistSignatureName.trim().length > 0));

  const applyVenueProfilePrefill = useCallback(() => {
    if (!venueProfile) return;
    if (venueProfile.name) setVenue(venueProfile.name);
    if (venueProfile.address) setAddress(venueProfile.address);
    if (venueProfile.detailAddress) setDetailAddress(venueProfile.detailAddress);
    if (venueProfile.capacity && !capacity) {
      const numeric = parseInt(venueProfile.capacity, 10);
      if (Number.isFinite(numeric) && numeric > 0) setCapacity(String(numeric));
    }
  }, [venueProfile, capacity]);

  useEffect(() => {
    if (!initialChecklist) {
      setChecklistAnswers(createEmptyPerformanceChecklistAnswers());
      setChecklistSignatureName("");
      setIsChecklistSigned(false);
      setChecklistSignedByName(null);
      setChecklistSignedAt(null);
      return;
    }

    setChecklistAnswers(initialChecklist.answers);
    setChecklistSignatureName(initialChecklist.signedByName ?? "");
    setIsChecklistSigned(Boolean(initialChecklist.isSigned));
    setChecklistSignedByName(initialChecklist.signedByName ?? null);
    setChecklistSignedAt(initialChecklist.signedAt ?? null);
  }, [initialChecklist]);

  useEffect(() => {
    if (!initialData) {
      setEntryOffsetMinutes(30);
      setIsAlwaysEntry(false);
      return;
    }

    const nextState = initialEventToFormState(initialData);
    setTitle(nextState.title);
    setVenue(nextState.venue);
    setAddress(nextState.address);
    setDetailAddress(nextState.detailAddress);
    setSelectedVenueProfileId(initialData.venueProfileId ?? "");
    setDoorSalesEnabled(initialData.doorSalesEnabled === true);
    setDoorPrice(initialData.doorPrice == null ? "" : String(initialData.doorPrice));
    setDoorSaleStartAt(initialData.doorSaleStartAt ? toLocalDateTimeInput(new Date(initialData.doorSaleStartAt)) : "");
    setDoorSaleEndAt(initialData.doorSaleEndAt ? toLocalDateTimeInput(new Date(initialData.doorSaleEndAt)) : "");
    setGalleryEntries(
      Array.isArray(initialData.gallery)
        ? initialData.gallery.filter((url): url is string => typeof url === "string" && url.trim().length > 0).map((previewUrl) => ({ previewUrl }))
        : [],
    );
    setRuntimeMinutes(nextState.runtimeMinutes);
    setEntryOffsetMinutes(nextState.entryOffsetMinutes);
    setIsAlwaysEntry(nextState.isAlwaysEntry);
    setSeatBookingInfo(nextState.seatBookingInfo);
    setDescription(nextState.description);
    setGoodsInfo(nextState.goodsInfo);
    setFreeDrinkCount(nextState.freeDrinkCount);
    setArtists(nextState.artists);
    setTicketType(nextState.ticketType);
    setIsFree(nextState.isFree);
    setPrice(nextState.price);
    setCapacity(nextState.capacity);
    setCols(nextState.cols);
    setRows(nextState.rows);
    setDisabledSeatKeys(nextState.disabledSeatKeys);
    setTableOptions(nextState.tableOptions);
    setIsRecommended(nextState.isRecommended);
    setHasGoods(nextState.hasGoods);
    setIsDyveOriginal(nextState.isDyveOriginal);
    setIsHumanCrowdfunding(nextState.isHumanCrowdfunding);
    setIsDyvePick(nextState.isDyvePick);
    setIsFreeDrink(nextState.isFreeDrink);
    setInitialIsFreeDrink(nextState.initialIsFreeDrink);
    setFundingMinAttendees(nextState.fundingMinAttendees);
    setFundingCurrentReservations(nextState.fundingCurrentReservations);
    setFundingIsConfirmed(nextState.fundingIsConfirmed);
    setFundingDeadlineLocal(nextState.fundingDeadlineLocal);
    setIsCrowdfunding(nextState.isCrowdfunding);
    setCrowdfundingTargetAmount(nextState.crowdfundingTargetAmount);
    setGenre(nextState.genre);
    setSelectedYear(nextState.selectedYear);
    setSelectedMonth(nextState.selectedMonth);
    setSelectedDay(nextState.selectedDay);
    setSelectedHour(nextState.selectedHour);
    setSelectedMinute(nextState.selectedMinute);
    setAllowAllTimes(nextState.allowAllTimes);
    setInitialPosterUrl(nextState.initialPosterUrl);
    setPosterPreviewUrl(nextState.posterPreviewUrl);
    setPosterFileName(nextState.posterFileName);
    const initialPolicies = initialData.refundPolicy?.policies;
    setRefundPolicies(
      initialPolicies?.map((policy) => ({
        mode: policy.cancellationFeePercent === 0 ? "full" : policy.cancellationFeePercent === 100 ? "none" : "partial",
        daysBefore: String(policy.daysBefore),
        cancellationFeePercent: String(policy.cancellationFeePercent),
        description: policy.description,
      })) ?? [{ ...EMPTY_REFUND_POLICY }],
    );
  }, [initialData]);

  useEffect(() => {
    if (!isEditMode && !selectedVenueProfileId && venueProfile?.id) {
      setSelectedVenueProfileId(venueProfile.id);
    }
  }, [isEditMode, selectedVenueProfileId, venueProfile]);

  useEffect(() => {
    if (!isFundingDeadlinePickerOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (fundingDeadlinePickerRef.current?.contains(target)) return;
      setIsFundingDeadlinePickerOpen(false);
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFundingDeadlinePickerOpen(false);
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
  }, [isFundingDeadlinePickerOpen]);

  useEffect(() => {
    if (!isHumanCrowdfunding) {
      setIsFundingDeadlinePickerOpen(false);
    }
  }, [isHumanCrowdfunding]);

  useEffect(() => {
    if (selectedMonth < minMonth) {
      setSelectedMonth(minMonth);
    } else if (selectedMonth > maxMonth) {
      setSelectedMonth(maxMonth);
    }
  }, [selectedMonth, minMonth, maxMonth]);

  useEffect(() => {
    const nextMaxDay = maxDay;
    let nextDay = selectedDay;
    if (nextDay < minDay) nextDay = minDay;
    if (nextDay > nextMaxDay) nextDay = nextMaxDay;
    if (nextDay !== selectedDay) setSelectedDay(nextDay);
  }, [selectedDay, minDay, maxDay]);

  useEffect(() => {
    if (!allowAllTimes && selectedMinute !== 0 && selectedMinute !== 30) {
      setSelectedMinute(selectedMinute < 30 ? 0 : 30);
    }
  }, [allowAllTimes, selectedMinute]);

  useEffect(() => {
    if (!posterFile) {
      if (initialPosterUrl) {
        setPosterPreviewUrl(initialPosterUrl);
        if (!posterFileName) {
          setPosterFileName(extractFileName(initialPosterUrl) || "기존 포스터");
        }
      } else {
        setPosterPreviewUrl("");
        if (!initialData) {
          setPosterFileName("");
        }
      }
      return;
    }
    const objectUrl = URL.createObjectURL(posterFile);
    setPosterPreviewUrl(objectUrl);
    setPosterFileName(posterFile.name);
    return () => URL.revokeObjectURL(objectUrl);
  }, [posterFile, initialPosterUrl, posterFileName, initialData]);

  useEffect(() => {
    if (ticketType !== "assigned" || !layoutCols || !layoutRows) {
      if (disabledSeatKeys.length > 0) {
        setDisabledSeatKeys([]);
      }
      return;
    }
    setDisabledSeatKeys((prev) => {
      const unique = Array.from(new Set(prev));
      return unique.filter((key) => {
        const parsed = fromSeatKey(key);
        return parsed !== null && parsed.row < layoutRows && parsed.col < layoutCols;
      });
    });
  }, [ticketType, layoutCols, layoutRows, disabledSeatKeys.length]);

  useEffect(() => {
    if (ticketType !== "assigned") return;
    if (!layoutCols || !layoutRows) return;
    const nextCapacity = String(Math.max(0, layoutCols * layoutRows - normalizedDisabledSeatKeys.length));
    setCapacity((prev) => (prev === nextCapacity ? prev : nextCapacity));
  }, [ticketType, layoutCols, layoutRows, normalizedDisabledSeatKeys.length]);

  useEffect(() => {
    if (ticketType !== "table") return;
    const nextCapacity = tableTotalCapacity > 0 ? String(tableTotalCapacity) : "";
    setCapacity((prev) => (prev === nextCapacity ? prev : nextCapacity));
  }, [ticketType, tableTotalCapacity]);

  const handleAddArtist = () => {
    const trimmed = artistInput.trim();
    if (!trimmed) return;
    if (artists.includes(trimmed)) {
      toast.info("이미 추가된 아티스트입니다.");
      setArtistInput("");
      return;
    }
    setArtists([...artists, trimmed]);
    setArtistInput("");
  };

  const handleRemoveArtist = (index: number) => {
    setArtists(artists.filter((_, i) => i !== index));
  };

  const handleUpdateTableOption = (index: number, updates: Partial<TableTicketOptionForm>) => {
    setTableOptions((prev) =>
      prev.map((option, optionIndex) => (optionIndex === index ? { ...option, ...updates } : option)),
    );
    setFormError(null);
  };

  const handleRemoveTableOption = (index: number) => {
    setTableOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index));
    setFormError(null);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleAddArtist();
  };

  const handleSeatToggle = (rowIndex: number, colIndex: number) => {
    const key = toSeatKey(rowIndex, colIndex);
    setDisabledSeatKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const handlePosterPick = () => {
    posterInputRef.current?.click();
  };

  const handlePosterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("이미지 파일만 업로드할 수 있어요.");
      setPosterFile(null);
      return;
    }
    setPosterFile(file);
    setFormError(null);
    event.currentTarget.value = "";
  };

  const handleGalleryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const accepted = files.filter((file) => file.type.startsWith("image/"));
    const remaining = 9 - galleryEntries.length;
    if (accepted.length === 0) {
      setFormError("이미지 파일만 업로드할 수 있어요.");
    } else {
      setGalleryEntries((current) => [
        ...current,
        ...accepted.slice(0, Math.max(0, remaining)).map((file) => ({ previewUrl: URL.createObjectURL(file), file })),
      ]);
      setFormError(accepted.length > remaining ? "소개 사진은 최대 9장까지 등록할 수 있어요." : null);
    }
    event.currentTarget.value = "";
  };

  const moveGalleryEntry = (index: number, direction: -1 | 1) => {
    setGalleryEntries((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleChecklistAnswerChange = (key: PerformanceChecklistItemKey, checked: boolean) => {
    setChecklistAnswers((prev) => {
      if (prev[key] === checked) return prev;
      return { ...prev, [key]: checked };
    });
    if (isChecklistSigned) {
      setChecklistSignatureName("");
      setIsChecklistSigned(false);
      setChecklistSignedByName(null);
      setChecklistSignedAt(null);
    }
    setFormError(null);
  };

  const handleChecklistSignatureNameChange = (value: string) => {
    setChecklistSignatureName(value);
    if (!value.trim()) {
      setIsChecklistSigned(false);
      setChecklistSignedByName(null);
      setChecklistSignedAt(null);
    }
    setFormError(null);
  };

  const handleSubmit = () => {
    if (isSubmitDisabled || isSubmitting) return;
    setFormError(null);

    const trimmedTitle = title.trim();
    const trimmedVenue = venue.trim();
    const trimmedAddress = address.trim();
    const trimmedDetailAddress = detailAddress.trim();
    const parsedRuntimeMinutes = parseInt(runtimeMinutes, 10);
    const trimmedSeatBookingInfo = seatBookingInfo.trim();
    const trimmedGoodsInfo = goodsInfo.trim();
    const parsedFreeDrinkCount = parseInt(freeDrinkCount, 10);
    const trimmedSubGenre = subGenre.trim();
    const resolvedCategory = genre;
    const resolvedGenre = trimmedSubGenre || genre;

    if (!trimmedTitle) {
      setFormError("공연 제목을 입력해 주세요.");
      return;
    }
    if (!posterFile && !posterPreviewUrl) {
      setFormError("포스터 이미지를 업로드해 주세요.");
      return;
    }
    if (!trimmedVenue) {
      setFormError("공연장 이름을 입력해 주세요.");
      return;
    }
    if (!trimmedAddress) {
      setFormError("공연장 주소를 입력해 주세요.");
      return;
    }
    if (!isEditMode && doorSalesEnabled) {
      const parsedDoorPrice = Number(doorPrice);
      const start = new Date(doorSaleStartAt);
      const end = new Date(doorSaleEndAt);
      if (!selectedVenueProfileId) {
        setFormError("현매를 사용하려면 DYVE 업장을 선택해 주세요.");
        return;
      }
      if (!Number.isInteger(parsedDoorPrice) || parsedDoorPrice < 0) {
        setFormError("현매가를 0원 이상으로 입력해 주세요.");
        return;
      }
      if (!doorSaleStartAt || !doorSaleEndAt || start >= end) {
        setFormError("현매 판매 시작과 종료 시간을 확인해 주세요.");
        return;
      }
    }
    if (!Number.isFinite(parsedRuntimeMinutes) || parsedRuntimeMinutes <= 0) {
      setFormError("러닝타임을 숫자(분)로 입력해 주세요.");
      return;
    }
    if (!resolvedGenre) {
      setFormError("장르를 입력해 주세요.");
      return;
    }

    const formattedDate = `${selectedYear}-${pad2(selectedMonth)}-${pad2(selectedDay)}`;
    const formattedTime = `${pad2(selectedHour)}:${pad2(selectedMinute)}`;
    const eventDate = new Date(`${formattedDate}T${formattedTime}:00`);
    if (Number.isNaN(eventDate.getTime())) {
      setFormError("공연 일시를 다시 확인해 주세요.");
      return;
    }

    const resolvedEntryStartAtDate = isAlwaysEntry
      ? eventDate
      : new Date(eventDate.getTime() - entryOffsetMinutes * 60 * 1000);

    const now = new Date();
    const maxAllowed = new Date(now);
    maxAllowed.setFullYear(maxAllowed.getFullYear() + 3);
    if (!isEditMode && eventDate < now) {
      setFormError("과거 시간은 등록할 수 없어요.");
      return;
    }
    if (eventDate > maxAllowed) {
      setFormError("3년 이후의 공연은 등록할 수 없어요.");
      return;
    }

    const admissionType = ticketType;
    const resolvedCapacity = parseInt(capacity, 10);
    const resolvedCols = parseInt(cols, 10);
    const resolvedRows = parseInt(rows, 10);

    let finalCapacity = resolvedCapacity;
    let normalizedTableOptions: NormalizedTableTicketOptionPayload[] = [];
    if (admissionType === "assigned") {
      if (!Number.isFinite(resolvedCols) || resolvedCols <= 0 || !Number.isFinite(resolvedRows) || resolvedRows <= 0) {
        setFormError("지정좌석은 좌석 행/열 수를 모두 입력해 주세요.");
        return;
      }
      if (resolvedRows > MAX_ASSIGNED_SEAT_ROWS || resolvedCols > MAX_ASSIGNED_SEAT_COLS) {
        setFormError(`지정좌석은 최대 ${MAX_ASSIGNED_SEAT_ROWS}행 × ${MAX_ASSIGNED_SEAT_COLS}열까지 등록할 수 있어요.`);
        return;
      }
      const totalSeats = resolvedCols * resolvedRows;
      const disabledInRange = normalizedDisabledSeatKeys.filter((key) => {
        const parsed = fromSeatKey(key);
        return parsed !== null && parsed.row < resolvedRows && parsed.col < resolvedCols;
      });
      finalCapacity = totalSeats - disabledInRange.length;
      if (finalCapacity <= 0) {
        setFormError("판매 가능한 좌석이 1석 이상이어야 합니다. 비활성 좌석을 줄여주세요.");
        return;
      }
    } else if (admissionType === "table") {
      const seenOptionIds = new Set<string>();
      normalizedTableOptions = tableOptions.map((option) => ({
        id: sanitizeOptionId(option.id || option.label),
        label: option.label.trim(),
        tableCount: parseInt(option.tableCount, 10),
        seatsPerTable: parseInt(option.seatsPerTable, 10),
        saleMode: option.saleMode,
        pricePerSeat: isFree ? 0 : parseInt(option.pricePerSeat, 10),
        description: option.description.trim(),
      }));
      if (normalizedTableOptions.length === 0) {
        setFormError("테이블 옵션을 1개 이상 추가해 주세요.");
        return;
      }
      for (const option of normalizedTableOptions) {
        if (!option.id || !option.label) {
          setFormError("테이블 옵션의 유형명과 ID를 입력해 주세요.");
          return;
        }
        if (seenOptionIds.has(option.id)) {
          setFormError("테이블 옵션 ID는 중복될 수 없습니다.");
          return;
        }
        seenOptionIds.add(option.id);
        if (!Number.isFinite(option.tableCount) || option.tableCount <= 0) {
          setFormError("테이블 수는 1 이상이어야 합니다.");
          return;
        }
        if (!Number.isFinite(option.seatsPerTable) || option.seatsPerTable <= 0) {
          setFormError("테이블당 최대 인원은 1 이상이어야 합니다.");
          return;
        }
        if (!Number.isFinite(option.pricePerSeat) || option.pricePerSeat < 0) {
          setFormError("테이블 옵션의 1인당 가격을 확인해 주세요.");
          return;
        }
      }
      finalCapacity = normalizedTableOptions.reduce((sum, option) => sum + option.tableCount * option.seatsPerTable, 0);
      if (finalCapacity <= 0) {
        setFormError("테이블 옵션 기준 총 수용 인원이 1명 이상이어야 합니다.");
        return;
      }
    } else if (!Number.isFinite(resolvedCapacity) || resolvedCapacity <= 0) {
      setFormError("최대 입장 관객 수를 입력해 주세요.");
      return;
    }

    const resolvedPrice = isFree ? 0 : parseInt(price, 10);
    if (admissionType !== "table" && !isFree && (!Number.isFinite(resolvedPrice) || resolvedPrice < 0)) {
      setFormError("유료 공연은 0원 이상의 가격을 입력해 주세요.");
      return;
    }

    if (initialIsFreeDrink && !isFreeDrink) {
      setFormError("프리드링크는 한번 켜면 해제할 수 없어요.");
      return;
    }
    if (hasGoods && !trimmedGoodsInfo) {
      setFormError("굿즈 판매 정보를 입력해 주세요.");
      return;
    }
    if (isFreeDrink && (!Number.isFinite(parsedFreeDrinkCount) || parsedFreeDrinkCount <= 0)) {
      setFormError("프리드링크 잔 수를 숫자로 입력해 주세요.");
      return;
    }

    let normalizedRefundPolicies: RefundPolicyInput[] | null = null;
    if (refundPolicies.length > 0) {
      normalizedRefundPolicies = refundPolicies.map((policy) => ({
        daysBefore: Number(policy.daysBefore),
        cancellationFeePercent: Number(policy.cancellationFeePercent),
        description: policy.description.trim(),
      }));
      if (normalizedRefundPolicies.some((policy) => !Number.isInteger(policy.daysBefore) || policy.daysBefore < 1)) {
        setFormError("환불 정책 일수는 1 이상의 정수로 입력해 주세요.");
        return;
      }
      if (new Set(normalizedRefundPolicies.map((policy) => policy.daysBefore)).size !== normalizedRefundPolicies.length) {
        setFormError("같은 일수의 환불 정책을 중복 등록할 수 없어요.");
        return;
      }
      if (normalizedRefundPolicies.some((policy) => !policy.description)) {
        setFormError("각 환불 정책의 안내 문구를 입력해 주세요.");
        return;
      }
      if (normalizedRefundPolicies.some((policy) => !Number.isInteger(policy.cancellationFeePercent) || policy.cancellationFeePercent < 0 || policy.cancellationFeePercent > 100)) {
        setFormError("취소 수수료는 0~100 사이의 정수로 입력해 주세요.");
        return;
      }
      if (normalizedRefundPolicies.some((policy) => policy.cancellationFeePercent === 100 && policy.daysBefore !== 1)) {
        setFormError("환불 불가는 공연 1일 전만 설정할 수 있어요.");
        return;
      }
      normalizedRefundPolicies.sort((a, b) => b.daysBefore - a.daysBefore);
    } else {
      setFormError("취소·환불 정책을 1개 이상 등록해 주세요.");
      return;
    }

    const alwaysEntryGuide = isAlwaysEntry ? ALWAYS_ENTRY_LINE : "";
    const disabledSeatGuide =
      admissionType === "assigned" && disabledSeatLabels.length > 0
        ? `비활성 좌석: ${disabledSeatLabels.join(", ")}`
        : "";
    const finalSeatBookingInfo = [trimmedSeatBookingInfo, alwaysEntryGuide, disabledSeatGuide]
      .filter((line) => line.length > 0)
      .join("\n");

    const fundingMin = parseInt(fundingMinAttendees, 10);
    const fundingCurrent = parseInt(fundingCurrentReservations || "0", 10);
    const fundingDeadline = toDateFromLocalInput(fundingDeadlineLocal);
    if (isHumanCrowdfunding) {
      if (!Number.isFinite(fundingMin) || fundingMin <= 0) {
        setFormError("함께 여는 공연의 목표 인원을 입력해 주세요.");
        return;
      }
      if (!Number.isFinite(fundingCurrent) || fundingCurrent < 0) {
        setFormError("현재 예약 인원은 0 이상이어야 합니다.");
        return;
      }
      if (!fundingDeadline) {
        setFormError("함께 여는 공연의 마감일을 입력해 주세요.");
        return;
      }
    }
    const crowdfundingAmountManwon = parseInt(crowdfundingTargetAmount, 10);
    const crowdfundingAmount = crowdfundingAmountManwon * 10000;
    if (isCrowdfunding) {
      if (!Number.isFinite(crowdfundingAmountManwon) || crowdfundingAmountManwon <= 0) {
        setFormError("무료 입장 응원의 목표 금액을 입력해 주세요. (만원 단위)");
        return;
      }
    }

    const dateDisplay = `${formattedDate.replace(/-/g, ".")} • ${formattedTime}`;
    const finalIsFree = isCrowdfunding ? true : isFree;
    const tableBasePrice =
      admissionType === "table" && normalizedTableOptions.length > 0
        ? Math.min(...normalizedTableOptions.map((option) => option.pricePerSeat))
        : 0;
    const normalizedArtists = artists.map((name) => name.trim()).filter((name) => name.length > 0);
    const fundingPayload: EventFundingFormPayload | null =
      isHumanCrowdfunding && fundingDeadline
        ? {
            type: "HUMAN",
            targetCapacity: fundingMin,
            currentReservations: fundingCurrent,
            isConfirmed: fundingIsConfirmed,
            deadline: fundingDeadline,
          }
        : isCrowdfunding
          ? {
              type: "CROWD",
              targetAmount: crowdfundingAmount,
            }
          : null;
    const payload = buildEventFormData({
      posterFile,
      posterPreviewUrl,
      isEditMode,
      title: trimmedTitle,
      eventDate,
      dateDisplay,
      runtimeMinutes: parsedRuntimeMinutes,
      entryStartAt: resolvedEntryStartAtDate,
      venue: trimmedVenue,
      address: trimmedAddress,
      detailAddress: trimmedDetailAddress,
      genre: resolvedGenre,
      category: resolvedCategory,
      admissionType,
      seatBookingInfo: finalSeatBookingInfo,
      isRecommended,
      isFree: finalIsFree,
      price: isCrowdfunding ? 0 : admissionType === "table" ? tableBasePrice : Number.isFinite(resolvedPrice) ? resolvedPrice : 0,
      capacity: finalCapacity,
      hasGoods,
      isDyveOriginal,
      isHumanCrowdfunding,
      isDyvePick,
      isFreeDrink,
      layout: admissionType === "assigned" ? { cols: resolvedCols, rows: resolvedRows } : null,
      tableTicketOptions: admissionType === "table" ? normalizedTableOptions : [],
      description,
      goodsInfo: trimmedGoodsInfo,
      freeDrinkCount: Number.isFinite(parsedFreeDrinkCount) ? parsedFreeDrinkCount : null,
      artists: normalizedArtists,
      gallery: galleryEntries.filter((entry) => !entry.file).map((entry) => entry.previewUrl),
      galleryFiles: galleryEntries.flatMap((entry) => (entry.file ? [entry.file] : [])),
      funding: fundingPayload,
      refundPolicies: normalizedRefundPolicies,
    });
    if (!isEditMode && selectedVenueProfileId) {
      payload.append("venueProfileId", selectedVenueProfileId);
      payload.append("doorSalesEnabled", String(doorSalesEnabled));
      if (doorSalesEnabled) {
        payload.append("doorPrice", doorPrice);
        payload.append("doorSaleStartAt", new Date(doorSaleStartAt).toISOString());
        payload.append("doorSaleEndAt", new Date(doorSaleEndAt).toISOString());
      }
    }

    onSubmit({
      eventPayload: payload,
      checklist: canSelfSignChecklist
        ? {
            answers: checklistAnswers,
            signedByName: checklistSignatureName.trim(),
            shouldSign: isPerformanceChecklistComplete(checklistAnswers),
            hasChanges: checklistHasChanges || !initialChecklist,
          }
        : null,
      operation:
        operationBudgetNotes.trim().length > 0
          ? {
              serviceScope: [],
              requiredHelp: [],
              addOnNeeds: [],
              budgetNotes: operationBudgetNotes.trim(),
            }
          : null,
    });
  };

  return (
    <div className="relative min-h-full animate-in slide-in-from-right bg-[var(--color-canvas)] pb-32 text-[var(--color-ink)] duration-300">
      <NavHeader
        title={isEditMode ? "공연 정보 수정" : "공연 등록하기"}
        onBack={onBack}
      />

      <div className="space-y-8 p-6">
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
          <div className="animate-in fade-in slide-in-from-right-4 space-y-8 duration-300">
            <div className="space-y-2">
              <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">공연 제목 *</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="공연 제목 입력"
                className="h-14 rounded-2xl border-transparent bg-[var(--color-surface-soft)] px-4 text-lg font-bold text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">포스터 업로드 *</Label>
              <div className="flex flex-col items-center pt-2">
                <button
                  type="button"
                  onClick={handlePosterPick}
                  className="group relative flex w-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[var(--color-hairline)] bg-[var(--color-surface-soft)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
                >
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePosterChange}
                    className="hidden"
                  />
                  <div className="aspect-[3/4] w-full">
                    {posterPreviewUrl ? (
                      <img src={posterPreviewUrl} alt="업로드된 포스터" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                        <DyveIcon name="upload" size="lg" tone="muted" className="mb-2 h-8 w-8 transition-colors group-hover:text-[var(--color-primary)]" />
                        <span className="text-[11px] text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-ink)]">포스터 업로드</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-2 right-2 rounded-full bg-[var(--color-primary)] p-2 shadow-lg">
                    <DyveIcon name="plus" size="sm" tone="inverse" className="h-4 w-4" />
                  </div>
                </button>
                <span className="mt-3 text-sm text-[var(--color-muted)]">{posterFileName ? `${posterFileName} 업로드됨` : "포스터 이미지 업로드"}</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* 장르 버튼 */}
              <div className="space-y-2">
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">장르 *</Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_GENRES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setGenre(item)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${genre === item
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] scale-[1.04]"
                        : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:scale-[1.02]"
                        }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="pl-1 text-[11px] text-[var(--color-muted)]">
                  세부 장르 <span className="text-[var(--color-muted)]/60">(선택)</span>
                </Label>
                <Input
                  value={subGenre}
                  onChange={(e) => setSubGenre(e.target.value)}
                  placeholder={`예) 재즈 밴드, 인디 팝, 홀로그램 전시…`}
                  className="h-10 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 text-sm text-[var(--color-ink)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                />
              </div>

              {/* 펀딩 카드 토글 */}
              <div className="space-y-2">
                {/* 함께 여는 공연 카드 */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isHumanCrowdfunding;
                    setIsHumanCrowdfunding(next);
                    if (!next) { setFundingMinAttendees(""); setFundingDeadlineLocal(""); }
                  }}
                  className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                    isHumanCrowdfunding
                      ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/8 shadow-[0_0_0_1px_rgba(255,74,74,0.15)]"
                      : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] hover:border-[var(--color-hairline)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                        isHumanCrowdfunding ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-muted)]"
                      }`}>
                        <DyveIcon name="users" size="sm" className="h-4 w-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold transition-colors ${isHumanCrowdfunding ? "text-[var(--color-primary)]" : "text-[var(--color-ink)]"}`}>함께 여는 공연</p>
                        <p className="text-[11px] text-[var(--color-muted)]">목표 인원이 모이면 공연 확정 · 유료 티켓</p>
                      </div>
                    </div>
                    <div className={`h-5 w-5 shrink-0 rounded-full border-2 transition-colors duration-200 flex items-center justify-center ${
                      isHumanCrowdfunding ? "border-[var(--color-primary)] bg-[var(--color-primary)]" : "border-[var(--color-hairline)]"
                    }`}>
                      {isHumanCrowdfunding && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>

                {/* 함께 여는 공연 상세 */}
                {isHumanCrowdfunding && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 ml-2 space-y-3 rounded-xl border border-[var(--color-primary)]/15 bg-[var(--color-primary)]/5 p-4">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--color-muted-soft)]">
                        목표 인원 <span className="text-[var(--color-primary)]">*</span>
                      </Label>
                      <div className="relative">
                        <DyveIcon name="users" size="sm" tone="muted" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={fundingMinAttendees}
                          onChange={(e) => setFundingMinAttendees(sanitizeNumericInput(e.target.value))}
                          placeholder="예: 40"
                          className="h-11 rounded-xl border-transparent bg-[var(--color-canvas)] pl-9 text-sm text-[var(--color-ink)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                        />
                      </div>
                    </div>
                    <div ref={fundingDeadlinePickerRef} className="space-y-1">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--color-muted-soft)]">
                        마감일 <span className="text-[var(--color-primary)]">*</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => setIsFundingDeadlinePickerOpen((prev) => !prev)}
                        className="flex h-11 w-full items-center justify-between rounded-xl border border-transparent bg-[var(--color-canvas)] px-4 text-left transition-colors hover:border-[var(--color-hairline)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      >
                        <span className={`text-sm ${fundingDeadlineLocal ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"}`}>
                          {fundingDeadlineLocal ? formatLocalDateTimeDisplay(fundingDeadlineLocal) : "마감 일시 선택"}
                        </span>
                        <DyveIcon name="calendar-days" size="sm" tone="primary" className="h-4 w-4" />
                      </button>
                      {isFundingDeadlinePickerOpen && (
                        <div className="space-y-3 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-3">
                          <div className="overflow-x-auto overscroll-x-contain">
                            <DatePicker
                              selected={toDateFromLocalInput(fundingDeadlineLocal)}
                              onChange={(value: Date | null) => setFundingDeadlineLocal(value ? toLocalDateTimeInput(value) : "")}
                              showTimeSelect timeIntervals={60}
                              dateFormat="yyyy.MM.dd HH:mm"
                              minDate={minDate} maxDate={maxDate}
                              inline calendarClassName="dyve-datepicker"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3 px-1">
                            <span className="text-[11px] text-[var(--color-muted)]">
                              {fundingDeadlineLocal ? `선택됨: ${formatLocalDateTimeDisplay(fundingDeadlineLocal)}` : "날짜와 시간을 선택해 주세요."}
                            </span>
                            <button type="button" onClick={() => setIsFundingDeadlinePickerOpen(false)}
                              className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-1 text-[11px] text-[var(--color-muted)] hover:border-[var(--color-primary)]/60 hover:text-[var(--color-ink)]">
                              닫기
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 무료 입장 응원 카드 */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isCrowdfunding;
                    setIsCrowdfunding(next);
                    if (!next) setCrowdfundingTargetAmount("");
                  }}
                  className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                    isCrowdfunding
                      ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/8 shadow-[0_0_0_1px_rgba(255,74,74,0.15)]"
                      : "border-[var(--color-hairline)] bg-[var(--color-surface-soft)] hover:border-[var(--color-hairline)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                        isCrowdfunding ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-muted)]"
                      }`}>
                        <DyveIcon name="wallet" size="sm" className="h-4 w-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold transition-colors ${isCrowdfunding ? "text-[var(--color-primary)]" : "text-[var(--color-ink)]"}`}>무료 입장 응원</p>
                        <p className="text-[11px] text-[var(--color-muted)]">무료 입장 + 자율 응원금 · 목표 금액 설정</p>
                      </div>
                    </div>
                    <div className={`h-5 w-5 shrink-0 rounded-full border-2 transition-colors duration-200 flex items-center justify-center ${
                      isCrowdfunding ? "border-[var(--color-primary)] bg-[var(--color-primary)]" : "border-[var(--color-hairline)]"
                    }`}>
                      {isCrowdfunding && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>

                {/* 무료 입장 응원 상세 */}
                {isCrowdfunding && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 ml-2 space-y-3 rounded-xl border border-[var(--color-primary)]/15 bg-[var(--color-primary)]/5 p-4">
                    <p className="text-[11px] text-[var(--color-muted)]">
                      입장은 무료로 열리고, 관객은 원하는 만큼 응원금을 보낼 수 있어요.
                    </p>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--color-muted-soft)]">
                        목표 금액 <span className="text-[var(--color-primary)]">*</span>
                      </Label>
                      <div className="relative">
                        <DyveIcon name="wallet" size="sm" tone="muted" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={crowdfundingTargetAmount}
                          onChange={(e) => setCrowdfundingTargetAmount(sanitizeNumericInput(e.target.value))}
                          placeholder="예: 50"
                          className="h-11 rounded-xl border-transparent bg-[var(--color-canvas)] pl-9 pr-14 text-sm text-[var(--color-ink)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">만원</span>
                      </div>
                      {crowdfundingTargetAmount && Number.isFinite(parseInt(crowdfundingTargetAmount, 10)) && parseInt(crowdfundingTargetAmount, 10) > 0 && (
                        <p className="pl-1 text-[11px] text-[var(--color-muted)]">
                          = {(parseInt(crowdfundingTargetAmount, 10) * 10000).toLocaleString()}원
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-8 duration-300">
            <div className="grid gap-5">
              <div className="space-y-2">
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">공연 일시 *</Label>
                <DateTimeSelector
                  value={new Date(selectedYear, selectedMonth - 1, selectedDay, selectedHour, selectedMinute)}
                  onChange={(date: Date) => {
                    setSelectedYear(date.getFullYear());
                    setSelectedMonth(date.getMonth() + 1);
                    setSelectedDay(date.getDate());
                    setSelectedHour(date.getHours());
                    setSelectedMinute(date.getMinutes());
                  }}
                  minDate={minDate}
                  maxDate={maxDate}
                  allowAllTimes={allowAllTimes}
                  onAllowAllTimesChange={(checked: boolean) => setAllowAllTimes(checked)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* 러닝타임 */}
                <div className="space-y-2">
                  <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">러닝타임 *</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={runtimeMinutes}
                      onChange={(event) => setRuntimeMinutes(event.target.value.replace(/\D/g, ""))}
                      placeholder=""
                      className="h-12 rounded-2xl border-transparent bg-[var(--color-surface-soft)] px-4 pr-10 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">분</span>
                  </div>
                </div>

                {/* 입장 가능 시간 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">입장 가능 시간 *</Label>
                    <button
                      type="button"
                      onClick={() => setIsAlwaysEntry((prev) => !prev)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        isAlwaysEntry
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                          : "border-[var(--color-hairline)] bg-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      상시 가능
                    </button>
                  </div>

                  {!isAlwaysEntry && (() => {
                    const eventDate = new Date(selectedYear, selectedMonth - 1, selectedDay, selectedHour, selectedMinute);
                    const entryDate = new Date(eventDate.getTime() - entryOffsetMinutes * 60 * 1000);
                    const pad = (n: number) => String(n).padStart(2, "0");
                    const timeStr = `${pad(entryDate.getHours())}:${pad(entryDate.getMinutes())}`;
                    const dateStr = `${entryDate.getFullYear()}.${pad(entryDate.getMonth() + 1)}.${pad(entryDate.getDate())}`;
                    return (
                      <div className="rounded-2xl bg-[var(--color-surface-soft)] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            aria-label="공연 입장 가능 시간"
                            value={entryOffsetMinutes}
                            onChange={(event) => {
                              const digits = event.target.value.replace(/\D/g, "");
                              setEntryOffsetMinutes(Math.min(180, Math.max(0, Number(digits || 0))));
                            }}
                            className="h-8 min-w-0 flex-1 border-transparent bg-[var(--color-canvas)] text-center tabular-nums"
                          />
                          <span className="shrink-0 text-sm font-medium text-[var(--color-muted)]">분 전</span>
                        </div>
                        <div className="mt-1 text-center">
                          <p className="text-sm font-bold tabular-nums leading-tight text-[var(--color-ink)]">
                            {dateStr} {timeStr}
                          </p>
                          <p className="text-[11px] leading-tight text-[var(--color-muted)]">
                            0~180분 사이로 직접 입력해 주세요.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {isAlwaysEntry && (
                    <div className="flex h-12 items-center justify-center rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-sm text-[var(--color-muted)]">
                      상시 입장 가능
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {!isEditMode && venueOptions.length > 0 && <div className="space-y-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4"><div><Label className="text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">DYVE 업장 연결</Label><p className="mt-1 break-keep text-xs text-[var(--color-muted)]">외부 업장을 선택하면 업장 승인 후 입장 운영과 현매가 열립니다.</p></div><select value={selectedVenueProfileId} onChange={(event) => { const id = event.target.value; setSelectedVenueProfileId(id); const selected = venueOptions.find((item) => item.id === id); if (selected) { setVenue(selected.name); setAddress(selected.address ?? ""); setDetailAddress(selected.detailAddress ?? ""); if (selected.capacity) setCapacity(String(selected.capacity)); } }} className="h-12 w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-sm"><option value="">업장 연결 안 함</option>{venueOptions.map((item) => <option key={item.id} value={item.id}>{item.name}{item.address ? ` · ${item.address}` : ""}</option>)}</select>{selectedVenueProfileId && <div className="space-y-3 border-t border-[var(--color-hairline)] pt-3"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={doorSalesEnabled} onChange={(event) => setDoorSalesEnabled(event.target.checked)} /> 현매 판매를 업장에 요청</label>{doorSalesEnabled && <><PriceInput value={doorPrice} onChange={setDoorPrice} placeholder="현매가" /><div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2"><label className="text-xs text-[var(--color-muted)]">판매 시작<input type="datetime-local" value={doorSaleStartAt} onChange={(event) => setDoorSaleStartAt(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2 text-sm text-[var(--color-ink)]" /></label><label className="text-xs text-[var(--color-muted)]">판매 종료<input type="datetime-local" value={doorSaleEndAt} onChange={(event) => setDoorSaleEndAt(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2 text-sm text-[var(--color-ink)]" /></label></div></>}</div>}</div>}
              <div className="flex items-center justify-between border-y border-[var(--color-hairline)] py-3">
                <div className="space-y-1">
                  <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">베뉴 프로필 자동 불러오기</Label>
                  <p className="text-xs text-[var(--color-muted)]">
                    {venueProfile?.name ? `등록된 베뉴: ${venueProfile.name}` : "등록된 베뉴 프로필이 없습니다."}
                  </p>
                </div>
                {venueProfile ? (
                  <button
                    type="button"
                    onClick={applyVenueProfilePrefill}
                    className="min-h-11 px-2 text-[11px] font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
                  >
                    베뉴 프로필 불러오기
                  </button>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">공연장 이름 *</Label>
                <div className="relative">
                  <Input
                    value={venue}
                    onChange={(event) => setVenue(event.target.value)}
                    placeholder="공연장 이름"
                    className="h-12 rounded-2xl border-transparent bg-[var(--color-surface-soft)] pl-4 pr-10 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  />
                  <DyveIcon name="map-pin" size="md" tone="muted" className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">공연장 주소 *</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddressSheetOpen(true);
                    }}
                    className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-1 text-[11px] text-[var(--color-muted)] hover:border-[var(--color-primary)]/60 hover:text-[var(--color-ink)]"
                  >
                    도로명주소 검색
                  </button>
                </div>
                <div className="relative">
                  <Input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="주소 입력"
                    className="h-12 rounded-2xl border-transparent bg-[var(--color-surface-soft)] pl-4 pr-10 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  />
                  <DyveIcon name="map-pin" size="md" tone="muted" className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" />
                </div>
                <Input
                  value={detailAddress}
                  onChange={(event) => setDetailAddress(event.target.value)}
                  placeholder="상세주소 (예: 1층 203호)"
                  className="h-12 rounded-2xl border-transparent bg-[var(--color-surface-soft)] px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
                <p className="text-xs text-[var(--color-muted)]">주소를 기준으로 지역이 자동으로 정리돼요.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">공연 소개 사진</Label>
                  <span className="text-xs text-[var(--color-muted)]">{galleryEntries.length} / 9</span>
                </div>
                <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryChange} className="hidden" />
                <div className="flex flex-col items-center pt-2">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={galleryEntries.length >= 9}
                    className="group relative flex w-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[var(--color-hairline)] bg-[var(--color-surface-soft)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="aspect-[3/4] w-full">
                      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                        <DyveIcon name="upload" size="lg" tone="muted" className="mb-2 h-8 w-8 transition-colors group-hover:text-[var(--color-primary)]" />
                        <span className="text-[11px] text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-ink)]">소개 사진 추가</span>
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 rounded-full bg-[var(--color-primary)] p-2 shadow-lg">
                      <DyveIcon name="plus" size="sm" tone="inverse" className="h-4 w-4" />
                    </div>
                  </button>
                  <span className="mt-3 text-sm text-[var(--color-muted)]">소개 사진 추가</span>
                </div>
                {galleryEntries.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {galleryEntries.map((entry, index) => (
                      <div key={`${entry.previewUrl}-${index}`} className="relative overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
                        <img src={entry.previewUrl} alt={`소개 사진 ${index + 1}`} className="aspect-square w-full object-cover" />
                        <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                          <button type="button" aria-label="앞으로 이동" disabled={index === 0} onClick={() => moveGalleryEntry(index, -1)} className="rounded bg-black/55 px-2 py-1 text-xs text-white disabled:opacity-30">←</button>
                          <button type="button" aria-label="사진 삭제" onClick={() => setGalleryEntries((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded bg-black/55 px-2 py-1 text-xs text-white">삭제</button>
                          <button type="button" aria-label="뒤로 이동" disabled={index === galleryEntries.length - 1} onClick={() => moveGalleryEntry(index, 1)} className="rounded bg-black/55 px-2 py-1 text-xs text-white disabled:opacity-30">→</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">라인업</Label>
                <div className="relative">
                  <Input
                    value={artistInput}
                    onChange={(event) => setArtistInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="아티스트 이름 입력 (Enter)"
                    className="h-12 rounded-2xl border-transparent bg-[var(--color-surface-soft)] pl-4 pr-24 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  />
                  <InlineAddButton onClick={handleAddArtist} />
                </div>
                {artists.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {artists.map((artist, idx) => (
                      <div key={`${artist}-${idx}`} className="flex items-center gap-2 rounded-full bg-[var(--color-surface-muted)] px-4 py-2 text-sm text-[var(--color-ink)]">
                        <span>{artist}</span>
                        <button type="button" onClick={() => handleRemoveArtist(idx)} className="rounded-full bg-[var(--color-surface-strong)] p-0.5 hover:bg-[var(--color-hairline-strong)] hover:text-[var(--color-primary)]">
                          <DyveIcon name="x" size="sm" tone="default" className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">공연 소개</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="공연 소개"
                  className="min-h-[120px] rounded-2xl border-transparent bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-8 duration-300">
            <div className="space-y-2 pt-2">
              <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">입장방식 *</Label>
              <RadioGroup
                value={ticketType}
                onValueChange={(value) => {
                  if (value === "standing" || value === "assigned" || value === "open" || value === "table") {
                    setTicketType(value);
                  }
                }}
                className="grid grid-cols-2 gap-3"
              >
                <div>
                  <RadioGroupItem value="standing" id="standing" className="peer sr-only" />
                  <Label
                    htmlFor="standing"
                    className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-2xl border border-transparent bg-[var(--color-surface-soft)] p-3 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-muted)] peer-data-[state=checked]:border-[var(--color-primary)] peer-data-[state=checked]:bg-[var(--color-primary)]/10 peer-data-[state=checked]:text-[var(--color-ink)]"
                  >
                    <span className="text-sm font-bold">스탠딩</span>
                    <span className="mt-1 text-[11px] opacity-70">번호순 입장</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="assigned" id="assigned" className="peer sr-only" />
                  <Label
                    htmlFor="assigned"
                    className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-2xl border border-transparent bg-[var(--color-surface-soft)] p-3 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-muted)] peer-data-[state=checked]:border-[var(--color-primary)] peer-data-[state=checked]:bg-[var(--color-primary)]/10 peer-data-[state=checked]:text-[var(--color-ink)]"
                  >
                    <span className="text-sm font-bold">지정좌석</span>
                    <span className="mt-1 text-[11px] opacity-70">좌석 선택</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="open" id="open" className="peer sr-only" />
                  <Label
                    htmlFor="open"
                    className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-2xl border border-transparent bg-[var(--color-surface-soft)] p-3 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-muted)] peer-data-[state=checked]:border-[var(--color-primary)] peer-data-[state=checked]:bg-[var(--color-primary)]/10 peer-data-[state=checked]:text-[var(--color-ink)]"
                  >
                    <span className="text-sm font-bold">자율입장</span>
                    <span className="mt-1 text-[11px] opacity-70">자유 입장</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="table" id="table" className="peer sr-only" />
                  <Label
                    htmlFor="table"
                    className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-2xl border border-transparent bg-[var(--color-surface-soft)] p-3 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-muted)] peer-data-[state=checked]:border-[var(--color-primary)] peer-data-[state=checked]:bg-[var(--color-primary)]/10 peer-data-[state=checked]:text-[var(--color-ink)]"
                  >
                    <span className="text-sm font-bold">테이블 예매</span>
                    <span className="mt-1 text-[11px] opacity-70">테이블/오픈 테이블</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">
                좌석 예매 안내 (선택)
              </Label>
              <Textarea
                value={seatBookingInfo}
                onChange={(event) => setSeatBookingInfo(event.target.value)}
                placeholder="입장 방식과 관련해 추가 안내할 내용이 있으면 입력해 주세요."
                className="min-h-[92px] rounded-2xl border-transparent bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
              <p className="pl-1 text-xs text-[var(--color-muted)]">미입력 시 기본 안내 문구가 자동으로 저장됩니다.</p>
            </div>

            <div className="space-y-4">
              <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">최대 입장 관객 / 좌석 구조 *</Label>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="pl-1 text-[11px] text-[var(--color-muted)]">
                    최대 입장 관객 {ticketType === "assigned" || ticketType === "table" ? "(자동 계산)" : ""}
                  </Label>
                  <div className="relative">
                    <DyveIcon name="users" size="sm" tone="muted" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={capacity}
                      onChange={(event) => setCapacity(sanitizeNumericInput(event.target.value))}
                      placeholder="예: 120"
                      disabled={ticketType === "assigned" || ticketType === "table"}
                      className={`h-12 rounded-xl border-transparent bg-[var(--color-surface-soft)] pl-9 text-base text-[var(--color-ink)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] ${ticketType === "assigned" || ticketType === "table" ? "opacity-70" : ""
                        }`}
                    />
                  </div>
                </div>

                <div className={`space-y-2 transition-opacity duration-300 ${ticketType === "assigned" ? "opacity-100" : "pointer-events-none opacity-40"}`}>
                  <Label className="pl-1 text-[11px] text-[var(--color-muted)]">좌석 열 수 *</Label>
                  <div className="relative">
                    <DyveIcon name="layout-grid" size="sm" tone="muted" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={cols}
                      onChange={(event) => setCols(sanitizeNumericInput(event.target.value))}
                      aria-invalid={Boolean(seatLayoutError)}
                      aria-describedby={seatLayoutError ? "assigned-seat-layout-error" : undefined}
                      placeholder="열 수"
                      className="h-12 rounded-xl border-transparent bg-[var(--color-surface-soft)] pl-9 text-base text-[var(--color-ink)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div className={`space-y-2 transition-opacity duration-300 ${ticketType === "assigned" ? "opacity-100" : "pointer-events-none opacity-40"}`}>
                  <Label className="pl-1 text-[11px] text-[var(--color-muted)]">좌석 행 수 *</Label>
                  <div className="relative">
                    <DyveIcon name="layout-grid" size="sm" tone="muted" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={rows}
                      onChange={(event) => setRows(sanitizeNumericInput(event.target.value))}
                      aria-invalid={Boolean(seatLayoutError)}
                      aria-describedby={seatLayoutError ? "assigned-seat-layout-error" : undefined}
                      placeholder="행 수"
                      className="h-12 rounded-xl border-transparent bg-[var(--color-surface-soft)] pl-9 text-base text-[var(--color-ink)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>
              {seatLayoutError && (
                <p id="assigned-seat-layout-error" role="alert" className="pl-1 text-xs font-medium text-[var(--color-primary)]">
                  {seatLayoutError}
                </p>
              )}
              {ticketType === "assigned" && (
                <p className="pl-1 text-xs text-[var(--color-muted)]">
                  최대 {MAX_ASSIGNED_SEAT_ROWS}행 × {MAX_ASSIGNED_SEAT_COLS}열까지 입력한 뒤, 아래 좌석도를 눌러 비활성 좌석을 선택해 주세요.
                </p>
              )}
              {ticketType === "table" && (
                <p className="pl-1 text-xs text-[var(--color-muted)]">
                  테이블 예매는 옵션별 테이블 수와 테이블당 인원을 기준으로 총 수용 인원을 계산합니다.
                </p>
              )}
              {ticketType === "assigned" && layoutCols && layoutRows && !seatLayoutError && (
                <div className="space-y-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[var(--color-muted)]">좌석도에서 판매 제외할 좌석을 선택해 주세요.</p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-muted)]">
                      <span className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-1">
                        전체 {assignedSeatTotal}석
                      </span>
                      <span className="rounded-full border border-[var(--color-accent-pink)]/40 bg-[var(--color-accent-pink)]/20 px-3 py-1 text-[var(--color-primary-soft)]">
                        판매 {assignedActiveSeatCount}석
                      </span>
                      <span className="rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/20 px-3 py-1 text-[var(--color-primary-soft)]">
                        비활성 {disabledSeatCount}석
                      </span>
                    </div>
                  </div>

                  <div
                    aria-label={`좌석 미리보기, ${layoutRows}행 ${layoutCols}열`}
                    data-seat-grid
                    data-seat-rows={layoutRows}
                    data-seat-cols={layoutCols}
                    className="grid w-full gap-[clamp(2px,0.8vw,4px)] rounded-xl bg-[var(--color-surface-muted)] p-2"
                    style={{ gridTemplateColumns: `repeat(${layoutCols}, minmax(0, 1fr))` }}
                  >
                      {Array.from({ length: layoutRows }).flatMap((_, rowIndex) =>
                        Array.from({ length: layoutCols }).map((__, colIndex) => {
                          const seatKey = toSeatKey(rowIndex, colIndex);
                          const disabled = normalizedDisabledSeatKeys.includes(seatKey);
                          const label = toSeatLabel(rowIndex, colIndex);
                          return (
                            <button
                              key={seatKey}
                              type="button"
                              onClick={() => handleSeatToggle(rowIndex, colIndex)}
                              className={`flex aspect-square min-w-0 items-center justify-center rounded-[3px] border text-[clamp(6px,1.8vw,10px)] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${disabled
                                ? "border-[var(--color-primary)]/60 bg-[var(--color-primary)]/30 text-[var(--color-primary-soft)]"
                                : "border-[var(--color-accent-pink)]/40 bg-[var(--color-accent-pink)]/25 text-[var(--color-primary-soft)]"
                                }`}
                              title={`${label} ${disabled ? "선택 안 됨" : "선택됨"}`}
                            >
                              {label}
                            </button>
                          );
                        }),
                      )}
                  </div>

                  {disabledSeatLabels.length > 0 && (
                    <p className="text-xs text-[var(--color-muted)]">비활성 좌석: {disabledSeatLabels.join(", ")}</p>
                  )}
                </div>
              )}
              {ticketType === "table" && (
                <div className="space-y-4 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-ink)]">테이블 옵션</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      총 테이블 수 {tableOptions.reduce((sum, opt) => sum + (toPositiveInt(opt.tableCount) ?? 0), 0)}개<br />
                      바 테이블, 대형 테이블도 테이블 1개로 계산됩니다.
                    </p>
                  </div>
                  <div className="relative" ref={tableTypeMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsTableTypeMenuOpen(!isTableTypeMenuOpen)}
                      className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] px-4 py-2 text-sm text-[var(--color-ink)] hover:border-[var(--color-primary)]/60"
                    >
                      + 테이블 추가
                    </button>

                    {isTableTypeMenuOpen && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] rounded-xl overflow-hidden shadow-lg z-20">
                        {TABLE_TYPE_OPTIONS.map((type) => (
                          <button
                            key={type.label}
                            type="button"
                            onClick={() => {
                              const newId = `table-${Date.now()}`;
                              setTableOptions((prev) => [
                                ...prev,
                                {
                                  id: newId,
                                  label: type.label === "직접 입력" ? "" : type.label,
                                  tableCount: "",
                                  seatsPerTable: type.seatsPerTable,
                                  saleMode: type.saleMode,
                                  pricePerSeat: "",
                                  description: "",
                                },
                              ]);
                              setIsTableTypeMenuOpen(false);
                              setFormError(null);
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] border-b border-[var(--color-hairline)] last:border-b-0 transition-colors"
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {tableOptions.map((option, index) => {
                      const isOpenOrBarSeat = option.label.includes("오픈") || option.label.includes("바") || option.label.includes("Open") || option.label.includes("Bar");
                      const isSharedSeat = isOpenOrBarSeat || option.saleMode === "SHARED_SEAT";
                      const tableCountNum = parseInt(option.tableCount, 10);
                      const seatsNum = parseInt(option.seatsPerTable, 10);
                      const summary = !isNaN(tableCountNum) && !isNaN(seatsNum) && tableCountNum > 0 && seatsNum > 0
                        ? isSharedSeat ? `${tableCountNum}개 = ${seatsNum * tableCountNum}석` : `${tableCountNum}개`
                        : "";
                      return (
                        <div key={`${option.id}-${index}`} className="space-y-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-muted)] p-4">
                          {/* 헤더 */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-[var(--color-ink)]">옵션 {index + 1}</p>
                              {summary && (
                                <span className="text-xs text-[var(--color-muted)]">{summary}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveTableOption(index)}
                              className="rounded-full border border-[var(--color-hairline)] px-3 py-1 text-[11px] text-[var(--color-muted)] hover:border-[var(--color-primary)]/60 hover:text-[var(--color-primary)]"
                            >
                              삭제
                            </button>
                          </div>

                          {/* 유형명 */}
                          <div className="space-y-1">
                            <p className="pl-1 text-xs font-semibold text-[var(--color-ink)]">유형명 <span className="text-[var(--color-primary)]">*</span></p>
                            <Input
                              value={option.label}
                              onChange={(event) => {
                                const label = event.target.value;
                                handleUpdateTableOption(index, {
                                  label,
                                  id: option.id || sanitizeOptionId(label),
                                });
                              }}
                              placeholder="예: 2인 테이블"
                              className="h-11 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 text-sm text-[var(--color-ink)]"
                            />
                          </div>

                          {/* 테이블 단위로 판매 체크박스 */}
                          <div className="space-y-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!isSharedSeat}
                                onChange={(e) => {
                                  const newMode: TableSaleMode = e.target.checked ? "WHOLE_TABLE" : "SHARED_SEAT";
                                  handleUpdateTableOption(index, { saleMode: newMode });
                                }}
                                disabled={isOpenOrBarSeat}
                                className="w-4 h-4 rounded cursor-pointer disabled:opacity-50"
                              />
                              <span className="text-xs font-semibold text-[var(--color-ink)]">
                                테이블 단위로 판매
                              </span>
                            </label>
                            <p className="pl-1 text-xs text-[var(--color-muted)]">
                              {!isSharedSeat
                                ? "테이블 한 개를 1팀이 통째로 예매합니다. (테이블당 가격 설정)"
                                : "빈 좌석에 각자 예매하는 방식입니다. (좌석당 가격 설정)"}
                            </p>
                          </div>

                          {/* 총 테이블 수 + 테이블당 인원 (2열) */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <p className="pl-1 text-xs font-semibold text-[var(--color-ink)]">총 테이블 수 <span className="text-[var(--color-primary)]">*</span></p>
                              <div className="relative">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={option.tableCount}
                                  onChange={(event) => handleUpdateTableOption(index, { tableCount: sanitizeNumericInput(event.target.value) })}
                                  placeholder="0"
                                  className="h-11 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 pr-8 text-sm text-[var(--color-ink)]"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted)]">개</span>
                              </div>
                              <p className="pl-1 text-xs text-[var(--color-muted)]">바 테이블, 대형 테이블도 1개로 계산하세요.</p>
                            </div>
                            <div className="space-y-1">
                              <p className="pl-1 text-xs font-semibold text-[var(--color-ink)]">테이블당 인원 <span className="text-[var(--color-primary)]">*</span></p>
                              <div className="relative">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={option.seatsPerTable}
                                  onChange={(event) => handleUpdateTableOption(index, { seatsPerTable: sanitizeNumericInput(event.target.value) })}
                                  placeholder="0"
                                  className="h-11 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 pr-8 text-sm text-[var(--color-ink)]"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted)]">명</span>
                              </div>
                            </div>
                          </div>

                          {/* 가격 */}
                          <div className="space-y-1">
                            <p className="pl-1 text-xs font-semibold text-[var(--color-ink)]">
                              {!isSharedSeat ? "테이블당 가격" : "좌석당 가격"} <span className="text-[var(--color-primary)]">*</span>
                            </p>
                            <div className="relative">
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={isFree ? "0" : option.pricePerSeat}
                                onChange={(event) => handleUpdateTableOption(index, { pricePerSeat: sanitizeNumericInput(event.target.value) })}
                                disabled={isFree}
                                placeholder="0"
                                className="h-11 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 pr-8 text-sm text-[var(--color-ink)] disabled:opacity-60"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted)]">원</span>
                            </div>
                            {isFree && (
                              <p className="pl-1 text-xs text-[var(--color-muted)]">무료 공연이므로 0원으로 고정됩니다.</p>
                            )}
                          </div>

                          {/* 안내 문구 */}
                          <div className="space-y-1">
                            <p className="pl-1 text-xs font-semibold text-[var(--color-ink)]">안내 문구 <span className="text-[var(--color-muted)]">(선택)</span></p>
                            <Textarea
                              value={option.description}
                              onChange={(event) => handleUpdateTableOption(index, { description: event.target.value })}
                              placeholder="관객에게 보여줄 안내 문구를 입력하세요"
                              className="min-h-[76px] rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-[var(--color-ink)]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">티켓 공통 (필수)</Label>
              <div className="flex items-center justify-between">
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">티켓 가격</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="free-event"
                    checked={isFree}
                    onCheckedChange={(checked) => {
                      setIsFree(Boolean(checked));
                      if (checked) setPrice("0");
                    }}
                    className="border-[var(--color-hairline)] data-[state=checked]:border-[var(--color-primary)] data-[state=checked]:bg-[var(--color-primary)]"
                  />
                  <label htmlFor="free-event" className="cursor-pointer text-sm text-[var(--color-muted)]">
                    무료 공연
                  </label>
                </div>
              </div>
              <div className={`transition-opacity duration-300 ${isFree ? "pointer-events-none opacity-50" : "opacity-100"}`}>
                <PriceInput
                  value={isFree ? "0" : price}
                  onChange={(val) => setPrice(val)}
                  disabled={isFree}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">취소·환불 규정</Label>
                {refundPolicies.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRefundPolicies((current) => [...current, { ...EMPTY_REFUND_POLICY }]);
                    }}
                    className="text-xs font-semibold text-[var(--color-primary)]"
                  >
                    + 정책 추가
                  </button>
                )}
              </div>
              {refundPolicies.map((policy, index) => {
                const updatePolicy = (patch: Partial<RefundPolicyForm>) =>
                  setRefundPolicies((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
                return (
                  <div key={index} className="space-y-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-3">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-sm text-[var(--color-body)]">공연</span>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={policy.daysBefore}
                        disabled={policy.mode === "none"}
                        onChange={(event) => updatePolicy({ daysBefore: event.target.value })}
                        aria-label={`환불 정책 ${index + 1} 일수`}
                        className="w-20"
                      />
                      <span className="shrink-0 text-sm text-[var(--color-body)]">일 전</span>
                      <select
                        value={policy.mode}
                        onChange={(event) => {
                          const nextMode = event.target.value;
                          updatePolicy(
                            nextMode === "full"
                              ? { mode: "full", cancellationFeePercent: "0" }
                              : nextMode === "none"
                                ? { mode: "none", daysBefore: "1", cancellationFeePercent: "100" }
                                : { mode: "partial", cancellationFeePercent: "50" },
                          );
                        }}
                        aria-label={`환불 정책 ${index + 1} 방식`}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2 text-sm text-[var(--color-ink)]"
                      >
                        <option value="full">전액 환불</option>
                        <option value="partial">부분 환불</option>
                        <option value="none">환불 불가</option>
                      </select>
                      {refundPolicies.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRefundPolicies((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          aria-label={`환불 정책 ${index + 1} 삭제`}
                          className="shrink-0 px-1 text-xs text-[var(--color-muted)]"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    {policy.mode === "partial" && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-[var(--color-muted)]">취소 수수료</Label>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          step={1}
                          value={policy.cancellationFeePercent}
                          onChange={(event) => updatePolicy({ cancellationFeePercent: event.target.value })}
                          aria-label={`환불 정책 ${index + 1} 취소 수수료`}
                          className="w-20"
                        />
                        <span className="text-sm text-[var(--color-body)]">%</span>
                      </div>
                    )}
                    <Textarea
                      value={policy.description}
                      onChange={(event) => updatePolicy({ description: event.target.value })}
                      placeholder="환불 정책을 안내해 주세요."
                      maxLength={300}
                      aria-label={`환불 정책 ${index + 1} 안내`}
                      className="min-h-20"
                    />
                  </div>
                );
              })}
              <p className="text-xs leading-5 text-[var(--color-muted)]">최대 3개까지 등록할 수 있으며, 티켓 발권 후에는 변경할 수 없어요.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
                <div className="flex items-center justify-between">
                  <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">굿즈 판매</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has-goods"
                      checked={hasGoods}
                      onCheckedChange={(checked) => {
                        const nextValue = Boolean(checked);
                        setHasGoods(nextValue);
                        if (!nextValue) setGoodsInfo("");
                      }}
                      className="border-[var(--color-hairline)] data-[state=checked]:border-[var(--color-primary)] data-[state=checked]:bg-[var(--color-primary)]"
                    />
                    <label htmlFor="has-goods" className="cursor-pointer text-xs text-[var(--color-muted)]">
                      판매함
                    </label>
                  </div>
                </div>
                {hasGoods && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <Textarea
                      value={goodsInfo}
                      onChange={(event) => setGoodsInfo(event.target.value)}
                      placeholder="굿즈 종류, 가격, 구매 방법 등을 자유롭게 작성해 주세요."
                      className="min-h-[92px] rounded-2xl border-transparent bg-[var(--color-canvas)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
                <div className="flex items-center justify-between">
                  <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">프리드링크</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="free-drink"
                      checked={isFreeDrink}
                      disabled={initialIsFreeDrink}
                      onCheckedChange={(checked) => {
                        const nextValue = Boolean(checked);
                        if (initialIsFreeDrink && !nextValue) return;
                        setIsFreeDrink(nextValue);
                        if (nextValue) {
                          setFreeDrinkCount((prev) => {
                            const parsed = parseInt(prev, 10);
                            if (Number.isFinite(parsed) && parsed > 0) return String(parsed);
                            return "1";
                          });
                        } else {
                          setFreeDrinkCount("");
                        }
                      }}
                      className="border-[var(--color-hairline)] data-[state=checked]:border-[var(--color-primary)] data-[state=checked]:bg-[var(--color-primary)]"
                    />
                    <label htmlFor="free-drink" className="cursor-pointer text-xs text-[var(--color-muted)]">
                      제공함
                    </label>
                  </div>
                </div>
                {isFreeDrink && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={freeDrinkCount}
                        onChange={(event) => setFreeDrinkCount(sanitizeNumericInput(event.target.value))}
                        placeholder="예: 1"
                        className="h-12 rounded-xl border-transparent bg-[var(--color-surface-soft)] px-4 pr-10 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">잔</span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)]">1인 기준 제공 잔 수</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4">
              <div>
                <Label className="pl-1 text-xs font-bold uppercase tracking-[0.04em] text-[var(--color-primary)]">운영 요청 (선택)</Label>
                <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                  예산, 현장 준비, 음식·촬영 가능 여부 등 DYVE가 알아야 할 내용을 자유롭게 적어 주세요.
                </p>
              </div>

              <Textarea
                value={operationBudgetNotes}
                onChange={(event) => setOperationBudgetNotes(event.target.value)}
                placeholder="예: 무대 설치는 2시간 전부터 가능해요. 촬영팀 동선 안내가 필요해요."
                className="min-h-[92px] rounded-2xl border-transparent bg-[var(--color-canvas)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>

          </div>
        )}

        {step === 3 && (
          <PerformanceChecklistStep
            answers={checklistAnswers}
            onAnswerChange={handleChecklistAnswerChange}
            signatureName={checklistSignatureName}
            onSignatureNameChange={handleChecklistSignatureNameChange}
            venueName={venue || venueProfile?.name}
            eventTitle={title}
            canEditChecklist={true}
            isSigned={isChecklistSigned && !checklistHasChanges}
            signedByName={isChecklistSigned && !checklistHasChanges ? checklistSignedByName : null}
            signedAt={isChecklistSigned && !checklistHasChanges ? checklistSignedAt : null}
            helperText={
              canSelfSignChecklist
                ? "필수 항목을 모두 확인하고 서명자 이름을 입력하면 최종 등록 또는 저장이 가능합니다."
                : "체크리스트를 확인하고 공연을 등록하세요.\n베뉴 서명은 채팅으로 성사된 공연에서 진행됩니다."
            }
          />
        )}

      </div>

      <div className="mobile-fixed-bar app-bottom-bar border-t p-4 pb-8">
        {(formError || submitError) && <p className="mb-2 text-center text-xs text-[var(--color-primary)]">{formError ?? submitError}</p>}
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
                if (step === 1) {
                  if (!title.trim()) { setFormError("공연 제목을 입력해 주세요."); return; }
                  if (!posterFile && !posterPreviewUrl) { setFormError("포스터 이미지를 업로드해 주세요."); return; }
                }
                if (step === 2) {
                  if (!venue.trim()) { setFormError("공연장 이름을 입력해 주세요."); return; }
                  if (!address.trim()) { setFormError("공연장 주소를 입력해 주세요."); return; }
                  const parsedRuntime = parseInt(runtimeMinutes, 10);
                  if (!Number.isFinite(parsedRuntime) || parsedRuntime <= 0) { setFormError("러닝타임(분)을 숫자로 입력해 주세요."); return; }
                }
                setFormError(null);
                setStep(s => s + 1);
                scrollAppMainToTop("smooth");
              } else {
                if (canSelfSignChecklist && !isPerformanceChecklistComplete(checklistAnswers)) {
                  setFormError("필수 체크리스트 항목을 모두 확인해 주세요.");
                  return;
                }
                if (canSelfSignChecklist && checklistNeedsSignature && !checklistSignatureName.trim()) {
                  setFormError("베뉴 서명자 이름을 입력해 주세요.");
                  return;
                }
                handleSubmit();
              }
            }}
            disabled={isSubmitDisabled || isSubmitting || (step === maxSteps && !isChecklistReadyForSubmit)}
            className={`flex-1 rounded-xl py-6 text-lg font-bold transition-colors ${isSubmitDisabled || isSubmitting
              || (step === maxSteps && !isChecklistReadyForSubmit)
              ? "bg-[var(--color-surface-muted)] text-[var(--color-muted)]"
              : "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]"
              }`}
          >
            {step < maxSteps
              ? "다음 단계로"
              : isSubmitting ? (isEditMode ? "저장 중..." : "등록 중...") : submitLabel ?? (isEditMode ? "공연 정보 저장하기" : "공연 등록하기")}
          </Button>
        </div>
        {isSubmitDisabled && submitNotice && (
          <p className="mt-2 text-center text-xs text-[var(--color-muted)]">{submitNotice}</p>
        )}
        {!isSubmitDisabled && step === maxSteps && canSelfSignChecklist && !isChecklistReadyForSubmit && (
          <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
            필수 확인과 베뉴 서명이 끝나면 공연을 등록할 수 있어요.
          </p>
        )}
      </div>
      <AddressSearchSheet
        isOpen={isAddressSheetOpen}
        onClose={() => setIsAddressSheetOpen(false)}
        onSelect={(roadAddr) => {
          setAddress(roadAddr);
        }}
      />
    </div>
  );
}
