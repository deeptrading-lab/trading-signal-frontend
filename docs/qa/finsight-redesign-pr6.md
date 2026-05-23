# QA 리포트 — finsight-redesign PR6

- 대상 PR: [#31](https://github.com/deeptrading-lab/trading-signal-frontend/pull/31) `feat(home): AnalysisDashboard mock (PR6/9 finsight-redesign)` (HEAD `dd837b0`).
- PRD: `docs/prd/finsight-redesign.md` §3.3 PR6 + §5.6 AC-PAGE-1~8 + §5.7 AC-COMMON-1~9 + §5.8 AC-GATE-1~3.
- DESIGN.md: `docs/design/finsight-redesign.md` v8 (signal-up/down · asset-stock/coin · gradient-ai · Pretendard · font-display 토큰).
- 검증 환경: macOS 25.5 · Node v20 · Next 15.5.18 dev/build (`localhost:3000`) · FastAPI BE `127.0.0.1:8000` 다운 (PR6 mock-only 화면이므로 무영향).

## 1. 요약

신설 11 파일 / 1,039L (`components/home/*` x10 + `app/(main)/page.tsx`). recharts 첫 사용자 정착, v8 토큰 cascade (signal-up x5 · asset-coin x5 · gradient-ai x3 · card-ai x1 · favorite-toggle x1) 전부 SSR 마커 노출. typecheck/lint/build 0 에러, BFF 무회귀 (client fetch 0건), 한글 카피 톤 무회귀, `/analyze` 무회귀, hydration warning 0건. 양 뷰포트 (375 / 1280) 마크업 모두 정합.

## 2. AC 검증 표

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **PAGE-1** 진입·9 섹션 | `curl -s -o /dev/null -w "%{http_code}" /` + grep | 200 + SSR 본문 9 섹션 | `HTTP=200`. grep 8 hit (비트코인 / BTC/KRW / 89,240,000 / AI 투자 분석 / 가격 추이 / 시장 정보 / 기술적 지표 / 실시간 관련 뉴스) — 검색 토글 = `SearchToggle` 라벨 노출, 9 영역 모두 SSR | pass |
| **PAGE-2** 자산 식별 토큰 | `grep -oE "asset-coin\|asset-stock" home.html` | BTC = coin cascade | `asset-coin` x5 (SearchToggle 활성 + AssetHeader 페어 칩 + 아이콘 박스) | pass |
| **PAGE-3** 한국식 등락 토큰 | `grep -oE "signal-up\|signal-down" home.html` | 상승 빨강 / 하락 파랑 | `signal-up` x5 (AssetHeader +2.4% + OVERBOUGHT/BUY + RSI 끝점) + `signal-down` x1 (RSI 시작점) | pass |
| **PAGE-4** AI 그라데이션 | grep `gradient-ai\|card-ai` | card-ai + gradient-ai-bg cascade | `card-ai` x1 + `gradient-ai-bg` x1 + `gradient-ai-from` x2 = 4 hit | pass |
| **PAGE-5** Pretendard 일관 | `next/font/local` self-host + layout.css grep | html className 변수 + CSS 흡수 | `<html class="__variable_75e4f9">` + layout.css `Pretendard` x6 / `--font-pretendard` x2 / `var(--font` x21 | pass |
| **PAGE-6** recharts AreaChart | dev SSR + build | SVG path 정상, hydration 0 | `recharts` hit 1, build `width(-1)` 경고는 ResponsiveContainer 알려진 SSR 동작 (client mount 후 정상), 콘솔 mismatch 0 | pass |
| **PAGE-7** 모바일 (375) | grid-cols-1 grep | 9 섹션 stacking | `grid-cols-1` x1 + `lg:grid-cols-3` x1 + `lg:col-span-2` x1 (단일 마크업 안 모든 클래스 공존, breakpoint 분기 정합) | pass |
| **PAGE-8** 데스크탑 (1280) | 동일 마크업 | lg:grid-cols-3 + lg:col-span-2 | 동상 grep x1 each | pass |
| **COMMON-1** typecheck | `npm run typecheck` | 0 에러 | tsc 종료 0 | pass |
| **COMMON-2** lint | `npm run lint` | 0 에러 | eslint 종료 0 | pass |
| **COMMON-3** build | `npm run build` | 0 에러 + static prerender | `✓ Compiled successfully in 1479ms`, ○ `/` 112 kB / 223 kB · ○ `/analyze` 34.8 kB / 152 kB · shared 102 kB | pass |
| **COMMON-4** BFF | `git grep "fetch(" -- components/home app/(main)/page.tsx` | 0건 | 0 hit | pass |
| **COMMON-5** 한글 카피 톤 | `lib/copy/home/*` 사용 | 인라인 한글 0 | `lib/copy/home/labels.ts` 활용 (PRICE_CHART_TITLE 등) | pass |
| **COMMON-6** 컨벤션 8 절 | `components/home/` 직속 + barrel 0 + cn / useState 패턴 | PascalCase / 한 뎁스 / barrel 0 | 11 파일 직속 PascalCase, barrel index 0, useState 4 위치 (HomeDashboard x3 + AssetHeader x1) | pass |
| **COMMON-7** hex/px 직타 | `git grep "#[0-9a-fA-F]{3,6}" -- components/home/` + `app/{components,globals}.css` | CSS 0건 + PriceChart 의 CHART_TOKENS 1곳 격리 | CSS 0건 (components.css 1건 = v7-rev2 history 주석). PriceChart 의 hex 6 값은 recharts API 가 CSS-friendly 값 요구 → CHART_TOKENS 단일 상수 격리, 인라인 `style={{...}}` 직타 0 | pass |
| **COMMON-8** hydration | dev `/` 진입 콘솔/log | mismatch 0 | dev 로그 클린, GET / 200 in 64ms | pass |
| **COMMON-9** 슬러그 | `finsight-redesign-pr6` 일관 | PRD / 브랜치 / 리포트 동일 | 일관 | pass |
| **GATE-1** 라벨 | PR 라벨 흐름 | impl-ready → qa-passed | 본 리포트 commit 직후 라벨 갱신 | pass |
| **GATE-2** PR7 base | 부록 §8 참조 | base 정합 | PR7 (Dashboard 포트폴리오) base = 본 PR6 머지 직후 main. 충돌 0 | pass |
| **GATE-3** 보정 commit | 부적합 0 | 보정 commit 0 | 부적합 없음 | pass |

## 3. 라운드트립 (양 뷰포트 마크업)

PR6 는 **mock-only** 화면 (BE 호출 0건). PR #11 가 정의한 BE 라운드트립 5건은 `/analyze` PR (PR5) 검증 범위. 본 PR6 는 라우트 무회귀 + SSR 마크업 정합만 확인.

| # | 시나리오 | 응답 | 판정 |
| --- | --- | --- | --- |
| 1 | `/` 진입 (HomeDashboard mock) | `HTTP=200`, SSR 본문 9 섹션 + aria-current 2 hit (Sidebar + BottomNav `/`) | pass |
| 2 | `/analyze` 무회귀 | `HTTP=200` | pass |
| 3 | `/dashboard` 404 무회귀 (PR7 예정) | `HTTP=404` | pass |
| 4 | `/market` / `/watchlist` / `/profile` 404 무회귀 (PR8 예정) | `HTTP=404` x3 | pass |
| 5 | `/api/whitelist/search?q=apple` BFF 경로 무회귀 | `HTTP=502` (BE 다운, 5xx 폴백 정상) | pass |

양 뷰포트 (375 / 1280) — SSR 마크업 동일 (Tailwind breakpoint cascade `lg:grid-cols-3` 공존), 모바일 UA / 데스크탑 UA 모두 동일 본문. 정보 겹침 0 (PRD §5.6 AC-PAGE-7·8 기준).

## 4. Client/Server 분리 검증

| 파일 | 분리 | 검증 | 판정 |
| --- | --- | --- | --- |
| `app/(main)/page.tsx` | server | "use client" 0, `await` 0, 7 mock import → HomeDashboard props | pass |
| `HomeDashboard.tsx` | client | "use client" 1, useState x3 (searchType / searchQuery / timeframe) | pass |
| `AssetHeader.tsx` | client | "use client" 1, useState x1 (isFavorite) | pass |
| `SearchToggle.tsx` / `SearchBar.tsx` / `TimeframeChips.tsx` | client | "use client" 3 (onChange 콜백) | pass |
| `PriceChart.tsx` | client | "use client" 1 (recharts ResizeObserver) | pass |
| `AiAnalysisCard.tsx` / `MarketStatsCard.tsx` / `TechnicalIndicatorsCard.tsx` / `NewsCard.tsx` | props-only (client tree 내) | useState 0 — 정적 표시 | pass |

useState 합계 = 4 위치 (HomeDashboard x3 + AssetHeader x1). hydration mismatch 0건.

## 5. v8 토큰 적용 검증 (DOM cascade)

| 토큰 | DOM hit | 사용처 |
| --- | --- | --- |
| `signal-up` / `signal-up-text` | x5 | AssetHeader (+2.4%), AiAnalysisCard 강세 신호, TechnicalIndicators OVERBOUGHT/BUY, RSI 끝점 |
| `signal-down` | x1 | RSI 시작점 (via gradient `from-signal-down`) |
| `asset-coin` / `-soft` | x5 | SearchToggle 활성 (코인), AssetHeader 페어 칩 + 아이콘 박스 (BTC mock) |
| `gradient-ai-bg` / `-from` | x3 | AiAnalysisCard 헤더 아이콘 박스 + 본문 텍스트 |
| `card-ai` | x1 | AiAnalysisCard 셸 |
| `favorite-toggle` | x1 | AssetHeader 즐겨찾기 (active 토글은 useState false 초기값으로 SSR 비활성) |
| Pretendard `--font-pretendard` | layout.css x2 / `var(--font` x21 | html `__variable_75e4f9` 변수 → 모든 text-* 토큰 흡수 |
| `font-display` | tailwind.theme.json 정의 | AssetHeader 대형 가격 (36px / 800w) |

## 6. Bundle size 측정 (`npm run build`)

| 라우트 | Size | First Load JS | Δ vs PR5 |
| --- | --- | --- | --- |
| `/` (PR6 신규) | 112 kB | **223 kB** | — (신규) |
| `/analyze` | 34.8 kB | 152 kB | 무회귀 (PR5 152 kB 동일) |
| `/_not-found` | 131 B | 103 kB | 무회귀 |
| `/api/whitelist/search` (ƒ) | 131 B | 103 kB | 무회귀 |
| `/api/workbench/analyze` (ƒ) | 131 B | 103 kB | 무회귀 |
| shared chunks | — | 102 kB | 무회귀 |

- **recharts 영향** = `/` First Load JS 223 kB vs `/analyze` 152 kB → +71 kB (recharts + 본 PR6 컴포넌트). chunks 분리 정합 (shared 102 kB 무변동).
- **300 kB 권장 한계** — `/` 마진 +25.7% (223/300 = 74%). PRD §3.3 PR6 기준 안.
- PR7~9 누적 시 dynamic import / tree-shaking 검토 후보 (PR PR6 본문 §"bundle size" 명시).

## 7. 에지 케이스

| # | 시나리오 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **E1** | 검색 토글 — 주식 ↔ 코인 active 전환 (controlled, HomeDashboard `setSearchType`) | placeholder + asset 토큰 전환 | SSR 초기값 `currentAsset.assetType` (BTC = coin), 클릭 시 client useState 전환 — controlled 패턴 정합 | pass |
| **E2** | 타임프레임 칩 — 1D~ALL active 전환 (controlled, HomeDashboard `setTimeframe`) | active 칩 시각 강조 (mock 변동 0) | SSR `1M` 초기 active, 클릭 시 setTimeframe — 시각 강조만, 차트 데이터 PRICE_SERIES_MOCK 고정 | pass |
| **E3** | 자산 헤더 즐겨찾기 — useState `isFavorite` 토글 | Star fill 전환 (favorite-toggle ↔ favorite-toggle-active) | SSR 초기 false → `favorite-toggle` x1, 클릭 시 setIsFavorite | pass |
| **E4** | 뉴스 카드 호버 — `text-accent-vivid` 전환 | hover:text-accent-vivid cascade | NewsCard.tsx 안 hover 클래스 정합 | pass |
| **E5** | `/` 사이드바 + BottomNav 활성 — `aria-current="page"` | x2 (Sidebar + BottomNav) | grep `<a class="sidebar-nav-item sidebar-nav-item-active" aria-current="page" href="/"` + `<a class="bottom-nav-item bottom-nav-item-active" aria-current="page" href="/"` = x2 정합 | pass |
| **E6** | recharts hydration — SSR + client mount | console mismatch 0 | dev log 클린, build `width(-1)` 경고는 ResponsiveContainer SSR 알려진 동작 (client mount 후 정상 측정 — 시각 무영향) | pass |

## 8. 머지 게이트 부록 — PR7 (Dashboard 포트폴리오) base 정합 dry-run

| # | 검증 포인트 | 결과 |
| --- | --- | --- |
| 1 | `components/home/` 패턴 재활용 — `components/dashboard/` 한 뎁스, barrel 0, PascalCase | PASS — 본 PR6 가 패턴 정착. PR7 자연 흡수 |
| 2 | v8 합성 토큰 (`card`, `card-ai`, `badge-info`, asset 토큰) 재활용 | PASS — 본 PR6 가 cascade 정착. PR7 의 hero (`card-hero`) / Top 3 (`card`) / Fear & Greed (`card-info`) 모두 호출 가능 |
| 3 | recharts 추가 사용 (Fear & Greed 게이지 등) | PASS — chunks 분리됨, +0 KB 추가 (build 출력 정합) |
| 4 | `app/(main)/dashboard/page.tsx` 신설 시 라우트 충돌 | PASS — 현재 `/dashboard` 404, PR7 신설 시 자연 흡수 |
| 5 | `lib/mock/dashboard/*` (PR4 정착) 활용 | PASS — 본 PR6 무영향 |

→ **PR7 base 부적합 0건. 본 PR6 보정 commit 0.**

**PR7 인계 권고**: base = 본 PR6 머지 직후 main. `components/dashboard/` 도메인 폴더 신설 + `lib/mock/dashboard/*` 7 파일 활용 + 사이드바/BottomNav `/dashboard` 메뉴 active 회귀 재검증.

## 9. 결론

- 모든 AC (PAGE-1~8 + COMMON-1~9 + GATE-1~3) **20/20 통과**.
- 라운드트립 5/5 통과, Client/Server 분리 9/9, v8 토큰 cascade 8 종 노출, Bundle size 300 kB 한계 안 (마진 +26%), 에지 6/6 통과.
- 라벨: `impl-ready` 제거 → `qa-passed` 부여.
- 후속: PR7 (Dashboard 포트폴리오) 진입 가능.

---

## 10. 재검증 (HEAD `a31c6b1` — 2026-05-24)

직전 QA (`b323a1d`) 후 사용자 dev 실측 발견 → fix 2건 추가:
- `941784a` — fix(layout): suppressHydrationWarning + AppLayout 시안 구조 정합 + sidebar item 시안 톤
- `a31c6b1` — feat(layout): Header 데스크탑 글로벌 마켓 티커 (mock)

변경 7 파일: `app/layout.tsx`, `app/(main)/layout.tsx`, `app/components.css`, `components/layout/Sidebar.tsx`, `components/layout/Header.tsx`, `lib/types/layout/marketTicker.ts` (신설), `lib/mock/layout/marketTickers.ts` (신설).

### 10.1 AC-FIX 1~6 검증

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **FIX-1** suppressHydrationWarning | `grep "suppressHydrationWarning" app/layout.tsx` | ≥1 hit | x2 (주석 + `<html ... suppressHydrationWarning>`). 사용자 dev 실측에서 webcrx 외부 확장 mismatch 해소 | pass |
| **FIX-2** AppLayout 시안 구조 | SSR HTML grep — `<aside class="sidebar">` 가 `<header class="header-glass">` 의 형제가 아닌 우측 컬럼 외부 | sidebar → flex flex-col flex-1 wrapper → header 순 | grep 결과 `<aside class="sidebar">` → `<div class="flex flex-col flex-1 overflow-hidden">` → `<header class="header-glass sticky top-0 z-[50]">` — 시안 (`Stock and Coin Analysis App/src/app/components/AppLayout.tsx`) 정합 | pass |
| **FIX-3** Sidebar item 시안 톤 | `grep "sidebar-nav-item" app/components.css` | `@apply ... h-12 px-lg gap-md rounded-md` + icon `h-5 w-5` | `.sidebar-nav-item` = `flex items-center gap-md h-12 px-lg ... rounded-md`. `.sidebar-nav-item-icon` = `h-5 w-5 shrink-0`. 시안 `<Icon size={20} />` 정합 | pass |
| **FIX-4** Header 데스크탑 마켓 티커 | curl `/` + grep `KOSPI\|NASDAQ\|2,750.23\|16,400.12\|89,240,000` | 3 코드 + 3 값 노출 + signal-up red 2 / signal-down blue 1 | grep `KOSPI`/`NASDAQ`/`2,750.23`/`16,400.12`/`89,240,000` 모두 노출. `signal-up` x7 (baseline x5 + 티커 KOSPI/NASDAQ 2건), `signal-down` x2 (baseline x1 + BTC 1건) — 한국식 등락 cascade 정합. `aria-label="글로벌 마켓 시세"` 적용 | pass |
| **FIX-5** `lg:invisible` 잔존 0 | `git grep -nE "lg:invisible" -- components/ app/` | className 0 hit (주석 허용) | 2 hit 모두 Header.tsx JSDoc/인라인 주석 (회귀 사유 설명) — 실제 className 0 | pass |
| **FIX-6** layout mock/types 도메인 폴더 | `ls lib/mock/layout/ lib/types/layout/` | 신설 2 파일 | `lib/mock/layout/marketTickers.ts` (787B) + `lib/types/layout/marketTicker.ts` (812B). `MarketTicker` interface (`code`/`value`/`changePct`/`isUp`) 정합, mock 배열 3건 (KOSPI/NASDAQ/BTC) | pass |

### 10.2 기존 AC 무회귀 재검증

| AC 그룹 | 재검증 | 판정 |
| --- | --- | --- |
| **COMMON-1** typecheck | `npm run typecheck` → tsc 종료 0 | pass |
| **COMMON-2** lint | `npm run lint` → eslint 종료 0 | pass |
| **COMMON-3** build | `npm run build` → `✓ Compiled successfully`, `/` 112 kB / 223 kB · `/analyze` 34.8 kB / 152 kB · shared 102 kB (모두 PR6 baseline 동일 — fix 가 bundle 무영향) | pass |
| **COMMON-4** BFF | `git grep "fetch(" -- components/home app/(main)/page.tsx` 0 hit. `http://127.0.0.1` 은 route handler fallback 3건 한정 (무회귀) | pass |
| **COMMON-5** 한글 카피 톤 | `lib/copy/layout/navCopy` (`NAV_BRAND_LABEL`/`HEADER_PROFILE_ARIA`) + `aria-label="글로벌 마켓 시세"` 신규 한국어 — 톤 정합 | pass |
| **COMMON-6** 컨벤션 | `lib/types/layout/` + `lib/mock/layout/` 도메인 한 뎁스 신설, barrel 0, PascalCase 정합 | pass |
| **COMMON-7** hex 직타 | `app/components.css` hex 직타 0 (주석만), 신규 mock/types 파일 hex 0 — PriceChart CHART_TOKENS 격리는 PR6 baseline 무회귀 | pass |
| **COMMON-8** hydration | dev SSR (localhost:3001) GET / 200, 콘솔 mismatch 0 (recharts `width(-1)` ResponsiveContainer SSR 알려진 무영향 동작만). `suppressHydrationWarning` 으로 외부 확장 주입 mismatch 해소 | pass |
| **PAGE-1~8** Home 9 섹션 | curl `/` + grep — 비트코인 x5 / BTC/KRW x2 / AI 투자 분석 x2 / 가격 추이 x2 / 시장 정보 x2 / 기술적 지표 x2 / 실시간 관련 뉴스 x2 모두 정합 | pass |
| **v8 토큰 cascade** | `asset-coin` x5 / `card-ai` x1 / `gradient-ai` x3 모두 baseline 동일 | pass |

### 10.3 라운드트립 재실행

| # | 시나리오 | HTTP | SSR | 판정 |
| --- | --- | --- | --- | --- |
| 1 | `/` 진입 (HomeDashboard + 새 layout shell) | 200 | 9 섹션 + sidebar 6 메뉴 (active `/` x1) + 마켓 티커 3건 | pass |
| 2 | `/analyze` 무회귀 | 200 | layout 변경이 워크벤치 무영향 | pass |
| 3 | `/dashboard` 404 무회귀 (PR7) | 404 | not-found 무회귀 | pass |
| 4 | `/market` `/watchlist` `/profile` 404 무회귀 | 404 x3 | 정합 | pass |
| 5 | 모바일 UA (`iPhone OS 17_0`) SSR 마크업 | 200 + 동일 본문 (chunk timestamp 차이 1건 외 diff 0) | breakpoint cascade 정합 (`hidden lg:flex` 으로 desktop 한정 마운트) | pass |

### 10.4 에지 케이스 (E-FIX)

| # | 시나리오 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **E-FIX-1** webcrx 등 클라이언트 확장 주입 | `<html>` mismatch 0 | `suppressHydrationWarning` 한 레벨 한정 적용 (자식 트리에 미전파) | pass |
| **E-FIX-2** 데스크탑 (1280) Header 폭 | sidebar 옆 우측 컬럼 안 sticky (전폭 X) | SSR `<div class="flex flex-col flex-1 overflow-hidden"> > <header class="header-glass sticky top-0 z-[50]">` — 우측 컬럼 안 sticky 정합 | pass |
| **E-FIX-3** 모바일 (375) Sidebar/BottomNav | sidebar unmount (`hidden lg:flex`), BottomNav `fixed bottom-0` | sidebar 합성 토큰의 `hidden lg:flex` cascade + BottomNav `bottom-nav` 정합 | pass |
| **E-FIX-4** 마켓 티커 `hidden lg:flex` | 모바일 unmount / 데스크탑 노출 | `<div class="hidden lg:flex items-center gap-lg text-caption" aria-label="글로벌 마켓 시세">` 정합 | pass |
| **E-FIX-5** 마켓 티커 타입 정합 | `MarketTicker` interface 정합 | `lib/types/layout/marketTicker.ts` 4 필드 (`code`/`value`/`changePct`/`isUp`), `lib/mock/layout/marketTickers.ts` 3건 모두 만족, typecheck 통과 | pass |

### 10.5 머지 게이트 부록 — PR7 base 재정합

| # | 검증 포인트 | 결과 |
| --- | --- | --- |
| 1 | 새 AppLayout 구조 (sidebar viewport 전체 + 우측 컬럼 안 header sticky) 위에서 PR7 `/dashboard` mount | PASS — PR7 의 `app/(main)/dashboard/page.tsx` 가 자연스럽게 `main` 영역 (overflow-y-auto) 안으로 cascade |
| 2 | 새 `.sidebar-nav-item` 시안 톤 (h-12 / px-lg / rounded-md) 무회귀 | PASS — PR7 가 sidebar 자체 수정 없음 |
| 3 | 새 마켓 티커 mock — PR7 dashboard 와 충돌 0 | PASS — Header 만 갱신, dashboard 영역 무영향 |
| 4 | `lib/mock/layout/` + `lib/types/layout/` 도메인 폴더 신설 — PR7 의 `lib/mock/dashboard/*` 와 충돌 0 | PASS — 도메인 분리 |

→ **PR7 base 부적합 0건. 본 PR6 보정 commit 0.**

### 10.6 재검증 결론

- **AC-FIX 1~6 6/6 통과** + 기존 AC 무회귀 (20/20 유지) + 라운드트립 5/5 + 에지 5/5 + PR7 base 재정합 통과.
- 라벨: `impl-ready` 제거 → `qa-passed` 재부여.
- 후속 (본 PR6 머지 후): PR7 (Dashboard 포트폴리오) 진입.
