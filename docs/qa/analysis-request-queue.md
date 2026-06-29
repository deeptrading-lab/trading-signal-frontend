# QA — prod 분석 요청 큐 (analysis-request-queue)

- 대상 PR: `feature/analysis-request-queue`
- 범위: prod 배포 주소에서 AI 종합분석을 **요청(enqueue)** → Supabase 큐 적재 → 로컬 워커가 폴링 드레인 → 기존 핸들러로 실행·저장 → 요청자가 재방문해 결과 확인. 전역 동시성 세마포어로 출처 합산 캡(N=3). (PRD `analysis-request-queue`)
- 배경: AI 분석은 로컬 CLI 셸 호출이라 prod(Vercel)에선 503 차단 → 배포 주소 공유자가 새 분석 불가였음. 큐 중계로 "요청 접수 → 몇 분 뒤 결과" 비동기 모델 도입.
- 검증 환경: dev 서버 `NEXT_PUBLIC_VERCEL_ENV=preview`(prod 분기 강제) + 실제 Supabase `ai_analysis_queue` 테이블(QA 시점 사용자가 SQL 1회 실행 완료). 풀 분석(수 분·실제 CLI 비용)은 비용상 미실행 — 수동 검증 항목으로 분리(§한계).

## 변경 (구현 8커밋)
- `docs/sql/ai-analysis-queue.sql` — 큐 테이블 DDL(상태머신·인덱스·RLS·`requested_by` nullable).
- `lib/server/ai/queueStore.ts` — Supabase REST fail-soft(enqueue·claim·markDone/Failed·recoverStuck·getQueueDepth·중복가드).
- `lib/server/ai/concurrencyGate.ts` + `route.ts` 배선 — globalThis 단일 카운터 세마포어(N=3), 503 가드 다음 tryAcquire→429, 모든 종료경로 release.
- `app/api/stock/ai-analysis/enqueue/route.ts`(무가드 POST)·`worker-status/route.ts`(GET)·`lib/server/ai/workerHeartbeat.ts`(KV).
- `scripts/analysisWorker.ts`(tsx) + `package.json`(`analyze:worker`·`all` + tsx·concurrently).
- prod UX: `ProdAnalysisQueueCard`·`ProdQueueBanner`·`ProdRequestCta` + `AIAnalysisPanel`(IS_PROD 분기) + 도메인훅/뮤테이션/axios + `prodQueue.*` 카피.

## 수용 기준 (AC)

| # | 항목 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | prod enqueue ≠ 503 | pending INSERT + `{status}` 반환 | 라이브 curl `{status:queued,id:3,workerOffline:true}` HTTP 200 (503 아님) | ✅ |
| AC-2 | 실행 핸들러 503 가드 유지 | route.ts 가드 불변, enqueue 무가드 | `grep isVercelEnv` route.ts=2(가드 유지)·enqueue=0 | ✅ |
| AC-3 | 워커 드레인 — done까지 소비→저장 | SSE `done`까지 소비 후 markDone, 미완 시 throw→markFailed | 코드 인스펙션: `runAnalysis` `"type":"done"` 확인·미수신 시 throw, 이후 `markDone`. **풀 실행=수동(§한계)** | ✅(코드)/수동 |
| AC-4 | 중복 방지 | 같은 ticker 활성 시 INSERT 0, `already` | 라이브 `enqueue#2 {status:already,id:1}`(동일 id) | ✅ |
| AC-5 | 오프라인 접수+경고 | 워커 꺼져도 적재, `workerOffline:true` | 라이브 워커 미기동 enqueue → `workerOffline:true`, row pending 적재됨 | ✅ |
| AC-6 | worker-status 판정 | 하트비트 부재→`{online:false}` | 라이브 `GET /worker-status` → `{online:false}` HTTP 200 | ✅ |
| AC-7 | 세마포어 over-cap 429 | N=3 초과 시 거절 | `concurrencyGate.test` — N까지 true, N+1 false(핸들러 429) | ✅ |
| AC-8 | 세마포어 격리(요청데이터 0) | 모듈 스코프 카운터만 | `concurrencyGate.test` 격리군 — export 허용목록·arity 0·정적 소스 스캔(ticker/runId/decision/Map 0) | ✅ |
| AC-9 | provider 자동선택 | claude 우선/codex 폴백/없으면 fail | 코드: `pickProvider` claude→codex→null→`markFailed` | ✅(코드) |
| AC-10 | stuck 복구 | 20분 초과 processing→pending 1회 후 failed | `queueStore.test` — 1회 재투입(`[recovered:1]`) 후 2회째 failed | ✅ |
| AC-11 | fail-soft / 무회귀 | 로컬 라이브 경로 불변, 미설정 graceful | `AIAnalysisPanel` diff = IS_PROD 분기 1개만 추가(SlideToAnalyze/SSE 무변경), 테이블 부재 시 critical 배너로 fail-soft(크래시 0) | ✅ |
| AC-12 | SQL·운영 | DDL 존재 + 수동 1회 실행 | `docs/sql/ai-analysis-queue.sql` 존재, 사용자 실행 완료(테이블 라이브 — id 1/2/3 생성·삭제 확인) | ✅ |

## 라운드트립 / 에지 케이스 (라이브)
- **enqueue 라운드트립**: `POST {ticker:"ZZQA"}` → `queued,id` → 동일 ticker 재요청 → `already`(동일 id) → `findActiveByTicker` pending 확인 → `markDone` 정리. ✅
- **빈/잘못된 입력**: `{}`·malformed JSON·비문자 ticker → `400 "요청 형식이 올바르지 않아요."`(한글). 특수문자만/빈 ticker → 살균 후 `400 "ticker가 필요합니다."`. ✅
- **ticker 살균**: `route.ts`와 동일 정규식(`[^A-Za-z0-9_-]` 제거) — 영숫자·`_`·`-` 외 제거. ✅
- **테스트 데이터 정리**: 검증 중 만든 ZZTEST/ZZQA/ZZQACHK 3행 REST DELETE 완료(큐 테이블 깨끗). dev 서버 종료 완료.

## 회귀 / 정적 검증
- `npm run typecheck` 0 · `npm run lint` 0(warning 0) · `npm run test` **610 pass / 3 skip** · `npm run build` 성공(56/56, 신규 라우트 `enqueue`·`worker-status` 등록).
- 신규 빌드 토큰 0(기존 `.card-info`/`.card-warn`/`.card-critical`/`accent-vivid-soft` 재사용), hex/px 직타 0, 명명 `max-w-sm`/`max-w-xs` 0(`max-w-[44rem]` 사용), 컴포넌트 fetch/axios 직접호출 0(BFF), TanStack/hooks/query 컴포넌트 직접 import 0(도메인훅 경유), 상태 배너 `role="status"`+`aria-live`.

## 한계 / 후속 (블로커 아님)
1. **풀 분석 E2E = 수동**: 워커가 실제 종목을 claim→수 분짜리 CLI 분석→decision 저장→prod 카드 결과 표시까지의 전체 라운드는 **실제 비용**이라 QA 미실행. 메커닉은 코드 인스펙션+단위테스트로 판정. **머지 전/후 사용자가 `npm run all` 기동 후 prod에서 1건 요청해 육안 확인 권장**(KV `KIS_TOKEN_STORE=kv` + Supabase service role env 양쪽 필요 — 하트비트 cross-process 전제).
2. **S9 decision-based failed**: `AIAnalysisDecisionSnapshot`에 failed 필드 없어 v1은 enqueue 자체 실패만 critical 처리. "지난 분석 실패" 카드는 스키마 필드 추가 후속.
3. **S7 처리 중 폴링 뱃지**: R3대로 v1 생략(worker-status 엔드포인트는 존재, 클라이언트 훅만 후속 PR).
4. **브라우저 시각/2뷰포트**: 코드·토큰·반응형 클래스로 검증, 라이브 시각 확인은 prod 배포 후 수동.

## 결론
**PASS(조건부)** — AC-1~12 전부 충족(AC-3·AC-9는 코드 인스펙션, 나머지 라이브/단위테스트 실측). 큐 레이어·BFF·세마포어·워커 런타임·prod UX·무회귀 검증 완료. **유일 잔여 = 풀 분석 E2E 1건 수동 확인**(비용 항목, 머지 전/후 사용자 수행). 테이블은 사용자가 생성 완료해 happy path 라이브 동작 확인됨.
