# QA — AI 분석 에이전트 실패 로그 표준화 (agent-fail-logging)

- 대상 PR: `feature/agent-fail-logging`
- 범위: AI 종목분석 파이프라인의 에이전트 실패 로그를 케이스별 `reason=` 분류로 통일(모니터링 grep 용이). **동작 무변경(로깅/리팩터만)**.
- 배경: A/B 하니스 실행 중 `000660` PM이 verdict=null로 실패했는데, 콘솔만으로는 원인(타임아웃 vs JSON 파싱 vs verdict 무효)을 즉시 구분하기 어려웠음 → 케이스별 로그 세분화 필요.

## 변경 전/후

| 케이스 | 변경 전 로그 | 변경 후 (통일) |
|---|---|---|
| 타임아웃 | `⏱ {agent} 타임아웃 elapsed=Xs` (warn) | `✗ 실패 agent={k} reason=timeout elapsed=Xs` (warn) |
| CLI 기타 오류 | `✗ {agent}` + err (error) | `✗ 실패 agent={k} reason=cli-error elapsed=Xs` (error, 스택 포함) |
| PM JSON 파싱 실패 | `PM 결론 JSON 파싱 실패 — len=X` (warn) | `✗ 실패 agent=portfolio_manager reason=json-parse len=X` (warn) |
| PM verdict 무효 | `PM verdict 무효 — verdict=X len=Y` (warn) | `✗ 실패 agent=portfolio_manager reason=verdict-invalid verdict=X len=Y` (warn) |
| 토론(bull/bear) 실패 | `✗ bull R{n}` + err (error) | `✗ 실패 agent=bull round={n} reason={timeout\|cli-error}` |
| 사용자 중지 | `중지 — {agent}` (info) | (그대로 — 실패 아님) |

## 수용 기준 (AC)

| # | 항목 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | 단일 grep으로 전체 실패 포착 | `grep "✗ 실패"` 가 6케이스 모두 매치 | route.ts 4 + aiAnalysis.ts 2 site 통일 | ✅ |
| AC-2 | 케이스별 필터 | `reason=timeout\|cli-error\|json-parse\|verdict-invalid` 로 구분 | 4종 reason + 토론 2종 | ✅ |
| AC-3 | 로그 레벨 | 예상된 실패=warn, 예상 밖 cli-error=error(스택) | failAgent err 유무로 분기 | ✅ |
| AC-4 | 동작 무변경 | send(progress error)·report·return "error" 동일 | 리팩터(로그 포맷만), 로직 동일 | ✅ |
| AC-5 | 중지(Abort) 비-실패 | AbortError는 info "중지" 유지, 실패 카운트 제외 | 유지 | ✅ |

## 회귀 / 정적 검증
- `npx tsc --noEmit` — 0 error
- `npx eslint app/api/stock/ai-analysis/route.ts lib/prompts/stock/aiAnalysis.ts` — 0 warning
- `npx vitest run lib/server/ai lib/prompts` — 32/32 pass

## 결론
PASS — 실패 로그가 `✗ 실패 / reason=` 단일 포맷으로 통일되어 모니터링 grep 이 명확해짐. 동작·결과 무변경(로깅 리팩터).
