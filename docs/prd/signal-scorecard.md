# PRD — signal-scorecard (AI 판정 채점·적중률 집계 backbone, phase-1)

- **slug**: `signal-scorecard`
- **작성일**: 2026-06-19
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **대상 브랜치**: `feature/signal-scorecard`
- **UI 포함 여부**: **yes (최소 — 내부 운영자 등급)** — 적중률 표 1개 + 간이 필터. 토스톤 디자인 폴리시 불요(디자이너 합류 트리거 아님, §9 q6). 공개용 화려한 대시보드는 phase-2.
- **상위 컨텍스트**: `ai-decision-upsert`(#PR `ai_analysis_decisions` 도입) · `ai-decision-confidence`(`signal` 컬럼 = `DecisionSignal` 추가) · `investor-flow-cumulative`(cron 적립 패턴 원형) 후속.

---

## 1. 배경 / 문제

FinSight 는 멀티에이전트 분석으로 종목별 AI 최종 판정(`FinalDecision`: verdict BUY/SELL/HOLD 계열 6단계 + `confidence` HIGH/MEDIUM/LOW + `target_pct`/`stop_loss_pct`)을 대량 생성한다. 하지만 **그 판정이 실제로 맞았는지 채점·집계하는 루프가 전혀 없다.** 분석은 만들고 버려진다.

운영자(1인 MVP) 입장의 1차 목적은 **자가점검(self-audit)** 이다 — 어떤 신호 방향·확신도·결정론 신호 강도·근거가 실제로 적중하는지 내부적으로 측정해 신호 품질을 개선하는 것. 화려한 공개 대시보드·푸시 브리핑은 후속 단계이며, 이번 phase-1 은 **측정 backbone**(원장 보강 → 채점 cron → 집계)에만 집중한다.

### 1-1. 현재 구조 — 코드 추적 결과 (확정 사실, 읽기 전용 조사)

| # | 사실 | 근거 위치 |
|---|---|---|
| 1 | 결정 저장소 = Supabase `ai_analysis_decisions`. 컬럼: `ticker`(PK)·`provider`·`decision`(jsonb)·`sentiment`(jsonb)·`signal`(jsonb)·`updated_at`. **ticker PK upsert — 종목당 최신 1건만, history 없음** | `docs/sql/ai-analysis-decisions.sql`, `lib/server/ai/decisionStore.ts` |
| 2 | `decision`(FinalDecision)에 `verdict`·`confidence`·`target_pct`(현재가 대비 목표 %)·`stop_loss_pct`(항상 음수 %)·`time_horizon` 포함. **목표가/손절가는 절대가가 아니라 % 형태**(현재가 기준 상대값) | `lib/types/stock/aiAnalysis.ts::FinalDecision` |
| 3 | `signal`(DecisionSignal)에 `score`(0~100)·`action`(BUY/HOLD/SELL)·`confidence`(0~1)·`regime`·`axes`·`asOf`(평가 기준 봉 날짜 YYYY-MM-DD) 포함. **결정시점 종가(close)는 미보존** | `lib/types/stock/aiAnalysis.ts::DecisionSignal`, `app/api/stock/ai-analysis/route.ts::toDecisionSignal` |
| 4 | 분석 시점 라이브 현재가(`priceData.price`)·캔들은 route.ts 클로저에 **존재하지만 row 에 저장 안 됨**. `target_pct`/`stop_loss_pct` 도 % 라 결정시점 절대가 없으면 적중 판정 불가 | `route.ts` L510-517(priceData), L612-618(upsert) |
| 5 | 일봉은 `fetchDailyChunked(ticker, fromYmd, toYmd)` 로 임의 날짜 구간 조회 가능 → **+1d/+1w/+1m 시점 종가 사후 취득 가능** | `lib/api/kis/chartChunked.ts` |
| 6 | 기존 cron = `app/api/cron/flow-snapshot`. 인증 `Authorization: Bearer ${CRON_SECRET}`(미일치 401), KIS prod+설정 게이트, 휴장/실패는 fail-soft 200. 스케줄 `vercel.json` `"10 7 * * 1-5"`(UTC 07:10 = KST 16:10, 평일) | `app/api/cron/flow-snapshot/route.ts`, `vercel.json` |
| 7 | KIS 일봉 조회는 **prod 환경 + KIS 설정** 게이트(`isKisConfigured` && `resolveKisEnv()==="prod"`). 비-prod·미설정은 mock/skip | `app/api/stock/daily/route.ts`, `flow-snapshot/route.ts` |
| 8 | 결정 목록 BFF = `GET /api/stock/ai-analysis/decisions`(읽기 전용, Vercel 가드 없음 → prod 에서도 동작). 단건 = `GET .../decision?ticker=` | `app/api/stock/ai-analysis/decisions/route.ts`, `.../decision/route.ts` |
| 9 | 백테스트엔 Triple Barrier 라벨러(`lib/signal/backtest/label.ts`)가 이미 존재 — 익절/손절/시간만료 경로의존 라벨. 채점 규칙 설계의 참고 자산 | `lib/signal/backtest/label.ts` |

### 1-2. 핵심 제약 (이 PRD 설계를 좌우)

- **C1 — 결정시점 가격 미보존**: 현재 어떤 결정 행도 "그때 가격"을 갖고 있지 않다. 가격 없이는 사후 채점이 불가능하다 → **원장에 결정시점 종가(+기준 봉 날짜)를 신규 보존**해야 한다. (§3-1)
- **C2 — 과거 결정은 채점 불가**: 위 C1 때문에 PRD 적용 이전 저장된 결정 행은 결정시점 가격이 없어 **소급 채점 불가**. **PRD 적용 시점 이후 새로 생성되는 결정부터만 채점**한다(백필 없음). (§6 마이그레이션 주의)
- **C3 — `ai_analysis_decisions` 는 ticker PK upsert(history 없음)**: 같은 종목을 재분석하면 직전 결정이 덮어써진다. 채점은 "그 시점에 내린 판정 1건"을 시간 경과 후 평가하는 작업이라 **덮어써지면 안 되는 append 원장이 필요**하다 → **별도 채점 원장 테이블 신설**(기존 결정 테이블에 horizon 상태를 매달 수 없음). (§3-1, §9 q1)
- **C4 — 채점 cron 은 KIS prod 일봉이 필요**: 채점 시점 종가 취득은 KIS(prod) 의존. 비-prod·미설정에선 채점 skip(fail-soft). 분석 실행 자체는 로컬 전용이지만 **채점 cron 은 prod 에서 도는 게 정상 경로**. (§6)
- **C5 — Vercel Hobby cron 1일 1회 제한**: 기존 `flow-snapshot` 이 이미 평일 1회 슬롯을 점유. 채점 cron 을 별도 1일 1회로 추가하면 **하루 2개 cron** → Hobby 한도 확인 필요. 회피책은 §9 q4(별도 슬롯 vs flow-snapshot 통합 vs 단일 디스패처).

---

## 2. 목표

- **G1 (측정 가능)**: PRD 적용 이후 생성되는 모든 AI 판정이 **결정시점 종가 + 기준 봉 날짜**를 원장에 보존한다. → "이 행은 채점 가능한가?" 가 컬럼 존재로 판별된다.
- **G2 (측정 가능)**: 매 영업일 1회 채점 cron 이, 평가 시점이 도래한(결정 후 1영업일/5영업일/약 1달 경과) 판정을 찾아 **결정시점 대비 해당 horizon 시점 종가로 적중/미적중(hit/miss)** 을 기록한다. 같은 입력에 같은 결과(결정론).
- **G3 (측정 가능)**: 신호종류(verdict)별 / confidence 구간별 / horizon별 **적중률**을 집계하는 API + 운영자 간이 뷰(표)를 제공한다. 표본 수가 같이 노출돼 작은 표본을 오해하지 않게 한다.
- **G4 (무회귀)**: 채점 backbone 추가가 기존 분석 실행(SSE)·결정 목록 카드(`/analyze`)·이전 결론 조회(`decision`)·토큰 사용량 탭을 **회귀시키지 않는다**. 채점은 비동기 cron + 별도 테이블로 분리.

> 비-목표(이번 phase-1 명시 제외)는 §4. 능동 푸시/브리핑·푸시 채널 결정은 phase-2(`proactive-briefing`)로 분기(§7 FOLLOWUPS).

---

## 3. 범위 (In scope)

### 3-1. 결정 원장(ledger) 보강 — 채점 가능 데이터 보존

채점에 필요한 필드를 보장한다. **이미 있는 필드는 재사용, 없는 것만 추가**한다.

**A. 결정시점 가격 캡처 (C1 해소 — 필수).** 분석 시점 route.ts 클로저에 이미 존재하는 값을 원장에 보존한다.
- `entry_close` — 결정시점 기준 봉 종가(KRW). 출처: `signalResult.asOf` 봉의 종가(= `sorted[last].close`) 또는 라이브 `priceData.price`. **어느 가격을 entry 로 쓸지는 §9 q2 에서 확정**(권고: 봉 종가 = `asOf` 정합, 재현 가능). 
- `entry_date` — 결정시점 기준 봉 날짜(YYYY-MM-DD) = `signal.asOf`. (이미 `signal.asOf` 에 있으면 채점 원장으로 복사)
- `decided_at` — 판정 생성 timestamp(분석 실행 시각). 기존 `updated_at` 재사용 가능하나 채점 원장에는 불변 기록으로 별도 보존.

**B. 채점 원장 테이블 신설 (C3 해소 — 필수).** 기존 `ai_analysis_decisions` 는 ticker PK upsert 라 채점 horizon 상태를 매달 수 없다(재분석 시 덮어쓰기). **append 형 신규 테이블** `signal_scorecard`(가칭) 을 둔다.
  - 결정 1건 = 채점 원장 1행. 분석에서 `final` 판정이 나오고 결정시점 가격 캡처에 성공하면 채점 원장에도 1행 insert(append, upsert 아님 — 같은 종목 재분석은 새 행).
  - 컬럼(제안): `id`(uuid PK) · `ticker` · `provider` · `verdict`(FinalVerdict) · `decision_confidence`(HIGH/MEDIUM/LOW) · `signal_score`(0~100, DecisionSignal.score) · `signal_action`(BUY/HOLD/SELL) · `target_pct`(nullable) · `stop_loss_pct` · `entry_close`(numeric) · `entry_date`(date) · `decided_at`(timestamptz) · `run_id`(nullable, 토큰 usage 연계) · horizon 상태(아래 §3-1-C) · `created_at`.
  - **`ai_analysis_decisions` 는 그대로 둔다**(카드 목록·이전 결론 공유 용도 보존, 비파괴). 채점은 신규 테이블로 완전 분리.

**C. horizon 평가 상태 컬럼.** 한 결정에 대해 3개 평가 시점을 추적한다.
  - `d1_status` / `w1_status` / `m1_status` ∈ `pending | hit | miss | skipped`(영업일/봉 부재·상폐 등)
  - 각 horizon 보조 컬럼: `d1_close`(평가 시점 종가) · `d1_return_pct`(결정시점 대비 %) · `d1_scored_at`. (w1/m1 동일 3쌍)
  - horizon 영업일 정의(기본안): **+1d = 결정 후 1영업일, +1w = 5영업일, +1m = 21영업일**. `businessDaysBetween`(`lib/utils/businessDays.ts`) 재사용.

> **재사용 vs 신규 요약**: verdict·confidence·signal.score·target_pct·stop_loss_pct·asOf 는 **재사용**(이미 `decision`/`signal` jsonb 에 존재 → 채점 원장에 평탄화 복사). `entry_close`·`entry_date`(가격 캡처)·채점 원장 테이블·horizon 상태는 **신규**.

### 3-2. 채점 cron 신설 — 매 영업일 1회

`GET /api/cron/score-decisions`(가칭) 신설. **`flow-snapshot` cron 패턴을 그대로 따른다**(§1-1 #6).
- **인증**: `Authorization: Bearer ${CRON_SECRET}` 미일치 401(Vercel Cron 자동 부착).
- **게이트**: KIS 미설정/비-prod → 채점 skip + 헬스 마커 후 200(C4·fail-soft). cron 재시도 폭주 방지.
- **스케줄(확정)**: 평일 1회, KST 16:10 마감 후. **단일 디스패처 cron** 채택(§9 D4) — 기존 `flow-snapshot` 단일 슬롯 안에서 flow 스냅샷 실행 후 scoring 을 순차 호출한다. `vercel.json` cron 항목은 1개 유지(Hobby 1일 1회 한도 준수). 디스패처 라우트는 각 단계(flow / scoring)를 독립 try/catch 로 감싸 한 단계 실패가 다른 단계를 막지 않게 한다.
- **로직**:
  1. 채점 원장에서 horizon 중 하나라도 `pending` 인 행을 조회.
  2. 각 pending horizon 에 대해, 결정 후 경과 영업일이 임계(1/5/21) 이상이면 평가 대상.
  3. 대상 ticker 의 일봉을 `fetchDailyChunked` 로 조회 → 평가 시점(또는 그 직후 가장 가까운 영업봉) 종가 취득.
  4. **적중 규칙(§3-2-A)** 적용 → 해당 horizon `status`/`close`/`return_pct`/`scored_at` 갱신.
  5. 봉 부재(상폐·휴장 연속 등) → `skipped`. 외부 실패/transient → 그 ticker 만 skip(다음 실행 재시도), 전체 200.
- **rate-limit**: ticker 간 delay(`flow-snapshot` 의 `delay`/`fetchWithTransientRetry` 패턴 재사용). 1회 실행 처리 건수 상한(배치) 가능.

**A. 적중(hit/miss) 판정 규칙 — 신호 방향 기준 기본안.** (임계값은 상수로 분리해 설정 가능 — §6)
신호 방향과 결정시점 대비 horizon 수익률 `r%`(= (horizon종가 − entry_close)/entry_close × 100) 로 판정한다.

| verdict 군 | 방향 | hit 조건(기본 임계 `T`=2%) | miss 조건 |
|---|---|---|---|
| BUY · OVERWEIGHT | 강세(상승 기대) | `r ≥ +T` | `r ≤ −T` |
| SELL · REDUCE | 약세(하락 기대) | `r ≤ −T` | `r ≥ +T` |
| HOLD | 중립(밴드 이내) | `\|r\| ≤ T` (밴드 안에 머묾) | `\|r\| > T` |
| UNDERWEIGHT | 약세 약(주의) | `r ≤ 0` | `r > +T` |

- 중간 구간(예: 강세인데 −T < r < +T)은 **`neutral`/미결**로 둘지 hit/miss 이분으로 강제할지는 §9 q3. 기본 권고: **밴드 미달은 miss 가 아니라 별도 `flat` 카운트**(이분 강제는 적중률을 왜곡). 단순화를 원하면 이분(hit/miss)로 폴백.
- **손절 우선(선택, 권고)**: BUY 계열에서 horizon 도달 전 종가가 `stop_loss_pct` 를 이탈한 적 있으면 `miss` 로 강등(경로 의존). Triple Barrier(`label.ts`) 철학 정합. phase-1 은 종가 기준 단순화 가능 — §9 q3.
- **임계 `T` 출처**: 우선 고정 상수(예 2%). 추후 `target_pct`/`stop_loss_pct` 기반 동적 배리어로 확장 가능(phase-2).

### 3-3. 적중률 집계 — API + 간이 운영자 뷰

**A. 집계 API**: `GET /api/scorecard/summary`(가칭, 읽기 전용 BFF, Vercel 가드 없음 → prod 동작).
- 채점 완료(`hit`/`miss`/`flat`) 행을 **차원별로 group-by** 해 적중률 + 표본 수 반환.
- 집계 차원(필수 3종): **verdict별** · **confidence 구간별**(HIGH/MEDIUM/LOW) · **horizon별**(d1/w1/m1). 교차(verdict × horizon)는 선택.
- 응답(제안): `[{ dimension, key, horizon, hit, miss, flat, total, hitRate }]` + `generatedAt`. `hitRate = hit / (hit + miss)`(flat 제외, 분모 노출).
- 보조 차원(선택): signal_score 구간별(예 0-40/40-60/60-100) — 결정론 신호 강도 적중력 측정.

**B. 운영자 간이 뷰** (내부 등급 UI, 디자인 폴리시 최소):
- 신규 라우트(권고 `app/(main)/dashboard/scorecard` 또는 기존 dashboard 내 섹션) 에 **표** 1개 + 차원/horizon 필터(드롭다운 수준). 토스톤 디자인 시스템 강제 안 함(`docs/rules/frontend.md` 컨벤션은 준수 — copy 한글·BFF·cn·토큰).
- 표 행: 차원 키 / horizon / 적중 / 미적중 / flat / 표본수 / 적중률. **표본 수를 같이 노출**(작은 N 오해 방지, 예: N<5 회색 처리).
- 빈 상태("아직 채점된 판정이 없어요 — 결정 후 1영업일 경과 시 채점됩니다") · 미설정 상태 graceful.

### 3-4. 컨벤션 준수 (공통)
- 사용자/운영자 노출 문구 한글 기본(`lib/copy/`). BFF 패턴 유지 — Supabase·KIS 접근은 route handler/server 유틸 안에서만, 브라우저는 `/api/*` 만.
- service role key 서버 전용(`SUPABASE_SERVICE_ROLE_KEY`), `CRON_SECRET` Vercel env. 색·px 직타 금지.
- 채점 원장 SQL 은 `docs/sql/signal-scorecard.sql`(가칭) 로 둔다(멱등 `create table if not exists` + `add column if not exists`).

---

## 4. 비범위 (Out of scope — phase-2)

- **능동 푸시 / 스케줄 브리핑** → 별도 슬러그 `proactive-briefing`(§7 FOLLOWUPS). 채점 결과가 곧 브리핑 콘텐츠가 되는 연결이지만 이번 범위 아님.
- **푸시 전송 채널 결정**(PWA web-push 신설 vs engine-stock Slack 재사용) → phase-2 오픈 이슈(§7).
- **공개용 화려한 대시보드**(차트·시계열 적중률 추이·종목 드릴다운) — 이번은 내부 표 수준.
- **과거 결정 소급 채점/백필**(C2 — 결정시점 가격 미보유로 불가).
- **동적 배리어 채점**(`target_pct`/`stop_loss_pct` 기반 종목별 임계, ATR 적응) — 기본 고정 `T` 로 시작.
- **분석 실행의 prod 화** — AI 멀티에이전트 분석은 로컬 전용 유지(채점 cron 만 prod). 단, 결정 원장 저장이 로컬에서 일어나면 채점 대상이 prod Supabase 에 쌓이는지 운영 전제 확인(§6).
- **provider별 비교(claude vs codex) 정밀 분석** — `provider` 컬럼은 보존하되 phase-1 집계 차원에서는 선택.
- `ai_analysis_decisions` 스키마 파괴적 변경(컬럼 삭제/타입 변경).

---

## 5. 수용 기준 (AC — QA가 테스트 항목으로 직변환 가능)

### AC-1 (원장 — 가격 캡처)
PRD 적용 후 새로 생성된 AI 판정 1건에 대해, 채점 원장 신규 행이 1건 insert 되고 `entry_close`(>0)·`entry_date`(YYYY-MM-DD)·`decided_at`·`verdict`·`decision_confidence`·`signal_score` 가 모두 non-null 로 기록된다.
- 검증: 로컬 분석 1회 실행(`/analyze` 종목 1개) → `signal_scorecard` 에 해당 ticker 행 존재 + 위 컬럼 채워짐(SQL 조회).

### AC-2 (원장 — 비파괴/append)
같은 ticker 를 2회 분석하면 채점 원장에 **2개 행**이 쌓인다(upsert 아님, 직전 행 보존). 반면 `ai_analysis_decisions` 는 기존대로 1행 유지(무회귀).
- 검증: 같은 ticker 2회 분석 → `select count(*) from signal_scorecard where ticker=X` = 2, `ai_analysis_decisions` 행 수 변화 없음.

### AC-3 (채점 cron — 인증·게이트)
`/api/cron/score-decisions` 가 `CRON_SECRET` 없는/틀린 호출에 401, 올바른 Bearer 로 호출 시 진입한다. KIS 미설정/비-prod 환경에선 채점 skip + 헬스 마커 + 200(분석/다른 cron 무영향).
- 검증: Bearer 미부착 → 401. 올바른 Bearer + 비-prod → 200 `{ ok:false, reason:"kis-not-prod" }`.

### AC-4 (채점 cron — 적중 판정 정확성)
결정 후 1영업일 경과한 채점 원장 행(BUY, entry_close=100)에 대해, +1d 종가=103(+3%, T=2%) 이면 `d1_status='hit'`·`d1_return_pct≈3`·`d1_close=103`·`d1_scored_at` 기록. 종가=98(−2%) 이면 `d1_status='miss'`. SELL 은 부호 반대로 검증된다.
- 검증: 고정 캔들 fixture 로 cron 로직 단위 테스트(`__tests__`) — verdict별(BUY/SELL/HOLD/UNDERWEIGHT) hit/miss/flat 경계값(`r=+T`, `r=−T`, `|r|=T`) 표 전수.

### AC-5 (채점 cron — 결정론·재실행 안전)
같은 입력(같은 fixture)으로 cron 채점을 2회 돌리면 결과가 동일(이미 `hit`/`miss` 인 horizon 은 재채점하지 않음 — `pending` 만 처리). 영업일 미도래 horizon 은 `pending` 유지.
- 검증: 단위 테스트 — 이미 채점된 행 재호출 시 변화 없음. 결정 후 0.5일 경과(미도래) → `pending` 유지.

### AC-6 (채점 cron — fail-soft)
봉 부재(상폐/연속 휴장으로 평가 시점 종가 없음) → 해당 horizon `skipped`(전체 cron 200). 한 ticker 의 KIS 조회 실패가 다른 ticker 채점을 막지 않는다.
- 검증: 빈 캔들 fixture → `skipped`. 1개 ticker throw mock → 나머지 ticker 정상 채점 + cron 200.

### AC-7 (집계 API)
`GET /api/scorecard/summary` 가 verdict별·confidence별·horizon별 `{ hit, miss, flat, total, hitRate }` 를 반환한다. `hitRate = hit/(hit+miss)`(flat 제외), `total` 노출. 채점 행 0건이면 빈 배열 + 200.
- 검증: 시드 데이터(hit 3·miss 1·flat 1, BUY/d1) → 해당 셀 `hit=3,miss=1,flat=1,total=5,hitRate=0.75`.

### AC-8 (운영자 뷰)
운영자 뷰 라우트에서 집계 표가 차원 키/horizon/적중/미적중/flat/표본수/적중률 컬럼으로 렌더되고, 차원·horizon 필터가 동작한다. 채점 0건이면 빈 상태 카피, Supabase 미설정이면 미설정 안내(에러 토스트 아님).
- 검증(라이브, 두 뷰포트): 표 렌더 + 필터 전환 + 빈/미설정 상태. 표본 N<5 시각 구분 노출.

### AC-9 (무회귀)
`npm run lint` · `tsc --noEmit`(또는 `npm run build`) · `npm run test` 통과. 기존 `/analyze` 카드 목록·이전 결론 조회·SSE 분석·토큰 사용량 탭·`flow-snapshot` cron 이 기존대로 동작.

### AC-10 (마이그레이션 주의 — 과거 행 채점 불가)
PRD 적용 이전 `ai_analysis_decisions` 행(가격 미보유)은 채점 원장에 들어오지 않으며 집계에 포함되지 않는다(소급 채점 0건). 문서/안내에 "적용 이후 결정부터 채점" 명시.
- 검증: 적용 전 결정만 있는 상태에서 cron 실행 → 채점 0건, 에러 없음.

---

## 6. 가정 · 제약 (마이그레이션 주의 포함)

- **DB 가정**: Supabase 라이브. 채점 원장 `signal_scorecard`(가칭) 를 신규 테이블로 수동 SQL 선적용(코드 머지 전). `ai_analysis_decisions` 는 비파괴 유지.
- **⚠️ 마이그레이션 주의 (C1·C2)**: **현재 결정시점 가격이 원장에 캡처되고 있지 않다.** 따라서 **과거 결정은 채점 불가(가격 미보유)** 이며, **PRD 적용 시점 이후 새로 생성되는 결정부터만 채점**한다. 백필 없음(과거 시점 entry 가격을 신뢰 복원 불가 — 어느 봉을 entry 로 봤는지 모호). 적용 시점 = 가격 캡처 코드가 머지·배포된 시점.
- **실행/환경 가정 (C4)**: AI 분석 실행은 로컬 전용(`isVercelEnv()` 가드). 즉 **결정 원장 행은 로컬 분석 시 Supabase 에 쌓인다.** 채점 cron 은 prod(Vercel)에서 KIS prod 일봉으로 돈다 → **로컬에서 만든 결정 행이 같은 (prod) Supabase 에 저장되는지 운영 전제 확인 필요**(로컬 env 가 prod Supabase 를 가리키면 OK). 로컬/스테이징 Supabase 분리 시 채점 대상이 비는 점 인지(§9 q5).
- **Vercel cron 제약 (C5)**: Hobby 플랜 cron 1일 1회. 채점 cron 을 별도 추가하면 flow-snapshot 과 합쳐 2개 → §9 q4 회피책 적용.
- **임계값 설정 가능**: 적중 임계 `T`(기본 2%)·horizon 영업일(1/5/21)·flat 처리 방식·손절 우선 여부는 상수 모듈로 분리해 코드 한 곳에서 조정 가능하게 둔다(env 노출은 phase-1 불요).
- **스키마 제약**: 신규 테이블/컬럼 추가만. 기존 컬럼 삭제·타입 변경 금지.

---

## 7. FOLLOWUPS — phase-2 분기 (이 PRD 비범위, 연결성 명시)

- **`proactive-briefing` (phase-2, 별도 슬러그)**: 능동 푸시/스케줄 브리핑. **채점이 만들어내는 결과(적중/미적중·갱신된 적중률·새로 hit 난 종목)가 곧 브리핑 콘텐츠가 된다** — 채점 cron 이 horizon 을 `hit`/`miss` 로 확정하는 순간이 "알릴 거리"가 생기는 트리거다. 이 PRD 의 채점 backbone 이 브리핑의 데이터 소스를 만든다.
- **[OPEN — phase-2] 푸시 전송 채널**: PWA web-push 신설 vs engine-stock(trading-bot) Slack 재사용. phase-2 `proactive-briefing` PRD 에서 결정. phase-1 에서는 결정·구현하지 않는다.
- **동적 배리어 채점**: `target_pct`/`stop_loss_pct`·ATR 기반 종목별 임계(phase-1 고정 `T` → 정밀화).
- **공개 대시보드**: 적중률 시계열 추이·종목 드릴다운·provider 비교 시각화.

---

## 8. 영향 분석

### 8.1 신규 파일 (예상)
- `app/api/cron/score-decisions/route.ts` — 채점 cron(또는 §9 q4 디스패처 형태).
- `lib/server/scorecard/scorecardStore.ts` — Supabase 채점 원장 read/insert/horizon-update(서버 전용, fail-soft).
- `lib/server/scorecard/scoring.ts` — 적중 판정 순수 로직(verdict·r%·T → hit/miss/flat). 단위 테스트 대상.
- `app/api/scorecard/summary/route.ts` — 집계 BFF.
- `app/(main)/dashboard/scorecard/page.tsx`(+ `components/scorecard/*`) — 운영자 표 뷰.
- `lib/types/scorecard/*` · `lib/copy/scorecard/*` · `docs/sql/signal-scorecard.sql`.
- `docs/design/signal-scorecard.md`(최소 — 표 구조만) · `docs/qa/signal-scorecard.md`.

### 8.2 수정 파일 (예상)
- `app/api/stock/ai-analysis/route.ts` — PM `final` upsert 직후 채점 원장 append + `entry_close`/`entry_date` 캡처(클로저의 `priceData`/`sorted`/`signalResult` 재사용, fail-soft).
- `vercel.json` — `crons` 항목(또는 flow-snapshot 디스패처화).
- `lib/server/bffUtils.ts` — `delay`/`fetchWithTransientRetry` 재사용(공통화 이미 존재).

### 8.3 변경 라인 추정 · 회귀 위험
- ~500-700 LOC(신규 store/cron/scoring/집계/표 뷰 비중). 단일 PR(PRD+구현+QA 묶음).
- 회귀 위험 1순위: **분석 SSE 무회귀**(채점 append 는 fail-soft, 실패해도 분석 스트림 안 막음 — 기존 `upsertAIDecision` skip 패턴 동일). cron 추가가 flow-snapshot·기존 cron 헬스 무영향.
- 채점 정확성 회귀: 적중 판정 로직은 순수 함수로 분리 → fixture 단위 테스트로 경계값 고정(AC-4).

---

## 9. 확정 결정 (RESOLVED — 사용자 승인 2026-06-19, 구현 기준)

§9 의 모든 오픈이슈는 아래로 **확정**되었다. 구현은 이 결정을 기준으로 진행한다.

| # | 질문 | 확정 결정 | 근거 |
|---|---|---|---|
| D1 | 채점 원장 위치 | **별도 테이블 `signal_scorecard`(append)** | 기존 `ai_analysis_decisions` 는 ticker PK upsert(history 없음, C3) → 재분석 시 horizon 상태 덮어쓰기. 채점은 "그 시점 판정" 불변 평가라 append 필수. 결정 테이블은 카드/공유 역할 보존(비파괴). |
| D2 | entry 가격 출처 | **결정시점 기준 봉 종가(`signal.asOf` 봉의 close)** | horizon 종가와 동일 출처(KIS 일봉)·동일 척도 → 재현·정합. 라이브 현재가는 보조로만 저장 가능(채점엔 미사용). |
| D3 | 적중 분류 | **3분류 hit/miss/flat, `hitRate=hit/(hit+miss)`(flat 분모 제외)** | 이분 강제는 "방향은 맞췄으나 폭이 작은" 케이스를 miss 로 몰아 적중률 왜곡. 손절 우선(경로 의존) 강등은 phase-1 종가 단순화로 시작. |
| D4 | cron 슬롯(Hobby 1/day) | **단일 디스패처 cron** — 기존 `flow-snapshot` 슬롯 안에서 flow 후 scoring 순차 호출, `vercel.json` cron 1개 유지 | 운영자 1인 MVP·비용 민감 → Pro 업그레이드 대신 무료 한도 내 디스패처. 각 단계 독립 try/catch. |
| D5 | 결정 원장 DB 일치 | **로컬 분석 결정은 prod Supabase 에 적재됨(확인 완료)** → 단일 DB 전제로 진행 | 로컬 env 가 prod Supabase 를 가리킴(사용자 확인). 채점 cron(prod)이 동일 DB 를 읽어 채점 가능. |
| D6 | UI 디자이너 | **불필요(경량 내부 표)** — `docs/rules/frontend.md` 컨벤션만 준수 | 공개 대시보드(차트·드릴다운)는 phase-2 에서 디자이너 합류. |
| D7 | horizon·임계 | **+1d/+1w/+1m = 1/5/21영업일, 적중 임계 T=2% (상수 모듈로 분리)** | 한국시장 1달 ≈ 21영업일. 코드 1곳에서 조정, env 노출 불요. |

---

## 다음 작업

- **구현 진입(승인됨)**: `feature/signal-scorecard` 브랜치 생성 + 풀사이클(FE/API Dev→QA→review→devops). §9 확정 결정(D1~D7) 기준으로 착수. 머지는 사용자 명시 승인 후.
- 인접 분기: phase-2 `proactive-briefing` PRD(채점 결과 → 능동 브리핑·푸시 채널 결정)는 본 backbone 머지 후 별도 슬러그로 착수.
- `qa-passed` 라벨 시 `docs/HANDOFF.md` 자동 append(handoff-append.yml).

---

## 참고
- 선행 PRD: `docs/prd/ai-decision-upsert.md`(결정 테이블 도입) · `docs/prd/ai-decision-confidence.md`(`signal`=DecisionSignal 컬럼) · `docs/prd/investor-flow-cumulative.md`(cron 적립 패턴 원형).
- 코드(읽기 전용 조사 근거):
  - `lib/server/ai/decisionStore.ts` · `docs/sql/ai-analysis-decisions.sql` — 결정 저장 스키마(ticker PK upsert).
  - `lib/types/stock/aiAnalysis.ts` — `FinalDecision`·`DecisionSignal`(asOf 봉 날짜, entry close 미보존).
  - `app/api/stock/ai-analysis/route.ts` — `toDecisionSignal`·`upsertAIDecision`·`priceData`/`sorted` 클로저(가격 캡처 지점).
  - `app/api/cron/flow-snapshot/route.ts` · `vercel.json` — cron 인증·게이트·스케줄 패턴.
  - `lib/api/kis/chartChunked.ts::fetchDailyChunked` — 임의 날짜 구간 일봉 조회(horizon 종가 사후 취득).
  - `lib/utils/businessDays.ts::businessDaysBetween` — 영업일 경과 계산.
  - `lib/signal/backtest/label.ts` — Triple Barrier(채점 규칙·손절 우선 철학 참고).
- 컨벤션: `AGENTS.md` PRD 섹션 · `docs/rules/frontend.md`.
</content>
</invoke>
