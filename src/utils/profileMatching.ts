export const ARTIST_MATCHING_PREFIXES = {
  availability: "행사 참여:",
  format: "활동 형태:",
  mood: "공연 무드:",
  filming: "콘텐츠 촬영:",
} as const;

export const VENUE_MATCHING_PREFIXES = {
  experience: "운영 경험:",
  spaceUse: "공간 활용:",
  supportNeed: "필요 지원:",
  budget: "예산 방식:",
} as const;

export const encodeProfileMatchingValue = (prefix: string, value: string) => {
  const normalized = value.trim();
  return normalized ? `${prefix}${normalized}` : "";
};

export const readProfileMatchingValues = (items: string[], prefix: string) =>
  items
    .filter((item) => item.startsWith(prefix))
    .map((item) => item.slice(prefix.length).trim())
    .filter(Boolean);

export const excludeProfileMatchingValues = (items: string[], prefixes: readonly string[]) =>
  items.filter((item) => !prefixes.some((prefix) => item.startsWith(prefix)));
