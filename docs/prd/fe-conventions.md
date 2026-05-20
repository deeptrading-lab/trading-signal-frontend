# PRD: fe-conventions

- **slug**: `fe-conventions`
- **작성일**: 2026-05-21
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: PR #6~#13 흐름 (BE 분리 → 아키텍처 도입 → 화면 구현 → Tailwind 전환) 머지 직후. 코드 구조·네이밍 컨벤션을 못 박는 단계.
- **UI 포함 여부**: **no** (스타일링 인프라 변경·시각 토큰 변경 모두 없음. 화면·UX 모델 0 회귀가 AC. 디자이너 합류 트리거 없음.)
- **선행 / 후행 관계**: 선행 — PR #11 (`workbench-analyze-rebuild`), PR #13 (`tailwind-migration`). 후행 — 두 번째 화면 추가 PRD (이때 라우트 그룹 `(group)/layout.tsx` 도입 + `components/layout/` 재사용 컴포넌트 추출 검토). 본 PRD 는 그 도입 자체가 아니라 **컨벤션 문서화** 까지만.

## 1. 배경 / 문제

PR #6~#13 흐름으로 BE 분리(#6, #7), FE 아키텍처 도입(#9), 디자이너 산출물(#10), 화면 구현(#11), Tailwind 전환(#12, #13) 이 모두 끝났다. 이 위에 새 화면·새 도메인을 얹기 전에, 코드 구조·네이밍이 **재현 가능한 룰** 로 못 박혀 있어야 한다.

현재 코드베이스를 훑어보면 다음 비일관성이 누적되어 있다.

1. **파일명 케이스 혼재** — 컴포넌트는 PascalCase (`SearchPanel.tsx`) 인데 hook 과 일반 모듈은 kebab-case (`use-analyze-form.ts`, `use-whitelist-search.ts`, `action-labels.ts`, `error-messages.ts`) 다. 두 케이스가 같은 폴더 안에 공존한다 (`hooks/`).
2. **컴포넌트가 TanStack Query 훅을 직접 import** — `app/page.tsx` 가 `useAnalyzeWorkbench` (TanStack `useMutation` 래퍼) 를 직접 호출한다. 도메인 커스텀훅 (`useAnalyzeForm` 같은) 을 경유해야 한다는 원칙이 한 군데에서 깨져 있다.
3. **className 합성 헬퍼 부재** — Tailwind 가 들어왔는데 (`cn(...)` 같은) 조건부·variant 합성 헬퍼가 없다. 조건부 className 이 늘어날수록 코드 안에서 `["a", isOpen && "b"].filter(Boolean).join(" ")` 같은 즉흥 처리가 늘 위험이 있다.
4. **`lib/query/` 와 `hooks/` 의 책임 분리가 모호** — TanStack Query 페칭 훅은 `lib/query/` 에, 도메인 훅은 `hooks/` 에 있다. 둘 다 React 훅이고 컴포넌트가 import 하는 단위 측면에서 동일한 층인데, 폴더가 갈려 있다.
5. **`lib/*/` 가 평탄** — `lib/api/whitelist.ts`, `lib/api/workbench.ts`, `lib/copy/action-labels.ts`, `lib/types/whitelist.ts`, `lib/types/workbench.ts`, `lib/validation/analyze.ts` 모두 도메인 폴더 없이 평탄. 도메인이 늘면 (`portfolio/`, `alerts/` 등) 한 폴더에 파일이 수십 개 쌓이는 구조다.
6. **`app/layout.tsx` 중첩 구조 컨벤션 부재** — 두 번째 화면이 들어왔을 때 라우트 그룹 `(group)/layout.tsx` 패턴으로 갈지, 재사용 컴포넌트(`Shell`, `TopBar`) 를 `components/layout/` 으로 추출할지 합의 없음.
7. **`lib/formatters/` 와 `lib/utils/` 의 경계 모호** — 현재 `lib/formatters/{money,pct}.ts` 뿐인데, Tailwind 도입 후 `cn` 헬퍼처럼 도메인 무관 헬퍼가 추가될 위치가 정해져 있지 않다.
8. **컨벤션 문서 공백** — `docs/rules/frontend.md` 가 7줄짜리 ("Tailwind 가 기본 스타일링" 까지만). 위 1~7 어디에도 명시 없음. 새 PR 의 FE Dev·reviewer 가 1차 근거로 삼을 문서가 없다.

세션에서 사용자가 단계적으로 결정한 8가지 컨벤션 (위 1~7 + 컨벤션 문서화) 을 단일 PRD 로 정리해 그 위에서 작업한다.

## 2. 목표

- **카멜케이스 일원화** — 컴포넌트는 PascalCase, hook 과 일반 모듈은 camelCase. kebab-case 파일명은 도구 산출물 외에 0건.
- **커스텀훅 의무화** — `app/`·`components/` 의 화면·컴포넌트는 도메인 커스텀훅 (`hooks/<domain>/use*`) 만 import. TanStack Query 훅 (`useQuery`/`useMutation`) 의 직접 import 는 금지하고, 페칭 훅은 도메인 훅 안에서만 호출.
- **`cn` 헬퍼 도입** — `clsx` + `tailwind-merge` 기반의 `lib/utils/cn.ts` 한 함수를 표준 합성 헬퍼로 둔다. 조건부·variant·외부 className prop 합성에 의무 적용. 정적 단일 className 은 강제 X.
- **`hooks/` 일원화** — TanStack Query 페칭 훅도 `hooks/query/` 로 이동. `lib/query/` 디렉토리 폐기. 모든 React 훅을 `hooks/` 한 곳에 집결.
- **`lib/*/` 도메인 분리 한 뎁스 추가** — `hooks/`·`lib/copy/`·`lib/types/`·`lib/validation/` 에 도메인 폴더 (`workbench/` 등) 한 단계 추가. `lib/api/` 는 인프라성 단일 파일(`client.ts`, `errors.ts`) 만 평탄 유지, 도메인 API 모듈은 `lib/api/workbench/` 로 분리.
- **`layout.tsx` 컨벤션 문서화** — 두 번째 화면 추가 시점에 라우트 그룹 `(group)/layout.tsx` 를 도입한다는 룰을 문서로 못 박는다. 본 PRD 단계에서 `app/` 구조는 변경하지 않는다.
- **`lib/formatters/` → `lib/utils/` 흡수** — `lib/formatters/{money,pct}.ts` → `lib/utils/{formatMoney,formatPct}.ts` 로 이동·rename. `cn.ts` 와 함께 도메인 무관 헬퍼의 단일 위치로 `lib/utils/` 를 표준화. `lib/copy/` 는 i18n 여지로 의도적으로 유지하되 도메인 폴더 한 뎁스 추가.
- **컨벤션 문서 확장** — `docs/rules/frontend.md` 에 위 7항목을 모두 명시. 추후 FE Dev·reviewer 가 1차 근거로 사용.
- **시각·동작 0 회귀** — 본 PRD 는 코드 구조·네이밍 마이그레이션이지 UI 모델 변경이 아니다. PR #11 의 라운드트립 5건이 동일 결과.

## 3. 범위 (In scope)

### 3.1 파일 이동·rename (카멜케이스 + hooks 일원화 + 한 뎁스 분리)

다음 파일들을 일괄 이동·rename. import 경로는 모두 갱신.

**hooks/ (camelCase + 도메인 한 뎁스)**

```text
hooks/use-analyze-form.ts          → hooks/workbench/useAnalyzeForm.ts
hooks/use-ticker-search.ts         → hooks/workbench/useTickerSearch.ts
lib/query/keys.ts                  → hooks/query/queryKeys.ts
lib/query/use-analyze-workbench.ts → hooks/query/useMutationAnalyzeWorkbench.ts
lib/query/use-whitelist-search.ts  → hooks/query/useQueryWhitelistSearch.ts
```

이동 후 `lib/query/` 디렉토리는 빈 채로 남지 않도록 제거.

**lib/api/ (인프라 평탄 + 도메인 한 뎁스)**

```text
lib/api/client.ts        → lib/api/client.ts          (그대로 유지, 인프라)
lib/api/errors.ts        → lib/api/errors.ts          (그대로 유지, 인프라)
lib/api/whitelist.ts     → lib/api/workbench/whitelist.ts
lib/api/workbench.ts     → lib/api/workbench/analyze.ts   (이름 모호 해소: workbench 의 analyze 호출)
```

`lib/api/` 직속 파일은 `client.ts`·`errors.ts` 둘 만 허용.

**lib/copy/ (camelCase + 도메인 한 뎁스, i18n 여지로 유지)**

```text
lib/copy/action-labels.ts   → lib/copy/workbench/actionLabels.ts
lib/copy/error-messages.ts  → lib/copy/workbench/errorMessages.ts
```

**lib/types/ (도메인 한 뎁스)**

```text
lib/types/whitelist.ts  → lib/types/workbench/whitelist.ts
lib/types/workbench.ts  → lib/types/workbench/analyze.ts   (이름 모호 해소)
```

**lib/validation/ (도메인 한 뎁스)**

```text
lib/validation/analyze.ts → lib/validation/workbench/analyze.ts
```

**lib/formatters/ → lib/utils/ (흡수 + camelCase + 헬퍼명 명사화)**

```text
lib/formatters/money.ts → lib/utils/formatMoney.ts
lib/formatters/pct.ts   → lib/utils/formatPct.ts
```

이동 후 `lib/formatters/` 디렉토리 제거.

### 3.2 `lib/utils/cn.ts` 신규 + 의존성 추가

- `clsx` (런타임) + `tailwind-merge` (런타임) 의존성 추가.
- `lib/utils/cn.ts` 신규:
  ```ts
  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";

  /**
   * className 합성 헬퍼. clsx 로 조건부·배열·객체를 평탄화하고
   * tailwind-merge 로 충돌하는 Tailwind 유틸리티를 후자 우선으로 정리한다.
   *
   * 사용 기준: 조건부·variant·외부 className prop 합성에 의무 적용.
   * 정적 단일 className 에는 강제하지 않는다.
   */
  export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
  }
  ```

### 3.3 컴포넌트의 TanStack Query 훅 직접 호출 제거

- `app/page.tsx` 의 `import { useAnalyzeWorkbench } from "@/lib/query/..."` 호출 제거.
- 분석 mutation 흐름을 도메인 훅 `useAnalyzeForm` (또는 새 도메인 훅 `useAnalyzeRun`/`useWorkbenchAnalyze` 등 — 명명은 FE Dev 재량) 안으로 흡수.
- 도메인 훅은 `hooks/query/useAnalyzeWorkbench` 를 내부에서 호출하고, 컴포넌트에는 다음을 외부 인터페이스로 제공.
  - `mutate(payload) | submit()` (호출)
  - `isPending` (로딩)
  - `error` (에러)
  - `data | lastResult` (성공 응답)
  - `reset()` (초기화)
- `app/page.tsx` 의 `mutation.mutate(...)`·`mutation.reset()`·`mutation.isPending` 등 TanStack Query 인터페이스 누출 0건.

### 3.4 `app/page.tsx`·`components/workbench/*` 의 import 경로 갱신

위 3.1 의 이동에 따라 다음 import 가 일괄 갱신된다.

| 변경 전 | 변경 후 |
|---|---|
| `@/hooks/use-analyze-form` | `@/hooks/workbench/useAnalyzeForm` |
| `@/hooks/use-ticker-search` | `@/hooks/workbench/useTickerSearch` |
| `@/lib/query/use-analyze-workbench` | `@/hooks/query/useMutationAnalyzeWorkbench` |
| `@/lib/query/use-whitelist-search` | `@/hooks/query/useQueryWhitelistSearch` |
| `@/lib/query/keys` | `@/hooks/query/queryKeys` |
| `@/lib/api/whitelist` | `@/lib/api/workbench/whitelist` |
| `@/lib/api/workbench` | `@/lib/api/workbench/analyze` |
| `@/lib/copy/action-labels` | `@/lib/copy/workbench/actionLabels` |
| `@/lib/copy/error-messages` | `@/lib/copy/workbench/errorMessages` |
| `@/lib/types/whitelist` | `@/lib/types/workbench/whitelist` |
| `@/lib/types/workbench` | `@/lib/types/workbench/analyze` |
| `@/lib/validation/analyze` | `@/lib/validation/workbench/analyze` |
| `@/lib/formatters/money` | `@/lib/utils/formatMoney` |
| `@/lib/formatters/pct` | `@/lib/utils/formatPct` |

총 영향 파일: `app/page.tsx` 1, `components/workbench/*` 12, `hooks/workbench/*` 2, `hooks/query/*` 3, `lib/api/workbench/*` 2, `lib/copy/workbench/*` 2, `lib/validation/workbench/*` 1. 합계 약 23 파일에서 import 경로 변경.

### 3.5 `cn` 도입 — 기존 className 조건부 처리 일괄 정리

- `components/workbench/*` 중 조건부 className 이 있는 컴포넌트 (현재 `ResultGroup`, `ErrorCard`, `BriefCard`, `ActionCard` 등 추정) 의 `\`${a} ${b}\`` 문자열 합성, `[a, cond && b].filter(Boolean).join(" ")` 같은 즉흥 처리, 외부 className prop 단순 spread 를 모두 `cn(...)` 으로 치환.
- 단, 정적 단일 className (예: `<div className="text-sm" />`) 은 손대지 않는다.

### 3.6 컨벤션 문서 확장 — `docs/rules/frontend.md`

다음 절을 모두 추가 (또는 동등한 한국어 표현).

1. **파일·식별자 네이밍**
   - React 컴포넌트: PascalCase (`SearchPanel.tsx`, `BriefCard.tsx`).
   - hook 파일·hook 함수: camelCase, `use` prefix (`useAnalyzeForm.ts`, `useTickerSearch.ts`).
   - 일반 모듈: camelCase (`actionLabels.ts`, `errorMessages.ts`, `formatMoney.ts`).
   - kebab-case 파일명 금지. 단 도구 산출물 (`package-lock.json`, `tailwind.theme.json`, `next-env.d.ts` 등) 은 예외.
2. **커스텀훅 의무화**
   - 화면·컴포넌트 코드 (`app/**/*.tsx`, `components/**/*.tsx`) 는 TanStack Query 훅 (`useQuery`, `useMutation`) 을 직접 import 하지 않는다.
   - 페칭 훅은 `hooks/query/` 에 둔다. 도메인 훅 (`hooks/<domain>/use*`) 안에서만 호출한다.
   - 화면·컴포넌트는 `hooks/<domain>/use*` 만 import 한다.
3. **폴더 구조 — 도메인 한 뎁스**
   - `hooks/`, `lib/copy/`, `lib/types/`, `lib/validation/` 의 직속 파일은 두지 않는다. 모든 모듈은 도메인 폴더 (`workbench/` 등) 안에 둔다.
   - `lib/api/` 는 인프라성 단일 파일 (`client.ts`, `errors.ts`) 만 직속 허용. 도메인 API 모듈은 `lib/api/<domain>/` 안에 둔다.
   - 도메인 무관 헬퍼는 `lib/utils/` 직속에 둔다 (예: `cn.ts`, `formatMoney.ts`, `formatPct.ts`). `lib/utils/` 안에 헬퍼가 10개 이상 누적되면 카테고리화 검토.
4. **`cn` 헬퍼**
   - 조건부·variant·외부 className prop 합성에는 `cn(...)` 을 사용한다 (`@/lib/utils/cn`).
   - 정적 단일 className 에는 강제하지 않는다.
5. **App Router `layout.tsx` 컨벤션**
   - 화면이 한 개일 때는 `app/layout.tsx` + `app/page.tsx` 의 평탄 구조 유지.
   - 두 번째 화면 도입 시점에 라우트 그룹 `app/(group)/layout.tsx` 패턴을 채택한다. 그룹 단위로 헤더·푸터·shell 을 묶는다.
   - 재사용 React 컴포넌트 (`Shell`, `TopBar`) 의 `components/layout/` 추출은 두 번째 화면 도입 시점까지 보류 (단일 화면에 추상화 과함).
6. **`lib/copy/` 유지 이유**
   - `lib/copy/` 는 향후 i18n 도입 여지로 의도적으로 유지한다. 한글 카피는 `lib/copy/<domain>/` 에 모은다. `lib/utils/` 와 합치지 않는다.
7. **TanStack Query key 명명**
   - query key 는 `hooks/query/queryKeys.ts` 한 곳에 모은다. 컴포넌트·도메인 훅에서 인라인 배열 리터럴로 key 를 만들지 않는다.

### 3.7 빌드 / 타입 / 린트 무회귀

- `npm run typecheck`, `npm run lint`, `npm run build` 모두 0 에러.
- `package-lock.json` 갱신 포함.

### 3.8 동반 정리 (별도 PR 아님, 본 PRD PR 안에 묶음)

- 워킹트리에 남아 있는 `docs/qa/tailwind-migration.md` (PR #13 QA 백필 대상) 가 untracked 상태로 있다. **본 PRD PR 의 첫 커밋에 함께 stage·commit** 한다. PRD 의 AC 와 무관하나 PR 본문에 "범위 외 함께 흡수: PR #13 QA 백필 1건" 메모.

## 4. 비범위 (Out of scope)

- 화면 / UX 모델 변경.
- 새 도메인 (`portfolio`, `alerts` 등) 추가.
- 두 번째 화면 추가 — 컨벤션 문서화만, 실제 라우트 그룹 `(group)/` 도입은 그 화면 PRD 에서.
- `components/layout/` 재사용 컴포넌트 (`Shell`, `TopBar`) 추출.
- shadcn/ui 또는 다른 디자인 시스템 도입.
- 다크 모드.
- **반응형 / breakpoint 도입** — 별도 PRD 큐잉 예정.
- BE / route handler / API contract 변경.
- 다국어 (i18n) 실제 도입 — `lib/copy/` 는 여지로 유지하되 본 PRD 에서는 한글만.
- E2E / 시각 회귀 테스트 도입.
- Vercel 환경변수·도메인 추가.
- `tailwind.theme.json` 동기화 파이프라인 변경 (PR #13 그대로 유지).
- `lib/api/workbench/index.ts` 같은 barrel re-export 신설 (PM 권고: 두지 않음, §9 OPEN QUESTION).

## 5. 수용 기준 (AC)

검증 가능한 문장.

- **AC-1 (카멜케이스 일원화)**:
  - `find hooks lib -name '*-*.ts' -o -name '*-*.tsx' 2>/dev/null | wc -l` 결과 **0**.
  - 즉 `hooks/`, `lib/` 하위에 kebab-case 파일명이 없다. 도구 산출물 (`package-lock.json`, `tailwind.theme.json`, `next-env.d.ts`) 은 위 grep 범위 밖이므로 자동 예외.
  - `hooks/workbench/useAnalyzeForm.ts`, `hooks/workbench/useTickerSearch.ts`, `hooks/query/useMutationAnalyzeWorkbench.ts`, `hooks/query/useQueryWhitelistSearch.ts`, `hooks/query/queryKeys.ts` 가 존재.
  - `hooks/query/` 의 페칭 훅 파일명은 `useQuery~~` / `useMutation~~` 프리픽스로 종류를 드러낸다 (사용자 결정, §9 #5 의 최종 채택안).
- **AC-2 (커스텀훅 의무화)**:
  - `git grep -nE "from \"@/lib/query|from \"@/hooks/query" -- 'app/**/*.tsx' 'components/**/*.tsx'` 결과 **0건**.
  - 즉 `app/`·`components/` 의 어떤 파일도 `lib/query/*` 또는 `hooks/query/*` 를 직접 import 하지 않는다.
  - `hooks/query/*` 는 `hooks/<domain>/*` 안에서만 import 된다.
  - `app/page.tsx` 에 `mutation.mutate`·`mutation.reset`·`mutation.isPending` 같은 TanStack Query 인터페이스 노출 식별자가 없다 (도메인 훅의 외부 인터페이스로 추상화됨).
- **AC-3 (`cn` 헬퍼 도입)**:
  - `lib/utils/cn.ts` 파일 존재.
  - `package.json` 의 `dependencies` 에 `clsx` 와 `tailwind-merge` 추가됨.
  - `npm ls clsx tailwind-merge` 양쪽 1개 이상 항목.
- **AC-4 (hooks 일원화)**:
  - `lib/query/` 디렉토리 부재 (`test -d lib/query && echo exist || echo gone` → `gone`).
  - `hooks/query/` 디렉토리 존재 + 페칭 훅 + queryKeys 포함.
- **AC-5 (한 뎁스 더 — 도메인 분리)**:
  - `hooks/` 직속 `.ts`/`.tsx` 파일 **0건**. 모두 `hooks/<domain>/` 또는 `hooks/query/` 안에만.
  - `lib/copy/` 직속 `.ts` 파일 0건. 모두 `lib/copy/workbench/`.
  - `lib/types/` 직속 `.ts` 파일 0건. 모두 `lib/types/workbench/`.
  - `lib/validation/` 직속 `.ts` 파일 0건. 모두 `lib/validation/workbench/`.
  - `lib/api/` 직속 `.ts` 파일은 `client.ts`, `errors.ts` 둘 만. 그 외 도메인 API 는 `lib/api/workbench/` 안.
- **AC-6 (layout.tsx 컨벤션 문서화, 코드 변경 없음)**:
  - `docs/rules/frontend.md` 에 라우트 그룹 `(group)/layout.tsx` 컨벤션과 `components/layout/` 추출의 두 번째 화면 시점 보류가 명시됨.
  - 본 PRD 머지 후 `app/` 구조 변경 없음 (`app/layout.tsx`, `app/page.tsx` 평탄 유지). `find app -name 'layout.tsx' | wc -l` = 1.
- **AC-7 (formatters → utils 흡수, copy 유지 + 한 뎁스)**:
  - `lib/formatters/` 디렉토리 부재.
  - `lib/utils/cn.ts`, `lib/utils/formatMoney.ts`, `lib/utils/formatPct.ts` 모두 존재.
  - `lib/copy/workbench/actionLabels.ts`, `lib/copy/workbench/errorMessages.ts` 존재. `lib/copy/` 디렉토리는 유지.
- **AC-8 (컨벤션 문서 확장)**:
  - `docs/rules/frontend.md` 가 §3.6 의 7개 절 (네이밍 / 커스텀훅 / 폴더 구조 / cn / layout / copy / queryKeys) 을 모두 명시한다. 각 절은 한 줄 이상.
  - 기존 Tailwind 절은 그대로 유지 (PR #13 산출물 무회귀).
- **AC-9 (build / typecheck / lint)**:
  - `npm run typecheck`, `npm run lint`, `npm run build` 모두 0 에러.
- **AC-10 (시각·동작 0 회귀)**:
  - PR #11 (`workbench-analyze-rebuild`) 의 라운드트립 5건 (AAPL · BTC-USD · 비분할가능 · 화이트리스트 비매칭 · 5xx 폴백) 이 본 PRD 머지 후에도 동일한 화면·동작 결과.
  - QA 가 dev 환경에서 수동으로 5건 라운드트립 + 화면 캡처·육안 비교로 확인.
- **AC-11 (AGENTS.md 원칙 무회귀)**:
  - 사용자 노출 문구 한글 유지 (ticker / API 필드 / 고유명사 제외).
  - 직접 호출 금지 (`git grep -nE "http://127\.0\.0\.1" -- app/` 0건, route handler fallback 제외).
  - 환경변수 단일 진입.
  - 기본 접근성 (label 연결, 키보드 탭 순서, 상태 강조 텍스트 동반) 무회귀.
- **AC-12 (수동 QA 시나리오)**:
  - (a) `npm install` → `npm run build` 0 에러.
  - (b) `git grep -nE "from \"@/lib/query" -- app/ components/` 결과 0건.
  - (c) `find hooks lib -name '*-*.ts' | wc -l` 결과 0.
  - (d) PR #11 라운드트립 5건 재현, 화면 시각·동작 동일.

## 6. 가정 · 제약

- 본 PRD 진입 시점에 선행 PRD `workbench-analyze-rebuild` (PR #11) 와 `tailwind-migration` (PR #13) 가 머지되어 있고, 화면은 6블록 워크벤치로 동작 중이라고 가정.
- 도메인이 현재 `workbench` 한 개라는 전제에서 도메인 폴더명도 `workbench/` 로 통일. 두 번째 도메인 (`portfolio` 등) 추가는 후속 PRD.
- `lib/api/workbench/whitelist.ts` 와 `analyze.ts` 의 도메인 분류는 "화이트리스트 검색은 워크벤치에 종속" 으로 본다. 분리 도메인 (`whitelist/`) 으로 띄울지 여부는 본 PRD 에서는 띄우지 않음 — §9 OPEN QUESTION.
- `lib/types/workbench/analyze.ts` 의 새 이름은 "워크벤치 도메인의 analyze 응답·요청 타입" 의 줄임이다. 기존 `lib/types/workbench.ts` 가 워크벤치 도메인 안에서 `analyze` 외 다른 타입을 거의 담지 않으므로 rename 으로 충분.
- BE / route handler / API contract 변경 없음. 본 PRD 는 코드 구조·네이밍 마이그레이션.
- 본 PRD 머지 후 추가되는 화면·도메인은 본 컨벤션 문서를 1차 근거로 한다 (후속 PRD 의 묵시적 전제).
- `clsx` (v2.1.x) + `tailwind-merge` (v2.5.x) 의 최신 안정 메이저를 채택. 실제 버전은 FE Dev 판단.
- `tailwind-merge` 가 본 저장소의 Tailwind v3 와 호환된다고 가정 (v2 가 Tailwind v3 호환).
- 본 PRD PR 안에 PR #13 의 미커밋 QA 리포트 (`docs/qa/tailwind-migration.md`) 1개를 함께 stage 한다. 본 PRD AC 외 처리.
- 사용자가 한글 톤을 강하게 선호하므로 사용자 노출·문서 한글 우선.

## 7. 참고

- `AGENTS.md` — 작업 원칙, 에이전트 역할, PRD 양식, 산출물 위치.
- `docs/rules/frontend.md` — FE 규칙. 본 PRD 가 §3.6 의 7개 절을 추가.
- `docs/rules/design-md.md`, `docs/rules/review.md`, `docs/rules/test.md` — 인접 규칙 (본 PRD 범위 외, 무회귀).
- `docs/prd/frontend-architecture-restructure.md` — 아키텍처 도입 PRD. 현재 폴더 구조의 출발점.
- `docs/prd/workbench-analyze-rebuild.md` — 화면 PRD. 라운드트립 5건의 출처.
- `docs/prd/tailwind-migration.md` — 스타일링 PRD. `cn` 헬퍼 도입의 직접 후속.
- `app/page.tsx` — 직접 호출 위반 1건의 위치, 분석 mutation 흐름의 진입점.
- `app/layout.tsx`, `app/providers.tsx` — App Router 진입점. 본 PRD 에서는 변경 최소.
- `components/workbench/*` 12개 — import 경로 갱신 대상 + `cn` 도입 대상.
- `hooks/use-analyze-form.ts`, `hooks/use-ticker-search.ts` — 이동·rename 대상.
- `lib/query/keys.ts`, `lib/query/use-whitelist-search.ts`, `lib/query/use-analyze-workbench.ts` — `hooks/query/` 로 이동·rename.
- `lib/api/`, `lib/copy/`, `lib/formatters/`, `lib/types/`, `lib/validation/` — 구조 재편 대상.
- `tailwind.config.ts`, `app/globals.css` — PR #13 산출물. 본 PRD 무회귀.
- `docs/HANDOFF.md` PR #6~#13 entry — 직전 흐름 컨텍스트.
- `docs/qa/tailwind-migration.md` (untracked) — PR #13 QA 백필. 본 PRD PR 의 첫 커밋에 동반 stage.
- `clsx`: <https://github.com/lukeed/clsx>
- `tailwind-merge`: <https://github.com/dcastil/tailwind-merge>

## 8. 영향 분석

본 PRD 가 코드베이스에 미치는 영향 범위와 추정 작업량.

- **파일 이동·rename**: 약 13개 파일 (`hooks/use-*` 2 + `lib/query/*` 3 + `lib/api/workbench.ts`·`whitelist.ts` 2 + `lib/copy/*` 2 + `lib/types/*` 2 + `lib/validation/*` 1 + `lib/formatters/*` 2 → 새 경로). git rename 이 잘 감지되도록 한 커밋에서 mv + import 갱신을 분리하기보다, **이동은 이동 커밋**, **import 갱신은 후속 커밋** 으로 PR 안에서 분할 권장.
- **import 경로 갱신**: 23개 파일에서 import 경로 변경 (§3.4 표). 평균 파일당 1~3개 import 라인 — 합계 약 30~50 라인 수정 추정.
- **신규 파일**: `lib/utils/cn.ts` (10~15 라인), 도메인 훅 후보 (`useAnalyzeRun` 등을 추가할 경우 50~80 라인) — FE Dev 가 기존 `useAnalyzeForm` 을 확장할지 새 훅을 둘지 결정.
- **`app/page.tsx`**: TanStack Query 직접 호출 제거 + 도메인 훅 인터페이스로 흡수. 약 20~30 라인 수정 추정. import 라인 1개 (`useAnalyzeWorkbench`) 제거 + 도메인 훅 import 변경.
- **`components/workbench/*` className 의 `cn` 도입**: 조건부 className 이 있는 파일에 한정. 12 파일 중 4~6 파일이 영향받을 추정. 파일당 5~15 라인 수정 + 1개 import (`cn`) 추가.
- **`docs/rules/frontend.md`**: 약 30~50 라인 추가 (§3.6 의 7개 절).
- **`package.json` / `package-lock.json`**: `clsx`, `tailwind-merge` 의존성 추가. lockfile 자동 갱신.
- **총 변경 규모 (추정)**:
  - 추가 약 150~250 라인 (도메인 훅 확장 + cn 도입 + 컨벤션 문서).
  - 삭제 약 30~50 라인 (`mutation.*` 직접 호출 제거 + 즉흥 className 합성 제거).
  - 이동 약 13 파일 (git rename 감지 시 diff 는 import 라인만).
  - **순 +100~200 라인 안팎** 의 PR.
- **PR 커밋 분할 (권고)**:
  1. `chore(qa): PR #13 누락 QA 리포트 백필` (워킹트리 noise 정리).
  2. `chore(deps): clsx + tailwind-merge 도입`.
  3. `refactor(structure): hooks/lib 도메인 분리 + camelCase rename + lib/query → hooks/query 이동 + lib/formatters → lib/utils 흡수`.
  4. `refactor(workbench): TanStack Query 인터페이스 누출 제거 (page → 도메인 훅 경유)`.
  5. `refactor(workbench): cn 헬퍼 도입 — 조건부 className 합성 일원화`.
  6. `docs(rules): FE 컨벤션 7개 절 추가 — 네이밍/커스텀훅/폴더/cn/layout/copy/queryKeys`.
- **회귀 위험**:
  - import 경로 23개 파일 갱신 누락 — TypeScript path alias (`@/...`) 가 갱신되지 않으면 빌드가 깨지므로 `npm run typecheck` 가 1차 안전망. 위험 낮음.
  - 도메인 훅 흡수 과정에서 `mutation.reset()`·성공 콜백 누락 — `app/page.tsx` 의 `handleRetry` / `onSuccess` 동등성 점검 필요. 위험 중간.
  - `tailwind-merge` 가 본 저장소의 커스텀 토큰 (`bg-accent`, `rounded-card` 등) 을 어떻게 정렬하는지의 정합. 충돌 토큰이 적어 위험 낮음.
  - 파일 rename 중 `git mv` vs 새 파일 작성 + 구 파일 삭제 — 후자로 처리되면 git diff 가 100% rewrite 로 보임. PR review 가독성 차원에서 `git mv` 권장.

## 9. OPEN QUESTION

- `[OPEN QUESTION] 도메인 폴더 명명 — 화면 단위 vs 비즈니스 단위` — 현재 도메인 한 개라 `workbench/` 로 통일했지만, 차후 한 화면이 여러 비즈니스 도메인을 호출하거나 (예: `portfolio` + `alerts`), 한 비즈니스 도메인이 여러 화면에 흩어질 때 (예: `whitelist` 가 워크벤치·포트폴리오 양쪽에서 쓰임) 가 온다. **PM 권고: 비즈니스 도메인 단위**. 이유: (a) 코드 재사용·테스트 단위가 비즈니스 도메인에 정렬되는 편이 흔하고, (b) 화면 단위로 폴더가 묶이면 한 화면 폐기 시 여러 도메인이 함께 사라지는 위험. 본 PRD 는 단일 화면이라 차이가 없으므로 `workbench` 로 두되, 두 번째 도메인 추가 PRD 에서 이 룰을 확정한다.
- `[OPEN QUESTION] lib/api/workbench/index.ts re-export 둘지` — 도메인 API 모듈을 한 번에 import 할 수 있게 `lib/api/workbench/index.ts` 에서 `analyze`·`whitelist` 를 re-export 할지. **PM 권고: 두지 않음**. barrel 파일은 (a) import 경로의 명확성을 떨어뜨리고, (b) tree-shaking 에 약하며, (c) 변경 영향 추적 시 import grep 의 신뢰도를 깎는다. 직접 경로 (`@/lib/api/workbench/analyze`) 를 쓴다.
- `[OPEN QUESTION] cn 사용 강제 범위` — 모든 className 에 강제할지, 조건부·variant 만 강제할지. **PM 권고: 조건부·variant·외부 className prop 합성에만 의무**. 정적 단일 className 은 강제하지 않는다 (코드 noise). 본 PRD §3.6 / AC 에 반영.
- `[OPEN QUESTION] 도메인 훅 흡수 방식 — 기존 useAnalyzeForm 확장 vs 새 useAnalyzeRun 분리` — `app/page.tsx` 의 `useAnalyzeWorkbench` 직접 호출을 (a) 기존 `useAnalyzeForm` 으로 흡수, 또는 (b) `useAnalyzeRun` (mutation 트리거 책임 분리) 신설. **PM 권고: (b) 분리** — `useAnalyzeForm` 은 폼 상태·검증·사전 차단 책임에 집중하고, mutation 트리거·로딩·에러·결과 보관은 `useAnalyzeRun` (또는 `useAnalyzeMutation`) 에 두는 편이 책임 분리가 깔끔. 다만 (a) 의 단순성도 합리적이라 FE Dev 재량.
- `[RESOLVED] hooks/query/ 의 파일명 — useQueryWhitelistSearch / useMutationAnalyzeWorkbench 프리픽스 채택` — 사용자가 명시적으로 결정: "query랑 mutation을 파일 네이밍으로 알기쉽게 하자. useQuery~~ useMutation~~". PM 의 "기존 명 유지" 권고와 충돌했으나 사용자 의도가 우선 — 파일명에서 종류가 즉시 인식되도록 `useQuery~~` / `useMutation~~` 프리픽스를 채택한다. §3.1 / §3.4 / AC-1 에 반영. 함수 export 명도 동일 (`useQueryWhitelistSearch`, `useMutationAnalyzeWorkbench`).
- `[OPEN QUESTION] tailwind-merge 의 커스텀 토큰 인식 — twMerge 설정 필요한가` — 본 저장소는 `bg-accent`, `text-warn`, `rounded-card`, `shadow-card` 같은 커스텀 토큰을 다수 쓴다. `tailwind-merge` 의 기본 동작이 이를 적절히 그룹화하지 못하면 `extendTailwindMerge({...})` 로 설정해야 한다. **PM 권고: 기본 동작으로 시작, FE Dev 가 충돌 발견 시 `extendTailwindMerge` 어댑터 1개를 `lib/utils/cn.ts` 안에 추가**. 본 PRD AC 에는 영향 없음.
- `[OPEN QUESTION] PR 분할 — 한 PR 인가 두 PR 인가` — (A) 파일 이동·rename·import 갱신, (B) 도메인 훅 흡수·cn 도입·컨벤션 문서. **PM 권고: 한 PR**. 컨벤션 정착은 한 번에 보는 편이 reviewer 인지 비용이 낮고, 본 PRD 자체가 "여러 개의 작은 컨벤션을 묶어 한 번에 못 박는" 목적이다. 커밋 단위로 §8 의 6개로 분할해 reviewer 가 단계적으로 읽을 수 있게 한다.
- `[OPEN QUESTION] hooks/<domain> 안 도메인 훅의 책임 경계` — 도메인 훅이 어디까지 흡수할지의 룰. (a) "TanStack Query 인터페이스 누출 금지" 만 강제, (b) "도메인 의미가 있는 상태·콜백은 모두 도메인 훅이 책임" 까지 강제. **PM 권고: (a) 만 강제**. (b) 는 케이스마다 다르고 과한 추상화 위험. 본 PRD §3.6 의 커스텀훅 의무화 절은 (a) 를 명시한다.
- `[OPEN QUESTION] kebab-case 예외의 명시적 화이트리스트 — AGENTS.md 또는 frontend.md` — 도구 산출물 (`package-lock.json`, `tailwind.theme.json`, `next-env.d.ts`, `postcss.config.mjs` 등) 의 예외를 어디에 적을지. **PM 권고: `docs/rules/frontend.md` 의 네이밍 절에 한 줄로 명시** ("도구 산출물·외부 도구 명명 규약을 따르는 파일은 예외"). AC-1 의 검사 범위도 `hooks/` `lib/` 로 한정해 자동 예외.
- `[OPEN QUESTION] 후속 — components/layout/ 추출 트리거의 정확한 조건` — "두 번째 화면 추가 시점" 이 트리거지만, 두 번째 화면이 첫 화면과 shell·헤더를 공유하지 않을 가능성도 있다 (예: 풀스크린 onboarding). **PM 권고: 두 번째 화면이 첫 화면의 shell·헤더를 공유한다고 판단될 때만 추출**. 후속 화면 PRD 에서 디자이너·FE Dev 가 함께 판단.
