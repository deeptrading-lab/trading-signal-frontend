# PRD: signal-reversal-rules

- **slug**: `signal-reversal-rules`
- **작성일**: 2026-07-06
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: 사용자 승인 상세 구현 계획 `/Users/hayoung/.claude/plans/scalable-crafting-cloud.md`(본 PRD는 이 계획을 PRD 양식으로 옮긴 것 — 재설계 아님). 관련 이전 PRD: `docs/prd/signal-rule-engine.md`(공용 4축 결정론 엔진 최초 도입).
- **UI 포함 여부**: **없음** — 순수 로직(`lib/signal/*`) + BFF 프롬프트 조정(`app/api/stock/ai-analysis/route.ts`)뿐. 화면 컴포넌트·라우트·디자인 토큰 변경 0. **UX/UI 디자이너 합류 불필요 — 다음 파이프라인 단계는 디자이너 단계를 스킵한다.**
- **선행/후행 관계**:
  - **선행(머지 완료)**: `signal-rule-engine`(공용 4축 엔진 `evaluateSignal`/`evaluateTrend`/`evaluateMomentum` + `weights.ts` + 백테스트 하니스), `intraday-scalping-agent`(`lib/signal/intradayProfile.ts`의 `EvaluateOptions`/`structureLookback` 프로필 관통 선례), `stock-warnings`·`unified-analysis-jobs` 등은 무관.
  - **후행(이 PRD 밖)**: `STRONG_BULL_TRIGGERS`/`STRONG_BEAR_TRIGGERS`(weights.ts)에 신규 키 추가 여부(백테스트 attribution 검증 후 별도 결정), `MACD_CONVERGE_LOOKBACK`의 분봉별 프로필화(백테스트에서 노이즈 과다 시 후속).

## 1. 배경 / 문제

### 1.1 발견 경위

2026-07-06 HD현대(267250) AI 종합분석 결과를 사용자가 검토하다가 두 가지 불일치를 발견했다.

1. PM 리포트가 "MACD 음전환"이라고 서술했는데, 실제 KIS 데이터로 `calcMACD`를 직접 재현하면 데드크로스는 **5/14에 이미 발생**했고(거의 두 달 전), **6/26 이후 6거래일 연속 히스토그램이 좁혀지며**(-6,130 → -373) 양전환이 임박한 상태였다. "방금 전환됨"이라는 어감은 방향 오독을 유발한다.
2. 6/26 이후 저점이 우상향(184,500 → 191~203k대)하는 바닥다지기 구간인데도 추세축이 계속 SELL을 냈다. 원인은 `trend.ts`가 SMA5/20/60/120 정배열·가격 위치만 보고, 스윙 저점 구조(저점이 올라가는지)는 전혀 보지 않기 때문이다.

### 1.2 구조적 원인

`lib/signal/factors/{momentum,trend}.ts`의 모든 룰이 **"지금 이 순간의 정적 레벨"**(MACD 부호, 이평선 위/아래)만 판정하고, **"추세/기울기 변화"**(수렴 중인지, 저점이 올라가는지)를 판정하는 룰이 하나도 없다. 이 엔진은 `lib/signal/intradayProfile.ts`를 통해 **단타(분봉 paper-trading) 판단에도 그대로 재사용**되므로, 같은 구조적 맹점이 단타 preGate(`lib/server/paperTrading/decisionProviders/intradayCli.ts`)의 HOLD 판정에도 동일하게 영향을 준다. 이번 변경은 공용 엔진 자체를 고쳐 양쪽에 동시 적용한다.

## 2. 목표

1. MACD 히스토그램이 부호와 무관하게 연속으로 좁혀지는(수렴하는) 상황을 "전환 임박" 신호로 별도 포착하는 룰(`MACD_CONVERGE_UP`/`MACD_CONVERGE_DOWN`)을 momentum 축에 추가한다.
2. 스윙 저점/고점의 우상향/우하향(바닥다지기/천장다지기)을 포착하는 룰(`HIGHER_LOW_BASE`/`LOWER_HIGH_TOP`)을 trend 축에 추가한다.
3. 두 신규 룰은 일봉 AI종합분석과 단타(분봉) preGate 양쪽에 **공용 엔진 수정 1회로** 동시 반영한다(각각 별도 구현 금지).
4. `RuleHit.detail`이 LLM 프롬프트에 raw key(`MACD_HIST_NEG` 등)가 아니라 기존에 있으나 미연결이던 한글 라벨(`ruleLabel()`)로 그라운딩되게 한다.
5. 신규 룰 도입이 기존 4축 엔진의 백테스트 성과(profitFactor/hitRate)를 회귀시키지 않는다.

## 3. 범위 (In scope)

### 3.1 설계 원칙 (조사로 확정 — 새로 설계하지 않음)

- `lib/signal/weights.ts`는 "직접 수정 금지" 파일이 아니라 **"보정 루프"용 단일 다이얼**이다(파일 헤더: 베이스라인 → attribution → 가중치 수정 → 재실행). 새 룰은 새 상수로 추가하고 기존 값은 건드리지 않는다.
- `evaluateSignal`(`engine.ts`)의 4축은 하드코딩 배열이라 **5번째 축 신설은 침습적** — 하지 않는다. 두 룰 다 기존 momentum/trend 축 **내부**에 추가한다.
- 단타는 `IntradayProfile`(`lib/signal/intradayProfile.ts`)의 `EvaluateOptions` seam으로 지표 주기만 오버라이드하고 룰 코드는 100% 공유한다(`momentum.ts`/`trend.ts`는 프로필 인지 코드 없음). **lookback을 하드코딩하면 5분봉(78봉/세션)·15분봉(26봉/세션)에서 완전히 다른 시간 스케일이 되어 휩쏘 위험** — 이미 `structureLookback` 필드가 이 문제를 풀어둔 선례(1/3/5/15분마다 130/130/78/52)이므로 그대로 재사용한다.
- 스윙 저점/고점 탐지는 **이미 `lib/signal/levels/swingLevels.ts`의 `findSwingLows`/`findSwingHighs`가 존재**(구조적 TP/SL 계산에 사용 중, look-ahead 안전 설계 완료) — 새로 만들지 않고 재사용한다.
- `RuleHit.detail`은 `formatSignalForPrompt`(`app/api/stock/ai-analysis/route.ts`)를 통해 **raw key 그대로**(`MACD_HIST_NEG(RSI 28.4)` 식) LLM 프롬프트에 꽂힌다. `lib/copy/signal/labels.ts`의 `RULE_LABEL`/`ruleLabel()`은 이미 존재하지만 **저장소 어디서도 호출되지 않는 죽은 코드**(grep 0건) — 이번에 실제로 연결해서 LLM이 원문 그대로 받는 대신 정확한 한글 라벨을 받게 한다.
- 신규 룰은 **대칭**으로 만든다(상승만 잡는 게 아니라 하락 미러도) — 안 그러면 엔진이 상승 편향으로 왜곡되고 백테스트 검증도 어려워진다.

### 3.2 변경 파일 목록 (1~8)

**1. `lib/signal/weights.ts` — 신규 상수만 추가**

```
MACD_CONVERGE_LOOKBACK = 4   // 히스토그램 |값| 단조 축소 확인 봉수(일봉/분봉 공통, 로컬 패턴이라 타임프레임 무관)
HIGHER_LOW_LOOKBACK = 30     // 스윙 저점/고점 비교 스캔 범위(일봉 기본, 분봉은 4번에서 override)
RULE_WEIGHTS.macdConverge = 1       // macdCross(3)·macdHist(1.5)보다 약한 "예고" 신호
RULE_WEIGHTS.higherLowBase = 2      // maAligned(4)·maCross(3)보다 약한 "조기" 신호. 상승/하락 미러 공용.
```

`STRUCTURE_SWING_WINDOW`(기존, =3)를 스윙 탐지 창으로 재사용 — 새 상수 불필요.

**2. `lib/signal/factors/momentum.ts` — `MACD_CONVERGE_UP`/`MACD_CONVERGE_DOWN`**

- 히스토그램 시계열에서 최근 `MACD_CONVERGE_LOOKBACK`봉의 `|histogram|`이 **단조 감소**(strict)인지 확인한다.
- 부호와 무관: `hist<0`이고 좁혀지는 중 → `MACD_CONVERGE_UP`(+1, "양전환 임박"). `hist>0`이고 좁혀지는 중 → `MACD_CONVERGE_DOWN`(-1).
- `detail`에 축소폭 명시(예: `"4봉 연속 축소(-6130→-373)"`) — LLM이 "얼마나 좁혀졌는지" 직접 인지하도록.
- 기존 함수 끝의 레짐 게이트(`raw.map(...)`)에 자동 포함됨 — 별도 처리 불필요.
- 기존 `MACD_CROSS_UP/DOWN`·`MACD_HIST_POS/NEG`와 **공존**(상호배타 아님, 같은 방향이라 가산일 뿐 모순 없음).

**3. `lib/signal/factors/trend.ts` — `HIGHER_LOW_BASE`/`LOWER_HIGH_TOP`**

- `lib/signal/levels/swingLevels.ts`의 `findSwingLows(ctx.candles.slice(-lookback), STRUCTURE_SWING_WINDOW)` / `findSwingHighs(...)` 호출.
- 반환된 피벗 배열에서 **마지막 두 피벗**을 비교: 마지막 저점 > 직전 저점 → `HIGHER_LOW_BASE`(+1). 마지막 고점 < 직전 고점 → `LOWER_HIGH_TOP`(-1). 피벗이 2개 미만이면 미발화.
- `lookback`은 함수 인자로 받는다: `evaluateTrend(ctx, opts?: { higherLowLookback?: number })`, 기본값 `HIGHER_LOW_LOOKBACK`.
- `detail`에 두 피벗값 명시(예: `"저점 184,500→195,300"`).
- trend.ts엔 레짐 게이트가 없음(트렌드가 게이트의 기준이므로) — 기존 관례 그대로 무게이트.

**4. 옵션 관통 — `lib/types/signal/index.ts` + `lib/signal/engine.ts` + `lib/signal/intradayProfile.ts`**

- `EvaluateOptions`에 `trendHigherLowLookback?: number` 추가.
- `engine.ts`: `evaluateTrend(ctx, { higherLowLookback: opts?.trendHigherLowLookback })`로 관통(기존 `softMinBars`/`regimeOverride` 관통 패턴과 동일).
- `intradayProfile.ts`의 `evaluateIntradaySignal`: `opts.trendHigherLowLookback = profile.structureLookback`로 **기존 필드 재사용**(1/3/5/15분 프로필에 이미 있는 값 130/130/78/52 그대로 씀 — 새 프로필 필드 불필요). 이게 **단타 안전장치의 핵심**: 일봉 스케일(30봉)을 분봉에 그대로 쓰면 5분봉에서 30봉=2.5시간 정도라 스윙 정의가 완전히 달라진다.
- `MACD_CONVERGE_LOOKBACK`(4봉)은 관통 안 함 — 로컬 단조성 패턴이라 타임프레임에 무관하게 그대로 사용(과설계 방지). 백테스트에서 분봉 노이즈가 과하면 그때 프로필화(후행 항목).

**5. `lib/copy/signal/labels.ts` — `RULE_LABEL`에 4개 키 추가**

```
MACD_CONVERGE_UP: "MACD 히스토그램 축소 중(양전환 임박)"
MACD_CONVERGE_DOWN: "MACD 히스토그램 축소 중(음전환 임박)"
HIGHER_LOW_BASE: "저점 우상향(바닥 다지기)"
LOWER_HIGH_TOP: "고점 우하향(천장 다지기)"
```

**6. `app/api/stock/ai-analysis/route.ts` — `formatSignalForPrompt`**

`h.detail ? \`${h.key}(${h.detail})\` : h.key` → `h.detail ? \`${ruleLabel(h.key)}(${h.detail})\` : ruleLabel(h.key)`. `lib/copy/signal/labels.ts`에서 `ruleLabel` import 추가. 이걸로 죽어있던 한글 라벨이 실제로 LLM 그라운딩에 연결되고, PM이 "MACD_HIST_NEG"를 제멋대로 "음전환"으로 의역하는 대신 정확한 한글 문구를 그대로 받는다.

**7. 테스트 픽스처 — `lib/signal/__tests__/_fixtures.ts`**

`CandleOpts`에 `lows?: number[]` 옵션 추가(기존 `volumes?`와 동일한 패턴), `makeCandles`가 지정 시 그 값을 우선 사용 — 저점 우상향 시나리오를 명시적으로 만들려면 `low`를 직접 통제해야 한다(현재는 `close±wick` 파생값이라 통제 불가).

**8. 유닛 테스트 — `lib/signal/__tests__/factors.test.ts`**

기존 `describe("evaluateTrend")`/`describe("evaluateMomentum 레짐 게이트")` 블록에 케이스 추가(기존 `keys()`/`makeCandles`/`linearCloses` 헬퍼 재사용):

- MACD 수렴: 급락 후 히스토그램이 좁혀지는 종가 시퀀스(HD현대 6/26~7/6 패턴을 단순화해 하드코딩) → `MACD_CONVERGE_UP` 포함 확인.
- 저점 우상향: `lows` 오버라이드로 "저점 100 → 저점 96(더 낮음, 스윙확정) → 저점 103(더 높음, 스윙확정)" 시퀀스 구성 → `HIGHER_LOW_BASE` 포함, direction=1 확인.
- 대칭 케이스(고점 우하향)도 동일 패턴으로 1개씩.
- 레짐 게이트 대상 여부 확인(모멘텀 쪽만 — 감쇠 적용되는지 기존 스타일대로 weight 비교).

## 4. 비범위 (Out of scope)

- `STRONG_BULL_TRIGGERS`/`STRONG_BEAR_TRIGGERS`(weights.ts)에 신규 키(macdConverge/higherLowBase) 추가 — 백테스트로 attribution 검증된 뒤 별도 결정.
- `MACD_CONVERGE_LOOKBACK`의 분봉별 프로필화 — 회귀 백테스트에서 분봉 노이즈가 과다 확인될 때만 후속.
- 5번째 축(reversal 전용 축) 신설 — 기존 4축 구조(momentum/trend 내부 추가)를 유지한다.
- UI 컴포넌트·차트·시그널 카드 변경 — 이번 PR은 로직/프롬프트만.
- `IndicatorSignal` enum 확장이나 종목 상세 화면 표시 방식 변경 — 범위 밖.
- 단타 자동매매 활성화 여부 재검토 — 기존 "decision-support 전용, 자동매매 NO-GO" 결정(`project_intraday-scalping-agent`)은 그대로 유지, 본 PRD가 이를 뒤집지 않는다.

## 5. 수용 기준 (AC)

- **AC-1** `git grep -n "MACD_CONVERGE_LOOKBACK\|HIGHER_LOW_LOOKBACK\|macdConverge\|higherLowBase" lib/signal/weights.ts` — 4개 신규 상수/가중치 모두 존재, 기존 `RULE_WEIGHTS` 키(`maAligned`·`macdCross` 등) 값 불변(diff 확인).
- **AC-2** `git grep -n "MACD_CONVERGE_UP\|MACD_CONVERGE_DOWN" lib/signal/factors/momentum.ts` — 두 룰 키 존재. `npx vitest run lib/signal/__tests__/factors.test.ts -t "MACD_CONVERGE"` 통과(수렴 시나리오에서 발화, 비수렴 시나리오에서 미발화).
- **AC-3** `git grep -n "HIGHER_LOW_BASE\|LOWER_HIGH_TOP" lib/signal/factors/trend.ts` — 두 룰 키 존재, `findSwingLows`/`findSwingHighs` import 확인(`git grep -n "findSwingLows\|findSwingHighs" lib/signal/factors/trend.ts`). `npx vitest run lib/signal/__tests__/factors.test.ts -t "저점 우상향\|고점 우하향"` 통과.
- **AC-4** `git grep -n "trendHigherLowLookback" lib/types/signal/index.ts lib/signal/engine.ts lib/signal/intradayProfile.ts` — 3개 파일 모두에서 관통 확인, `intradayProfile.ts`에서 `structureLookback` 값을 그대로 대입하는 라인 존재(신규 프로필 필드 추가 없음, `git grep -n "structureLookback" lib/signal/intradayProfile.ts`의 기존 4개 값 130/130/78/52 불변).
- **AC-5** `git grep -n "MACD_CONVERGE_UP\|MACD_CONVERGE_DOWN\|HIGHER_LOW_BASE\|LOWER_HIGH_TOP" lib/copy/signal/labels.ts` — 4개 한글 라벨 모두 `RULE_LABEL`에 존재.
- **AC-6** `git grep -n "ruleLabel" app/api/stock/ai-analysis/route.ts` — `formatSignalForPrompt` 내부에서 `h.key` 대신 `ruleLabel(h.key)` 호출로 치환됐는지 확인(치환 전 raw key 사용 라인 0건).
- **AC-7** `npx vitest run lib/signal/__tests__/factors.test.ts` 전체 통과(기존 케이스 회귀 없음 + 신규 케이스 포함).
- **AC-8** `npx tsc --noEmit -p tsconfig.json` clean.
- **AC-9** `RUN_LIVE_BACKTEST=1 npx vitest run lib/signal/backtest/__live__/liveBacktest.test.ts`를 변경 전/후 브랜치 각각 실행 — `profitFactor`/`hitRate`가 변경 전 대비 악화되지 않고(±허용치는 QA가 실측 판단), 신규 두 룰의 attribution(`macdConverge`/`higherLowBase`/`lowerHighTop`)이 역예측(음의 평균수익)이 아님을 `docs/qa/signal-reversal-rules.md`에 수치로 기록.
- **AC-10** HD현대(267250) 실데이터 재현 스크립트로 `evaluateSignal` 직접 호출 시 `MACD_CONVERGE_UP`와 `HIGHER_LOW_BASE`가 실제 발화하고, momentum/trend axis score가 신규 룰 도입 전보다 완화됨을 확인(수치는 QA 리포트에 기록).

## 6. 가정·제약

- 본 PRD는 사용자 승인 완료된 구현 계획(`/Users/hayoung/.claude/plans/scalable-crafting-cloud.md`)의 내용을 그대로 옮긴 것이며, 설계 재검토 없이 계획대로 구현한다.
- `lib/signal/*`는 일봉 AI종합분석과 단타 분봉 paper-trading 양쪽의 **공용** 엔진이다 — 한쪽만 고치는 방식(엔진 분기/듀얼 구현)은 채택하지 않는다.
- 단타 엔진은 이미 "자동매매 NO-GO, decision-support 전용"으로 확정된 상태(`project_intraday-scalping-agent`)이므로, 본 변경의 단타 검증 기준은 "알파 증명"이 아니라 **"명백한 오작동/과다발화 없음"**이다(정식 백테스트 하네스가 분봉에는 없음, 관찰 기반 스팟체크).
- `RUN_LIVE_BACKTEST=1` 백테스트는 실제 KIS 라이브 데이터 접근을 전제로 하며 CI 상시 실행 대상이 아니다(QA 단계에서 수동 실행).
- `AXIS_SCALE`(momentum=9, trend=11)은 이번 PR에서 신규 가중치(macdConverge=1, higherLowBase=2) 반영 후 조기 포화(0/100 클램프) 빈도가 늘 가능성이 있다 — 백테스트 결과 보고 필요시 소폭 상향 조정(§9 OPEN QUESTION 참조).

## 7. 참고

- `/Users/hayoung/.claude/plans/scalable-crafting-cloud.md` — 사용자 승인 상세 구현 계획(본 PRD의 원 소스).
- `docs/prd/signal-rule-engine.md` — 공용 4축 엔진 최초 PRD (축 구조·가중치·백테스트 하니스 배경).
- `lib/signal/weights.ts` — 단일 튜닝 다이얼(파일 헤더에 보정 루프 절차 명시).
- `lib/signal/factors/momentum.ts`, `lib/signal/factors/trend.ts` — 이번 변경 대상 룰 파일.
- `lib/signal/levels/swingLevels.ts` — 재사용할 기존 스윙 탐지 유틸(`findSwingLows`/`findSwingHighs`).
- `lib/signal/intradayProfile.ts` — 단타 프로필 관통 seam(`structureLookback` 선례).
- `lib/copy/signal/labels.ts` — 기존에 죽어있던 `RULE_LABEL`/`ruleLabel()`.
- `app/api/stock/ai-analysis/route.ts` — `formatSignalForPrompt`(LLM 그라운딩 프롬프트 빌더).
- `lib/server/paperTrading/decisionProviders/intradayCli.ts` — 단타 preGate HOLD 판정 소비처.
- `docs/references/project_intraday-scalping-agent.md`(메모리) — 단타 엔진 "decision-support 전용, 자동매매 NO-GO" 기존 결정 컨텍스트.

## 8. 영향 분석

### 8.1 일봉 AI종합분석 (`app/api/stock/ai-analysis/route.ts`)

- **직접 영향**: `formatSignalForPrompt`가 PM 프롬프트에 넣는 축별 근거 텍스트가 raw key(`MACD_HIST_NEG(RSI 28.4)`)에서 정확한 한글 라벨(`MACD 히스토그램 하락(RSI 28.4)` 식)로 바뀐다. 신규 룰(`MACD_CONVERGE_*`, `HIGHER_LOW_BASE`/`LOWER_HIGH_TOP`)이 발화하면 momentum/trend 축 상위 3개 hit(`topHits` 정렬 로직, 가중치 내림차순 slice(3))에 새 항목이 끼어들 수 있어, 기존에 노출되던 다른 hit가 topHits에서 밀려날 가능성이 있다(가중치 1~2로 낮게 설정돼 있어 실제로 밀려날 확률은 낮음 — macdCross(3)·maAligned(4) 등보다 항상 후순위).
- **의도된 효과**: PM 리포트가 "MACD 음전환"처럼 오래된 전환을 현재형으로 오독 서술하는 대신, "MACD 히스토그램 축소 중(양전환 임박)"처럼 방향 변화를 정확히 인지해 `short_term_outlook`/`key_strengths` 서술 품질이 개선될 것으로 기대. 단, 이는 LLM 서술 품질 변화라 정량 AC로 고정하기 어렵다 — QA가 HD현대 재분석 비교로 정성 확인.
- **회귀 위험**: 낮음. 프롬프트 텍스트 포맷 변경 1줄(`h.key` → `ruleLabel(h.key)`)이라 응답 스키마(JSON 구조)는 무변경, `toDecisionSignal` 등 저장 경로도 무변경.

### 8.2 단타 preGate (`lib/server/paperTrading/decisionProviders/intradayCli.ts`, HOLD 판정)

- **직접 영향**: `evaluateIntradaySignal`(momentum/trend 축)에 신규 룰이 포함되면서 `ctx.signal.action`(BUY/HOLD/SELL)과 axis score가 달라질 수 있다. 특히 preGate의 스킵 조건(`flat && ctx.signal.action === "HOLD" && previousDecision HOLD`)에서 `action`이 종전엔 HOLD였다가 신규 룰(예: `HIGHER_LOW_BASE`)로 trend 축이 완화돼 BUY로 넘어가는 케이스가 늘어나면 LLM 호출 빈도가 늘 수 있다(비용 영향, 알파 영향은 아님).
- **안전장치**: `trendHigherLowLookback`을 하드코딩하지 않고 `intradayProfile.ts`의 기존 `structureLookback`(1분/3분=130, 5분=78, 15분=52)을 그대로 재사용해 관통한다 — 일봉 스케일(30봉)을 분봉에 그대로 쓰면 5분봉에서 30봉≈2.5시간이 되어 스윙 정의가 왜곡되는 문제를 이미 검증된 프로필 값으로 회피.
- **검증 한계**: 분봉에는 정식 백테스트 하니스(Triple Barrier 등)가 없다 — 이번 PR의 단타 검증 기준은 "알파 증명"이 아니라 "며칠 관찰 기반으로 명백한 오작동/과다발화(휩쏘) 없음" 확인(§5 검증 섹션 6번, QA가 5분봉 실데이터 스팟체크 + 라이브 모의세션 관찰로 수행).
- **회귀 위험**: 중간. 단타는 결정론 폴백(`applyPostGate`/`deriveFromSignal`)에도 4축 엔진 결과가 쓰이므로, 신규 룰이 지나치게 자주 발화하면(휩쏘) 결정론 경로의 BUY/SELL 강등·승격 빈도가 흔들릴 수 있다. 단, 신규 룰 가중치가 기존 대비 낮게(1~2) 설정돼 있어 단독으로 액션을 뒤집을 가능성은 낮다.

### 8.3 공통 (엔진 레벨)

- **신규 상수/함수 추가 위주** — 기존 `RULE_WEIGHTS` 값·기존 함수 시그니처(하위호환 optional 인자만 추가)는 불변. 회귀 표면은 "신규 룰이 기존 룰과 상호작용해 총점이 달라지는 경우"에 집중된다.
- `AXIS_SCALE`(momentum=9, trend=11) 대비 신규 가중치 합산으로 조기 포화(0/100 클램프) 빈도가 늘 가능성 — 백테스트 결과에 따라 후속 조정(§9 OPEN QUESTION).
- 변경 파일 수(8개) 대비 각 파일 diff는 작음(상수 추가·함수 내 분기 추가·라벨 매핑 추가·프롬프트 1줄 치환) — 커밋 분할 없이 단일 PR로 진행 권고(신호엔진 PRD 관례상 `signal-rule-engine`도 단일 PR이었음, 디자이너 의존 없음, 총 변경량이 크지 않음).

## 9. OPEN QUESTION (PM 권고 동봉)

- **q1. 신규 룰 가중치·lookback 최종값** — `macdConverge=1`, `higherLowBase=2`, `MACD_CONVERGE_LOOKBACK=4`, `HIGHER_LOW_LOOKBACK=30`은 계획서상 초기값이다. **[OPEN QUESTION] 최종값은 `RUN_LIVE_BACKTEST` 백테스트(변경 전/후 profitFactor·hitRate·attribution 비교) 결과로 확정한다.** → **PM 권고**: 초기값으로 구현·커밋하고, QA 단계에서 백테스트 attribution이 역예측(음의 평균수익)으로 나오면 가중치를 0에 가깝게 낮추거나 조건을 더 보수적으로(연속 봉수↑) 조정한다. 표를 QA 리포트에 남겨 Reviewer가 근거를 확인할 수 있게 한다.
- **q2. `AXIS_SCALE` 상향 여부** — momentum=9/trend=11이 신규 가중치 추가로 조기 포화될 가능성. → **PM 권고**: 이번 PR에서는 상향하지 않고 백테스트 결과를 먼저 관찰, 포화 빈도가 유의미하게 늘면 소폭(예 +1~2) 상향을 QA 단계에서 별도 커밋으로 반영(계획서 §검증 5번과 동일 순서).
- **q3. `MACD_CONVERGE_LOOKBACK` 분봉 프로필화 여부** — 일봉 기준 4봉을 분봉(1/5/15분)에도 그대로 쓰면 시간 스케일이 다르다(로컬 단조성 패턴이라 계획서는 무관하다고 판단). → **PM 권고**: 계획서 원안대로 관통하지 않고 그대로 사용, 단 QA의 "5분봉 실데이터 스팟체크"에서 과다발화가 관찰되면 프로필화를 후속 티켓으로 분리(이번 PR 스코프 확장 금지).
- **q4. `STRONG_BULL_TRIGGERS`/`STRONG_BEAR_TRIGGERS`에 신규 키 추가 여부** — 계획서는 명시적으로 이번 스코프 아님으로 뒀다. → **PM 권고**: 그대로 범위 밖 유지, 백테스트로 attribution 검증된 뒤 별도 PRD/PR로 진행.
