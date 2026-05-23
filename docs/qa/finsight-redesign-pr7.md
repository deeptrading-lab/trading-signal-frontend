# QA 리포트 — finsight-redesign PR7

- 대상 PR: [#32](https://github.com/deeptrading-lab/trading-signal-frontend/pull/32) `feat(dashboard): 포트폴리오 화면 mock (PR7/9 finsight-redesign)` (HEAD `cfa3094`).
- PRD: `docs/prd/finsight-redesign.md` §3.3 PR7 + §5.6 AC-PAGE-1~8 + §5.7 AC-COMMON-1~9 + §5.8 AC-GATE-1~3.
- DESIGN.md: `docs/design/finsight-redesign.md` v8 (signal-up/down · asset-stock/coin · accent-vivid · Pretendard 토큰).
- 검증 환경: macOS 25.5 · Node v20 · Next 15.5.18 dev `localhost:3100` / build · FastAPI BE 다운 (mock-only 화면이므로 무영향).

## 1. 요약

신설 5 파일 / 488L (`components/dashboard/*` x4 + `app/(main)/dashboard/page.tsx`). server-safe 정적 컴포넌트만 (useState 0 / fetch 0). typecheck/lint/build 0 에러. `/dashboard` First Load JS **103 KB / page chunk 797 B** — recharts 추가 사용 0 (Fear & Greed 는 CSS 그라데이션 + inline width). v8 토큰 SSR 마커 전부 노출 (`text-signal-up` x9 · `text-signal-down` x3 · `bg-asset-stock` x9 · `bg-asset-coin` x5 · `text-accent-vivid` x6). 한글 카피 9건 SSR 출력. 3 섹션 `aria-label` 부여. `/` `/analyze` 무회귀, hydration mismatch 0.

## 2. AC 검증 표

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **PAGE-1** 진입·3 섹션 | `curl /dashboard` + grep 한글 라벨 | 200 + hero/Top3/Market 3 섹션 | `HTTP=200` + 한글 9건 (대시보드/총 자산 평가 금액/총 투자원금/주식 비중/코인 비중/보유 자산 Top 3/오늘장 특징/상승 종목/하락 종목) | pass |
| **PAGE-2** 자산 식별 토큰 | `grep -oE "asset-stock\|asset-coin"` | 비중 바·아이콘 cascade | `bg-asset-stock` x9 (비중 바 + blob deco + HoldingRow 주식 아이콘) + `bg-asset-coin` x5 (비중 바 + HoldingRow 코인 아이콘) | pass |
| **PAGE-3** 한국식 등락 토큰 | `grep -oE "signal-up\|signal-down"` | 상승 빨강 / 하락 파랑 | `text-signal-up` x9 (Hero 변동률 + 평가손익 + 상승 종목 + Top3 상승 항목) + `text-signal-down` x3 (Top3 하락 항목 + 하락 종목) | pass |
| **PAGE-4** AI 그라데이션 | N/A | 본 화면 AI 영역 없음 | N/A — PR6 (`/`) 안 AiAnalysisCard 가 담당. PR 본문 결정표 명시 | n/a |
| **PAGE-5** Pretendard 일관 | `text-font-display` + `text-h1/h2/body-*` | 토큰 cascade | Hero 총 자산 = `text-font-display font-font-display`, 페이지 타이틀 = `text-h1`, 카드 헤더 = `text-h2`, 카드 본문 = `text-body-*` cascade | pass |
| **PAGE-6** 차트·번들 | `npm run build` + `/dashboard` size | recharts chunk +0 | `/dashboard` **797 B / 103 KB** First Load (target 추정 ~180 KB 대비 -77 KB). recharts chunk 0 (Fear & Greed = CSS 그라데이션 + inline width) | pass |
| **PAGE-7** 모바일 (375) | `grid-cols-2` (통계 4-up) + `grid-cols-1` (셸 그리드) | 1-col + 2x2 | DashboardPage 셸 = `grid-cols-1 md:grid-cols-2`, Hero 통계 = `grid-cols-2 md:grid-cols-4`. 모바일 stacking + 2x2 정합 | pass |
| **PAGE-8** 데스크탑 (1280) | `md:grid-cols-2` + `md:grid-cols-4` | 2-col + 4-up | 동일 마크업 안 cascade. SSR 본문 동일 (Tailwind breakpoint 분기) | pass |
| **COMMON-1** typecheck | `npm run typecheck` | 0 에러 | tsc 종료 0 | pass |
| **COMMON-2** lint | `npm run lint` | 0 에러 | eslint 종료 0 | pass |
| **COMMON-3** build | `npm run build` | 0 에러 + static | `✓ Compiled successfully in 2.2s`, ○ `/dashboard` 797 B / 103 KB, `/` 223 KB · `/analyze` 152 KB 무회귀 | pass |
| **COMMON-4** BFF | `git grep "fetch(\|axios" -- components/dashboard/ app/(main)/dashboard/` | 0건 (주석 제외) | 0 hit (주석 2 — `fetch · axios 호출 0건` 코멘트만) | pass |
| **COMMON-5** 한글 카피 톤 | `lib/copy/dashboard/labels.ts` 활용 | 인라인 한글 0 | 카피 17 상수 모두 외부 모듈 import (DASHBOARD_PAGE_TITLE / PORTFOLIO_* / HOLDINGS_* / MARKET_* / FEAR_GREED_*) | pass |
| **COMMON-6** 컨벤션 8 절 | `components/dashboard/` 직속 + barrel 0 + PascalCase | 한 뎁스 / cn 활용 | 4 파일 직속 PascalCase (PortfolioHero / HoldingsTop3 / MarketSnapshotCard / DashboardPage), barrel index 0, `cn()` 사용 정합 | pass |
| **COMMON-7** hex/px 직타 | `git grep "#[0-9a-fA-F]{3,6}" -- components/dashboard/` | 0건 (주석 제외) | 4 hit 모두 주석 (MarketSnapshotCard L14~L17 결정 사유 문서). 코드 0건. `bg-[8px]` 1곳 = px (h-[8px] 비중 바 두께) — Tailwind arbitrary value pattern, height 토큰 미정의 영역. PR 본문 옵션 A 채택 사유 명시 | pass |
| **COMMON-8** hydration | dev `/dashboard` 진입 | mismatch 0 | server component 만 (useState 0) → 본질적으로 mismatch 불가. dev 로그 클린 | pass |
| **COMMON-9** 슬러그 | `finsight-redesign-pr7` 일관 | PRD / 브랜치 / 리포트 동일 | 일관 | pass |
| **GATE-1** 라벨 흐름 | impl-ready → qa-passed | 본 리포트 commit 후 라벨 갱신 | 본 리포트 commit + push + `qa-passed` 라벨 부여 (이전 `impl-ready` 제거) | pass |
| **GATE-2** PR8 base 정합 | 부록 §7 참조 | base 정합 0 충돌 | PR8 (`/market`) base = 본 PR7 머지 직후 main. 4 검증 PASS (부록 §7) | pass |
| **GATE-3** 보정 commit | 부적합 0 | 보정 commit 0 | 부적합 없음 | pass |

## 3. 라운드트립 (양 뷰포트 마크업)

PR7 mock-only — BE 호출 0건. PR #11 정의 BE 5건은 `/analyze` (PR5) 범위. 본 PR7 는 라우트 무회귀 + SSR 마크업 정합 확인.

| # | 시나리오 | 응답 | 판정 |
| --- | --- | --- | --- |
| 1 | `/dashboard` 진입 (DashboardPage mock) | `HTTP=200`, SSR 본문 한글 9건 + 3 `aria-label` (총 자산 평가 금액 / 보유 자산 Top 3 / 오늘장 특징) | pass |
| 2 | `/` (PR6 Home) 무회귀 | `HTTP=200` | pass |
| 3 | `/analyze` (PR5) 무회귀 | `HTTP=200` | pass |
| 4 | `/market` / `/watchlist` / `/profile` 404 (PR8·PR9 예정) | `HTTP=404` x3 | pass |

양 뷰포트 (375 / 1280): SSR 마크업 동일 (Tailwind `md:` cascade 단일 본문). hero 통계 = 모바일 `grid-cols-2` (2x2), 데스크탑 `md:grid-cols-4`. 셸 그리드 = 모바일 `grid-cols-1`, 데스크탑 `md:grid-cols-2` (HoldingsTop3 + MarketSnapshotCard 좌우).

## 4. v8 토큰 활용 검증

| 토큰 | 출현 | 적용 위치 |
| --- | --- | --- |
| `text-signal-up` | 9 hit | Hero 변동률 ArrowUpRight + 평가손익 + Top3 상승 자산 + 상승 종목 수 |
| `text-signal-down` | 3 hit | Top3 하락 자산 + 하락 종목 수 |
| `bg-asset-stock` | 9 hit | Hero 주식 비중 바 + 첫 blob deco + HoldingRow 주식 아이콘 |
| `bg-asset-coin` | 5 hit | Hero 코인 비중 바 + HoldingRow 코인 아이콘 |
| `text-accent-vivid` | 6 hit | HoldingsTop3 Activity 아이콘 + MarketSnapshot TrendingUp 아이콘 + Hero 두 번째 blob (`bg-accent-vivid`) |
| `text-font-display font-font-display` | 1 hit | Hero 총 자산 대형 숫자 |
| `card` 합성 토큰 | 2 hit | HoldingsTop3 + MarketSnapshotCard 카드 셸 |

**Tailwind 기본 팔레트 (color 명명, hex 직타 아님)**:
- `from-slate-900 to-slate-800` (Hero 다크 그라데이션) — v8 hero 다크 전용 토큰 부재 → 옵션 A 채택. PR 본문 + 코드 코멘트 (PortfolioHero L8~L9, L54) 사유 명시.
- `from-red-500 via-yellow-500 to-emerald-500` (Fear & Greed 인덱스 바) — 시장 심리 인덱스 글로벌 컨벤션 의도적 유지. 한국식 등락 (signal-up/-down) 과 의미 분리. 코드 코멘트 (MarketSnapshotCard L11~L22, L82~L84) 사유 명시.
- `text-emerald-500` (Fear & Greed 값 라벨, L90) — 글로벌 컨벤션 cascade.

## 5. 번들 사이즈 검증

| Route | Size | First Load JS | 변화 |
| --- | --- | --- | --- |
| `/` (PR6 Home) | 112 KB | 223 KB | 무회귀 |
| `/analyze` (PR5) | 34.8 KB | 152 KB | 무회귀 |
| `/dashboard` (PR7 신규) | **797 B** | **103 KB** | 신규 (target ~180 KB 대비 -77 KB) |
| `/_not-found` | 131 B | 103 KB | 무회귀 |
| shared chunks | — | 102 KB | 무회귀 |

recharts chunk 0 — Fear & Greed 는 CSS 그라데이션 (`from-red-500 via-yellow-500 to-emerald-500`) + `style={{ width: ${value}% }}` 만 활용. PR6 chunk 분리 정착 무회귀.

## 6. 에지 케이스

| # | 시나리오 | 검증 | 결과 |
| --- | --- | --- | --- |
| E1 | Hero 다크 그라데이션 위 Pretendard 가독성 | `text-surface` (white) + `text-surface/60` (라벨) cascade. 다크 grey 위 white 대비비 WCAG AA 이상 (slate-900 #0f172a vs white = 18.6:1) | pass |
| E2 | blob deco z-index 정합 | `absolute top-0`, `opacity-20`, `mix-blend-multiply`, `blur-3xl`, `aria-hidden="true"`. 본문은 `relative z-10` 분리 — 콘텐츠 위로 안 올라옴 | pass |
| E3 | 비중 바 색 다크 배경 위 가독성 | `bg-asset-stock` / `-coin` (강조 채도) on `bg-surface/10` track. 시안 정합. PortfolioHero L157~L162 inline width 만 동적 — 컨벤션 §4 style 예외 | pass |
| E4 | Fear & Greed 그라데이션 바 | `from-red-500 via-yellow-500 to-emerald-500` 시안 정합. inline `width: ${value}%` (style 예외). `aria-hidden="true"` (시각 보조 — 의미는 옆 텍스트 `{value} ({label})` 가 담당) | pass |
| E5 | 상승/하락 종목 수 큰 숫자 | `text-h1 text-signal-up tabular-nums` / `text-signal-down`. 한국식 cascade 정합 — 시안 영어 컨벤션 (green/red) 과 의도적 반전 | pass |

## 7. 머지 게이트 부록 — PR8 base 정합 dry-run

| 검증 | 결과 |
| --- | --- |
| 1. PR8 `app/(main)/market/page.tsx` 신설 본 PR7 무영향 | PASS — 다른 라우트, 충돌 0 |
| 2. PR8 카드+그리드 패턴 (`card` 합성 토큰 + `md:grid-cols-2`) 재활용 | PASS — 본 PR7 의 HoldingsTop3 / MarketSnapshotCard 카드 셸 패턴 그대로 적용 가능 |
| 3. PR8 mock 활용 (`lib/mock/market/{indices, themes}.ts`) | PASS — PR4 정착 (현 시점 `ls lib/mock/market/` 확인). 본 PR7 무영향 |
| 4. PR8 도메인 폴더 (`components/market/`) | PASS — 본 PR7 의 `components/dashboard/` server-safe 정적 패턴 + props-only 그대로 재활용 |
| 5. 부적합 | 없음 — PR8 인계 commit log 변경 0 |

## 8. 결론 + 라벨

전 항목 통과 (PAGE-1~8 = 7 pass + 1 N/A · COMMON-1~9 = 9 pass · GATE-1~3 = 3 pass). server-safe 정적 컴포넌트 패턴 + v8 토큰 cascade + Tailwind color 명명 (slate / emerald / red / yellow) 의도적 사용 사유 모두 코드 코멘트 + PR 본문 표 명시. `/dashboard` 번들 103 KB (-77 KB vs target). PR8 base 정합 4 검증 PASS.

**판정: qa-passed**. 본 리포트 commit + push 직후 `qa-passed` 라벨 부여 (이전 `impl-ready` 제거). HANDOFF append workflow 트리거 — PR 본문 `## 다음 작업` 절 (PR8 진입 + chore 후보 + 향후 디자인 갱신) 존재 확인 완료.
