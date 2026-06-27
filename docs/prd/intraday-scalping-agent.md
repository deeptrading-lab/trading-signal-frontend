# PRD — intraday-scalping-agent (장중 단타 경량 AI 판단 시스템)

- **slug**: `intraday-scalping-agent`
- **작성일**: 2026-06-28
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **대상 브랜치**: `feature/intraday-scalping-agent`
- **UI 포함 여부**: **부분** — Phase 1 은 기존 paper-trading 세션 뷰 + 틱별 결정 로그 재사용(신규 단타 전용 UI 는 Phase 1.5 로 분리).
- **상위 컨텍스트**: `ai-paper-trading`(가상 세션/틱 루프·`decisionProvider:"cli-agent"` seam), `signal-rule-engine`(결정론 4축 + 매물대/박스권/Triple Barrier), `signal-scorecard` 계열(신뢰도 측정), `investor-flow`(수급 랭킹). **`ai-paper-trading` PRD 가 예고한 "경량 CLI 판단 agent + 장중 분봉 판단"을 실제로 구현하는 PRD.**

---

## 1. 배경 / 문제

현재 "AI 종합분석"(`app/api/stock/ai-analysis/route.ts`)은 **12-에이전트 / 3-Phase / 일봉 200봉 / 최대 50분 / 웹서치 / 로컬 CLI** 파이프라인으로, 한 종목의 "전체적 투자 판단"을 깊고 느리게 내린다.

사용자가 원하는 것은 이와 **목적·속도·타임프레임이 다른 별도 시스템**이다.

- **장중(09:00~15:30)에 짧은 주기(분봉)로 한 종목의 매수/보유/매도를 반복 판단**하는 단타(데이트레이딩).
- 일봉에서 박스권·돌파매매·매물대를 보듯, **분봉으로 동일한 구조 판단**을 빠르게 수행.
- **2~5% 내외 소익**을 목표로 진입/청산 타이밍을 지속 판단.
- 장기적으로는 ① 경량 판단 에이전트 그룹(본 PRD) → ② 거래량·수급 몰리는 종목 자동 발굴 → ③ 신뢰가 쌓이면 매매 판단/집행까지 확장.

즉 무거운 종합분석의 **단타 축소판**을, 빠르고 정확하게 현재 분봉 흐름을 읽는 경량 에이전트 그룹으로 만든다.

### 1-1. 현재 구조 — 코드 추적 결과 (확정 사실, 읽기 전용 조사)

단타 루프의 토대 약 80% 가 이미 코드에 존재한다. **재사용이 본 PRD 설계의 1차 원칙.**

| 자산 | 위치 | 재사용 방식 |
|---|---|---|
| 결정론 시그널 엔진 | `lib/signal/engine.ts` `evaluateSignal()` | **순수 함수**(데이터 출처 무관). 4축(추세/모멘텀/거래량/변동성) + 레짐 게이트. 분봉 배열 그대로 입력 가능 |
| 구조 레벨(박스권/돌파/매물대) | `lib/signal/levels/` | `volumeProfile.ts`(매물대), `swingLevels.ts`(박스권 스윙 H/L), `structureBarrier.ts`(구조적 절대 TP/SL, ATR 폴백) — **이미 구현됨** |
| 백테스트 | `lib/signal/backtest/` | `backtest()`/`tripleBarrier`/`computeMetrics`/`computeAttribution` — Triple Barrier(WIN/LOSS/NEUTRAL), 룰별 attribution. 분봉 슬라이스로 재실행 가능 |
| 가상 운용 루프 | `lib/server/paperTrading/` | 세션/틱(`tickIntervalMinutes`, `runTick → decide → executeVirtualTrade`), `PaperTradingDecision` 스키마, `aiCliGate.ts`(로컬 전용 게이트) |
| **AI 판단 seam(비어 있음)** | `lib/types/paperTrading/paperTrading.ts` | `decisionProvider: "mock" \| "existing-ai" \| "cli-agent"` — 타입만 존재, **현재 `mock`만 구현**. 본 PRD 가 `cli-agent` 를 채운다 |
| 로컬 CLI 실행 | `lib/server/ai/agentCli.ts` | `invokeAgentCli()` + `--model`/effort 노브. **구독 CLI(claude/codex) 서브프로세스 — API 토큰 과금 0** |
| 수급 랭킹 | `app/api/flow/top10/route.ts` | 외국인·기관 거래대금 순매수 랭킹(당일+7일 누적). **Phase 2 종목 발굴 재료** |
| 신뢰도 측정 | `lib/server/scorecard/` | hit/miss/flat ±2%, 신뢰도 캘리브레이션, 상대/알파 채점. **Phase 3 재료** |

### 1-2. 핵심 제약 (이 PRD 설계를 좌우)

- **C1 — 실제 증권사 주문 실행은 프로젝트 스코프상 영구 비범위.** 조회·분석 전용 스코프(`project_read-only-analysis-scope`). KIS 키는 prod read-only. 집행 벡터는 **가상매매(paper-trading) 가상 체결**과 (후속) 검증된 신호의 인간 수동 위임까지로 한정.
- **C2 — 무거운 종합분석을 매 틱 돌리는 것은 금지.** 50분/12에이전트/웹서치는 분봉 단타 주기와 맞지 않는다. 본 시스템은 **결정론 코어가 정량 계산을 끝내고, 경량 CLI 에이전트가 판정만** 하는 별도 경로.
- **C3 — 분봉 데이터 페처가 부재(최대 공백).** KIS 분봉 엔드포인트(`inquire_time_itemchartprice` FHKST03010200 당일분봉 / `inquire_time_dailychartprice` FHKST03010230 과거 다일분봉)는 문서 카탈로그에만 있고 코드 미구현. 신규 페처가 모든 후속 작업의 선행조건.
- **C4 — 결정론 엔진은 일봉 보정 상태.** `MA{5,20,60,120}`·`MIN_BARS=130`·SMA120 레짐은 모두 일봉 가정. 분봉에 그대로 태우면 입력이 오염된다(§6 가정 참조). **타임프레임 인식 프로파일 + 일봉 레짐 폴백이 필수 선행.**
- **C5 — 로컬 전용.** CLI 서브프로세스 + 장중 스케줄러는 사용자 로컬 머신(`next dev`)에서만 동작. Vercel 환경은 `aiCliGate` 가 503/폴백 처리. 12에이전트 분석과 동일한 로컬 전용 제약.
- **C6 — 에이전트는 전부 로컬 CLI(구독), API 토큰 미사용.** 사용자 명시. `agentCli.ts` 경로를 그대로 타며 신규 `INTRADAY_MODEL`(haiku 기본) env 만 추가.
- **C7 — 제품 문구는 자문/일임처럼 보이면 안 됨.** "가상 체결", "AI 판단", "참고" 우선. 실제 주문 CTA 없음(`ai-paper-trading` C6 계승).

### 1-3. 확정된 제품 결정 (사용자, 2026-06-28)

| # | 결정 | 값 |
|---|---|---|
| D1 | 시작 범위 | **PRD/계획 먼저** — 본 문서가 산출물, 구현은 후속 세션 |
| D2 | 실행 벡터 | **가상매매 자동집행**(paper-trading 가상 체결 + PnL 추적). 실주문 영구 제외 |
| D3 | 에이전트 구성 | **2~3개 경량 그룹, 전부 로컬 CLI(구독), API 토큰 미사용** |
| D4 | 분봉/주기 | **백테스트 bake-off 로 결정**(3m/5m/15m), 기본 5분봉/5분 주기로 시작 |

---

## 2. 목표

- **G1 (측정 가능)**: KIS 분봉(당일/과거 다일) 데이터를 BFF 경유로 페치해 `StockMinuteCandle[]`(정렬키 = `YYYY-MM-DDTHH:mm`)로 제공한다.
- **G2 (측정 가능·★ 블로킹 게이트)**: 분봉 백테스트(`RUN_LIVE_INTRADAY=1`)로 **net-of-cost 엣지 존재**를 고수급/고베타 유니버스에서 증명한다(기준 §5 AC-3). 통과 전 LLM 미연결.
- **G3 (측정 가능)**: `decisionProvider:"cli-agent"` 세션의 한 틱이 결정론 시그널+레벨을 계산하고, 2~3 CLI 에이전트 그룹이 `IntradayDecision`(절대가 BUY/HOLD/SELL + target/stop)을 반환해 가상 체결까지 기록한다.
- **G4 (측정 가능)**: 가상 체결이 익절/손절/무효화/15:20 장막판 청산을 실제로 honor 한다(현재 `virtualExecution` 미처리 갭 해소).
- **G5 (측정 가능)**: 장중 로컬 스케줄러가 09:00~15:30 사이 N분마다 `/tick` 을 자동 트리거하며, 같은 틱 윈도 중복 호출은 멱등 처리된다.
- **G6 (무회귀)**: 기존 `lib/signal`(일봉)·`ai-analysis`·`scorecard`·`paper-trading(mock)` 흐름을 깨지 않는다. 분봉 프로파일은 옵션 주입, 일봉 기본값 불변.

---

## 3. 범위 (In scope — Phase 1)

> 순서가 곧 의존성이다. **검증(3-4)이 에이전트(3-5)보다 먼저.** 분봉 백테스트로 net 엣지를 증명하지 못하면 LLM 을 붙이지 않는다.

### 3-0. 아키텍처 — 결정론 코어 + 2~3 CLI 에이전트 그룹

```
 장중 로컬 스케줄러 (crontab */N 9-15 * * 1-5) → POST /api/paper-trading/sessions/:id/tick
                              ▼
 [결정론 코어 — 코드, LLM 아님]
   KIS 분봉 페처 → evaluateIntradaySignal(분봉, 프로파일, 일봉레짐) → 4축/레짐
                → structureBarrier + volumeProfile + swingLevels → 박스권/돌파/매물대 → 절대 TP/SL/RRR
                              ▼
 [룰 사전 게이트]  15:00 후 신규진입 금지 · RRR<1.5 스킵 · 일일손실 kill · 변화없음 스킵
                              ▼  통과 시에만 에이전트 호출
 [2~3 CLI 에이전트 그룹 — 전부 claude CLI(구독), 웹서치 off, haiku]
   ① 흐름·세력 분석가   결정론 요약 + 수급/거래량 → 셋업 진단(박스권 지지 / 돌파 / 매물대 저항)
   ② 진입·청산 판단가   ①진단 + 포지션·직전결정·최근틱 → IntradayDecision(절대가)
   ③ 리스크 게이트(선택) RRR·손절폭·레짐·장막판 기준 veto/강등  ※1차는 순수 룰로 대체 가능
                              ▼  실패/타임아웃 → 순수 결정론 폴백
 [룰 사후 게이트]  LLM 의 SL 확대·TP 상향·레짐 무시 강제 강등(BUY→HOLD)
                              ▼
 어댑터 → PaperTradingDecision → runTick → executeVirtualTrade(+익절/손절/무효화/15:20 청산) → 영속화
                              ▼
 신뢰 측정: paper-trading returnPct + 틱별 결정 로그  (실주문 없음)
```

**설계 근거**: 결정론이 박스권/돌파/매물대/TP·SL 를 모두 계산하므로 에이전트는 "없는 데이터 생성"이 아니라 "정량 후보 검증·확정·서사화"만 한다(환각 진입 차단). 2~3 직렬 CLI 콜(≈6~15초)은 5~10분 판단 주기에선 무시 가능한 지연이다. 전부 로컬 CLI(구독)라 토큰 과금 0.

### 3-1. 분봉 데이터 레이어

- `lib/api/kis/types.ts` (EDIT) — `KisInquireTimeItemChartItem` + `StockMinuteCandle = StockDailyCandle`(별칭, 타입 변동 0). **`date` 는 dedup/정렬 키이므로 반드시 `YYYY-MM-DDTHH:mm` 타임스탬프**(bare date 면 하루치가 1봉으로 붕괴 — 구조적 함정).
- `lib/api/kis/price.ts` (EDIT) — `fetchStockMinuteChart(ticker, timeframe, anchor)`. `fetchStockDailyChart`(FHKST03010100) 미러. TR `FHKST03010200`(당일분봉, 라이브 루프) / `FHKST03010230`(과거 다일분봉, 백테스트).
- `lib/api/kis/minuteChartChunked.ts` (NEW) — `chartChunked.ts` 복제. `FID_INPUT_HOUR_1` 역방향 페이징(now→09:00) + dedupe/asc + delay. 전일 1~2일 prefetch 로 warmup 충족.
- `app/api/stock/chart-minute/route.ts` (NEW) — `chart/route.ts` 복제. `GET ?ticker&timeframe&bars`, KIS 미설정→mock. 디버그/수동 표면(라이브 루프는 lib 함수 직접 호출).

### 3-2. 분봉 시그널 프로파일 (엔진 포크 금지 — seam 만)

- `lib/types/signal/index.ts` (EDIT) — `EvaluateOptions` 에 `indicators`(MACD/RSI/BB/ADX 주기)·`maPeriods`·`regimeOverride`(일봉 레짐 주입) 추가.
- `lib/signal/context.ts` (EDIT) — **유일한 지표 주기 주입점.** 현재 `buildContext` 가 지표 주기 인자를 폐기 → 프로파일 주기 전달. 기본 = 일봉 상수(회귀 0, 기존 테스트로 가드).
- `lib/signal/weights.ts` (EDIT) — 분봉 상수 세트(`MIN_BARS`/`SOFT_MIN_BARS`/`STRUCTURE_LOOKBACK` 등) export. 일봉 기본값 불변.
- `lib/signal/intradayProfile.ts` (NEW) — `INTRADAY_PROFILES[tf]`(3m/5m/15m별 주기·임계) + `evaluateIntradaySignal(candles, tf, dailyRegime)`. `regimeFilter:false` + 일봉 레짐 폴백 주입.

### 3-3. ★ 검증 게이트 (LLM 이전 — 진행/중단 결정)

- `lib/signal/backtest/__live__/intradayBacktest.test.ts` (NEW) — `liveBacktest.test.ts` 복제, `RUN_LIVE_INTRADAY=1` 게이트.
- 재사용(무수정): `backtest()`/`tripleBarrier`/`computeMetrics`/`computeAttribution`.
- `lib/signal/backtest/__fixtures__/min/<ticker>_<tf>.json` (NEW, 생성물) — 분봉 픽스처 캐시(KIS 분봉 히스토리 깊이 실측 후 부족분 cron 누적).
- 유니버스: `flow/top10` 기반 **고수급/고베타 20~30종목**(대형주 005930 류 아님) × 20~40 거래일 분봉.
- **3m/5m/15m bake-off** → net PF·거래빈도로 N 결정(직관 아님). 기준은 §5 AC-3.

### 3-4. 2~3 CLI 에이전트 그룹 + 결정 스키마

- `lib/types/intraday/intradayDecision.ts` (NEW):
  ```ts
  export type IntradayAction = "BUY" | "HOLD" | "SELL";
  export interface IntradayDecision {
    action: IntradayAction;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    entryZone: { low: number; high: number } | null;   // 절대 원, HOLD/SELL=null
    targetPrice: number | null;                          // 익절(+2~5% 안쪽)
    stopPrice: number | null;                            // 손절
    invalidationPrice: number | null;                    // 논거 무효가(추적)
    expectedHoldingMinutes: number | null;
    rationale: string;                                   // 한국어 개조식 1~2문장
    riskNotes: string[];
    // 서버 주입(LLM 미생성):
    basePrice: number; rrr: number | null;
    signal: DecisionSignal; source: "intraday-cli";
  }
  ```
  `FinalDecision`(현재가 대비 %, 일봉 6단계 verdict) 재사용 안 함 — 단타는 절대가·분 단위·3액션. LLM 에는 `action/confidence/entryZone/targetPrice/stopPrice/invalidationPrice/expectedHoldingMinutes/rationale/riskNotes`만 생성시키고 나머지는 서버가 채운다(환각 차단).
- `lib/prompts/intraday/*.ts` (NEW) — 에이전트별 한국어 system/user 빌더(`aiAnalysis.ts` 톤 + `formatSignalForPrompt` 패턴 미러). ①흐름·세력 분석가 ②진입·청산 판단가 ③리스크 게이트. 박스권·돌파·매물대 리더, 2~5% 목표, HOLD 편향, 절대가, strict JSON. 상태(포지션·직전결정·최근 5틱) 주입.
- `lib/server/paperTrading/decisionProviders/intradayCli.ts` (NEW) — `mock.ts` 시그니처 미러. 사전게이트 → 그룹 직렬 CLI 콜(`invokeAgentCli`, haiku/low/web=off/~25s) → `parseLooseJson`(route.ts 패턴) → 사후게이트 → `IntradayDecision` → `PaperTradingDecision` 어댑터. **fail-soft: CLI/파싱 실패 시 `signal.action` 파생**(틱이 죽지 않음).
- 재사용: `agentCli.ts`(신규 env `INTRADAY_MODEL`=haiku 기본, **API 토큰 미사용 — 구독 CLI**), `recordAgentUsage`(`agentKey:"intraday_*"` 토큰 추적), `aiCliGate.ts`(로컬 전용 게이트).
- **비용 가드**: 직전 틱 대비 가격·시그널 action 동일 + 무포지션이면 LLM 스킵, 직전 결정 carry-forward.

### 3-5. paper-trading 연결 + 청산 갭 메우기

- `lib/server/paperTrading/runTick.ts` (EDIT) — 하드코딩된 `decideWithMockProvider` → `selectDecisionProvider(session.decisionProvider)`. `cli-agent` = 분봉 페치 + 시그널 + barrier → `intradayCli`. `mock` 무변경, `existing-ai` stub 유지. 테스트용 `intradaySignalProvider` 주입 시seam 추가(`priceSnapshotProvider` 패턴 동일).
- `lib/server/paperTrading/virtualExecution.ts` (EDIT) — **갭 픽스.** 마크투마켓 후 forced-exit 사전패스: 보유 포지션이 `lastPrice ≤ invalidationPrice`(손절) 또는 익절 목표 도달 또는 **15:20 장막판** → SELL/EXIT override + `guardAdjustments` 노트. 기존 가드 math 불변(additive). *현재 `executeVirtualTrade` 가 stop/target/invalidation 을 무시하는 갭을 닫는다.*
- `lib/server/paperTrading/constants.ts` (EDIT) — `PAPER_TRADING_INTRADAY_TICK_INTERVAL_MINUTES`(시작 5)·`_TAKE_PROFIT_PCT`·일일손실 kill switch·`CLOSE_FLATTEN_HHMM`(15:20).

### 3-6. 장중 스케줄러

- `scripts/cron/intraday-tick.sh` (NEW) — `scripts/cron/refresh-market-analysis.sh`(#159, 외부 트리거 패턴) 복제. crontab `*/N 9-15 * * 1-5` → `POST .../tick {"triggeredBy":"auto"}`. 신규 엔드포인트 없음. 일일손실 kill 시 스킵. 멱등성은 `runPaperTradingTick`(tickWindowStart당 1틱)이 이미 보장.

### 3-7. 표면 (최소)

- 기존 paper-trading 세션 뷰 + 틱별 `decision`/`rationale` 로그 재사용. 신규 단타 전용 UI(IntradayDecision 절대가 카드·진입/목표/손절 레벨 시각화)는 **Phase 1.5** 로 분리.

---

## 4. 비범위 (Out of scope — FOLLOWUPS)

- **실제 증권사 주문 실행** — 영구 비범위(C1).
- **종목 자동 발굴/스캐닝** — Phase 2(§7).
- **인트라데이 scorecard 호라이즌** — 현재 daily(d1/w1/m1)만. Phase 3. Phase 1 신뢰 측정은 paper-trading `returnPct` + 틱별 결정 로그.
- **WebSocket `H0STCNT0` 실시간 체결/호가 클라이언트** — Phase 3(호가 임밸런스 컨텍스트).
- **2~3 LLM 그룹의 추가 분석 에이전트 확장**(흐름·세력 서사 품질↑) — Phase 3 옵션.
- **단타 전용 UI** — Phase 1.5.
- **신호-only 알림 표면(인간 수동 집행용)** — Phase 1.5 후보(§9 Q3).
- **다중 종목 동시 단타** — Phase 1 은 단일 종목. 데이터 모델만 열어둠(paper-trading 이 이미 `stocks[]` 지원).

---

## 5. 수용 기준 (AC — QA 가 테스트 항목으로 직변환 가능)

### AC-1 (분봉 페치·정렬키)
`fetchStockMinuteChart("005930", "5m", …)` 가 오름차순 `StockMinuteCandle[]` 를 반환하고, 각 봉 `date` 가 `YYYY-MM-DDTHH:mm` 형식이며 같은 날 분봉이 1봉으로 붕괴하지 않는다. KIS 미설정 시 mock 폴백.

### AC-2 (시그널 프로파일 무회귀)
`EvaluateOptions` 에 분봉 프로파일을 주입하지 않으면 `evaluateSignal` 결과가 기존 일봉 동작과 비트 동일(기존 `lib/signal` 테스트 그린). 프로파일 주입 시 분봉 주기 지표가 적용된다.

### AC-3 (★ 검증 게이트 — net 엣지)
`RUN_LIVE_INTRADAY=1` 분봉 백테스트가 고수급/고베타 풀(20~30종목)에서 round-trip 비용 0.3~0.5% 차감 후 **net `profitFactor>1.3`, net `avgReturnPct>0`, `hitRate>0.45 @ RRR≥1.5`, setup당 sample≥100, 풀 과반 종목 통과**를 출력한다. 3m/5m/15m bake-off 결과로 N 을 확정한다. **미통과 시 LLM(3-4) 미연결.**

### AC-4 (에이전트 그룹 결정)
`decisionProvider:"cli-agent"` 틱에서 결정론 시그널+barrier 가 먼저 계산되고, 2~3 CLI 에이전트가 strict JSON `IntradayDecision`(절대가 BUY/HOLD/SELL + target/stop/invalidation + rrr)을 반환한다. 절대가는 서버 주입(basePrice/rrr/signal)이 채워진다.

### AC-5 (fail-soft·폴백)
CLI 미설치/타임아웃/JSON 파싱 실패 시 틱이 죽지 않고 `signal.action` 파생 결정으로 폴백한다. Vercel 환경은 `aiCliGate` 가 막아 순수 결정론으로 degrade.

### AC-6 (사전/사후 룰 게이트)
15:00 이후 신규 BUY 가 게이트로 차단된다. RRR<1.5 진입이 스킵된다. LLM 이 barrier 밖으로 SL 확대·TP 상향·레짐 veto 무시를 시도하면 사후 게이트가 BUY→HOLD 로 강등한다.

### AC-7 (가상 청산 honor)
보유 포지션이 `invalidationPrice` 이탈(손절) / 익절 목표 도달 / 15:20 장막판에 도달하면 `executeVirtualTrade` 가 SELL/EXIT 으로 강제 청산하고 `guardAdjustments` 에 사유를 남긴다.

### AC-8 (스케줄러·멱등)
crontab 트리거가 장중 N분마다 `/tick` 을 호출하고, 같은 `tickWindowStart` 재호출 시 중복 틱이 생기지 않는다(기존 틱 반환). 일일손실 kill 시 신규 진입 스킵.

### AC-9 (토큰 과금 0·CLI)
모든 에이전트 호출이 로컬 CLI(구독) 경로(`invokeAgentCli`)를 타고, Anthropic API 토큰을 사용하지 않는다. `recordAgentUsage` 가 `agentKey:"intraday_*"` 로 사용량을 기록한다.

### AC-10 (무회귀)
`npm run lint`·`npm run test`(가능 시 `npm run build`) 그린. 기존 `ai-analysis`/`scorecard`/`paper-trading(mock)`/일봉 `signal` 흐름 무변경.

---

## 6. 가정 · 제약

- **★ 최대 가정 리스크 — 일봉 보정 엔진을 분봉에 그대로 태우면 입력 오염.** `MA{5,20,60,120}`·`MIN_BARS=130`·SMA120 레짐은 일봉 가정. 130봉@5m≈11h(>1세션)라 조기 `limitedData`/HOLD 폴백, SMA120 레짐은 오버나잇 갭에 오염돼 정상 BUY 를 veto. **완화(필수, 선택 아님)**: (a) 타임프레임 인식 주기 재보정(3-2), (b) 레짐을 일봉 SMA 기울기로 폴백 주입(`regimeOverride`, 세션당 `fetchDailyChunked` 1콜), (c) 전일 1~2일 분봉 prefetch 로 warmup 충족.
- **2~5% 엣지 존재 자체 리스크.** KOSPI 대형주는 일중 레인지<2% 흔함 → 2~5% 목표는 암묵적으로 고베타/고수급 종목을 강제(그래서 Phase 2 = 스캐닝). AC-3 게이트를 **Phase 2 가 고를 종류의 종목**에서 검증해야 한다.
- **슬리피지/비용**: 검증에 0.3~0.5% round-trip bake + sub-2% TP 스킵. 가상 체결은 phase-1 고정 bps 또는 0(설정 가능 상수).
- **장막판·휘프소·일일손실**: 15:20 강제 flatten / trigger 모드+쿨다운+볼륨 확인 / 세션 kill switch(스케줄러 enforce).
- **KRX 호가단위**: 저가주 0.5% 버퍼가 과조될 수 있어 호가단위 반올림(`krxTick`, #162) 정합 검증.
- **로컬 전용·구독 CLI**: C5·C6 계승. Vercel 폴백 = 순수 결정론.

---

## 7. FOLLOWUPS — 다음 단계 (본 PRD 비범위, 연결성 명시)

- **Phase 1.5 — 단타 전용 표면.** `IntradayDecision` 절대가 카드(진입/목표/손절 레벨 + RRR + rationale), 세션 내 분봉 차트 위 레벨 오버레이. 신호-only 알림 표면(인간 수동 집행) 여부 결정.
- **Phase 2 — 종목 발굴(스캐닝).** `app/api/flow/top10`(구현됨)으로 장 초반 고수급/고거래량 후보 자동 선별 → 세션 `stocks[]` 에 1종목 주입. 다일 분봉 백필(`FHKST03010230`)로 신규 종목 warmup, 체결 tape(`FHPST01060000`)로 수급 미세구조 보강. AC-3 게이트를 이 유니버스에서 통과한 종목만 루프 대상.
- **Phase 3 — 신뢰→집행.** 인트라데이 scorecard 호라이즌 신설(세션 내 ±2% hit/miss + 신뢰도 캘리브레이션). 누적 hit-rate 임계 통과 시 auto-execute 논의 개시. 옵션: 2~3 LLM 그룹 확장, WebSocket 실시간 체결 클라이언트. **실주문은 여전히 영구 비범위** — 집행은 가상매매 또는 검증된 신호의 인간 위임까지.

---

## 8. 영향 분석

### 8.1 신규 파일
- `docs/prd/intraday-scalping-agent.md` (본 문서)
- `lib/api/kis/minuteChartChunked.ts`
- `app/api/stock/chart-minute/route.ts`
- `lib/signal/intradayProfile.ts`
- `lib/signal/backtest/__live__/intradayBacktest.test.ts` + `__fixtures__/min/*`
- `lib/types/intraday/intradayDecision.ts`
- `lib/prompts/intraday/*.ts` (에이전트 3종 프롬프트 빌더)
- `lib/server/paperTrading/decisionProviders/intradayCli.ts`
- `scripts/cron/intraday-tick.sh`
- (UI 포함 시 Phase 1.5) `components/paperTrading/Intraday*` · `lib/copy/intraday/*`

### 8.2 수정 파일
- `lib/api/kis/types.ts` — `StockMinuteCandle` 별칭 + `KisInquireTimeItemChartItem`
- `lib/api/kis/price.ts` — `fetchStockMinuteChart`
- `lib/types/signal/index.ts` — `EvaluateOptions` 확장(indicators/maPeriods/regimeOverride)
- `lib/signal/context.ts` — `buildContext` 주기 주입 seam
- `lib/signal/weights.ts` — 분봉 상수 세트 export(일봉 불변)
- `lib/server/paperTrading/runTick.ts` — `selectDecisionProvider` 분기 + `intradaySignalProvider` 주입
- `lib/server/paperTrading/virtualExecution.ts` — forced-exit 사전패스(청산 갭)
- `lib/server/paperTrading/constants.ts` — 분봉 틱/익절/일일손실/장막판 상수
- `lib/server/env.ts` — `INTRADAY_MODEL`(필요 시), `.env.example` 동기
- `hooks/query/queryKeys.ts` — chart-minute query key(표면 사용 시)

### 8.3 회귀 위험
- **시그널 엔진 일봉 회귀**: `buildContext`/`EvaluateOptions` 변경은 기본값 = 일봉 상수로 무회귀 보장. 기존 `lib/signal` 테스트가 가드(AC-2).
- **paper-trading mock 경로 회귀**: `runTick` 분기는 `cli-agent` 에만 적용, `mock` 무변경(AC-10).
- **분봉 데이터 신뢰성**: 장중 지연/실시간 차이가 결과에 영향 → `asOf`·`freshnessSeconds` 항상 기록.
- **무거운 분석 혼선 방지**: 본 시스템은 `ai-analysis`(일봉 12에이전트)와 완전 분리된 경로. 토큰/시간 예산 무관.
- **가상↔실제 혼동**: 모든 체결 표현 "가상" 접두 유지(C7).

---

## 9. OPEN QUESTION (PM 권고 동봉)

### Q1. 타임프레임 N 최종값
- **PM 권고**: 직관(5/10/15/30)으로 고르지 말고 **AC-3 bake-off(3m/5m/15m) 결과**로 결정. 기본 5분봉/5분 주기로 시작(한 세션 ≈ 78봉, 데이터 깊이·노이즈 균형). 검증이 유저의 "미정 N"을 데이터로 답한다.

### Q2. 리스크 게이트(③)를 LLM 으로 둘지 순수 룰로 둘지
- **PM 권고**: **1차는 순수 결정론 룰**(RRR·손절폭·레짐·일일손실·장막판) — 비용·지연 절감 + 가장 비싼 실패(환각 진입) 차단. LLM 리스크 게이트는 신뢰가 쌓인 Phase 3 옵션. 즉 Phase 1 의 에이전트 "그룹"은 실질 **①흐름·세력 분석가 + ②진입·청산 판단가 2 LLM + 결정론 게이트**로 시작하고, ③은 룰로 둔다.

### Q3. 신호-only 표면(인간 수동 집행) 추가 여부
- **PM 권고**: Phase 1 은 가상매매 자동집행으로 net 엣지를 객관 기록(D2). 5~10분 신호의 인간 수동 집행은 슬리피지로 알파 소실 + 신뢰 측정 불가. 신호 노출은 가상 검증으로 엣지가 확인된 뒤 Phase 1.5 에서 결정.

### Q4. 종목 유니버스 정의(고수급/고베타 기준)
- **PM 권고**: AC-3 검증·Phase 2 스캐닝 모두 동일 유니버스를 써야 하므로 `flow/top10`(외국인·기관 거래대금 순매수 상위) + 거래대금/변동성 필터로 정의. 구체 임계는 Phase 2 에서 확정하되, 검증은 처음부터 이 종류 종목으로.

### Q5. LLM 권한 경계(veto-only vs 진입 생성자)
- **PM 권고**: **veto-or-pass only.** LLM 은 결정론 HOLD 를 BUY 로 못 바꾸고, SL/TP 를 barrier 밖으로 못 넓히며, 레짐 veto·일일손실 kill 을 못 뒤집는다(사후 게이트가 강제). LLM 역할 = "정량 후보 확정 + 한국어 서사 + 열린 거래 관리". 빠른 루프에서 환각 진입이 가장 비싼 실패이기 때문.
