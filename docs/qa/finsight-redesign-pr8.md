# QA 리포트 — finsight-redesign PR8

- 대상 PR: [#35](https://github.com/deeptrading-lab/trading-signal-frontend/pull/35) `feat(market): 시장 동향 화면 mock (PR8/9 finsight-redesign)` (HEAD `2744800`).
- PRD: `docs/prd/finsight-redesign.md` §3.3 PR8 + §5.6 AC-PAGE-1~8 + §5.7 AC-COMMON-1~9 + §5.8 AC-GATE-1~3.
- DESIGN.md: `docs/design/finsight-redesign.md` v8 (signal-up/down · accent-vivid · `card` 합성 토큰 · Pretendard).
- 검증 환경: macOS 25.5 · Node v20 · Next 16.2.6 dev `localhost:3000` (기존 인스턴스 PID 60534 활용) / build · FastAPI BE 다운 (mock-only 화면이므로 무영향).

## 1. 요약

신설 4 파일 / 216L (`components/market/{ThemesCard, IndicesCard, MarketPage}.tsx` + `app/(main)/market/page.tsx`). 모두 server-safe 정적 컴포넌트 (`use client` 0 / `useState` 0 / `fetch`·`axios` 0). 지원 모듈 (`lib/types/market/*` + `lib/mock/market/*` + `lib/copy/market/labels.ts`) 은 PR4 (`d63ef77`/`fe7da57`/`f7f58f2`) 에서 이미 정착 — 본 PR8 는 소비만 함. typecheck/lint/build 0 에러. `/market` 정적 prerender (○). SSR HTML 안 한글 9 라벨 (`시장 동향` / `인기 테마 / 섹터` / `주요 지수` / `AI 솔루션` / `반도체 장비` / `레이어1 코인` / `2차전지` / `KOSPI` / `KOSDAQ`) + 6 지수 값 (`2,750.23` / `862.14` / `5,234.18` / `16,400.12` / `1,342.50` / `52.4%`) 모두 노출. 2 섹션 `aria-label`. 사이드바 + BottomNav 양쪽에서 `/market` 항목 `aria-current="page"` 정상 부여. `/`, `/dashboard`, `/analyze` 무회귀. catch-all `(main)/[...not_found]` 보다 구체적 `/market` 우선 매칭 — `/watchlist`, `/profile` 은 여전히 404 (PR9 예정 범위).

## 2. AC 검증 표

| AC | 재현 | 기대 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| **PAGE-1** 진입·2 섹션 | `curl /market` + grep | 200 + ThemesCard + IndicesCard 2 섹션 | `HTTP=200` + `aria-label="인기 테마 / 섹터"` + `aria-label="주요 지수"` SSR 노출 | pass |
| **PAGE-2** 자산 식별 토큰 | N/A | 본 화면 자산 type 칩 없음 | N/A — Market 화면은 인덱스/테마 (자산 자체 아님). PR 본문 결정표 명시 | n/a |
| **PAGE-3** 한국식 등락 토큰 | `grep -oE "signal-up-text\|signal-down-text"` | 상승 빨강 / 하락 파랑 | `signal-up-text` (테마 3건 상승 + 지수 4건 상승) + `signal-down-text` (테마 1건 하락 `2차전지` + 지수 2건 하락 `S&P 500`, `USDKRW`). SSR 합성 토큰 정합 | pass |
| **PAGE-4** AI 그라데이션 | N/A | 본 화면 AI 영역 없음 | N/A — PR6 (`/`) AiAnalysisCard 가 담당 | n/a |
| **PAGE-5** Pretendard 일관 | `text-h1` / `text-h2` / `text-body-strong` / `text-caption` cascade | 토큰 cascade | 페이지 타이틀 = `text-h1`, 카드 헤더 = `text-h2`, 테마명 = `text-body-strong`, 지수 값 = `text-h2 tabular-nums`, 지수 라벨 = `text-caption text-text-muted`. `text-font-display` 미사용 (시안 정합 — Hero/대형 숫자 컴포넌트 부재) | pass |
| **PAGE-6** 차트·번들 | `npm run build` + `/market` size | recharts chunk +0 | `/market` static prerender (○) — 마크업 정적. recharts 미사용 (테마/지수 모두 라벨 + 값 표시만) | pass |
| **PAGE-7** 모바일 (375) | `grid-cols-1` (셸) + `grid-cols-2` (지수 내부) | 1-col stacking + 지수 2x3 | MarketPage 셸 = `grid grid-cols-1 gap-lg md:grid-cols-2`. IndicesCard = `grid grid-cols-2 gap-md` (6 지수 → 2x3). ThemesCard = `flex flex-col gap-md` (4 테마 vertical) | pass |
| **PAGE-8** 데스크탑 (1280) | `md:grid-cols-2` | 셸 2-col + 지수 2-col 유지 | 동일 마크업 안 Tailwind `md:` cascade. ThemesCard (좌) + IndicesCard (우) 좌우 분리 | pass |
| **COMMON-1** typecheck | `npm run typecheck` | 0 에러 | `tsc --noEmit` 종료 0 | pass |
| **COMMON-2** lint | `npm run lint` | 0 에러 | `eslint .` 종료 0 | pass |
| **COMMON-3** build | `npm run build` | 0 에러 + static | `✓ Compiled successfully in 1688ms`, ○ `/market` 정적 prerender, `/` · `/dashboard` · `/analyze` 무회귀 | pass |
| **COMMON-4** BFF | `git grep -nE "http://127\.0\.0\.1" -- app/ components/ lib/` (route handler 제외) | 0 hit | 0 hit. `/market` 화면은 `fetch`·`axios` 호출 0건 (mock-only). `/api/workbench/analyze` + `/api/whitelist/search` BFF 무회귀 (BE 다운 시 한글 카피 502 정상 반환) | pass |
| **COMMON-5** 한글 카피 톤 | `lib/copy/market/labels.ts` 활용 | 인라인 한글 0 | 카피 4 상수 모두 외부 모듈 import (`MARKET_PAGE_TITLE` / `MARKET_THEMES_TITLE` / `MARKET_INDICES_TITLE` / `MARKET_THEME_STOCKS_SUFFIX`). 테마명·종목명·지수명은 데이터 식별자 (한글 표기 유지, mock 파일 안 정착) | pass |
| **COMMON-6** 컨벤션 8 절 | `components/market/` 직속 + barrel 0 + PascalCase | 한 뎁스 / `cn()` 활용 | 3 파일 직속 PascalCase (`ThemesCard.tsx` / `IndicesCard.tsx` / `MarketPage.tsx`), barrel `index.ts` 0, `cn()` 활용 (signal class 합성) | pass |
| **COMMON-7** hex/px 직타 | `git grep -nE "#[0-9a-fA-F]{3,8}\b\|\b[0-9]+px\b" -- components/market/ app/(main)/market/` | 0 hit | 0 hit (코드 + 코멘트 모두 v8 토큰 이름만 — `signal-up-text`, `accent-vivid`, `border-line`, `surface-muted`, `text-strong`, `text-muted`) | pass |
| **COMMON-8** hydration | dev `/market` 진입 | mismatch 0 | server component 만 (`use client` 0 / `useState` 0) → 본질적 mismatch 불가. dev 로그 클린 (warn/error 0) | pass |
| **COMMON-9** 슬러그 | `finsight-redesign-pr8-market` 일관 | PRD / 브랜치 / 리포트 동일 | 브랜치 `feature/finsight-redesign-pr8-market`, 리포트 `docs/qa/finsight-redesign-pr8.md`, PRD §3.3 PR8 일관 | pass |
| **GATE-1** 라벨 흐름 | impl-ready → qa-passed | 본 리포트 commit 후 라벨 갱신 | 본 리포트 commit + push 후 `qa-passed` 라벨 부여 (이전 `impl-ready` 제거). PR 본문 `## 다음 작업` 절 존재 확인 (`body_has_next: true` via `gh pr view 35`) | pass |
| **GATE-2** PR9 base 정합 | 부록 §7 참조 | base 정합 0 충돌 | PR9 (`/watchlist` + `/profile` mock) base = 본 PR8 머지 직후 main. 4 검증 PASS (부록 §7) | pass |
| **GATE-3** 보정 commit | 부적합 0 | 보정 commit 0 | 본 QA 사이클 부적합 없음 — 보정 commit 0 | pass |

## 3. 라운드트립 (양 뷰포트 마크업)

PR8 mock-only — BE 호출 0건 (CMD `curl http://127.0.0.1:8000/health -m 2` → BE down 확인. 화면은 mock 의존 → 무영향). PR #11 정의 BE 5건은 `/analyze` (PR5) 범위. 본 PR8 는 라우트 무회귀 + SSR 마크업 정합 확인.

| # | 시나리오 | 응답 | 판정 |
| --- | --- | --- | --- |
| 1 | `/market` 진입 (MarketPage mock) | `HTTP=200`, SSR 본문 한글 9건 + 2 `aria-label` (`인기 테마 / 섹터` + `주요 지수`) + 4 테마명 + 6 지수 값 + signal-up/down-text 토큰 | pass |
| 2 | `/` (PR6 Home) 무회귀 | `HTTP=200` | pass |
| 3 | `/dashboard` (PR7) 무회귀 | `HTTP=200` | pass |
| 4 | `/analyze` (PR5) 무회귀 | `HTTP=200` | pass |
| 5 | `/watchlist`, `/profile` (PR9 예정) | `HTTP=404` x2 (catch-all → `(main)/not-found.tsx`) | pass |
| 6 | `/api/workbench/analyze` (POST AAPL) BFF 무회귀 (BE down 시뮬) | `HTTP=502` + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` (BE 다운 시 한글 fallback 정상) | pass |
| 7 | `/api/whitelist/search?q=AAPL` BFF 무회귀 | `HTTP=502` (BE 다운 정상 graceful) | pass |

양 뷰포트 (375 / 1280): SSR 마크업 동일 (Tailwind `md:` cascade 단일 본문). 모바일 = 셸 1-col stacking + ThemesCard 4 row vertical + IndicesCard 2x3 grid. 데스크탑 = 셸 좌우 2-col + 동일 카드 내부 레이아웃 유지.

## 4. v8 토큰 활용 검증

| 토큰 | 출현 | 적용 위치 |
| --- | --- | --- |
| `card` 합성 토큰 | 2 hit | ThemesCard (`<section class="card">`) + IndicesCard (`<section class="card">`) 카드 셸 |
| `signal-up-text` | 7 hit | 테마 3건 상승 (AI 솔루션 / 반도체 장비 / 레이어1 코인) + 지수 4건 상승 (KOSPI / KOSDAQ / NASDAQ / BTC Dominance) |
| `signal-down-text` | 3 hit | 테마 1건 하락 (2차전지) + 지수 2건 하락 (S&P 500 / USDKRW) |
| `text-accent-vivid` | 3 hit | MarketPage 페이지 타이틀 Compass 아이콘 + ThemesCard Flame 헤더 아이콘 + IndicesCard TrendingUp 헤더 아이콘 |
| `border-border-line` + hover `border-accent-vivid` | 4 hit | ThemeRow 셸 (4 테마 항목 default border + hover accent) |
| `bg-surface-muted` | 6 hit | IndexCell 셸 (6 지수 항목 배경) |
| `text-text-strong` / `text-text-muted` | 다수 | 페이지 타이틀 / 카드 헤더 / 테마명 / 지수 값 = strong, 대표 종목 / 지수 라벨 = muted |
| `text-h1` / `text-h2` / `text-body-strong` / `text-body-sm` / `text-caption` | 다수 | Pretendard cascade |
| spacing 토큰 (`gap-sm/md/lg`, `mb-xs/lg`, `p-md`, `h-md/xl/2xl`, `w-md/xl/2xl`) | 다수 | 인라인 px·rem 0건 |
| `max-w-main-max-w` | 1 hit | MarketPage 셸 (PR2 main grid 토큰) |
| `rounded-md` / `rounded-lg` (card 합성 안) | 다수 | 모든 컴포넌트 |

**Tailwind 기본 팔레트 (hex 직타 아님) 사용 0건** — PR7 의 hero scope slate/emerald/red/yellow 같은 의도적 예외 사례 없음. v8 토큰만 cascade.

## 5. 번들 사이즈 검증

| Route | 정적 여부 | 비고 |
| --- | --- | --- |
| `/` (PR6 Home) | ○ static | 무회귀 |
| `/analyze` (PR5) | ○ static | 무회귀 |
| `/dashboard` (PR7) | ○ static | 무회귀 |
| `/market` (PR8 신규) | ○ static | 신규 — server-safe 정적 컴포넌트 만, recharts chunk 추가 0 |
| `/[...not_found]` | ƒ dynamic | 무회귀 (catch-all) |
| `/_not-found` | ○ static | 무회귀 |
| `/api/workbench/analyze`, `/api/whitelist/search` | ƒ dynamic | 무회귀 (BFF route handler) |

## 6. 에지 케이스

| # | 시나리오 | 검증 | 결과 |
| --- | --- | --- | --- |
| E1 | 사이드바 "시장 동향" active | `curl /market` HTML 안 `<a class="sidebar-nav-item sidebar-nav-item-active" aria-current="page" href="/market">` 매칭 | pass — `aria-current="page"` 정확 부여 |
| E2 | 모바일 BottomNav "시장 동향" active | `<a class="bottom-nav-item bottom-nav-item-active" aria-current="page" href="/market">` 매칭 | pass — Sidebar/BottomNav 양쪽 정합 |
| E3 | ThemeRow hover accent | `transition-colors hover:border-accent-vivid` 클래스 SSR 노출 (4 테마 × 1 = 4 hit) | pass — hover 인터랙션 토큰 적용 |
| E4 | catch-all 우선순위 | `/market` HTTP 200 (구체적 라우트 매칭) + `/watchlist`/`/profile` HTTP 404 (catch-all fallback) | pass — Next App Router 매칭 룰 정합 |
| E5 | 한국식 등락 cascade — 하락 항목 명시 | 4 테마 중 1건 (`2차전지` -2.3%) + 6 지수 중 2건 (`S&P 500` -0.12%, `USDKRW` -2.10) 에서 `signal-down-text` SSR 노출 | pass — `signal-down-text` 3 hit 정확 |
| E6 | tabular-nums 숫자 정렬 | IndexCell 지수 값 (`text-h2 tabular-nums`) — 6 지수 모두 동일 너비 숫자 | pass — `tabular-nums` 클래스 SSR |
| E7 | aria-hidden 아이콘 | Compass / Flame / TrendingUp / TrendingDown 모두 `aria-hidden="true"` (장식 아이콘) | pass — screen reader 텍스트만 읽음 |
| E8 | 빈 데이터 (mock 변형 시) | `themes=[]` / `indices=[]` 전달 시 `<ul>` 빈 자식만 — 런타임 에러 없음 (key=item.name 안전) | pass (코드 리뷰 — props-only 패턴, no defensive null check 필요) |
| E9 | StrictMode 더블 마운트 | server component → 클라 마운트 없음. StrictMode 영향 0 | pass |
| E10 | Tailwind preflight 잔여물 | `<ul>` 기본 marker / `<li>` indent 의도적 reset (`flex-col` / `grid`). 시각 회귀 0 | pass |

## 7. 머지 게이트 부록 — PR9 base 정합 dry-run

| 검증 | 결과 |
| --- | --- |
| 1. PR9 `app/(main)/watchlist/page.tsx` + `app/(main)/profile/page.tsx` 신설 본 PR8 무영향 | PASS — 다른 라우트, 충돌 0. 현 시점 `/watchlist`·`/profile` 은 catch-all 404 — PR9 에서 구체적 page 정착 시 자연 무력화 |
| 2. PR9 카드 패턴 (`card` 합성 토큰 + section + aria-label) 재활용 | PASS — 본 PR8 의 ThemesCard / IndicesCard 패턴 (정적 server-safe + props-only) 그대로 적용 가능 |
| 3. PR9 mock 활용 (`lib/mock/watchlist/*` + `lib/mock/profile/*`) | PASS — PR4 정착 (`lib/mock/` 안 5 도메인 mock 존재 확인). 본 PR8 무영향 |
| 4. PR9 도메인 폴더 (`components/watchlist/` + `components/profile/`) | PASS — 본 PR8 의 `components/market/` 직속 PascalCase + barrel 0 패턴 그대로 재활용 |
| 5. 부적합 | 없음 — PR9 인계 commit log 변경 0 |

## 8. 결론 + 라벨

전 항목 통과 (PAGE-1~8 = 6 pass + 2 N/A · COMMON-1~9 = 9 pass · GATE-1~3 = 3 pass). server-safe 정적 컴포넌트 패턴 + v8 토큰 cascade (signal-up/down-text · accent-vivid · card · border-line · surface-muted) 만 사용 — Tailwind color 명명 예외 0건 (PR7 hero scope 와 달리 본 화면은 토큰만으로 충분). `/market` 정적 prerender. 사이드바 + BottomNav 양쪽 active state 정합. catch-all 우선순위 정상. PR9 base 정합 4 검증 PASS.

**판정: qa-passed**. 본 리포트 commit + push 직후 `qa-passed` 라벨 부여 (이전 `impl-ready` 제거). HANDOFF append workflow 트리거 — PR 본문 `## 다음 작업` 절 존재 확인 완료 (`gh pr view 35 -q '.body | contains("## 다음 작업")' → true`).
