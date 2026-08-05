# DYVE Frontend

DYVE의 React + TypeScript + Vite 프론트엔드입니다.

## 시작하기

Node.js 22 이상이 필요합니다.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

개발 서버는 기본적으로 `/api`, `/media`, `/uploads` 요청을 `http://127.0.0.1:8000`으로 프록시합니다. 다른 백엔드를 사용할 때만 `.env.local`의 `VITE_API_BASE_URL`을 변경하세요.

## 검증

```bash
npm run verify
```

이 명령은 타입 검사, ESLint, 프로덕션 빌드와 번들 크기 검사를 실행합니다.

## 환경변수

| 이름 | 용도 |
| --- | --- |
| `VITE_API_BASE_URL` | API 서버 주소. 로컬 프록시 사용 시 비워도 됩니다. |
| `VITE_API_ONLY` | API 전용 동작 활성화 (`1`) |
| `VITE_REAL_SOCIAL_LOGIN` | 실제 소셜 로그인 활성화 (`1`) |
| `VITE_API_DEBUG` | 개발 API 로그 활성화 (`1`) |
| `VITE_API_HEALTH_CHECK` | 개발 환경 API 상태 확인 활성화 (`1`) |
| `VITE_SHOW_ONBOARDING_BANNER` | 홈 온보딩 배너 표시 (`0`이면 숨김) |

실환경 값과 토큰은 커밋하지 마세요. Vite의 `VITE_*` 값은 브라우저 번들에 포함됩니다.

## 라이선스

DYVE 코드와 브랜드 자산은 별도 서면 허가 없이 재사용할 수 없습니다. 서드파티 고지는 [Attributions.md](./Attributions.md)를 확인하세요.
