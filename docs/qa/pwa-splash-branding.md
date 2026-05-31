# QA — pwa-splash-branding

- **대상 PR**: #62 (`feature/pwa-splash-branding`)
- **PRD/기능**: PWA 콜드 로드 시 로고만 뜨던 화면에 "FinSight" 워드마크를 더하는 인앱 스플래시 + iOS 시작화면(`apple-touch-startup-image`).
- **QA 일자**: 2026-05-31
- **판정**: **qa-passed** (로컬 AC 6/6 PASS, 실패 0건. 디바이스 전용 항목은 배포 후 실기기로 분리)

변경 파일: `components/pwa/SplashScreen.tsx`(신규) · `app/splash-ios/route.tsx`(신규) · `app/layout.tsx` · `app/components.css` · `middleware.ts`

---

## 1. 로컬 검증 환경

- `npm run typecheck` / `npm run lint` / `npm run build` (Turbopack)
- `npm start` (production) — 두 모드로 기동:
  - **게이트 OFF** (`APP_PASSWORD` 미설정) — 일반 동작 베이스라인
  - **게이트 ON** (`APP_PASSWORD=qa-test-pw APP_AUTH_SECRET=…`) — AC-5 보안 경계 실측
- 검증 후 두 서버 모두 종료.

---

## 2. AC 별 표 (로컬 실행)

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| **1. 빌드/타입/린트 0에러** | `npm run typecheck` · `npm run lint` · `npm run build` | typecheck 0 에러, lint 0 error, build 성공 | typecheck **0 에러**. lint **0 error / 1 warning** (`components/profile/StockDailyChart.tsx:238` 미사용 `i` — 본 PR 변경 파일 아님, `git diff main...HEAD` 미포함 확인 → 기존 무관). build **Compiled successfully**, `/splash-ios` 가 `ƒ`(dynamic) 라우트로 등록 | **PASS** |
| **2. `/splash-ios` 이미지** | `curl -s -o /tmp/s.png -w "%{http_code} %{content_type} %{size_download}" "…/splash-ios?w=1170&h=2532"` 외 변형 | 200 `image/png`, 1170×2532. 무파라미터·clamp 비정상값도 200 + 기본 해상도 | `w=1170&h=2532` → **200 image/png, PNG 1170×2532** (`file` 확인). 무파라미터 → **200, 1170×2532**(기본). `w=99999`(MAX 초과)·`w=abc`(NaN)·`w=-50`(음수)·`w=10`(MIN 미만) 모두 → **200 image/png, 1170×2532**(`clampDim` 폴백). 렌더 시각 확인: **흰 배경 + 중앙 3색 맥박 글리프(빨강/슬레이트/파랑) + 하단 다크 "FinSight"** | **PASS** |
| **3. head 주입 + SSR 마운트** | `curl /login` HTML 파싱 | `apple-touch-startup-image` link 11개 + 미디어쿼리 정상 + 인앱 `.splash-screen` SSR 마운트(`splash-wordmark>FinSight`) | link **11개** (예: `w=750&h=1334` ↔ `device-width:375px … pixel-ratio:2 … portrait` — pt×ratio 정합). `<div class="splash-screen" aria-hidden="true">` SSR 렌더 + `splash-wordmark">FinSight` + 내부 `<svg class="splash-icon">` 글리프 존재 | **PASS** |
| **4. standalone 가드(컴파일 CSS)** | 컴파일 CSS 청크(`/_next/static/chunks/*.css`) fetch 후 grep | `.splash-screen{…display:none…}` + `@media (display-mode:standalone){.splash-screen{display:flex}}` | `.splash-screen{…transition:opacity .32s;display:none;position:fixed}` + `@media (display-mode:standalone){.splash-screen{display:flex}}` 확인. `.splash-screen-leaving{opacity:0}` · `.splash-icon{96px}` · `.splash-wordmark{gradient #0f1419→#5b6470, 36px/800, clip:text}` 동반 | **PASS** |
| **5. 공개 경로 + 보안 무회귀** | **게이트 ON**, 무쿠키 상태 curl | `/splash-ios` 200(공개), 보호 페이지 307→/login, 보호 API 401, 인접 접두 미누설 | `/splash-ios?w&h` **200**, 무파라미터 `/splash-ios` **200**. `/market`·`/`·`/analyze` **307**, `/api/market/indices` **401 `{"error":"unauthorized"}"`**. **인접 표면**: `/splash-ios-admin` **307**, `/splash-ios/x` **307** (정확 일치 화이트리스트 — 누설 없음) | **PASS** |
| **6. 무회귀(기존 페이지·BFF·한글톤)** | 기존 페이지 응답 + `git grep` + diff grep | `/login` 200, BFF 원칙 무회귀, 한글톤 무회귀 | `/login` **200**(게이트 ON/OFF 모두). `git grep -nE "http://127\.0\.0\.1" -- app/` route handler 외 **0건**(히트는 `app/api/workbench/_adapters/fastapi.ts` BFF fallback 만). 변경 파일 내 `fetch(`/FastAPI 직접호출 **0건**. 사용자 노출 문구는 브랜드 워드마크 `FinSight`(허용) 외 영문 신규 문자열 **0건**. 서버 로그 런타임 에러/예외 **0건** | **PASS** |

---

## 3. 에지 케이스 / 추가 점검

- **clamp 안전성**: `w=abc`(NaN) / `w=-50`(음수) / `w=10`(MIN 320 미만) / `w=99999`(MAX 3000 초과) — 전부 200 + 기본 1170×2532 로 폴백. 비정상 입력으로 서버 500/깨진 PNG 없음. `Number.isFinite` + 범위 가드(`clampDim`) 동작 확인.
- **StrictMode/SSR 하이드레이션**: 인앱 스플래시 SSR 초기 상태가 `보임`(`leaving=false`)이라 HTML 에 `.splash-screen` 마운트됨 — 하이드레이션 mismatch 경고 서버 로그에 없음. `<html suppressHydrationWarning>` 는 기존 레이아웃 컨벤션(외부 확장 대비)으로 본 PR 무관.
- **접근성 무회귀**: 스플래시는 장식 요소로 `aria-hidden="true"`(컨테이너 + 내부 `<svg>` 이중). 포커서블 요소 없음 → Tab 순서/스크린리더 영향 0. 워드마크는 `bg-clip-text` 텍스트(`color:transparent`)이나 실제 텍스트 노드 `FinSight` 유지(SEO/카피 무회귀).
- **디자인 토큰 정합**: 인앱 CSS(`.splash-*`)는 `@apply` Tailwind 토큰만 사용(`bg-surface`/`from-text-strong`/`to-text-muted`/`h-24`/`text-font-display`) — hex/px 직타 없음. `app/splash-ios/route.tsx` 의 hex(`BRAND_MARK_BG`, `#1e293b`)는 `next/og`(Satori) 내부 Tailwind 미지원에 따른 **문서화된 합리적 예외**이며 `lib/brand-mark.tsx` 단일 소스 재사용(파비콘·OG·홈아이콘과 정합). 워드마크 다크 슬레이트(`#1e293b`)는 동일 제약 하 OG 이미지 톤과 일치 — reviewer 영역(토큰 직타 정책)으로 인계.

---

## 4. 디바이스 전용 (로컬 불가 — 배포 후 실기기로 분리)

로컬 production 서버는 `(display-mode: standalone)` 을 구동할 수 없어(설치형 PWA 컨텍스트 필요) 아래는 **배포 후 실기기 검증 대상**. 다만 그 전제(가드 규칙·이미지·head link)는 위 AC-3/4/5 로 정적 검증 완료 — 실기기 검증은 시각 연속성 확인에 한정.

| 항목 | 검증 방법 | 비고 |
|---|---|---|
| 설치형 PWA 콜드 로드 시 로고+FinSight 연속 표시 (iOS) | iOS 홈 화면 추가 후 콜드 실행 | 네이티브 startupImage → 인앱 스플래시 전환 점프/중복 번쩍임 없음 확인 |
| 동일 (Android) | Android 홈 화면 추가 후 콜드 실행 | 네이티브 아이콘 스플래시 → 인앱 워드마크 연속 확인 |
| 일반 브라우저 탭 스플래시 미노출 | 데스크탑/모바일 브라우저 탭 새로고침 | standalone 가드(`display:none`)로 번쩍임 없음 — 정적 CSS 가드는 AC-4 로 확인됨 |
| 페이드 타이밍/최소 표시시간 | 실기기 관찰 | PR `## 다음 작업` 의 후속 미세조정 대상 |

---

## 5. 게이트 점검

- PR 본문 `## 다음 작업` 섹션 **존재 확인** → `qa-passed` 라벨 부여 시 handoff-append workflow 빈 항목 commit 위험 없음.

---

**결론**: 로컬 검증 가능한 AC 6건 전부 PASS, 실패 0건. `qa-passed` 부여 + `impl-ready` 제거.
