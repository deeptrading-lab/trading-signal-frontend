# QA: value-picks-validated (frontend PR-1) — `/api/stock/snapshot`

- PRD: `dev-manager-bot` 레포 `docs/prd/value-picks-validated.md` §3-A, §5 (AC-1~3)
- PR: #137 (trading-signal-frontend), 브랜치 `feature/value-picks-validated`
- 범위: **frontend 수용 기준 AC-1~3만** 검증. 봇 AC-4~9는 PR-2(dev-manager-bot)에서 별도.
- 판정: **qa-passed** (AC-1~3 전부 통과, 실패 0건). 자동검증 불가한 prod 전용 항목은 "수동 검증 잔여"로 분리.

---

## 1. 검증 환경 · 명령

| 항목 | 명령 | 결과 |
|------|------|------|
| 단위 — snapshot 로직 + route | `npx vitest run lib/server/stock/__tests__/snapshot.test.ts app/api/stock/snapshot/__tests__/route.test.ts` | **21 passed** (snapshot 12 + route 9) |
| 전체 vitest 스위트 | `npx vitest run` | **288 passed / 1 skipped** (1 skipped = pre-existing live backtest `liveBacktest.test.ts`) |
| 타입 체크 | `npx tsc --noEmit` | **통과** (exit 0) |
| eslint(변경 파일) | `npx eslint app/api/stock/snapshot lib/server/stock/snapshot.ts lib/types/stock/snapshot.ts lib/mock/stock/snapshot.ts lib/api/kis/price.ts` | **통과** (exit 0) |
| eslint(전체) | `npx eslint .` | **통과** (exit 0, 0 warning) |

기존 테스트 무회귀(288 passed). 봇이 호출할 prod KIS 실데이터(외국인지분율·시장구분·레이트리밋)는 KIS prod 키가 필요해 자동 불가 → §4 수동 검증 잔여.

검증 파일 정독:
- `app/api/stock/snapshot/route.ts` (HTTP·헤더·부분실패·타임아웃)
- `lib/server/stock/snapshot.ts` (지표·집계·조립 순수 로직)
- `lib/types/stock/snapshot.ts` (스키마·null 규약)
- `lib/mock/stock/snapshot.ts` (mock fixture)
- `lib/api/kis/price.ts` (`fetchStockPriceWithShares` — `lstn_stcn` 분리 추출)
- `lib/api/kis/chartChunked.ts` / `investor-flow.ts` / `stock-info.ts` (소스 TR 정합)
- 테스트: `app/api/stock/snapshot/__tests__/route.test.ts`, `lib/server/stock/__tests__/snapshot.test.ts`

---

## 2. 수용 기준별 재현 절차 + 기대/실제

### AC-1 (계약 충족) — 통과

> `GET /api/stock/snapshot?ticker=005930` 응답에 최상위 필드(`ticker`,`name`,`market`,`asOf`,`price`,`valuation52w`,`marketCapKRW`,`foreignRatioPct`,`technical`,`investorTrend`) 전부 포함, 산출 불가 수치는 필드 생략이 아니라 `null`.

**재현 절차 (자동)**
1. `npx vitest run app/api/stock/snapshot/__tests__/route.test.ts -t "최상위 필드"`
2. `npx vitest run lib/server/stock/__tests__/snapshot.test.ts -t "최상위 필드 전부"`

**기대 결과**: 10개 최상위 키 모두 존재. 일봉/수급/시총 산출 불가 그룹은 객체 유지 + 내부 수치 `null`(키 누락 아님).

**실제 결과**: 통과.
- route 테스트 `[AC-1] 정상`: `body` 가 10개 키 전부 보유, `body.market === "KOSDAQ"`, `X-Data-Source: kis` + `X-KIS-Env: prod`.
- snapshot 테스트 `[AC-1] 최상위 필드 전부`: `Object.keys(snap).sort()` 가 정확히 10키와 일치.
- snapshot 테스트 `[AC-1] 산출 불가 그룹은 필드 생략이 아니라 null`: `candles=null`/`investors=null`/`listedShares=null` 입력 시 `marketCapKRW=null`, `valuation52w={high:null,low:null,positionPct:null}`, `technical.sma5=null`, `investorTrend.orgNetBuyAmountKRW=null` — 생략 아닌 명시 `null`.

**코드 근거**: `assembleSnapshot`(`lib/server/stock/snapshot.ts:256`)이 항상 10키를 가진 평면 객체를 반환하고, 산출 불가 시 `computeValuation52w`/`computeTechnical`이 내부 필드를 `null`로 채운다. 타입 `StockSnapshot`(`lib/types/stock/snapshot.ts:88`)이 `number | null` 로 계약 고정.

---

### AC-2 (유동성·수급 핵심필드) — 통과

> `price.tradeAmountKRW = current*volume` 산출. `investorTrend.orgConsecutiveSellDays`·`orgNetBuyAmountKRW`가 `fetchInvestorTrend` 집계로 채워짐. 기관 N일 연속 순매도 종목에서 `orgConsecutiveSellDays >= 1`.

**재현 절차 (자동)**
1. `npx vitest run app/api/stock/snapshot/__tests__/route.test.ts -t "tradeAmountKRW"`
2. `npx vitest run lib/server/stock/__tests__/snapshot.test.ts -t "aggregateInvestorTrend"`

**기대 결과**: `tradeAmountKRW = 현재가×거래량`. 수급은 KIS 백만원 단위 → ×1,000,000 환산해 원으로. 기관 5일 연속 순매도 fixture → `orgConsecutiveSellDays = 5`(>= 1).

**실제 결과**: 통과.
- route `[AC-2]`: `body.price.tradeAmountKRW === 12450*5230`, `body.marketCapKRW === 12450*6763000`, 기관 5일 합(-380백만) → `orgNetBuyAmountKRW === -380*1_000_000`, `orgConsecutiveSellDays === 5`.
- snapshot `aggregateInvestorTrend`: lookback(5) 합산 — `lookbackDays(5)` 밖 6번째 일자는 합산 제외(`-320*1_000_000`), 외국인 `35*1_000_000`. 연속 순매도는 최신([0])부터 음수 연속 카운트(`3`/`1`), 빈 배열 → `null`.

**코드 근거**: `assembleSnapshot`의 `tradeAmountKRW: Math.round(current*volume)`(`snapshot.ts:291`), `aggregateInvestorTrend`(`snapshot.ts:167`)의 `MILLION` 환산 + `countConsecutiveSell`. 단위 정합: `StockInvestorDay.orgNetBuyAmount` 가 **백만원**(`lib/types/stock/investors.ts:7,29`)이고 `fetchInvestorTrend`(`investor-flow.ts:163`)이 그대로 매핑하므로 ×1,000,000 환산이 옳다.

**관찰(결함 아님)**: 합산(`orgNetBuyAmountKRW`)은 `days.slice(0, lookbackDays)` 기준, 연속 순매도 카운트는 `trend.days`(전체) 기준 — 의도된 차이. 합산은 "최근 N일 합", 연속일은 "최근 기준 연속(N 경계 무관)"이라는 PRD §3-A-2 의도(주석 `snapshot.ts:185-186`)와 일치. KIS `inquire-investor`는 다음조회 불가라 days 길이가 제한적이므로 실데이터에서도 안전.

---

### AC-3 (컨벤션·폴백) — 통과

> `isKisConfigured()` 미설정 시 mock + `X-Data-Source: mock`. `ticker` 미지정 400. 일부 KIS TR 실패 시 200 + 산출 가능 필드만 + 실패 필드 `null` + `X-Data-Source` 부분/오류 신호.

**재현 절차 (자동)**
1. ticker 미지정/형식불량 400: `npx vitest run app/api/stock/snapshot/__tests__/route.test.ts -t "400"`
2. mock fallback: 같은 파일 `-t "KIS 미설정"`
3. 부분 실패: `-t "일봉 실패"`, `-t "수급 실패"`, `-t "vts 환경"`, `-t "가격 그룹 전체 실패"`

**기대/실제 매핑**:

| 시나리오 | 기대 | 실제 | 코드 근거 |
|----------|------|------|-----------|
| ticker 누락 | 400 | `400` | `route.ts:60` 빈 문자열 체크 |
| ticker 6자리 아님(`12ab`) | 400 | `400` | `route.ts:66` `TICKER_RE=/^\d{6}$/` |
| `isKisConfigured()` false | 200 + `X-Data-Source: mock`, KIS 미호출 | `mock` + `fetchStockPriceWithShares` 미호출, mock 도 10키 충족 | `route.ts:74` → `getMockStockSnapshot` |
| 일봉 TR 실패(나머지 정상) | 200 + 일봉 필드 null + `kis-partial`, 가격·수급 생존 | `valuation52w.high=null`, `technical.sma5=null`, `trendRegime=null`; `tradeAmountKRW` 생존, `orgConsecutiveSellDays=5` 생존; `kis-partial` | `route.ts:113,131` `Promise.allSettled` 그룹별 흡수 |
| 수급 TR 실패 | 200 + 수급 필드 null + `kis-partial`, 기술 생존 | `orgNetBuyAmountKRW=null`, `orgConsecutiveSellDays=null`; `technical.sma5` 생존 | `route.ts:115,131` |
| vts 환경 | 시장 생략(null) + `search-stock-info` 미호출 + `kis-partial` 아님 | `fetchStockInfo` 미호출, `market=null`, `X-Data-Source: kis` | `route.ts:95-96` info 는 prod 한정, vts 는 `Promise.resolve(null)` 로 fulfilled → 부분신호 미발생 |
| 가격 그룹 전체 실패 | 산출 불가 → 502 | `502`, 에러 메시지 한글 통과("현재가…") | `route.ts:107-109` price 실패 시 throw → `mapErrorToResponse` 502 |
| 전체 타임아웃(8초) | mock degrade + `mock-timeout` | (자동 미실행 — 코드 경로 확인) | `route.ts:79` `withTimeout(...,8000)` → 센티넬 → `route.ts:150` `mock-timeout` |

**실제 결과**: 위 7개 자동 시나리오 전부 통과. 타임아웃 분기(`mock-timeout`)는 별도 테스트 케이스는 없으나 `mapErrorToResponse`의 `BFF_TIMEOUT_SENTINEL` 분기 코드가 존재하고 `withTimeout`(`bffUtils.ts:19`)이 센티넬 에러를 던지는 경로가 확인됨. `X-Data-Source` 가 `kis`/`kis-partial`/`mock`/`mock-timeout` 4상태로 부분/오류를 신호 → AC-3 충족.

---

## 3. 에지 케이스 (거래소/네트워크/레이트리밋/피드 장애)

| 에지 | 동작 | 검증 상태 |
|------|------|-----------|
| **KIS 레이트리밋(EGW00201)** — 일봉 청크/수급 동시 호출 시 초당 한도 | 해당 그룹만 rejected → `null` + `kis-partial`(전체 실패 아님). 일봉은 청크 간 150ms 지연(`chartChunked.ts:16`)으로 자체 회피. | 부분 실패 자동 테스트로 커버(일봉/수급 reject → 200+null). 실제 EGW00201 빈도는 §4 수동 |
| **거래소/KIS 서버 다운** — 가격 TR 5xx | 가격 그룹 실패 → 502 + 한글 메시지(산출 불가, 미검증 노출 방지). 봇은 보류=탈락 처리(PRD §3-B-2) | route `[AC-3] 가격 그룹 전체 실패` 통과 |
| **네트워크 지연 → 8초 초과** | `withTimeout` 센티넬 → mock degrade + `X-Data-Source: mock-timeout` + `X-Error` 안내. 봇 타임아웃(8초)과 정합 | 코드 경로 확인(전용 테스트 부재 — 경미) |
| **일봉 봉수 부족**(신규상장 등) | `computeValuation52w`/`computeTechnical` 가 룩백 미확보 필드만 `null`(SMA60/모멘텀20 등), 가능한 필드는 산출. `computeRegime` 룩백 미확보 시 `trendRegime=null` 안전 폴백 | snapshot `캔들이 비면…`/`충분한 봉` 통과 |
| **수급 days 빈 응답** | 합산·연속일 전부 `null`(봇이 핵심필드 null → 미노출) | snapshot `days 가 비면…` 통과 |
| **prod 외 환경(vts/mock)** — 시장구분/외국인지분 부정확 | `market=null`(vts info 미호출), `foreignRatioPct` 는 mock/null. 봇 null 처리(PRD §3-B-3)에 위임 | route `vts 환경` 통과 |
| **시총 산출 불가**(`lstn_stcn` 0/없음) | `marketCapKRW=null`(`fetchStockPriceWithShares` `listed>0` 가드, `snapshot.ts:148`) | snapshot null 규약 테스트 커버 |
| **changePercent span=0**(52주 고저 동일) | `positionPct=null`(0 나눗셈 방지, `snapshot.ts:75`) | 코드 가드 확인 |

---

## 4. 수동 검증 잔여 (prod KIS 키 필요 — 자동 불가, 4건)

아래는 실 KIS prod 호출이 있어야만 확인 가능. AC-1~3 자동 판정과 무관(스키마·집계·폴백 로직은 mock 으로 전부 검증됨)하나, **봇 PR-2 통합 전/배포 후 운영 점검**으로 남긴다.

1. **외국인지분율 실값**: `foreignRatioPct` 는 prod inquire-price `frgn_hldn_qty/hgpr` 계열에서만 정확. mock/vts 는 mock 값/null. → prod 키로 실제 종목(예 005930) 호출해 0~100% 범위·합리값 확인.
2. **시장구분(KOSPI/KOSDAQ)**: `search-stock-info`(CTPF1002R)는 **prod 전용**. KOSPI(005930)/KOSDAQ(092130) 각 1건 호출해 `market` 정확 매핑 확인. vts 는 의도적 `null`.
3. **기관 연속 순매도 실데이터 사례**: PRD 사례(동원개발 013120 기관 5일 연속 순매도)를 prod 에서 호출해 `orgConsecutiveSellDays`·`orgNetBuyAmountKRW` 부호·규모가 실제 수급과 일치하는지 1회 확인.
4. **레이트리밋 실빈도**: 후보당 ~6 KIS 콜(일봉 청크 3 포함) × 라운드 후보 수(시장별 5~6)일 때 EGW00201 발생 빈도. 잦으면 청크/동시성 조정(PR 본문 "운영 모니터링" 항목과 동일).

---

## 5. 판정

| AC | 결과 |
|----|------|
| AC-1 (계약 충족) | 통과 |
| AC-2 (유동성·수급 핵심필드) | 통과 |
| AC-3 (컨벤션·폴백) | 통과 |

**실패 0건.** AC-1~3 전부 통과 → **qa-passed**. 수동 검증 잔여 4건은 prod 전용으로 자동 판정 범위 밖(별도 운영 점검).

라벨 게이트: PR #137 본문에 `## 다음 작업` 섹션 존재 확인 — handoff-append workflow 안전(빈 HANDOFF 항목 없음).
