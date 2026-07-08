# PRD — intraday-decision-overhaul (단타 AI 판단 로직 고도화)

- 작성: PM 역할 (2026-07-09)
- 브랜치 시리즈: `feature/intraday-decision-overhaul`(PR-0) 외 단계별 브랜치
- 선행: #203~#210(단타 코어), #204/#205/#207(경보 게이트), intradaySnapshot(전 틱 영속)
- 근거: 2,199틱 전수 데이터 감사(2026-07-09) + 오픈소스 리서치(TradingAgents·FinMem·FinPos·메타라벨링)

## 1. 배경 / 문제

단타 모의투자(cli-agent)가 **사실상 거래하지 않는다**. Supabase `paper_trading_ticks` 전수(2,199틱,
21세션·19종목) 감사 결과:

- judge LLM(②판단가) 942회 실행 → **실질 100% HOLD**(BUY 제안 4회, 전부 RRR 게이트 강등, SELL 0회).
- 실제 체결 8건(왕복 4회, +127,876원)은 전부 **CLI 실패 시 결정론 폴백**에서 발생 — AI가 스스로
  "사자/팔자"를 내 체결된 거래는 0건.
- 근본원인 4개(전부 코드로 확정):
  1. **동의도 50% 박제** — volume(급증≥1.5배)·volatility(밴드터치) 축이 이진 임계라 만성 중립
     (direction 0) → confidence=동의 축 비율이 2/4=0.5에 갇힘. LLM이 "동의도 50%"를 신뢰 부족으로 읽음.
  2. **RRR null 77%** — `structureBarrierAt` 이 구조 미확보·RRR<1.5 시 null 반환, 인트라데이 경로에
     ATR 폴백 미배선 → 사후 게이트·폴백이 모든 BUY를 자동 강등.
  3. **보상 미스매치** — 구조 TP 거리 중앙값 1.50%(71%가 2% 이내) vs 프롬프트 "2~5% 목표" →
     judge가 정직하게 "목표 여력 부족 → 관망".
  4. **HOLD 편향 프롬프트** — "모호하면 HOLD가 정답" + 신호생성·위험거부가 한 에이전트에 융합.
- 부차: CLI 실패 125틱(judge 시도 12%)의 94%가 **양 에이전트 빈 응답**(JSON 형식불량 아님) —
  실패 원문 미보존이라 소급 진단 불가.

## 2. 목표 (측정 가능)

- judge가 **방향확신 점수(convictionScore 0~100)** 를 내고, BUY/SELL 컷·사이징은 **결정론 코드**가
  담당 — LLM의 언어적 신중함을 체결 경로에서 제거.
- 캘리브레이션 기간(모의): 세션당 하루 **왕복 2~5회** 발생 → 승률·기대값 라벨 데이터 축적 →
  임계값을 데이터 근거로 조정. 기존 안전핀(경보 게이트·손실킬 -3%·15:00 신규금지·15:20 청산·
  포지션 하드스톱) 전부 유지.
- CLI 실패 시 원문·사유가 틱에 영속 → "왜 실패했나"에 데이터로 답함.
- **judge 실패 ≠ 의도 밖 체결**: 고도화 후 폴백은 신규 진입 불가(보유 관리만).

## 3. 범위 — PR 시리즈 분할

단일 PR 룰 일시 해제(finsight-redesign 선례). 각 PR 독립 머지 가능, 순서 고정.

| PR | 내용 | 행동 변경 |
|---|---|---|
| PR-0 | **실패 관측성**: `PaperTradingDecision.agentDiagnostics`(failureKind/attempts/rawTextHead 2KB/errorMessage/usage) — `decideIntradayWithCli` 실패·재시도 캡처, 파싱 실패 시 usage 유실 수정 | 없음 |
| PR-1a | **ATR 폴백 TP/SL**: `buildIntradayLevels` 구조 null → ATR(14)×3/1.5, `tpSource:"atr"` | 폴백 BUY 빈도↑ |
| PR-1b | **graded 축**: `EvaluateOptions.axisOverrides` seam(1곳), `lib/signal/intradayAxes.ts`(거래량 log z-score·VWAP σ-거리, RuleHit→`aggregateAxis`), graded confidence(limitedData 캡 유지), `BacktestOptions.evaluate` 훅, PRIOR_DAYS 1→3(env) | 시그널 분포·스킵률 변화 |
| PR-2 | **틱 자가채점**: `intraday_tick_labels` 테이블 + 마감 후 tripleBarrier 라벨링(멱등) + `/intraday` 관리자 버킷 뷰 — 기존 2,199틱 코퍼스 즉시 검증, judge 스키마 무의존이라 3a 선행 | 없음(관측) |
| PR-3a | **judge 점수화**: convictionScore 스키마(듀얼 normalize), env 컷(BUY≥65/SELL≤40), 사이징 `clamp(20+(c−65)×2, 20, 80)`, 재진입 쿨다운 N틱, conviction 영속+에코, 프롬프트 재작성(HOLD=fallback·ATR 상대 목표), **judge 실패 시 폴백 신규 진입 금지**, 표시 호환(파생 action/confidence → copy·Slack·ReadCard 무파괴) | judge가 거래 시작 |
| PR-3b | **preGate 교차 트리거**: VWAP 재탈환·ORB 돌파·volume z≥2 — crossing 이벤트 시맨틱(상태 검사 금지), `callLlm`만 유발(경보 우회 금지) | LLM 콜↑ |
| PR-3c | **CLI 신뢰성**: PR-0 텔레메트리 1주 축적 후 — AGENT_TIMEOUT env화, 타임아웃 예산 불변식(`TICK_TIMEOUT ≥ analyst+judge×attempts+20s`), failureKind별 재시도 정책 | 폴백률↓ |
| PR-4 | **장중 실검증**: 5분 주기 표준 세션, 행동 변경 PR마다 2~3세션 미니 검증, 버킷 승률로 env 컷 튜닝 | — |

## 4. 비범위

- 순수 시그널 엔진(`weights.ts`·`factors/*`) 상수·팩터 직수정 — opts seam 으로만 분기(일봉 공용,
  백테스트 보정 이력). 미지정 시 비트 동일 무회귀 테스트로 고정.
- 자동 엣지 주장 — 과거 검증 게이트 NO-GO 결론 유지. 본 시리즈는 판단 표현력·데이터 루프 복구
  (decision-support). 실전 전환 판단은 별도.
- 메타라벨링 풀 전환(2차 모델 P(hit)) — PR-2 라벨 수백 건 축적 후 Phase 5 후보.
- 12-에이전트 일봉 분석 경로 — 무접촉(스코어카드·FinalDecision 커플링 없음 확인).

## 5. 수용 기준 (AC)

| # | 시나리오 | 기대 |
|---|---|---|
| AC-1 | (PR-0) judge 빈 응답 2회 | 폴백 결정 + `agentDiagnostics.judge={failureKind:"empty",attempts:2,usage}` |
| AC-2 | (PR-0) judge 비-JSON 응답 | `failureKind:"parse"` + rawTextHead ≤2KB 보존 |
| AC-3 | (PR-0) 1차 실패→2차 성공 | 정상 결정 + `recovered:true`, 원문 보존, judgeModel 기록(성공 의미 유지) |
| AC-4 | (PR-0) 전부 성공 | agentDiagnostics 미기록(행동·payload 무변경) |
| AC-5 | (PR-1a) 구조 barrier null | tp/sl ATR 폴백 채움(`tpSource:"atr"`), RRR=2.0 |
| AC-6 | (PR-1a) 구조 barrier 존재 | 기존과 비트 동일 |
| AC-7 | (PR-1b) 일봉 경로(opts 미지정) | 비트 동일(무회귀) |
| AC-8 | (PR-1b) 분봉 graded 축 | volume/volatility 축점수 분산 > 0(박제 해소), 오프라인 백테스트 리포트 첨부 |
| AC-9 | (PR-2) 기존 코퍼스 라벨링 | 멱등 upsert, WIN/LOSS/NEUTRAL 버킷 뷰 표시 |
| AC-10 | (PR-3a) conviction 65/64 경계 | 65→BUY, 64→HOLD (env 컷) |
| AC-11 | (PR-3a) judge 실패 | 폴백 신규 진입 0(HOLD·보호 SELL만), forced-exit 불변 |
| AC-12 | (PR-3a) 표시 | ReadCard·Slack·틱 시트 무파괴(파생 action/confidence) |
| AC-13 | (PR-3b) VWAP 위 체류 중 | 트리거 재발화 없음(교차 시 1회만) |

## 6. 검증 게이트

- **무회귀**: 전체 vitest + 특히 `intradayProfile.test.ts`("opts 미지정===빈 opts 비트동일" —
  axisOverrides 케이스 추가), `intradayCli.test.ts`, engine/factors/backtest/levels 테스트.
- **백테스트**: 오프라인 `RUN_INTRADAY_DIAG=1`(고정 fixtures) before/after — 거래수·hitRate·PF·
  avgR·축점수 분산. 라이브 `RUN_LIVE_INTRADAY=1`(주간 — KIS 야간점검 회피). AC-3 기준(net PF>1.3
  등)은 **참고 지표**(엣지 증명이 목표 아님).
- **장중 실검증**: PR-4 — 평일 09:00~15:30, 왕복/일·버킷 승률.

## 7. 리스크 / 가드레일

1. **순서 함정**: 신뢰성(3c)을 점수화(3a) 전에 완결하면 유일 거래 경로(폴백)가 죽어 거래 0 — 순서 고정.
2. PR-1a/1b는 첫 행동 변경(폴백 BUY↑·스킵률↓→CLI 콜↑·틱 지연) — PR 본문 명시, 안전핀 불변.
3. 타임아웃 예산: 재시도 증가 시 `INTRADAY_TICK_TIMEOUT_MS`(120s) 초과 → 스케줄러 abort가 강제
   폴백을 만드는 역효과 — 3c에서 불변식 문서화.
4. 모의 손실은 학습 비용(데이터 수집 우선) — 손실킬·하드스톱·강제청산 유지.

## 8. 영향 분석

- `evaluateIntradaySignal` 소비처는 intradayCli.ts 뿐(+테스트) — graded confidence 교체의 파급 없음.
  일봉 `SignalResult.confidence` 소비처(SignalSummary 등)는 opts 미지정 경로라 무영향.
- conviction 은 `PaperTradingDecision`(jsonb)에 영속해야 에코 루프(`buildPreviousEcho`)가 다음 틱에
  전달 — 미영속 시 "58점 거의 매수"가 맨 HOLD로 에코되는 무상태 노이즈.
- 스키마 전부 payload jsonb 탑승 — DB 마이그레이션 0(신규 `intraday_tick_labels` 테이블만 수동 1회).
- on-demand 판단 카드(`/api/stock/intraday-read`)·Slack cron 은 파생 action/confidence 로 무파괴.
- 트리거 모드 백테스트: graded volume 이 레거시 `VOLUME_SURGE_UP/DOWN` 키를 임계 교차 시 병행
  방출해 `STRONG_BULL_TRIGGERS` 매칭 유지.

## 9. OPEN QUESTION

- q1. 컷 초기값 BUY≥65/SELL≤40 — **PM 권고: 65/40 승인**(LLM 점수가 5단위 군집하는 특성상 60은
  모달 BUY가 됨. env(`INTRADAY_BUY_CONVICTION_MIN` 등)라 PR-4에서 무코드 튜닝).
- q2. 재진입 쿨다운 N — **PM 권고: 2틱**(5분 주기 기준 10분. 왕복비용 0.28%에서 진동 churn 방지와
  기회 손실의 절충. env).
- q3. PR-2 라벨링 시점 — **PM 권고: 세션 completed 전이 시 + 일일 cron 백스톱**(장중 부분 라벨은
  미확정 미래로 오염 위험).

## 10. 구현 결과 (2026-07-09 — 코드 시리즈 완료 기록)

§3의 PR-0~3b 전부 main 머지 완료. 각 PR은 QA 리포트(`docs/qa/intraday-decision-overhaul*.md`) +
적대 리뷰(자가 PR — 코멘트 fallback) 게이트 통과. PR-3c/PR-4는 운영 단계로 이관(§10-4).

### 10-1. 머지된 PR

| PR | 내용 | 주요 검증 |
|---|---|---|
| #307 PR-0 | `agentDiagnostics` — CLI 실패 원문(2KB)·종류(empty/parse/timeout/abort/error)·시도 횟수 영속 | 행동 무변경, AC-1~4 |
| #309 PR-1a | `buildIntradayLevels` ATR 폴백(TP 3×ATR/SL 1.5×ATR=손익비 2.0), `lib/signal/levels/atr.ts` 백테스트와 공유 | RRR null 77% 모수 해소, 구조 존재 시 비트 동일 |
| #311 PR-1b | `EvaluateOptions.axisOverrides` seam + `lib/signal/intradayAxes.ts`(거래량 log z-score·VWAP σ-거리) + graded 동의도 + `BacktestOptions.evaluate` 훅 + PRIOR_DAYS 1→3 | **동의도 0.5박제 70%→5%·volatility 비중립 12%→95%**(12종목 오프라인 A/B), 일봉 경로 비트 동일 |
| #314 PR-2 | `intraday_tick_labels` + `lib/server/intraday/tickLabels.ts` 라벨링 엔진 + `/api/intraday/labels/*` + 세션 완료 자동 라벨 훅 + `/intraday` 캘리브레이션 패널 | 트레이딩 루프 무접촉, KST 변환·look-ahead 정상 판정 |
| #315 PR-3a | judge=**convictionScore(0~100)** 출력, 컷 BUY≥65/SELL≤40·사이징 `clamp(20+(c−65)×2,20,80)`·재진입 쿨다운 2틱(전부 env)·conviction 영속+에코·JUDGE_SYSTEM 재작성·**judge 실패 시 폴백 신규 진입 금지**·TP/SL null→구조 레벨 백필 | 적대 리뷰 BUY 경로 전수표(a~f) 전건 안전, 안전핀 회귀 8종 통과 |
| #318 PR-3b | preGate 트리거 1종→4종(전고 돌파+VWAP 재탈환·ORB 상단 돌파·볼륨 z≥2) — **교차(crossing) 시맨틱**, 재발화 없음 | AC-13, 호출 증폭 티커당 +5~9체인/일 판정 |

### 10-2. 판단 파이프라인 변화 (before → after)

```text
[before] 분봉 4축(이진 volume/volatility → 동의도 50% 박제) → preGate(스킵 51%)
         → judge "BUY/HOLD/SELL 판정"(HOLD 편향 프롬프트) → 942회 전량 HOLD
         → 체결은 CLI 실패 폴백에서만 발생(원문 미보존)

[after]  분봉 4축(graded z-score·VWAP σ → 연속 동의도) + ATR 폴백 레벨(RRR 항상 산출)
         → preGate(교차 트리거 4종이 셋업 순간 스킵 관통)
         → judge "방향확신 0~100 점수"(역할 분리 프롬프트)
         → 결정론 컷(≥65 BUY/≤40 SELL, env)·사이징·쿨다운 → 기존 안전핀 전량 통과
         → judge 실패 시 신규 진입 금지(보유 관리만) + 실패 원문 영속
         → 모든 틱이 세션 마감 후 자동 라벨(WIN/LOSS/NEUTRAL) → /intraday 패널 집계
```

### 10-3. 백필 실측 — 캘리브레이션 베이스라인 (2026-07-09)

완료 세션 8개·1,130틱 라벨(확정 437·미확정 693 — 미확정=구조 레벨 부재 틱+분봉 소급 불가 일자).

- **무선별 진입 반사실 승률(W/L) ~25%, 평균 −0.24%/틱** — judge의 HOLD는 그 레벨 기준 대체로
  옳았음(과거 결정론 자동엣지 NO-GO 재확인). 문제는 "거래를 안 함"이 아니라 "선별 없이 거래하면
  잃음"이었고, conviction 컷은 이 베이스라인을 이기는 선별을 요구한다.
- **레거시 신호점수 밴드 비정렬**(60+ 승률 22.2% < 40~60 28.2%) — 구 신호점수는 무예측력.
  graded 축(#311) 이후 데이터로 재검증 필요.
- **PR-4 판정 기준: conviction≥65 버킷 승률이 25% 베이스라인을 이기는가.**

### 10-4. 운영 가이드 (동료용)

- **세션 표준**: 판단 주기 **5분**(2분=1분봉은 노이즈 최대 — 과거 16/21 세션이 이 설정이었음).
- **컷 튜닝(무코드)**: `INTRADAY_BUY_CONVICTION_MIN`(65)·`INTRADAY_SELL_CONVICTION_MAX`(40)·
  `INTRADAY_REENTRY_COOLDOWN_TICKS`(2)·`INTRADAY_PRIOR_DAYS`(3) — `.env.local`.
- **라벨 확인**: `/intraday` 하단 캘리브레이션 패널(admin) — 세션 완료 시 자동 라벨,
  "라벨링 실행" 버튼=수동 백필. 테이블 미생성 환경은 `docs/sql/intraday-tick-labels.sql` 수동 1회.
- **실패 진단**: 틱 payload의 `decision.agentDiagnostics` — failureKind 분포가 PR-3c 설계 근거.
- **PR-3c 착수 조건**: 장중 세션 ~1주 텔레메트리 축적 후(빈 응답 94%의 원인 분류가 먼저).
  타임아웃 예산 불변식 `INTRADAY_TICK_TIMEOUT_MS ≥ analyst + judge×attempts + ~20s` 준수.

### 10-5. 리뷰 후속 메모 (비차단, 미해결)

- UNRESOLVED 라벨 일시장애 고착 — 최근 N일 "분봉 없음" 건은 dedupe 제외/미저장 전환 검토.
- 장중 수동 completed 전이 시 premature NEUTRAL 라벨(자동 15:40 마감 경로는 안전).
- v1 레거시 judge 스키마(확신 컷 우회, 합성 conviction 70) — PR-4 안정화 후 일몰.
- 부분 청산(REDUCE)도 재진입 쿨다운 발동(보수적 수용) / volumeZSurge 방향 중립(음봉 투매도 관통).
- 프롬프트 잔여: FLOW_ANALYST_SYSTEM의 "2~5%" 문구(분석가는 점수 미산출이라 컷 무영향).
