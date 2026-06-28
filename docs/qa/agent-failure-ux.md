# QA — 에이전트 실패 사유 UI 노출 + PM 타임아웃 상향 (agent-failure-ux)

- 대상 PR: `feature/agent-failure-ux`
- 범위: ① (#1) 실패 사유(`reason`)를 SSE → 상태 → 재시도 카드까지 노출 ② (#3) PM 타임아웃 300→480초 상향
- 배경: A/B 하니스 중 000660 PM이 **300초 타임아웃**으로 실패. 콘솔 로그(#171)만으론 화면/사용자가 원인을 못 봄 + 타임아웃 자체가 ~1/6 빈도.

## 변경

### #1 실패 사유 노출 (event→state→card)
- `AgentFailReason` 타입을 `lib/types/stock/aiAnalysis.ts`로 승격(공용). `progress` 이벤트에 `reason?`, `AgentState`에 `failReason?` 추가.
- `route.ts` `failAgent`가 `send({progress, status:error, reason})` 로 사유 동봉(로그+이벤트 동일 값).
- `aiAnalysis.ts` `logDebateFail`이 reason 반환 → 토론 bull/bear send에 동봉.
- `aiAnalysisProvider` progress 케이스에서 `failReason` 보존(error 일 때만, running/done 시 해제).
- `AnalystCard`가 `failReason` 있으면 사유 라벨 표시(없으면 기존 일반 문구). COPY `card.failReason` 한글 라벨 4종.
- `AIAnalysisPanel` 4개 AnalystCard 렌더 사이트에 `failReason` 전달.

### #3 PM 타임아웃 상향
- `T.PM` 300_000 → 480_000ms. opus·effort:max + 최대 입력/출력이라 300초 빠듯(실측 성공 139~224초, 일부 초과 abort).

## 수용 기준 (AC)

| # | 항목 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | reason 타입 흐름 | event.reason → state.failReason → card | 타입 end-to-end(tsc 통과) | ✅ |
| AC-2 | 카드 사유 표시 | error 카드에 "응답 시간 초과" 등 | failReason ? 라벨 : 일반문구 | ✅ |
| AC-3 | 4종 라벨 | timeout/cli-error/json-parse/verdict-invalid | COPY.card.failReason | ✅ |
| AC-4 | 토론 실패도 reason | bull/bear도 timeout/cli-error 동봉 | logDebateFail 반환 | ✅ |
| AC-5 | running/done 시 해제 | 재시도 성공하면 failReason 사라짐 | provider 분기 | ✅ |
| AC-6 | PM 타임아웃 상향 | T.PM=480_000 | 적용 | ✅ |
| AC-7 | 무회귀 | 기존 진행/스트림/최종 카드 영향 없음 | 옵셔널 필드 추가만 | ✅ |

## 회귀 / 정적 검증
- `npx tsc --noEmit` — 0 error
- `npx eslint` (변경 7파일) — 0 warning
- `npx vitest run lib/server/ai lib/prompts` — 32/32 pass
- ⚠️ 실제 실패 상태(타임아웃) 카드 육안은 실패를 강제 트리거해야 해 미수행 — 타입/배선 정적 검증 + reason 분류 일치로 갈음.

## 결론
PASS — 실패 사유가 로그+화면 양쪽에 노출(관측성↑), PM 타임아웃 상향으로 신뢰성↑. 옵셔널 필드 추가라 기존 동작 무회귀.
