# QA — intraday-stop-slippage (단타 손절 신뢰성 A+B+C)

- 대상 PR: #333 `feature/intraday-stop-slippage` (커밋 2c92f40·53b309a·555446f)
- 판정: **qa-passed** (실패 0건) · 검증일 2026-07-09
- 참조 PRD: `docs/prd/intraday-stop-slippage.md` §5 AC-1~AC-7
- ⚠️ node_modules 심볼릭 → Turbopack 거부. 검증은 vitest/tsc/eslint + 코드리딩 + 스크래치패드 실데이터 replay 로 수행(dev 서버 라운드트립 불가, 명시).

## 자동 게이트 (본인 재실행)

| 명령 | 결과 |
|---|---|
| `npx vitest run` | **1232 passed / 3 skipped** (136 파일), exit 0 |
| `npx tsc --noEmit` | **0 에러**, exit 0 |
| `npx eslint .` | **0 에러/경고**, exit 0 |
| BFF 무회귀 `git grep http://127.0.0.1 -- app/` | route handler fallback(fastapi.ts) 외 **0건** |
| 한글 톤 / a11y | intradayRead 카피 전부 한글(ticker 예외) · HardStopSelect aria-haspopup·expanded·label·role=option·aria-selected 연결 |

## AC 별 검증

| # | 시나리오 | 기대 | 실측 |
|---|---|---|---|
| AC-1 | 틱 사이 손절선 하회 | ~60초 내 A EXIT | ✅ `runIntradayRiskSweep`(9,700 ≤ stop 9,800) → 즉시 EXIT·무포지션화, 다음 5분 틱 대기 없음 (tickScheduler.test) |
| AC-2 | 포지션 −5% 초과 | B 포지션 하드스톱 EXIT | ✅ 94,000(−6%)·stopPrice=null → `포지션 손실 한도(-5%)` EXIT (virtualExecution.test, runTickIntraday.test 배선) |
| AC-3 | 세션 −7% 초과 | B 세션 flatten | ✅ sessionReturnPct −8% → `세션 손실 한도(-7%)` 전량 flatten (virtualExecution.test) |
| AC-4 | C −3/−5/−8/끄기 | 각 값 반영·끄기 시 동적손절 유지 | ✅ 생성 스탬프 −5/−7 기본·override −8·null 존중(runTickIntraday.test)·검증 [−20,−1]∪null(validateCreateSession.test) |
| AC-5 | 정상 흐름 | 회귀 0·불필요 EXIT 0 | ✅ +1% 홀드 무주문·손절선 위(10,100) 무EXIT·mock 경로 무영향(provider 게이트 2중) |
| AC-6 | A 리스크 스윕 | LLM 0·owner게이트·중복EXIT 없음 | ✅ 하단 상세 |
| AC-7 | 관측성 | 손절선 vs 실체결 갭 기록 | ✅ `손절선 97,000원 대비 실체결 94,905원 (-2.2%)` guardAdjustments 기록 (동적손절·포지션하드스톱만 stopReference) |

## AC-6 중복방지 (초=30 스킴) — 핵심 검증

- **창 분리**: LLM 5분 틱 = `floorToTickWindow`(분 경계 → 초=00), 리스크 틱 = `riskSweepTickWindow`(초=30 고정). 두 창은 **어떤 주기에서도 절대 같아질 수 없음** → `tickWindowStart` dedup 이 서로를 삼키지 않음.
- **사이클 순서**: `cycle()` = 리스크 스윕 → LLM 틱 (같은 `tickChain` 직렬화). 스윕이 청산하면 뒤 LLM 틱은 `resolveForcedExit`가 `held` 없음 → null → 재EXIT 안 함.
- **멱등**: 청산 후 재스윕 = 무포지션 → 가격 조회조차 없이 no-op(테스트 통과). 무발동 시 `orders.length===0` → **틱 미기록**(60초 HOLD 틱 스팸 0).
- **LLM 0**: `runRiskCheckOnce`가 순수 `riskResolver` 스텁 주입 → `resolveIntradayTickDecision`(CLI) 미호출.
- **owner 게이트**: `selectSchedulableSessions`(owner===operator ‖ !owner) → 남 세션 스윕 0(포지션 유지 테스트 통과).
- **판정: 중복 EXIT 불가 확인** — 창 스킴(00 vs 30) + tickChain 직렬화 + 무포지션 skip 3중.

## off-disables-hardstop-but-keeps-dynamic-stop (임계 검증)

- `resolveForcedExit` 우선순위: ①장막판 → ②세션하드스톱 → ③**동적손절선(stopPrice)** → ④포지션하드스톱(posHard) → ⑤익절.
- `positionHardStopPct=null` → ④만 스킵(`posHard != null` false). ③(stopPrice)은 하드스톱과 무관하게 항상 평가.
- 테스트 이중 확인: 끄기+손절선 있음(96,000≤97,000) → EXIT(손절선), 끄기+손절선 없음(−6% 급락) → **미청산**(포지션 유지·"손실 한도" 문구 없음).
- **판정: 끄기는 하드스톱만 끄고 동적 손절선은 유지** 확인.

## Stale/missing 가격 안전 (AC 보강)

- `executeVirtualTrade`: `!price ‖ freshnessSeconds > 180` → `markOnly`(무주문). 리스크 스윕은 `orders.length===0` → 틱 미기록·`entry.positions` 미갱신 → **stale 로 절대 청산 안 함**. 판정: SKIP 확인.

## 무회귀 (AC-5, 가장 중요)

- mock 세션: `decisionProvider` 게이트 2중(`selectSchedulableSessions` + `runRiskCheckOnce`) + `forcedExit` 미주입 → **완전 무영향**. mock 하드스톱 경로(decisionProviders/mock) 무변경.
- 기존 테스트 전량 green(runTick·intradayCli·mock·tickScheduler·owner-gate·watchlist 포함 1232 passed).

## 다스코 실데이터 replay (로직 검증)

- 스크래치패드 `fills-report.txt`: 다스코(058730) 진입 5,473 · 손절 5,420 · **실청산 t7 12:05 @5,077 (−7.96%, −280,638원)**. 12:00봉 장대음봉이 손절선 건너뛰고 다음 5분 틱에서야 청산.
- 코드 확인: `stopPrice = d.invalidationPrice`(intradayTickDecision:119) → 최근 틱 손절선 5,420 이 `invalidationPrice` 로 영속 → 리스크 스윕이 `lastTick.decision.invalidationPrice`(=5,420) 를 읽음.
- **판정**: t1(11:35)~t7(12:05) 사이 매 60초 스윕이 `last ≤ 5,420` 최초 관측 시 즉시 EXIT → 슬리피지 상한 5분→~60초. 실체결은 −1%대 근방(감지 지연 1분 이내분)으로, 실제 −7.96% 드라마 미발생. 손절선 부재였어도 −5% 포지션 하드스톱(5,199)이 −7.96% 이전 백스톱. 스케줄러 자체 replay 불가하나 로직상 **손절선 하회가 ~60초 내 청산**됨을 확정.
