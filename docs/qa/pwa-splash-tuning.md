# QA — pwa-splash-tuning

- **대상 PR**: #64 (`feature/pwa-splash-tuning`)
- **PRD/기능**: #62 인앱 스플래시의 튜닝 follow-up. 설치형 PWA 인앱 스플래시 로고가 안드로이드 네이티브보다 작고 너무 짧게 떠서 (1) 로고 크기를 네이티브 ~158dp 급으로 확대(h-24 96px→h-40 160px) (2) 최소 표시시간 1.2s 보장 (3) iOS 시작화면 로고를 인앱과 동일 고정 dp(160/36/24 × ratio)로 렌더해 점프 제거.
- **QA 일자**: 2026-06-01
- **검증 환경**: git worktree `/Applications/하영/code_source/trading-signal-frontend-splash` (병렬 작업 보호, 메인 working dir 미접촉)
- **판정**: **qa-passed** (로컬 AC 5/5 + 공통 AC PASS, 실패 0건. 디바이스 전용 항목은 배포 후 실기기로 분리)

변경 파일 (`git diff main...HEAD`): `app/components.css` · `app/layout.tsx` · `app/splash-ios/route.tsx` · `components/pwa/SplashScreen.tsx` (4개)

---

## 1. 로컬 검증 환경

- `npm run build` (Turbopack) — Compiled + TypeScript 일괄
- `npm run typecheck` (`tsc --noEmit`) / `npm run lint` (eslint) 개별 실행
- `npm start -- -p 3701` (production) — 포트 3700에 타 프로세스 점유(사용자 병렬 작업 추정)로 충돌 회피 위해 3701 사용. 검증 후 3701만 종료(3700 미접촉).

---

## 2. AC 별 표 (로컬 실행)

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| **1. 빌드/타입 0에러** | `npm run build` · `npm run typecheck` · `npm run lint` | build 성공, 타입 0 (lint 무관 기존 warning 제외) | build **`✓ Compiled successfully in 2.2s`** + `Running TypeScript … Finished TypeScript in 2.1s` + 정적 페이지 29/29 생성. `tsc --noEmit` **EXIT 0**. lint **0 error / 1 warning** (`components/profile/StockDailyChart.tsx:238` 미사용 `i` — `git diff main...HEAD` 변경 파일 4개에 미포함, 기존 무관 확인) | **PASS** |
| **2. 컴파일 CSS 토큰 반영** | 빌드 산출 CSS 청크(`.next/static/chunks/*.css`) grep | `.splash-icon` height=160px, `.splash-screen` gap=24px | `.splash-icon{height:calc(var(--spacing,.25rem) * 40);width:…* 40}` + `--spacing:.25rem` → **0.25rem×40 = 10rem = 160px**(h-40). `.splash-screen{…gap:24px…}` (gap-2xl). 이전 `h-24`(×24) 흔적 **0건** | **PASS** |
| **3. `/splash-ios` 이미지 + ratio clamp** | `curl -D -` 로 status/content-type 확인, `file`·`sips`/PIL 로 PNG 차원, `md5`로 픽셀 동일성 비교 | `?w=1170&h=2532&r=3` → 200 image/png 1170×2532. `&r` 없음(기본3)·`r=2`·비정상 r(r=9·abc) 모두 200(clamp) | `r=3` → **200 image/png, PNG 1170×2532**. `&r` 없음·`r=2`·`r=9`·`r=abc`·`r=0`·`r=-1` 전부 **200 image/png 1170×2532**. **clamp 픽셀 검증**: `r=3`/없음/`r=9`/`r=abc`/`r=0`/`r=-1` md5 **전부 동일**(`5ab9a4…` = 글리프 480px=160×3 으로 clamp). `r=2`만 다른 md5(`695eac…`, 글리프 320px=160×2 = 28776 bytes < 33674). **육안**: 흰 배경 + 중앙 3색 맥박 글리프(빨강→파랑) + 하단 다크 "FinSight", r=2는 r=3 대비 글리프·워드마크 작게 렌더(ratio 정합) | **PASS** |
| **4. head 주입 + SSR 마운트** | `curl /login` HTML 파싱 | `apple-touch-startup-image` 11개 모두 `&r=` 포함, 인앱 `.splash-screen` SSR + `splash-wordmark">FinSight` | startup-image link **11개**, 그중 `r=` 포함 **11개**, `r=` 없는 것 **0개**. 각 링크의 `w·h·r` 이 `layout.tsx` `IOS_SPLASH_DEVICES` 11종과 정확 정합(예: `[375,667,2]`→`w=750&h=1334&r=2`, `[390,844,3]`→`w=1170&h=2532&r=3`). 인앱 `<div class="splash-screen">` SSR 마운트 + `splash-wordmark">FinSight` SSR 렌더 | **PASS** |
| **5. 무회귀(가드·라우트)** | 컴파일 CSS grep + 기존 라우트 curl | standalone 가드 유지, 기존 라우트 200 | `.splash-screen{…display:none…}` 기본 + `@media (display-mode:standalone){.splash-screen{display:flex}}` **유지**(일반 브라우저 탭 미노출). 기존 라우트: `/login`·`/`·`/analyze`·`/profile`·`/watchlist`·`/splash-ios`·`/manifest.webmanifest`·`/icon`·`/apple-icon` **200**. `/market`·`/dashboard`·`/stock` **307**(미인증 게이트 리다이렉트 — 본 PR 라우팅 미변경, home-market-redesign 기존 동작) | **PASS** |

---

## 3. 공통 AC (무회귀)

| 항목 | 명령/근거 | 실측 | 판정 |
|---|---|---|---|
| **BFF 원칙** | `git grep -nE "http://127\.0\.0\.1" -- app/ components/` (route handler 제외) | route handler 외 **0건**. 변경 파일 `SplashScreen.tsx`·`route.tsx` 내 `fetch(` 직접 호출 **0건** | **PASS** |
| **한글 톤** | 변경 파일 사용자 노출 문구 grep | 노출 문구는 `FinSight`(고유명사, `NAV_BRAND_LABEL="FinSight"` 단일 소스 경유 + splash-ios 본 텍스트)뿐. 신규 영문 카피 **0건** | **PASS** |
| **접근성** | `SplashScreen.tsx` aria 검사 | 장식적 부팅 화면 → 컨테이너 `aria-hidden="true"`(스크린리더 제외 적정), 포커서블 요소 없음 → Tab 순서 영향 0. iOS startup-image는 OS가 그리는 시작화면(`<img>` 아님)이라 alt 무관 | **PASS** |

---

## 4. 에지 케이스 / 추가 점검

- **ratio clamp 안전성**: `clampRatio` 가 `Number.isFinite` + `1 ≤ n ≤ 4` 가드. `r=9`(상한 초과)·`r=0`(하한 미만)·`r=-1`(음수)·`r=abc`(NaN)·`&r` 누락 모두 `DEFAULT_RATIO=3` 으로 폴백 → md5 동일성으로 픽셀 단위 확정(서버 500/깨진 PNG 없음). `r=2`만 정상 통과해 글리프 320px 로 작게 렌더.
- **dim clamp 회귀 무영향**: 기존 `clampDim`(MIN 320 / MAX 3000) 로직 본 PR 미변경. 이미지 차원은 `{ width, height }` 로 항상 요청 w×h(1170×2532) 유지 — ratio 는 내부 글리프/폰트/gap 스케일에만 작용.
- **SplashScreen 타이밍 로직(정적 검증)**: `MIN_VISIBLE_MS(1200)` 과 `load`(또는 초기 `readyState==="complete"`) 를 **둘 다** 충족해야 `setLeaving(true)`(`leaveWhenReady` 가드). `loaded`·`minElapsed` 클로저 플래그로 순서 무관 동시 충족 보장. `BACKSTOP_MS(4000)` 하드 백스톱이 load 미발화 시에도 fade 보장. cleanup 에서 `removeEventListener('load', onLoad)` + `minTimer`·`backstop` clearTimeout 모두 해제 → StrictMode 더블 마운트 시 리스너/타이머 누수 없음.
- **SSR 하이드레이션**: 인앱 스플래시 SSR 초기 상태 `보임`(`leaving=false`)이라 `/login` HTML 에 `.splash-screen` + `splash-wordmark">FinSight` 마운트 — 서버 로그 하이드레이션 mismatch 경고 없음.
- **디자인 토큰 정합**: 인앱 CSS(`.splash-icon` `h-40`/`.splash-screen` `gap-2xl`)는 `@apply` Tailwind 토큰만 사용(hex/px 직타 없음). `app/splash-ios/route.tsx` 의 고정 dp 상수(160/36/24)·hex(`BRAND_MARK_BG`/`#1e293b`)는 `next/og`(Satori) 내부 Tailwind 미지원에 따른 **문서화된 합리적 예외**이며 색/글리프는 `lib/brand-mark.tsx` 단일 소스 재사용 — 토큰 직타 정책 판단은 reviewer 영역으로 인계.

---

## 5. 디바이스 전용 (로컬 불가 — 배포 후 실기기로 분리)

로컬 production 서버는 `(display-mode: standalone)` 설치형 PWA 컨텍스트를 구동할 수 없어 아래는 **배포 후 실기기 검증 대상**. 다만 그 전제(가드 규칙·이미지 ratio·head link·타이밍 상수)는 위 AC-2~5 + §4 로 정적 검증 완료 — 실기기 검증은 시각 크기·표시시간 체감 확인에 한정.

| 항목 | 검증 방법 | 비고 |
|---|---|---|
| 콜드 로드 시 로고 네이티브급 크기 | Android(Galaxy S25)·iOS 홈 화면 추가 후 콜드 실행 | 인앱 글리프 160dp 가 네이티브 ~158dp 와 시각 동급인지 |
| ~1.2초 또렷이 표시 | 실기기 관찰 | `MIN_VISIBLE_MS(1.2s)` 체감 — 너무 짧던 문제 해소 확인. (관찰 시 미세조정 = PR `## 다음 작업`) |
| iOS 시작화면 ↔ 인앱 점프 없음 | iOS 설치형 PWA 콜드 실행 | startup-image 로고(160dp×r) → 인앱 로고(160dp) 크기 연속성 |

---

## 6. 게이트 점검

- PR #64 본문 `## 다음 작업` 섹션 **존재 확인**(배포 후 실기기 검증 / MIN_VISIBLE_MS 미세조정 / 안드로이드 상태바 1px 선 별도 트랙) → `qa-passed` 라벨 부여 시 handoff-append workflow 빈 항목 commit 위험 없음.
- 병렬 작업 보호: 모든 작업을 worktree(`…-splash`)에서 수행, 메인 working dir 의 `feature/mobile-stock-ux-polish` 미접촉. 테스트 서버는 3701만 기동·종료(3700 타 프로세스 보존).

---

## 판정

**qa-passed** — 로컬 AC 5/5 + 공통 AC 3/3 PASS, 실패 0건. 디바이스 체감 항목은 배포 후 실기기로 분리(전제는 정적 검증 완료).
