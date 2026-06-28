# PRD — analysis-request-queue (prod에서 AI 분석 "요청" → Supabase 큐 → 로컬 워커 처리)

- **slug**: `analysis-request-queue`
- **작성일**: 2026-06-29
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **대상 브랜치**: `feature/analysis-request-queue`
- **UI 포함 여부**: **yes** — prod 분석 카드의 "요청 접수/대기/오프라인 경고" 상태 UI(토스톤). 단 prod 카드 한정 비교적 가벼운 변경. (로컬 라이브 스트림 UI는 무회귀.)
- **상위 컨텍스트**:
  - `ai-decision-upsert`(종목 PK upsert로 PM 결론 공유 저장) — 본 PRD가 그대로 의존(워커가 기존 핸들러를 끝까지 구동하면 동일 경로로 저장됨).
  - `concurrent-ai-analysis`(PR#163 · 종목별 슬롯 동시 최대 3건, **클라이언트 React state 캡**) — 본 PRD에서 **서버사이드 세마포어로 전역 캡**을 보강.
  - `flow-cron-fix`(#132 · Vercel Hobby 예약 cron 미발화 → GitHub Actions 외부 트리거) — "prod에서 무거운 셸 실행은 불가"라는 동일 제약의 다른 사례. 본 PRD는 **실행을 로컬 워커로 외부화**해 우회.
  - `kis-token-store`(Upstash KV `KIS_TOKEN_STORE=kv` 라이브) — 하트비트 저장에 같은 KV 패턴 재사용.

---

## 1. 배경 / 문제

AI 멀티에이전트 종합분석은 로컬 CLI(`claude`/`codex`)를 **셸로 spawn** 해 구동한다. 그래서:

- **로컬(`next dev`)에서만** 실행 가능하다. Vercel(prod) 서버리스에는 그 바이너리가 없다.
- prod에서 분석을 시도하면 `app/api/stock/ai-analysis/route.ts:401`의 `isVercelEnv()` 가드가 **503**으로 차단한다.

결과적으로 **배포 주소를 다른 사람에게 공유해도 그 사람은 새 종목 분석을 시작할 수 없다**(저장된 이전 결론 열람만 가능). 사용자가 직접 로컬을 띄워야만 분석이 돈다.

본 PRD의 목표는 **prod 배포 주소에서도 분석을 "요청"할 수 있게** 하는 것이다. 단 전제는 그대로 유지된다 — **실제 실행은 로컬이 켜져 있을 때만** 일어난다. prod는 실시간 진행 스트림을 받지 못하고, **"요청 접수 → 잠시 후 결과 확인"** 비동기 모델로 동작한다.

### 1-1. 해결 방식 — Supabase를 큐 중계소로

```text
[prod 브라우저] AI 분석(재분석) 클릭
   → enqueue BFF (Vercel 가드 없음, Supabase INSERT만)
   → ai_analysis_queue: row(status=pending, ticker)
                                  ⤵ (큐 내구성 — 로컬 꺼져 있어도 적재 유지)
[로컬 독립 워커] 10~15초 폴링
   → pending 발견 → claim(processing) → 기존 분석 핸들러(SSE) 구동
   → SSE를 done까지 끝까지 소비 ⇒ 기존 upsertAIDecision이 서버사이드에서 자동 저장
   → row(status=done)
   → 폴링마다 KV에 하트비트(ts·status·queueDepth)
[prod 요청자] 몇 분 뒤 /analyze 재방문 → 저장된 결론 확인
```

핵심은 **prod는 INSERT만, 실행·저장은 전부 기존 로컬 경로 그대로**라는 점이다. 새 분석 로직을 만들지 않는다.

### 1-2. 현재 구조 — 코드 추적 결과 (확정 사실, 읽기 전용 조사)

| # | 사실 | 근거 위치 |
|---|---|---|
| 1 | prod/로컬 분기 SSOT = `isVercelEnv()`. 광범위 사용 중 | `lib/server/env.ts:9` |
| 2 | 분석 실행 핸들러는 prod에서 503 가드 | `app/api/stock/ai-analysis/route.ts:401` |
| 3 | 핸들러는 내부에서 KIS 시세·수급·캔들 등 **전부 런타임 페치**(요청 body에 무거운 스냅샷 불요) | 동 route 핸들러 본문 |
| 4 | **PM 결과는 서버사이드에서 Supabase에 저장**(`upsertAIDecision`). 클라이언트 관여 0 | `app/api/stock/ai-analysis/route.ts:772` |
| 5 | 핸들러는 SSE 스트림. `timeoutController = AbortController`에 묶여, **중간에 끊으면 분석 중단** → 워커는 `{type:'done'}`까지 **끝까지 소비**해야 저장이 일어남 | `route.ts:519`(AbortController)·`543`(ReadableStream)·`890/898/918`(`done`) |
| 6 | 저장소 연결 패턴 = `upsertAIDecision`/`getLatestAIDecision`/`getAllAIDecisions`(Supabase REST, service role) — 큐 store도 이 패턴 재사용 | `lib/server/ai/decisionStore.ts:62/103/138` |
| 7 | spawn 없이 PATH에서 claude/codex 설치 감지 = `binaryAvailable`/`detectProviders` | `lib/server/ai/detectCli.ts:34/55` |
| 8 | KV(Upstash) 패턴 = `KisStore` 인터페이스(`get/set/del` + TTL초 인자). `KIS_TOKEN_STORE=kv` 라이브, 로컬은 `MemoryKisStore` 폴백 | `lib/api/kis/store.ts:52~`(`set(key,value,ttlSec)`) |
| 9 | **동시 3건 캡(`MAX_CONCURRENT_ANALYSES=3`)이 클라이언트 React state에만 존재.** route handler에 서버사이드 동시성 제어 **0건** | `hooks/stock/aiAnalysisProvider.tsx:49/619` |

### 1-3. 1-2.#9에서 드러난 숨은 위험 (본 PRD가 부수적으로 해소)

캡이 브라우저 탭별·봇별로 **독립**이다. 탭 3건 + 다른 탭 3건 + 봇 → 합산 6+ 동시 실행이 가능하다(서버는 막지 않음). claude/codex 셸을 6+ 동시 spawn하면 로컬 리소스·요금 폭주 위험. 본 PRD의 **서버사이드 세마포어(전역 캡 N=3)**가 이 구멍을 닫는다.

---

## 2. 목표 (측정 가능)

- **G1 (prod 요청 가능)**: prod 배포 주소에서 재분석을 클릭하면 503이 아니라 `ai_analysis_queue`에 pending 1행이 적재되고 "접수" UI가 뜬다.
- **G2 (로컬 워커 자동 드레인)**: 로컬 워커가 켜져 있으면 pending이 N초 내 picked up되어 기존 핸들러로 실행, **기존 경로 그대로 Supabase에 결론 저장**된다(새 저장 로직 0).
- **G3 (전역 동시성 캡)**: 브라우저·봇·워커 등 **모든 출처 합산** 동시 실행이 전역 N=3을 넘지 않는다(서버사이드 세마포어). over-cap 호출은 429/busy로 거절된다.
- **G4 (오프라인 내구성)**: 로컬 워커가 꺼져 있어도 요청은 **정상 적재**되고, 사용자에게 "지금 분석 서버가 꺼져 있어요. 켜지면 자동 처리돼요" 경고가 함께 노출된다. 로컬이 켜지면 자동 드레인된다.
- **G5 (중복 방지)**: 같은 ticker가 이미 pending/processing이면 추가 적재 0, "이미 분석 중이에요" 안내.
- **G6 (무회귀)**: 로컬 브라우저·봇의 기존 실시간 스트림 경로는 그대로 동작한다(Scope A는 prod 요청만 큐로). PM 섞임 방지 원칙(요청 격리) 유지.

---

## 3. 범위 (In scope — Scope A / v1)

### 3-1. enqueue 엔드포인트 (신규, prod 동작)
- `app/api/stock/ai-analysis/enqueue/route.ts` (POST) — **`isVercelEnv()` 가드 없음**(Supabase INSERT만 하므로 prod에서 동작).
  1. body: `{ ticker, force? }`. ticker는 `lib/validation/`로 사전 차단(기존 검증 재사용).
  2. **중복 가드**: 같은 ticker가 pending/processing이면 INSERT 안 하고 `{ status:'already', ... }` 반환(G5).
  3. INSERT `ai_analysis_queue(ticker, status='pending', force, created_at)`.
  4. enqueue 직후 worker-status를 함께 판정해, **오프라인이면 응답에 `workerOffline:true`** 플래그를 실어 보낸다(UI 경고용, G4).
- BFF만 Supabase에 접근(클라이언트는 service role 미접근 — `ai-decision-upsert` 패턴 동일).

### 3-2. worker-status 엔드포인트 (신규, prod 동작)
- `app/api/stock/ai-analysis/worker-status/route.ts` (GET) — KV에서 하트비트 key를 읽어 온라인/오프라인 판정.
  - key 신선(TTL 내) → `{ online:true, status:'idle'|'busy', queueDepth }`.
  - key 만료/부재 → `{ online:false }`.
- prod·로컬 공통 동작(읽기만 하므로 가드 불요). 단 v1 UI 소비는 prod 카드 한정(3-6).

### 3-3. 큐 store (Supabase REST, 기존 패턴 재사용)
- `lib/server/ai/queueStore.ts` — `decisionStore.ts`와 동일 service role REST 연결.
  - `enqueueAnalysis({ ticker, force })` — 중복 가드 + INSERT.
  - `claimNextPending(workerId)` — `pending→processing` 전이(worker_id·claimed_at 세팅). 단순 select-then-update(v1; 경합은 4-4 참고).
  - `markDone(id)` / `markFailed(id, error)`.
  - `findActiveByTicker(ticker)` — pending/processing 존재 여부(중복 가드용).
  - `recoverStuck(timeoutMs)` — processing에 timeoutMs 초과 잔류한 row를 pending 복구(또는 failed). 워커가 폴링 시 호출.
  - `getQueueDepth()` — pending 수(하트비트 value에 실어 보냄).
  - 미설정/오류 시 fail-soft(throw 대신 no-op/빈 결과) — `decisionStore` 패턴 동일.

### 3-4. 로컬 독립 워커 (신규 프로세스)
- `scripts/analysisWorker.mjs` (또는 `.ts` + 러너) — `next dev`와 **별개 프로세스**.
  - 폴링 루프(10~15초): `recoverStuck` → `claimNextPending` → 있으면 처리.
  - **provider 자동선택**: `detectProviders()`로 claude 우선, claude 없고 codex만 있으면 codex(prod엔 선택지 노출 0).
  - 처리 = 로컬 분석 핸들러를 HTTP로 호출(`http://localhost:<devport>/api/stock/ai-analysis`, SSE) **`{type:'done'}`까지 끝까지 소비**(끊으면 AbortController로 분석 중단되니 필수, 1-2.#5). done 소비 = 핸들러 내부 `upsertAIDecision` 자동 실행 = 저장 완료.
  - 처리 결과로 `markDone`/`markFailed`.
  - **하트비트**: 폴링마다 KV에 `analysis:worker:heartbeat` 기록 — value `{ ts, status:'idle'|'busy', queueDepth }`, TTL 45~60초(폴링 주기의 ~3~4배, KV `set(key,value,ttlSec)` 재사용). 하트비트 주체 = **워커**(실제 처리 가능 여부의 진짜 신호).
- `package.json` 스크립트:
  - `analyze:worker` — 워커 단독 기동.
  - `all` — dev 서버 + 워커 동시 기동(현재 `concurrently`/`npm-run-all` 미설치 → devDep 추가 필요, §8).

### 3-5. 서버사이드 세마포어 (전역 동시성 캡, v1 포함)
- `lib/server/ai/concurrencyGate.ts` — 실행이 실제 일어나는 route handler 프로세스(`next dev` 단일 프로세스)에 **순수 카운터 세마포어**.
  - `tryAcquire(): boolean`(현재 카운트 < N=3이면 +1 후 true, 아니면 false)·`release()`.
  - 분석 핸들러(`route.ts`) 진입 직후 `tryAcquire`, SSE close/abort/finally에서 반드시 `release`. over-cap이면 **429/busy** 반환.
  - **⚠️ 순수 카운터만.** 요청 데이터(state/runId/decision/ticker 등)를 모듈 스코프에 **절대** 담지 않는다 — 기존 "module-level 가변상태 0 = 요청 격리·PM 섞임 방지" 원칙(`concurrent-ai-analysis` 조사 결론) 유지.
  - over-cap 응답을 받으면: **워커**는 다음 폴링까지 대기(row는 pending 유지/복구), **봇**은 기존 "잠시 후" 동작, **브라우저**는 기존 limitNotice 흐름. (정확한 호출자별 문구·전이는 §9 q1.)

### 3-6. prod 요청 UX (UI, prod 카드 한정)
- prod 분석 카드(컴포넌트 `components/workbench/`(또는 해당 도메인) — 정확 위치는 UX 단계)에서:
  - **신선도 재사용**(기존 동작 거의 그대로): 이전 결론이 있으면 **며칠 전이든 우선 그 결과를 먼저** 보여줌. 마지막 분석 30분 이내 → 재분석 UI 숨김. 신선도 낮아짐 → 재분석 UI(스위치) 노출. **사용자가 재분석을 명시할 때만** enqueue.
  - 클릭 시: **접수 확인 + 예상 대기 안내**. `workerOffline:true`면 G4 경고를 함께.
  - **실시간 진행 스트림 없음**(prod). "몇 분 뒤 다시 방문" 안내.
  - 이미 활성(중복)이면 "이미 분석 중이에요" 안내(G5).
- 모든 신규 사용자 노출 문구는 한글, `lib/copy/<domain>/`에 둔다(카피 인라인 금지).
- 코드 컨벤션 준수: enqueue/worker-status 페칭은 도메인 훅(`hooks/<domain>/use*`) → `hooks/query/useMutation*`/`useQuery*` 경유, 컴포넌트는 TanStack Query 직접 import 금지. query key는 `queryKeys.ts` 단일 위치. 상태 표시 분기는 Tailwind prefix 우선, JS 분기는 `useBreakpoint`.

### 3-7. SQL (수동 1회 실행)
- `docs/sql/ai-analysis-queue.sql` — `ai_analysis_queue` 생성 SQL. **Supabase SQL Editor에서 수동 1회 실행 필요**(기존 `ai_agent_usage`·`ai_analysis_decisions` 패턴 동일, §8·HANDOFF에 명시).

---

## 4. 비범위 (Out of scope — FOLLOWUPS)

본 v1(Scope A)이 **명시적으로 하지 않는** 것:

- **Scope B — 통합 jobs 테이블(`ai_analysis_jobs`)을 현황 SSOT로**: prod·로컬 어디서나 일관 status 뱃지, 로컬 3건 초과분도 큐로 순차, 봇 오버플로도 큐(크로스 레포). v1은 **prod 요청만** 큐로, 로컬 브라우저·봇은 지금처럼 핸들러 직접 호출(실시간 스트림 유지). Scope B는 경계만 §9 q4에 기록.
- **봇 레포(`dev-manager-bot`) 변경**: 이번 범위는 프론트엔드 레포만. 봇 오버플로 큐잉은 Scope B.
- **실시간 진행 스트림(prod)**: prod는 비동기 접수 모델. SSE를 prod로 끌어오지 않는다.
- **완료 알림(Slack 핑 등)**: 요청자가 재방문해 확인. 푸시 알림은 후속(§9 q6).
- **인증(Google 로그인 + 승인제 + `requested_by` + per-user pending 상한)**: 사용자 식별 불가라 per-user 상한은 v1 범위 밖. 별도 후속 티켓(§9 q5). 본 PRD는 **의존만 명시**(테이블에 `requested_by` 자리만 비워둠).
- **전체 큐 깊이 글로벌 안전밸브**: 사적 도구라 v1 미도입 권고(§9 q3).
- **워커 다중 인스턴스 합의(분산 락)**: v1은 단일 로컬 워커 가정. `claimNextPending` 경합은 단일 워커 전제로 단순화(§9 q1 주변).

---

## 5. 수용 기준 (AC — QA가 테스트 항목으로 직변환 가능)

> 실행 검증 보조 명령: `npm run typecheck` · `npm run lint` · `npm run test` · `npm run build` 0 에러. enqueue/worker-status/queueStore/concurrencyGate 단위 테스트(미설정 fail-soft·중복 가드·세마포어 acquire/release 포함).

### AC-1 (prod enqueue — 503 아님)
prod 환경에서 `POST /api/stock/ai-analysis/enqueue { ticker }` → 503이 아니라 `ai_analysis_queue`에 `status='pending'` 1행 INSERT, `{ status:'queued' }` 반환. (`isVercelEnv()` 가드 없음 — `grep -n "isVercelEnv" app/api/stock/ai-analysis/enqueue/route.ts` → 0건.)

### AC-2 (실행 핸들러 가드 유지)
`app/api/stock/ai-analysis/route.ts`의 prod 503 가드는 **그대로** 유지된다(`route.ts:401` 변경 없음). 즉 prod에서 실제 실행 경로는 여전히 차단.

### AC-3 (워커 드레인 — 끝까지 소비 → 저장)
로컬 워커 기동 + pending 존재 → N초 내 `claimNextPending`으로 processing 전이, 핸들러 SSE를 `{type:'done'}`까지 소비, **기존 `upsertAIDecision` 경로로 결론이 Supabase에 저장**되고 row `status='done'`. (중간에 끊지 않음 = AbortController 중단 0.)

### AC-4 (중복 방지)
같은 ticker가 pending/processing인 상태에서 enqueue 재호출 → INSERT 0, `{ status:'already' }` 반환. UI "이미 분석 중이에요" 안내.

### AC-5 (오프라인 — 접수 + 경고)
워커 미기동(하트비트 만료/부재) 상태에서 enqueue → **row는 정상 pending 적재**되고, 응답 `workerOffline:true`, UI에 "지금 분석 서버가 꺼져 있어요. 켜지면 자동 처리돼요" 경고. 이후 워커 기동 시 자동 드레인되어 done. (큐 내구성.)

### AC-6 (worker-status 판정)
하트비트 신선(TTL 내) → `GET /worker-status` `{ online:true, status, queueDepth }`. 하트비트 만료/부재 → `{ online:false }`.

### AC-7 (전역 세마포어 — over-cap 거절)
동시 실행 카운트가 N=3에 도달한 상태에서 추가 분석 핸들러 진입 → 4번째는 **429/busy** 반환(실행 시작 안 함). 카운트가 release로 빠지면 다음 호출 acquire 성공.

### AC-8 (세마포어 — 상태 누출 0 / 격리)
`concurrencyGate.ts`는 **순수 카운터만** 보유(요청 데이터 0). 동시 2건 이상 분석해도 PM 결과 섞임 0(`concurrent-ai-analysis` 격리 회귀 테스트 재실행 통과). `grep` 상 모듈 스코프에 ticker/runId/decision 등 요청 데이터 보관 0건.

### AC-9 (provider 자동선택)
prod 요청에는 provider 선택지 노출 0. 워커는 `detectProviders()`로 claude 있으면 claude, claude 없고 codex만 있으면 codex 자동 선택. 둘 다 없으면 `markFailed` + 하트비트 status로 표면화.

### AC-10 (stuck 복구)
processing에 stuck-timeout(예: 20분, §9 q2) 초과 잔류 row → 폴링 시 `recoverStuck`로 pending 복구(또는 failed). 다음 폴링에서 재클레임 가능.

### AC-11 (fail-soft / 무회귀)
Supabase·KV 미설정/오류 → enqueue·worker-status·하트비트 모두 throw 대신 fail-soft(빈 결과/no-op). **로컬 브라우저·봇의 기존 실시간 스트림 경로 무회귀**(Scope A는 prod 요청만 큐로). 화면 무회귀(로컬 라이브 UI 그대로).

### AC-12 (SQL·운영)
`docs/sql/ai-analysis-queue.sql` 존재. 테이블 미생성 시 enqueue가 fail-soft로 막히고 명확한 안내(분석 흐름은 무너지지 않음). README/`.env.example`에 워커·KV 운영 메모.

---

## 6. 가정 · 제약

- **A1 — "로컬이 켜져 있어야 실제 실행"은 v1 전제 유지.** prod는 요청 접수까지만 보장, 실행은 로컬 워커 가동에 의존.
- **A2 — BE LIVE 가정**: Supabase service role(`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) + Upstash KV(`KIS_TOKEN_STORE=kv`)가 prod·로컬 양쪽 설정돼 있음. 미설정 시 fail-soft(AC-11/12).
- **A3 — 단일 로컬 워커 가정**: v1은 워커 인스턴스 1개. 다중 워커 분산 락은 비범위.
- **A4 — BFF 패턴 유지**: 클라이언트는 Supabase/KV 직접 접근 0. enqueue/worker-status BFF만 호출.
- **A5 — 모듈 스코프 가변상태 0 원칙 유지**: 세마포어는 카운터만(AC-8). 이 원칙을 깨면 PM 섞임 회귀(과거 조사 결론).
- **A6 — 끝까지 소비 필수**: 워커가 SSE를 done 전에 끊으면 AbortController로 분석·저장이 중단됨(1-2.#5). 워커 구현의 핵심 불변식.
- **A7 — 인증 선행 아님**: per-user 상한·`requested_by`는 인증 PRD 머지 후. 본 PRD는 자리만 비워두고 동작은 ticker 단위.

---

## 7. 참고 (인접 파일 · 문서)

- `lib/server/env.ts`(`isVercelEnv`) · `app/api/stock/ai-analysis/route.ts`(401 가드·519 AbortController·772 upsert·890/918 done) — 분기·실행·저장의 진실 위치.
- `lib/server/ai/decisionStore.ts` — 큐 store가 복제할 Supabase REST 연결 패턴.
- `lib/server/ai/detectCli.ts` — provider 자동선택.
- `lib/api/kis/store.ts`(`KisStore`·`set(key,value,ttlSec)`) — 하트비트 KV.
- `hooks/stock/aiAnalysisProvider.tsx:49/619` — 기존 클라이언트 캡(세마포어로 보강할 대상).
- `docs/sql/ai-agent-usage.sql`·`ai-analysis-decisions.sql` — 수동 SQL 1회 실행 선례.
- `docs/prd/ai-decision-upsert.md`·`docs/prd/scorecard-backfill-decisions.md` — 양식·톤·fail-soft 서술 참고.
- `docs/rules/frontend.md` — FE 컨벤션 8개 절(본 PRD §3-6이 준수해야 함).

---

## 8. 영향 분석

### 8-1. 변경 라인 추정 · 커밋 분할 권고

| 영역 | 신규/수정 | 추정 규모 | 커밋 단위(권고) |
|---|---|---|---|
| `docs/sql/ai-analysis-queue.sql` | 신규 | ~40줄 | `chore(sql)` (브랜치 첫 commit 직후) |
| `lib/server/ai/queueStore.ts` | 신규 | ~150줄 | `feat(queue): queueStore` |
| `lib/server/ai/concurrencyGate.ts` + route.ts 배선 | 신규+소수정 | ~60줄 + route 진입/finally 수정 | `feat(queue): 전역 세마포어` (격리 테스트 동반) |
| `app/api/stock/ai-analysis/enqueue/route.ts` | 신규 | ~80줄 | `feat(queue): enqueue BFF` |
| `app/api/stock/ai-analysis/worker-status/route.ts` | 신규 | ~50줄 | `feat(queue): worker-status BFF` |
| `scripts/analysisWorker.mjs` + `package.json`(`analyze:worker`/`all` + devDep) | 신규 | ~180줄 | `feat(queue): 로컬 워커` |
| UI(도메인 훅·query·컴포넌트 상태·copy) | 신규+소수정 | ~200줄 | `feat(queue): prod 요청 UX` (UX 산출물 후) |
| 테스트(queueStore·gate·enqueue 중복가드·fail-soft) | 신규 | ~150줄 | 각 feat에 동반 |

- **세마포어 커밋은 격리 회귀 테스트(AC-8)와 한 commit**으로 묶어, "module-level 상태 0" 불변식이 같은 리뷰 단위에서 검증되게 한다.
- **devDep 추가**: 현재 `concurrently`/`npm-run-all`/`tsx`/`dotenv` 미설치. `npm run all`(dev+worker 동시 기동)과 `.mjs` 러너에 필요 → `package.json` devDependencies 추가가 §3-4에 수반된다(설치 PR로 분리하지 않고 같은 브랜치).

### 8-2. 회귀 위험

- **R1 (PM 섞임 재발)** — 세마포어에 요청 데이터를 담으면 격리 붕괴. **완화**: 순수 카운터 강제(AC-8) + 격리 회귀 테스트 동반 커밋.
- **R2 (저장 누락)** — 워커가 SSE를 done 전에 끊으면 AbortController로 분석·`upsertAIDecision`이 중단(1-2.#5). **완화**: done까지 소비 불변식(A6/AC-3) + 워커 단위 테스트.
- **R3 (stuck row 영구 점유)** — 워커가 processing 중 죽으면 그 ticker가 중복 가드에 걸려 영구 재요청 불가. **완화**: `recoverStuck` 타임아웃 복구(AC-10).
- **R4 (claim 경합)** — 단일 워커 전제라 v1 select-then-update로 충분. 다중 워커 시 race(같은 row 이중 claim) → Scope B/§9에서 원자적 claim(조건부 update) 검토.
- **R5 (enqueue 무가드 = 무인 요청 폭주)** — prod enqueue에 인증·per-user 상한이 없어 누구나 무제한 적재 가능. **완화(v1)**: ticker 중복 가드(G5)로 같은 종목 중복은 차단. 글로벌 깊이 밸브는 §9 q3(사적 도구라 미도입 권고).
- **R6 (Vercel Hobby cron 함정 재현 아님 명시)** — 본 PRD는 cron이 아니라 **상시 로컬 워커 폴링**이라 `flow-cron-fix`의 Hobby cron 미발화 문제와 무관. 하지만 워커가 안 켜져 있으면 동일하게 "처리 안 됨" → AC-5 경고로 사용자에게 가시화.

### 8-3. PRD 분할 vs 단일

- **단일 브랜치/PR 권고.** v1 표면은 넓지만(BFF 2 + store + gate + worker + UI), 모두 "큐 한 흐름"으로 응집하고 UI 변경이 prod 카드 상태 표시로 제한적이다. 디자이너 의존은 §3-6 한 화면 상태(접수/대기/오프라인 경고)로 작아 분할 트리거에 못 미친다.
- **Scope B는 별도 PRD**로 명시 분리(통합 jobs 테이블 + 크로스 레포 봇 변경 = 변경량·레포 경계가 커서 분할 정당). 전환 트리거는 §9 q4.

### 8-4. 운영 액션 (HANDOFF에 남길 것)

- **Supabase SQL Editor에서 `docs/sql/ai-analysis-queue.sql` 수동 1회 실행** (`ai_agent_usage` 선례).
- **로컬 워커 상시 가동** 필요(`npm run all` 또는 `npm run analyze:worker`). 안 켜면 prod 요청은 적재만 되고 대기.
- prod·로컬 양쪽 `KIS_TOKEN_STORE=kv` + Supabase service role env 확인.

---

## 9. OPEN QUESTION (사용자 결정 필요 — 각 항목 PM 권고 동봉)

- **[OPEN QUESTION] q1. 세마포어 over-cap 시 prod 외 호출자(특히 봇)의 정확한 응답 처리.**
  4번째 동시 실행을 429/busy로 거절할 때, 봇은 어떤 문구/동작으로 처리할지(즉시 "잠시 후" vs 자체 재시도 백오프), 워커는 row를 pending 유지로 둘지(현재 안) vs 별도 `deferred` 상태로 둘지.
  - **PM 권고**: v1은 **워커=row pending 유지(다음 폴링 재시도), 봇=기존 "잠시 후" 메시지** 그대로. 봇 레포는 안 건드린다는 범위 원칙상 봇 측 백오프 변경은 Scope B로. busy 응답 형태만 표준 JSON(`{ error:'busy', retryable:true }`)으로 통일.

- **[OPEN QUESTION] q2. stuck 복구 타임아웃 값과 failed 후 재시도 정책.**
  processing 잔류 몇 분을 stuck으로 볼지(예: 20분), 복구 시 pending 재투입 vs failed 종결, failed row의 자동 재시도 횟수.
  - **PM 권고**: 분석 1건 길어야 수 분이므로 **stuck-timeout=20분**(여유). 복구는 **pending 재투입 1회**, 2회째도 stuck이면 **failed 종결**(무한 루프 방지). failed는 자동 재시도 0 — 사용자가 재방문해 다시 요청하면 새 row.

- **[OPEN QUESTION] q3. 전체 큐 깊이 글로벌 안전밸브(글로벌 상한)를 v1에 둘지.**
  pending이 무한정 쌓이는 걸 막는 글로벌 상한(예: pending 50 초과 시 enqueue 거절)을 v1에 넣을지.
  - **PM 권고**: **v1 미도입.** 사적 도구 + ticker 중복 가드로 같은 종목 폭주는 이미 차단됨. 운영하며 실제 적체가 관찰되면 그때 상한 추가(인증 PRD와 함께 per-user 상한으로 흡수하는 게 더 자연스러움).

- **[OPEN QUESTION] q4. Scope B(통합 `ai_analysis_jobs` 테이블) 전환 트리거 조건.**
  언제 prod·로컬·봇을 한 jobs 테이블로 통합할지.
  - **PM 권고**: 트리거 = **(a) 로컬 브라우저/봇 동시 요청이 3건 캡에 자주 걸려 순차 큐가 필요해질 때, 또는 (b) "어디서 요청하든 일관된 진행 뱃지"가 사용자 요구로 올라올 때.** 둘 중 하나라도 발생하면 Scope B PRD 착수. v1은 prod-only 큐로 의도적으로 작게 시작.

- **[OPEN QUESTION] q5. 인증(Google 로그인 + 승인제 + `requested_by` + per-user pending 상한)을 별도 후속 티켓으로 분리.**
  prod enqueue가 현재 무인(누구나 요청). 인증·승인·소유권·per-user 상한을 언제 별도 PRD로 뗄지.
  - **PM 권고**: **별도 후속 티켓으로 분리(본 PRD는 의존만 명시).** `ai_analysis_queue.requested_by` 컬럼 자리만 nullable로 미리 비워두고, v1은 ticker 단위로만 동작. 배포 주소를 외부에 본격 공유하기 직전이 인증 PRD 착수 시점.

- **[OPEN QUESTION] q6. 완료 알림(Slack 핑 등)을 둘지.**
  요청자가 재방문 없이도 "분석 끝났어요"를 받을지.
  - **PM 권고**: **후속.** v1은 "몇 분 뒤 재방문" 모델로 충분. Slack 핑은 봇 레포 연동(크로스 레포)이라 Scope B/봇 PRD와 함께 묶는 게 비용 효율적.
