# PRD — scorecard-relative-scoring (시장/베타 보정 채점 v2 — 알파 측정)

- **slug**: `scorecard-relative-scoring`
- **작성일**: 2026-06-24
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **대상 브랜치**: `feature/scorecard-relative-scoring`
- **UI 포함 여부**: **yes (최소 — 내부 운영자 등급)** — 적중률 표에 abs/excess 병기 + regime 필터 추가. 토스톤 폴리시 불요(공개용 대시보드는 phase-2).
- **상위 컨텍스트**: `signal-scorecard`(phase-1 절대 채점 backbone, #PR `signal_scorecard` 원장) · `scorecard-feedback`(자가교정·프롬프트 주입) 후속.

---

## 1. 배경 / 문제

phase-1 채점(`signal-scorecard`)은 **결정시점 대비 절대 수익률 r%** 를 ±T(`HIT_THRESHOLD_PCT`=2%) 밴드로 hit/miss/flat 판정한다. 이 방식엔 구조적 결함이 있다:

- **시장 베타 함정**: 시장 전체가 빠지는 날엔 약세 판정(UNDERWEIGHT/SELL)이 "실력(알파)이 아니라 시장 베타에 올라타서" 자동 hit 된다. 강세장에선 반대로 매수 판정이 거저 hit 된다. → 종목 선택력(알파)과 시장(베타)이 섞여 측정된다.
- **의미 불일치**: OVERWEIGHT/UNDERWEIGHT 는 본질이 "시장(벤치마크) 대비 비중" 상대 개념이다. 이를 절대 수익률로 채점하는 것은 정의와 어긋난다.

→ **같은 horizon 의 벤치마크 지수(KOSPI/KOSDAQ) 수익률을 빼서 초과수익(excess)·베타보정 잔차(alpha)로 채점**한다. 시장 베타를 제거하고 실력만 측정하는 v2.

### 1-1. 현재 구조 — 코드 추적 결과 (확정 사실, 읽기 전용 조사)

| # | 사실 | 근거 위치 |
|---|---|---|
| 1 | phase-1 채점 = 절대 수익률 순수함수. `computeReturnPct(entry,horizon)` → `scoreOutcome(verdict,r,T)` (BUY r≥+T hit 등) | `lib/server/scorecard/scoring.ts` |
| 2 | 채점 cron 로직 = `scoreDecisions`(주입형 deps). `findHorizonClose` 로 평가일 직후 첫 영업봉 종가 취득. fail-soft(ticker 단위 catch, throw 전파=pending) | `lib/server/scorecard/scoreDecisions.ts`, `runScoring.ts` |
| 3 | 원장 `signal_scorecard` — horizon별 `*_status`/`*_close`/`*_return_pct`/`*_scored_at`. **절대 수익률만 보존**(상대 측정값 없음) | `docs/sql/signal-scorecard.sql`, `lib/types/scorecard/scorecard.ts::ScorecardRow` |
| 4 | 지수는 **현재값만** 취득 가능(`fetchIndexPrice` TR `FHPUP02100000`). **지수 일봉 히스토리 fetch 는 부재** | `lib/api/kis/index-price.ts` |
| 5 | 종목 일봉 기간조회 패턴 = `fetchDailyChunked`(130일 청크 분할 → 100봉 한도 회피) | `lib/api/kis/chartChunked.ts`, `price.ts::fetchStockDailyChart`(TR `FHKST03010100`) |
| 6 | 종목 상장시장(KOSPI/KOSDAQ)은 **오프라인 시드 `symbols.json`** 에 `market` 필드로 전수 보유(2611종목, KOSPI 833·KOSDAQ 1778). `search.ts` 가 이미 import | `lib/api/kis/symbols.json`, `lib/api/kis/search.ts` |
| 7 | 집계 = `summarizeScorecard`(status 카운트→hitRate). 자가교정 = confidence 차원 셀 hit/miss 합산(`calibration.ts`). 둘 다 status 컬럼 기준 | `lib/server/scorecard/summarize.ts`, `calibration.ts` |
| 8 | 채점은 단일 디스패처(`flow-snapshot`)가 flow 적립 후 `runScoring` 호출 + 독립 라우트(`/api/cron/score-decisions`) 공유. prod+KIS 설정 게이트, fail-soft 200 | `app/api/cron/flow-snapshot/route.ts`, `score-decisions/route.ts` |

### 1-2. 핵심 제약 (이 PRD 설계를 좌우)

- **C1 — 지수 일봉 히스토리 부재**: 채점은 entry/horizon 두 시점의 지수 종가가 필요한데 현재 지수 현재값만 있다 → **지수 일봉 fetch 신규 추가**(TR `FHKUP03500100`).
- **C2 — fail-soft 최우선**: 지수 조회 실패를 잘못된 0/skip 으로 확정하면 채점이 영구 오염된다. **지수 측정 불가 = 보류(pending 유지)**, 다음 cron 재시도(throw 전파 철학 계승).
- **C3 — 소급 재채점(backfill)**: phase-1 으로 이미 절대 채점된 행이 존재한다. 지수 history 는 사후 취득 가능하므로 **기존 행을 상대 지표로 멱등 재계산**해야 한다(과거 entry 종가는 원장에 보존돼 있어 복원 가능 — phase-1 의 "가격 미보존 백필 불가" 제약과 다름).
- **C4 — β 추정 데이터 의존**: β 는 entry 직전 윈도우의 종목·지수 회귀로 추정한다. 신규 상장·장기 거래정지로 표본이 부족하면 β 추정 불가 → **beta_adjusted 는 excess 로 견고 폴백**(반쯤 만든 상태 금지).
- **C5 — 비파괴**: 기존 abs 컬럼·phase-1 `scoreOutcome`·분석 SSE 무회귀. 신규 컬럼은 멱등 add.

---

## 2. 목표

- **G1 (측정 가능)**: 채점 cron 이 horizon 별로 abs/bench/excess/beta/alpha_residual/regime 를 **모두 측정·보존**한다.
- **G2 (측정 가능)**: status(hit/miss/flat)를 **주 지표(기본 excess)** 기준으로 산출한다. 시장 베타 함정(시장 동반 하락 시 UNDERWEIGHT 자동 hit)이 차단된다.
- **G3 (멱등 backfill)**: 기존 절대 채점 행이 상대 지표로 재계산돼 채워지고, 같은 입력엔 같은 결과(재실행 안전).
- **G4 (집계·자가교정)**: hit-rate·자가교정(프롬프트 주입 포함)이 excess 기준으로 동작한다(베타 아닌 알파 반영). 표에 abs/excess 병기 + regime 필터.
- **G5 (무회귀·fail-soft)**: 분석 SSE·기존 화면 무회귀. 지수 fetch 실패는 pending 보류(영구 skip 오확정 금지).

---

## 3. 범위 (In scope)

### 3-1. 지수 일봉 fetch 신규 (C1)
- `lib/api/kis/index-chart.ts::fetchIndexDailyChart(code, fromYmd, toYmd)` — TR **`FHKUP03500100`**(`inquire-daily-indexchartprice`), `FID_COND_MRKT_DIV_CODE=U`, code `0001`(KOSPI)/`1001`(KOSDAQ), `FID_PERIOD_DIV_CODE=D`. 종가 = `bstp_nmix_clpr`. **prod 전용**(`fetchIndexPrice` 와 동일 정책).
- `lib/api/kis/indexChartChunked.ts::fetchIndexDailyChunked` — 130일 청크 분할(베타 윈도우+horizon 합산이 100봉 초과 가능). 종목 청크와 동일 패턴.

### 3-2. 벤치마크 해석
- `lib/api/kis/search.ts::getMarketByTicker(ticker)` — **오프라인 `symbols.json`** 역참조(추가 API 호출 0). `resolveBenchCode`(KOSPI→`0001`, KOSDAQ→`1001`, 미해석→폴백 `0001`). 결정시점에도 원장 `bench_key` 로 보존.

### 3-3. horizon별 측정값 전부 저장 (비파괴)
- `abs_return`(기존 유지) · `bench_return`(같은 horizon 지수 수익률) · `excess_return = abs − bench` · `beta`(entry 직전 60영업일 회귀) · `alpha_residual = abs − β·bench` · `regime`(구간 지수 수익률 up/down/flat). 컬럼: `*_bench_return_pct`/`*_excess_return_pct`/`*_beta`/`*_alpha_residual_pct`/`*_regime` + 행 공통 `bench_key`.

### 3-4. 주 채점 지표 모드 (상수, 기본 excess)
- `SCORING_METRIC_MODE: "absolute"|"excess"|"beta_adjusted"` = `"excess"`. status 는 선택 지표 vs ±T(phase-1 `scoreOutcome` 규칙 **그대로 재사용** — 입력만 상대 지표로 교체). beta_adjusted 는 β 추정 불가 시 excess 폴백.

### 3-5. 소급 재채점 (backfill, 멱등)
- `getRowsNeedingRelativeScoring` — pending **또는** "채점됐으나 bench null(미보정)" horizon 조회. cron 패스에서 상대값을 채우고 status 도 주 지표 기준으로 갱신. skipped 는 제외(봉 부재 영구확정). 멱등 — 이미 채워진 horizon 은 재처리 안 함.

### 3-6. 집계·자가교정·UI
- `summarizeScorecard` — hit/miss/flat 카운트가 status(=excess 기준)이라 hit-rate 자동 excess. **참고용 abs 적중률**(returnPct+verdict 재판정)을 병기. **regime 차원** 추가.
- `calibration.ts` — confidence 셀 hit/miss 가 excess 기준이라 자가교정·프롬프트 주입 자동 excess(프롬프트 문구도 "시장 대비 초과수익" 으로 갱신).
- UI — 표에 적중률(초과)/적중률(절대) 병기 + 차원 필터에 "시장 국면별". 작은 N 표기 유지.

### 3-7. 스키마 마이그레이션
- `signal_scorecard` 멱등 컬럼 add(위 측정값 + `bench_key`) + backfill 부분 인덱스. 기존 컬럼 비파괴.

### 3-8. 배선
- cron 라우트·디스패처를 `runScoring`(v1) → `relativeRunScoring`(v2)로 교체. v2 가 v1 의 비파괴 후속(같은 fail-soft·게이트). 분석 insert 에 `benchKey` 캡처.

---

## 4. 비범위 (Out of scope — FOLLOWUPS)

- **섹터/피어 상대 채점** — 섹터지수 매핑·소싱 필요. 시장지수 대비보다 정밀하지만 다음 단계.
- **다중팩터 귀속**(size/value/momentum 등) — beta_adjusted(단일 시장팩터) 이후 확장.
- **동적 임계(ATR/target_pct 기반)** — phase-1 §FOLLOWUP 유지.

---

## 5. 수용 기준 (AC — QA가 테스트 항목으로 직변환 가능)

### AC-1 (지수 일봉 fetch)
`fetchIndexDailyChart("0001", from, to)` 가 TR `FHKUP03500100`·`FID_COND_MRKT_DIV_CODE=U` 로 호출하고 `bstp_nmix_clpr` 종가를 `{date,close}` 오름차순으로 반환. rt_cd≠0 은 비즈니스 에러 throw.

### AC-2 (벤치마크 매핑)
`getMarketByTicker("005930")="KOSPI"`, 미수록→null. `resolveBenchCode`: KOSPI→`0001`, KOSDAQ→`1001`, 미수록→`0001`(폴백). 추가 API 호출 0.

### AC-3 (excess 측정·시장 베타 차단)
시장 -5%·종목 -1%·OVERWEIGHT → abs -1(절대론 flat) 이지만 excess +4 → **hit**. 시장 -5%·종목 -4%·UNDERWEIGHT → abs -4(절대론 hit) 이지만 excess +1 → **flat**(알파 미입증).

### AC-4 (β/alpha·모드 선택)
β = cov/var(정확 선형 1.5×지수 → 1.5). 표본<min·분산0 → null. beta_adjusted + β null → **excess 폴백**. selectScoringMetric 모드별 정확.

### AC-5 (regime 분류·±T 경계)
bench ≥+1.5 up / ≤-1.5 down / 사이 flat. scoreRelativeOutcome 이 ±T 경계(r=+T hit, r=-T miss)를 phase-1 과 동일 적용. 지표 null → null(보류).

### AC-6 (backfill 멱등)
이미 hit·bench null 행 → 재계산해 bench/excess 채움(backfilled 카운트↑), status 주 지표 기준 갱신. skipped 는 미처리. 재실행 시 추가 갱신 0(결정론).

### AC-7 (fail-soft)
지수 fetch throw → 해당 ticker pending 유지(skip 오확정 금지, errors↑). 종목 fetch throw → pending. 지수 성공 빈 배열(entry 지수 부재) → excess 측정 불가 → pending 보류(scored 0).

### AC-8 (집계·자가교정 excess)
hit/miss/flat = status(excess) 기준. abs 적중률 별도 병기. regime 차원 셀 생성. 프롬프트 요약 문구가 "시장 대비 초과수익" 기준임을 명시.

### AC-9 (무회귀)
`npm run lint`·`tsc --noEmit`·`test`·`build` 통과. phase-1 `scoreOutcome`·기존 테스트 무변경 통과. 분석 SSE·기존 화면 무회귀.

---

## 6. 가정 · 제약 (마이그레이션 주의 포함)

- **⚠️ 마이그레이션 주의**: `docs/sql/signal-scorecard.sql` 의 신규 멱등 컬럼(`bench_key`·horizon별 상대값)을 **코드 머지/배포 전 prod Supabase 에 수동 선적용**한다(서버 service role REST 가 read). 미적용 시 select/update 가 컬럼 부재로 실패할 수 있다.
- **벤치마크 폴백 한계**: `symbols.json` 미수록 종목(신규 상장 등)은 KOSPI(`0001`)로 폴백한다. KOSDAQ 신규 상장은 잘못된 벤치마크일 수 있으나, 시드가 대부분을 커버하고 폴백은 KOSPI(시총 큰 보수적 근사)라 영향이 제한적. 시드 갱신(`scripts/update-symbols.py`)으로 해소.
- **β 추정 한계(C4)**: 표본<30 페어면 β=null → beta_adjusted 는 excess 폴백. 기본 모드가 excess 라 운영 영향 없음.
- **지수 일봉 prod 전용**: 비-prod/미설정 cron 은 채점 skip(phase-1 게이트 그대로).

---

## 7. FOLLOWUPS — 다음 단계 분기 (이 PRD 비범위, 연결성 명시)

- `scorecard-sector-relative` — 섹터/피어 지수 대비 채점(섹터지수 소싱).
- `scorecard-multifactor` — size/value/momentum 다중팩터 귀속.
- beta_adjusted 운영 검증 후 기본 모드 전환 검토(현재 excess 기본, beta_adjusted 는 측정·저장만 + 폴백).

---

## 8. 영향 분석

### 8.1 신규 파일
- `lib/api/kis/index-chart.ts` — 지수 일봉 fetch(TR `FHKUP03500100`).
- `lib/api/kis/indexChartChunked.ts` — 지수 일봉 청크 분할.
- `lib/server/scorecard/relativeScoring.ts` — 상대 채점 순수 로직(excess/beta/alpha/regime/mode).
- `lib/server/scorecard/relativeScoreDecisions.ts` — v2 채점 cron 로직(주입형, backfill 포함).
- `lib/server/scorecard/relativeRunScoring.ts` — v2 실제 배선(store+KIS+벤치마크).
- 테스트: `__tests__/relativeScoring.test.ts`, `__tests__/relativeScoreDecisions.test.ts`, search 벤치 테스트 보강.

### 8.2 수정 파일
- `lib/server/scorecard/constants.ts` — mode·regime 임계·β 윈도우·벤치 코드 상수.
- `lib/types/scorecard/scorecard.ts` — ScoringMetricMode·ScorecardRegime·Row/Update/Cell/Insert 확장.
- `lib/server/scorecard/scorecardStore.ts` — select cols·toRow·update body·insert body·`getRowsNeedingRelativeScoring`.
- `lib/server/scorecard/summarize.ts` — excess 기준 + abs 병기 + regime 차원.
- `lib/server/scorecard/calibration.ts` — excess 기준 문구.
- `lib/api/kis/search.ts`·`index.ts`·`types.ts` — getMarketByTicker·지수차트 타입·export.
- `app/api/cron/{score-decisions,flow-snapshot}/route.ts`·`scorecardCronMeta.ts` — v2 배선.
- `app/api/scorecard/summary/route.ts` — metric 모드 echo.
- `app/api/stock/ai-analysis/route.ts` — benchKey 캡처.
- `components/scorecard/{ScorecardTable,ScorecardContainer}.tsx`·`lib/copy/scorecard/labels.ts` — abs/excess 병기·regime 필터.
- `docs/sql/signal-scorecard.sql` — 멱등 컬럼·인덱스.

### 8.3 회귀 위험
- 회귀 1순위: **분석 SSE 무회귀** — 채점 append 는 fail-soft(benchKey 추가도 캡처 실패해도 스트림 안 막음). cron v2 전환은 fail-soft·게이트 그대로.
- 채점 오염 방지: 지수 측정 불가 = pending 보류(영구 skip 오확정 금지). backfill 멱등.

---

## 9. 확정 결정 (RESOLVED — 구현 기준)

- **지수 TR**: `FHKUP03500100`(`inquire-daily-indexchartprice`), market div `U`, code `0001`/`1001`, 종가 `bstp_nmix_clpr`.
- **벤치마크 매핑**: 오프라인 `symbols.json` `market` → KOSPI `0001`/KOSDAQ `1001`, 미수록 폴백 `0001`.
- **기본 채점 모드**: `excess`(시장 대비 초과수익).
- **regime 임계**: 벤치 수익률 ±1.5%.
- **β 추정 윈도우**: entry 직전 60영업일, 최소 30페어, 추정 불가 시 excess 폴백.
- **backfill**: pending + "채점됐으나 bench null" 행을 cron 패스에서 멱등 재계산.
