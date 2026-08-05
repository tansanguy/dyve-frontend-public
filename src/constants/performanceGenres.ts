/** 공연 등록·목록 필터링에 사용되는 상위 장르 */
export const PERFORMANCE_MAIN_GENRES = [
  "공연",
  "파티",
  "전시",
  "문화 행사",
] as const;

export type PerformanceMainGenre = (typeof PERFORMANCE_MAIN_GENRES)[number];

/** EventCard 뱃지 등 기존 코드와의 하위 호환용 alias */
export const PERFORMANCE_GENRE_TAGS = PERFORMANCE_MAIN_GENRES;

export const PERFORMANCE_GENRE_FALLBACK = "공연";

export const PERFORMANCE_GENRE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  "공연":      { bg: "rgba(255, 74, 74, 0.12)",    border: "rgba(255, 74, 74, 0.32)",    text: "var(--color-primary)" },
  "파티":      { bg: "rgba(206, 175, 191, 0.12)",  border: "rgba(206, 175, 191, 0.28)", text: "var(--color-accent-pink)" },
  "전시":      { bg: "rgba(206, 175, 191, 0.12)",  border: "rgba(206, 175, 191, 0.28)", text: "var(--color-accent-pink)" },
  "문화 행사": { bg: "rgba(206, 175, 191, 0.12)", border: "rgba(206, 175, 191, 0.26)", text: "var(--color-accent-pink)" },
};

const MAIN_GENRE_SET = new Set<string>(PERFORMANCE_MAIN_GENRES);

/** 구 장르 태그 → 새 장르 매핑 (기존 DB 데이터 로드 시 사용) */
const LEGACY_GENRE_MAP: Record<string, PerformanceMainGenre> = {
  "performance":  "공연",
  "show":         "공연",
  "live":         "공연",
  "music":        "공연",
  "classic":      "공연",
  "classical":    "공연",
  "musical":      "공연",
  "concert":      "공연",
  "party":        "파티",
  "club":         "파티",
  "dj":           "파티",
  "exhibition":   "전시",
  "gallery":      "전시",
  "art":          "전시",
  "culture_event": "문화 행사",
  "culture event": "문화 행사",
  "cultural event": "문화 행사",
  "talk":         "문화 행사",
  "lecture":      "문화 행사",
  "workshop":     "문화 행사",
  "밴드 공연":    "공연",
  "디제잉":       "파티",
  "어쿠스틱 공연": "공연",
  "NO AMP 공연":  "공연",
  "스테이지 보유": "공연",
  "전시":         "전시",
  "극":           "문화 행사",
  "극·연극":      "문화 행사",
  "토크, 강연":   "문화 행사",
  "토크·강연":    "문화 행사",
  "워크숍":       "문화 행사",
  "감상회":       "문화 행사",
  "기타":         "공연",
};

export const resolveMainGenre = (value: unknown): PerformanceMainGenre => {
  if (typeof value !== "string") return PERFORMANCE_GENRE_FALLBACK;
  const trimmed = value.trim();
  if (!trimmed) return PERFORMANCE_GENRE_FALLBACK;
  if (MAIN_GENRE_SET.has(trimmed)) return trimmed as PerformanceMainGenre;
  return LEGACY_GENRE_MAP[trimmed] ?? LEGACY_GENRE_MAP[trimmed.toLowerCase()] ?? PERFORMANCE_GENRE_FALLBACK;
};

export const resolvePerformanceGenreTag = (value: unknown): string =>
  resolveMainGenre(value);

export const resolvePerformanceGenreStyle = (value: unknown) =>
  PERFORMANCE_GENRE_STYLES[resolvePerformanceGenreTag(value)] ??
  PERFORMANCE_GENRE_STYLES[PERFORMANCE_GENRE_FALLBACK];
