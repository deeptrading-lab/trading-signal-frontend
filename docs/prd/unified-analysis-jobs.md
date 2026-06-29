# PRD — unified-analysis-jobs (여러 소스 분석 작업을 큐 트래커로 통합 + /analyze 인플라이트 카드)

- **slug**: `unified-analysis-jobs`
- **작성일**: 2026-06-29
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **대상 브랜치**: `feature/unified-analysis-jobs`
- **UI 포함 여부**: **yes** — `/analyze` 분석 결과 카드 목록에 **인플라이트 카드(분석 중 / 대기 중)** 를 결과 카드와 함께 렌더한다(decisions 완료 결과 + queue 진행중을 합성). 첫 분석(완료 결과 없음) 종목은 플레이스홀더 카드. 기존 결과 카드 레이아웃은 무회귀(인플라이트 카드·배지 추가). **UX/UI 디자이너 합류 트리거 — §9 q6 참조.**
- **상위 컨텍스트(이 PRD가 직접 의존)**:
  - `analysis-request-queue`(PR#175 / Scope A) — prod enqueue → `ai_analysis_queue`(pending) → 로컬 워커가 claim(processing) → 기존 핸들러 SSE 끝까지 소비 → `upsertAIDecision`(done). 본 PRD는 **이 큐 테이블을 "모든 소스(prod·로컬·봇) 작업 트래커"로 확장**한다(현재는 prod enqueue 만 행을 만든다).
  - `queue-worker-status-badge`(PR#176 / S7) — prod 카드에 워커 "분석 중/대기 N건" 뱃지. PR#176 본문 `## 다음 작업` 첫 항목("전역 큐 카드 — slack/로컬/prod 모든 요청을 큐에 적재하고 /analyze 에서 종목별 분석중/대기중 카드를 결과 카드와 함께 표시 … Scope B 별도 PRD")이 **곧 본 PRD다.** 본 PRD는 #176 의 명시된 후속으로, 워커 활동 뱃지를 **종목별 인플라이트 카드**로 확장·일반화한다.
  - `ai-decision-upsert`(종목 PK upsert로 PM 결론 공유 저장) — **decisions 테이블은 무변경**(결과 SSOT 그대로).
  - `concurrent-ai-analysis`(PR#163) + 전역 세마포어(`concurrencyGate.ts`, N=3) — 동시성 캡 **무변경**(MVP 단일 워커·N=3 전제).
- **테이블 결정(확정 전제)**: **두 테이블을 그대로 유지한다.** `ai_analysis_decisions`(완료 결과 SSOT, 종목당 1행 upsert) + `ai_analysis_queue`(작업 트래커, 종목당 여러 행 이력) **각자 역할 분리**. `/analyze` 가 둘 다 읽어 종목별 카드로 합성한다. (테이블을 하나로 합치지 않는다 — 결과 reader 무회귀가 핵심 이득.)

---

## 1. 배경 / 문제

`/analyze` 분석 페이지는 지금 **이미 끝난 분석 결론만** 카드로 보여준다(`ai_analysis_decisions` 를 `getAllAIDecisions` 로 `updated_at desc` 조회). 그래서 사용자 관점에서:

- prod·로컬·Slack봇 어디서 분석을 **요청·시작해도**, 그 작업이 **접수됐는지·지금 돌고 있는지·대기 중인지**가 `/analyze` 화면에 보이지 않는다. 분석이 다 끝나 결론이 저장된 **뒤에야** 카드가 처음 나타난다(요청~완료 사이 수 분간 화면이 깜깜).
- prod 카드(PR#175/#176)는 자기 요청에 대해 "접수됐어요" 배너 + 워커 활동 뱃지를 보여주지만, 이는 **prod 분기 한정**이고 **그 한 종목**에 대한 단발 표시다. `/analyze` 의 종목 카드 목록(여러 종목·여러 출처)에는 인플라이트가 안 섞인다.
- **작업 상태(진행중)는 `ai_analysis_queue` 에, 완료 결과는 `ai_analysis_decisions` 에** 나뉘어 있고, `/analyze` 카드 목록은 **결과 테이블만** 읽는다. 게다가 queue 는 **현재 prod enqueue 경로에서만** 행이 생긴다 — 로컬 브라우저·봇이 직접 실행하는 분석은 queue 에 행을 안 남겨 어차피 인플라이트로 안 잡힌다.

### 1-1. 제품 의도 (사용자 결정 — 확정 전제)

> **어디서 요청하든(prod·로컬·Slack봇) AI 종합분석 작업을 종목별 카드로 `/analyze` 에 미리 표시하고, 각 카드가 분석 중 / 대기 중 / 완료 중 어디인지 status UI 로 보여준다. 분석이 끝나면 같은 자리(카드)에 결과가 채워진다.**

핵심 아키텍처 결정(사용자):

> **두 테이블을 유지한다.** `ai_analysis_decisions`(완료 결과)와 `ai_analysis_queue`(작업 트래커)를 합치지 않고 각자 둔다. 다만 **queue 가 prod 뿐 아니라 모든 소스(로컬·봇)의 진행중 작업까지 트래킹**하도록 확장하고, `/analyze` BFF 가 **두 테이블을 읽어 합성**한다 — 완료는 decisions, 진행중은 queue.

본 PRD 는 이 방향을 **구체화**하는 것이지 대안 비교가 목적이 아니다. 단, 이 방향이 만드는 핵심 설계 난점(로컬·봇 직접 실행 경로가 queue 행을 어떻게 남기는가, prod 워커가 이미 만든 행과 핸들러가 만드는 행의 **중복 방지**)은 §3·§8·§9 에 정직하게 적는다.

### 1-2. 현재 구조 — 코드 추적 결과 (확정 사실, 읽기 전용 조사)

| # | 사실 | 근거 위치 |
|---|---|---|
| 1 | `ai_analysis_decisions` = **완료 결과 SSOT**. PK ticker(종목당 1행), `decision jsonb NOT NULL` upsert. `/analyze` 카드 목록 = `getAllAIDecisions()`(`updated_at.desc`)가 그대로 그림 | `docs/sql/ai-analysis-decisions.sql`·`lib/server/ai/decisionStore.ts:103` |
| 2 | 결과 reader 들 = `getLatestAIDecision`(이전결론·PM 컨텍스트 `route.ts:504`·종목 패널 `decision/route.ts:23`)·`getAllAIDecisions`(/analyze·scorecard backfill `runBackfillDecisions.ts:36`)·`AIDecisionCard`(`decision.verdict` 참조). **본 PRD 는 이들을 안 건드린다** | `lib/server/ai/decisionStore.ts:62/103`·`components/analyze/AIDecisionCard.tsx:96` |
| 3 | 결과 저장은 **PM 완료 시점 단 1곳** `route.ts:799 upsertAIDecision(...)` | `app/api/stock/ai-analysis/route.ts:799` |
| 4 | `ai_analysis_queue` = **작업 트래커**. PK id(종목당 여러 행), status(pending/processing/done/failed)·force·worker_id·error·requested_by·created_at·claimed_at·finished_at. FIFO claim(`created_at.asc`)+조건부 UPDATE(status=pending 가드)+`recoverStuck`(processing 20분 초과)+중복가드 `findActiveByTicker`(pending\|processing 1건) | `docs/sql/ai-analysis-queue.sql`·`lib/server/ai/queueStore.ts` |
| 5 | **queue 행은 현재 prod enqueue 경로에서만 생성**(`enqueueAnalysis`). 로컬 브라우저·봇 직접 실행은 queue 에 행 0 | `app/api/stock/ai-analysis/enqueue/route.ts:32`(유일 enqueue 호출부) |
| 6 | 실행 경로: **prod** = enqueue → queue(pending) → 워커가 claim(processing) → **프론트 `/api/stock/ai-analysis` 핸들러를 HTTP 호출**(`{ ticker, provider }` 만 전달, **jobId 미전달**) → SSE done 소비 → 워커가 `markDone(id)` / **로컬 브라우저** = 큐 우회, 핸들러로 직접 SSE 실행(라이브) → 끝에 upsert(queue 무관) | `scripts/analysisWorker.ts:65~131`·`app/api/stock/ai-analysis/route.ts` |
| 7 | 전역 세마포어(`concurrencyGate.ts`, globalThis 카운터 N=3)가 **핸들러 프로세스에서** 브라우저·봇·워커 합산 실행을 캡(`route.ts:412 tryAcquire`, finally `release`) → 봇·로컬·워커가 모두 이 핸들러 한 길을 지난다는 **정황**(확정 아님 — §9 q1) | `lib/server/ai/concurrencyGate.ts`·`route.ts:412/960` |
| 8 | 워커는 SSE 를 `{type:'done'}`까지 끝까지 소비해야 핸들러 내부 `upsertAIDecision` 이 실행(중간에 끊으면 AbortController 로 분석·저장 중단) | `scripts/analysisWorker.ts:74~88`·`route.ts:548`(combinedSignal)·`799`(upsert) |
| 9 | **삭제 동작**: queue·decisions 모두 완료 시 DELETE 없음. queue 는 status 전이로 영구 누적, decisions 는 ticker 덮어쓰기. retention/정리 잡 0 | (SQL·store 전반 DELETE 부재) |
| 10 | run(에이전트 실행) 토큰 이력은 `ai_agent_usage`(별 테이블) — decision/queue store 와 무관 | `lib/server/ai/agentUsageStore.ts` |

### 1-3. 두 테이블 유지가 주는 이득 (이 방향을 택한 근거)

- **결과 reader 전부 무회귀**: decisions 스키마·`decision NOT NULL`·`AIDecisionCard.decision.verdict` 참조를 손대지 않으므로, "병합 시 decision nullable 로 모든 reader 붕괴" 위험이 **원천 소멸**(§8-2). 카드 정렬도 done 결과는 `updated_at` 그대로라 "status 전이마다 출렁임" 문제 없음.
- **역할 분리 유지**: 결과(영속 SSOT) vs 작업(트래커·이력)이 분리되어, queue 의 행 누적·retention·소스 식별 같은 "작업 관리" 관심사가 결과 테이블을 오염하지 않는다.
- **남는 일은 두 가지뿐**: (a) **queue 가 모든 소스 작업을 트래킹**하게(지금은 prod 만), (b) `/analyze` 가 **두 테이블 합성**(완료+진행중).

---

## 2. 목표 (측정 가능)

- **G1 (인플라이트 가시화)**: prod·로컬(·봇)에서 분석을 요청·시작하면 `/analyze` 카드 목록에 그 종목 카드가 **즉시** 나타나고 `분석 중`/`대기 중` 배지가 표시된다(완료 전에 보임). 분석이 끝나면 **같은 종목 카드 자리**에 결과(verdict 등)가 채워진다.
- **G2 (queue = 전 소스 작업 트래커)**: prod enqueue 뿐 아니라 로컬 브라우저·봇 직접 실행도 queue 에 작업 행(processing→done/failed)을 남긴다. queue 에 소스 식별 컬럼(`source` = prod/local/bot, §9 q3)을 더해 어느 출처 작업인지 구분한다.
- **G3 (두 테이블 합성 — 결과 테이블 무변경)**: `/analyze` BFF 가 `ai_analysis_decisions`(완료) + `ai_analysis_queue` active(pending/processing) 를 **둘 다 읽어** 종목별 카드로 합성한다. **decisions 테이블·기존 reader 는 변경 0.**
- **G4 (중복 행 방지)**: prod 경로는 워커가 이미 claim 한 queue 행이 있으므로, 핸들러가 **또 행을 만들면 안 된다**. 핸들러는 "prod 워커 호출(행 이미 있음)" vs "로컬/봇 직접(행 없음)"을 구분해 **active 행이 있으면 재사용, 없으면 1행 insert**(§3-3·§9 q2).
- **G5 (로컬 라이브 SSE 무회귀)**: 로컬 브라우저의 실시간 스트림 경로는 **그대로**(실행 경로·SSE·요청 격리·세마포어 무변경). 핸들러가 queue status 만 **부가 기록**한다.
- **G6 (fail-soft)**: Supabase 미설정/오류 시 queue 기록·합성 조회 모두 throw 대신 no-op/빈 결과 — 분석 실행과 `/analyze` 화면(최소한 완료 결과 카드)이 안 깨진다(기존 `decisionStore`/`queueStore` 패턴).

---

## 3. 범위 (In scope)

### 3-1. queue 테이블 확장 — 전 소스 작업 트래커 (SQL, 수동 1회 실행)
- `docs/sql/ai-analysis-queue.sql` 에 멱등 `alter table … add column if not exists` 로(기존 `requested_by` 보강 선례 동일):
  - `source text not null default 'prod' check (source in ('prod','local','bot'))` — 작업 출처(§9 q3). **기존 행은 모두 prod enqueue 분이므로 default 'prod'** 가 안전(무손실).
  - 필요 시 인덱스 보강(현 `pending_idx`·`ticker_status_idx`·`processing_idx` 로 active 조회·중복가드·stuck 복구는 충분 — 추가는 합성 BFF 쿼리 패턴 보고 결정).
  - RLS·코멘트는 기존 파일 컨벤션 유지(service role 만 접근).
- **⚠️ Supabase SQL Editor 수동 1회 실행 필요**(`ai_agent_usage`·`ai_analysis_decisions`·`ai_analysis_queue` 선례). 미적용 시 `source` 부재로 fail-soft(기존 prod 큐 동작은 유지, 소스 구분만 graceful 미동작).
- **`docs/sql/ai-analysis-decisions.sql` 은 변경 0**(결과 테이블 무변경).

### 3-2. queue store 확장 (status 기록 + 소스)
- `lib/server/ai/queueStore.ts`(기존 service role REST·fail-soft 패턴 그대로):
  - `enqueueAnalysis({ ticker, force, source? })` — `source` 인자 추가(prod 기본). prod enqueue 는 `'prod'`.
  - **`startProcessing({ ticker, source, jobId?, workerId? })`** (신규) — **active 행 재사용 또는 신규 processing 1행 insert**(G4 핵심). `jobId` 가 오면(prod 워커가 이미 claim) 그 행을 그대로 쓰고, 없으면 같은 ticker active 행을 찾아 재사용, 그래도 없으면(로컬/봇 직접) `status='processing'` 1행 insert. 반환은 `{ jobId, owned }` — `owned=true` 면 이 핸들러가 종결 책임(로컬/봇), `false` 면 외부(prod 워커)가 종결(§3-4). 핸들러가 실행 시작에 호출.
  - **`markDone(id)` / `markFailed(id, error)`** — 기존 함수. 직접 실행(로컬/봇, `owned=true`)이면 핸들러가 자신의 jobId 로 종결, prod 워커 경로(`owned=false`)면 **워커가 종결**(현행 유지).
  - `findActiveByTicker`·`recoverStuck`·`getQueueDepth` — 기존 그대로(전 소스 행을 보게 됨).
  - 미설정/오류 시 fail-soft.

### 3-3. 핸들러 status 기록 + 중복 방지 (`route.ts` — 한 길)
- `app/api/stock/ai-analysis/route.ts` 에 **queue status 부가 기록만** 추가(실행 로직·SSE·세마포어·`upsertAIDecision` 무변경, G5):
  - **순서 불변식(R8)**: `tryAcquire()` **성공 직후에만** `startProcessing` 호출(슬롯 못 잡으면 429 즉시 반환, queue 행 안 만듦).
  - `startProcessing({ ticker, source, jobId })` → `{ jobId, owned }` 확보. **중복 방지(G4)**: prod 워커가 넘긴 jobId 가 있으면 그 행 재사용(owned=false), 없으면 active 재사용 또는 신규 insert(owned=true).
  - **소스/jobId 입력 방식(§9 q2)**: 워커가 핸들러 호출 시 body 에 `jobId`(claim 한 행 id)·`source:'prod'` 전달(현재 `{ ticker, provider }` 만 보냄, 1-2.#6). 로컬 브라우저는 미전달 → 핸들러가 `source:'local'` 로 신규. **PM 권고는 이 명시 전달 방식(안1)**.
  - PM 완료(`route.ts:799`) 시: `owned=true`(로컬/봇)면 핸들러가 `markDone(jobId)`. `owned=false`(prod 워커)면 **워커가 markDone**(핸들러는 안 함 — 이중 종결 방지, §3-4).
  - 실패/타임아웃/abort 경로(`failAgent`·early-return·finally): `owned=true`면 `markFailed(jobId, error)`. **사용자 중지(AbortError)는 failed 아님**(현재 로그 info "중지"와 일치) — 정리 정책 §9 q4.
  - fail-soft — queue 기록 실패가 SSE 분석 스트림을 막지 않는다(기존 `upsertAIDecision` 이 이미 fail-soft 인 패턴 그대로).

### 3-4. prod 워커 경로 정합 (종결 주체 단일화)
- prod 경로에서 queue 행은 **워커가 claim(processing)** 하고(현행 `analysisWorker.ts`), 워커가 핸들러 호출 시 **그 jobId·`source:'prod'` 를 body 에 실어** 핸들러가 행을 **재사용만**(또 만들지 않음, owned=false). 종결(`markDone`/`markFailed`)도 **워커가 SSE 결과로 판정**(현행 `analysisWorker.ts:131/135`).
- **이중 종결/이중 행 방지가 핵심 불변식**: prod 경로 = (워커 claim → 핸들러 재사용 owned=false → 워커 종결), 로컬/봇 경로 = (핸들러 insert owned=true → 핸들러 종결). jobId/owned 로 분기(§9 q2).
- 변경 최소: 워커 fetch body 에 `jobId`·`source` 한 줄 추가(`analysisWorker.ts:65~70`), 핸들러가 그걸 읽어 분기.

### 3-5. `/analyze` 합성 BFF + 인플라이트 카드 UX (UI)
- `app/api/stock/ai-analysis/decisions/route.ts`(또는 신규 합성 BFF) 가 **decisions(완료) + queue active(pending/processing) 둘 다 읽어** 종목별로 합성:
  - 완료 결과 있음 → 기존 결과 카드(verdict·tone·토큰) **그대로**(무회귀).
  - active 행 있음(진행중) → 그 종목 카드에 `분석 중`/`대기 중` 배지. 완료 결과도 있으면 "이전 결론 + 재분석 중", 없으면(첫 분석) **플레이스홀더 카드**.
  - 응답 타입(`lib/types/stock/aiAnalysisDecisions.ts`)에 인플라이트 필드(예: `inflightStatus?: 'pending'|'processing'`, `source?`)만 옵셔널로 추가 — **decisions snapshot 자체는 무변경**(합성 레이어에서만 얹음). 진행중이지만 완료 결과 없는 종목은 합성 결과에 별도 인플라이트 항목으로 포함.
- `components/analyze/AIDecisionListContainer.tsx` + `AIDecisionCard.tsx`:
  - 카드가 인플라이트 배지 분기. **첫 분석 플레이스홀더**(완료 결과 없음) 카드는 `AIDecisionCard` 의 `item.decision.verdict` 참조가 닿지 않게 **별도 플레이스홀더 컴포넌트/가드**(완료 결과 없으면 verdict 없음).
  - **폴링**: 인플라이트 항목이 목록에 있을 때만 짧은 폴링(~15s, #176 워커 뱃지 톤). 모두 done 이면 폴링 0(기존 수동 새로고침 유지). `useQueryAIDecisions` 갱신 정책 조정(§9 q6).
  - status 문구는 한글, `lib/copy/analyze/labels.ts`(#176 카피 `분석 중`/`대기 N건`/`분석 서버 꺼짐`과 일관). 색/아이콘은 기존 합성 클래스·토큰 재사용(신규 hex/px 0).
  - 코드 컨벤션(`docs/rules/frontend.md`): 페칭 도메인 훅(`useQueryAIDecisions`) → `hooks/query/useQuery*` 경유(컴포넌트 useQuery 직접 import 0). query key `queryKeys.ts` 단일 위치(기존 `aiDecisions`). 분기 Tailwind prefix 우선, JS 분기 `useBreakpoint`.

### 3-6. 봇 status 기록 경로 (조건부 — §9 q1 결정에 종속)
- **봇이 프론트 `/api/stock/ai-analysis` 핸들러를 경유하면**(세마포어 정황상 가능성 높음, 1-2.#7) → §3-3 핸들러 status 기록으로 **봇 작업 자동 트래킹**(`source:'bot'` 태깅, 이 레포 변경 0). 본 PRD 기본 가정.
- **봇이 자체 분석 경로(핸들러 비경유)면** → 봇 레포(`dev-manager-bot`)에서 분석 시작/완료에 queue 행 기록 필요(크로스 레포, 이 PRD 범위 밖 — 후속 티켓). 이 경우 **봇 인플라이트만 `/analyze` 에 안 뜨고** prod·로컬은 정상(graceful degradation).

---

## 4. 비범위 (Out of scope)

본 PRD 가 **명시적으로 하지 않는** 것:

- **decisions·queue 테이블 병합**: 사용자 결정대로 **두 테이블 유지**(병합 안 함). decisions 스키마·`decision NOT NULL`·결과 reader 무변경.
- **decisions 테이블/reader 수정**: 결과 SSOT 는 손대지 않는다(`getLatestAIDecision`/`getAllAIDecisions`/`backfillDecisions`/`AIDecisionCard` 무변경 — 합성 레이어에서만 인플라이트 얹음).
- **봇 레포(`dev-manager-bot`) 코드 변경**: 이 레포만. 봇이 핸들러 비경유면 봇 측 queue 기록은 후속 티켓(§3-6/§9 q1).
- **로컬 라이브 SSE 경로 변경**: 로컬은 지금처럼 실시간 스트림(핸들러 직접 SSE) 유지. queue status 만 부가(G5).
- **동시성 캡 변경**: 전역 세마포어 N=3·단일 워커 전제 그대로(과설계 금지).
- **완료 알림(Slack 핑)**: 후속(PR#175 의 완료 알림, 봇 크로스 레포).
- **인증(`requested_by` per-user 상한)**: 자리(`requested_by` 컬럼)만 비워둠. 동작은 ticker 단위(PR#175 동일, §9 q7).
- **글로벌 큐 깊이 안전밸브**: 사적 도구라 v1 미도입(retention §9 q5 와 함께).

---

## 5. 수용 기준 (AC — QA가 테스트 항목으로 직변환 가능)

> 실행 검증 보조 명령: `npm run typecheck` · `npm run lint` · `npm run test` · `npm run build` 0 에러. `queueStore` 확장(`startProcessing` 재사용/신규 분기·source 태깅·owned 종결·fail-soft)·합성 BFF·`/analyze` 인플라이트 렌더 단위 테스트 추가.

### AC-1 (queue source 확장 멱등 + 무손실 / decisions 무변경)
`docs/sql/ai-analysis-queue.sql` 에 `source`(default 'prod', check 제약)가 `add column if not exists` 로 멱등 추가됨. 기존 배포 DB 재실행 시 에러·손실 0, **기존 모든 행 `source='prod'`**. (`grep -n "source" docs/sql/ai-analysis-queue.sql` → 컬럼·체크 존재.) **decisions 테이블 SQL 은 변경 0**(`git diff docs/sql/ai-analysis-decisions.sql` → 변경 없음).

### AC-2 (전 소스 작업 트래킹 — 로컬/봇 직접 실행이 queue 행 생성)
로컬 브라우저 직접 분석(큐 우회 라이브) 시작 → 핸들러가 `startProcessing` 으로 queue 에 `status='processing'`, `source='local'`, `owned=true` 1행 생성, 완료 시 `markDone`. (prod 워커 경로가 아닌데도 인플라이트가 잡힘.) 봇 경유 시 `source='bot'`(§9 q1 확정 시).

### AC-3 (중복 행 방지 — prod 워커 경로)
prod enqueue → 워커 claim(processing 1행) → 워커가 jobId·`source:'prod'` 동봉해 핸들러 HTTP 호출 → 핸들러가 **그 행을 재사용**(owned=false, 또 만들지 않음) → 같은 ticker queue 활성 행 **1건 유지**. 종결은 **워커만**(`markDone`), 핸들러는 prod 경로에서 종결·신규 insert 0. (해당 ticker 활성 행 수 = 1.)

### AC-4 (두 테이블 합성 — /analyze 카드)
`/analyze` 카드 목록 BFF 가 decisions(완료) + queue active(pending/processing) 를 합성해 반환 → 완료 결과 카드 + 진행중 종목의 인플라이트 배지/플레이스홀더가 함께 렌더. 진행중→완료 전환 시 같은 ticker 카드가 결과 카드로 바뀐다.

### AC-5 (첫 분석 플레이스홀더 — 결과 reader 무회귀)
완료 결과 없음 + queue active 인 종목 → `/analyze` 에 **플레이스홀더 카드**(종목명 + `분석 중`/`대기 중`). `AIDecisionCard`(결과 카드)는 **완료 결과가 있을 때만** verdict 를 참조 → null 참조 0(별도 플레이스홀더 컴포넌트/가드). `getLatestAIDecision`/`getAllAIDecisions`/`backfillDecisions` **호출 시그니처·동작 변경 0**(`git diff lib/server/ai/decisionStore.ts` → 변경 없음 또는 무관 추가만).

### AC-6 (재분석 중 이전 결과 유지)
완료 결과가 있는 종목 재분석 시작 → 카드가 **이전 verdict 를 보여주며** `분석 중` 배지(decisions 결과 그대로 + queue active 합성). 완료 시 새 verdict 로 갱신. (decisions 는 PM 완료 때만 덮어쓰므로 진행 중엔 이전 결과 유지 — 현행 그대로.)

### AC-7 (로컬 라이브 SSE 무회귀)
로컬 브라우저 실시간 분석(핸들러 직접 SSE)은 그대로 — SSE 이벤트 순서·요청 격리(PM 섞임 0, `concurrent-ai-analysis` 격리 회귀 테스트 통과)·세마포어 acquire/release 무변경. queue 기록은 부가일 뿐 스트림을 막지 않는다.

### AC-8 (fail-soft / 미설정)
Supabase 미설정 또는 `source` 컬럼 미적용 → queue 기록·합성 조회 fail-soft(no-op/빈 결과). 분석 실행과 `/analyze` 완료 결과 카드가 안 깨짐(인플라이트만 graceful 미표시).

### AC-9 (폴링 — 인플라이트 있을 때만)
`/analyze` 목록에 active 항목이 있을 때만 ~15s 폴링이 켜지고, 모두 done 이면 폴링 0(기존 수동 새로고침 동작 유지). (불필요 부하 회피.)

### AC-10 (stuck 복구 — 작업 영구 잔류 방지)
워커 죽음·핸들러 비정상 종료로 processing 잔류 행 → `recoverStuck`(20분, 기존) 이 복구(pending 재투입 1회 후 failed). 카드에 "분석 중" 이 영구 박히지 않음.

### AC-11 (디자인·컨벤션 정합)
인플라이트 배지/플레이스홀더에 hex/px 직타 0(`grep -nE "#[0-9a-fA-F]{3,6}|[0-9]+px" components/analyze/AIDecisionCard.tsx` → 신규 0). status 문구 `lib/copy/analyze/`. 페칭 도메인 훅 경유(컴포넌트 useQuery 직접 import 0). `cn` 색-드롭 회귀 없음(`text-caption`+색 토큰 공존 — MEMORY `cn/tailwind-merge fontSize` 함정 확인).

---

## 6. 가정 · 제약

- **A1 — 사용자 결정 = 두 테이블 유지**: decisions(완료 결과)·queue(작업 트래커) 분리. 병합 안 함.
- **A2 — decisions·결과 reader 무변경**: 결과 SSOT 손 안 댐(무회귀가 이 방향의 핵심 이득). 인플라이트는 합성 레이어에서만 얹음.
- **A3 — queue 가 전 소스 트래커로 확장**: prod 뿐 아니라 로컬·봇 작업도 행을 남긴다(`source` 컬럼). 핸들러가 한 길로 status 기록.
- **A4 — 중복 행 방지 불변식**: prod 경로(워커 claim → 핸들러 재사용 owned=false → 워커 종결) vs 로컬/봇(핸들러 insert owned=true → 핸들러 종결). 이중 행·이중 종결 0(§3-4/§9 q2).
- **A5 — 핸들러 한 길 가정**: prod·로컬(·봇 경유 시 봇)이 `route.ts` 한 경로를 지나 status 를 남긴다(1-2.#7 정황). 봇 경유 여부 §9 q1 — 비경유면 봇 인플라이트만 graceful 미표시.
- **A6 — 로컬 라이브 SSE 무회귀**: 실행 경로 불변, queue status 부가만(G5/AC-7). PM 섞임 방지 격리 원칙(`concurrencyGate` 카운터만) 유지.
- **A7 — 끝까지 소비 불변식**: 워커가 SSE 를 done 전에 끊으면 분석·upsert·done 마킹이 안 일어남(PR#175 A6). 무변경.
- **A8 — BE LIVE 가정**: Supabase service role(`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) prod·로컬 설정. 미설정 시 fail-soft(AC-8).
- **A9 — SQL 수동 1회 실행 선행**: `source` 컬럼 alter. 미적용 시 fail-soft.
- **A10 — MVP 범위**: 단일 워커·N=3·과설계 금지. 분산 락·retention·글로벌 안전밸브는 후속.

---

## 7. 참고 (인접 파일 · 문서)

- `lib/server/ai/queueStore.ts` — `source` 인자·`startProcessing`(재사용/신규·owned) 확장 대상(본 PRD 핵심).
- `app/api/stock/ai-analysis/route.ts`(412 tryAcquire·799 upsert·960 release) — processing/done queue 기록 + 중복 방지 부가 지점.
- `app/api/stock/ai-analysis/enqueue/route.ts`·`scripts/analysisWorker.ts`(65 HTTP 호출·131 markDone) — prod 경로 정합(jobId·source body 추가, 종결 주체 단일화).
- `app/api/stock/ai-analysis/decisions/route.ts`·`lib/types/stock/aiAnalysisDecisions.ts` — 두 테이블 합성 BFF + 인플라이트 옵셔널 필드.
- `components/analyze/AIDecisionListContainer.tsx`·`AIDecisionCard.tsx`(96 verdict 참조) — 인플라이트 배지·플레이스홀더(결과 카드와 분리).
- `hooks/stock/useQueryAIDecisions.ts`·`hooks/query/queryKeys.ts`(43 aiDecisions·47 workerStatus) — 폴링 정책(#176 패턴 일반화).
- `docs/sql/ai-analysis-queue.sql` — `source` 멱등 alter(`requested_by` 선례). **`docs/sql/ai-analysis-decisions.sql` 은 무변경.**
- `lib/server/ai/decisionStore.ts`·`lib/server/scorecard/backfillDecisions.ts` — **무변경 확인 대상**(결과 reader 안전).
- `docs/prd/analysis-request-queue.md`(PR#175)·HANDOFF #175·#176 — 직접 상위 컨텍스트(Scope A·S7 뱃지·"다음 작업" 첫 항목).
- `docs/rules/frontend.md` — §3-5 UI 8개 절. MEMORY `cn/tailwind-merge fontSize`·`max-w-* spacing` 함정.

---

## 8. 영향 분석

### 8-1. 변경 라인 추정 · 커밋 분할 권고

| 영역 | 신규/수정 | 추정 규모 | 커밋 단위(권고) |
|---|---|---|---|
| `docs/sql/ai-analysis-queue.sql`(`source` 컬럼) | 수정 | ~15줄 | `chore(sql): queue source 컬럼` (브랜치 초반) |
| `lib/server/ai/queueStore.ts`(`source`·`startProcessing` 재사용/신규·owned) | 수정+신규 | ~90줄 | `feat(queue): 전 소스 작업 트래커` (재사용/신규 분기 테스트 동반) |
| `route.ts` processing/done queue 기록 + 중복 방지 배선 | 소수정 | ~50줄 | `feat(analyze): 핸들러 status 기록(한 길)` |
| `analysisWorker.ts`·`enqueue/route.ts` prod 경로 정합(jobId·source body·종결 단일화) | 소수정 | ~40줄 | `refactor(queue): prod 종결 주체 정합` |
| 합성 BFF + 응답 타입(인플라이트 옵셔널 필드) | 수정 | ~70줄 | `feat(analyze): 두 테이블 합성 BFF` |
| `/analyze` 인플라이트 카드·플레이스홀더·폴링·copy | 수정+신규 | ~170줄 | `feat(analyze): 인플라이트 카드 UX` (UX 산출물 후) |
| 테스트(startProcessing 분기·합성·플레이스홀더·fail-soft·격리 회귀) | 신규 | ~150줄 | 각 feat 동반 |

- **중복 방지 불변식(AC-3)은 queueStore `startProcessing` 단위 테스트 + prod 경로 정합과 한 흐름**으로 묶어, "prod 는 행 1건·종결 1회" 를 같은 리뷰 단위에서 고정.
- **단일 브랜치/PR 권고**(§8-3).

### 8-2. 회귀 위험

- **R1 (결과 reader 영향 — 두 테이블 유지로 대부분 소멸)** — decisions 스키마·`decision NOT NULL`·`AIDecisionCard.decision.verdict` 참조·`getLatestAIDecision`/`getAllAIDecisions`/`backfillDecisions` 를 **건드리지 않으므로** "병합 시 nullable reader 붕괴" 위험은 **원천 소멸**. 남는 건 합성 레이어가 인플라이트 옵셔널 필드를 얹을 때 **결과 카드 경로가 그대로 동작**하는지(플레이스홀더는 별도 컴포넌트로 분리해 verdict 참조 차단). **완화**: AC-5("decisionStore 무변경 + 결과 카드는 완료 결과 있을 때만 verdict 참조").
- **R2 (정렬 출렁임 — 소멸)** — done 결과 카드는 `updated_at` 그대로라 "status 전이마다 출렁임"이 없다(병합안의 위험이 사라짐). 인플라이트 카드 정렬만 결정하면 됨(요청 시각 기준, §9 q5/UX). **완화**: 인플라이트는 별 영역(상단 고정 or 요청순)으로 두고 완료는 기존 최신순 유지.
- **R3 (중복 행/이중 종결)** — prod 워커가 만든 행을 핸들러가 또 만들거나, 워커·핸들러가 둘 다 종결하면 queue 가 오염. **완화**: jobId/owned 로 prod=재사용·워커종결, 로컬/봇=핸들러insert·핸들러종결 분기(§3-4/AC-3) + 단위 테스트. **§9 q2 가 이 구분 방식을 확정해야 구현 가능.**
- **R4 (queue status 기록이 SSE 분석을 막음/지연)** — `startProcessing`/`markDone` PATCH 실패·지연이 스트림에 영향. **완화**: fail-soft(기존 패턴) + 기록 실패 무시(AC-8), fire-and-forget 검토.
- **R5 (PM 섞임 재발)** — queue 기록을 모듈 스코프 가변상태로 잘못 구현하면 격리 붕괴. **완화**: jobId/source/owned 는 요청 인자·지역 변수로만(모듈 스코프 0), `concurrencyGate` 카운터 불변식 유지(AC-7 격리 회귀 테스트).
- **R6 (봇 경유 가정 오류)** — 봇이 핸들러 비경유면 봇 인플라이트가 안 뜬다. **완화**: graceful degradation(prod·로컬 정상) + §9 q1 확정 후 봇 측 후속 티켓.
- **R7 (queue 행 전 소스 누적 — retention)** — 이제 로컬·봇 작업도 행을 남겨 queue 가 더 빨리 누적(done/failed 영구 잔류, 1-2.#9). **완화(v1)**: stuck 복구만(AC-10), 정리 정책은 §9 q5(사적 도구라 적체 관찰 후). 합성 BFF 는 active(pending/processing)만 인플라이트로 읽어 done/failed 누적이 카드 성능에 영향 적음.
- **R8 (세마포어 vs status 기록 시점 정합)** — `startProcessing` 을 `tryAcquire` 전에 하면 429 거절된 호출도 processing 행을 만들 수 있음. **완화**: **`tryAcquire` 성공 직후에만** `startProcessing`(슬롯 못 잡으면 429 즉시 반환, 행 안 만듦) — §3-3 순서 고정.

### 8-3. PRD 분할 vs 단일

- **단일 브랜치/PR 권고.** 변경 표면은 (queue SQL·store + 핸들러 배선 + prod 경로 정합 + 합성 BFF + 카드 UX)로 넓지만 모두 "queue 를 전 소스 트래커로 + /analyze 합성" 한 흐름으로 응집한다. **decisions·결과 reader 무변경**이라 위험 표면이 병합안보다 작다. UI 변경이 기존 카드에 인플라이트 배지·플레이스홀더 추가로 제한적.
- **단, 디자이너 합류 필요**(§9 q6) — 플레이스홀더 카드·재분석 중 배지의 토스톤 시각은 디자인 결정이 낫다. DESIGN.md 필요 시 같은 브랜치 commit(한 브랜치 한 PR).
- **봇 측 queue 기록(핸들러 비경유 시)·retention 은 별도 후속**으로 분리(크로스 레포·운영 작업이라 경계가 커서 분할 정당).

### 8-4. 운영 액션 (HANDOFF / 최종 PR `## 다음 작업` 에 남길 것)

- **Supabase SQL Editor 에서 확장된 `docs/sql/ai-analysis-queue.sql` 수동 1회 실행**(`source` 컬럼). `requested_by` alter 선례.
- **§9 q1 봇 경유 여부 확정** 후 봇 인플라이트 커버리지 결정(필요 시 봇 레포 후속 티켓).
- **§9 q2 중복 방지 구분 방식 확정**(워커 jobId/source body 전달 안1 권고) — 구현 선행.
- 로컬 워커 상시 가동·`KIS_TOKEN_STORE=kv`·Supabase env 는 PR#175 운영 메모 그대로 유효.

---

## 9. OPEN QUESTION (사용자 결정 필요 — 각 항목 PM 권고 동봉)

- **[OPEN QUESTION] q1. 봇(`dev-manager-bot`) 실행 경로 — 프론트 핸들러 경유 여부(크로스 레포, 이 레포에서 확정 불가).**
  봇이 분석할 때 프론트 `/api/stock/ai-analysis` 핸들러를 HTTP 로 거치나, 봇 자체 분석 경로(핸들러 비경유)인가? 거치면 §3-3 핸들러 status 기록으로 **봇 작업이 `/analyze` 에 자동 트래킹**(`source:'bot'` 태깅, 이 레포 변경 0). 비경유면 봇 레포에서 queue 행 기록 필요(후속 티켓).
  - **PM 권고**: **세마포어 정황상 핸들러 경유 가능성이 높다**(전역 세마포어가 "브라우저·봇·워커 합산"을 한 프로세스 카운터로 캡한다고 PR#175 가 명시 — 봇 비경유면 그 합산 캡이 성립 안 함, 1-2.#7). v1 은 **핸들러 경유로 가정**하고 사용자가 봇 코드로 확인해주면 확정. 비경유면 봇 인플라이트만 graceful 미표시 + 봇 레포 후속 티켓(이 PRD 무수정).

- **[OPEN QUESTION] q2. [신규·핵심] 핸들러의 "prod-claimed vs 직접 호출" 중복 행 방지 구분 방식.**
  prod 경로는 워커가 이미 queue 행을 claim 했으니 핸들러가 또 만들면 안 된다(G4/AC-3). 핸들러가 둘을 어떻게 구분할지: (안1) **워커가 핸들러 호출 시 body 에 `jobId`(claim 한 행 id) + `source:'prod'` 전달** → 핸들러는 그 행 재사용·prod 태깅(owned=false), 종결도 워커 / (안2) **핸들러가 `findActiveByTicker` 로 active 행 존재 시 재사용, 없으면 신규**(소스는 헤더/플래그).
  - **PM 권고**: **안1(워커가 jobId·source 명시 전달).** 명시적이라 경합·오판이 없고, 종결 주체 단일화(prod=워커, 로컬/봇=핸들러)가 깔끔하다. 안2 는 동시 진입 시 active 판정 race 여지(단일 워커 전제라 작지만 불필요한 모호함). 워커 호출 body 에 `jobId`/`source:'prod'` 한 줄 추가(현재 `{ ticker, provider }` 만 보냄, 1-2.#6) — 변경 최소.

- **[OPEN QUESTION] q3. [신규] queue `source`/`origin` 컬럼(prod/local/bot) 추가 여부.**
  어느 출처 작업인지 카드·운영에서 구분하려면 소스 식별 컬럼이 유용. v1 에 넣을지, 인플라이트 표시엔 status 만으로 충분한지.
  - **PM 권고**: **추가 권장(`source text default 'prod'`).** 카드에 출처 배지(예: "봇 요청")를 달거나 retention·디버깅에 유용하고, 멱등 alter 한 줄(default 'prod' 로 기존 무손실)이라 비용이 작다. 인플라이트 표시 자체는 status 로 충분하지만 소스 구분은 운영 가치가 있어 선제 도입 권고. (안 넣으면 봇/로컬/prod 인플라이트가 시각적으로 구분 안 됨 — 카드 출처 배지 포기.)

- **[OPEN QUESTION] q4. 실패/중지 시 queue 행 정리 정책.**
  분석이 PM 도달 전 실패(timeout·cli-error)하거나 사용자가 중지(AbortError)하면 직접 실행(로컬/봇, owned=true) 행 status 를 어떻게 둘지: `failed`(error 동봉) vs 정리. 사용자 중지는 실패가 아님(현재 로그 info "중지").
  - **PM 권고**: **PM 미도달 실패 = `markFailed`(error 사유)**, 카드엔 active 가 아니므로 인플라이트에서 사라짐(완료 결과가 따로 있으면 그 결과 카드 유지). **사용자 중지(AbortError) = failed 아님** — 직접 실행 행은 `markDone` 대신 정리(또는 미종결 후 stuck 복구 위임). prod 경로는 워커가 기존 `markFailed` 판정(현행). v1 카드에 failed 노출 여부는 §9 q6 와 함께(최소 표시 또는 숨김 — PR#175 "S9 decision-failed" 후속과 정합).

- **[OPEN QUESTION] q5. retention 정책 — queue 가 전 소스 작업으로 더 빨리 누적.**
  이제 prod 뿐 아니라 로컬·봇 작업까지 done/failed 행이 영구 누적(1-2.#9, R7). 정리 잡을 v1 에 둘지.
  - **PM 권고**: **v1 미정리 + stuck 복구만**(AC-10). 합성 BFF 는 active(pending/processing)만 인플라이트로 읽어 done/failed 누적이 카드 성능·정확성에 영향이 작다. 정기 정리(예: done/failed 30일 경과 삭제)는 적체 관찰 후 후속(사적 도구). (병합안 대비 누적 속도가 빨라지는 유일한 트레이드오프지만 active-only 조회로 흡수.)

- **[OPEN QUESTION] q6. 인플라이트/플레이스홀더 카드 UX + 디자이너 합류 여부 + 폴링.**
  플레이스홀더 카드(완료 결과 없음)의 시각(스켈레톤 + `분석 중`/`대기 중` 배지 + 스피너?), 재분석 중 카드 배지 톤, 폴링 주기(인플라이트 있을 때만 ~15s).
  - **PM 권고**: **UX/UI 디자이너 가벼운 합류 권장.** 플레이스홀더는 기존 `skeleton`/`card` 합성 클래스 + #176 워커 뱃지 톤 재사용으로 신규 토큰 0 가능하나, "재분석 중 이전 결과 + 진행 배지" 조합은 토스톤 판단이 낫다. DESIGN.md 필요 시 같은 브랜치 commit. 문구는 #176 카피(`분석 중`/`대기 N건`/`분석 서버 꺼짐`)와 일관. 폴링은 active 항목 있을 때만(AC-9).

- **[OPEN QUESTION] q7. 인증(`requested_by` per-user 상한) 분리 — PR#175 와 동일 정책 유지 여부.**
  prod enqueue 무인(누구나 요청). 인증·소유권·per-user 상한을 별도 후속으로.
  - **PM 권고**: **PR#175 와 동일하게 별도 후속 티켓**(queue 에 `requested_by` 자리 이미 있음, 동작 ticker 단위). 배포 주소 본격 공유 직전 인증 PRD 착수. 두 테이블 유지라 이 부분은 PR#175 와 동일하게 흘러간다.
