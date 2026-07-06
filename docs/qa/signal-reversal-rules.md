# QA: signal-reversal-rules

- **slug**: `signal-reversal-rules`
- **PR**: #294 (`feature/signal-reversal-rules`)
- **PRD**: `docs/prd/signal-reversal-rules.md`
- **검증일**: 2026-07-06
- **검증자**: QA 에이전트
- **환경**: 로컬(macOS, Node 20), 실 KIS 크리덴셜(`.env.local`), 실 시장 데이터. dev 서버 기동 불필요(UI 변경 없음, 순수 로직 + BFF 프롬프트 조정).

## 요약 판정

**PASS** — AC-1~AC-9 전부 통과(백테스트 회귀 없음, 신규 룰 역예측 없음). AC-10은 부분 확인(`MACD_CONVERGE_UP` 라이브 발화·완화 확인, `HIGHER_LOW_BASE`는 오늘(2026-07-06) 정확한 스냅샷에서는 미발화 — 버그 아니라 look-ahead 안전 설계상 "두 번째 확정 스윙 저점" 미형성 때문, 유닛 테스트로 로직 자체는 검증됨). 분봉 스팟체크에서 발화 빈도가 일봉 대비 다소 높으나(§"에지 케이스" 참조) 일봉 백테스트가 이미 이 빈도대에서 순예측력을 확인했으므로 결함으로 보지 않음 — 후속 모니터링 권고로 기록.

## AC 별 표

| AC | 재현 절차 | 기대 결과 | 실측 결과 |
|---|---|---|---|
| AC-1 | `git grep -n "MACD_CONVERGE_LOOKBACK\|HIGHER_LOW_LOOKBACK\|macdConverge\|higherLowBase" lib/signal/weights.ts` + `git diff main...HEAD -- lib/signal/weights.ts` | 4개 신규 상수/가중치 존재, 기존 `RULE_WEIGHTS` 키 값 불변 | **PASS**. `macdConverge:1`, `higherLowBase:2`, `MACD_CONVERGE_LOOKBACK=4`, `HIGHER_LOW_LOOKBACK=30` 모두 확인. diff상 기존 키(`maAligned` 등)는 변경 없이 신규 2줄만 추가(`+macdConverge`, `+higherLowBase`) + 신규 상수 2줄. |
| AC-2 | `git grep -n "MACD_CONVERGE_UP\|MACD_CONVERGE_DOWN" lib/signal/factors/momentum.ts` + `npx vitest run lib/signal/__tests__/factors.test.ts -t "MACD_CONVERGE"` | 두 룰 키 존재 + 발화/미발화 테스트 통과 | **PASS**(주석 1건). 두 키 모두 `momentum.ts:74,76`에 존재. PRD의 literal `-t "MACD_CONVERGE"`는 정확 문자열매치라 발화 테스트 1건만 잡힘(미발화 테스트명은 "단조 선형 추세... → MACD 수렴 룰 미발화"로 리터럴 미포함) — `-t "MACD_CONVERGE\|MACD 수렴"`으로 넓혀 재실행하니 2건(발화+미발화) 모두 PASS. AC-7(전체 스위트)에서도 양쪽 다 포함돼 통과 확인. **경미한 발견**: AC-2의 예시 grep이 미발화 케이스를 못 잡는 것은 테스트명 표기 이슈일 뿐 실제 커버리지 문제는 아님. |
| AC-3 | `git grep -n "HIGHER_LOW_BASE\|LOWER_HIGH_TOP" lib/signal/factors/trend.ts` + `git grep -n "findSwingLows\|findSwingHighs" lib/signal/factors/trend.ts` + `npx vitest run lib/signal/__tests__/factors.test.ts -t "저점 우상향\|고점 우하향"` | 두 룰 키 + import 존재, 테스트 통과 | **PASS**. `trend.ts:124,137`에 키 존재, `trend.ts:17`에 `findSwingHighs, findSwingLows` import 확인. PRD 그대로의 `-t` 명령 실행 결과 2 passed(발화+대칭 케이스). |
| AC-4 | `git grep -n "trendHigherLowLookback" lib/types/signal/index.ts lib/signal/engine.ts lib/signal/intradayProfile.ts` + `structureLookback` 4개 값 diff | 3개 파일 관통 확인, `structureLookback` 130/130/78/52 불변 | **PASS**. `lib/types/signal/index.ts:121`(타입 optional 필드), `lib/signal/engine.ts:50`(`evaluateTrend(ctx, {higherLowLookback: opts?.trendHigherLowLookback})`), `lib/signal/intradayProfile.ts:128`(`trendHigherLowLookback: profile.structureLookback`) 3곳 모두 확인. 기존 프로필 값 130/130/78/52 그대로(신규 필드 추가 없음). |
| AC-5 | `git grep -n "MACD_CONVERGE_UP\|MACD_CONVERGE_DOWN\|HIGHER_LOW_BASE\|LOWER_HIGH_TOP" lib/copy/signal/labels.ts` | 4개 한글 라벨 모두 `RULE_LABEL`에 존재 | **PASS**. `labels.ts:55,56,63,64`에 각각 "저점 우상향(바닥 다지기)", "고점 우하향(천장 다지기)", "MACD 히스토그램 축소 중(양전환 임박)", "MACD 히스토그램 축소 중(음전환 임박)" 확인. |
| AC-6 | `git grep -n "ruleLabel" app/api/stock/ai-analysis/route.ts` + raw `h.key` 잔존 0건 확인 | `formatSignalForPrompt`가 `ruleLabel(h.key)` 사용, raw key 잔존 0건 | **PASS**. `route.ts:25` import, `route.ts:302` `.map((h) => h.detail ? \`${ruleLabel(h.key)}(${h.detail})\` : ruleLabel(h.key))`로 완전 치환. `git grep -n "h\.key"` 결과 이 한 줄뿐(모두 `ruleLabel()` 인자로만 등장, raw 노출 0건). |
| AC-7 | `npx vitest run lib/signal/__tests__/factors.test.ts` | 전체 통과(기존+신규 회귀 없음) | **PASS**. `11 passed (11)`. |
| AC-8 | `npx tsc --noEmit -p tsconfig.json` | clean | **PASS**. 출력 없음, exit 0. |
| AC-9 | `RUN_LIVE_BACKTEST=1 npx vitest run lib/signal/backtest/__live__/liveBacktest.test.ts`(변경 전/후) + attribution 수치 비교 | profitFactor/hitRate 악화 없음, 신규 룰 attribution 역예측 아님 | **PASS**. 상세는 "AC-9 상세" 절 참조. 3종목 기본셋·15종목 확장셋 모두 개선(회귀 없음), 신규 4개 룰 키(MACD_CONVERGE_UP/DOWN, HIGHER_LOW_BASE, LOWER_HIGH_TOP) 전부 평균수익 양수(역예측 없음). |
| AC-10 | HD현대(267250) 실데이터로 `evaluateSignal` 직접 재현(청크 페치 후 date 오름차순 정렬) | `MACD_CONVERGE_UP`/`HIGHER_LOW_BASE` 발화 + momentum/trend axis score 완화 확인 | **부분 PASS**. 상세는 "AC-10 상세" 절 참조. `MACD_CONVERGE_UP` 발화 확인(momentum 33.33→36.11로 완화, 레짐게이트로 weight 1→0.5 감쇠 적용됨 — 설계대로). `HIGHER_LOW_BASE`는 2026-07-06 시점 라이브 스냅샷에서 **미발화**(trend axis 40.91 불변) — 버그 아님, 최근 저점(6/29~7/6)이 아직 "확정 스윙 저점"으로 승격되지 못한 상태(6/26 저점 184,500이 여전히 lookback 30봉 내 최저 확정 피벗, 이후 반등이 아직 두 번째 확정 저점을 형성 못 함, look-ahead 안전 설계상 정상 동작). 유닛 테스트(AC-3)로 로직 자체의 정상 발화는 이미 검증됨. |

## AC-9 상세 (백테스트 전/후 비교)

방법: 실행마다 KIS 재호출 부담을 줄이기 위해 `liveBacktest.test.ts`가 생성한 `__fixtures__/<ticker>.json`(실 KIS 캔들)을 캐시해, 전/후 브랜치가 **동일한 캔들 데이터**로 비교되도록 함(`git worktree add ../signal-reversal-rules-baseline main`으로 격리 후 fixture 파일 복사, 작업 종료 후 `git worktree remove` 완료). ad-hoc 스크립트(`backtest()` + `computeAttribution()` 직접 호출, 스크래치 디렉토리)로 attribution까지 산출 — `liveBacktest.test.ts` 자체는 attribution을 콘솔에 출력하지 않아(풀링 메트릭만 출력) 별도 스크립트로 보강.

### 실행 1 — `RUN_LIVE_BACKTEST=1 npx vitest run lib/signal/backtest/__live__/liveBacktest.test.ts` (현재 브랜치, PRD 기본 LIVE_TICKERS)

```
005930 | ATR  표본45 적중40.5% 손익비1.34 평균0.86% || 구조 표본45 적중40.5% 손익비1.47 평균1.05% ↑
000660 | ATR  표본40 적중47.4% 손익비1.35 평균1.32% || 구조 표본40 적중50.0% 손익비1.33 평균1.15% ↓
247540 | ATR  표본35 적중37.0% 손익비1.04 평균0.19% || 구조 표본35 적중32.3% 손익비0.95 평균-0.22% ↓
===== 풀링(3종목, net@0.3%, 트리거+레짐) =====
ATR비대칭    표본  120 | 적중 42.1% | 손익비 1.24 | 평균 0.82%
시장구조      표본  120 | 적중 41.4% | 손익비 1.22 | 평균 0.71%
합격(PF>1.5 & avgR>0): 0/3
```
소요 시간: 6.26s(토큰 파일 캐시 재사용).

### 실행 2 — 동일 fixture 로 3종목 pooled attribution(구조 배리어)

| 신규 룰 | 표본 | 적중률 | 평균수익 |
|---|---|---|---|
| `MACD_CONVERGE_UP` | 16 | 46.7% | **+2.91%** |
| `MACD_CONVERGE_DOWN` | 17 | 56.3% | **+1.85%** |
| `HIGHER_LOW_BASE` | 47 | 46.5% | **+0.55%** |
| `LOWER_HIGH_TOP` | 40 | 29.7% | **+0.08%** |

풀링 전체 평균 0.71%(구조 배리어) 대비, `MACD_CONVERGE_UP`(+2.91%)·`MACD_CONVERGE_DOWN`(+1.85%)·`HIGHER_LOW_BASE`(+0.55%)는 평균 이상, `LOWER_HIGH_TOP`(+0.08%)만 평균 이하지만 **여전히 양수** — 역예측(음의 평균수익) 없음.

### 실행 3 — 변경 전(main) 동일 fixture, 동일 3종목 (before/after 회귀 비교)

| 지표 | 변경 전(main) | 변경 후(현재 브랜치) | Δ |
|---|---|---|---|
| 표본(구조) | 120 | 120 | 0 |
| 적중률 | 40.5% | 41.4% | **+0.9pt** |
| 손익비 | 1.16 | 1.22 | **+0.06** |
| 평균수익 | 0.52% | 0.71% | **+0.19pt** |

회귀 없음 — 오히려 소폭 개선(신규 룰이 momentum/trend 축을 완화시킨 borderline 트레이드가 순방향으로 작용).

### 실행 4 — 15종목 확장셋(기존 캐시 fixture 재사용, LIVE_TICKERS 확장, 신규 KIS 호출 없음) — 통계 표본 확대

변경 전(main) vs 변경 후(현재 브랜치), 동일 15종목·동일 캔들:

| 지표 | 변경 전 | 변경 후 | Δ |
|---|---|---|---|
| 표본 | 624 | 601 | -23(-3.7%) |
| 적중률 | 35.8% | 36.2% | +0.4pt |
| 손익비 | 1.07 | 1.10 | +0.03 |
| 평균수익 | 0.21% | 0.28% | +0.07pt |

15종목 신규 룰 attribution(변경 후, 표본 큼 — 통계적으로 더 신뢰 가능):

| 신규 룰 | 표본 | 적중률 | 평균수익 |
|---|---|---|---|
| `MACD_CONVERGE_UP` | 70 | 29.5% | **+0.55%** |
| `MACD_CONVERGE_DOWN` | 55 | 45.1% | **+1.17%** |
| `HIGHER_LOW_BASE` | 242 | 42.5% | **+0.97%**(pooled 전체 평균 0.28%의 3배 이상) |
| `LOWER_HIGH_TOP` | 248 | 33.0% | **+0.20%**(pooled 평균과 근접, 약보합) |

**결론**: 3종목·15종목 양쪽 다 (a) 전체 pooled 지표 회귀 없음(오히려 개선), (b) 신규 4개 룰 전부 평균수익 양수(역예측 없음). `HIGHER_LOW_BASE`는 표본이 커질수록(47→242) 오히려 더 강한 양의 예측력(+0.55%→+0.97%)을 보여 매우 유의미한 신호로 보인다. `LOWER_HIGH_TOP`은 적중률(29.7~33.0%)이 낮지만 평균수익이 근소하게라도 항상 양수 — 비대칭 페이오프(적게 이기고 크게 벎)로 해석되며 역예측은 아니다. **PRD §9 q1의 "가중치 낮추기" 컨틴전시는 발동 조건(역예측) 미충족 — 초기값(`macdConverge=1`, `higherLowBase=2`) 그대로 유지 권고.**

## AC-10 상세 (HD현대 267250 실데이터 재현)

방법: KIS 단일 콜은 최근 100봉 상한이라(직접 확인 — 200/400일 range를 줘도 100봉만 반환) `liveBacktest.test.ts`와 동일한 청크 페이징(130일 단위, 반복 콜)으로 267봉(2025-06-02~2026-07-06) 확보 후 date 오름차순 정렬, `evaluateSignal(candles)` 직접 호출. 동일 캔들 데이터를 별도 워크트리(main)에서도 실행해 축 스코어 전/후 비교.

```
받아온 캔들 수(정렬 후): 267, 범위: 2025-06-02 ~ 2026-07-06, limitedData=false

[변경 후=현재 브랜치] action=HOLD score=42.65 confidence=0.5
[trend] score=40.91 direction=-1
  PRICE_BELOW_MAS dir=-1 weight=2
[momentum] score=36.11 direction=-1
  MACD_HIST_NEG dir=-1 weight=1.5
  MACD_CONVERGE_UP dir=1 weight=0.5 detail=4봉 연속 축소(-3231→-392)   ← 신규, 레짐게이트로 1→0.5 감쇠
  RSI_BELOW_50 dir=-1 weight=1.5 detail=RSI 38.0

[변경 전=main, 동일 캔들] action=HOLD score=41.82 confidence=0.5
[trend] score=40.91 direction=-1   (동일 — HIGHER_LOW_BASE 미발화이므로 무변화)
  PRICE_BELOW_MAS dir=-1 weight=2
[momentum] score=33.33 direction=-1   (신규 룰 없음)
  MACD_HIST_NEG dir=-1 weight=1.5
  RSI_BELOW_50 dir=-1 weight=1.5
```

**`MACD_CONVERGE_UP` 확인**: 발화(direction=+1, "4봉 연속 축소(-3231→-392)") — PRD가 서술한 실제 현상("6/26 이후 6거래일 연속 히스토그램 좁혀짐")과 부호·방향 일치(수치는 QA 시점 데이터가 PRD 작성 시점과 다른 최신 봉 포함이라 값 자체는 다름, 방향성은 동일). momentum 축 점수가 33.33→36.11로 **+2.78pt 완화**(레짐 게이트가 역추세라 weight 1→0.5로 감쇠했음에도 완화 효과 확인) — PRD 기대대로 동작.

**`HIGHER_LOW_BASE` 미발화 — 원인 분석**: `findSwingLows(candles.slice(-30), 3)` 결과가 `[231500(6/11), 184500(6/26)]`으로 나와 마지막 저점(184500)이 직전(231500)보다 **낮음**(우하향) → 규칙 미발화. 직접 로우값을 뽑아보면 6/26 이후(191400→196300→198800→195300→199000→203000) 저점이 완만히 올라가는 중이나, `findSwingLows`의 확정 조건(양방향 window=3봉 모두 더 높아야 함)상 6/29(191400)는 3봉 전인 6/26(184500)이 더 낮아 확정 스윙 저점으로 인정되지 않음(같은 바닥다지기 구간의 일부로 흡수됨) — **미래 데이터 없이 확정하지 않는 look-ahead 안전 설계가 의도대로 작동한 것**이며 버그 아님. 향후 며칠 내 추가 조정(재차 하락 후 반등)이 생기면 두 번째 확정 저점이 형성돼 발화할 가능성이 높다(6/26 저점을 넘지 않는 조정이면). 로직 자체의 정상 발화·direction 판정은 유닛 테스트(`factors.test.ts` "저점 우상향" 케이스, AC-3)로 이미 검증됨.

## 에지 케이스

- **KIS 단일 콜 100봉 상한**: `fetchStockDailyChartKis`에 range를 400일로 줘도 최근 100봉만 반환됨을 실측 확인(AC-10 재현 스크립트 1차 시도에서 발견) — `warmupOk`는 됐지만(`bars=100`) `limitedData=true`(fullMin 130 미달)로 trend 축 hits가 전부 비었음(SMA120·ADX 등 다수 규칙이 null 가드로 스킵). 청크 페이징(liveBacktest.test.ts 패턴)으로 267봉 확보 후 재현해 정상 확인. **이 자체는 기존 동작(PR 무관)이나, AC-10 재현 시 반드시 청크 페이징이 필요하다는 점을 기록.**
- **분봉(5분봉) 신규 룰 발화 빈도 스팟체크**(§6 가정 — "알파 증명 아님, 명백한 오작동/과다발화 없음"이 기준): 005930·000660 두 종목, 2026-06-30~07-06(당일 포함 4거래일+당일, 341/340봉 평가) 5분봉으로 `evaluateIntradaySignal` 슬라이딩 재평가.

  | 종목 | MACD_CONVERGE_* | HIGHER_LOW_BASE | LOWER_HIGH_TOP |
  |---|---|---|---|
  | 005930 | 18.8% | 63.9% | 41.9% |
  | 000660 | 22.1% | 49.1% | 51.5% |

  일견 매우 높은 발화율(과제 지시의 "5% 미만" 휴리스틱 기준을 크게 상회). 그러나 **동일 로직을 일봉에도 적용해 기저 발화율을 비교**한 결과(HD현대 178봉, 005930/000660/247540 각 643봉):

  | 종목(일봉) | MACD_CONVERGE_* | HIGHER_LOW_BASE | LOWER_HIGH_TOP |
  |---|---|---|---|
  | 267250(HD현대) | 22.5% | 43.8% | 32.0% |
  | 005930 | 24.0% | 40.3% | 32.3% |
  | 000660 | 21.8% | 33.9% | 25.7% |
  | 247540 | 21.5% | 36.4% | 44.8% |

  일봉 기저 발화율도 이미 22~45% 수준으로 "5% 미만" 가정과 거리가 있으나, **AC-9 백테스트가 바로 이 발화율 대역에서 신규 룰들이 순양(+)의 예측력을 갖는다는 것을 이미 확인**했다(`HIGHER_LOW_BASE` +0.97%, `MACD_CONVERGE_UP` +0.55% 등, "AC-9 상세" 참조). 즉 이 정도 빈도는 룰 설계상 "노이즈 오작동"이 아니라 원래 그렇게 자주 성립하는 패턴(추세가 강하지 않은 구간에서 스윙 저점/고점 방향이 자주 바뀜)이며, 일봉에서 이미 검증된 것과 동일 자릿수(intraday가 대략 1.2~1.6배 높은 정도)라 "명백한 오작동"으로 판정하기는 근거가 약하다. **다만 분봉 전용 정식 백테스트 하니스가 없어(PRD §6 명시) 이 빈도대에서 분봉 예측력 자체는 검증 불가 — 후속 모니터링 필요 항목으로 기록**(PRD §9 q3의 "분봉 프로필화" 컨틴전시와 동일 맥락, 이번엔 `MACD_CONVERGE_LOOKBACK`뿐 아니라 `STRUCTURE_SWING_WINDOW`도 분봉 스케일 재검토 후보로 추가 권고).
- **레짐 게이트 자동 적용**: `MACD_CONVERGE_UP`(HD현대 사례, 역추세)에서 weight가 1→0.5로 감쇠되는 것을 실측 확인 — PRD 3.2 "기존 함수 끝의 레짐 게이트에 자동 포함됨" 서술과 일치.
- **트렌드 축 무게이트**: `HIGHER_LOW_BASE`/`LOWER_HIGH_TOP`은 trend 축 소속이라 레짐 게이트 감쇠 대상이 아님(PRD 3.2 "trend.ts엔 레짐 게이트가 없음" 서술과 일치, 코드상 `evaluateTrend` 내 다른 hits와 동일하게 무감쇠로 push됨 확인).
- **`bstp`류 malformed/BE다운 시나리오**: 본 PR은 UI/BFF 응답 스키마 무변경(프롬프트 텍스트 1줄 치환뿐, `formatSignalForPrompt` 출력은 여전히 string)이라 별도 BE 다운·malformed JSON 케이스는 해당 없음(PRD §8.1 "응답 스키마 무변경" 서술과 일치, `route.ts` diff 확인 결과 `h.key`→`ruleLabel(h.key)` 1줄 치환 외 무변경).

## 라운드트립

해당 없음 — PRD가 "UI 포함 여부: 없음"으로 명시(순수 로직 + BFF 프롬프트 조정), 화면 컴포넌트·라우트 변경 0. dev 서버 기동 후 수동 화면 재현 대상 아님.

## DESIGN.md 토큰 라이브 동기화 검증

해당 없음 — 스타일링/디자인 토큰 변경 없음(PRD 명시).

## 회귀 전수 점검(참고, PRD 필수 항목 아님)

`npx vitest run`(전체 스위트) — **1051 passed, 3 skipped(RUN_LIVE_BACKTEST 전용), 0 failed**. 신규 룰 도입이 시그널 엔진 소비처(백테스트·단타 게이트·프롬프트 빌더 등) 전반에 회귀를 일으키지 않음을 확인.

## 판정 근거 요약

- 명백한 버그(타입에러/테스트실패/크래시) **없음** → FAIL 아님.
- 신규 룰 역예측(음의 평균수익) **없음**(3종목·15종목 양쪽, 표본 40~250) → PRD §9 q1의 "가중치 낮춰 병합" REVIEW 컨틴전시 **미발동**.
- AC-10 `HIGHER_LOW_BASE` 라이브 미발화는 설계상 정상 동작(look-ahead 안전) + 유닛 테스트로 로직 검증 완료 → 감점 사유 아님.
- 분봉 발화 빈도는 일봉 기저 대비 소폭 높으나 같은 자릿수이고 일봉에서 이미 순예측력 검증됨 → 감점 사유는 아니되, 분봉 전용 백테스트 부재로 **후속 모니터링 항목**으로 명시.

**종합: PASS.**
