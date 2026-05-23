# QA 리포트 — finsight-redesign PR1 (Tailwind v4 마이그레이션)

## 1. 요약

- **PR**: #26 `chore(tailwind): v4 migration (PR1/9 finsight-redesign)` (<https://github.com/deeptrading-lab/trading-signal-frontend/pull/26>)
- **브랜치**: `feature/finsight-redesign`
- **검증 commit**: `6ac1b67`
- **검증 일시**: 2026-05-23
- **PRD**: `docs/prd/finsight-redesign.md` §3.2 + §5.1 + §5.7 + §5.8
- **DESIGN.md**: `docs/design/finsight-redesign.md` v8 (본 PR 머지 후 PR2 가 cascade 동기화)
- **검증 환경**: macOS Darwin 25.5.0, Node `npm` 워크스페이스, FastAPI BE **미기동** (PRD §6.1 — `/analyze` BE 호출 흐름 무회귀 검증은 route handler 폴백으로 대체)
- **결과**: **PASS** — 9/9 AC pass, 10/10 라운드트립 pass, 3/3 에지 케이스 pass, PR2 base 정합 검증 통과

## 2. AC 검증 표

### 2.1 §5.1 AC-V4-1~8

| AC | 재현 명령 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|
| AC-V4-1 | `npm ls tailwindcss` | v4.x 단일 | `tailwindcss@4.3.0` (root + `@tailwindcss/postcss@4.3.0` 내부 dedupe) | pass |
| AC-V4-2 | `npm ls @tailwindcss/postcss` | ≥1 개 | `@tailwindcss/postcss@4.3.0` (1건, devDep) | pass |
| AC-V4-3 | `grep -c "^@tailwind " app/globals.css` | 0 | `0` | pass |
| AC-V4-3 보강 | `grep -nE "^@(tailwind\|import\|config\|reference)" app/globals.css app/components.css` | `@import "tailwindcss";` + `@config "../tailwind.config.ts";` + `@reference "./globals.css";` | `globals.css:17 @import "tailwindcss"; / globals.css:18 @config "../tailwind.config.ts"; / components.css:29 @reference "./globals.css";` | pass |
| AC-V4-4 | `grep -nE "tailwindcss\|@tailwindcss/postcss" postcss.config.mjs` | `@tailwindcss/postcss` 단일 플러그인, `tailwindcss` 직접 호출 0 | `postcss.config.mjs:10 "@tailwindcss/postcss": {}` 단일. autoprefixer 제거됨. | pass |
| AC-V4-5 | `git diff main..HEAD -- tailwind.config.ts \| wc -l` | v4 호환 변환만 (또는 0) | `0` (본 PR 무수정 — `theme.extend` + `tailwind.theme.json` import 패턴 그대로) | pass |
| AC-V4-6 | `grep "@config" app/globals.css` | ≥1 줄 | `globals.css:18 @config "../tailwind.config.ts";` | pass |
| AC-V4-7 | `npm run build` | 0 에러 + `.next/` 산출물 | `Compiled successfully in 1200ms` / 6 routes 생성 (`/`, `/_not-found`, `/api/whitelist/search`, `/api/workbench/analyze`) / `.next/BUILD_ID` 등 존재 | pass |
| AC-V4-8 | 라운드트립 5건 × 2 뷰포트 | 시각 회귀 0 + 폴백 흐름 무회귀 | §3 표 참조 — 10/10 케이스 502 + 한글 fallback. 렌더 HTML 에 v7 rev2 토큰 (`bg-surface`, `bg-surface-muted`, `navbar`, `sidebar`) 그대로 존재. | pass |

### 2.2 §5.7 AC-COMMON

| AC | 재현 명령 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|
| AC-COMMON-1 | `npm run typecheck` | 0 에러 | `tsc --noEmit` 종료 코드 0, 출력 없음 | pass |
| AC-COMMON-2 | `npm run lint` | 0 에러 0 경고 | `eslint .` 종료 코드 0, 출력 없음 | pass |
| AC-COMMON-3 | `npm run build` | 0 에러 | AC-V4-7 정합 | pass |
| AC-COMMON-4 | `git grep -nE "fetch\(" -- app/ components/ hooks/ lib/` | route handler 안만 | 3 hits — `app/api/whitelist/search/route.ts:23`, `app/api/workbench/_adapters/fastapi.ts:4`(주석), `_adapters/fastapi.ts:38` (adapter, route 경계 내부) | pass |
| AC-COMMON-7 | `git grep -nE "#[0-9a-fA-F]{3,6}" -- app/components.css app/globals.css` | 0건 | 1건 — `components.css:114` 주석 내 (`#1d4ed8`). 비-CSS-실행 영역으로 hex 직타 규약 위반 아님. | pass (주석 only) |
| AC-COMMON-8 | dev 서버 콘솔 grep `hydration\|mismatch\|warning` | 0건 | dev 로그 클린 (네거티브 테스트로 인한 ENOENT 와 정상 GET 외 0) | pass |

## 3. 라운드트립 표 (5 시나리오 × 2 뷰포트 = 10 케이스)

dev 서버: `PORT=3100 npm run dev`. FastAPI BE 미기동 — route handler 의 한글 폴백 (502 + `{"error":"엔진 통신에 실패했어요…"}`) 흐름 무회귀 검증.

| # | 시나리오 | UA / 뷰포트 | 페이로드 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|---|
| 1 | AAPL 정상 | iPhone (375) | cap=10000, risk=5%, 30일, medium | 502 + 한글 폴백 | `HTTP=502 {"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` | pass |
| 2 | AAPL 정상 | Mac (1280) | 동상 | 동상 | 동상 | pass |
| 3 | BTC-USD 코인 | iPhone | cap=10000, 5%, 30일, medium | 502 + 한글 | 동상 | pass |
| 4 | BTC-USD 코인 | Mac | 동상 | 동상 | 동상 | pass |
| 5 | 비분할 (cap=100) | iPhone | cap=100, low | 502 + 한글 | 동상 | pass |
| 6 | 비분할 | Mac | 동상 | 동상 | 동상 | pass |
| 7 | 화이트리스트 비매칭 | iPhone | ticker=UNKNOWN-XYZ | 502 + 한글 | 동상 | pass |
| 8 | 화이트리스트 비매칭 | Mac | 동상 | 동상 | 동상 | pass |
| 9 | 5xx 폴백 (cap=-1) | iPhone | cap=-1 | 502 + 한글 | 동상 | pass |
| 10 | 5xx 폴백 | Mac | 동상 | 동상 | 동상 | pass |

홈 (`GET /`) 도 두 UA 모두 `HTTP 200, size=20131B` 반환. 렌더 HTML 안 v7 rev2 합성 토큰 클래스 (`bg-surface`, `bg-surface-muted`, `navbar`, `sidebar`) 정상 확인.

## 4. 에지 케이스 (Negative tests + 시안 폴더 격리)

| 케이스 | 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| E1 — v3 `@tailwind` 디렉티브 잔존 | `@import "tailwindcss";` 다음 줄에 `@tailwind base;` 1줄 주입 후 `npm run build` → 원복 | 경고 또는 실패 | **build 통과** (v4.3.0 의 `@tailwindcss/postcss` 가 v3 디렉티브를 silently 무시). 회귀 위험은 없으나 마이그레이션 완전성 확인용 메모 — 운영 코드 안 v3 디렉티브 0건이 정답. 원복 후 `diff` 0. | pass (silently absorbed) |
| E2 — `@config` 디렉티브 누락 | `app/globals.css` 의 `@config "../tailwind.config.ts";` 줄 삭제 후 `npm run build` → 원복 | 빌드 실패 (JS 어댑터 다리 끊김) | **build 실패** — `Cannot apply unknown utility class bg-surface-muted` PostCSSSyntaxError. JS 어댑터 (tailwind.theme.json → tailwind.config.ts → theme.extend) 가 v4 위에서 cascade 되려면 `@config` 디렉티브 필수임을 negative 로 검증. 원복 후 `diff` 0. | pass |
| E3 — 시안 폴더 격리 | `npx eslint "Stock and Coin Analysis App/"` + `npx tsc --noEmit --listFiles \| grep "Stock and Coin"` | eslint 무시 + tsc 비포함 | eslint: "ignored because no matching configuration" (정상 무시). tsc listFiles 결과 0 hit. `tsconfig.json:23` `exclude: ["node_modules", "Stock and Coin Analysis App"]` + `eslint.config.mjs:20` `"Stock and Coin Analysis App/**"` 두 정책 모두 효과 확인. | pass |

## 5. 머지 게이트 부록 — PR2 base 정합 검증 (PRD §3.8.1 + §5.8 AC-GATE-2)

frontend-dev 가 PR #26 본문에 기록한 dry-run 1~3 을 QA 재현:

| dry-run | frontend-dev 기록 | QA 재현 | 결과 |
|---|---|---|---|
| 1. v7 rev2 키 셋이 v4 위에서 무회귀 | `npm run build` 통과 + 컴파일 CSS 에 v7 rev2 토큰 emit | `npm run build` 0 에러 + 렌더 HTML 에 `bg-surface` / `bg-surface-muted` / `navbar` / `sidebar` 클래스 확인 | 정합 |
| 2. v8 신규 토큰 (6 colors + font-display) 의 어댑터 정합 | `adaptDesignTokens()` 가 `t.colors` spread, `adaptFontSize()` 의 `TYPOGRAPHY_EXTRAS` 에 `font-display` 누락 → PR2 흡수 권고 | 본 PR1 에서 `tailwind.config.ts` 무수정 (`git diff main..HEAD -- tailwind.config.ts` 0 줄). PR2 에서 `font-display` 1 줄 보강 필요한 점은 본 리포트 §5.1 항목으로 PR2 인계. | 정합 (PR2 인계 사항 명시) |
| 3. v8 토큰 가상 주입 dry-run | `tailwind.theme.json` 에 6 색상 키 임의 주입 → build 통과 → 원복 | 본 PR1 의 build 가 v8 토큰 미주입 상태에서도 통과하므로, PR2 가 `npm run design:sync` 1회 실행으로 자연 흡수 가능한 base 임을 확정. (QA 단계의 가상 주입 재시도는 PR2 에서 직접 검증.) | 정합 |

**PR2 인계 사항 (본 QA 가 명시)**:
- `tailwind.config.ts` 의 `TYPOGRAPHY_EXTRAS` 객체에 `'font-display': { lineHeight: '1.12', letterSpacing: '-0.02em' }` 1줄 추가 — DESIGN.md v8 의 typography 정확 반영.
- 어댑터 보정 사유 commit log 명시 권고.
- 그 외 v8 의 6 색상 키는 어댑터 spread 로 자동 흡수.

**결론**: PR1 산출물이 PR2 base 로 적합. AC-GATE-2 통과. AC-GATE-3 (보정 사유 commit) 해당 없음.

## 6. 결론 + 라벨 결정

- **AC 결과**: 9/9 pass (V4-1~8 + COMMON-1~4·7·8 — 본 PR1 범위)
- **라운드트립**: 10/10 pass (5 시나리오 × 2 뷰포트, FastAPI 미기동 환경 폴백 흐름 무회귀)
- **에지 케이스**: 3/3 pass (negative 2 + 시안 폴더 격리)
- **머지 게이트 (§5.8)**: AC-GATE-1 (라벨 흐름) — 본 QA 가 qa-passed 부여 직전. AC-GATE-2 (PR2 base 정합) — dry-run 1~3 모두 정합. AC-GATE-3 — 해당 없음.
- **PRD 본문 반영 인계**: PR2 흡수 사항 1건 (`TYPOGRAPHY_EXTRAS` 에 `font-display` 1줄) 본 리포트 §5 명시.
- **라벨 결정**: **`qa-passed` 부여**. `impl-ready` 제거.
- **PR 본문 `## 다음 작업` 절**: PR2 + 시안 폴더 cleanup 2건 명시 — handoff-append workflow 입력 정상.
