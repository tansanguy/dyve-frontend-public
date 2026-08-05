# DYVE Design System

- 기준 파일: `붙여넣은 마크다운(1)(4).md`
- 반영 기준: 제공된 DYVE Typeface / Colors / 예매 카드 시안 이미지
- 목적: DYVE 웹 서비스의 타이포그래피, 색상, 레이아웃, 컴포넌트 규칙을 실제 구현 가능한 디자인 토큰 문서로 정리

## Overview

DYVE는 소형 공연을 발견하고, 예약하고, 현장에서 입장까지 이어지는 공연 매칭·운영 서비스다. 디자인의 핵심은 **굵은 타이포그래피**, **강한 레드 CTA**, **부드러운 카드형 표면**, **공연 정보의 빠른 인지**다. Airbnb처럼 사진 중심의 여백형 마켓플레이스 구조를 참고하되, DYVE는 공연 정보와 예매 행동이 더 즉각적으로 읽혀야 하므로 타이포그래피의 힘을 더 강하게 둔다.

기본 화면은 밝은 캔버스 위에 연한 회색 카드가 올라가는 구조다. 카드 안에서는 검정에 가까운 잉크 컬러가 정보 위계를 만들고, DYVE 레드는 예매하기, 삭제/오류, 주요 강조 상태처럼 사용자의 행동이 필요한 순간에만 강하게 등장한다.

DYVE의 시각 언어는 “공연 포스터처럼 크고 단단한 제목”과 “티켓 예매 UI처럼 명확한 행동 버튼” 사이에 있다. 서비스가 다루는 콘텐츠는 음악, 공연, 베뉴, 아티스트이지만 UI 자체는 과하게 장식적이면 안 된다. 따라서 본 시스템은 고대비, 큰 제목, 둥근 카드, 제한된 컬러 팔레트로 구성한다.

**Key Characteristics:**

- Primary CTA와 위험/삭제 상태는 `{colors.primary}` #FF4A4A 계열 레드로 통일한다.
- 화면 배경은 `{colors.canvas}` #FFFFFF, 주요 카드 표면은 `{colors.surface-soft}` #F3F3F3를 사용한다.
- 본문 잉크는 `{colors.ink}` #232323를 사용한다. 순수 검정 #000000은 로고, 특수 그래픽, 포스터 이미지 내부를 제외하고 지양한다.
- 한국어 UI의 기본 폰트는 `Pretendard`를 사용한다.
- 강한 제목과 브랜드성 있는 헤드라인에는 `LINE Seed Sans KR` Bold를 우선 사용한다.
- 일본어/영문 혼합 텍스트는 자간을 무리하게 줄이지 않고, 필요한 경우 영문을 병기해 가독성을 보완한다.
- 버튼, 카드, 배지, 아티스트 아바타는 모두 둥근 형태를 기본으로 한다.
- 공연 카드의 CTA는 화면 하단에서 한 번에 인지될 수 있도록 넓고 높게 설계한다.

## Colors

### Brand & Accent

- **DYVE Red** (`{colors.primary}` — #FF4A4A): 핵심 브랜드 컬러. 예매하기 CTA, 오류 아이콘, 삭제 버튼, 주요 강조 상태에 사용한다. 사용량을 제한해 한 화면에서 가장 중요한 행동이 레드로 보이게 한다.
- **DYVE Red Strong** (`{colors.primary-strong}` — #FF003D): 대형 CTA나 모바일 하단 고정 버튼처럼 시각적 힘이 더 필요한 상황에서 사용한다. 예매 카드 시안의 버튼은 이 계열에 가깝다.
- **DYVE Red Active** (`{colors.primary-active}` — #E63737): 버튼 press / active 상태. hover보다 클릭 피드백에 가깝게 사용한다.
- **DYVE Red Soft** (`{colors.primary-soft}` — #FFF3F3): 레드 계열의 연한 배경. 경고 카드, 선택된 태그의 부드러운 배경, 알림 박스에 사용한다.
- **Dust Pink** (`{colors.accent-pink}` — #CEAFBF): 아티스트 아바타, 보조 배지, 큐레이션 카드의 부드러운 포인트 컬러. 메인 CTA에는 사용하지 않는다.
- **Muted Blue Green** (`{colors.accent-bluegreen}` — #82B7C1): 라인업 아바타, 보조 카테고리, 공연 무드 태그에 사용할 수 있는 차분한 보조 컬러. 제공 시안의 원형 라인업 컬러를 기준으로 한다.

### Surface

- **Canvas** (`{colors.canvas}` — #FFFFFF): 기본 페이지 배경. 모든 주요 화면의 바닥색이다.
- **Surface Soft** (`{colors.surface-soft}` — #F3F3F3): 대형 카드와 섹션 박스의 기본 배경. 예매 상세 카드, 타이포그래피 가이드 박스, 컬러 가이드 박스에 사용한다.
- **Surface Muted** (`{colors.surface-muted}` — #EFEFEF): 카드보다 한 단계 더 분리되어야 하는 입력창, 비활성 표면, 내부 구획에 사용한다.
- **Surface White** (`{colors.surface-white}` — #FFFFFF): 카드 안의 입력 필드, 모달 내부, 흰색 배지에 사용한다.

### Hairlines & Borders

- **Hairline** (`{colors.hairline}` — #D8D8D8): 기본 1px 구분선. 카드 내부 정보 구분, 입력창 outline, 섹션 divider에 사용한다.
- **Hairline Strong** (`{colors.hairline-strong}` — #AFAFAF): 중요 구분선이나 비활성 원형 아바타의 stroke에 사용한다.
- **Ink Border** (`{colors.border-ink}` — #232323): pill badge, outline button, 포커스 상태의 강한 border에 사용한다.

### Text

- **Ink** (`{colors.ink}` — #232323): 기본 텍스트 컬러. 제목, 본문, 버튼 외곽선, 주요 메타 정보에 사용한다.
- **Body** (`{colors.body}` — #333333): 긴 설명 문장, 주소, 안내 문구에 사용한다.
- **Muted** (`{colors.muted}` — #686868): 부가 정보, 보조 설명, 플레이스홀더에 사용한다.
- **Muted Soft** (`{colors.muted-soft}` — #9A9A9A): disabled 텍스트, 보조 캡션에 사용한다.
- **On Primary** (`{colors.on-primary}` — #FFFFFF): 레드 CTA 위의 텍스트.
- **On Dark** (`{colors.on-dark}` — #FFFFFF): 어두운 포스터나 검정 표면 위의 텍스트.

### Semantic

- **Error** (`{colors.error}` — #FF4A4A): 삭제, 실패, 입력 오류, unavailable 상태.
- **Warning Soft** (`{colors.warning-soft}` — #FFF3F3): 오류 텍스트를 담는 연한 배경.
- **Success** (`{colors.success}` — #2E8B57): 입장 완료, 정산 완료 등 성공 상태. 단, 브랜드 화면에서는 과도한 초록 사용을 지양한다.
- **Info** (`{colors.info}` — #82B7C1): 안내성 상태, 라인업/큐레이션 보조 포인트.

### Color Usage Rules

DYVE Red는 “누를 수 있는 핵심 행동”에 가장 먼저 배정한다. 같은 화면에서 예매하기 버튼과 단순 장식 요소가 모두 레드라면 버튼의 힘이 약해진다. 따라서 레드는 CTA, 오류, 매우 중요한 선택 상태에만 사용한다.

Dust Pink와 Blue Green은 아티스트 라인업, 큐레이션 썸네일, 태그 배경처럼 감성적 구분이 필요한 영역에만 사용한다. 기능 버튼에는 쓰지 않는다.

카드 배경은 #F3F3F3를 기본으로 하고, 그 위의 텍스트는 #232323로 충분한 대비를 확보한다. 연한 핑크 배경 위에는 본문을 길게 올리지 않는다.

## Typography

### Font Family

DYVE의 한글 UI 기본 폰트는 **Pretendard**다. Pretendard는 본문, 메타 정보, 버튼, 태그, 입력 필드에 사용한다. 화면 전체의 가독성과 구현 안정성을 담당한다.

브랜드성이 필요한 대형 제목은 **LINE Seed Sans KR Bold**를 사용한다. 공연 상세의 대표 제목, 랜딩 히어로, 큐레이션 타이틀, 강한 섹션 헤더에 사용한다. 시안에서도 `Yurayura Teikoku 음악 감상회`와 같은 큰 제목은 매우 굵고 단단한 산세리프 톤으로 처리되어 있다.

일본어 텍스트는 별도 일본어 폰트를 강제하기보다 Pretendard / system fallback에서 먼저 처리한다. 다만 일본어 단독 제목은 한글·영문 대비 가독성이 떨어질 수 있으므로 영문 병기나 국문 설명을 함께 제공한다.

권장 CSS font stack:

```css
--font-brand: "LINE Seed Sans KR", "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-sans: "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
```

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Font | Use |
|---|---:|---:|---:|---:|---|---|
| `{typography.hero-display}` | 52px | 800 | 1.08 | -1.2px | LINE Seed Sans KR | 랜딩 히어로, 브랜드 캠페인 문구 |
| `{typography.event-title-xl}` | 44px | 800 | 1.10 | -0.8px | LINE Seed Sans KR | 공연 상세 최상단 제목 |
| `{typography.event-title-lg}` | 36px | 800 | 1.12 | -0.6px | LINE Seed Sans KR | 모바일 공연 상세 제목 |
| `{typography.section-title}` | 24px | 700 | 1.25 | -0.2px | Pretendard | 섹션 제목, 라인업 제목 |
| `{typography.card-title}` | 22px | 700 | 1.25 | -0.2px | Pretendard | 카드 제목, 공연 리스트 제목 |
| `{typography.body-lg}` | 20px | 500 | 1.45 | 0 | Pretendard | 공연 날짜/시간/장소 핵심 정보 |
| `{typography.body-md}` | 16px | 400 | 1.50 | 0 | Pretendard | 기본 본문, 설명 문장 |
| `{typography.body-sm}` | 14px | 400 | 1.45 | 0 | Pretendard | 주소, 부가 설명, 카드 메타 |
| `{typography.caption}` | 13px | 500 | 1.35 | 0 | Pretendard | 태그, 입력 라벨, 짧은 안내 |
| `{typography.micro}` | 11px | 500 | 1.30 | 0 | Pretendard | 아주 작은 보조 문구 |
| `{typography.button-lg}` | 22px | 700 | 1.20 | -0.2px | Pretendard | 대형 예매 CTA |
| `{typography.button-md}` | 16px | 700 | 1.25 | 0 | Pretendard | 일반 버튼 |
| `{typography.badge}` | 13px | 500 | 1.20 | 0 | Pretendard | 지정좌석, 음악회, 실시간 인기 같은 pill 태그 |

### Korean Typesetting Rules

한글 제목은 자간을 과도하게 줄이지 않는다. 시안의 가이드처럼 국문 자간은 0 또는 약간의 음수까지만 허용한다. -25px, -50px 수준의 극단적 자간은 빠르게 읽히지 않고 전달력이 떨어지므로 금지한다.

영문 제목은 한글보다 넓게 느껴질 수 있으므로 동일 행에서 강한 위계를 만들 때는 800 weight와 약한 음수 letter-spacing을 사용한다. 영문이 너무 길면 단순히 자간을 줄이지 말고 줄바꿈을 허용한다.

일본어 텍스트는 단독으로 크게 쓰면 일부 글자가 뭉쳐 보일 수 있다. 일본어 제목을 사용하는 경우에는 아래처럼 국문 또는 영문 병기를 붙인다.

```text
菊池ひみこ
kikuchi himiko
```

공연 제목은 줄바꿈을 적극적으로 허용한다. DYVE의 공연 상세 카드에서는 제목이 포스터 역할을 하므로 한 줄에 억지로 넣지 않는다.

설명형 한국어 UI 카피는 다음 규율을 따른다.

- 한 문장에 하나의 주장만 둔다.
- 서로 다른 문장은 각각 독립된 `<p>` 또는 block으로 분리한다.
- 한 문장이 길면 조사나 명사구를 자르지 않고, 필요한 쉼표를 포함한 의미 단위로 줄을 나눈다.
- 서비스명, 금액과 단위, 날짜, 사람 이름은 중간에서 나누지 않는다.
- 문자열에 빈 줄을 넣거나 `whitespace-pre-line`에 의존하지 않는다.
- 설명문에는 `break-keep`, 고정 줄에는 `<span className="block">` 같은 block 요소를 사용한다.
- 버튼, 라벨, 토스트, 오류 메시지, 동적 사용자 콘텐츠에는 강제 줄바꿈을 적용하지 않는다.
- 320px, 390px, 430px 화면에서 가로 오버플로와 한 글자짜리 고립 줄이 없는지 확인한다.

예시:

```text
신청서를 한 명씩 읽고,
보고 싶은 아티스트와 관람 스타일,
원하는 동행 방식을 함께 살펴,
잘 맞는 두 사람을 연결합니다.
```

### Typography Principles

대형 제목은 정보 전달보다 “공연의 인상”을 먼저 만든다. 따라서 공연 상세의 제목은 3줄까지 허용하고, 제목 아래에 태그와 날짜 정보를 배치해 실제 예매 판단을 돕는다.

본문은 빠르게 읽혀야 한다. 공연 날짜, 시간, 러닝타임, 장소 같은 정보는 20px 안팎의 굵지 않은 텍스트로 정렬한다. 지나치게 굵게 만들면 제목과 충돌한다.

태그는 작고 명확해야 한다. `지정좌석`, `음악회`, `실시간 인기` 같은 태그는 13px / 500 정도로 충분하며, 검정 outline을 사용해 정보성을 유지한다.

## Layout

### Spacing System

- **Base unit:** 4px
- **Tokens:** `{spacing.xxs}` 2px · `{spacing.xs}` 4px · `{spacing.sm}` 8px · `{spacing.md}` 12px · `{spacing.base}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 64px
- **Card padding:** 모바일 공연 상세 카드는 32px 이상을 권장한다. 시안처럼 큰 제목을 쓰는 경우 내부 여백이 좁으면 화면이 답답해진다.
- **Button margin:** 주요 CTA는 정보 블록과 최소 32px 이상 떨어뜨린다.
- **Lineup gap:** 라인업 아바타는 12–16px 간격을 유지한다.

### Grid & Container

- **Mobile content width:** 100% - 32px, 좌우 16px margin.
- **Event detail card width:** 모바일 기준 360–430px 범위에서 안정적으로 보여야 한다.
- **Desktop max width:** 1120–1280px. 공연 리스트와 매칭 화면은 카드 밀도를 위해 1280px까지 허용한다.
- **Event card layout:** 제목 → 태그 → 기본 정보 → 라인업 → CTA 순서를 기본으로 한다.
- **CTA position:** 모바일에서는 카드 하단 full-width 버튼을 기본으로 하고, 결제/예매 단계에서는 sticky bottom CTA를 사용할 수 있다.

### Whitespace Philosophy

DYVE는 너무 넓고 비어 있는 SaaS형 여백보다, 공연 포스터와 티켓 UI 사이의 밀도를 가져야 한다. 제목과 CTA는 크게 두되, 날짜·시간·장소 정보는 질서 있게 쌓는다.

포스터 이미지 위에 텍스트를 많이 얹지 않는다. 이미지의 명도와 색상에 따라 글자가 안 보일 가능성이 크므로, 제목과 주요 정보는 되도록 별도 카드 영역에 배치한다. 포스터는 감성, 카드 텍스트는 정보 전달을 담당한다.

## Shape & Radius

- **Card Large** (`{rounded.card-lg}` — 16px): 공연 상세 카드, 섹션 카드.
- **Card Medium** (`{rounded.card-md}` — 12px): 리스트 카드, 입력 그룹.
- **Button Large** (`{rounded.button-lg}` — 14px): 대형 예매 CTA.
- **Button Medium** (`{rounded.button-md}` — 8px): 일반 버튼.
- **Pill** (`{rounded.pill}` — 9999px): 태그, 상태 배지, 아티스트 아바타.
- **Circle** (`{rounded.circle}` — 50%): 라인업 아바타, 아이콘 버튼.

DYVE의 기본 형태는 부드럽지만 지나치게 귀엽지 않아야 한다. 큰 카드는 16px 안팎의 라운드를 사용하고, CTA는 14px 정도로 충분히 둥글게 처리한다. 작은 태그는 완전한 pill보다 4–6px radius의 outline button처럼 처리해도 된다.

## Elevation

DYVE는 깊은 그림자를 많이 쓰지 않는다. 카드와 배경은 색상 차이와 여백으로 분리한다.

- **Flat:** 기본 화면, 배경, 섹션 구획.
- **Soft Card:** `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);` 공연 상세 카드, 모달 카드.
- **Interactive Card Hover:** `box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08); transform: translateY(-2px);` 데스크톱 hover 카드에만 사용.
- **Modal Scrim:** `rgba(0, 0, 0, 0.48)` 모달, 이미지 프리뷰, 결제 확인 단계.

카드 표면 자체가 #F3F3F3이므로 그림자를 강하게 주면 탁해 보일 수 있다. 기본 상태는 거의 flat하게 유지하고, 상호작용 순간에만 약한 elevation을 준다.

## Components

### Event Detail Card

**`event-detail-card`** — DYVE 공연 상세의 핵심 컴포넌트. `surface-soft` 배경, 16px radius, 32–40px padding을 사용한다. 제목이 가장 먼저 읽히고, 태그와 기본 정보가 그 아래에 쌓인다.

권장 구조:

1. 공연명 / 이벤트 제목
2. 보조 제목 또는 원어 제목
3. 태그 pill 그룹
4. 날짜, 시간, 러닝타임, 입장 시작, 장소
5. 라인업
6. 예매 CTA

### Event Title Block

**`event-title-block`** — 공연의 성격을 만드는 대형 제목 영역. 36–44px, 800 weight, line-height 1.10 안팎을 사용한다. 모바일에서는 3줄까지 자연스럽게 허용한다.

예시:

```text
Yurayura
Teikoku
음악 감상회
```

### Tag Pills

**`tag-pill-outline`** — 흰색 또는 투명 배경, 1px ink border, 4–6px radius, 13px / 500 텍스트. `지정좌석`, `음악회`, `실시간 인기`처럼 성격을 빠르게 알려주는 태그에 사용한다.

**`tag-pill-soft`** — 연한 핑크 또는 연한 회색 배경, border 없음, 13px / 500. 큐레이션, 이벤트 추천, DYVE PICK 같은 부드러운 강조에 사용한다.

### Buttons

**`button-primary-lg`** — DYVE Red 또는 DYVE Red Strong 배경, white text, 14px radius, height 72–80px, full-width. 공연 상세의 `예매하기` 버튼에 사용한다. 텍스트는 22px / 700을 권장한다.

**`button-primary-md`** — height 48–56px, 8–12px radius, 16px / 700. 등록, 저장, 다음 단계 버튼에 사용한다.

**`button-secondary-outline`** — white 또는 transparent fill, 1px ink border, ink text. 태그형 버튼, 취소, 뒤로가기, 보조 행동에 사용한다.

**`button-danger-icon`** — Red fill 또는 red icon. 삭제, 제거, 불가 상태를 표현한다. 단순 닫기 아이콘에 남용하지 않는다.

### Lineup Avatar

**`lineup-avatar`** — 72×72px 원형 아바타. 이미지가 없을 경우 Dust Pink, Blue Green, Gray 계열 placeholder를 사용한다. 이름은 아래에 13–14px로 표기한다.

- Placeholder 1: `{colors.accent-pink}` #CEAFBF
- Placeholder 2: `{colors.accent-bluegreen}` #82B7C1
- Placeholder 3: `{colors.hairline-strong}` #AFAFAF

라인업이 많을 경우 가로 스크롤을 허용한다. 아바타 크기를 과도하게 줄여 모든 인원을 한 화면에 넣지 않는다.

### Venue / Event Metadata

**`event-meta-list`** — 날짜, 시간, 러닝타임, 입장 시작, 장소를 수직으로 나열한다. 각 행은 20px / 500 정도의 텍스트를 사용하고, 주소처럼 긴 부가 정보는 14px / 400으로 한 단계 낮춘다.

예시:

```text
날짜: 2026.03.22.
시간: 20:30
러닝타임: 120분
입장 시작: 상시 가능
장소: Cafe Teikoku
서울특별시 중구 필동로1길 30 (필동 3가) 201
```

### Typography Spec Card

**`type-spec-card`** — 디자인 가이드나 관리자용 문서에서 사용하는 컴포넌트. `surface-soft` 배경, 12–16px radius, 내부에는 좋은 예와 나쁜 예를 나란히 보여준다.

- Good: 적절한 자간, 읽기 쉬운 줄바꿈, 영문 병기
- Bad: 과도한 음수 자간, 작은 크기의 일본어 단독 표기, 레드 강조 남용

### Color Spec Card

**`color-spec-card`** — 색상 토큰을 보여주는 문서용 컴포넌트. 컬러 스와치 32×32px, radius 4–6px, 옆에 RGB와 HEX 값을 병기한다.

## Forms

### Text Input

**`text-input`** — white fill, 1px hairline border, 8px radius, 52–56px height. Focus 상태에서는 border를 #232323로 강화한다. Glow나 과한 blue focus ring은 사용하지 않는다.

### Select / Dropdown

**`select-field`** — 입력창과 동일한 표면을 사용한다. 우측 chevron icon은 muted 색상으로 둔다. 모바일에서는 bottom sheet로 확장할 수 있다.

### Validation

오류는 `error` 컬러로 표시하되, 모든 오류 영역을 빨갛게 칠하지 않는다. 필드 border, 짧은 helper text, 오류 아이콘 정도로 제한한다.

## Navigation

### Top Bar

**`top-bar`** — white background, 56–64px height, bottom hairline. 로고, 주요 메뉴, 로그인/프로필 영역을 포함한다. DYVE Red는 로고 또는 active 상태에서 제한적으로 사용한다.

### Mobile Navigation

모바일에서는 하단 탭을 우선 고려한다. 핵심 탭은 홈, 탐색, 등록/매칭, 티켓, 마이 정도로 구성할 수 있다. 공연 예매 플로우에서는 하단 네비게이션보다 CTA가 우선이다.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---:|---|
| Mobile | < 744px | 공연 상세 카드는 1열. 제목 36–44px. CTA는 full-width 하단 배치. 라인업은 가로 스크롤 허용. |
| Tablet | 744–1128px | 공연 상세와 예매 요약을 2열로 나눌 수 있음. 카드 padding 40px 이상. |
| Desktop | 1128–1440px | 리스트/매칭 화면은 3–4열 카드 그리드. 상세 화면은 본문 + 우측 예매 패널 구조. |
| Wide | > 1440px | 콘텐츠 최대 폭을 제한하고 좌우 여백으로 흡수. 카드 자체를 무한히 넓히지 않음. |

### Touch Targets

- 대형 예매 CTA: 최소 height 64px 이상.
- 일반 버튼: 최소 44×44px.
- 태그 pill: 클릭 가능하다면 최소 height 32px.
- 라인업 아바타: 클릭 가능하다면 최소 56×56px.
- 닫기/삭제 아이콘: 최소 32×32px, 주변 padding 포함 44×44px 확보.

## Accessibility

텍스트와 배경 대비를 우선한다. 특히 포스터 이미지 위에 텍스트를 직접 올릴 때는 가독성 문제가 생기기 쉽다. 핵심 정보는 별도 카드나 고정 영역에 배치하고, 이미지 위 텍스트는 최소화한다.

레드만으로 상태를 전달하지 않는다. 오류 상태에는 아이콘, 문구, 위치 변화를 함께 제공한다.

일본어/영문/국문이 섞이는 공연 제목은 스크린리더와 검색을 고려해 가능한 경우 원문과 영문 병기를 모두 데이터로 보관한다.

## CSS Tokens

```css
:root {
  /* Color */
  --color-primary: #FF4A4A;
  --color-primary-strong: #FF003D;
  --color-primary-active: #E63737;
  --color-primary-soft: #FFF3F3;

  --color-canvas: #FFFFFF;
  --color-surface-soft: #F3F3F3;
  --color-surface-muted: #EFEFEF;
  --color-surface-white: #FFFFFF;

  --color-ink: #232323;
  --color-body: #333333;
  --color-muted: #686868;
  --color-muted-soft: #9A9A9A;
  --color-on-primary: #FFFFFF;

  --color-hairline: #D8D8D8;
  --color-hairline-strong: #AFAFAF;
  --color-accent-pink: #CEAFBF;
  --color-accent-bluegreen: #82B7C1;

  /* Font */
  --font-brand: "LINE Seed Sans KR", "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-sans: "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;

  /* Radius */
  --radius-card-lg: 16px;
  --radius-card-md: 12px;
  --radius-button-lg: 14px;
  --radius-button-md: 8px;
  --radius-pill: 9999px;

  /* Spacing */
  --space-xxs: 2px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-base: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-xxl: 48px;
  --space-section: 64px;

  /* Shadow */
  --shadow-card-soft: 0 8px 24px rgba(0, 0, 0, 0.04);
  --shadow-card-hover: 0 12px 32px rgba(0, 0, 0, 0.08);
}
```

## Implementation Notes

LINE Seed Sans KR는 라이선스와 실제 웹폰트 로딩 방식을 확인한 뒤 적용한다. 웹폰트 로딩이 어렵거나 성능 문제가 있으면 Pretendard만으로도 서비스 UI는 충분히 구현 가능하다. 단, 브랜드 히어로나 상세 제목에서는 LINE Seed 계열의 두껍고 단단한 인상이 DYVE의 톤을 더 잘 만든다.

화이트/다크 모드 토글을 별도로 두기보다 시스템 설정을 따르는 방향이 적합하다. 현재 시안의 핵심은 밝은 카드 기반이므로 먼저 라이트 모드 완성도를 높이고, 다크 모드는 포스터 이미지와 카드 대비가 무너지지 않게 별도 토큰으로 설계한다.

Featured, 실시간 인기, 오류 아이콘처럼 이미지나 카드 위에 올라가는 요소는 밝은 배경에서도 읽히는지 반드시 확인한다. 흰색 텍스트가 밝은 포스터 위에 올라가거나, 검정 텍스트가 어두운 포스터 위에 올라가는 문제를 피해야 한다.

## Known Gaps

- 실제 서비스 로고/워드마크 규칙은 별도 문서가 필요하다.
- 포스터 이미지 위 텍스트 처리 규칙은 이미지 밝기 분석 또는 scrim 토큰까지 포함해 추가 정의가 필요하다.
- 다크 모드 토큰은 본 문서에 최소 원칙만 포함되어 있으며, 실제 화면 기준 별도 검수가 필요하다.
- 일본어 폰트 fallback은 운영체제별 렌더링 차이가 크므로 실제 브라우저 테스트가 필요하다.
