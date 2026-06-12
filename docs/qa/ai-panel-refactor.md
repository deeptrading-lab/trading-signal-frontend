# QA 리포트 — ai-panel-refactor

- PR: #118 `feature/ai-panel-refactor`
- 검증일: 2026-06-12
- QA 에이전트: claude-sonnet-4-6
- 판정: **qa-failed** (실패 1건)

---

## AC 별 검증 표

| AC | 검증 항목 | 재현 절차 | 기대 결과 | 실측 결과 | 판정 |
|----|----------|-----------|-----------|-----------|------|
| AC-1 | TypeScript 컴파일 에러 0 | `npx tsc --noEmit` | 에러 0건 | 에러 0건 (출력 없음) | PASS |
| AC-2 | 빌드 성공 | `npm run build` | exit 0, 에러 없음 | `✓ Compiled successfully`, 35 routes 생성, 에러 0 | PASS |
| AC-3 | 모듈 의존성 — 서버 모듈 클라이언트 노출 없음 | `grep -rn "claudeAgent" components/ hooks/`<br>`grep -rn "lib/prompts" components/ hooks/` | 0건 | 0건 | PASS |
| AC-4 | 신규 분리 컴포넌트 7개 존재 | `ls components/stock/ai-analysis/` | 7파일 모두 존재 | `AnalystCard.tsx`, `DebateLoadingCard.tsx`, `PMLoadingCard.tsx`, `DebateMsgCard.tsx`, `DebateSection.tsx`, `FinalVerdictCard.tsx`, `CardDetailOverlay.tsx` 모두 확인 | PASS |
| AC-5 | `getResumeKey` 중복 제거 | `grep -n "getResumeKey" hooks/stock/useAIAnalysis.ts`<br>`grep -n "getResumeKey" lib/types/stock/aiAnalysis.ts` | 훅 내 인라인 삼항 없음, 타입 파일에 export 존재 | 훅은 `getResumeKey` import 사용만 (line 9, 93, 291). 타입 파일 line 134에 `export function getResumeKey(...)` 확인. `bear.*bull` 삼항은 resume 재실행 로직(line 233)으로 별도 목적, 중복 아님 | PASS |
| AC-6 | React.memo + useMemo 적용 | `grep -n "React.memo\|memo(" components/stock/ai-analysis/AnalystCard.tsx`<br>`grep -n "useMemo" components/stock/ai-analysis/DebateSection.tsx` | 각각 존재 | `AnalystCard.tsx` line 20: `export const AnalystCard = memo(function AnalystCard(` 확인. `DebateSection.tsx` line 3, 29–33: `useMemo` 4회 사용 확인 | PASS |

---

## 공통 AC 검증

| 항목 | 명령 | 결과 | 판정 |
|------|------|------|------|
| typecheck 0 에러 | `npx tsc --noEmit` | 에러 없음 | PASS |
| lint 0 에러 | `npm run lint` | **에러 4건** (아래 에지 케이스 절 참조) | FAIL |
| build 0 에러 | `npm run build` | 성공 (Turbopack은 lint 규칙 미검사) | PASS |
| BFF 원칙 무회귀 | `grep -rn "http://127\\.0\\.0\\.1" app/ \| grep -v route.ts \| grep -v _adapters` | 0건 | PASS |
| 한글 톤 무회귀 | `lib/server/claudeAgent.ts`, `lib/prompts/stock/aiAnalysis.ts` 서버 전용, 사용자 노출 카피 없음 | 해당 없음 | PASS |

---

## 에지 케이스 — React Hooks Rules of Hooks 위반 (실패 항목)

### 재현 조건

```
npm run lint
```

### 에러 로그

```
/Applications/하영/code_source/trading-signal-frontend/components/stock/ai-analysis/DebateSection.tsx
  29:20  error  React Hook "useMemo" is called conditionally. React Hooks must be called in the exact
                same order in every component render. Did you accidentally call a React Hook after an
                early return?  react-hooks/rules-of-hooks
  30:20  error  React Hook "useMemo" is called conditionally. React Hooks must be called in the exact
                same order in every component render. Did you accidentally call a React Hook after an
                early return?  react-hooks/rules-of-hooks
  32:31  error  React Hook "useMemo" is called conditionally. React Hooks must be called in the exact
                same order in every component render. Did you accidentally call a React Hook after an
                early return?  react-hooks/rules-of-hooks
  33:31  error  React Hook "useMemo" is called conditionally. React Hooks must be called in the exact
                same order in every component render. Did you accidentally call a React Hook after an
                early return?  react-hooks/rules-of-hooks

✖ 5 problems (4 errors, 1 warning)
```

### 기대 대비 실제

- **기대**: `eslint` 에러 0건 (경고만 허용)
- **실제**: `DebateSection.tsx`에서 line 27 조건부 early return (`if (bullAgent.status === "pending") return null;`) 이후 lines 29–33에 `useMemo` 4개 호출 — React Hooks Rules of Hooks 위반 4건

### 원인 분석

`DebateSection.tsx` line 27에서 `bullAgent.status === "pending"` 조건으로 early return 후, lines 29–33에서 `useMemo` 훅 4개를 호출하고 있습니다. React 훅은 컴포넌트 최상단에서 무조건적으로 호출되어야 하므로 early return 앞으로 이동해야 합니다.

```tsx
// 현재 (문제 있는 코드)
export function DebateSection(...) {
  if (bullAgent.status === "pending") return null;  // line 27 — early return

  const bullMsgs = useMemo(...);  // line 29 — Rules of Hooks 위반
  ...
}

// 수정 방향
export function DebateSection(...) {
  const bullMsgs = useMemo(...);  // early return 앞으로 이동
  const bearMsgs = useMemo(...);
  const completedBullRounds = useMemo(...);
  const completedBearRounds = useMemo(...);

  if (bullAgent.status === "pending") return null;
  ...
}
```

### 추가 경고 (non-blocking)

```
hooks/stock/useAIAnalysis.ts
  164:6  warning  React Hook useCallback has a missing dependency: 'ticker'.
                  Either include it or remove the dependency array  react-hooks/exhaustive-deps
```

이 경고는 기존 코드의 것으로 본 PR 변경과 무관하나, 린트 클린 상태 기준으로 함께 기록.

---

## 라운드트립 검증

본 PR은 순수 리팩토링으로 기능 변경 없음. 빌드 성공 및 모듈 의존성 정합 확인으로 라운드트립 검증 대체. BE 다운·live 환경 재현은 동작 변경 없는 리팩토링 특성상 별도 진행 생략.

---

## 전체 판정

| 구분 | 건수 |
|------|------|
| PASS | 6 |
| FAIL | 1 (lint 에러 4건 — DebateSection.tsx Rules of Hooks 위반) |

**판정: qa-failed**

`DebateSection.tsx`의 `useMemo` 4개 호출을 early return 앞으로 이동해야 합니다. 수정 후 재검증 요청 바랍니다.
