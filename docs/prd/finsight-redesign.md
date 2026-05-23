# PRD: finsight-redesign

- **slug**: `finsight-redesign`
- **작성일**: 2026-05-23
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: PR #6 ~ #25 머지 완료. main `cf5f1ca` (PR #25 `design-tone-refinement` v7 rev2 흡수 직후). 본 PRD 는 **사용자가 직접 제작한 Figma Make 시안** (repo 내부 `Stock and Coin Analysis App/` 폴더, Vite + React Router v7 + Tailwind v4 + shadcn/ui 풀세트) 을 본 저장소로 이식하여 **디자인 톤 전면 리디자인 + 정보 아키텍처 5(+1) 화면 도입 + 한국 금융 사용자 멘탈모델 (한국식 등락 색)** 까지를 한 흐름으로 다룬다.
- **UI 포함 여부**: **yes** — 본 PRD 의 핵심은 (a) DESIGN.md v8 신설로 한국식 등락 컨벤션·자산 식별색·Pretendard·그라데이션 토큰 도입, (b) 6개 라우트 신설 / 이전, (c) 시안 컴포넌트 톤을 본 저장소 컨벤션 (`docs/rules/frontend.md` 8개 절) 안에서 재구현. **UX/UI 디자이너 비중 본 PRD 의 50% 이상**.
- **선행 / 후행 관계**:
  - **선행 (모두 머지 완료)**:
    - `layout-redesign` (PR #21) — 3-section shell. 본 PRD 의 `(workbench)` 라우트 그룹 재정렬 base.
    - `component-compactness` (PR #22) — 컴포넌트 컴팩트 토큰. 본 PRD 무영향 (단 search dropdown / 입력 토큰은 시안 톤으로 cascade 갱신).
    - `claude-cli-analysis` (PR #23) — `AnalyzeAdapter` + Claude CLI subprocess. 본 PRD 무영향. `/analyze` 라우트 이전 시 호출 흐름 그대로 보존.
    - `polish-followups` (PR #24) — reviewer nit 6건 흡수. 본 PRD 무영향.
    - `design-tone-refinement` (PR #25) — DESIGN.md v7 rev2 (Pretendard 미적용 / 한국식 색 미적용 단계). 본 PRD 의 v8 출발점.
  - **본 PRD 자체 분할 (Phase 1 → Phase 2, PR 9개)**: §3.3 에 명세. **AGENTS.md "한 작업 = 한 PR" 룰을 본 작업 한정 해제** (사용자 동의 2026-05-23). 동일 슬러그 `finsight-redesign` 시리즈로 묶음.
  - **후행 (사용자 결정)**:
    - PRD `claude-api-analysis` (가칭) — adapter 인터페이스 위에 `claudeApiAdapter` 만 추가.
    - PRD `analyze-streaming` (가칭) — `/analyze` 단일 응답 → streaming.
    - PRD `dark-mode` (가칭) — 본 PRD 의 semantic 토큰 + Pretendard + 한국식 등락 정착 후 진입.

## 1. 배경 / 문제

### 1.1 사용자 의도 (verbatim)

사용자가 본 세션 (2026-05-23) 진입 시 명시한 합의:

> "trading-signal-frontend 의 디자인 톤을 내가 직접 제작한 시안에 맞춰 전면 리디자인하자. 시안은 repo 안 `Stock and Coin Analysis App/` (Figma Make export). 브랜드명은 **FinSight**. 색은 한국식 — 상승 빨강, 하락 파랑. 자산 식별은 주식 blue / 코인 orange / AI 영역은 indigo→blue 그라데이션. 폰트는 Pretendard. Tailwind 는 v4 로 올리되 어댑터 (`tailwind.config.ts` + `tailwind.theme.json`) 는 유지. 라우트 6개 — `/dashboard` (포트폴리오), `/` (종목 분석 mock), `/analyze` (실분석 — 기존 workbench 이전), `/market`, `/watchlist`, `/profile`. PR 은 9개로 쪼개되 한 브랜치 한 PR 룰은 본 작업 한정 해제."

### 1.2 현재 상태 (main `cf5f1ca`)

- 화면 = `/` 단일 (워크벤치 `/api/workbench/analyze` 단일 라운드트립).
- 디자인 = DESIGN.md v7 rev2 — `accent-vivid` `#3b82f6` (PR #25 합의), 텍스트 `#0f1419`, surface `#ffffff`. Pretendard 미적용 (현 `tailwind.theme.json` 의 fontFamily = Arial fallback).
- 색 컨벤션 = `warn=red` / `critical=red` / `info=blue` 등 **글로벌 토큰만** 있고 "상승/하락" 의미 토큰 없음.
- 자산 식별 색 없음 — 주식·코인 시각 구분 0.
- Tailwind v3.4.19 + `@tailwindcss/postcss` 미사용 + `globals.css` 의 `@tailwind base; @tailwind components; @tailwind utilities;` 디렉티브 패턴.
- 어댑터 = `tailwind.config.ts` 가 `tailwind.theme.json` 을 import → `theme.extend` 주입 + `scripts/inject-breakpoints.mjs` 후처리.
- 컨벤션 8개 절 (`docs/rules/frontend.md`) 정착. mock data 폴더 표준 없음 — 화면별 인라인 mock 또는 fixture 없음.
- 시안 = `Stock and Coin Analysis App/` 폴더 (Vite 6 + React Router 7 + Tailwind v4 + shadcn/ui 풀세트 + lucide-react + recharts + motion + framer 등 50+ 의존성). 화면 5개 — Dashboard / AnalysisDashboard / Market / Watchlist / Profile.

### 1.3 문제

- **브랜드 정체성 부재** — 헤더·README·메타 어디에도 브랜드명이 없음. "Trading Signal" 은 엔진 레포 이름이라 FE 브랜드 분리 필요.
- **한국 사용자 멘탈모델 불일치** — 글로벌 컨벤션 (상승=green / 하락=red) 은 한국 금융 사용자에게 거꾸로 읽힌다. 본 저장소 사용자가 한국 개인 투자자라는 합의가 명시 안 됨.
- **정보 아키텍처 부재** — `/` 단일 화면이라 포트폴리오 / 시장 동향 / 관심종목 진입이 없음. 분석 결과만 보여주고 멈춤.
- **시각 톤의 활기 부족** — PR #25 의 `accent-vivid` 가 부분 강조 정착. 그러나 자산 식별 색·등락 색·AI 영역 그라데이션이 없어 시각 위계가 단조롭다.
- **자산 다중성 부재** — 시안은 주식 / 코인 토글 검색 + 자산별 색 코딩. 현 화면은 ticker 단일 입력으로 자산 종류 무관.
- **시안 자산의 노는 상태** — 사용자가 직접 제작한 5개 화면 시안이 repo 안에 있는데 본 저장소 컨벤션 (`docs/rules/frontend.md`) 안으로 흡수 안 됨. mock data 폴더 표준이 없어 시안 컴포넌트의 인라인 mock 을 그대로 이식할 위치도 없음.
- **Tailwind v3 → v4 마이그레이션 미실행** — 시안 자체가 v4 기반. 본 저장소 v3 유지 시 시안 컴포넌트의 v4 전용 문법 (`@import "tailwindcss"`, `@theme inline`, `@utility` 등) 이식 시 변환 비용 발생. v4 정착 후 흡수가 자연.

### 1.4 컨텍스트 메모

- 사용자가 직접 제작한 시안 (`Stock and Coin Analysis App/`) 은 Figma Make export 산출물. 본 저장소 컨벤션과 직접 호환되지 않음 — App Router 가 아니라 Vite + React Router v7. 시안을 그대로 이식이 아니라 **톤·정보 아키텍처·mock 데이터·컴포넌트 의도** 만 가져옴.
- 시안의 shadcn/ui 풀세트 (40+ Radix 컴포넌트) 전부 도입은 과함. 본 PRD 는 lucide-react + recharts + 필요한 Radix 컴포넌트만 점진 도입 (§9 OPEN QUESTION q3).
- Pretendard 는 한국어 + 영문 모두 정합. CDN 임포트 vs `next/font` self-host 결정 필요 (§9 OPEN QUESTION q6).
- 현 `/` 화면 (워크벤치) 의 실제 API 호출 (`POST /api/workbench/analyze`) 은 본 PRD 머지 후에도 보존. 라우트만 `/` → `/analyze` 로 이동.
- 본 PRD 는 6개 라우트 모두를 신설·이전하지만, 데이터 페칭은 `/analyze` 한 화면만 실 BE 호출. 나머지 5개 화면 (Dashboard / Home / Market / Watchlist / Profile) 은 **mock data** 만 렌더 (BE 연결은 별도 후행 PRD).
- `lib/mock/<domain>/` 폴더 표준 신설 — `docs/rules/frontend.md` 의 도메인 한 뎁스 룰 안에서 자연스럽게 흡수.

## 2. 목표

- **브랜드 정착** — 헤더·사이드바 로고·README·`<title>` 메타에 "FinSight" 일관 적용.
- **한국식 등락 컨벤션** — `signal-up=red-500/600` / `signal-down=blue-500/600` 의미 토큰 도입. 자산 식별 토큰 `asset-stock=blue` / `asset-coin=orange`. AI 영역 그라데이션 `gradient-ai=indigo→blue` 토큰화.
- **Pretendard 폰트** — 한글 + 영문 가독성 정합. 현 `tailwind.theme.json` 의 fontFamily 교체 + 합성 토큰 cascade.
- **Tailwind v4 마이그레이션** — `@tailwindcss/postcss` 도입, `postcss.config.mjs` 갱신, `globals.css` → `@import "tailwindcss"`, `tailwind.config.ts` v4 호환 + `@config` 디렉티브 다리. **DESIGN.md → `tailwind.theme.json` 어댑터 유지 (CSS-first 전환 안 함)**.
- **6개 라우트 정착**:
  1. `/dashboard` — 포트폴리오 hero 카드 + 보유 자산 Top 3 + Fear & Greed 지표.
  2. `/` (index) — AnalysisDashboard (mock): 종목/코인 토글 검색 + 가격 차트 + AI 분석 카드 + 기술적 지표 + 뉴스. 정보 탐색용.
  3. `/analyze` — 현 `/` 의 워크벤치 화면 이전. 실 BE 호출 (`POST /api/workbench/analyze`) 보존.
  4. `/market` — 인기 테마 / 섹터 + 주요 지수.
  5. `/watchlist` — 관심종목 테이블 (12-col grid).
  6. `/profile` — 마이페이지 + 거래소 연동.
- **mock data 폴더 표준 신설** — `lib/mock/<domain>/`. 시안 컴포넌트 내 인라인 mock 이전 + API 연결 전까지 화면 채움 + 후속 fixture/테스트 재활용.
- **PR 9개 분할** — Phase 1 (PR1·PR2: 전면 토큰·v4 마이그레이션) → Phase 2 (PR3~PR9: 페이지 순차 이전). **한 작업 한 PR 룰 본 작업 한정 해제**.
- **회귀 0건** — `/analyze` 의 실제 API 호출 무회귀. 라운드트립 5건 양 뷰포트 무회귀. typecheck / lint / build 0 에러.

## 3. 범위 (In Scope)

### 3.1 디자인 시스템 (DESIGN.md v8)

- **신규 파일**: `docs/design/finsight-redesign.md` (DESIGN.md v8).
- **토큰 키 셋 변경** (v7 rev2 → v8):
  - **신규 추가**:
    - `signal-up` (#ef4444 권장 / red-500) — 상승 / 매수 신호.
    - `signal-up-soft` — 상승 배경.
    - `signal-down` (#3b82f6 권장 / blue-500) — 하락 / 매도 신호.
    - `signal-down-soft` — 하락 배경.
    - `asset-stock` (#3b82f6 권장 / blue-500) — 주식 자산 식별.
    - `asset-coin` (#f97316 권장 / orange-500) — 코인 자산 식별.
    - `gradient-ai-from` (#4f46e5 권장 / indigo-600) — AI 영역 그라데이션 시작.
    - `gradient-ai-to` (#3b82f6 권장 / blue-500) — AI 영역 그라데이션 끝.
    - `font-display` (Pretendard) — 신규 typography 토큰.
  - **재할당 / 사용처 갱신**:
    - 기존 `info` (`#2563eb`) 는 정보 영역에만 한정. 하락 의미는 신규 `signal-down` 으로 분리.
    - 기존 `critical` / `warn` 의 red 톤은 경고·오류에만 한정. 상승 의미는 신규 `signal-up` 으로 분리. **사용처 룰 prose 단락 강제**.
- **prose 강제 단락**:
  - **한국식 색 컨벤션 의도 단락** — "한국 금융 사용자의 멘탈모델 — 상승=빨강, 하락=파랑. 글로벌 컨벤션과 거꾸로." 명시.
  - **자산 식별 색 의도 단락** — "주식 = blue (안정·신뢰), 코인 = orange (활기·변동성), AI = indigo→blue 그라데이션 (브랜드 색)" 명시.
  - **신·구 팔레트 비교 표** — v7 rev2 hex → v8 hex / 신규 추가 / 사용처 갱신.
  - **WCAG AA 4.5:1 대비비 표** — 신규 토큰 포함 전체 14+ 쌍.
  - **Pretendard 도입 의도 단락** — 한글·영문 동등 가독성. 현 Arial fallback 대체. 임포트 방식 결정 사유 (§9 OPEN QUESTION q6 후 RESOLVED 시 갱신).
- **lint**: `npx @google/design.md lint` errors=0 warnings=0.
- **`npm run design:sync`** 재실행 → `tailwind.theme.json` v8 hex / 토큰 키 동기화.

### 3.2 Tailwind v4 마이그레이션

- **package.json**:
  - `tailwindcss` ^3.4.19 → ^4.x.
  - `@tailwindcss/postcss` 신규 (devDependency).
  - `autoprefixer` 검토 — v4 의 `@tailwindcss/postcss` 가 흡수 가능 시 제거.
- **postcss.config.mjs**: `tailwindcss` 플러그인 → `@tailwindcss/postcss` 로 교체.
- **`app/globals.css`**:
  - 기존 `@tailwind base; @tailwind components; @tailwind utilities;` → `@import "tailwindcss";` (v4 컨벤션).
  - v4 `@config "../tailwind.config.ts"` 디렉티브 추가 — JS 어댑터로 다리.
  - preflight 잔여물 (`tabular-nums` 등) 무회귀.
- **`tailwind.config.ts`**:
  - v4 호환 형태로 변환 (구조 큰 변경 없음 — `theme.extend` 패턴 유지).
  - `tailwind.theme.json` import + spread 패턴 유지.
  - `scripts/inject-breakpoints.mjs` 후처리 무회귀.
- **CSS-first 전환 안 함** — DESIGN.md → `tailwind.theme.json` 어댑터가 단일 진실 원천. 시안의 `@theme inline` / `@utility` 문법은 본 저장소 도입 안 함. **§9 OPEN QUESTION 으로 시안의 v4 패턴을 어디까지 흡수할지 결정 — PM 권고: JS 어댑터 단일 유지**.
- **v4 신규 기능 도입 검토 (선택)**:
  - `@source` 디렉티브 — 무도입 (content 자동 탐색).
  - `@variant` — 무도입.
  - container queries — 무도입 (반응형 prefix 정착).

### 3.3 라우트 구조 + Phase 분할 (PR 9개)

**Phase 1 — 전면 토큰 / 스타일 교체**

- **PR1** `chore(tailwind): v4 migration`
  - 변경: package.json / postcss.config.mjs / globals.css / tailwind.config.ts.
  - 산출: build / typecheck / lint 0 에러. 시각 회귀 0 (어댑터 유지로 토큰 cascade 그대로).
  - 검증: `npm run dev` 실행 후 `/` 화면 시각 비교.
- **PR2** `feat(design): v8 토큰 + finsight 톤 적용`
  - 변경: `docs/design/finsight-redesign.md` (v8 신설) + `package.json` 의 `design:sync` source 갱신 (`design-tone-refinement.md` → `finsight-redesign.md`) + `scripts/inject-breakpoints.mjs` DESIGN_PATH 갱신 + `tailwind.theme.json` 재생성 + `app/globals.css` / `app/components.css` 합성 토큰 cascade 갱신.
  - 산출: DESIGN.md v8 + Pretendard 정착 + 한국식 등락 토큰 + 자산 식별 토큰 + 그라데이션 토큰. 현 `/` (워크벤치) 화면 시각 톤 v8 cascade 적용.
  - 검증: design.md lint 0 / WCAG AA 무회귀 / 라운드트립 5건 무회귀.

**Phase 2 — 페이지 순차 마이그레이션**

- **PR3** `feat(layout): finsight shell`
  - 변경: `components/layout/Sidebar.tsx` (6 메뉴), `components/layout/Header.tsx` (글래스 효과), `components/layout/BottomNav.tsx` (모바일), `app/(workbench)/layout.tsx` 재정렬 — 라우트 그룹 명을 의미에 맞게 검토 (§9 OPEN QUESTION q5).
  - 산출: 6개 라우트 모두 sidebar / bottom nav 공유. 모바일·데스크탑 모두 정상.
- **PR4** `feat(mock): 시안 mock data 이식`
  - 변경: `lib/mock/<domain>/` 신설. `lib/mock/dashboard/`, `lib/mock/home/` (또는 `lib/mock/analysisDashboard/` — §9 OPEN QUESTION q2), `lib/mock/market/`, `lib/mock/watchlist/`, `lib/mock/profile/`. 시안 컴포넌트의 인라인 mock 이전.
  - `package.json` 의존성 추가: `lucide-react`, `recharts`. (시안의 50+ 의존성 중 본 PRD 가 실제 사용하는 2개만 도입.)
  - `docs/rules/frontend.md` 갱신: "mock data 위치 = `lib/mock/<domain>/`" 절 1단락 추가.
- **PR5** `feat(analyze): workbench 라우트 이전`
  - 변경: 현 `app/page.tsx` (워크벤치) → `app/analyze/page.tsx`. `app/(workbench)/` 라우트 그룹 정리. 도메인 폴더 (`components/workbench/`, `hooks/workbench/`, `lib/api/workbench/`) 폴더명 유지 vs `analyze` rename 결정 (§9 OPEN QUESTION q5).
  - 산출: `/analyze` 진입 시 현 워크벤치 화면. `POST /api/workbench/analyze` 호출 무회귀.
- **PR6** `feat(home): 분석 대시보드 (mock)`
  - 변경: `app/page.tsx` 신규 — 시안 AnalysisDashboard 톤. 종목/코인 토글 검색 + 가격 차트 (recharts) + AI 분석 카드 + 기술적 지표 + 뉴스. 모두 `lib/mock/home/` 데이터.
  - 시각 위계 — 자산 식별 토큰 (asset-stock / asset-coin) + AI 그라데이션 토큰 (gradient-ai-from / -to) 활용.
- **PR7** `feat(dashboard): 포트폴리오 화면`
  - 변경: `app/dashboard/page.tsx` 신규. 포트폴리오 hero 카드 + 보유 자산 Top 3 + Fear & Greed 지표. `lib/mock/dashboard/` 데이터.
- **PR8** `feat(market): 시장 동향`
  - 변경: `app/market/page.tsx` 신규. 인기 테마 / 섹터 + 주요 지수. `lib/mock/market/` 데이터.
- **PR9** `feat(watchlist): 관심종목` + `feat(profile): 마이페이지`
  - 변경: `app/watchlist/page.tsx` (12-col grid 테이블) + `app/profile/page.tsx` (마이페이지 + 거래소 연동 placeholder). 두 화면 분량이 작아 단일 PR 묶음. 분량이 커지면 PR9·PR10 으로 재분할 가능 (§9 OPEN QUESTION q7).

### 3.4 mock data 폴더 표준 (`lib/mock/<domain>/`)

- **폴더 구조**:
  - `lib/mock/dashboard/portfolio.ts`, `holdings.ts`, `fearGreed.ts`.
  - `lib/mock/home/searchResults.ts`, `priceChart.ts`, `aiAnalysis.ts`, `indicators.ts`, `news.ts`.
  - `lib/mock/market/themes.ts`, `sectors.ts`, `indices.ts`.
  - `lib/mock/watchlist/items.ts`.
  - `lib/mock/profile/user.ts`, `exchanges.ts`.
  - barrel `index.ts` 두지 않음 (`docs/rules/frontend.md` 의 도메인 한 뎁스 룰 + barrel 금지 정합).
- **타입**: `lib/types/<domain>/*.ts` 와 정합. mock 데이터는 동일 타입을 import 해서 작성.
- **컴포넌트 import 경로**: `@/lib/mock/dashboard/portfolio` 직접 경로 (barrel 미사용).
- **i18n 카피 정합**: mock 안 사용자 노출 한글 카피는 `lib/copy/<domain>/` 로 분리. mock 은 데이터·숫자·ticker 만.

### 3.5 신규 라이브러리

- **`lucide-react`** — 아이콘. shadcn/ui 의존성에서 광범위하게 쓰임. 본 저장소도 도입.
- **`recharts`** — 가격 차트 / 지수 그래프. 시안의 차트 컴포넌트 정합.
- **shadcn/ui 풀세트 — 비도입** (§9 OPEN QUESTION q3). 필요한 Radix 컴포넌트 (예: `@radix-ui/react-tabs`, `@radix-ui/react-popover`) 만 점진 도입. PM 권고.
- **motion / framer-motion / canvas-confetti 등** — 비도입. 본 PRD 의 모션 의존도 낮음.

### 3.6 BFF / API 호출 경계

- `/analyze` 화면만 실제 BE 호출 (`POST /api/workbench/analyze`). 호출 흐름은 PR #23 의 adapter 인터페이스 그대로.
- Phase 2 의 5개 mock 화면 (Dashboard / Home / Market / Watchlist / Profile) 은 BE 호출 0건. 모두 `lib/mock/<domain>/` 데이터.
- 본 PRD 머지 후 별도 PRD 에서 mock → BE 전환 검토 (예: `dashboard-backend`, `market-backend`).

### 3.7 검증·QA

- **Phase 1 검증** (PR1·PR2 머지 후):
  - `npm run typecheck` / `lint` / `build` 0 에러.
  - 현 `/` 화면 (워크벤치) 시각 회귀 — 라운드트립 5건 양 뷰포트.
  - WCAG AA 4.5:1 무회귀 — DESIGN.md v8 prose 의 대비비 표.
  - Pretendard 적용 확인 — 헤더 / 본문 / 숫자 모두 Pretendard 렌더.
- **Phase 2 검증** (PR3~PR9):
  - 각 PR 별 라운드트립 + 양 뷰포트.
  - `/analyze` 진입 시 워크벤치 라운드트립 5건 무회귀.
  - 모바일 (375) bottom nav 6 메뉴 진입.
  - 데스크탑 (1280·1920) sidebar 6 메뉴 진입.
  - 자산 식별 토큰 / 한국식 등락 토큰 일관 적용 — 모든 화면.

## 4. 범위 외 (Out of Scope)

- **BE 호출 신설** — 5개 mock 화면 (Dashboard / Home / Market / Watchlist / Profile) 의 BE 연결은 별도 PRD. mock data 만 본 PRD 범위.
- **거래소 연동** — `/profile` 의 거래소 연동은 placeholder UI 만. OAuth / API key 흐름은 별도 PRD.
- **다크 모드** — 별도 PRD. 본 PRD 의 v8 토큰이 다크 모드 친화 명명 (semantic) 정합되도록 작성하되 다크 모드 자체는 본 PRD 무관.
- **shadcn/ui 풀세트 도입** — `lucide-react` + `recharts` + 필요한 Radix 컴포넌트만 점진. shadcn CLI 도입은 별도 PRD (§9 OPEN QUESTION q3).
- **시안의 motion / framer-motion / canvas-confetti 등 의존성 도입** — 비도입.
- **streaming 응답** — `/analyze` 의 단일 응답 흐름 유지. streaming 은 PRD `analyze-streaming` 영역.
- **i18n** — 한글 카피 유지. 다국어 도입 미실행.
- **E2E / 시각 회귀 자동화** — 수동 QA 라운드트립으로 검증.
- **로고 / 아이콘 / 이미지 에셋 신규 제작** — 본 PRD 는 텍스트 로고 ("FinSight") 만. SVG 로고 / favicon 별도 디자이너 작업.
- **Pretendard self-host vs CDN 결정 외 폰트 도입** — Pretendard 한 폰트만. 보조 폰트 비도입.
- **`/dashboard` 의 실제 보유 자산 트래킹** — mock 만. 실제 거래소 연동 후 별도 PRD.
- **`/watchlist` 의 알림 기능** — placeholder UI 만. 실제 알림은 별도 PRD.

## 5. 수용 기준 (AC)

각 영역 별로 검증 가능한 명령 + 기대 결과.

### 5.1 Phase 1 — Tailwind v4 마이그레이션 (PR1)

- **AC-V4-1**: `npm ls tailwindcss` 결과 v4.x.
- **AC-V4-2**: `npm ls @tailwindcss/postcss` 결과 1개 이상.
- **AC-V4-3**: `app/globals.css` 의 첫 줄이 `@import "tailwindcss";` (또는 등가 v4 컨벤션). `@tailwind base;` 등 v3 디렉티브 0건.
- **AC-V4-4**: `postcss.config.mjs` 가 `@tailwindcss/postcss` 플러그인 호출. `tailwindcss` 직접 호출 0건.
- **AC-V4-5**: `tailwind.config.ts` 의 `theme.extend` 패턴 + `tailwind.theme.json` import 무회귀. `git diff tailwind.config.ts` 가 v4 호환 변환만 포함.
- **AC-V4-6**: `@config "../tailwind.config.ts"` 디렉티브가 `app/globals.css` 안에 존재 (JS 어댑터 다리).
- **AC-V4-7**: `npm run build` 0 에러. `.next/` 산출물 정상 생성.
- **AC-V4-8**: 현 `/` 화면 (워크벤치) 시각 회귀 0 — 라운드트립 5건 양 뷰포트. QA 리포트 스크린샷.

### 5.2 Phase 1 — DESIGN.md v8 (PR2)

- **AC-V8-1**: `docs/design/finsight-redesign.md` 파일 존재. DESIGN.md 포맷 (`docs/rules/design-md.md`) 정합.
- **AC-V8-2**: `npx @google/design.md lint` errors=0 warnings=0.
- **AC-V8-3**: colors front matter 에 다음 신규 토큰 키 ≥6 개 추가: `signal-up`, `signal-up-soft`, `signal-down`, `signal-down-soft`, `asset-stock`, `asset-coin`, `gradient-ai-from`, `gradient-ai-to` (또는 등가 명명).
- **AC-V8-4**: typography 절에 `font-display` (Pretendard) 토큰 추가 또는 기존 fontFamily 토큰의 첫 패밀리가 `Pretendard`.
- **AC-V8-5**: prose 에 "한국식 색 컨벤션" 단락 ≥1 + "자산 식별 색" 단락 ≥1 + "Pretendard 도입" 단락 ≥1.
- **AC-V8-6**: 신·구 팔레트 비교 표 — v7 rev2 hex → v8 hex / 신규 추가 / 사용처 갱신. ≥10 행.
- **AC-V8-7**: WCAG AA 4.5:1 대비비 표 — 신규 토큰 포함 ≥14 쌍. 모두 4.5:1 이상.
- **AC-V8-8**: `npm run design:sync` 재실행 후 `tailwind.theme.json` 이 v8 토큰으로 동기화. `package.json` 의 design:sync source 가 `finsight-redesign.md`.
- **AC-V8-9**: `tailwind.theme.json` 에 신규 토큰 키 ≥6 개 존재.
- **AC-V8-10**: 합성 토큰 cascade — `git grep -nE "#[0-9a-fA-F]{3,6}" app/components.css` 결과 0건 (Tailwind 토큰 함수 호출만). hex / px 직타 무회귀.
- **AC-V8-11**: Pretendard 적용 시각 확인 — dev 화면에서 헤더 / 본문 / 숫자 모두 Pretendard. (CDN vs self-host 결정에 따라 `<link>` 또는 `next/font` 코드 존재.)

### 5.3 Phase 2 — Layout shell (PR3)

- **AC-L-1**: `components/layout/Sidebar.tsx` 가 6개 메뉴 항목 (`/dashboard`, `/`, `/analyze`, `/market`, `/watchlist`, `/profile`) 모두 렌더. 활성 라우트 강조.
- **AC-L-2**: `components/layout/Header.tsx` 가 "FinSight" 브랜드 로고 + 글래스 효과 (backdrop-blur 또는 등가). 모든 라우트에서 sticky.
- **AC-L-3**: `components/layout/BottomNav.tsx` 가 모바일 (md 이하) 에서만 렌더. `useBreakpoint().isMobile` 분기.
- **AC-L-4**: 양 뷰포트 (375 / 1280) 진입 — sidebar (1280) / bottom nav (375) 모두 6 메뉴 클릭 가능.
- **AC-L-5**: `(workbench)` 라우트 그룹명 — 유지 또는 rename 결정 (§9 OPEN QUESTION q5 resolved).

### 5.4 Phase 2 — mock data 폴더 (PR4)

- **AC-M-1**: `lib/mock/` 폴더 신설. 하위에 `dashboard/`, `home/` (또는 `analysisDashboard/`), `market/`, `watchlist/`, `profile/` 폴더 각각 존재.
- **AC-M-2**: 각 mock 파일이 `lib/types/<domain>/*.ts` 의 타입을 import 해서 작성. mock 데이터 타입 정합.
- **AC-M-3**: `lib/mock/<domain>/index.ts` barrel 0건 (또는 §9 OPEN QUESTION q2 resolved 에 따라 결정).
- **AC-M-4**: `lib/mock/` 폴더 안 사용자 노출 한글 카피 0건. 카피는 `lib/copy/<domain>/` 분리.
- **AC-M-5**: `docs/rules/frontend.md` 의 "폴더 구조 — 도메인 한 뎁스" 절에 mock 폴더 위치 1줄 추가.
- **AC-M-6**: `package.json` 의 dependencies 에 `lucide-react` + `recharts` 추가. 그 외 시안 의존성 (motion / framer / canvas-confetti / Radix 풀세트 등) 0건.

### 5.5 Phase 2 — `/analyze` 라우트 이전 (PR5)

- **AC-A-1**: `/analyze` 진입 시 현 `/` 의 워크벤치 화면 그대로 렌더.
- **AC-A-2**: `POST /api/workbench/analyze` 호출 무회귀. 라운드트립 5건 (AAPL · BTC-USD · 비분할가능 · 화이트리스트 비매칭 · 5xx 폴백) 양 뷰포트 무회귀.
- **AC-A-3**: `app/page.tsx` 가 본 PRD 머지 후 워크벤치 코드 제거 (PR6 의 AnalysisDashboard 로 교체).
- **AC-A-4**: 도메인 폴더 (`components/workbench/`, `hooks/workbench/`, `lib/api/workbench/`) — §9 OPEN QUESTION q5 resolved 에 따라 유지 또는 rename. resolved 결과 commit log 에 명시.
- **AC-A-5**: 사이드바 / bottom nav 의 "분석" 메뉴가 `/analyze` 로 라우팅.

### 5.6 Phase 2 — Home / Dashboard / Market / Watchlist / Profile (PR6~PR9)

- **AC-PAGE-1**: 각 화면이 6 메뉴 진입 가능. 빈 화면 / 404 0건.
- **AC-PAGE-2**: 모든 화면이 자산 식별 토큰 (`asset-stock` / `asset-coin`) 일관 적용 (해당 데이터가 있는 경우).
- **AC-PAGE-3**: 모든 화면이 한국식 등락 토큰 (`signal-up` / `signal-down`) 일관 적용 (해당 데이터가 있는 경우).
- **AC-PAGE-4**: AI 영역 (Home 의 AI 분석 카드, `/analyze` 의 분석 결과 헤더 등) 이 `gradient-ai-from` → `gradient-ai-to` 그라데이션 토큰 적용.
- **AC-PAGE-5**: Pretendard 폰트 일관 — 모든 화면.
- **AC-PAGE-6**: 차트 (가격 / 지수) 가 `recharts` 로 구현. mock 데이터 시각 정상.
- **AC-PAGE-7**: 모바일 (375) 에서 모든 화면 정보 밀도 정합 — 한 화면 안 정보가 겹치지 않음.
- **AC-PAGE-8**: 데스크탑 (1280·1920) 에서 12-col grid 활용. `/watchlist` 의 테이블이 12-col 정합.

### 5.7 공통

- **AC-COMMON-1**: 모든 PR 에서 `npm run typecheck` 0 에러.
- **AC-COMMON-2**: 모든 PR 에서 `npm run lint` 0 에러.
- **AC-COMMON-3**: 모든 PR 에서 `npm run build` 0 에러.
- **AC-COMMON-4**: BFF 패턴 무회귀 — `git grep -nE "fetch\(" -- app/ components/ hooks/ lib/` 결과 route handler 안만 존재.
- **AC-COMMON-5**: 한글 카피 톤 무회귀 — 사용자 노출 문구 한글 유지. `lib/copy/<domain>/` 패턴 무회귀.
- **AC-COMMON-6**: 컨벤션 8개 절 (`docs/rules/frontend.md`) 무회귀 — 카멜케이스 / 커스텀훅 의무화 / 도메인 한 뎁스 / cn / layout.tsx / copy / queryKeys / 반응형.
- **AC-COMMON-7**: hex/px 직타 무회귀 — `git grep -nE "#[0-9a-fA-F]{3,6}" -- app/components.css app/globals.css` 결과 0건. `style={{...}}` 안 hex/px 직타 0건 (동적 계산 예외).
- **AC-COMMON-8**: hydration mismatch 콘솔 경고 0건.
- **AC-COMMON-9**: 시리즈 슬러그 일관 — 모든 PR 의 브랜치명 `feature/finsight-redesign-<phase>` 형태 또는 단일 `feature/finsight-redesign` 누적 push. `[OPEN QUESTION] q4` resolved 에 따라 결정.

## 6. 가정 · 제약

### 6.1 가정

- PR #6 ~ #25 모두 머지되어 있고 main 이 `cf5f1ca` 기준이다.
- 시안 (`Stock and Coin Analysis App/`) 은 본 저장소에 commit 된 상태. 본 PRD 머지 후 별도 cleanup PR 로 제거 (또는 `.gitignore` 추가) 결정 — 본 PRD 무관.
- 사용자 = 한국 개인 투자자. 주식 + 코인 멀티 자산. 모바일 (md 이하) + 데스크탑 (lg 이상) 동등 사용.
- `/analyze` 의 실제 BE 호출 (`POST /api/workbench/analyze`) 은 PR #23 의 adapter 인터페이스 그대로. 본 PRD 무수정.
- 5개 mock 화면 (Dashboard / Home / Market / Watchlist / Profile) 의 BE 연결은 별도 PRD 머지 후 진행.
- Pretendard 폰트 라이선스 = OFL (자유 사용). CDN 또는 self-host 결정만 (§9 OPEN QUESTION q6).
- 시안의 컴포넌트 마크업·스타일은 본 저장소 컨벤션 안에서 재구현. 그대로 복붙 안 함.
- DESIGN.md v8 = v7 rev2 의 13 토큰 셋 + 신규 ≥6 토큰. 총 ≥19 토큰. cascade 영향은 v8 sync 후 합성 토큰 재검증으로 흡수.
- 한 작업 한 PR 룰 본 작업 한정 해제 (사용자 동의 2026-05-23). 다른 작업엔 그대로 룰 적용.
- 시리즈 슬러그 `finsight-redesign` 하위 9개 PR — 각 PR 의 PRD 본문 발췌 + HANDOFF entry 가 자동으로 같은 슬러그로 묶임.

### 6.2 제약

- **시안 의존성 풀 도입 금지** — `lucide-react` + `recharts` + (필요 시) 점진적 Radix 컴포넌트만. shadcn CLI / motion / framer / canvas-confetti / Radix 풀세트 0건.
- **CSS-first Tailwind v4 도입 금지** — DESIGN.md → `tailwind.theme.json` 어댑터 단일 진실 원천 유지. `@theme inline` / `@utility` 비도입.
- **`/analyze` 의 BE 호출 흐름 변경 0건** — PR #23 adapter 인터페이스 / route handler / FASTAPI_BASE_URL 무수정.
- **컨벤션 8개 절 무회귀** — 본 PRD 가 컨벤션 위반 금지. 단 mock data 폴더 표준 추가는 컨벤션 1줄 보강.
- **shadcn 풀세트 비도입** — 본 PRD 한정. 후속 PRD 에서 결정.
- **PRD docs-only PR 생성 금지** — 본 PRD 는 `feature/finsight-redesign-phase1-v4` (또는 등가) 첫 commit 으로 묻어 들어감. AGENTS.md 룰.
- **사용자 노출 한글 카피 톤 무회귀** — `lib/copy/<domain>/` 패턴 유지.
- **mock data 안 사용자 노출 한글 카피 직접 작성 금지** — 카피는 `lib/copy/<domain>/`. mock 은 데이터·숫자·ticker 만.
- **WCAG AA 4.5:1 무회귀** — DESIGN.md v8 prose 의 대비비 표 게이트.

## 7. 참고

- `docs/prd/design-tone-refinement.md` — PR #25 PRD (v7 rev2). 본 PRD 의 v8 출발점.
- `docs/prd/tailwind-migration.md` — PR #12 PRD (v3 정착). 본 PRD 의 v4 마이그레이션 컨텍스트.
- `docs/prd/layout-redesign.md` — PR #21 PRD (3-section shell). 본 PRD 의 layout shell base.
- `docs/prd/component-compactness.md` — PR #22 PRD. 본 PRD 무영향.
- `docs/prd/claude-cli-analysis.md` — PR #23 PRD (adapter). `/analyze` 라우트 이전 시 무회귀 base.
- `docs/prd/polish-followups.md` — PR #24 PRD. 본 PRD 무영향.
- `docs/prd/palette-modernization.md` — DESIGN.md v3~v6 정착 PRD.
- `docs/design/design-tone-refinement.md` — DESIGN.md v7 rev2 (PR #25). 본 PRD v8 출발점.
- `docs/rules/frontend.md` — 컨벤션 8개 절. 본 PRD 에서 mock 폴더 표준 1줄 추가.
- `docs/rules/design-md.md` — DESIGN.md 포맷 가이드.
- `AGENTS.md` — 작업 원칙·라벨 흐름·한 작업 한 PR 룰 (본 작업 한정 해제).
- `Stock and Coin Analysis App/` — 사용자 직접 제작 시안 (Figma Make export). 5개 화면 + shadcn/ui 풀세트.
- `tailwind.config.ts` / `tailwind.theme.json` / `scripts/inject-breakpoints.mjs` — 어댑터 파이프라인.
- `app/globals.css` / `app/components.css` — Tailwind 디렉티브 + 합성 토큰.
- Pretendard 공식: <https://github.com/orioncactus/pretendard>
- Tailwind v4 마이그레이션 가이드: <https://tailwindcss.com/docs/upgrade-guide>
- lucide-react: <https://lucide.dev/guide/packages/lucide-react>
- recharts: <https://recharts.org/>

## 8. 영향 분석

### 8.1 변경 영역 (PR 별)

| PR | 영역 | 변경 파일 | 추정 라인 | 위험 |
|---|---|---|---|---|
| PR1 | Tailwind v4 마이그레이션 | `package.json` / `postcss.config.mjs` / `app/globals.css` / `tailwind.config.ts` | 30~80L | 중간 (메이저 버전, 어댑터 다리) |
| PR2 | DESIGN.md v8 + 합성 토큰 cascade | `docs/design/finsight-redesign.md` 신설 / `package.json` design:sync source / `scripts/inject-breakpoints.mjs` DESIGN_PATH / `tailwind.theme.json` / `app/globals.css` / `app/components.css` / Pretendard 임포트 | 350~550L (DESIGN.md 본문 + cascade) | 중간 (토큰 키 셋 변경 + Pretendard 도입) |
| PR3 | Layout shell (6 메뉴) | `components/layout/Sidebar.tsx` 갱신 / `components/layout/Header.tsx` 신설 또는 갱신 / `components/layout/BottomNav.tsx` 신설 / `app/(workbench)/layout.tsx` (또는 rename 후) | 200~350L | 낮음~중간 |
| PR4 | mock data 폴더 + 의존성 | `lib/mock/<domain>/*` 5 도메인 / `package.json` (lucide-react + recharts) / `docs/rules/frontend.md` | 250~450L | 낮음 (격리된 데이터 + 의존성 2건) |
| PR5 | `/analyze` 라우트 이전 | `app/page.tsx` (워크벤치 코드 제거) / `app/analyze/page.tsx` (신설 또는 이동) / `app/(workbench)/` 라우트 그룹 정리 / 도메인 폴더 (검토 후 유지 또는 rename) | 100~250L (대부분 이동 / 라우트 변경) | 중간 (실제 API 호출 흐름 보존 필요) |
| PR6 | Home (AnalysisDashboard mock) | `app/page.tsx` 신규 + `components/home/*` (또는 `components/analysisDashboard/*`) + `lib/mock/home/*` 활용 | 400~700L | 낮음 (mock 화면) |
| PR7 | Dashboard (포트폴리오) | `app/dashboard/page.tsx` + `components/dashboard/*` + mock 활용 | 250~450L | 낮음 |
| PR8 | Market (시장 동향) | `app/market/page.tsx` + `components/market/*` + mock 활용 | 250~450L | 낮음 |
| PR9 | Watchlist + Profile | `app/watchlist/page.tsx` + `app/profile/page.tsx` + `components/watchlist/*` + `components/profile/*` + mock 활용 | 350~600L | 낮음~중간 (두 화면 묶음, 분량 따라 재분할 가능) |

**총 변경 라인 추정**: 2,180~3,880L (시리즈 9 PR 합산). 단일 PR 평균 240~430L.

### 8.2 회귀 위험

- **Tailwind v4 메이저 버전** — `@tailwindcss/postcss` 가 흡수하지 못하는 v3 컨벤션 (예: `@tailwind` 디렉티브) 잔존 시 빌드 실패. PR1 의 build 검증 + dev 화면 시각 비교 게이트.
- **DESIGN.md v8 cascade** — 신규 토큰 ≥6 + 사용처 룰 변경 (info / critical / warn 의미 재할당) 시 합성 토큰의 시각 의도 어긋남 가능. v8 prose 의 사용처 룰 단락 + WCAG AA 표 무회귀 강제.
- **Pretendard 도입 — FOUT / FOIT** — CDN 채택 시 첫 페인트에서 fallback 폰트 → Pretendard 교체 깜빡임 가능. `next/font` self-host 채택 시 거의 없음. §9 OPEN QUESTION q6 결정.
- **라우트 `/` → `/analyze` 분리** — 현 워크벤치 화면이 root 였으나 root 가 분석 대시보드 mock 으로 교체. SEO / 외부 링크 / 북마크 영향 가능 (현재 운영 단계 아님이므로 위험 낮음).
- **도메인 폴더 `workbench` 유지 vs `analyze` rename** — rename 시 import 경로 전체 갱신 + git history 단절 위험. PM 권고: 유지 (§9 OPEN QUESTION q5).
- **mock data 폴더 표준 신설** — `docs/rules/frontend.md` 1줄 추가만으로 흡수. 위험 낮음.
- **PR 분할 한 작업 한 PR 룰 해제** — 본 작업 한정. 다른 작업에 영향 0. AGENTS.md 본문은 무수정 — 본 PRD 의 §6.2 가정에서 1회 명시.
- **시안 의존성 풀 도입 시 bundle size 증가** — `lucide-react` + `recharts` 외 비도입 강제. PM 게이트.
- **5개 mock 화면 → BE 전환 시 mock 코드 dead** — 본 PRD 의 후속 PRD 머지 시점에 mock 코드 제거 또는 fixture 재활용. 본 PRD 무관.
- **시안의 인라인 mock 이전 누락 / 타입 불일치** — `lib/types/<domain>/*.ts` 정합 강제. PR4 의 AC-M-2 게이트.
- **9개 PR 순차 진행 시 stale main 충돌** — 각 PR 머지 후 다음 PR 의 base 갱신. branch rebase 자연 흡수.

### 8.3 라벨 흐름 (PR 시리즈 9개 각각)

- `impl-ready` (각 PR 의 UX Designer + FE Dev commit 후)
- `qa-passed` (각 PR 의 QA 리포트 push 후 → `handoff-append.yml` 자동 append)
- `review-approved` (Reviewer)
- 머지

**HANDOFF entry 9건** — 각 PR 별로 자동 생성. 시리즈 슬러그 `finsight-redesign` 으로 묶임.

### 8.4 PR 시리즈 묶음 vs 분할 사유

본 PRD 가 한 PRD 안 9개 PR 을 묶는 사유:

- 단일 PRD 로 묶는 이유 — 9 PR 모두 동일 슬러그 `finsight-redesign` 의 의도 (브랜드 / 한국식 색 / Pretendard / 6 라우트) 안에서 동작. 디자이너 산출물 (DESIGN.md v8) 1회 + FE 라우트 / 컴포넌트 이전 6회 + 검증 9회로 정리됨.
- 분할 PRD 로 두지 않는 이유 — 각 PR 의 변경 영역이 의존적 (PR1 v4 없으면 PR2 토큰 동기화 못 함, PR2 토큰 없으면 PR3~PR9 모든 화면 cascade 안 됨). PRD 단위로 분할하면 PRD 간 의존 그래프 관리 비용 > 단일 PRD 의 §3.3 Phase 분할 비용.
- **단일 PRD 결정** — §9 OPEN QUESTION q4 의 PM 권고 채택.

## 9. OPEN QUESTION

각 질문에 PM 권고 동봉. 사용자 / 디자이너 결정 후 `[RESOLVED]` 로 갱신.

- `[OPEN QUESTION] q1 — 사이드바 메뉴 6개 vs 5개 (분석 영역 통합)`

  현재 안 = 6개 메뉴 (`/dashboard`, `/`, `/analyze`, `/market`, `/watchlist`, `/profile`). `/` (종목 분석 mock) 과 `/analyze` (실분석) 가 시각적으로 비슷한 정보를 다뤄 사용자 혼동 가능.

  - **옵션 A**: 6 메뉴 유지 + 두 화면을 명확히 다른 의도로 분리. `/` 는 정보 탐색·시뮬레이션, `/analyze` 는 실제 매수/매도 판단. 메뉴 라벨로 구분 ("종목 탐색" / "AI 분석").
  - **옵션 B**: 5 메뉴 통합 + 한 화면 (`/analyze` 또는 `/explore`) 안에 "탐색" / "실분석" 탭 분리. 사이드바 단순.
  - **PM 권고**: **옵션 A** (6 메뉴 유지). 시안의 5 화면 + `/analyze` 분리 의도 그대로 살리고, 사용자가 두 흐름을 별도 routing 으로 인식. 메뉴 라벨이 핵심.

- `[OPEN QUESTION] q2 — mock 데이터 위치: `lib/mock/<domain>/<file>.ts` vs `lib/mock/<domain>/index.ts` 단일`

  현재 안 = 도메인 별 폴더 + 의미 단위 분할 파일 (`portfolio.ts` / `holdings.ts` 등). 페이지별 분산.

  - **옵션 A**: 도메인 폴더 + 의미 단위 파일 분할. `lib/mock/dashboard/portfolio.ts`, `holdings.ts`, `fearGreed.ts`. 컴포넌트는 필요한 파일만 직접 import. (`docs/rules/frontend.md` barrel 금지 정합.)
  - **옵션 B**: 도메인 별 단일 `index.ts`. `lib/mock/dashboard/index.ts` 가 모든 mock 을 export. 컴포넌트는 `import { portfolio, holdings } from "@/lib/mock/dashboard"`.
  - **PM 권고**: **옵션 A**. 컨벤션 (`docs/rules/frontend.md` 의 barrel 금지) 정합. tree-shaking + grep 신뢰도. 의미 단위로 분리하면 mock 추가·교체 비용 낮음.

- `[OPEN QUESTION] q3 — shadcn/ui 풀세트 도입 vs 점진 도입`

  시안은 shadcn/ui 풀세트 (40+ 컴포넌트). 본 PRD 가 풀세트를 한 번에 도입 vs 필요한 것만 점진.

  - **옵션 A**: shadcn CLI 도입 + 필요 시 컴포넌트 추가 (`npx shadcn-ui add button` 등). 표준화 + 빠른 도입.
  - **옵션 B**: `lucide-react` + `recharts` + 필요한 Radix 컴포넌트 (예: `@radix-ui/react-tabs`) 만 직접 도입. 본 저장소 컨벤션 안에서 컴포넌트 자체 작성. 본 저장소의 토큰 / Tailwind 정합 강제.
  - **옵션 C**: 풀세트 한 번에 + 본 저장소 토큰 cascade 적용.
  - **PM 권고**: **옵션 B** (점진 도입). 본 저장소의 `lib/copy/` / `cn` / 컨벤션 8개 절 정합이 더 중요. shadcn 풀세트는 본 저장소 컨벤션과 별도 톤 (예: shadcn 의 `cn` 헬퍼 vs 본 저장소 `lib/utils/cn.ts`) — 통합 비용이 더 큼. 본 PRD 가 컨벤션 안에서 컴포넌트 작성하는 편이 후속 유지보수 비용 낮음.

- `[OPEN QUESTION] q4 — 단일 PRD vs Phase 별 분리 PRD`

  현재 안 = 단일 PRD (`docs/prd/finsight-redesign.md`) + §3.3 의 Phase 분할 (9 PR).

  - **옵션 A**: 단일 PRD + 9 PR. 의도가 한 흐름이고 PR 간 의존 그래프 명확.
  - **옵션 B**: Phase 1 PRD (`finsight-redesign-phase1`) + Phase 2 PRD (`finsight-redesign-phase2`) 분리. Phase 1 머지 후 Phase 2 PRD 작성 진입.
  - **옵션 C**: PR 1개당 PRD 1개 (9 PRD). 가장 세분화.
  - **PM 권고**: **옵션 A** (단일 PRD). §8.4 의 사유 — 9 PR 모두 동일 의도 + 의존적. PRD 분할이 추적 비용 증가. 단 본 PRD 가 길어지므로 Phase 2 진입 전 사용자 / 디자이너가 §3.3 의 Phase 2 분할을 다시 확인하는 1단계 권장.

- `[OPEN QUESTION] q5 — workbench 도메인 폴더명 유지 vs `analyze` rename`

  현재 = `components/workbench/`, `hooks/workbench/`, `lib/api/workbench/`, `lib/types/workbench/`, `lib/copy/workbench/`. 라우트만 `/analyze` 로 이동 시 도메인 폴더명과 라우트명 불일치.

  - **옵션 A**: 도메인 폴더명 유지 (`workbench`). 라우트만 `/analyze`. 컨벤션의 "도메인 폴더명 = 비즈니스 도메인 단위" 정합 — workbench (작업대) 가 비즈니스 도메인이고 `/analyze` 는 그 화면 URL.
  - **옵션 B**: `analyze` 로 rename. 라우트명 = 도메인 폴더명. 일관성. 단 git history 단절 + import 경로 전체 갱신 비용.
  - **PM 권고**: **옵션 A** (유지). `docs/rules/frontend.md` 컨벤션 의도 — "도메인 폴더명은 비즈니스 도메인 단위로 통일. 한 화면이 여러 도메인을 호출하더라도 폴더는 비즈니스 단위 그대로". 라우트 변경 = URL 의도 변경, 폴더 변경 = 도메인 의도 변경. 두 변경의 결합도 낮음. 또한 후속 (예: `/analyze` + `/analyze/streaming` 두 라우트가 한 workbench 도메인 호출) 시 폴더명 유지가 자연.

- `[OPEN QUESTION] q6 — Pretendard CDN 임포트 vs `next/font` self-host`

  Pretendard 도입 방식.

  - **옵션 A** — CDN: `<link>` 한 줄 추가. 빠르고 간단. FOUT (Flash Of Unstyled Text) 발생 가능. 외부 CDN 의존.
  - **옵션 B** — `next/font/local` + Pretendard subset woff2 self-host. FOUT 거의 없음. 빌드 산출물에 포함. 폰트 파일 ~수백KB.
  - **옵션 C** — `next/font/google` — Pretendard 가 Google Fonts 등록 후 시점. 작성일 기준 미등록 (확인 필요).
  - **PM 권고**: **옵션 B** (`next/font/local` + Pretendard subset). FOUT 없음 + 외부 의존 0 + Next.js 의 폰트 최적화 (preload / font-display swap / size-adjust) 자동. 폰트 파일 크기는 `subset` (Korean-Hangul + Latin) 으로 ~100KB 안으로 흡수 가능. CDN 은 운영 안정성 위험 (CDN downtime 시 fallback).

- `[OPEN QUESTION] q7 — PR9 (Watchlist + Profile) 묶음 vs 분할`

  현재 안 = PR9 단일 (두 화면 묶음).

  - **옵션 A**: 단일 PR9. 두 화면 모두 mock + 작은 분량 (각 250~300L).
  - **옵션 B**: PR9 (Watchlist) + PR10 (Profile) 분할. 한 PR 변경량 가장 작게.
  - **PM 권고**: **옵션 A** (묶음 유지). 두 화면이 모두 mock 만 다루고 BE 호출 0. 분할 시 PR 메타 비용 (PR 본문 / QA 리포트 / HANDOFF entry / reviewer 사이클) 이 변경 비용보다 큼. 단 PR9 구현 중 분량이 600L 초과 시 PR9 (Watchlist) + PR10 (Profile) 즉시 분할 (FE Dev 판단).

- `[OPEN QUESTION] q8 — 시안 (`Stock and Coin Analysis App/`) 폴더 처리`

  본 PRD 머지 후 시안 폴더 처리.

  - **옵션 A**: 시안 폴더 유지. 향후 디자인 참고용 reference.
  - **옵션 B**: 본 PRD 시리즈 머지 후 별도 cleanup PR 로 제거. repo size 감소.
  - **옵션 C**: `.gitignore` 추가 + 로컬 보관. 다른 개발자가 다시 받지 않도록.
  - **PM 권고**: **옵션 B**. 본 PRD 시리즈 (PR1~PR9) 모두 머지 후 별도 chore PR (`chore: remove figma make export after finsight-redesign`) 로 폴더 제거. PR9 머지 직후 자연 시점.

- `[OPEN QUESTION] q9 — Phase 2 의 화면 순서 (PR6 Home vs PR7 Dashboard 우선순위)`

  현재 안 = PR6 Home → PR7 Dashboard → PR8 Market → PR9 Watchlist+Profile.

  - **옵션 A**: Home 우선 (현재 안). 사용자가 진입 후 첫 화면이 자연. 시각 임팩트 강함.
  - **옵션 B**: Dashboard 우선. 포트폴리오 hero 가 사용자 가치 첫 노출.
  - **옵션 C**: `/analyze` 가 이미 PR5 에서 정착하므로 Home / Dashboard 순서 무관.
  - **PM 권고**: **옵션 A** (Home 우선). 사용자가 진입 후 보는 첫 화면 (`/`) 이 가장 임팩트 있어야 함. Dashboard 는 보유 자산이 있어야 의미가 살아 — mock 단계에서는 Home 의 정보 탐색이 더 자연.

- `[OPEN QUESTION] q10 — Tailwind v4 의 시안 CSS-first 패턴 흡수 정도`

  시안은 v4 의 `@theme inline` / `@utility` / `@source` 디렉티브 활용. 본 PRD 의 어댑터 단일 진실 원천 룰과 충돌 가능.

  - **옵션 A**: 어댑터 단일 진실 원천 강제. 시안의 CSS-first 패턴 0건 도입. v4 의 메이저 기능 (CSS 변수 자동 export / 색 함수 등) 만 흡수.
  - **옵션 B**: 어댑터 + CSS-first 혼용. DESIGN.md → `tailwind.theme.json` 으로 토큰은 동기화하되, 컴포넌트 단위 utility (예: `@utility scrollbar-hide`) 는 CSS 안에 직접 작성.
  - **옵션 C**: CSS-first 전면 전환. `tailwind.theme.json` 폐기 + `@theme inline` 으로 토큰 직접 작성.
  - **PM 권고**: **옵션 A** (어댑터 단일 진실 원천 유지). DESIGN.md → `tailwind.theme.json` 어댑터가 디자이너·FE 의 단일 진실 원천 + `design:sync` 파이프라인의 자동화 가치 큼. CSS-first 는 디자이너 산출물의 단일 진실 원천 룰을 깨뜨림. v4 의 다른 기능 (CSS 변수 자동 export 등) 은 어댑터 위에서 자연 호환.
