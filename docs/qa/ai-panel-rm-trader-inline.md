# QA 리포트: ai-panel-rm-trader-inline

- **slug**: `ai-panel-rm-trader-inline`
- **작성일**: 2026-06-13
- **대상**: PR #120 — feat(stock): AI 패널 리서치 매니저·트레이더 2-col 한 줄 배치
- **변경 파일**: `components/stock/AIAnalysisPanel.tsx` (단일)
- **판정**: qa-passed

---

## 1. AC별 검증 표

| AC | 검증 항목 | 재현 절차 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|---|
| AC-1 | TypeScript 컴파일 에러 0 | `npx tsc --noEmit 2>&1` | 출력 없음 (0 에러) | 출력 없음 — 0 에러 | 통과 |
| AC-2 | lint 에러 0 | `npx next lint 2>&1 \| grep -i error` | 출력 없음 (0 에러) | 출력 없음 — 0 에러 | 통과 |
| AC-3a | `grid grid-cols-1 md:grid-cols-2` 컨테이너 확인 | `AIAnalysisPanel.tsx` L354 직독 | `research_manager`·`trader` 두 키가 동일 `<div className="grid grid-cols-1 md:grid-cols-2 gap-3">` 안에서 `.map()` 으로 렌더 | L351~393: `(["research_manager", "trader"] as AgentKey[]).some(...)` 조건으로 guard → L354 `<div className="grid grid-cols-1 md:grid-cols-2 gap-3">` 확인 | 통과 |
| AC-3b | 트레이더 `bg-violet-100` 배지 존재 | `grep -n "bg-violet-100" AIAnalysisPanel.tsx` | `key === "trader"` 분기에 `bg-violet-100` 배지 스팬 존재 | L364: `<span className="... bg-violet-100 text-violet-700 ...">🧠 심층 추론</span>` — `key === "trader"` 분기(L361)에 위치 | 통과 |
| AC-3c | `research_manager` pending 시 dashed 플레이스홀더 | L358~360 직독 | `agentState.status === "pending"` 시 `border-dashed` div 반환 | L358: `if (agentState.status === "pending") { return <div key={key} className="... border border-dashed ..." /> }` — `research_manager`·`trader` 모두 동일 분기에서 처리 | 통과 |
| AC-3d | `trader` pending 시 dashed 플레이스홀더 | AC-3c와 동일 경로 | 위와 동일 | 위와 동일 (L355 `.map()` 내 L358 공통 분기) | 통과 |
| AC-4a | Row 1 `grid-cols-2 md:grid-cols-4` 유지 | `grep -n "grid-cols-2 md:grid-cols-4" AIAnalysisPanel.tsx` | L314에 분석가 4개 그리드 존재 | L314: `<div className="grid grid-cols-2 md:grid-cols-4 gap-3">` — 변경 없음 | 통과 |
| AC-4b | Row 2 `DebateSection` 유지 | `grep -n "DebateSection" AIAnalysisPanel.tsx` | L341에 DebateSection 컴포넌트 존재 | L341: `<DebateSection ... />` — 변경 없음 | 통과 |
| AC-4c | Row 5 `md:grid-cols-3` 유지 | `grep -n "grid-cols-1 md:grid-cols-3" AIAnalysisPanel.tsx` | L399에 리스크 3개 그리드 존재 | L399: `<div className="grid grid-cols-1 md:grid-cols-3 gap-3">` — 변경 없음 | 통과 |
| AC-4d | Row 6 `FinalVerdictCard` 유지 | `grep -n "FinalVerdictCard\|portfolio_manager" AIAnalysisPanel.tsx` | L425에 FinalVerdictCard, L424에 portfolio_manager 참조 존재 | L424~425: `pmAgent = agents.find(a => a.key === "portfolio_manager")` + `if (final) return <FinalVerdictCard data={final} />` — 변경 없음 | 통과 |

---

## 2. 공통 AC 검증

| 항목 | 검증 명령 | 결과 | 판정 |
|---|---|---|---|
| typecheck 0 에러 | `npx tsc --noEmit` | 출력 없음 | 통과 |
| lint 0 에러 | `npx next lint 2>&1 \| grep -i error` | 출력 없음 | 통과 |
| BFF 무회귀 | `git grep -nE "http://127\\.0\\.0\\.1" -- app/` | route handler fallback 3건만 존재 (`app/api/whitelist/search/route.ts`, `app/api/workbench/_adapters/fastapi.ts` — 모두 서버 측 `FASTAPI_BASE_URL` 기본값) — 브라우저 직접 호출 0건 | 통과 |
| 한글 톤 무회귀 | diff 범위 확인 (`AIAnalysisPanel.tsx` 단일 파일) | 추가된 사용자 노출 문구 없음 (레이아웃 구조 변경만). 기존 `🧠 심층 추론` 배지 문자열은 이전 코드에서 그대로 유지. | 통과 |

---

## 3. 에지 케이스

| 케이스 | 검증 방법 | 결과 |
|---|---|---|
| `research_manager` 완료 / `trader` pending | L351 `some()` 조건 — `research_manager` 가 `!== "pending"` 이면 grid 렌더. L358 `trader` pending 분기 → dashed placeholder. 그리드 한 쪽만 채워진 레이아웃 정상 표시. | 코드 경로 확인, 이상 없음 |
| `trader` 완료 / `research_manager` pending | 반대 경우도 `some()` 조건 충족 → grid 렌더. `research_manager` dashed placeholder 표시. | 코드 경로 확인, 이상 없음 |
| 둘 다 pending | `some()` 조건 불충족 → 전체 grid 미렌더. 이전 Row 구조와 동일 동작. | 이상 없음 |
| 둘 다 error | `agentState.status !== "pending"` → 각각 `AnalystCard` 에 `onRetry` 전달, 에러 카드 나란히 표시. | 이상 없음 |
| `key` prop 누락 — trader 분기 | L363 `<div key={key} className="relative">` — key 정상 부여 | 이상 없음 |
| 모바일 뷰포트 (`< md`) | `grid-cols-1` → 세로 스택. 기존 full-width 단일 나열과 시각적 동일. | 클래스 확인, 이상 없음 |

---

## 4. 라운드트립 / 수동 검증

이 PR 은 `AIAnalysisPanel.tsx` 단일 파일의 **레이아웃 구조만** 변경하며, 데이터 페칭·API·훅·상태 로직 변경 없음. 라운드트립 재현은 이전 PR #116 QA 리포트 (`docs/qa/ai-analysis-improvement.md`) 에서 통과한 시나리오를 상속하며, 이번 변경 사항은 그리드 클래스만 대체하므로 별도 BE 연동 라운드트립 재현은 불필요하다.

diff 범위 확인:
- 제거: Row 3·Row 4 각각 별도 guard 블록 (`agents.find(...)?.status !== "pending" && (() => {...})()`)
- 추가: `(["research_manager", "trader"] as AgentKey[]).some(...)` 공통 guard + `grid grid-cols-1 md:grid-cols-2` 컨테이너
- 로직 동등성: 이전에는 각자 pending 이 아닐 때만 렌더 → 현재는 어느 쪽 하나라도 pending 이 아니면 grid 전체 렌더 + pending 쪽은 placeholder. 기능적으로 확장된 표현 방식으로 이상 없음.

---

## 5. 판정 요약

| 항목 | 건수 |
|---|---|
| 전체 AC | 10 |
| 통과 | 10 |
| 실패 | 0 |
| 수동 확인 필요 | 0 |

**최종 판정: qa-passed**
