import { type ReactNode } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/figma/dyve/Header";
import { DyveIcon, type DyveIconName } from "../components/figma/dyve/DyveIcon";
import { ScrollReveal } from "../components/figma/dyve/ScrollReveal";
import { ONBOARDING_SEEN_STORAGE_KEY } from "../constants/onboarding";
import { OnboardingFlow } from "../features/onboarding/OnboardingFlow";

type PersonaId = "audience" | "artist" | "venue";

type OnboardingAction = {
  label: string;
  path: string;
  requiresLogin?: boolean;
};

type MemberType = {
  id: PersonaId;
  index: string;
  title: string;
  english: string;
  headline: string;
  description: string;
  icon: DyveIconName;
  tone: "red" | "mint" | "white";
};

type PersonaGuide = {
  id: PersonaId;
  title: string;
  label: string;
  subtitle: string;
  icon: DyveIconName;
  tone: MemberType["tone"];
  finalAction: OnboardingAction;
  steps: Array<{
    index: string;
    title: string;
    description: string;
    detail: string;
  }>;
};

const memberTypes: MemberType[] = [
  {
    id: "audience",
    index: "01",
    title: "관객",
    english: "Audience",
    headline: "공연을 보러 왔다면",
    description: "흩어져 있던 작은 공연을 한곳에서 보고, 예매부터 입장 안내까지 이어서 확인할 수 있어요.",
    icon: "ticket-checked",
    tone: "red",
  },
  {
    id: "artist",
    index: "02",
    title: "아티스트",
    english: "Artist",
    headline: "무대를 찾고 있다면",
    description: "장르, 셋타임, 출연 조건을 정리하고 어울리는 베뉴와 행사 기회를 확인할 수 있어요.",
    icon: "mic-2-live",
    tone: "white",
  },
  {
    id: "venue",
    index: "03",
    title: "베뉴",
    english: "Venue",
    headline: "공간을 열고 싶다면",
    description: "공간 정보와 공간 조건을 등록하고, 어울리는 아티스트를 찾거나 공연 제안을 받을 수 있어요.",
    icon: "building-2",
    tone: "mint",
  },
];

const personaGuides: PersonaGuide[] = [
  {
    id: "audience",
    title: "공연을 보러 왔다면",
    label: "관객",
    subtitle: "가까운 공연을 발견하고, 예매하고, 입장 안내까지 자연스럽게 이어져요.",
    icon: "ticket-checked",
    tone: "red",
    finalAction: { label: "관객으로 시작하기", path: "/ticket" },
    steps: [
      {
        index: "01",
        title: "가까운 곳에서 열리는 작은 공연",
        description: "DYVE에서는 카페, 바, 복합문화공간, 소형 공연장에서 열리는 공연을 한곳에서 볼 수 있어요.",
        detail: "멀리 가지 않아도, 오늘의 취향에 맞는 공연을 발견할 수 있어요.",
      },
      {
        index: "02",
        title: "예매부터 입장까지 더 편하게",
        description: "공연마다 다른 예매 방식, 입장 안내, 현장 대기 정보를 DYVE 안에서 확인할 수 있어요.",
        detail: "좌석, 입장번호, 자유입장까지 공연 방식에 맞춰 안내돼요.",
      },
      {
        index: "03",
        title: "작은 공연을 더 자주 만나는 방법",
        description: "관심 있는 공연을 저장하고, 좋아하는 아티스트와 공간을 따라가보세요.",
        detail: "DYVE가 일상 가까이에 있는 새로운 공연을 보여줄게요.",
      },
    ],
  },
  {
    id: "artist",
    title: "무대를 찾고 있다면",
    label: "아티스트",
    subtitle: "내 공연 조건을 정리하고, 어울리는 무대와 제안을 만날 수 있어요.",
    icon: "mic-2-live",
    tone: "white",
    finalAction: { label: "아티스트로 시작하기", path: "/register/artist", requiresLogin: true },
    steps: [
      {
        index: "01",
        title: "내 공연 조건을 한곳에 정리",
        description: "장르, 셋타임, 장비, 출연료, 가능 지역처럼 공연에 필요한 정보를 프로필에 정리해요.",
        detail: "말로 매번 설명하지 않아도, 당신의 무대를 보여줄 수 있어요.",
      },
      {
        index: "02",
        title: "나와 맞는 무대와 제안을 만나기",
        description: "DYVE에서는 공연을 열고 싶은 베뉴와 행사 기회를 확인할 수 있어요.",
        detail: "카페, 바, 갤러리, 브랜드 행사까지 더 많은 무대와 연결될 수 있어요.",
      },
      {
        index: "03",
        title: "공연 준비는 줄이고, 무대에 집중",
        description: "공연이 정해진 뒤에는 공연 준비, 입장 안내, 필요한 도움을 공연별로 정리할 수 있어요.",
        detail: "포스터, 촬영, 스태프 같은 도움이 필요할 때도 요청할 수 있어요.",
      },
    ],
  },
  {
    id: "venue",
    title: "공간을 열고 싶다면",
    label: "베뉴",
    subtitle: "공간의 분위기와 조건에 맞는 작은 공연을 시작할 수 있어요.",
    icon: "building-2",
    tone: "mint",
    finalAction: { label: "베뉴로 시작하기", path: "/register/venue", requiresLogin: true },
    steps: [
      {
        index: "01",
        title: "우리 공간도 공연장이 될 수 있어요",
        description: "카페, 바, 라운지, 복합문화공간처럼 일상의 공간에서도 작은 공연은 열릴 수 있어요.",
        detail: "DYVE는 공간의 분위기와 조건에 맞는 공연을 시작할 수 있도록 도와요.",
      },
      {
        index: "02",
        title: "공간에 맞는 아티스트를 찾기",
        description: "수용 인원, 이용 시간, 장르, 장비, 소음 조건을 바탕으로 어울리는 아티스트와 연결돼요.",
        detail: "직접 찾기 어려웠던 공연 파트너를 더 쉽게 만날 수 있어요.",
      },
      {
        index: "03",
        title: "처음 여는 공연도 부담을 줄여서",
        description: "공연 제안 이후에는 티켓 방식, 입장 안내, 필요한 준비를 공연에 맞게 정리할 수 있어요.",
        detail: "촬영, 포스터, 스태프, 현장 준비도 필요한 만큼 도움을 요청할 수 있어요.",
      },
    ],
  },
];

const getPersonaGuide = (id: string | undefined) => personaGuides.find((guide) => guide.id === id);

function storeOnboardingSeen() {
  try {
    window.localStorage.setItem(ONBOARDING_SEEN_STORAGE_KEY, "1");
  } catch {
    // Storage can be blocked in private contexts; navigation should still work.
  }
}

function PersonaMotion({ guide }: { guide: PersonaGuide }) {
  const triangleLinks = [
    { id: "audience-artist", members: ["audience", "artist"] as const, d: "M92 184 C108 112 140 48 180 42" },
    { id: "artist-venue", members: ["artist", "venue"] as const, d: "M180 42 C220 48 252 112 268 184" },
    { id: "venue-audience", members: ["venue", "audience"] as const, d: "M268 184 C224 214 136 214 92 184" },
  ];
  const centerSignals: Record<PersonaId, string> = {
    audience: "M92 184 C122 154 150 134 180 126",
    artist: "M180 42 C180 72 180 100 180 126",
    venue: "M268 184 C238 154 210 134 180 126",
  };
  const centerRipples: Record<PersonaId, string> = {
    audience: "M180 126 C150 146 122 164 92 184",
    artist: "M180 126 C180 100 180 72 180 42",
    venue: "M180 126 C210 146 238 164 268 184",
  };
  const rippleTargets = memberTypes.filter((type) => type.id !== guide.id);

  return (
    <div className={`dyve-persona-network dyve-persona-network--${guide.id}`} aria-hidden="true">
      <svg className="dyve-persona-network-links" viewBox="0 0 360 240" preserveAspectRatio="none">
        {triangleLinks.map((link) => (
          <path
            key={link.id}
            className={`dyve-persona-network-triangle ${
              (link.members as readonly PersonaId[]).includes(guide.id) ? "dyve-persona-network-triangle--active" : ""
            }`}
            d={link.d}
            pathLength={1}
          />
        ))}
        <path className="dyve-persona-network-plunge" d={centerSignals[guide.id]} pathLength={1} />
        {rippleTargets.map((type, index) => (
          <path
            key={type.id}
            className={`dyve-persona-network-ripple-path dyve-persona-network-ripple-path--${index + 1}`}
            d={centerRipples[type.id]}
            pathLength={1}
          />
        ))}
      </svg>

      <div className="dyve-persona-network-drop">
        <span className="dyve-persona-network-drop-ripple dyve-persona-network-drop-ripple--one" />
        <span className="dyve-persona-network-drop-ripple dyve-persona-network-drop-ripple--two" />
        <span className="dyve-persona-network-drop-dot" />
      </div>

      {memberTypes.map((type) => {
        const isActive = type.id === guide.id;
        return (
          <div
            key={type.id}
            className={`dyve-persona-network-node dyve-persona-network-node--${type.id} ${
              isActive ? "dyve-persona-network-node--active" : ""
            }`}
          >
            <span className="dyve-persona-network-halo" />
            <span className="dyve-persona-network-icon">
              <DyveIcon name={type.icon} size="lg" tone={isActive ? "inverse" : "muted"} />
            </span>
            <span className="dyve-persona-network-label">{type.title}</span>
          </div>
        );
      })}
    </div>
  );
}

function OnboardingShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[var(--color-ink)] font-sans text-white">
      <Header
        onSearchClick={() => navigate("/search")}
        onNotificationClick={() => navigate("/notifications")}
        onChatClick={() => navigate("/chats")}
      />
      {children}
    </div>
  );
}

function PersonaOnboardingPage({ guide }: { guide: PersonaGuide }) {
  const navigate = useNavigate();

  const finishOnboarding = () => {
    storeOnboardingSeen();
    if (guide.finalAction.requiresLogin) {
      navigate("/my", { state: { redirectTo: guide.finalAction.path } });
      return;
    }
    navigate(guide.finalAction.path);
  };

  return (
    <OnboardingShell>
      <main className={`dyve-onboarding-page dyve-persona-page dyve-persona-page--${guide.id} min-h-0 flex-1 overflow-y-auto bg-[var(--color-ink)] text-white`}>
        <section className="relative overflow-hidden border-b border-white/12 px-4 pb-6 pt-3">
          <div className="dyve-onboarding-grid pointer-events-none absolute inset-0 opacity-50" />
          <div className="pointer-events-none absolute -right-16 top-10 h-44 w-44 bg-[var(--color-primary)] opacity-14 blur-[76px]" />
          <ScrollReveal variant="pop" className="relative z-10">
            <button
              type="button"
              onClick={() => navigate("/onboarding")}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/14 px-3 text-[12px] font-bold text-white/72 transition-colors hover:border-white/28 hover:text-white"
            >
              <DyveIcon name="chevron-left" size="sm" tone="inverse" />
              시작 방식 다시 선택
            </button>

            <PersonaMotion guide={guide} />

            <p className="mt-5 text-[11px] font-bold uppercase text-[var(--color-primary)]">시작 안내</p>
            <h1 className="dyve-brutal-display mt-2 break-keep text-[44px] leading-[1.02] text-white">
              {guide.title}
            </h1>
            <p className="mt-4 max-w-[24rem] break-keep text-[15px] font-bold leading-6 text-white/76">
              {guide.subtitle}
            </p>
          </ScrollReveal>
        </section>

        <section className="px-4 py-7">
          <div className="grid gap-4">
            {guide.steps.map((step, index) => (
              <ScrollReveal key={step.index} variant={index % 2 === 0 ? "slide-left" : "slide-right"} delayMs={index * 90}>
                <article className="dyve-persona-step-card">
                  <div className="dyve-persona-step-card-index">{step.index}</div>
                  <div className="min-w-0 p-4">
                    <h2 className="break-keep text-[22px] font-bold leading-tight text-white">{step.title}</h2>
                    <p className="mt-4 break-keep text-[14px] font-semibold leading-6 text-white/72">{step.description}</p>
                    <p className="mt-2 break-keep text-[13px] leading-6 text-white/54">{step.detail}</p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="px-4 pb-8 pt-1">
          <button type="button" onClick={finishOnboarding} className="dyve-persona-final-cta">
            {guide.finalAction.label}
            <DyveIcon name="chevron-right" size="sm" tone="inverse" />
          </button>
        </section>
      </main>
    </OnboardingShell>
  );
}

export function OnboardingPage() {
  const { personaId } = useParams();
  const selectedGuide = getPersonaGuide(personaId);

  if (personaId && !selectedGuide) {
    return <Navigate to="/onboarding" replace />;
  }

  if (selectedGuide) {
    return <PersonaOnboardingPage guide={selectedGuide} />;
  }

  return (
    <OnboardingShell>
      <main className="mobile-main-static min-h-0 flex-1 overflow-hidden">
        <OnboardingFlow />
      </main>
    </OnboardingShell>
  );
}
