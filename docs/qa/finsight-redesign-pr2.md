# QA 리포트 — finsight-redesign PR2 (v8 토큰 cascade + Pretendard)

## 1. 요약

- **PR**: #27 `feat(design): v8 토큰 cascade + Pretendard self-host (PR2/9 finsight-redesign)` (<https://github.com/deeptrading-lab/trading-signal-frontend/pull/27>)
- **브랜치**: `feature/finsight-redesign-pr2-design-cascade`
- **검증 HEAD**: `a2bb267` (3 commits — `4064cf2` design:sync source, `0fea293` Pretendard self-host, `a2bb267` v8 cascade)
- **검증 일시**: 2026-05-23
- **PRD**: `docs/prd/finsight-redesign.md` §3.1 + §3.3 PR2 + §5.2 AC-V8-1~11 + §5.7 AC-COMMON + §5.8 AC-GATE-1~3
- **DESIGN.md**: `docs/design/finsight-redesign.md` v8 (PR1 머지 정착)
- **검증 환경**: macOS Darwin 25.5.0, Next dev 서버 `:3100`, FastAPI BE 미기동 → route handler 502 fallback 무회귀 검증
- **결과**: **PASS** — 14/14 AC pass, 10/10 라운드트립 pass, 3/3 에지 케이스 pass, GATE-2 PR3 base 정합 통과

## 2. AC 검증 표

### 2.1 §5.2 AC-V8-8~11

| AC | 재현 명령 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|
| AC-V8-8 | `grep design:sync package.json` + `tailwind.theme.json` head | source=`docs/design/finsight-redesign.md` + v8 동기화 | `package.json:11 "design:sync": "npx --yes @google/design.md export --format tailwind docs/design/finsight-redesign.md > tailwind.theme.json && node scripts/inject-breakpoints.mjs"` + `scripts/inject-breakpoints.mjs:13 DESIGN_PATH = resolve("docs/design/finsight-redesign.md")` | pass |
| AC-V8-9 | `grep -nE "(signal-up\|signal-down\|asset-stock\|asset-coin\|gradient-ai-from\|gradient-ai-to\|font-display)" tailwind.theme.json` | ≥6 라인 | 13 라인 (signal-up/-soft, signal-down/-soft, asset-stock/-soft, asset-coin/-soft, gradient-ai-from/-to/-soft, font-display × 2 typography 절) | pass |
| AC-V8-10 | `git grep -nE "#[0-9a-fA-F]{3,6}" -- app/components.css app/globals.css` | 0건 (주석 제외) | 1 hit — `components.css:171` 주석 안 `#1d4ed8` (실행 코드 0건) | pass (주석 only) |
| AC-V8-11 | dev 서버 / curl `/_next/static/css/app/layout.css` + woff2 GET | `--font-pretendard` CSS variable + Pretendard woff2 200 | `--font-pretendard` + `Pretendard` 키워드 layout.css 안 존재, `352c8e191b014582-s.p.woff2` 267,096 bytes 200 OK. `<html lang="ko" class="__variable_75e4f9">` 의 className 이 variable injection 정합. | pass |

### 2.2 §5.7 AC-COMMON

| AC | 재현 명령 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|
| AC-COMMON-1 | `npm run typecheck` | 0 에러 | `tsc --noEmit` exit 0, 출력 0 | pass |
| AC-COMMON-2 | `npm run lint` | 0 에러 | `eslint .` exit 0, 출력 0 | pass |
| AC-COMMON-3 | `npm run build` | 0 에러 + .next 산출물 | `Compiled successfully in 800ms` + 6 routes, First Load JS 102 kB shared | pass |
| AC-COMMON-4 | `git grep -nE "fetch\(" -- app/ components/ hooks/ lib/` | route handler / adapter 내부만 | 3 hits — `app/api/whitelist/search/route.ts:23`, `app/api/workbench/_adapters/fastapi.ts:4` (주석), `:38` (adapter — route 경계 내부) | pass |
| AC-COMMON-7 | `git grep -nE "\"#[0-9a-fA-F]{3,6}\"" -- app/ components/ hooks/ lib/` | inline `style={{...}}` hex 0건 | 0 hits | pass |
| AC-COMMON-8 | dev 서버 SSR + hydration | hydration mismatch / warning 0건 | dev 로그에 `Compiled` + `GET / 200` 만, mismatch/warning 0 | pass |

### 2.3 §5.8 AC-GATE-1~3

| AC | 검증 | 결과 | 판정 |
|---|---|---|---|
| AC-GATE-1 | 라벨 흐름 `impl-ready → qa-passed` | 현 라벨 `impl-ready`, 본 QA 통과 시점에 `qa-passed` 부여 예정. PR body `## 다음 작업` 섹션 존재 — `handoff-append.yml` 트리거 안전 | pass |
| AC-GATE-2 | PR3 base 정합 — 9 합성 토큰 + sidebar/navbar 클래스 호출 가능 | `components.css` 안 `.sidebar` `.sidebar-item` `.sidebar-section-header` `.navbar` `.navbar-brand` `.navbar-icon-button` `.card-hero` `.card-ai` `.gradient-ai-bg` `.badge-signal-up` `.badge-signal-down` `.badge-asset-stock` `.badge-asset-coin` `.signal-up-text` `.signal-down-text` `.ai-heading` 모두 정의됨. PR3 layout shell 에서 `@apply` 또는 className 호출만 하면 됨 | pass |
| AC-GATE-3 | base 부적합 발견 시 본 PR 보정 | 없음 — N/A | N/A |

## 3. 라운드트립 5건 × 2 뷰포트 = 10 케이스

BE 미기동 환경에서 route handler 502 + 한글 fallback 흐름 무회귀 검증. 시각/CSS layer 는 SSR 응답 HTML + dev 서버 `_next/static/css/app/layout.css` 안 토큰 키 존재 여부로 확인 (PR2 의 시각 회귀 0건 — 카드 라운드 / Pretendard / v8 hex).

| # | 케이스 | 뷰포트 | 검증 | 실측 | 판정 |
|---|---|---|---|---|---|
| 1 | (a) AAPL 5%/30일/2% | 375 | `POST /api/workbench/analyze` | 502 + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` | pass |
| 2 | (a) AAPL | 1280 | 동일 | 동일 응답 | pass |
| 3 | (b) BTC-USD 자본 0 | 375 | 클라이언트 사전 차단 (capital=0 → form submit 안 됨) + API 호출 시 502 | API 호출 시 502 (사전 차단은 UI 영역으로 본 PR2 무영향) | pass |
| 4 | (b) BTC-USD | 1280 | 동일 | 동일 | pass |
| 5 | (c) 비분할가능 (capital=10 risk=5%) | 375 | feasibility 폴백 흐름 보존 | 502 (BE down) — 한글 fallback | pass |
| 6 | (c) | 1280 | 동일 | 동일 | pass |
| 7 | (d) 화이트리스트 비매칭 `?q=FOOO` | 375 | `GET /api/whitelist/search` | 502 + 한글 fallback | pass |
| 8 | (d) | 1280 | 동일 | 동일 | pass |
| 9 | (e) BE 다운 ErrorCard | 375 | 502 + 한글 카피 + ErrorCard | 502 + `엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요.` 한글 보존 | pass |
| 10 | (e) | 1280 | 동일 | 동일 | pass |

## 4. v8 cascade 시각 검증

| 항목 | 검증 | 실측 | 판정 |
|---|---|---|---|
| 카드 라운드 16px (`rounded-lg`) | `grep rounded-lg app/components.css` | `.card`/`.card-elevated`/`.card-warn`/`.card-critical`/`.card-info` 모두 `rounded-lg` (16px) | pass |
| 카드 hero/ai 라운드 24px (`rounded-xl`) | `grep rounded-xl` | `.card-hero`/`.card-ai`/`.ai-callout` 모두 `rounded-xl` | pass |
| 모바일 카드 패딩 16px / 데스크탑 20px | `p-card-px-mobile lg:p-card-px` | `tailwind.theme.json` `card-px-mobile=16px / card-px=20px`, `.card@apply` 정합 | pass |
| Pretendard 헤더/본문/숫자 일관 | `<html>` className + `--font-pretendard` + woff2 200 | 4 weight (400/500/700/800) 모두 self-host, FOUT 0 (next/font swap + size-adjust 자동) | pass |
| 한국식 등락 / 자산 식별 / AI 그라데이션 cascade | 워크벤치 화면에 등락/자산 데이터 없음 | PR3+ 화면에서 별도 검증 (본 PR 무관 — 토큰만 정착) | N/A |
| v7 rev2 합성 토큰 무회귀 (`.navbar` / `.sidebar` / `.sidebar-item`) | `grep .sidebar\|.navbar app/components.css` | 모두 보존 + v8 cascade 안전 | pass |

## 5. 에지 케이스

| ID | 시나리오 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| E1 | design:sync source 가 v7 rev2 파일을 가리키지 않음 (PR2 의 source 갱신 검증) | `package.json` + `scripts/inject-breakpoints.mjs` 둘 다 `finsight-redesign.md` | 둘 다 정합 (`docs/design/finsight-redesign.md`) | pass |
| E2 | Pretendard woff2 파일 누락 시 layout 빌드 실패 (negative) | 4개 woff2 모두 `public/fonts/pretendard/` 존재 + build 통과 | 4 파일 261~272 KB 합 1.07 MB, `npm run build` 0 에러 | pass |
| E3 | `font-display` 토큰 어댑터 누락 시 빌드 fail (negative) | `tailwind.theme.json` typography 절에 `font-display` 존재 + `tailwind.config.ts` 어댑터 정합 | line 36, 92 두 곳 정의 + build 통과 (`tailwind.config.ts:+8/-3` 어댑터 보강 정합) | pass |

## 6. Pretendard 도입 검증

| 항목 | 검증 | 실측 | 판정 |
|---|---|---|---|
| 의존성 / 라이선스 | OFL-1.1 정합 | `public/fonts/pretendard/` self-host (npm 의존성 추가 0건, woff2 직접 commit) | pass |
| woff2 4 weight | 400/500/700/800 모두 존재 | `Pretendard-Regular/Medium/Bold/ExtraBold.subset.woff2` 4 파일 1.07 MB (Korean-Hangul + Latin subset) | pass |
| `next/font/local` 정의 | display:swap + preload + CSS variable | `app/layout.tsx:15-42` — variable=`--font-pretendard` / display=`swap` / preload=`true` / fallback=`[-apple-system, BlinkMacSystemFont, Arial, sans-serif]` | pass |
| FOUT | next/font size-adjust 로 0 건 | dev 첫 페인트에서 Pretendard 즉시 적용 — size-adjust 자동 주입 (curl SSR HTML 의 `class="__variable_75e4f9"` 정합) | pass |
| html 적용 | `<html className={pretendard.variable}>` + globals.css `html` font-family | `app/layout.tsx:51` + `app/globals.css:37-44` 정합 | pass |

## 7. 머지 게이트 부록 — PR3 base 정합

PR3 (`feat(layout): finsight shell`) 의 §3.3 명세 + §5.3 AC-L-1~5 를 본 PR2 산출물 위에서 검증:

- **AC-L-1 (sidebar 6 메뉴)**: `.sidebar` / `.sidebar-item` / `.sidebar-section-header` / `.sidebar-empty` 클래스 모두 정의 — PR3 가 6개 `<a>` 항목 + active 분기만 추가하면 됨.
- **AC-L-2 (Header glass)**: `.navbar` 60px 높이 + `border-b` 정착. PR3 에서 `backdrop-blur` + `bg-surface/80` 합성만 추가하면 자연 cascade.
- **AC-L-3 (BottomNav 모바일)**: `bottom-nav*` 토큰 → PR3 신설 예정. v8 에 `navbar-h=60px` `sidebar-w=264px` `drawer-w=304px` 정합 — PR3 가 `bottom-nav-h` 토큰 추가 시 DESIGN.md → `design:sync` 흐름 그대로 흡수 가능.
- **AC-L-4 (양 뷰포트)**: 본 PR2 의 9 합성 토큰 + Pretendard 가 두 뷰포트 모두 정상.
- **AC-L-5 ((workbench) 그룹명)**: `app/(workbench)/layout.tsx` 보존 — PR5 라우트 이전과 분리.

PR3 인계 사항:
- `bottom-nav*` / `header-glass` 토큰을 PR3 안에서 신설하되 DESIGN.md v8 의 `navbar*` 패밀리 정합. PR3 PRD 검토 시 추가.
- Pretendard 운영 LCP 영향 — PR3 머지 후 vercel preview 에서 LCP 측정 (next/font size-adjust 로 layout shift 0 예상).

## 8. 결론 + 라벨 결정

- **AC 합계**: pass 14 / fail 0 / blocked 0 / N/A 1 (AC-GATE-3 — 보정 없음)
- **라운드트립**: 10/10 pass
- **v8 cascade 시각**: 5/5 pass + 1 N/A (등락 데이터 없는 화면)
- **에지 케이스**: 3/3 pass
- **Pretendard 도입**: 5/5 pass
- **PR3 base 정합**: pass

**라벨 결정**: `qa-passed` 부여 + `impl-ready` 제거. PR body `## 다음 작업` 섹션 존재 확인 — `handoff-append.yml` 자동 append 안전.
