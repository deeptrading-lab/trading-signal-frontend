# PRD — intraday-warnings (단타 지면에 매수 유의사항 배선)

- 작성: PM 역할 (2026-07-03)
- 브랜치: `feature/intraday-warnings`
- 선행: PR #204 `stock-warnings`(§4 후속으로 명시). #203 단타워치 ↔ AI 모의투자 통합.

## 1. 배경 / 문제

#204 로 토스 매수 유의사항(`fetchActiveWarnings`)과 칩 뷰모델(`toWarningChips`)이 생겼다.
#203 으로 단타 자동틱 루프(서버 스케줄러 60초 체크·동시 3세션)가 생겨, **VI(변동성완화장치,
이 API의 유일한 실시간 계열) 정보를 소비할 수 있는 유일한 자동 루프**가 됐다. 그런데 현재:

- 단타 틱 판단 컨텍스트(`formatIntradayContext`)에 시그널·레벨·포지션은 있지만 **시장경보·VI
  가 없다** → VI 로 단일가 냉각 중인 종목에도 판단가가 "지금 진입" 결정을 낼 수 있다.
- 단타워치 후보(거래량 상위)는 정확히 단기과열·투자경고가 밀집하는 종목군인데(오늘 실측:
  거래량 상위 금호전기·금호건설 = 투자경고), 세션을 **만들기 전에** 지정 상태를 알 수 없다.

## 2. 목표 (측정 가능)

- 단타 틱 판단 시 활성 경보가 있으면 두 에이전트(흐름 분석가·진입 판단가) 공유 컨텍스트에
  "매수 유의" 1줄이 주입된다. 없으면 무주입(무회귀). on-demand 판단 카드도 동일 적용.
- 단타워치 표의 워치 종목 행 + 추천 후보 칩에 활성 경보 칩이 뜬다.
- 토스 키 없는 로컬(동료 머신)에서 동작 무변경: 주입·칩 모두 없음, 판단 루프 무회귀.

## 3. 범위 (In scope)

### 3-1. 배치 조회 인프라

- `fetchActiveWarningsBatch(symbols, concurrency=5)` — `fetchActiveWarnings` 를 동시성 제한
  fan-out(토스 `STOCK` 5/s 준수), 기존 60s 캐시 재사용. 반환 `Record<ticker, StockWarningItem[]>`.
- BFF `GET /api/stock/warnings/batch?tickers=a,b,c` — 최대 50개 캡(가시 union 저장워치 20 + 후보
  14+14 을 덮음, 초과분 로그 후 절단), `X-Data-Source: toss|none`. 키 없으면 빈 맵.
- 클라이언트 `getStockWarningsBatch` + `useQueryStockWarningsBatch(tickers)` (staleTime 60s).

### 3-2. ⑥a 틱 판단 컨텍스트 주입

- `IntradayContext.warnings?: StockWarningItem[]` 추가.
- `decideIntradayWithCli` 에서 **사전 게이트 통과(LLM 실제 호출) 시에만** fail-soft 페치·attach
  (변화없음 스킵 틱은 페치 안 함 — 낭비 방지). `formatIntradayContext` 에 `[매수 유의]` 줄.
- 틱 루프(`intradayTickDecision`)와 on-demand 카드(`read.ts`) 둘 다 이 경로를 지나 자동 적용.

### 3-3. ⑥b 후보·워치 칩

- `IntradayWatchWorkspace` 가 가시 티커(워치 행 + 추천 후보) union 으로 배치 훅 1회 호출 →
  `warningsByTicker` 를 표·칩에 내려준다.
- `IntradayWatchTable` 행: 종목명 옆 경고 칩. `CandidateChips`: 후보 칩에 경고 라벨 병기.
  실패·빈 배열·키 없음 = 미표시.

## 4. 비범위 (Out of scope — FOLLOWUPS)

- ④ 시그널 룰 엔진 게이트(정리매매·투자위험 하드 제외), ⑦ 스코어카드 지정 이벤트 스탬프,
  ③ 밸류트랩 스냅샷, ⑤ 관심종목(watchlist) 행 배지.
- `virtualExecution` 이 VI 중 체결을 지연/단일가 반영하는 시뮬 정교화(v2).
- VI 이력 적재(API 는 현재 활성만 제공).

## 5. 수용 기준 (AC)

| # | 시나리오 | 기대 |
|---|---|---|
| AC-1 | 토스 키 없음(동료 로컬) | 주입·칩 없음, 배치 무호출, 틱 판단 무회귀 |
| AC-2 | 활성 경보 없는 종목 | 컨텍스트에 유의 줄 없음, 칩 없음 |
| AC-3 | 지정 종목(단기과열/투자경고) | 컨텍스트 `[매수 유의]` 1줄 + 표/후보 칩 |
| AC-4 | 변화없음 스킵 틱 | 경보 페치 안 함(LLM 미호출 경로 — 낭비 방지) |
| AC-5 | 배치 캡 | tickers>50 이면 50개로 절단 + 로그(무음 절단 금지). 정상 가시 union 은 미절단 |
| AC-6 | 배치 동시성 | 최대 5 동시(5/s 준수), 중복 티커는 캐시로 1콜 |
| AC-7 | 페치 실패 | 빈 맵 fail-soft, 표/판단 진행 무영향 |

## 6. 데이터 / API

- 원천 = #204 `fetchActiveWarnings` (토스 warnings, never-throw). 본 PR 은 배치 fan-out·주입·표시만
  추가하고 조회 규약(60s 캐시·unknown code·날짜 null 무시)은 그대로 상속.

## 7. 릴리즈 / 운영

- 한 브랜치 한 PR, 라벨 게이트 후 사용자 승인 머지. prod 는 TOSS 키 미설정이라 dormant(무변경).
- 틱 주입은 로컬 CLI 단타(Vercel 미지원)에서만 의미 — prod 서버리스에선 어차피 단타 루프 no-op.

## 8. 영향 분석

- `IntradayContext` 필드 추가(옵셔널) — 기존 프롬프트는 warnings 없으면 줄 미출력(무회귀). 게이트
  로직(`evaluatePreGate`/`applyPostGate`)은 warnings 미참조 → 결정 로직 무변경.
- 신규 토스 콜: 틱당 최대 1(LLM 호출 시, 60s 캐시) + 워치 페이지 배치(가시 티커, 60s 캐시).
- `decideIntradayWithCli` 에 fail-soft 페치 1줄 추가 — 게이트 스킵 틱은 미페치라 비용 0.

## 9. OPEN QUESTION

- q1. 후보 칩에 경보를 라벨 텍스트로 병기 vs 아이콘만 — **PM 권고: 텍스트 라벨**(단기과열/투자경고
  구분이 픽 결정에 중요, 아이콘은 모호). 좁은 칩이라 최상위 심각도 1개만 표기.
- q2. 틱 주입 줄을 흐름 분석가·판단가 양쪽에 vs 판단가만 — **PM 권고: 양쪽**(공유
  `formatIntradayContext` 라 자연히 양쪽, 분석가도 세력/변동성 진단에 VI 참고 유익).
