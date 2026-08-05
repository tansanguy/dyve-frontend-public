export type RegionOption = {
  code: string;
  label: string;
  matches: string[];
};

export const REGION_OPTIONS: RegionOption[] = [
  { code: "서울", label: "서울", matches: ["서울", "seoul"] },
  { code: "부산", label: "부산", matches: ["부산", "busan"] },
  { code: "대구", label: "대구", matches: ["대구", "daegu"] },
  { code: "인천", label: "인천", matches: ["인천", "incheon"] },
  { code: "광주", label: "광주", matches: ["광주", "gwangju"] },
  { code: "대전", label: "대전", matches: ["대전", "daejeon"] },
  { code: "울산", label: "울산", matches: ["울산", "ulsan"] },
  { code: "세종", label: "세종", matches: ["세종", "sejong"] },
  { code: "경기", label: "경기", matches: ["경기", "경기도", "gyeonggi"] },
  { code: "강원", label: "강원", matches: ["강원", "강원도", "gangwon"] },
  { code: "충북", label: "충북", matches: ["충북", "충청북도", "chungbuk"] },
  { code: "충남", label: "충남", matches: ["충남", "충청남도", "chungnam"] },
  { code: "전북", label: "전북", matches: ["전북", "전라북도", "jeonbuk"] },
  { code: "전남", label: "전남", matches: ["전남", "전라남도", "jeonnam"] },
  { code: "경북", label: "경북", matches: ["경북", "경상북도", "gyeongbuk"] },
  { code: "경남", label: "경남", matches: ["경남", "경상남도", "gyeongnam"] },
  { code: "제주", label: "제주", matches: ["제주", "제주도", "jeju"] },
];

const REGION_INDEX = new Map(REGION_OPTIONS.map((option) => [option.code, option]));

export const normalizeRegions = (regions: string[]) => {
  const deduped = Array.from(new Set(regions.map((region) => region.trim()).filter(Boolean)));
  return deduped.filter((region) => REGION_INDEX.has(region));
};

export const filterEventsByRegions = <T extends { venue?: string; location?: string; address?: string; region?: string }>(
  events: T[],
  regions: string[],
) => {
  if (!regions.length) return events;
  const normalized = normalizeRegions(regions);
  if (!normalized.length) return events;
  return events.filter((event) => {
    if (event.region && normalized.includes(event.region)) {
      return true;
    }
    const source = `${event.venue ?? ""} ${event.location ?? ""} ${event.address ?? ""}`.toLowerCase();
    return normalized.some((region) => {
      const option = REGION_INDEX.get(region);
      const tokens = option ? option.matches : [region];
      return tokens.some((token) => source.includes(token.toLowerCase()));
    });
  });
};
