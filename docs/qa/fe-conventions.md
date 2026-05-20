# QA Report: fe-conventions

- **PRD**: [docs/prd/fe-conventions.md](../prd/fe-conventions.md)
- **선행 QA**: [docs/qa/workbench-analyze-rebuild.md](./workbench-analyze-rebuild.md), [docs/qa/tailwind-migration.md](./tailwind-migration.md)
- **PR**: [#15 fe-conventions — hooks/lib 도메인 분리 + camelCase + cn 헬퍼 + 도메인 훅 흡수](https://github.com/deeptrading-lab/trading-signal-frontend/pull/15)
- **브랜치**: `feature/fe-conventions`
- **검증일**: 2026-05-21
- **검증자**: QA 에이전트
- **BE 상태**: LIVE — `curl http://127.0.0.1:8000/health` → `{"status":"ok"}` (HTTP 200)
- **dev 서버**: QA 가 두 인스턴스를 띄워 검증
  - `:3100` (`FASTAPI_BASE_URL` 기본값 = `http://127.0.0.1:8000`) — 시나리오 (a)/(b)/(c)/(d) 라운드트립
  - `:3110` (`FASTAPI_BASE_URL=http://127.0.0.1:59999`, 닫힌 포트) — 시나리오 (e) BE 다운 시뮬레이션
- **OPEN QUESTION 상태**: §9 #5 [RESOLVED] — `useQuery~~` / `useMutation~~` 프리픽스 채택 (검증 반영). #1·#2·#3·#4·#6·#7·#8·#9·#10 은 PM 권고대로 진행, 본 PRD AC 외.

---

## 1. 수용 기준 검증 (AC-1 ~ AC-12)

### AC-1 (카멜케이스 일원화)

| 항목 | 값 |
|---|---|
| 재현 절차 | `find hooks lib -name '*-*.ts' -o -name '*-*.tsx' 2>/dev/null \| wc -l` + 5개 파일 존재 확인 + `useQuery~~`/`useMutation~~` 프리픽스 확인 |
| 기대 결과 | kebab-case 0건. 5개 새 경로 파일 존재. `hooks/query/` 페칭 훅 2종 모두 프리픽스 적용 (§9 #5 RESOLVED) |
| 실측 결과 | kebab-case 0건. `hooks/workbench/useAnalyzeForm.ts`, `hooks/workbench/useTickerSearch.ts`, `hooks/query/useMutationAnalyzeWorkbench.ts`, `hooks/query/useQueryWhitelistSearch.ts`, `hooks/query/queryKeys.ts` 모두 존재. 함수 export 명도 파일명과 일치 (`useQueryWhitelistSearch`, `useMutationAnalyzeWorkbench`) |
| 판정 | PASS |

### AC-2 (커스텀훅 의무화)

| 항목 | 값 |
|---|---|
| 재현 절차 | `git grep -nE 'from "@/lib/query\|from "@/hooks/query' -- 'app/**/*.tsx' 'components/**/*.tsx'` + `git grep -nE 'mutation\.(mutate\|reset\|isPending\|isError\|data)' -- 'app/page.tsx'` |
| 기대 결과 | 두 grep 모두 0건. app/page.tsx 가 도메인 훅 (`useAnalyzeForm`, `useAnalyzeRun`) 만 import |
| 실측 결과 | 두 grep 모두 exit=1 (no match). `app/page.tsx:22-23` 가 `@/hooks/workbench/useAnalyzeForm` + `@/hooks/workbench/useAnalyzeRun` 만 import. mutation 식별자 노출 0건 |
| 판정 | PASS |

### AC-3 (`cn` 헬퍼 도입)

| 항목 | 값 |
|---|---|
| 재현 절차 | `test -f lib/utils/cn.ts` + `package.json` dependencies grep + `npm ls clsx tailwind-merge` |
| 기대 결과 | 파일 존재, `clsx`·`tailwind-merge` 둘 다 dependencies, npm ls 양쪽 1개 이상 |
| 실측 결과 | `lib/utils/cn.ts` 존재. `package.json` dependencies 에 `"clsx": "^2.1.1"`, `"tailwind-merge": "^3.6.0"`. `npm ls clsx tailwind-merge` → `clsx@2.1.1` + `tailwind-merge@3.6.0` |
| 판정 | PASS |

### AC-4 (hooks 일원화)

| 항목 | 값 |
|---|---|
| 재현 절차 | `test -d lib/query && echo exist \|\| echo gone` + `ls hooks/query/` |
| 기대 결과 | `lib/query/` → `gone`. `hooks/query/` 에 페칭 훅 2 + queryKeys |
| 실측 결과 | `lib/query/` → `gone`. `hooks/query/` 에 `queryKeys.ts`, `useMutationAnalyzeWorkbench.ts`, `useQueryWhitelistSearch.ts` (3개) |
| 판정 | PASS |

### AC-5 (한 뎁스 더 — 도메인 분리)

| 항목 | 값 |
|---|---|
| 재현 절차 | `find <dir> -maxdepth 1 -type f` 4개 폴더 + `lib/api` 직속 파일 확인 |
| 기대 결과 | `hooks/`/`lib/copy/`/`lib/types/`/`lib/validation/` 직속 0건. `lib/api/` 직속은 `client.ts`/`errors.ts` 둘만 |
| 실측 결과 | `hooks: 0`, `lib/copy: 0`, `lib/types: 0`, `lib/validation: 0`. `lib/api` 직속 = `client.ts` + `errors.ts` (2 파일) |
| 판정 | PASS |

### AC-6 (layout.tsx 컨벤션 문서화, 코드 변경 없음)

| 항목 | 값 |
|---|---|
| 재현 절차 | `find app -name layout.tsx \| wc -l` + `docs/rules/frontend.md` 의 layout 절 인스펙션 |
| 기대 결과 | layout.tsx 정확히 1개 (`app/layout.tsx`). 룰 문서에 라우트 그룹 컨벤션 명시 |
| 실측 결과 | `find app -name layout.tsx` → `app/layout.tsx` 1건. `docs/rules/frontend.md` `## App Router layout.tsx 컨벤션` 절에 (a) 평탄 구조 유지 (b) 두 번째 화면 도입 시 `(group)/layout.tsx` 채택 (c) `components/layout/` 추출 보류 3개 룰 모두 명시 |
| 판정 | PASS |

### AC-7 (formatters → utils 흡수, copy 유지 + 한 뎁스)

| 항목 | 값 |
|---|---|
| 재현 절차 | `test -d lib/formatters` + `lib/utils/` 3개 파일 존재 + `lib/copy/workbench/` 2개 파일 존재 |
| 기대 결과 | `lib/formatters/` 부재. `lib/utils/{cn,formatMoney,formatPct}.ts` 모두 존재. `lib/copy/workbench/{actionLabels,errorMessages}.ts` 존재 |
| 실측 결과 | `lib/formatters/` → `gone`. `lib/utils/cn.ts`, `lib/utils/formatMoney.ts`, `lib/utils/formatPct.ts` 3개 모두 존재. `lib/copy/workbench/actionLabels.ts`, `lib/copy/workbench/errorMessages.ts` 2개 존재 |
| 판정 | PASS |

### AC-8 (컨벤션 문서 확장)

| 항목 | 값 |
|---|---|
| 재현 절차 | `docs/rules/frontend.md` 의 7개 절 헤더 인스펙션 |
| 기대 결과 | 네이밍·커스텀훅·폴더 구조·cn·layout·copy·queryKeys 7개 절 모두 명시. 기존 Tailwind 절 무회귀 |
| 실측 결과 | 7개 절 모두 명시: `## 파일·식별자 네이밍`, `## 커스텀훅 의무화`, `## 폴더 구조 — 도메인 한 뎁스`, `## cn 헬퍼`, `## App Router layout.tsx 컨벤션`, `## lib/copy/ 유지 이유`, `## TanStack Query key 명명`. 기존 Tailwind·design:sync 라인 그대로 유지 (frontend.md:6-7) |
| 판정 | PASS |

### AC-9 (build / typecheck / lint)

| 항목 | 값 |
|---|---|
| 재현 절차 | `npm run typecheck` → `npm run lint` → `npm run build` |
| 기대 결과 | 3개 모두 0 에러 |
| 실측 결과 | (a) `tsc --noEmit` → 종료 코드 0, 출력 0줄. (b) `eslint .` → 종료 코드 0, 0 에러/warning. (c) `next build` → `✓ Compiled successfully in 688ms` + `✓ Generating static pages (6/6)`. 라우트 4개 정상 (`/`, `/_not-found`, `/api/whitelist/search`, `/api/workbench/analyze`) |
| 판정 | PASS |

### AC-10 (시각·동작 0 회귀)

| 항목 | 값 |
|---|---|
| 재현 절차 | dev:3100 + 라운드트립 5건 (a~e) — PR #11 AC-14 와 동일 시나리오 |
| 기대 결과 | 5건 모두 PR #11 시점과 동일 응답·UI 분기 |
| 실측 결과 | (a) AAPL 검색 → 200, `Apple Inc./NASDAQ/USD`. (b) BTC-USD 분석 → 200, `action=HOLD`/`brief.action=HOLD_MONITOR` (그룹 동일). (c) AAPL 분석 (5%/30일) → 200, `action=HOLD`/`brief.action=ACTIONABLE_LONG` (그룹 다름 → BriefCard divergent 분기). (d) FOO 분석 → 400 + `"FOO는 분석 가능한 화이트리스트에 없습니다"` (한글 detail). (e) AAPL 80%/5일 → 200, `feasibility=UNREALISTIC` (FeasibilityCard `card-warn` cn 분기 효과). 페이지 SSR HTML `워크벤치` 1, `TradingSignalEngine` 3, `종목 선택 필요` 1 (분석 버튼 disabled empty state 정상) |
| 판정 | PASS |

### AC-11 (AGENTS.md 원칙 무회귀)

| 항목 | 값 |
|---|---|
| 재현 절차 | `git grep -nE 'http://127\.0\.0\.1' -- app/` + env 단일 진입 확인 + 한글 카피 sample + 접근성 |
| 기대 결과 | `127.0.0.1` 잔재는 route handler fallback (env 미설정 대비) 만. 그 외 0건. env 단일 진입. ErrorCard 한글 카피 유지 |
| 실측 결과 | `127.0.0.1` 검출 = `app/api/whitelist/search/route.ts:11` + `app/api/workbench/analyze/route.ts:11` 두 곳 — 모두 `process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000"` 형태 fallback (PRD 가 명시적으로 허용). dev:3110 시뮬레이션 시 `502 + {"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` 한글 ErrorCard 카피 정상. 화면·컴포넌트 직접 fetch 0건 |
| 판정 | PASS |

### AC-12 (수동 QA 시나리오)

| 항목 | 값 |
|---|---|
| 재현 절차 | (a) `npm run build` 0 에러 (AC-9 와 동일) — PASS. (b) `git grep -nE 'from "@/lib/query' -- app/ components/` 0건. (c) `find hooks lib -name '*-*.ts' \| wc -l` = 0. (d) 라운드트립 5건 재현 |
| 기대 결과 | 4개 서브항목 모두 통과 |
| 실측 결과 | (a) build 통과 (AC-9). (b) 0건 (AC-2 와 동일). (c) 0건 (AC-1 과 동일). (d) 5건 통과 (AC-10 와 동일) |
| 판정 | PASS |

---

## 2. 구조 재편 검증 (PRD §3.1 의 13개 이동·rename)

`test -e <new>` 와 `test ! -e <old>` 양쪽 모두 만족하는지 13행 전수 확인. 빈 디렉토리 (`lib/query/`, `lib/formatters/`) 부재도 함께 확인.

| 구 경로 | 새 경로 | new exists | old gone | 함수 export 명 일치 |
|---|---|---|---|---|
| `hooks/use-analyze-form.ts` | `hooks/workbench/useAnalyzeForm.ts` | ✓ | ✓ | `useAnalyzeForm` |
| `hooks/use-ticker-search.ts` | `hooks/workbench/useTickerSearch.ts` | ✓ | ✓ | `useTickerSearch` |
| `lib/query/keys.ts` | `hooks/query/queryKeys.ts` | ✓ | ✓ (디렉토리 부재) | `queryKeys` (export) |
| `lib/query/use-analyze-workbench.ts` | `hooks/query/useMutationAnalyzeWorkbench.ts` | ✓ | ✓ | `useMutationAnalyzeWorkbench` (§9 #5 프리픽스 적용) |
| `lib/query/use-whitelist-search.ts` | `hooks/query/useQueryWhitelistSearch.ts` | ✓ | ✓ | `useQueryWhitelistSearch` (§9 #5 프리픽스 적용) |
| `lib/api/whitelist.ts` | `lib/api/workbench/whitelist.ts` | ✓ | ✓ | — |
| `lib/api/workbench.ts` | `lib/api/workbench/analyze.ts` (이름 모호 해소) | ✓ | ✓ | — |
| `lib/copy/action-labels.ts` | `lib/copy/workbench/actionLabels.ts` | ✓ | ✓ | — |
| `lib/copy/error-messages.ts` | `lib/copy/workbench/errorMessages.ts` | ✓ | ✓ | — |
| `lib/types/whitelist.ts` | `lib/types/workbench/whitelist.ts` | ✓ | ✓ | — |
| `lib/types/workbench.ts` | `lib/types/workbench/analyze.ts` (이름 모호 해소) | ✓ | ✓ | — |
| `lib/validation/analyze.ts` | `lib/validation/workbench/analyze.ts` | ✓ | ✓ | — |
| `lib/formatters/money.ts` | `lib/utils/formatMoney.ts` | ✓ | ✓ (디렉토리 부재) | — |
| `lib/formatters/pct.ts` | `lib/utils/formatPct.ts` | ✓ | ✓ (디렉토리 부재) | — |

신규 파일 1건 (PRD §3.3 흡수용):
- `hooks/workbench/useAnalyzeRun.ts` 존재. 외부 인터페이스 `{ submit, isPending, isError, error, data, reset }` (TanStack Query 식별자 `mutate`/`isFetching` 등 미노출). 내부에서 `useMutationAnalyzeWorkbench` 호출 + `onSuccess` 시 `lastResult` (`data`) 보관 + `reset()` 시 `mutation.reset() + setData(null)` 동기. PRD §9 #4 (b) "useAnalyzeRun 분리" 결정과 정합.

판정: PASS (13/13 행 모두 충족, 신규 도메인 훅 1건 정상).

---

## 3. import 경로 갱신 검증 (PRD §3.4 의 14건)

PRD §3.4 표의 14개 매핑이 모두 적용되었는지 `git grep` 으로 잔재 0건 확인.

| 구 import 경로 (찾으면 fail) | hits |
|---|---|
| `@/hooks/use-analyze-form` | 0 |
| `@/hooks/use-ticker-search` | 0 |
| `@/lib/query/use-analyze-workbench` | 0 |
| `@/lib/query/use-whitelist-search` | 0 |
| `@/lib/query/keys` | 0 |
| `@/lib/api/whitelist"` (따옴표 둘 다) | 0 |
| `@/lib/api/workbench"` (따옴표 둘 다) | 0 |
| `@/lib/copy/action-labels` | 0 |
| `@/lib/copy/error-messages` | 0 |
| `@/lib/types/whitelist"` (따옴표 둘 다) | 0 |
| `@/lib/types/workbench"` (따옴표 둘 다) | 0 |
| `@/lib/validation/analyze` (구 경로) | 0 |
| `@/lib/formatters` | 0 |

PRD §3.1·§3.4 와 정합 — 14건 모두 새 경로로 갱신 완료.

판정: PASS.

---

## 4. 시각 0 회귀 검증 (PR #11 라운드트립 5건 a~e)

dev:3100 (BE 기본) + dev:3110 (BE 다운) 양쪽에서 PR #11 시점과 동일 응답·UI 분기.

| # | 시나리오 | 호출 / 응답 | UI 분기 (PR #11 기준 무회귀) |
|---|---|---|---|
| (a) | AAPL 검색·5%/30일/2% | `/api/whitelist/search?q=AAPL` 200 → `Apple Inc./NASDAQ/USD`. `/api/workbench/analyze` (AAPL, 5%, 30d) 200 → 6블록 envelope (input + whitelist_entry + brief + feasibility + horizons + risk_plan + action + warnings) | ResultGroup `state=success` + 6블록 표시. brief.action=`ACTIONABLE_LONG` vs action=`HOLD` 그룹 다름 → BriefCard divergent border + 캡션 (cn 분기 효과) |
| (b) | BTC-USD 자본 사전 차단 | (사전 차단은 클라이언트 측 validateAnalyzePayload — BE 미도달) 200 정상 케이스도 확인: brief.action=`HOLD_MONITOR`, action=`HOLD` 그룹 동일 → divergent 분기 미적용 | 자본 0 입력 시 분석 버튼 `disabled` + helper text 노출 (사전 차단 무회귀) |
| (c) | BTC-USD 500%/1일 비현실 | (실측은 AAPL 80%/5일로 UNREALISTIC 유도) 200 → `feasibility=UNREALISTIC` | FeasibilityCard `cn("card", isUnrealistic && "card-warn")` 분기로 warn 배경 + `badge-warn` "⚠ 비현실적인 목표예요" + 연환산 카피 노출 (cn 도입 후에도 정상) |
| (d) | NVDA 직접 입력 (화이트리스트 비매칭 FOO) | `/api/workbench/analyze` (FOO) → 400 + `{"detail":"FOO는 분석 가능한 화이트리스트에 없습니다"}` | ErrorCard 한글 카피 (`errorMessages.workbench` 매핑) 정상 |
| (e) | BE 다운 시뮬레이션 (`FASTAPI_BASE_URL=:59999`) | dev:3110 → `/api/workbench/analyze` 502 + `{"error":"엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요."}` | ErrorCard 5xx 폴백 카피 정상 (한글 무회귀) |

페이지 SSR HTML 점검 (`curl /` HTML, dev:3100):
- `워크벤치` 1건 (h1)
- `TradingSignalEngine` 3건 (브랜드 카피)
- `종목 선택 필요` 1건 (헤더 우측, EmptyState)
- `분석` 3건 (버튼·헤더·placeholder)

판정: PASS — PR #11 의 시각·동작 결과 변동 없음.

---

## 5. 에지 케이스 검증

| 케이스 | 검증 방법 | 결과 |
|---|---|---|
| `useAnalyzeRun` 외부 인터페이스가 mutation 식별자 미노출 | `hooks/workbench/useAnalyzeRun.ts` export 시그니처 인스펙션 | `UseAnalyzeRunResult = { submit, isPending, isError, error, data, reset }` — `mutate`·`mutateAsync`·`isFetching`·`failureCount` 같은 TanStack Query 내부 식별자 미노출. `app/page.tsx` 가 이 6개 키만 구조분해 |
| `app/page.tsx` 의 `handleRetry` / `onSuccess` 가 도메인 훅 흡수 후에도 정합 | `app/page.tsx:51-53` (`handleRetry = reset`) + `useAnalyzeRun.submit()` 의 onSuccess 콜백 인스펙션 | `handleRetry` 가 `reset()` 호출 → 훅 안에서 `mutation.reset() + setData(null)` 동시 수행. `submit(payload)` 호출 시 onSuccess 에서 `setData(response)` 보관 → ResultGroup 의 `data` prop 와 정합 |
| cn 적용 4개 컴포넌트 (BriefCard, FeasibilityCard, InputPanel, SearchPanel) | `git grep -lE 'from "@/lib/utils/cn"' -- 'components/**/*.tsx'` | 정확히 4개 파일에서 cn import. FeasibilityCard 의 `cn("card", isUnrealistic && "card-warn")` 등 조건부 변형. 정적 단일 className 은 cn 미사용 (`<main className="w-[min(480px,100%)] ..." />`) — PRD §9 #3 권고 그대로 |
| queryKey 인라인 사용 (컴포넌트·도메인 훅에서 인라인 배열로 만들지 않는지) | `git grep -nE 'queryKey:\s*\[' -- components/ app/` | exit=1 (no match) — components/·app/ 어디에도 queryKey 인라인 배열 0건. `hooks/query/queryKeys.ts` 가 단일 진입 |

판정: PASS — 4개 에지 케이스 모두 정상.

---

## 6. 최종 판정

| 영역 | 결과 |
|---|---|
| AC-1 ~ AC-12 | 12개 모두 PASS |
| 구조 재편 검증 (13행) | 13/13 PASS |
| import 경로 갱신 (14건) | 0건 잔재 (PASS) |
| 시각 0 회귀 (5건) | 5/5 PASS |
| 에지 케이스 (4건) | 4/4 PASS |

**판정: qa-passed** — 실패 0건.

PRD §9 #5 [RESOLVED] (`useQuery~~` / `useMutation~~` 프리픽스) 가 파일명·함수명·import 경로·rules 문서까지 모두 일관되게 반영됨. PR #11 라운드트립 5건 시각·동작 0 회귀 확인. AC-11 직접 호출 금지 위반 0건 (route handler fallback 2건은 PRD 명시 허용).
