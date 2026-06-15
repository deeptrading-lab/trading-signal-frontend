# QA 리포트: ai-panel-debate-bold-ui

- **slug**: `ai-panel-debate-bold-ui`
- **작성일**: 2026-06-13
- **대상**: PR #121 — feat(stock): AI 패널 토론 구분선 강화 + PM 핵심 정보 볼드
- **변경 파일**:
  - `components/stock/ai-analysis/DebateSection.tsx`
  - `components/stock/ai-analysis/FinalVerdictCard.tsx`
  - `lib/prompts/stock/aiAnalysis.ts`
- **판정**: qa-passed

---

## 1. AC별 검증 표

| AC | 검증 항목 | 재현 절차 | 기대 결과 | 실측 결과 | 판정 |
|---|---|---|---|---|---|
| AC-1 | TypeScript 컴파일 에러 0 | `npx tsc --noEmit 2>&1` | 출력 없음 (0 에러) | 출력 없음 — 0 에러 | 통과 |
| AC-2 | lint 에러 0 | `npx next lint 2>&1 \| grep -i error` | 출력 없음 (0 에러) | 출력 없음 — 0 에러 | 통과 |
| AC-3a | 그리드 행 `items-stretch` | `DebateSection.tsx` L77 직독 | `className="grid grid-cols-[1fr_28px_1fr] gap-2 items-stretch"` | L77: `<div key={round} className="grid grid-cols-[1fr_28px_1fr] gap-2 items-stretch">` — 정확히 일치 | 통과 |
| AC-3b | 세로선 `w-0.5 bg-slate-400 dark:bg-slate-500` | `DebateSection.tsx` L86 직독 | `className="flex-1 w-0.5 bg-slate-400 dark:bg-slate-500 min-h-[20px]"` | L86: `<div className="flex-1 w-0.5 bg-slate-400 dark:bg-slate-500 min-h-[20px]" />` — 정확히 일치 | 통과 |
| AC-3c | R라벨 `text-[10px] font-black text-slate-500 dark:text-slate-400` | `DebateSection.tsx` L85 직독 | `className="text-[10px] font-black text-slate-500 dark:text-slate-400"` | L85: `<span className="text-[10px] font-black text-slate-500 dark:text-slate-400">R{round}</span>` — 정확히 일치 | 통과 |
| AC-4a | `InlineBold` 함수 존재 | `FinalVerdictCard.tsx` L10~21 직독 | `function InlineBold({ text }: { text: string })` 정의 존재 | L10: `function InlineBold({ text }: { text: string })` — 존재 확인 | 통과 |
| AC-4b | `InlineBold` split+strong 렌더 | `FinalVerdictCard.tsx` L11~19 직독 | `text.split(/\*\*(.+?)\*\*/g)` 후 홀수 인덱스 `<strong>` 렌더 | L11: `const parts = text.split(/\*\*(.+?)\*\*/g);` + L14~17: `i % 2 === 1 ? <strong key={i} ...>{part}</strong> : part` — 정확히 일치 | 통과 |
| AC-4c | `data.reasoning` `InlineBold` 적용 | `FinalVerdictCard.tsx` L89 직독 | `<InlineBold text={data.reasoning} />` | L89: `<InlineBold text={data.reasoning} />` — 확인 | 통과 |
| AC-4d | `data.entry_strategy` `InlineBold` 적용 | `FinalVerdictCard.tsx` L105 직독 | `<InlineBold text={data.entry_strategy} />` | L105: `<InlineBold text={data.entry_strategy} />` — 확인 | 통과 |
| AC-4e | `data.short_term_outlook` `InlineBold` 적용 | `FinalVerdictCard.tsx` L157 직독 | `<InlineBold text={data.short_term_outlook} />` | L157: `<p className="..."><InlineBold text={data.short_term_outlook} /></p>` — 확인 | 통과 |
| AC-4f | `data.mid_term_outlook` `InlineBold` 적용 | `FinalVerdictCard.tsx` L163 직독 | `<InlineBold text={data.mid_term_outlook} />` | L163: `<p className="..."><InlineBold text={data.mid_term_outlook} /></p>` — 확인 | 통과 |
| AC-5 | PM 프롬프트 bold 지시 | `lib/prompts/stock/aiAnalysis.ts` `portfolio_manager.system` 직독 | `**굵게**` 관련 지시문 존재 | L359: `텍스트 필드(reasoning·entry_strategy·short_term_outlook·mid_term_outlook)에서 매수/매도 판단·목표 수익률·손절 조건·진입 가격 등 핵심 정보는 **굵게** 표기하세요(예: \`**BUY 판단**\`, \`**목표 +15%**\`, \`**손절 -5%**\`)` — 지시문 확인 | 통과 |

---

## 2. 공통 AC 검증

| 항목 | 검증 명령 | 결과 | 판정 |
|---|---|---|---|
| typecheck 0 에러 | `npx tsc --noEmit` | 출력 없음 | 통과 |
| lint 0 에러 | `npx next lint 2>&1 \| grep -i error` | 출력 없음 | 통과 |
| BFF 무회귀 | `git grep -nE "http://127\\.0\\.0\\.1" -- app/` route handler fallback 제외 | `app/api/workbench/_adapters/fastapi.ts` L7·L32만 존재 (서버 측 `FASTAPI_BASE_URL` 기본값, route handler 내부) — 브라우저 직접 호출 0건 | 통과 |
| 한글 톤 무회귀 | 변경 파일 3개 diff 확인 | `DebateSection.tsx`·`FinalVerdictCard.tsx`: UI 클래스·렌더 로직 변경, 새 사용자 노출 한글 문구 추가 없음. `aiAnalysis.ts`: 프롬프트 내 `**굵게**` 표기 지시 추가 — 서버 전용 프롬프트이며 사용자에게 직접 노출되지 않음. | 통과 |
| 기본 접근성 무회귀 | `DebateSection.tsx` 변경 범위 확인 | 변경 사항은 그리드 `items-stretch` + 구분선 색·굵기 CSS뿐. label/Tab 순서/aria 속성 변경 없음. `FinalVerdictCard.tsx`는 `<strong>` 태그 추가로 스크린리더 강조 표현 향상. | 통과 |

---

## 3. 에지 케이스

| 케이스 | 검증 방법 | 결과 |
|---|---|---|
| `**` 없는 일반 텍스트 | `InlineBold` split 결과: `["일반 텍스트"]` — 홀수 인덱스 없음, `<strong>` 0개, 텍스트 그대로 렌더 | 이상 없음 |
| `**` 홀수 개 malformed (예: `**bold` 종료 없음) | `split(/\*\*(.+?)\*\*/g)` lazy match — 매칭 실패 시 분할 없이 원문 그대로 반환. `strong` 미생성, 텍스트 누락 없음. | 이상 없음 |
| 빈 문자열 (`""`) | `"".split(...)` → `[""]` → `i=0` 짝수 인덱스 → 빈 문자열 렌더, React key 오류 없음 | 이상 없음 |
| `data.entry_strategy` null/undefined | `FinalVerdictCard.tsx` L103: `{data.entry_strategy && (...)}` 조건부 렌더 — falsy 시 `InlineBold` 미호출 | 이상 없음 |
| `data.short_term_outlook` / `data.mid_term_outlook` null | L152: `{(data.short_term_outlook \|\| data.mid_term_outlook) && (...)}` 외부 guard + 각 L154·L160 내부 `{data.short_term_outlook && (...)}` guard — null 시 안전 | 이상 없음 |
| `items-stretch` 단일 메시지 (한쪽 카드 없음) | bull 측 메시지만 있을 때 bear 측 `<div>`가 비어 있어도 grid stretch는 bull 카드 높이에 맞춰 세로선 연장. flex-1 + min-h-[20px] 보장. | 이상 없음 |
| 긴 토론 메시지에서 세로선 길이 | `flex-1` 로 부모(`flex flex-col`) 잔여 공간 채움 + `items-stretch`로 행 높이 = 카드 높이 → 세로선이 카드 전체 높이만큼 늘어남 | 이상 없음 |
| 다크 모드 | 세로선: `dark:bg-slate-500` / R라벨: `dark:text-slate-400` — 다크 토큰 정상 적용. `InlineBold` `<strong>`: `dark:text-slate-100` — 다크 배경에서 흰색 계열 볼드 표시. | 이상 없음 |

---

## 4. 라운드트립 / 수동 검증

이 PR은 세 파일의 **UI 표현 레이어만** 변경한다.

- `DebateSection.tsx`: CSS 클래스 3개 변경 (`items-start` → `items-stretch`, `w-px bg-slate-200` → `w-0.5 bg-slate-400`, `text-[9px] text-slate-300 font-bold` → `text-[10px] font-black text-slate-500`)
- `FinalVerdictCard.tsx`: `InlineBold` 헬퍼 추가 + 4개 필드 래핑 — 데이터 타입·훅·API 변경 없음
- `lib/prompts/stock/aiAnalysis.ts`: PM 시스템 프롬프트 1문장 추가 — 서버 전용, BFF 경계 내

데이터 페칭·API 계약·상태 로직 변경 없으므로 BE 연동 라운드트립 재현은 이전 PR #116 QA 리포트 (`docs/qa/ai-analysis-improvement.md`) 통과 시나리오를 상속한다.

diff 변경 범위 요약:
- 제거: `items-start`, `w-px bg-slate-200 dark:bg-slate-700`, `text-[9px] text-slate-300 dark:text-slate-600 font-bold`
- 추가: `items-stretch`, `w-0.5 bg-slate-400 dark:bg-slate-500`, `text-[10px] font-black text-slate-500 dark:text-slate-400`, `InlineBold` 함수, 4개 필드 InlineBold 래핑, PM 프롬프트 bold 지시문
- 기능 동등성: 렌더 로직·조건부 분기 변경 없음. 시각 표현만 강화.
