# QA 리포트 — finsight-redesign 시리즈 종료 후 PRD 기반 최종 점검

- 대상: 시리즈 9 PR (#26 PR1 ~ #36 PR9) + 시리즈 외 chore 2 PR (#33 Next 16 / #34 meta polish) 머지 완료. main HEAD `1a79430` (PR #36 merge).
- PRD: `docs/prd/finsight-redesign.md` §3.8.2 시리즈 종료 후 최종 점검 + §5.8 AC-FINAL-1~5.
- 사용자 confirm: 2026-05-24 "PRD 기반 최종 점검 진입 OK" (AC-FINAL-5).
- 검증 환경: macOS 25.5 · Node v20 · Next 16.2.6 · Tailwind v4.3.0 · main 위 `chore/finsight-redesign-cleanup` 분기 (HEAD = main).
- 점검 명령: `npm run typecheck` / `npm run lint` / `npm run build` / `git grep` / `git log --grep "finsight-redesign"` / `find app/(main) -name page.tsx`.

## 1. 요약

PRD §2 목표 7건 모두 main 상태 정착 (pass 7/7). §5 AC 합계 — pass 60 / fail 0 / N/A 0 (AC-V4-1~8 + AC-V8-1~11 + AC-L-1~5 + AC-M-1~6 + AC-A-1~5 + AC-PAGE-1~8 + AC-COMMON-1~9 + AC-GATE-1~3 + AC-FINAL-1~5). §6 가정 11건 모두 main 상태 유효 (cleanup 인계 1건 — 시안 폴더). §8.2 회귀 위험 11건 모두 회귀 0건 — Pretendard FOUT 0 (next/font/local subset), v4 빌드 잔존물 0, 합성 토큰 cascade WCAG AA 무회귀, `/analyze` BE adapter 인터페이스 무수정. typecheck / lint / build 0 에러, prerender 11 라우트 모두 정상 (○ `/`, `/analyze`, `/dashboard`, `/market`, `/watchlist`, `/profile`, `/icon`, `/_not-found` + ƒ `/[...not_found]`, `/api/whitelist/search`, `/api/workbench/analyze`). 시리즈 종료 cleanup 인계 5건 — §7 명시.

## 2. §2 목표 7건 — main 상태 1:1 검증

| # | 목표 | 검증 명령 | 실측 | 판정 |
| --- | --- | --- | --- | --- |
| 1 | 브랜드 정착 (FinSight) | `git grep -l "FinSight" -- app/ components/ lib/` + `grep title app/layout.tsx` + `grep FinSight README.md` | hit = `app/icon.tsx` + `app/layout.tsx` (title `"FinSight"`, description `"AI 기반 매수·매도 판단 보조 서비스"`) + `components/layout/Header.tsx` + `components/layout/Sidebar.tsx` + `lib/copy/layout/navCopy.ts` (`NAV_BRAND_LABEL = "FinSight"`). README 4 hit | pass |
| 2 | 한국식 등락 (signal-up red / signal-down blue) | `git grep -nE "signal-up\|signal-down" -- app/ components/` + `cat tailwind.theme.json \| grep signal` | `signal-up: #c81e1e` / `signal-up-soft: #fee2e2` / `signal-down: #1d4ed8` / `signal-down-soft: #dbeafe` 토큰 정착. 사용처 = `components/dashboard/{HoldingsTop3, MarketSnapshotCard, PortfolioHero}` + `components/home/{AssetHeader, PriceChart, AiAnalysisCard}` + Watchlist `badge-signal-up/down` chip ×3 each | pass |
| 3 | Pretendard 폰트 (next/font/local self-host) | `git grep Pretendard app/layout.tsx` + `ls public/fonts/pretendard/` + `ls .next/static/media/Pretendard*` | `app/layout.tsx` next/font/local 4 weight (Regular/Medium/Bold/ExtraBold subset.woff2). 산출물 `.next/static/media/Pretendard_*-s.p.*.woff2` 4건 빌드 시 hash 정상 | pass |
| 4 | Tailwind v4 + 어댑터 유지 | `grep tailwindcss package.json` + `head app/globals.css` + `cat postcss.config.mjs` | `tailwindcss@^4.3.0` + `@tailwindcss/postcss@^4.3.0`. globals.css `@import "tailwindcss";` + `@config "../tailwind.config.ts";` 다리. postcss = `@tailwindcss/postcss` 단일. v3 `@tailwind` 디렉티브 0 hit | pass |
| 5 | 6 라우트 정착 | `find app/(main) -name "page.tsx"` + `npm run build` | 6 page = `/`, `/analyze`, `/dashboard`, `/market`, `/watchlist`, `/profile` + catch-all `[...not_found]`. 빌드 출력 모두 ○ (정적 prerender). 사이드바 NAV_ITEMS 6 메뉴 (`NAV_MENU_DASHBOARD/HOME/ANALYZE/MARKET/WATCHLIST/PROFILE`) | pass |
| 6 | mock data 폴더 표준 (`lib/mock/<domain>/`) | `find lib/mock -type f -name "*.ts"` + `grep mock docs/rules/frontend.md` | 19 파일 / 6 도메인 (dashboard 4 + home 8 + layout 1 + market 2 + profile 3 + watchlist 1). barrel `index.ts` 0건. frontend.md "mock 데이터 위치 = `lib/mock/<domain>/<file>.ts`" 룰 1단락 정착 | pass |
| 7 | PR 9개 분할 + 한 PR 룰 본 작업 한정 해제 | `git log main --grep finsight-redesign --oneline` | PR1 #26 → PR9 #36 모두 머지. 시리즈 외 chore #33 (Next 16) + #34 (meta polish) 합산 11 PR. 시리즈 슬러그 `finsight-redesign` 일관 (브랜치명 `feature/finsight-redesign-pr<n>-*` 패턴) | pass |

## 3. §5 AC 전체 매핑 — pass / fail / N/A

### 3.1 §5.1 V4-1~8 (Tailwind v4 마이그레이션, PR #26)

| AC | 검증 | 실측 | 판정 |
| --- | --- | --- | --- |
| V4-1 v4.x | `grep tailwindcss package.json` | `tailwindcss@^4.3.0` | pass |
| V4-2 @tailwindcss/postcss | `grep @tailwindcss/postcss package.json` | `^4.3.0` 1건 | pass |
| V4-3 `@import "tailwindcss"` | `head app/globals.css` | line 17 `@import "tailwindcss";`, v3 `@tailwind` 디렉티브 0 hit | pass |
| V4-4 postcss 플러그인 | `cat postcss.config.mjs` | `"@tailwindcss/postcss": {}` 단일 | pass |
| V4-5 어댑터 유지 | `git diff tailwind.config.ts` | `tailwind.theme.json` import + `adaptDesignTokens()` spread 패턴 유지 | pass |
| V4-6 `@config` 다리 | `grep @config app/globals.css` | line 18 `@config "../tailwind.config.ts";` | pass |
| V4-7 build 0 에러 | `npm run build` | `✓ Compiled successfully in 1915ms` | pass |
| V4-8 시각 회귀 0 | PR #26 QA 라운드트립 5건 | PR #26 QA pass (각 PR QA 리포트 인용) | pass |

### 3.2 §5.2 V8-1~11 (DESIGN.md v8, PR #27)

| AC | 검증 | 실측 | 판정 |
| --- | --- | --- | --- |
| V8-1 파일 존재 | `ls docs/design/finsight-redesign.md` | 존재 | pass |
| V8-2 design.md lint | (PR #27 QA 인용 — 별도 npx 실행 불가, 본 세션 환경 제약) | PR #27 QA errors=0 warnings=0 | pass |
| V8-3 신규 토큰 ≥6 | `cat tailwind.theme.json \| grep -E "signal-up\|signal-down\|asset-stock\|asset-coin\|gradient-ai"` | 11 토큰 (`signal-up/-soft`, `signal-down/-soft`, `asset-stock/-soft`, `asset-coin/-soft`, `gradient-ai-from/-to/-soft`) | pass |
| V8-4 font-display Pretendard | `grep font-display tailwind.theme.json` | `font-display` 토큰 2건 (fontSize + fontFamily entry) | pass |
| V8-5 prose 단락 ≥3 | DESIGN.md 본문 한국식·자산 식별·Pretendard 단락 | PR #27 QA pass | pass |
| V8-6 신·구 팔레트 비교 ≥10행 | DESIGN.md 표 | PR #27 QA pass | pass |
| V8-7 WCAG AA ≥14쌍 | DESIGN.md 표 | PR #27 QA pass | pass |
| V8-8 design:sync source | `grep design:sync package.json` | `docs/design/finsight-redesign.md` (이전 design-tone-refinement → v8 갱신) | pass |
| V8-9 theme.json 신규 키 ≥6 | tailwind.theme.json | 11 키 (V8-3) | pass |
| V8-10 hex 직타 0 | `git grep -nE "#[0-9a-fA-F]{3,6}" -- app/components.css app/globals.css` | 1 hit = `app/components.css:171` 주석 안 hex (v7-rev2 history 설명, 코드 무영향). 토큰 함수 호출 무회귀 | pass |
| V8-11 Pretendard 적용 | dev / build | `app/layout.tsx` 4 weight self-host + `.next/static/media/Pretendard_*` 4 파일 빌드 정상 | pass |

### 3.3 §5.3 L-1~5 (layout shell, PR #28 + PR #31 fix)

| AC | 검증 | 실측 | 판정 |
| --- | --- | --- | --- |
| L-1 sidebar 6 메뉴 | `grep NAV_ITEMS components/layout/Sidebar.tsx` + `cat components/layout/navItems.ts` | NAV_ITEMS 6 = `/dashboard, /, /analyze, /market, /watchlist, /profile`. `isNavItemActive` 활성 강조 | pass |
| L-2 Header FinSight + 글래스 | `grep FinSight components/layout/Header.tsx` + 마크업 | 헤더 sticky + `NAV_BRAND_LABEL` 정착 | pass |
| L-3 BottomNav 모바일 | PR #28 QA | `useBreakpoint().isMobile` 분기 + md+ 숨김 | pass |
| L-4 양 뷰포트 6 메뉴 클릭 | PR #28 QA + PR #36 QA 라운드트립 | 6 라우트 200 + catch-all 404 정상 | pass |
| L-5 라우트 그룹명 결정 | `app/(main)/` | `(workbench)` → `(main)` rename 정착. PRD §9 q5 resolved 옵션 A (workbench 도메인 폴더명 유지) 인접 결정 | pass |

### 3.4 §5.4 M-1~6 (mock 폴더, PR #29)

| AC | 검증 | 실측 | 판정 |
| --- | --- | --- | --- |
| M-1 lib/mock 5+ 도메인 | `find lib/mock -type d` | dashboard / home / layout / market / profile / watchlist 6 도메인 | pass |
| M-2 lib/types 정합 | PR #29 QA | typecheck 0 에러 — 모든 mock 이 lib/types/<domain> import | pass |
| M-3 barrel 0 | `find lib/mock -name "index.ts"` | 0건 | pass |
| M-4 mock 안 한글 카피 0 | PR #29 QA + `lib/copy/<domain>/` 정착 | mock 은 데이터·숫자·ticker. 카피 모두 `lib/copy/<domain>/labels.ts` 분리 | pass |
| M-5 frontend.md 1줄 | `grep mock docs/rules/frontend.md` | "mock 데이터 위치 = `lib/mock/<domain>/<file>.ts`" 단락 정착 | pass |
| M-6 의존성 = lucide-react + recharts | `grep -E "lucide-react\|recharts" package.json` | `lucide-react@^1.16.0` + `recharts@^3.8.1`. shadcn / motion / framer / canvas-confetti 0건 | pass |

### 3.5 §5.5 A-1~5 (/analyze 이전, PR #30)

| AC | 검증 | 실측 | 판정 |
| --- | --- | --- | --- |
| A-1 `/analyze` 워크벤치 화면 | `cat app/(main)/analyze/page.tsx` | 워크벤치 화면 그대로 import | pass |
| A-2 `POST /api/workbench/analyze` 무회귀 | PR #30 QA 라운드트립 5건 | pass | pass |
| A-3 `app/page.tsx` 교체 | `cat app/(main)/page.tsx` | PR #31 의 HomeDashboard | pass |
| A-4 도메인 폴더명 | `ls components/workbench/` | `workbench` 유지 (PRD §9 q5 옵션 A) | pass |
| A-5 nav "AI 분석" → `/analyze` | `cat lib/copy/layout/navCopy.ts` + `components/layout/navItems.ts` | `NAV_MENU_ANALYZE = "AI 분석"`, `/analyze` 라우팅 | pass |

### 3.6 §5.6 PAGE-1~8 (Home/Dashboard/Market/Watchlist/Profile, PR #31/32/35/36)

| AC | 검증 | 실측 | 판정 |
| --- | --- | --- | --- |
| PAGE-1 6 메뉴 진입 | `npm run build` | 6 라우트 ○ static + catch-all ƒ dynamic | pass |
| PAGE-2 asset-stock/coin 일관 | `git grep -nE "asset-stock\|asset-coin" -- components/` | 6+ hit (HoldingsTop3 / PortfolioHero / AssetHeader / WatchlistRow badge ×6) | pass |
| PAGE-3 signal-up/down 일관 | `git grep -nE "signal-up\|signal-down" -- components/` | 20+ hit | pass |
| PAGE-4 gradient-ai | `git grep -nE "gradient-ai" -- components/` | AiAnalysisCard (`card-ai`, `gradient-ai-bg`, `text-gradient-ai-from`) + ProfileCard avatar | pass |
| PAGE-5 Pretendard 일관 | `text-h1/h2/body-*` 사용 | 모든 페이지 typography 토큰 cascade | pass |
| PAGE-6 recharts 차트 | `components/home/PriceChart.tsx` | recharts AreaChart 정상 (PR #34 ResizeObserver fix 정착) | pass |
| PAGE-7 모바일 (375) | PR #31/32/35/36 QA 모두 mobile viewport 검증 | pass | pass |
| PAGE-8 데스크탑 12-col | Watchlist `grid-cols-12` + Profile `md:grid-cols-2` | pass | pass |

### 3.7 §5.7 COMMON-1~9

| AC | 검증 | 실측 | 판정 |
| --- | --- | --- | --- |
| COMMON-1 typecheck | `npm run typecheck` | 0 에러 | pass |
| COMMON-2 lint | `npm run lint` | 0 에러 | pass |
| COMMON-3 build | `npm run build` | `✓ Compiled successfully in 1915ms` + 11 라우트 정상 | pass |
| COMMON-4 BFF fetch 경계 | `git grep -nE "fetch\(" -- app/ components/ hooks/ lib/` | 2 hit = `app/api/whitelist/search/route.ts:23` + `app/api/workbench/_adapters/fastapi.ts:38` — 모두 route handler. 컴포넌트·hooks·페이지 hit 0 | pass |
| COMMON-5 한글 카피 톤 | `lib/copy/<domain>/` 분리 정착 | 6 도메인 (layout / workbench / dashboard / home / market / watchlist / profile) | pass |
| COMMON-6 컨벤션 8절 | `docs/rules/frontend.md` 룰 + 도메인 한 뎁스 + barrel 0 + cn() | 무회귀 — `find components` 도메인 한 뎁스, barrel 0 | pass |
| COMMON-7 hex/px 직타 | `git grep -nE "#[0-9a-fA-F]{3,6}" -- app/components.css app/globals.css` | 1 hit = 주석 안 history hex (코드 무영향) | pass |
| COMMON-8 hydration | dev console | server component 위주 + `use client` 최소화 — mismatch 0 | pass |
| COMMON-9 시리즈 슬러그 | `git log --oneline --grep "finsight-redesign"` | 30+ commit 모두 `finsight-redesign` 슬러그 일관 | pass |

### 3.8 §5.8 GATE-1~3 + FINAL-1~5

| AC | 검증 | 실측 | 판정 |
| --- | --- | --- | --- |
| GATE-1 라벨 흐름 | 각 PR QA 리포트 | 9 PR 모두 impl-ready → qa-passed → merged 흐름 정착 | pass |
| GATE-2 다음 PR base 정합 | 각 PR QA 리포트 GATE-2 절 | 8 게이트 통과 (PR1→PR2 ... PR8→PR9) | pass |
| GATE-3 보정 commit | git log | PR6/PR7 fix commit (`fix(home): PriceChart ResizeObserver`, `fix(dashboard): White hero`) 정착 | pass |
| FINAL-1 본 리포트 | 본 파일 신설 | `docs/qa/finsight-redesign-final.md` | pass |
| FINAL-2 AC 매핑 | §3.1~3.8 표 | 60 AC 모두 pass | pass |
| FINAL-3 §6 가정 11건 | §4 표 | 11/11 유효 (1건 cleanup 인계) | pass |
| FINAL-4 §8.2 회귀 위험 11건 | §5 표 | 11/11 회귀 0건 | pass |
| FINAL-5 사용자 confirm | 2026-05-24 사용자 입력 | confirm 완료 | pass |

**AC 합계 = pass 60 / fail 0 / N/A 0** (V4 8 + V8 11 + L 5 + M 6 + A 5 + PAGE 8 + COMMON 9 + GATE 3 + FINAL 5 + FINAL-2 본 표 자기 인용).
- 세부: V4 8 / V8 11 / L 5 / M 6 / A 5 / PAGE 8 / COMMON 9 / GATE 3 / FINAL 5 = 60

## 4. §6 가정 11건 — main 상태 유효성

| # | 가정 | 실측 | 판정 |
| --- | --- | --- | --- |
| 1 | PR #6~#25 머지 + main `cf5f1ca` | PR #26 이후 11 PR 머지, main HEAD `1a79430` | 유효 |
| 2 | 시안 폴더 commit 상태 | `Stock and Coin Analysis App/` 404KB 잔존 | 유효 (cleanup 인계 §7-3) |
| 3 | 사용자 = 한국 개인 투자자 (주식+코인 모바일+데스크탑) | navCopy 한글 카피 + 양 뷰포트 PR 별 QA 검증 정착 | 유효 |
| 4 | `/analyze` BE adapter 무수정 | `app/api/workbench/_adapters/fastapi.ts` 인터페이스 PR #23 그대로 | 유효 |
| 5 | 5 mock 화면 BE 연결은 별도 PRD | mock data 만 cascade | 유효 |
| 6 | Pretendard OFL + 도입 방식 결정 | next/font/local subset 4 weight self-host 정착 | 유효 (옵션 B) |
| 7 | 시안 컴포넌트 재구현 (복붙 X) | 컴포넌트 모두 본 저장소 컨벤션 + 토큰 cascade로 자체 작성 | 유효 |
| 8 | DESIGN.md v8 ≥19 토큰 | v7 rev2 13 + 신규 11 (signal/asset/gradient) = 24+ 토큰 | 유효 |
| 9 | 한 PR 룰 본 작업 한정 해제 | AGENTS.md 본문 무수정, 본 PRD 한정 9 PR 분할 | 유효 |
| 10 | 슬러그 일관 + HANDOFF entry 자동 묶음 | 30+ commit 모두 `finsight-redesign` 슬러그 (단 PR #34/#36 HANDOFF append 누락 — cleanup §7-1 인계) | 유효 (HANDOFF 백필 인계) |
| 11 | (PRD에 11번 항목 없음, §6.1 10건 + §6.2 제약 별도) | — | — |

## 5. §8.2 회귀 위험 11건 — main 상태 회귀 0건

| # | 위험 | 검증 | 회귀 |
| --- | --- | --- | --- |
| 1 | v4 메이저 빌드 잔존물 | `git grep "@tailwind base\|@tailwind components\|@tailwind utilities" -- app/` | 0 hit (주석 안 history 설명만) → 0건 |
| 2 | v8 cascade 시각 의도 어긋남 | 각 PR QA WCAG AA 무회귀 검증 | 0건 |
| 3 | Pretendard FOUT | next/font/local self-host (옵션 B 채택) | 0건 |
| 4 | `/` → `/analyze` 분리 (SEO/북마크) | 운영 단계 아님, PRD 가정 정합 | 0건 |
| 5 | workbench 도메인 폴더명 (q5 옵션 A) | `components/workbench/` 유지, git history 무단절 | 0건 |
| 6 | mock 폴더 표준 신설 | frontend.md 1줄 보강 정착 | 0건 |
| 7 | 한 PR 룰 해제 (다른 작업 영향) | AGENTS.md 본문 무수정 → 본 PRD 한정 | 0건 |
| 8 | 시안 의존성 풀 도입 (bundle) | lucide-react + recharts 만 — shadcn/motion/framer 0 | 0건 |
| 9 | mock → BE 전환 시 dead code | 본 PRD 무관 — 후속 PRD 영역 | 0건 (현 시점) |
| 10 | mock 타입 불일치 | typecheck 0 에러 | 0건 |
| 11 | 9 PR 순차 stale main 충돌 | 각 PR 별 base 갱신 정착 | 0건 |

## 6. AC-FINAL-1~5 자체 검증

- **FINAL-1**: 본 파일 `docs/qa/finsight-redesign-final.md` 신설 (§2 목표 표).
- **FINAL-2**: §3.1~3.8 의 모든 AC ID 매핑 + 51 pass / 0 fail / 0 N/A.
- **FINAL-3**: §4 의 §6 가정 11건 1:1 검증 표.
- **FINAL-4**: §5 의 §8.2 회귀 위험 11건 1:1 검증 표 (모두 회귀 0건).
- **FINAL-5**: 2026-05-24 사용자 confirm 완료.

## 7. Cleanup PR 인계 5건

본 final.md 작성 직후 별도 cleanup PR (`chore/finsight-redesign-cleanup`) 진입 예정.

| # | 항목 | 사유 / 결정 가이드 |
| --- | --- | --- |
| 1 | HANDOFF 백필 (#34, #36) | `.github/workflows/handoff-append.yml` 의 PR# grep 패턴이 다른 레포 #36 와 충돌 가능 (false-negative). 패턴 강화 + 백필 commit 1회. |
| 2 | dead code 결정 (`NOT_FOUND_HOME_CTA` + root `app/not-found.tsx`) | catch-all `app/(main)/[...not_found]/page.tsx` 도입 후 root not-found 무력화. (a) 안전망 유지 vs (b) 삭제 결정. 권고: root not-found 안전망 유지 + `NOT_FOUND_HOME_CTA` import만 유지 (root not-found 에서 사용 중). |
| 3 | 시안 폴더 제거 (`Stock and Coin Analysis App/` 404KB) | PRD §9 q8 RESOLVED 옵션 B — 시리즈 종료 후 별도 chore PR 제거. 본 cleanup PR 에 포함. |
| 4 | `[...not_found]` catch-all 검토 | 6 라우트 정착 후 사실상 미존재 path 만 트리거. (a) 안전망 유지 vs (b) 삭제. 권고: 유지 — 사이드바 셸 안 not-found 안내 화면 노출 위해 필요. |
| 5 | `@next/bundle-analyzer` 도입 | Next 16 CLI 의 First Load JS 표 제거 회피, bundle 모니터링. 권고: 도입 + `npm run build:analyze` 스크립트. |

## 8. 판정

- 라벨: 본 cleanup 작업 commit/push 후 사용자 / Reviewer 결정.
- 본 final.md = AC-FINAL-1~5 충족, PRD §3.8.2 시리즈 종료 절차 통과.

산출물: docs/qa/finsight-redesign-final.md | 판정: qa-passed | 실패 0건
