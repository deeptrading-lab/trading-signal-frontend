# QA Report: scorecard-relative-scoring

- **PRD**: [docs/prd/scorecard-relative-scoring.md](../prd/scorecard-relative-scoring.md)
- **PR**: [#149 feat(scorecard): 시장/베타 보정 채점 v2 — 초과수익(excess) 기준 알파 측정](https://github.com/deeptrading-lab/trading-signal-frontend/pull/149)
- **브랜치**: `feature/scorecard-relative-scoring` (HEAD `5dd8e75`, base `main`)
- **검증일**: 2026-06-24
- **검증자**: QA 에이전트
- **검증 환경**: 격리 워크트리 `tsf-qa-relsco` (메인 체크아웃·타 브랜치 미접촉, `npm ci` 클린 설치)
- **판정 요약**: 자동/순수함수 AC 전부 PASS. prod Supabase 신규 SQL 컬럼 + 실지수 TR 응답이 필요한 AC 는 "운영자 라이브 확인"으로 분류(임의 pass/fail 금지).

---

## 0. 자동 재현 실측 (AC-9 핵심)

격리 워크트리에서 4종 게이트 전수 실행.

| 게이트 | 커맨드 | 실측 결과 | 판정 |
|---|---|---|---|
| Lint | `npm run lint` | exit 0 — 0 errors / 0 warnings (eslint .) | PASS |
| Type | `npx tsc --noEmit` | exit 0 — 0 errors | PASS |
| Test | `npm run test` | exit 0 — **Test Files 51 passed \| 1 skipped (52)**, **Tests 424 passed \| 1 skipped (425)**. 신규 `relativeScoring` 30 + `relativeScoreDecisions` 8 + search 벤치 보강 포함 | PASS |
| Build | `npm run build` | exit 0 — `✓ Compiled successfully`, 정적 페이지 **43/43** 생성 | PASS |

- 1 skipped = `lib/signal/backtest/__live__/liveBacktest.test.ts`(라이브 백테스트, 기존 무관 항목).
- build 의 NFT trace 경고 1건은 Turbopack 동작으로 **origin/main 동일·이 PR 변경(next.config 미수정)과 무관**.
- 신규 테스트 단독 재실행: `relativeScoring(30) + relativeScoreDecisions(8) + search(6) + summarize(7) + calibration(12) + scoreDecisions(12) = 75 passed`.

---

## 1. 수용 기준 검증 (AC-1 ~ AC-9)

### AC-1 (지수 일봉 fetch)

| 항목 | 값 |
|---|---|
| 재현 절차 | `lib/api/kis/index-chart.ts::fetchIndexDailyChart` 인스펙션 |
| 기대 결과 | TR `FHKUP03500100`, `FID_COND_MRKT_DIV_CODE=U`, `FID_INPUT_ISCD=code`, `FID_PERIOD_DIV_CODE=D`. 종가 `bstp_nmix_clpr` → `{date, close}` 오름차순. rt_cd≠0 비즈니스 에러 throw |
| 실측 결과 | L83 `buildAuthHeaders("FHKUP03500100")`, L92 `FID_COND_MRKT_DIV_CODE:"U"`, L96 `FID_PERIOD_DIV_CODE:"D"`, L66 종가 `bstp_nmix_clpr`(`mapIndexCandle`), L122 `.sort(date asc)`, L115-117 `if (data.rt_cd !== "0") throw makeKisBusinessError(...)`. transport 오류는 L105 `makeKisTransportError` throw. 종가 ≤0/빈 date 필터 |
| 판정 | PASS (코드 정합) — 실응답 필드 매핑은 §3 라이브 확인 |

### AC-2 (벤치마크 매핑)

| 항목 | 값 |
|---|---|
| 재현 절차 | `getMarketByTicker`/`resolveBenchCode` + search.test 실행 + symbols.json 직접 조회 |
| 기대 결과 | `getMarketByTicker("005930")="KOSPI"`, 미수록→null. `resolveBenchCode` KOSPI→`0001`/KOSDAQ→`1001`/미수록→`0001`. 추가 API 호출 0 |
| 실측 결과 | `search.ts::getMarketByTicker` 는 오프라인 `SYMBOLS`(symbols.json 의 `symbols` 배열, 2611종목) 역참조 — node 직접 조회 시 `005930 → market:"KOSPI"` 확인. `relativeRunScoring.ts::resolveBenchCode` L33-38 KOSPI→`BENCH_INDEX_CODE.KOSPI`(0001)/KOSDAQ→1001/그 외→`BENCH_FALLBACK_CODE`(0001). search.test 6 tests PASS(005930→KOSPI→0001, 999999→null→폴백 0001). API 호출 없음(시드 인메모리) |
| 판정 | PASS |

### AC-3 (excess 측정·시장 베타 차단)

| 항목 | 값 |
|---|---|
| 재현 절차 | PRD 정확 수치를 `scoreOutcome` 방향 규칙으로 독립 재현 + measureRelative 통합 테스트 + cron fixture 테스트 |
| 기대 결과 | 시장 -5%·종목 -1%·OVERWEIGHT → abs -1(절대 flat) 이나 excess +4 → **hit**. 시장 -5%·종목 -4%·UNDERWEIGHT → abs -4(절대 hit) 이나 excess +1 → **flat** |
| 실측 결과 | 독립 재현(node): OVERWEIGHT abs=-1→flat / excess=+4→hit ✓, UNDERWEIGHT abs=-4→hit / excess=+1→flat ✓ (PRD 4건 전부 일치). `relativeScoring.test` "시장 베타 함정" + "진짜 알파" PASS. `relativeScoreDecisions.test` "시장 베타 함정 차단: 시장 -5%, 종목 -1%, OVERWEIGHT … excess +4 → hit" cron fixture PASS(d1ExcessReturnPct≈4, d1Regime=down) |
| 판정 | PASS — 하락장 베타 hit 제거 검증 |

### AC-4 (β/alpha·모드 선택)

| 항목 | 값 |
|---|---|
| 재현 절차 | `estimateBeta`/`computeAlphaResidual`/`selectScoringMetric` + measureRelative 폴백 테스트 |
| 기대 결과 | β=cov/var(정확 선형 1.5×지수→1.5), 표본<min·분산0→null. beta_adjusted+β null→excess 폴백. mode 별 지표 정확 |
| 실측 결과 | `estimateBeta` 단순선형회귀(L75-94), varX≤0 시 null(L92), n<minPairs 시 null(L73). 테스트: 1.5×→β≈1.5, 표본<5→null, 분산0→null PASS. `computeAlphaResidual` abs−β·bench(β null→null) PASS. `selectScoringMetric` absolute/excess/beta_adjusted + `alphaResidualPct ?? excessReturnPct` 폴백(L159) PASS. measureRelative "beta_adjusted+β null → excess 폴백(반쯤 만든 상태 금지)" PASS. cron L265-272 `priorCloses`(entry **직전** 윈도우, look-ahead 없음) 사용 |
| 판정 | PASS |

### AC-5 (regime 분류·±T 경계)

| 항목 | 값 |
|---|---|
| 재현 절차 | `classifyRegime`/`scoreRelativeOutcome` 경계 테스트 |
| 기대 결과 | bench ≥+1.5 up / ≤-1.5 down / 사이 flat(경계 포함). scoreRelativeOutcome 이 ±T 경계(r=+T hit, r=-T miss) 동일 적용. 지표 null→null(보류) |
| 실측 결과 | `classifyRegime` L130-132: +T→up, -T→down, 그 외 flat(REGIME_THRESHOLD_PCT=1.5). 테스트: +1.5→up, -1.5→down, +1.0→flat, 0→flat, null→null PASS. `scoreRelativeOutcome` L174 `metricPct===null→null`, 그 외 phase-1 `scoreOutcome` 위임. 테스트: BUY +T→hit, -T→miss, 0→flat, UNDERWEIGHT -1→hit, null→null PASS |
| 판정 | PASS |

### AC-6 (backfill 멱등)

| 항목 | 값 |
|---|---|
| 재현 절차 | `relativeScoreDecisions.test` backfill·결정론 + `needsProcessing`/`getRowsNeedingRelativeScoring` 인스펙션 |
| 기대 결과 | 이미 hit·bench null horizon → 재계산해 bench/excess 채움(backfilled↑), status 주 지표 갱신. skipped 미처리. 재실행 시 추가 갱신 0 |
| 실측 결과 | `needsProcessing` L122-124: 확정(hit/miss/flat) & `benchReturnOf===null` → process+backfill, skipped 제외(L126). 테스트 "이미 hit 인데 bench 비어있는 → 재계산(backfilled≥1)" PASS(d1BenchReturnPct≈0.5, d1ExcessReturnPct≈2.5, d1Status=hit 유지, m1 skipped 그대로·bench null 유지). "결정론: 2회 실행 → 같은 결과" PASS(r2.scored=0). store `getRowsNeedingRelativeScoring` OR 절(`${h}_status.in.(hit,miss,flat) and ${h}_bench_return_pct.is.null`)이 SQL backfill 부분 인덱스 조건과 정합 |
| 판정 | PASS (로직·멱등) — prod 실데이터 backfill 카운트는 §3 라이브 확인 |

### AC-7 (fail-soft)

| 항목 | 값 |
|---|---|
| 재현 절차 | `relativeScoreDecisions.test` fail-soft 3종 + 라우트 catch 인스펙션 |
| 기대 결과 | 지수 fetch throw → 해당 ticker pending 유지(skip 오확정 금지, errors↑). 종목 fetch throw → pending. 지수 성공 빈 배열(entry 지수 부재) → excess 측정 불가 → pending 보류(scored 0). cron 200 |
| 실측 결과 | cron L247-255: 종목·지수 둘 다 throw 전파(폴백 없음) → ticker catch 가 errors++ 후 continue(행 미변경). 테스트: 지수 throw→errors 1·scored 0·d1Status pending ✓ / 종목 throw→errors 1·pending ✓ / 지수 빈배열→bench null→measureRelative status null(L345-352, backfill 아니면 pendingKept)→scored 0·pending ✓. 라우트 `score-decisions/route.ts` L51-61 전체 throw 도 `return NextResponse.json({ok:false,...},{status:200})`. `relativeRunScoring` 은 `fetchWithTransientRetryOrThrow`(transient 1회 재시도 후 throw) 사용 |
| 판정 | PASS — 영구 skip 오확정 방지 검증 |

### AC-8 (집계·자가교정 excess)

| 항목 | 값 |
|---|---|
| 재현 절차 | `summarize.ts`/`calibration.ts` diff + summarize/calibration 테스트 + 라벨 카피 |
| 기대 결과 | hit/miss/flat = status(excess) 기준. abs 적중률 별도 병기. regime 차원 셀 생성. 프롬프트 요약이 "시장 대비 초과수익" 명시 |
| 실측 결과 | `summarize.ts` status(=excess cron 산출) 카운트 유지 + `addAbs`(returnPct+verdict 재판정)로 absHit/absMiss 별도 누적 → 셀에 `absHitRate`/`absSample` 병기. `regimeMap` 신규 차원(regime\|horizon). 테스트 7 PASS. `calibration.ts` 셀 hit/miss 가 excess 기준이라 자가교정 자동 excess, 프롬프트 문구 "**같은 기간 시장(KOSPI/KOSDAQ) 대비 초과수익**으로 … (시장 베타 제거·알파 기준)". 테스트 12 PASS. `labels.ts` `COL_HIT_RATE_EXCESS/ABS`, `REGIME_LABEL`, `METRIC_NOTE_EXCESS`, `METRIC_MODE_LABEL` 추가 |
| 판정 | PASS |

### AC-9 (무회귀)

| 항목 | 값 |
|---|---|
| 재현 절차 | §0 4게이트 + phase-1 모듈 diff 확인 + 분석 SSE 경로 인스펙션 |
| 기대 결과 | lint/tsc/test/build 통과. phase-1 `scoreOutcome`·기존 테스트 무변경 통과. 분석 SSE·기존 화면 무회귀 |
| 실측 결과 | §0 4게이트 전부 PASS. `git diff main...HEAD` 기준 `scoring.ts`/`scoreDecisions.ts`/`runScoring.ts` **무변경**(v1 보존, 비파괴 — v2 가 별도 파일). 기존 테스트(summarize/calibration/scoreDecisions)는 신규 필드 null 추가만(파괴 변경 없음). ai-analysis SSE: `benchKey: resolveBenchCode(ticker)`(순수 오프라인 lookup·throw 불가)가 기존 fail-soft 채점 append 블록(주석 "실패해도 SSE 스트림 안 막음", try/catch 내부)에 추가됨. cron 라우트는 v1→v2 drop-in(동일 try/catch·게이트·200). build 43/43 정적 페이지 = `/dashboard/scorecard` 포함 |
| 판정 | PASS |

---

## 2. 에지 케이스 검증

| # | 시나리오 | 처리 | 근거 | 판정 |
|---|---|---|---|---|
| E1 | 거래소/지수 서버 다운(지수 fetch throw) | ticker pending 유지, errors++, 다른 ticker 계속, cron 200 | AC-7, `relativeScoreDecisions` L247-255 + 라우트 catch | PASS |
| E2 | API 레이트리밋(EGW00201/transient) | `fetchWithTransientRetryOrThrow` 1회 재시도 후 throw→pending(오확정 없음). 지수 청크 간 150ms delay·ticker 간 delay | `relativeRunScoring` L46-54, `indexChartChunked` CHUNK_DELAY_MS | PASS |
| E3 | 네트워크 지연/부분 응답(지수 빈 배열) | entry 지수 종가 부재 → bench null → excess null → status null → pending 보류(scored 0) | AC-7 빈배열 테스트, cron L329-353 | PASS |
| E4 | 종목 상폐(봉 부재 "skip") | status=skipped 확정(상대 측정 불가, bench/excess null), backfill 대상 제외 | cron L289-306, `needsProcessing` skipped 제외 | PASS |
| E5 | entry≤0(분모 보호) | abs null → skipped(L308-325) | `computeReturnPct` entry≤0→null | PASS |
| E6 | 신규 상장(symbols.json 미수록) | 벤치 폴백 KOSPI(0001) — PRD §6 한계 명시(시드 대부분 커버, 보수적 근사) | `resolveBenchCode` L37 | PASS(설계 수용) |
| E7 | β 표본 부족/지수 무변동 | β=null → beta_adjusted 는 excess 폴백(기본 모드 excess 라 무영향) | AC-4, `estimateBeta` null 경로 | PASS |
| E8 | backfill 재실행(멱등) | 이미 bench 채워진 horizon 재처리 안 함 → 추가 갱신 0 | AC-6 결정론 테스트 | PASS |
| E9 | 봉 미도래(평가시점 전) | pending 유지(pendingKept), backfill 은 현상 유지 | cron L283-287 | PASS |
| E10 | regime/±T 경계값(±1.5%, ±T) | 경계 포함 규칙 결정론(부동소수 toBeCloseTo) | AC-5 경계 테스트 | PASS |

> 뉴스 피드 장애: 본 PR 범위(채점 cron·지수 fetch)에 뉴스 의존 경로 없음 — N/A.

---

## 3. 운영자 라이브 확인 항목 (prod Supabase + 실지수 데이터 필요 — 임의 pass/fail 금지)

다음은 코드 정합은 PASS 이나 **prod 환경·실데이터** 없이는 종결 불가하여 운영자 검증으로 분류한다.

### ⚠️ 선행조건 (배포/머지 전 필수)
- **신규 SQL 마이그레이션 prod 선적용**: `docs/sql/signal-scorecard.sql` 의 +50줄(신규 멱등 컬럼 `bench_key` + horizon별 `*_bench_return_pct`/`*_excess_return_pct`/`*_beta`/`*_alpha_residual_pct`/`*_regime` + regime check 제약 + backfill 부분 인덱스)을 **코드 머지/배포 전 prod Supabase 에 수동 선적용**해야 한다. 미적용 시 `getRowsNeedingRelativeScoring`(SELECT_COLS 가 신규 컬럼 참조)·`updateHorizonScore`·insert 가 컬럼 부재로 실패할 수 있다. 비파괴(`add column if not exists`)라 기존 abs 경로엔 무영향.

### 라이브 확인 체크리스트
| L# | 항목 | 절차 | 기대 | 관련 AC |
|---|---|---|---|---|
| L1 | 실지수 TR 응답 필드 | prod 에서 `fetchIndexDailyChart("0001", from, to)` 단건 호출 | output2 의 `bstp_nmix_clpr` 종가가 `{date,close}` 오름차순으로 반환(필드명 실응답 일치) | AC-1 |
| L2 | cron 1회 backfill 멱등 | SQL 선적용 후 score cron 1회 → 헬스 마커 `scorecard:cron:meta` 의 `backfilled` 카운트 | pending+bench null 행이 상대값으로 채워지고, 2회차 backfilled 0(추가 갱신 없음) | AC-6 |
| L3 | excess status 갱신 | 기존 절대채점 행이 excess 기준 status 로 재산출(특히 과거 하락장 UNDERWEIGHT 베타 hit 가 flat 으로 정정되는지) | 시장 동반 하락 자동 hit 제거 | AC-3, AC-8 |
| L4 | UI 렌더 | `/dashboard/scorecard` 에서 적중률(초과)/적중률(절대) 병기 + "시장 국면별" 필터 노출, 작은 N 표기 | excess 주표시 + abs 참고 + regime 차원 | AC-8 |
| L5 | 분석 SSE 무회귀 | prod 종목 분석 1회 end-to-end | 스트림 정상 완료, 원장 insert 에 benchKey 캡처, 채점 실패가 스트림 미차단 | AC-9 |

---

## 4. 결함

없음. (자동/순수함수 검증 범위 내 결함 0건. 위 §3 은 결함이 아니라 환경 의존 미종결 항목.)

---

## 5. 최종 판정

- **자동 게이트(lint/tsc/test/build)**: 전부 PASS (Tests 424 passed / 1 skipped).
- **AC-1 ~ AC-9**: 코드 정합·순수함수·cron fixture 기준 **전부 PASS**. prod 실데이터 의존분(L1~L5)은 운영자 라이브 확인으로 분리.
- **결함**: 0건.
- **머지 가능 상태**: QA 게이트 통과. 단, **머지/배포 전 `docs/sql/signal-scorecard.sql` 신규 컬럼 prod 선적용** 이 운영 선행조건(PRD §6 명시). 라이브 확인(L1~L5)은 배포 후 운영자 모니터링 권장.
