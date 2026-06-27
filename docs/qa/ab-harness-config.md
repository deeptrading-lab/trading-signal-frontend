# QA 리포트 — 토큰 최적화 A/B 하니스 (`ab-harness-config`)

- 대상 PR: #165 (`feature/ab-harness-config`)
- worktree: `/Applications/하영/code_source/trading-signal-frontend-abharness`
- 커밋: `9cbaa7c` (HEAD, 4 커밋 diff vs `origin/main`)
- 검증 환경: 로컬 `next dev --webpack -p 3102`(인증게이트 OFF), `.env.local`(KIS·Supabase 설정됨, `APP_PASSWORD` 미설정)
- 검증일: 2026-06-28
- 제약 준수: `next build` 미실행(`tsc --noEmit`·`vitest`·`eslint`·`curl` 만), 9분짜리 골든셋/실분석 미실행(API 스모크만), git 읽기 전용

---

## 종합 판정: **PASS** (실패 0건)

AC1~AC8 전부 통과. BFF·한글톤·서버전용 분리 무회귀 확인. 자동 검증(tsc 0 / eslint 0 / vitest 518 passed) + 라이브 API 스모크(report 빈/400, usage 무회귀) + 에지(malformed/빈본문/세션누락) 모두 기대대로 동작.

부가 관찰(블로커 아님) 1건은 §에지·관찰에 기록.

---

## AC별 재현 · 기대 · 실측

### AC1 — 무회귀 핵심: override 없는 분석은 프롬프트 바이트 동일

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| analysisConfig 단위테스트 | `npx vitest run lib/server/ai/__tests__/analysisConfig.test.ts` | 통과 | 11 tests passed (전체 스위트 내 포함, §AC8) | PASS |
| DEFAULT 값 = 현 리터럴 | 코드: `lib/server/ai/analysisConfig.ts` L48-60 + 테스트 L39-51 | trader 1500/1500/market800·risk research800/signal500·PM 2000/2000·debateR2 1500·debateRounds 2 | 일치(테스트 `toEqual` 통과) | PASS |
| config undefined == DEFAULT 프롬프트 동일 | 테스트 L78-88 (trader/risk×3/PM 5개 에이전트) | `withUndef === withDefault` | 5개 모두 일치(`.toBe`) | PASS |
| slice 경계 | 테스트 L90-100 | trader bull 정확히 1500자, PM bull 정확히 2000자 | 경계 정확(1501/2001 미포함) | PASS |
| 프롬프트 빌더 폴백 | 코드: `lib/prompts/stock/aiAnalysis.ts` `cfg(s) = s.config ?? DEFAULT_ANALYSIS_CONFIG` (L63-65) — 모든 `.slice(0,N)`가 `cfg(s).slices.*` 로 치환 | state.config 미주입 시 DEFAULT 적용 | 8개 slice 지점 + `runDebateLoop` `cfg(state).debateRounds` 전부 `cfg()` 경유 확인 | PASS |

근거: override 미주입(`config: undefined`) 경로가 DEFAULT와 바이트 동일 → 캐시 프리픽스·결정 결과 무변경.

### AC2 — route 수용 (body runId / config / session·configId·configLabel)

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| runId(신규만, 재개 시 무시) | 코드 `route.ts` L448-451: `!startFrom && typeof body.runId === "string" && body.runId.trim() ? ... : crypto.randomUUID()` | 신규 실행만 body.runId 사용, 재개(startFrom 존재) 시 새 UUID | 로직 일치 | PASS |
| config 부분 override | `route.ts` L454-458 → `resolveAnalysisConfig(configOverride)`; 비-객체면 null | 부분 override 가 DEFAULT 위에 병합 | `resolveAnalysisConfig` 병합 단위테스트 통과(AC1) | PASS |
| effort/model 오버라이드 | `route.ts` L683-684: `analysisConfig.effortByAgent?.[agentKey] ?? prompts.effort` / `modelByAgent ?? prompts.model` | 하니스 지정 우선, 없으면 기본 | 로직 일치 | PASS |
| 일반 클라(미동봉) 기존 동작 | POST `{provider, runId, config, session}` (ticker 없음) → 400 무영향 | config/runId 파싱 분기가 정상 입력을 깨지 않음 | `{"error":"요청 형식이 올바르지 않아요."}` HTTP 400 (분기 무crash) | PASS |
| session/configId/configLabel 수용 | `route.ts` L461-465 (trim·default "default"·label 그대로) | 정상 파싱 | 코드 일치 | PASS |

비고: 실제 분석 트리거(9분·실비용)는 PRD 지시대로 미실행. body 검증/파싱 분기는 400 경로로 무crash 확인.

### AC3 — 태깅 fail-soft

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| session 동봉 시만 기록 | `route.ts` L461-462, L525-534: `if (abSession) recordAbRunConfig(...)` | session 없으면 ab_run_config 기록 안 함 | 로직 일치(`abSession` null 가드) | PASS |
| Supabase 미설정 비차단 | `abRunConfigStore.ts` L88-89: `if (!config) return {ok:true, skipped:true, reason:"not_configured"}` | 미설정 시 skip, 분석 계속 | 코드 일치(`recordAbRunConfig`는 `void ... .catch` 비-await) | PASS |
| 오류 비차단 | `abRunConfigStore.ts` L100-114(fetch .catch 래핑) + L118-124(`recordAbRunConfig` warn-only) | insert 실패해도 분석 스트림 무영향 | 코드 일치(분석 본문은 await 안 함) | PASS |

### AC4 — usage 리팩터 무회귀

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 추출 동일성 | diff `app/api/stock/ai-analysis/usage/route.ts` | `mean/nums/aggregateAgent/runWallClockMs/providerRunStats` → `usageAggregate.ts` 로 이동, 로직 byte 동일 | 함수 본문 동일·`aggregateAgentRows`+`runStats` 재사용으로 치환(순수 추출) | PASS |
| 라이브 응답 무회귀 | `curl http://localhost:3102/api/stock/ai-analysis/usage` | runCount·모델·avgDurationMs·runStatsByProvider·latestProvider 유지 | HTTP 200, `configured:true`, `runCount:30`, `latestProvider:claude`, claude 12 agents, `model:claude-sonnet-4-6`, `avgDurationMs:92415.8`(market), `runStatsByProvider.claude={avgWallClockMs:582778.5, runCount:30}` | PASS |
| AgentUsageRow 필드 | 위 응답 first agent | 13개 필드 전부 | `agentKey,avgCacheCreationTokens,avgCacheReadTokens,avgCostUsd,avgDurationMs,avgInputTokens,avgOutputTokens,cacheHitRate,measuredCount,model,orderIndex,sampleCount,stage` 전부 존재 | PASS |

### AC5 — 비교 로직 (compare)

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| PASS/REVIEW/INSUFFICIENT 판정 | 코드 `abHarness/compare.ts` L223-244 | 공통ticker < `AB_MIN_COMMON_TICKERS`(3) → INSUFFICIENT; reason 없으면 PASS, 있으면 REVIEW | 로직 일치(`constants.ts` 임계값 wiring 확인) | PASS |
| 품질 프록시 | compare.ts L196-261 | verdict 일치율·confidence(HIGH비율 하락)·target/stop/signal drift | `modeVerdictByTicker`(다수결)·`highRatio`·`driftBetween`(공통 ticker \|Δ\| 평균) 구현 확인 | PASS |
| 임계값 | `constants.ts` | 일치율 0.8·target/stop drift 3%p·HIGH drop 0.2·min common 3 | 값 일치, compare 가 4개 전부 사용 | PASS |
| report API shape(빈/정상) | §AC7 라이브 | configured/configs/deltas/waste/note | §AC7 통과 | PASS |

비고: compare 는 DB 의존(ab_run_config×ai_agent_usage×signal_scorecard 조인)이라 단위테스트 없음 → PRD 지시대로 코드리뷰 + report API shape 로 검증. 데이터 소스 3개 전부 기존 store 재사용(`getAbRunConfigsBySession`·`getAgentUsageRows`·`getAllScorecardRows`), run_id 조인 무회귀.

### AC6 — 낭비 진단 (waste)

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| waste 단위테스트 | `npx vitest run lib/server/ai/abHarness/__tests__/waste.test.ts` | 통과 | 5 tests passed(전체 스위트 내, §AC8) | PASS |
| yield 공식 | waste.ts L62 + 테스트 L29-33 | `출력/(신규입력+캐시읽기)` | 500/1000=0.5 정확 | PASS |
| cacheCreationShare | waste.ts L63 + 테스트 L35-39 | `캐시생성/(신규+캐시읽기+캐시생성)` | 800/1000=0.8 정확 | PASS |
| yield 오름차순 정렬 | waste.ts L69-71 + 테스트 L46-52 | 최악(낮은 yield) 먼저 | news(0.01) → trader 순서 정확 | PASS |
| 0 나눗셈 가드 | 테스트 L41-44 | 입력 0 → yield null | null 반환 | PASS |
| byStage 합산 | 테스트 L54-63 | 단계별 input/output/cost 합산 | A: input3000·output1200·cost0.8 정확 | PASS |

### AC7 — report API

| 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 없는 세션 | `curl "http://localhost:3102/api/ab-harness/report?session=qa-none"` | 200 + `{configured,session,configs:[],deltas:[],waste:null,note}` | `{"configured":true,"session":"qa-none","configs":[],"deltas":[],"waste":null,"generatedAt":...,"note":"토큰/비용은 Claude CLI 의 API 환산값..."}` HTTP 200 | PASS |
| session 누락 | `curl "http://localhost:3102/api/ab-harness/report"` | 400 | `{"error":"session 쿼리 파라미터가 필요합니다."}` HTTP 400 | PASS |
| session 빈값 | `curl "http://localhost:3102/api/ab-harness/report?session="` | 400(trim) | 400 동일 메시지 | PASS |
| 응답 헤더 | `curl -D -` | data-source·no-store | `x-data-source: supabase`, `cache-control: no-store`, `content-type: application/json` | PASS |

비고: 본 환경은 Supabase 설정됨 → 없는 세션은 `configured:true`(태그 0건 → `emptyResult(true)`). Supabase 미설정 환경이라면 `configured:false` 반환(코드 `compare.ts` L278). PRD 예시의 `configured:true·configs:[]·waste:null`과 일치.

### AC8 — 무회귀 종합

| 항목 | 명령 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| tsc | `npx tsc --noEmit 2>&1 \| grep -vE "\.next/dev/types\|market/(ticker\|indices)/route"` | 0 | raw 0 라인(필터 불필요, error TS 0건) | PASS |
| eslint | `npx eslint lib/server/ai app/api/ab-harness app/api/stock/ai-analysis lib/prompts/stock/aiAnalysis.ts scripts/ab-harness` | 0 | EXIT 0, 경고/오류 0 | PASS |
| vitest | `npx vitest run --exclude '**/__live__/**'` | 전부 통과 | **64 files / 518 tests passed** (analysisConfig 11 + waste 5 포함) | PASS |

---

## 에지 케이스 · 부가 검증

| 케이스 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| malformed JSON 본문 | `POST /api/stock/ai-analysis -d '{not-json'` | 400, no crash | `{"error":"요청 형식이 올바르지 않아요."}` 400 | PASS |
| 빈 본문 | `POST -d ''` | 400 | 400 동일 | PASS |
| ticker 없이 config/runId/session 동봉 | `POST -d '{"provider":"claude","runId":"qa-fake-run","config":{"debateRounds":1},"session":"qa-edge"}'` | 400(분기 무crash) | 400 동일 — 새 파싱 분기가 정상 입력 무파손 | PASS |
| Supabase 미설정 fail-soft | 코드리뷰 `abRunConfigStore.ts` L88-89 / `compare.ts` L278 | skip(insert)·`configured:false`(report)·분석 비차단 | 로직 확인 | PASS |
| 표본 부족 INSUFFICIENT | 코드리뷰 `compare.ts` L225-227 | 공통 ticker < 3 → INSUFFICIENT + 보류 reason | 로직 확인 | PASS |
| session 누락 400 | §AC7 | 400 | 400 | PASS |

### 공통 AC 무회귀

| 항목 | 결과 |
|---|---|
| BFF 원칙 | `git grep -nE "http://127\.0\.0\.1" -- app/` → `app/api/workbench/_adapters/fastapi.ts`(기존 route handler fallback, 본 PR 미변경)만. 신규 코드 0건. PASS |
| 신규 모듈 서버 전용 | `abRunConfigStore`·`abHarness/*`·`usageAggregate`·`analysisConfig` 클라이언트 컴포넌트/훅 import 0건(route handler·lib/server·lib/prompts 만). PASS |
| 신규 fetch( | `abRunConfigStore.ts`의 fetch 2건은 Supabase REST(서버 store, `agentUsageStore` 동일 패턴), 브라우저→FastAPI 직접호출 아님. PASS |
| 한글 톤 | report API 에러 3종 전부 자연 한글("session 쿼리 파라미터가 필요합니다.", "...지연되고 있어요...", "...오류가 발생했어요."). PASS |

### 부가 관찰 (블로커 아님)

- **골든셋 러너 verdict 로깅**: `scripts/ab-harness/run-golden-set.mjs` L80 이 `evt.decision?.verdict ?? evt.verdict` 를 읽으나, 실제 SSE final 이벤트 shape 는 `{ type:"final", data: FinalDecision }`(route.ts L754, `aiAnalysis.ts` L169). 따라서 콘솔 로그가 항상 `verdict=?` 로 찍힌다. **서버측 DB 기록(ab_run_config·signal_scorecard·ai_agent_usage)·비교 리포트에는 무영향**(러너는 HTTP 트리거만 담당, verdict 는 콘솔 표시용). 러너는 실행 금지 대상이고 테스트·AC 범위 밖이라 PASS 판정에 영향 없음. 후속 개선 시 `evt.data?.verdict` 로 정정 권고.

---

## 검증 명령 로그(요약)

```
$ npx tsc --noEmit 2>&1 | grep -vE "\.next/dev/types|market/(ticker|indices)/route"
(출력 없음 — error TS 0건)

$ npx eslint lib/server/ai app/api/ab-harness app/api/stock/ai-analysis lib/prompts/stock/aiAnalysis.ts scripts/ab-harness
EXIT 0 (오류·경고 0)

$ npx vitest run --exclude '**/__live__/**'
Test Files  64 passed (64)
     Tests  518 passed (518)

$ curl "http://localhost:3102/api/ab-harness/report?session=qa-none"
{"configured":true,"session":"qa-none","configs":[],"deltas":[],"waste":null,...}  HTTP 200

$ curl "http://localhost:3102/api/ab-harness/report"
{"error":"session 쿼리 파라미터가 필요합니다."}  HTTP 400

$ curl "http://localhost:3102/api/stock/ai-analysis/usage"
{configured:true, runCount:30, latestProvider:claude, claude 12 agents, model sonnet-4-6, runStatsByProvider.claude.avgWallClockMs:582778.5}  HTTP 200
```
