# PRD: signal-rule-engine

- **slug**: `signal-rule-engine`
- **작성일**: 2026-06-06
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: `docs/references/slack-bot-analysis-roadmap.md` §4-3(신호의 결정론적 부분 분리) · §5.1(백테스팅) · §5.5(확률적 표현). 현재 workbench analyze 는 가격·지표를 LLM 이 **추정**(데이터 미주입)하여 환각 리스크가 있고, 종목 상세의 시그널 enum(`lib/types/home/technicalIndicators.ts`)은 목업에만 연결돼 있다.
- **UI 포함 여부**: **no** — 순수 TS 모듈(`lib/signal/`) + 공용 지표 보강(`lib/utils/technicalIndicators.ts`) + 단위/회귀 테스트만. 화면 컴포넌트·라우트·프롬프트 변경 0. **UX/UI 디자이너 합류 불필요.**
- **선행/후행 관계**:
  - **선행(머지 완료)**: `stock-api-integration`(KIS 일봉 `StockDailyCandle` + BFF `/api/stock/chart`), PR #63 차트 대개편(`useChartData` 워밍업 포함 페치 + `calcEMA/calcMACD/calcRSI`).
  - **후행(이 PRD 밖)**: (1) 종목 상세 '시그널 카드' 라이브 연결, (2) workbench analyze 프롬프트에 `SignalResult` 주입(§4-3 환각 제거), (3) 백테스트 결과 영속화(§5.1 Supabase/SQLite), (4) Slack 봇(P0~) 동일 엔진 재사용.

## 1. 배경 / 문제

### 1.1 사용자 의도 (verbatim)

> "slack bot까지 만드는건 최종이지만, 그전에 매도/매수 시그널을 잡는 로직을 코드에 넣고싶어. 보통 어떤 기준으로 판단하는지 … 거래량, 120/60/30 일선의 정렬과 현재 캔들 위치, MACD, RSI 등등 많은 판단 근거들이 있을것같아. 지금 데이터는 API로 가져오니까 이걸 기반으로 어떻게 시그널을 잡을지 … 그리고 분석 기준이 명료화되면 그때는 과거 차트 데이터를 기반으로 상승/하락 예측이 맞아 떨어졌는지 … 안맞는 기준들을 보강해야해."

### 1.2 현재 상태

- `lib/utils/technicalIndicators.ts` — `calcEMA` / `calcMACD(12,26,9)` / `calcRSI(14)` 순수 함수 존재(오름차순 전제).
- `hooks/stock/useChartData.ts` — KIS 일봉을 워밍업 포함 최대 3000봉 페치 → MACD·RSI 자동 계산. 입력 캔들 타입 `StockDailyCandle = {date,open,high,low,close,volume}`.
- 시그널 enum(`IndicatorSignal`: BUY/SELL/NEUTRAL/...)은 정의됐으나 **목업에만 연결**, 라이브 미연결.
- 매수/매도 판단을 하는 **결정론적 규칙 엔진이 없다** — 정배열·크로스·캔들 위치·거래량·복합 스코어링 전부 미구현.

### 1.3 문제

- **LLM 환각**: analyze 가 숫자를 추정 → 신뢰 불가. 숫자 판단을 코드로 옮겨야 한다(로드맵 §4-3).
- **검증 부재**: 어떤 판단 기준이 실제로 맞는지 데이터로 확인할 방법이 없다. "안 맞는 기준 보강"을 하려면 과거 데이터 백테스트가 선행돼야 한다(§5.1).

## 2. 목표 / 비목표

### 2.1 목표

1. OHLCV 일봉 → **추세·모멘텀·거래량·변동성** 4축 점수화 → **종합점수(0~100) + BUY/HOLD/SELL + 축별 근거 분해 + confidence** 를 내는 순수 규칙 엔진(`evaluateSignal`).
2. 과거 캔들에 신호를 돌려 **Triple Barrier 라벨링**(익절·손절·시간) 으로 적중/반대를 판정하고, **규칙별 적중률·손익비·MDD attribution** 을 산출하는 검증 하니스(`backtest`).
3. 가중치·임계값을 **상수 단일 위치**(`weights.ts`)로 노출 → 보정 루프(저성과/역예측 규칙 가중치 축소·제거)를 코드 수정 최소로.

### 2.2 비목표

- UI 카드·차트 연결, analyze 프롬프트 주입 — **후속 PR**.
- 보유 포지션 기준 청산(익절/손절 실행) 신호 — position 컨텍스트 필요, 범위 밖.
- 실시간 틱·분봉 — 일봉만.
- 백테스트 결과 영속화(DB) — 이번엔 인메모리 리포트.

## 3. 판단 기준 (4축 코어 지표)

| 축 | 기본 가중치 | 지표·규칙 |
|---|---|---|
| 추세 Trend | 35% | 이평 정배열(5>20>60>120)·현재가 vs 이평 위치·골든/데드크로스(20×60)·이평 기울기·ADX 추세강도(레짐) |
| 모멘텀 Momentum | 30% | MACD 시그널 교차·히스토그램 부호·0선 돌파 / RSI 70·30·50선 (레짐 게이트 적용) |
| 거래량 Volume | 20% | 당일 거래량/20일 MA 배수·가격-거래량 동반성 |
| 변동성 Volatility | 15% | 볼린저 상·하단 터치·스퀴즈·밴드 내 위치(pctB) |

- **컨플루언스 + 비중복**: 서로 다른 카테고리가 같은 방향일 때 신뢰↑. 같은 카테고리 지표 중복 금지(웹 리서치 반영).
- **레짐 필터**: 추세가 역방향이면 모멘텀 매수 가중을 감쇠 → 거짓 신호 억제.
- **합격 기준**(검증): 손익비(profit factor) > 1.5, 적중률 > 50%, 표본 100+ (복수 종목·아웃오브샘플).

## 4. 수용 기준 (AC)

- **AC-1** `calcSMA/calcBollinger/calcVolumeMA/calcADX/crossover/crossunder` 추가 — null-aware, 오름차순 전제, 단위 테스트 통과.
- **AC-2** `evaluateSignal(candles)` → `SignalResult{action,score,confidence,axes,asOf,warmupOk}`. ~130봉 미만이면 `warmupOk=false`+`HOLD`.
- **AC-3** 4축 각각 `RuleHit[]`(규칙키·축·방향·가중치·detail) 반환, score.ts 가 가중합 → 밴드 매핑(상수). 골든크로스/RSI과매도/볼린저하단/거래량급증 합성 케이스 단위 테스트.
- **AC-4** 레짐 역추세 시 모멘텀 매수 가중 감쇠 단위 테스트.
- **AC-5** `tripleBarrier`(TP/SL/시간만료 각 케이스) + `backtest` 워크포워드(미래 누설 0, 룩어헤드 가드 테스트) + `metrics`(적중률·손익비·MDD) + `attribution`(규칙별 집계).
- **AC-6** 실종목 2~3개 스냅샷 회귀 리포트가 차트 육안과 모순 없음.
- **AC-7** `npm run test` · `typecheck` · `lint` 통과.

## 5. 산출물 구조

```
lib/utils/technicalIndicators.ts   # 공용 지표 보강(SMA·Bollinger·VolumeMA·ADX·cross)
lib/signal/
  engine.ts · factors/{trend,momentum,volume,volatility}.ts · score.ts · weights.ts
  backtest/{label,run,metrics,attribution}.ts
  __tests__/*.test.ts
lib/types/signal/index.ts
lib/copy/signal/labels.ts
```

## 6. 데이터 계약

- 입력: `StockDailyCandle[]`(오름차순). 엔진은 순수 — 데이터 출처 무관(라이브/스냅샷/목 동일).
- 출력: `SignalResult`(엔진), `BacktestResult`+`RuleAttribution`(하니스).

## 7. 검증 방법

단위 테스트(합성 시계열) + 실데이터 스냅샷 회귀 + typecheck/lint. 상세는 QA 리포트(`docs/qa/signal-rule-engine.md`).

## 8. 영향 분석

- **신규 파일만** — 기존 모듈 시그니처 변경 0(`technicalIndicators.ts` 는 함수 **추가**만, 기존 export 불변). 회귀 표면 최소.
- BFF·라우트·컴포넌트 무변경 → 런타임/번들 영향 0(트리 셰이킹으로 미사용 모듈 미포함).
- 후속 PR(UI/프롬프트)에서 import 만으로 연결.

## 9. OPEN QUESTION (PM 권고 동봉)

- **q1. 밴드·가중치 초기값** — 추세35/모멘텀30/거래량20/변동성15, 밴드 <40 SELL·>60 BUY 로 시작. → **권고: 채택**. 백테스트 attribution 으로 사후 보정(보정 루프가 본 PRD 핵심).
- **q2. Triple Barrier 파라미터** — TP/SL 을 고정 %(예 ±5%) vs ATR 배수. → **권고: ATR 배수 기본(변동성 적응) + 고정 % 옵션**. horizon=목표기간 기본 20일.
- **q3. 검증 종목·구간** — 화이트리스트에서 대형주/중소형주 섞어 2~3종목, 최근 2년+. → **권고: 005930·000660 + 코스닥 1종, 아웃오브샘플 분리**.
- **q4. 매도 신호 의미** — 이번 엔진은 방향 점수(고=매수/저=매도/이탈)만. 보유 포지션 청산은 후속. → **권고: 명시적으로 범위 밖 표기(완료)**.
