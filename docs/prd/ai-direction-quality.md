# PRD: ai-direction-quality — 종목 AI 종합분석 "기조(오른다/내린다)" 적중 격차 진단·표본 확보·개선 실험

- **slug**: `ai-direction-quality`
- **작성일**: 2026-10-18
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **상위 컨텍스트**: 오픈베타 전환 기준 확정(PR #392, `summarizeDirectionGate`) 후 첫 실측이 기준 미달. #390(채점 복구)·#391(적중색 분리) 후속. 선행 감사 `docs/audit/ai-decision-audit-2026-07-13.md`, 단타 트랙 종료 기록 `docs/analysis/intraday-track-closeout.md`, 일봉 재감사 `docs/analysis/signal-daily-audit-result.md`.
- **UI 포함 여부**: **no** — 새 화면·컴포넌트·토큰 없음. 단 **사용자에게 보이는 동작 변화 2가지가 단계별로 생길 수 있다**(§3-4): Phase 2 자동 분석 결과 카드의 노출 정책, Phase 3 실험이 통과해 배포되면 판정(verdict) 분포가 바뀜. 둘 다 기존 카드·배지 그대로 쓴다. 디자이너 합류 불필요.
- **분할**: 이 문서는 세 단계(진단 → 표본 → 개선 실험) 전체의 틀과 단계 간 관문을 정한다. 구현은 **단계별 브랜치·PR 3개**로 나눈다(§8-2). Phase 3 는 Phase 1 결과를 본 뒤 실험 설계를 이 PRD §3-3 에 덧붙이는 갱신(또는 후속 PRD)이 선행돼야 한다.

---

## 1. 배경 / 문제

FinSight 는 지인 대상 클로즈 베타다. 사용자가 정한 오픈베타 전환 조건은 **종목 AI 종합분석의 "오른다/내린다" 기조 적중**이다(가격 수준 적중까지는 요구하지 않음).

> 사용자: "결과와 예측이 시장과 어느정도 맞아야 해… 기조는 맞아야 하는데 아직은 이게 안돼"

### 1-1. 확정된 기준 (2026-10-18, PR #392 코드 반영)

| 항목 | 정의 | 코드 |
|---|---|---|
| horizon | 2주(10영업일, `w2`) | `OPEN_BETA_HORIZON` |
| 강세군 적중 | BUY·OVERWEIGHT → 2주 수익률 > 0 | `BULL_VERDICTS` |
| 약세군 적중 | SELL·REDUCE·UNDERWEIGHT → 2주 수익률 < 0 | `BEAR_VERDICTS` |
| 찍기 점수 | 같은 표본 전체(HOLD 포함) 중 그 방향으로 움직인 비율 | `summarizeDirectionGate` |
| 통과 | 방향별 적중률 ≥ 찍기 + 10%p **그리고** 방향별 50건 이상. 두 방향 모두 통과 | `OPEN_BETA_MARGIN_PP`·`OPEN_BETA_MIN_N` |

표시 위치: 운영자 화면 `/dashboard/scorecard` 상단 `DirectionGatePanel`.

### 1-2. 현재 실측 (signal_scorecard 130행, 진입 2026-06-19 ~ 09-02, 전부 채점)

| | n | 적중률 | 찍기 | 차이 | 판정 |
|---|---:|---:|---:|---:|---|
| 강세군 | 20 | 40% | 45% | −4.6%p | 표본 부족 |
| 약세군 | 101 | 57% | 55% | +2.0%p | 미달 |

- **verdict 분포**: UNDERWEIGHT 79 / REDUCE 22 / OVERWEIGHT 20 / HOLD 9 / **BUY 0 / SELL 0**.
- **강한 약세가 역행**: REDUCE 22건의 2주 평균 수익률 **+8.5%**.
- **분석량 감소**: 6월 43 → 7월 79 → 8월 7 → 9월 1 → 10월 0. 강세군 비율 15% 그대로면 강세군 50건까지 **분석 약 330건** 필요.
- **채점 정지 이력**: 7/27 ~ 10/18 채점 cron 정지(#371 이 flow-snapshot 예약 삭제) → #390 으로 복구. 터치 스캔 48행 백필: 7/28 ~ 8/21 약세 판정 다수가 무효화 라인을 터치(37/48). 7/31 KOSPI +17.9% 는 실제 급반등.

### 1-3. 문제 세 갈래

| # | 문제 | 왜 오픈베타를 막나 |
|---|---|---|
| (a) | **판정 분포 붕괴** — UNDERWEIGHT 61%, BUY·SELL 0건, 강세군 15% | 강세군 50건에 도달하지 못해 기준이 **영원히 "표본 부족"** 으로 남는다. 방향을 말하지 않는 판정은 사용자 입장에서 "기조"가 아니다 |
| (b) | **방향 예측력 부재** — 두 방향 모두 찍기 수준 | 기준의 본질. 표본이 차도 이 상태면 미달 |
| (c) | **표본 부족** — 수동 분석만 있고 분석량이 0으로 수렴 | (a)·(b) 어느 쪽도 판정할 수 없다 |

### 1-4. 정직한 출발점 — 선행 결론이 말하는 것

이 PRD 는 "적중률을 올린다"를 약속하지 않는다. 근거:

1. **lib/signal 4축은 예측력이 없다** — 네 번의 독립 검증(분봉 감사·분봉 OOS·경로·일봉 KOSPI 93,136관측)이 일치. 일봉 횡단면 IC −0.039 ~ −0.051, "과거 추세는 정확히 재지만 미래를 예측하지 않는다". 종합분석 프롬프트에 들어가는 "종합 신호·축 점수"가 바로 이 4축이다.
2. **프롬프트 튜닝은 2연속 실패** — confidence 100% MEDIUM 을 루브릭 교체로 풀려다 4/4 MEDIUM → 원복. 권고는 "결정론 계산으로 갈 것".
3. **39종목 감사의 베타 착시** — 절대수익 적중 61% vs excess 44%. 하락장에서 약세를 말하면 시장 덕에 맞는다.

따라서 순서를 **진단 → 표본 → 오프라인 게이트를 통과한 개선만** 으로 고정한다. 단타 트랙의 교훈("구현 → 라이브 → 손실 → 분석" 반복 금지, "입력 후보 → 오프라인 감사 → 통과분만 구현")을 그대로 따른다.

---

## 2. 목표

- **G1 (진단)**: §3-1 가설 9개(분포 H-A1~A5 · 예측력 H-B1~B3 · 표본 H-C1) 각각에 대해, 사전 등록한 기준으로 **지지/기각/판정 불가** 를 문서로 확정한다.
- **G2 (진단)**: 판정 방향과 2주 수익률의 관계를 **절대·시장 초과(excess)·진입 주 찍기 점수** 세 가지로 측정해, 현재 미달이 "예측력 부재"인지 "국면 편중"인지 구분한다.
- **G3 (표본)**: 운영자 선택과 무관한, 사전에 고정한 종목군에서 **주당 일정 건수의 분석이 자동으로 쌓이는 경로**를 만든다. 목표 처리량은 §9 OQ-3 결정값(권고 주 30건).
- **G4 (관측)**: 앞으로 쌓이는 모든 분석에 대해 **단계별 판정(리서치 매니저·트레이더·PM)과 PM 입력 원문**을 결정 시점에 고정 저장해, 나중에 PM 단계만 다시 돌려볼 수 있게 한다.
- **G5 (개선 관문)**: 개선 시도는 **사전 등록된 오프라인 재평가**를 통과한 것만 라이브에 반영한다. 통과 못 하면 반영하지 않는다(실패도 산출물).

"오픈베타 기준 통과"는 목표가 아니다. 결과이며, 이 PRD 의 산출물로 약속하지 않는다.

---

## 3. 범위 (In scope)

### 3-0. Phase 0 — 관측 배선 (Phase 1·3 의 전제, 작은 코드 변경)

결정 시점에 아래를 **삽입 시 고정** 저장한다(절대 레벨 동결과 같은 원칙 — 나중에 해석이 바뀌어도 원장은 그대로).

1. `signal_scorecard` 에 nullable 컬럼 추가(SQL 파일 `docs/sql/scorecard-direction-diagnostics.sql`, 운영자 수동 실행):
   - `source text` — `manual` / `scheduled` / `bot` (기존 큐 `AnalysisJobSource` 와 대응. 미지정 legacy 행은 null).
   - `diagnostics jsonb` — `{ signalAction, signalRegime, preReturn5d, preReturn20d, preReturn60d, stageStances: { researchManager, trader }, debateOrder, promptVersion }`.
     - `signalRegime`: 4축 엔진 `computeRegime` 값(−1/0/1). 지금 원장에는 `signal_action` 만 있고 레짐이 없다.
     - `preReturn*`: 결정 시점 일봉으로 계산한 과거 수익률(반전 가설 H-B3 검증용). 이미 route 가 갖고 있는 캔들로 계산, 추가 조회 없음.
     - `stageStances`: 리서치 매니저·트레이더 마크다운 본문에서 6단계 한글 라벨(적극 매수 … 매도/회피)·매매 방향(매수/보유/매도)을 정규식으로 추출. **추출 실패 시 null**(fail-soft, 분석 흐름 무영향).
     - `promptVersion`: `lib/prompts/stock/aiAnalysis.ts` 에 상수 1개(예: `AI_ANALYSIS_PROMPT_VERSION`)를 두고 프롬프트 변경 PR 마다 올린다. 전후 비교의 기준점.
2. **PM 입력 원문 고정 저장** — 새 테이블 `ai_analysis_run_inputs(run_id pk, ticker, decided_at, pm_system text, pm_user text, created_at)`. 쓰기 전용. **화면·폴링 경로에서 읽지 않는다**(오프라인 스크립트만 읽음 → Supabase egress 영향은 스크립트 실행 시에만).
   - 목적: Phase 3 에서 PM 단계만 같은 입력으로 다시 돌리는 재평가. PM 은 도구(WebSearch)가 없어 입력이 고정되면 시점 일치(point-in-time)가 보장된다.
3. 모든 쓰기는 **fail-soft**(try/catch + warn). 컬럼·테이블 미적용 DB 에서도 기존 insert 가 성공해야 한다.

### 3-1. Phase 1 — 진단 (오프라인·읽기 전용, 코드 동작 변경 0)

**1-a. 사전 등록 먼저**: `docs/analysis/ai-direction-diagnosis-preregistration.md` 를 **결과를 보기 전에 커밋**한다. 각 가설의 측정 방법·판정 기준을 아래 표대로 적고, 결과 후 수정하지 않는다.

**1-b. 가설과 검증 방법** (문제 (a)·(b)·(c) 별):

| ID | 가설 | 코드·데이터 근거 | 검증 (사전 등록) | 지지 판정 기준 |
|---|---|---|---|---|
| **H-A1** | **등급 의미 비대칭** — UNDERWEIGHT 가 "약세 예측"이 아니라 "조심스러운 관망"으로 쓰인다. 채점은 이를 약세 예측으로 센다 | 프롬프트 정의 "신규 진입 주의: 리스크가 우세하나 **구조적 가치는 존재**, **보유자는 유지**"(`aiAnalysis.ts` L608). 재분석 컨텍스트는 "관망(**HOLD/UNDERWEIGHT**)도 정당한 결론"으로 둘을 한 묶음 취급(`route.ts` L301) | UNDERWEIGHT 행의 2주 수익률 분포가 HOLD 행과 구별되는지(평균·중앙값 차, Mann-Whitney). `holder_strategy`·`new_entry_strategy` 문구에 "유지/관망" 등장 비율 | **1차(텍스트)**: 판정 본문이 남은 UW 행의 ≥ 60% 가 보유자에게 "유지/관망"을 권고 → 지지. **2차(수익률)**: HOLD 표본 < 20 이면 분포 비교는 검정력이 없어 "판정 불가"로만 기재(유의하지 않음 ≠ 같음) |
| **H-A2** | **진입 장벽 비대칭** — 강세 쪽은 강한 조건, 약세 쪽 첫 칸(UW)은 "리스크 우세"만으로 충족. 리스크 3팀(공격·중립·보수)과 발화 순서(약세가 마지막)가 하방으로 당긴다 | BUY = "2개 이상 지표에서 **강한** 매수 신호", UW = "리스크가 우세"(L605·L608). 리서치 매니저 프롬프트가 "구조상 약세가 토론·입력 모두에서 마지막"을 스스로 경고(L412) | Phase 0 이후 행에서 `stageStances` 대비 PM verdict 의 **단계별 이동 방향** 집계(RM→트레이더→PM 각 단계에서 약세 쪽으로 이동한 비율 vs 강세 쪽) | 약세 쪽 이동이 강세 쪽 이동의 2배 이상, 단계당 n ≥ 20 |
| **H-A3** | **국면 편중** — 표본이 −20% 급락장(6~7월)에 몰려 약세 판정이 "정답이었던" 구간이 대부분 | 39종목 감사: KOSPI 3주 −20% 폭락장, 절대 61% vs excess 44% | 진입 주별 KOSPI 2주 수익률로 표본을 3분위(하락/보합/상승 주)로 나눠 verdict 분포 비교 | 상승 주 분위에서 강세군 비율이 하락 주 분위보다 15%p 이상 높음 → 지지(판정이 국면을 따라감). 차이 없음 → 국면 무관하게 약세 기본값(H-A1·A2 쪽) |
| **H-A4** | **레짐 veto 부활(#375, 7/29)** 이 약세 쪽으로 기울인다 | `CHART_DAYS` 200→365 로 `computeRegime` 이 살아나 약세 레짐에서 4축 BUY → HOLD(`engine.ts` L84~86) + 프롬프트에 "장기추세 레짐: 약세" 표기 | 7/29 이전·이후 verdict 분포 비교. **사전 관찰**: 130행 중 대부분(6~7월 122행)이 7/29 이전이고 그때는 레짐이 전 종목 0(veto 무력)이었다 → 현재 쏠림의 주원인일 가능성은 낮다. 향후 표본에서 `diagnostics.signalRegime` 별 verdict 분포로 재측정 | 7/29 이전에도 같은 쏠림이면 **기존 쏠림에 대해서는 기각**. 향후 표본에서 레짐 −1 행의 약세 비율이 레짐 0 행보다 20%p 이상 높으면 "향후 쏠림 요인"으로 지지 |
| **H-A5** | **#352 PM 프롬프트(7/13, 베타/알파 구분)** 이후 분포가 바뀌었다 | #352 라이브 검증서 OVERWEIGHT 2건 자연 발생(이전 BUY 계열 0) | 7/13 이전·이후 verdict 분포·강세군 비율 비교 | 강세군 비율이 10%p 이상 상승 → 지지(프롬프트가 분포를 움직일 수 있다는 증거, Phase 3 E-1 의 근거) |
| **H-B1** | **방향 예측력 부재** — 판정 방향과 2주 시장 초과수익 사이에 관계가 없다 | 4축 무예측력(일봉 감사). PM 입력의 "종합 신호"가 4축 | 판정을 강세 +1 / HOLD 0 / 약세 −1 로 놓고 **진입 주별 횡단면 demean** 한 2주 excess 와의 순위상관. 진입 주 찍기 점수 기준 게이트 재계산 | 횡단면 IC 의 95% 구간이 0 을 포함하면 지지(예측력 없음) |
| **H-B2** | **베타 착시** — 절대수익 기준 적중이 시장 방향에서 온다 | 39종목 감사 61% vs 44% | 같은 표본에서 절대 적중률과 excess 적중률(`w2_excess_return_pct`) 비교 | 두 값 차이 ≥ 10%p |
| **H-B3** | **단기 반전 역행** — 약세 판정이 이미 크게 빠진 종목에 몰리고, 그 종목들이 되돌린다(REDUCE +8.5%) | 일봉 감사 D1(최근 크게 빠진 종목) 미래 수익률이 오히려 양호. 단타의 "연장 추격" 실패와 거울상 | `preReturn20d` 별 verdict 분포 + 하위 분위에서의 약세 적중률. 기존 130행은 일봉 픽스처(`scripts/signal/collect-daily.mts` 캐시)로 소급 계산 | 약세 판정 행의 과거 20일 수익률 중앙값이 비약세 행보다 5%p 이상 낮고, 그 하위 분위에서 약세 적중률 < 찍기 |
| **H-C1** | **표본 부족은 수요 문제** — 분석이 수동 클릭·로컬 워커 가동에만 의존 | 큐 소스 `prod/local/bot` 만 존재, 예약 분석 경로 없음. 월별 43/79/7/1/0 | 월별·소스별 분석 건수, 유효 표본(고유 종목 수·고유 진입 주 수) 집계 | (측정 항목 — 판정 아님. Phase 2 설계 입력) |

**1-b'. 데이터 제약**: 판정 본문(`holder_strategy`·`new_entry_strategy` 등)은 `ai_analysis_decisions`(종목·요청자 단위 upsert)에만 있어 **종목·요청자별 최신 1건만** 남는다(2026-10-18 기준 67건). 채점 원장 130행 중 본문 텍스트가 필요한 가설(H-A1 1차)은 이 67건으로만 측정하고, 리포트에 표본 크기를 명시한다. 과거 실행 본문은 복원 불가 — Phase 0 의 `ai_analysis_run_inputs` 가 이 공백을 앞으로 메운다.

**1-c. 산출물**:
- 스크립트 `scripts/scorecard/direction-diagnosis.mts` — Supabase 읽기 전용(GET 만) + 일봉 픽스처 재사용. 기존 `summarizeDirectionGate`·`lib/server/scorecard/summarize.ts` 함수를 import 해 재사용한다(재구현 금지).
- 리포트 `docs/analysis/ai-direction-diagnosis-<YYYY-MM-DD>.md` — 가설별 표 + 판정 + **유효 표본 표**(고유 종목·고유 진입 주·종목 중복 재분석 수).
- 방법론은 단타 감사 3원칙 준수: ① 횡단면(진입 주) demean ② 사전 등록·정역 대칭 ③ 경로 검증(무효화 라인 터치 선행 여부 — 이미 원장에 `stop_hit_date` 있음).

### 3-2. Phase 2 — 표본 확보 (예약 자동 분석)

1. **고정 종목군**: 사전에 정한 유동성 상위 종목군(권고: KOSPI200 + KOSDAQ150 중 직전 20일 거래대금 상위, 생존 편향 감수)을 상수 파일 한 곳에 둔다. 매 회차 그 안에서 **무작위 추출**(시드=날짜)로 K 종목. 운영자 선택 편향(뉴스 탄 종목·급락 종목 위주 클릭)을 제거하는 게 목적이다.
2. **경로**: GitHub Actions 예약 워크플로(`score-decisions.yml` 패턴) → 새 cron route(`CRON_SECRET` 인증) → 기존 분석 큐에 `source=scheduled` 로 enqueue → 기존 로컬 워커가 드레인. 새 분석 엔진·새 큐 만들지 않는다.
3. **처리량·시간대**: 주 N건(OQ-3), 평일 장 마감 후(16:00 ~ 20:00 KST) — KIS 야간 점검(21:50~, 23시대 전 TR 500)을 피한다. 동시성은 기존 세마포어 N=3 그대로.
4. **튜닝값은 코드 상수**(`constants.ts`) — env 손잡이 추가 금지(운영 원칙).
5. **헬스 표시**: cron 응답이 `ok:false` 거나 enqueue 0건이면 job 을 실패시킨다(`score-decisions.yml` 의 `jq -e '.ok == true'` 패턴 재사용) — 7/27 ~ 10/18 같은 조용한 정지 재발 방지.
6. **비용 산정을 PR 본문에 숫자로 남긴다**: `ai_agent_usage` 최근 실측 run 평균(토큰·`cost_usd`·소요 시간) × 주 N건. KIS 호출 수(분석 1회당 일봉·시세·수급·경보·지수 조회 합) × 주 N건. Supabase 쓰기 행 수(usage ~14 + scorecard 1 + decisions 1 + run_inputs 1 + 큐 행) — egress 는 쓰기가 아니라 읽기이므로 폴링 경로에 자동 분석 카드가 끼지 않는 한 영향 없음(§3-4·OQ-4).

### 3-3. Phase 3 — 개선 실험 (사전 등록 오프라인 재평가가 관문)

**원칙**: 라이브 먼저 바꾸지 않는다. 실험마다 사전 등록 문서 → 오프라인 재평가 → 통과분만 라이브 반영.

**재평가 방법의 제약(중요)**: 뉴스·펀더멘털·SNS 분석가는 WebSearch 를 쓴다. **과거 판정을 전체 파이프라인으로 다시 돌리면 미래 정보가 섞인다**(시점 불일치). 따라서 유효한 오프라인 재평가는 두 종류뿐이다.

| 실험 | 대상 | 방법 | 사전 등록 통과 기준(예시 — Phase 1 후 확정) |
|---|---|---|---|
| **E-1 판정 정의 대칭화** (H-A1·A2 지지 시에만) | PM 등급 정의·재분석 컨텍스트 문구 | Phase 0 이후 고정 저장된 PM 입력(`ai_analysis_run_inputs`)으로 **PM 단계만** A/B 재실행(기존 `abHarness` 재사용). 1차 지표는 결과를 안 기다리는 **분포 지표**, 2차는 이미 채점된 행의 적중률 | 1차: UW 비율 ≤ 40%, 강세군 비율 ≥ 25%, HOLD ≤ 30%(관망 쏠림 이동 방지). 2차: 강세·약세 각 적중률이 현행 대비 하락하지 않음(−3%p 이내). 둘 다 만족해야 통과 |
| **E-2 새 입력 오프라인 IC 감사** (H-B1 지지 시) | 4축 외 입력 후보: 외국인·기관 수급, 업종 상대강도, 공시 이벤트 | `scripts/signal/daily-audit.mts` 파이프라인으로 **2주 horizon 횡단면 IC** 측정. 통과분만 PM 입력에 주입 | 단타 종료 기록의 3종 세트: 평균(상위·하위 분위 excess 가 비용 고려 없이도 방향 일관) + **일자 안정성 ≥ 60%** + 연도 일관성. 홀드아웃은 사전 등록 시 분리 |

- E-1 은 **적중률을 올리는 실험이 아니다**. 방향을 말하지 않는 판정을 줄여 측정 속도를 올리고 판정이 "기조"로 읽히게 하는 실험이다. 적중률이 떨어지면 통과가 아니다.
- E-1 재실행 대상은 **모델 지식 컷오프 이후 진입분만** 쓴다(모델이 결과를 기억해 맞추는 누수 방지).
- 통과 실험의 라이브 반영 PR 은 `promptVersion` 을 올리고, 반영 전·후 표본을 섞지 않고 따로 집계한다.

**단계별 종료·중단 조건**:

| 단계 | 종료 조건 | 중단(노-고) 조건 → 다음 행동 |
|---|---|---|
| Phase 0 | 신규 분석 1건에서 `source`·`diagnostics`·`run_inputs` 가 채워짐 확인 | 해당 없음(관측 배선) |
| Phase 1 | 가설 9개 전부 지지/기각/판정 불가 기재 | 유효 표본(고유 진입 주) < 6 이라 대부분 판정 불가 → Phase 2 를 먼저 돌리고 **4주 후 재측정** |
| Phase 2 | 예약 분석이 4주 연속 목표 처리량의 ≥ 80% 달성 | 로컬 워커 미가동으로 2주 연속 처리량 < 50% → 운영 방식 재결정(OQ-5) |
| Phase 3 | 실험별 사전 등록 판정 완료 | **E-1·E-2 모두 불통과** → "현 입력으로 기조 적중 불가"를 결론 문서로 확정하고, 오픈베타 조건 자체를 사용자와 재논의(OQ-8). 같은 실험을 문구만 바꿔 재시도하지 않는다 |

### 3-4. 사용자 노출 변화

| 단계 | 노출 변화 |
|---|---|
| Phase 0 | **없음**. 원장 컬럼·테이블 추가만 |
| Phase 1 | **없음**. 스크립트·문서 |
| Phase 2 | 자동 분석 결과가 `/analyze` 카드 목록·종목 상세의 "최근 AI 분석"에 나타날 수 있음 → 노출 여부를 OQ-4 로 결정. 권고안(전용 계정 버킷, 사용자 목록 비노출)이면 **없음** |
| Phase 3 | 실험이 통과·반영되면 **같은 카드에 찍히는 판정 분포가 달라진다**(예: "신규 진입 주의" 감소, "분할 매수"·"중립" 증가). 카드·배지·색 등 표시 요소 변경은 없음 |

---

## 4. 비범위 (Out of scope)

- **오픈베타 기준 자체 변경** — horizon·+10%p·50건·HOLD 포함 찍기 점수는 10/18 확정값. 이 PRD 는 기준을 고치지 않는다. 진입 주 찍기 점수는 **진단용 보조 지표**로만 계산하고 게이트를 대체하지 않는다(대체 여부는 OQ-6).
- **UNDERWEIGHT 를 사후에 "중립"으로 재분류** — 지금 데이터를 보고 분류를 바꾸면 기준을 결과에 맞추는 것이다. 바꾸려면 앞으로 쌓일 표본에만 적용하는 사전 결정이 필요(OQ-2).
- **재시도 금지 목록과 겹치는 접근** (단타 종료 기록 §5 + 감사 교훈):
  - 4축 가중치·컷·레짐 veto 를 **적중률 목적으로** 조정 — 4축 무예측력 확정.
  - 프롬프트 문구를 **라이브에 바로** 바꿔 적중률을 올리려는 시도 — confidence 2연속 실패. 프롬프트 변경은 E-1 의 고정 입력 재실행 관문을 통과한 것만.
  - 타임프레임 바꾸기(2주 → 1달로 기준 이동), 역방향 매매식 판정 뒤집기.
  - 결정론 매핑으로 BUY·SELL 을 강제 생성(분포만 바꾸고 예측력 무관 = 지표 조작).
- **miss 사후분석 서사 주입**(`project_scorecard-miss-postmortem`) — 사후 합리화 위험. 이 PRD 범위 밖.
- **scorecard-feedback 성적 주입(`SCORECARD_FEEDBACK_PROMPT`) ON** — 표본 부족·자기강화 편향. OFF 유지.
- **confidence·time_horizon 분포 문제** — 별도 과제(결정론 계산 권고 유지). 여기서는 verdict 방향만.
- 새 화면·패널·토큰, DESIGN.md 변경.
- 전체 파이프라인(WebSearch 포함) 과거 재실행 — 시점 불일치로 무효.
- 미국 주식(US) 분석 — 채점 원장·벤치가 KR 전용.

---

## 5. 수용 기준 (AC)

통과 여부가 아니라 **산출물이 존재하고 재현 가능한지**를 검사한다. 오픈베타 기준 통과는 AC 가 아니다.

### Phase 0
- **AC-0.1** `docs/sql/scorecard-direction-diagnostics.sql` 이 존재하고 `source`·`diagnostics` 컬럼과 `ai_analysis_run_inputs` 테이블을 `if not exists` 로 만든다 — `git grep -n "ai_analysis_run_inputs\|add column if not exists diagnostics" docs/sql/` ≥ 2건.
- **AC-0.2** `insertScorecardRow` 가 `source`·`diagnostics` 를 싣고, 컬럼이 없는 DB 응답(400 undefined column)에서도 기존 필드만으로 재시도해 행이 남는다 — `npx vitest run lib/server/scorecard` 에 이 경로 테스트 1건 이상 포함·통과.
- **AC-0.3** 리서치 매니저·트레이더 본문에서 6단계 라벨 추출 함수가 순수 함수로 존재하고, 라벨 6종 + 미발견(null) + 여러 라벨 동시 등장(첫 "결정/등급" 문맥 우선) 케이스 테스트가 통과 — `npx vitest run` 해당 파일 통과.
- **AC-0.4** `git grep -n "AI_ANALYSIS_PROMPT_VERSION" lib/prompts/stock/aiAnalysis.ts app/api/stock/ai-analysis/route.ts` 각 1건 이상.
- **AC-0.5** `ai_analysis_run_inputs` 를 읽는 코드가 `app/`·`components/`·`hooks/` 에 없다 — `git grep -n "ai_analysis_run_inputs" app components hooks` 0건(쓰기 모듈 `lib/server/**` 와 `scripts/**` 만 허용).
- **AC-0.6** 로컬에서 분석 1건 실행 후 Supabase 에서 해당 `run_id` 의 `signal_scorecard.diagnostics` 가 null 이 아니고 `ai_analysis_run_inputs` 행이 1개 존재 — QA 리포트에 run_id·조회 결과 기재.
- **AC-0.7** `npx tsc --noEmit`, `npm run lint`, `npx vitest run` 전부 통과.

### Phase 1
- **AC-1.1** 사전 등록 문서 커밋이 결과 문서 커밋보다 먼저다 — `git log --format=%ct -1 -- docs/analysis/ai-direction-diagnosis-preregistration.md` < `git log --format=%ct -1 -- docs/analysis/ai-direction-diagnosis-2*.md` (결과 문서의 첫 커밋 기준). 사전 등록 문서는 첫 커밋 이후 변경 0 — `git log --oneline -- docs/analysis/ai-direction-diagnosis-preregistration.md | wc -l` = 1.
- **AC-1.2** 진단 스크립트는 읽기 전용 — `git grep -nE "method: *\"(POST|PATCH|PUT|DELETE)\"" scripts/scorecard/direction-diagnosis.mts` 0건.
- **AC-1.3** 스크립트가 게이트 계산을 재구현하지 않는다 — `git grep -n "summarizeDirectionGate" scripts/scorecard/direction-diagnosis.mts` ≥ 1건.
- **AC-1.4** `node --env-file=.env.local --import tsx scripts/scorecard/direction-diagnosis.mts` 실행 시 (a) 현행 게이트 수치가 `/dashboard/scorecard` 패널 값과 일치(강세 n·적중률·찍기, 약세 동일 — 리포트에 패널 캡처 수치와 나란히 기재) (b) 가설 9개 각각의 측정값 출력.
- **AC-1.5** 결과 리포트가 가설 9개 모두에 `지지` / `기각` / `판정 불가` 중 하나를 기재 — `grep -cE "^\| *H-(A[1-5]|B[1-3]|C1) .*(지지|기각|판정 불가)" docs/analysis/ai-direction-diagnosis-2*.md` = 9.
- **AC-1.6** 리포트에 유효 표본 표(고유 종목 수·고유 진입 주 수·종목 중복 재분석 수·강세/약세군 각 진입 주 분포)와 분포 지표(verdict 6종 비율, 강세군 비율, UW 비율) 포함.

### Phase 2
- **AC-2.1** 예약 워크플로가 존재하고 평일 schedule + `workflow_dispatch` 를 가지며 `ok == true` 가 아니면 실패한다 — `git grep -n "jq -e '.ok == true'" .github/workflows/<신규>.yml` 1건.
- **AC-2.2** cron route 가 `CRON_SECRET` 미일치 시 401 — 라우트 테스트 통과.
- **AC-2.3** 종목군·회차당 K·시간대가 상수 파일 한 곳에만 있고 env 를 읽지 않는다 — `git grep -n "process.env" <상수 파일>` 0건.
- **AC-2.4** 같은 날짜 시드로 두 번 추출하면 같은 종목 목록, 다른 날짜면 다른 목록 — 순수 함수 테스트 통과.
- **AC-2.5** enqueue 된 작업의 `source` 가 `scheduled` 이고, 채점 원장 행의 `source` 도 `scheduled` — QA 리포트에 `workflow_dispatch` 1회 실행 결과(enqueue 건수·완료 run_id·원장 행) 기재.
- **AC-2.6** PR 본문에 비용 표(주당 토큰·`cost_usd`·소요 시간·KIS 호출 수·Supabase 쓰기 행 수, 출처 = `ai_agent_usage` 최근 run 평균) 포함.
- **AC-2.7** 운영 4주 차에 진단 스크립트 재실행 결과(주별 `scheduled` 분석 건수, 강세군 누적 n)를 리포트에 append.

### Phase 3 (실험별 반복)
- **AC-3.1** 실험마다 사전 등록 문서가 실험 결과 문서보다 먼저 커밋(AC-1.1 과 같은 방식).
- **AC-3.2** E-1 재실행은 `ai_analysis_run_inputs` 의 고정 입력만 쓰고 분석가·토론 단계를 다시 부르지 않는다 — 재실행 스크립트에서 `WebSearch` 를 쓰는 에이전트 키 호출 0건(코드 리뷰 + `ai_agent_usage` 에서 해당 세션의 agent_key 가 `portfolio_manager` 뿐임을 QA 에 기재).
- **AC-3.3** 결과 문서에 사전 등록 기준 대비 통과/불통과가 기계적으로 기재되고, 불통과 실험은 라이브 코드 변경 0 — 해당 실험 PR 의 `git diff --stat main -- lib/prompts app/api/stock/ai-analysis` 가 비어 있음.
- **AC-3.4** 통과 실험의 라이브 반영 PR 은 `AI_ANALYSIS_PROMPT_VERSION` 을 올리고, 진단 스크립트가 버전별로 분리 집계한다.

---

## 6. 가정·제약

- **선행 머지**: #390·#391·#392 main 머지 완료(2026-10-18). 채점 cron(`score-decisions.yml`, 평일 17:10 KST) 정상 가동 전제.
- **SQL 은 운영자 수동 실행**(Supabase SQL editor). 미실행 상태에서도 코드는 fail-soft 로 무회귀.
- **분석 실행 주체는 로컬 워커**: prod 는 enqueue 만, 실제 분석은 운영자 PC 의 CLI 워커가 드레인한다. Phase 2 처리량은 워커 가동 시간에 묶인다(OQ-5). 로컬 CLI 는 구독 기반이라 `cost_usd` 는 명목 비용일 수 있다 — 실제 한도는 구독 사용량 제한.
- **#371 "장 마감 후 자동 호출 중지" 정책**: 단타 자동 호출·Supabase egress 긴급 대응 맥락. 예약 종합분석이 이 정책 위반인지 OQ-1 로 결정 전 Phase 2 착수 금지.
- **통계적 한계**:
  - 무능력(찍기)인 AI 가 n=50·+10%p 를 한 방향에서 우연히 통과할 확률은 약 8 ~ 10%(이항, 찍기 50 ~ 55% 가정). 두 방향 동시 약 1%. 단 **진입이 몇 주에 몰리면 유효 표본이 줄어 우연 통과 확률이 커진다** — 표본이 차도 진입 주 분산을 함께 본다(OQ-7).
  - 현행 찍기 점수는 전 기간 풀링(코드 `ponytail:` 주석 명시) — 국면이 섞이면 Simpson 왜곡 가능. 진단에서 진입 주 기준을 병기한다.
  - 같은 종목을 여러 번 분석한 행은 독립이 아니다.
- **생존 편향**: 종목군을 현재 상장 기준으로 잡으면 낙관 방향 편향. 실패 결론에는 보수적으로 안전, 통과 결론에는 불리 → 통과 시 병기.
- **모델 지식 컷오프 누수**: E-1 재실행은 모델 컷오프 이후 진입분만.
- **KIS 제약**: 야간 점검(21:50 ~) 전 TR 500, 해외지수는 Vercel 에서 실패 가능. 예약 시간대는 16:00 ~ 20:00 KST.
- **도구**: `scripts/signal/collect-daily.mts` 일봉 픽스처 캐시 재사용(2024-01 ~ 2026-08 수집분 + 부족분 추가 수집).

---

## 7. 참고

- 기준 구현: `lib/server/scorecard/summarize.ts`(`summarizeDirectionGate`), `lib/server/scorecard/constants.ts`(`OPEN_BETA_*`), `components/scorecard/DirectionGatePanel.tsx`
- 채점 원장: `lib/server/scorecard/scorecardStore.ts`, `docs/sql/scorecard-touch-scoring.sql`, `.github/workflows/score-decisions.yml`, `app/api/cron/score-decisions/route.ts`
- 종합분석 경로: `app/api/stock/ai-analysis/route.ts`(`CHART_DAYS`·`formatSignalForPrompt`·PM 파싱·재분석 컨텍스트 L295~302), `lib/prompts/stock/aiAnalysis.ts`(등급 정의 L405~414·L604~612, 편향 방지 L559, 베타/알파 L618), `lib/signal/engine.ts`·`lib/signal/regime.ts`
- 큐·워커: `lib/types/stock/analysisQueue.ts`(`AnalysisJobSource`), `app/api/stock/ai-analysis/enqueue/route.ts`, `lib/server/ai/queueStore.ts`, `lib/server/ai/abHarness/compare.ts`
- 선행 결론: `docs/audit/ai-decision-audit-2026-07-13.md`, `docs/analysis/intraday-track-closeout.md`(재시도 금지 §5·재검토 조건 §6·방법론 3원칙), `docs/analysis/signal-daily-audit-result.md`, `docs/prd/signal-edge-audit.md`(사전 등록 판정표 양식)
- egress: `docs/ops/supabase-egress-optimization-2026-07-24.md`
- 관련 PRD: `docs/prd/signal-scorecard.md`, `docs/prd/scorecard-relative-scoring.md`, `docs/prd/scorecard-feedback.md`, `docs/prd/ai-decision-confidence.md`, `docs/prd/analysis-request-queue.md`

---

## 8. 영향 분석

### 8-1. 변경 추정

| 단계 | 파일 | 추정 라인 | 회귀 위험 |
|---|---|---:|---|
| Phase 0 | SQL 1, `scorecardStore.ts`, `route.ts`(diagnostics 조립·run_inputs 쓰기), 라벨 추출 순수 함수 + 테스트, 프롬프트 버전 상수 | +250 ~ 350 | **중** — 종합분석 핫패스에 쓰기 추가. fail-soft 와 "컬럼 없음 재시도"가 핵심. 분석 결과·화면 무변경 |
| Phase 1 | 사전 등록·결과 문서, `scripts/scorecard/direction-diagnosis.mts` | +300 ~ 450(문서 제외) | **없음** — 오프라인 읽기 전용 |
| Phase 2 | 워크플로 1, cron route 1, 종목군 상수·추출 함수 + 테스트, 큐 source 타입 확장 | +200 ~ 300 | **중** — 큐·워커 부하 증가. 수동 분석과 큐 경합(동시성 3 공유). 자동 결과 카드 노출 정책 오류 시 사용자 목록 오염 |
| Phase 3 | 실험별 사전 등록·결과 문서, 재실행 스크립트, (통과 시) 프롬프트 변경 | 실험당 +150 ~ 300 | **높음(통과 시만)** — 판정 분포가 바뀌는 행동 변경. 불통과면 라이브 0 |

### 8-2. 분할 권고

- **PR-1 = Phase 0 + Phase 1** (브랜치 `feature/ai-direction-quality-diagnosis`, 첫 commit 이 이 PRD). Phase 0 관측 배선이 작고 Phase 1 과 같은 질문을 다루므로 묶는다. 단 Phase 1 의 기존 130행 진단은 Phase 0 컬럼 없이도 가능하므로 Phase 0 머지를 기다리지 않는다.
- **PR-2 = Phase 2** — OQ-1·OQ-3·OQ-4·OQ-5 결정 후 착수. 운영 부하·정책 결정이 걸려 PR-1 과 분리.
- **PR-3+ = Phase 3 실험별** — Phase 1 결과로 실험 대상이 정해진 뒤 이 PRD §3-3 갱신(또는 후속 PRD)을 첫 commit 으로. 실험 하나 = PR 하나.
- **AGENTS.md "한 작업 = 한 PR" 룰의 예외**다. 사용자 동의(2026-10-18, "한번 더 점검하고 진행") 하에 이 slug 한정으로 단계별 PR 을 허용한다. 시리즈 종료 후 단일 PR 룰로 복귀.
- 분할 사유: 단계 사이에 **사용자 결정 관문**(진단 결과 → 어떤 실험을 할지, 자동 분석 정책)이 있어 한 PR 로 묶으면 결정 전에 구현이 앞서 나간다.

### 8-3. 일정 감각

- 강세군 50건: 예약 분석 주 30건 × 강세군 15%(현행) ≈ 주 4.5건 → **약 11주 + 2주 채점 지연**. E-1 이 통과해 강세군 비율이 25% 가 되면 약 7주 + 2주.
- 즉 가장 빠른 경우에도 **오픈베타 판정 가능 시점은 2027년 1월 전후**. 이 일정을 사용자와 공유해야 한다(OQ-8).

### 8-4. 회귀 방지 체크

- 종합분석 응답·SSE 이벤트·카드 데이터 구조 무변경(Phase 0 ~ 2).
- `/analyze` 폴링 엔드포인트의 조회 범위·행 수 무변경(egress).
- 채점 cron 경로 무변경(`score-decisions` 는 새 컬럼을 읽지 않음).

---

## 9. OPEN QUESTION

- **[OPEN QUESTION] OQ-1 — 예약 종합분석이 #371 "장 마감 후 자동 호출 중지" 정책과 충돌하나?**
  #371 은 단타 자동 호출과 Supabase egress 긴급 대응 맥락이었다. 예약 분석은 LLM 자동 호출이라 취지상 겹친다.
  → **PM 권고**: 충돌 아님으로 보되 정책을 명문화한다 — "단타 자동 호출은 중지 유지, 종합분석 예약은 주 N건 상한·장 마감 후 시간대·헬스 실패 시 정지 조건 하에 허용". #371 작성자(devbob) 확인 후 Phase 2 착수.

- **[OPEN QUESTION] OQ-2 — UNDERWEIGHT 의 의미를 정할 것인가?**
  H-A1 이 지지되면 UNDERWEIGHT 는 "약세 예측"이 아니라 "관망"이다. 선택지: (i) 프롬프트 정의를 고쳐 UW 를 진짜 약세 판정으로 만든다(E-1) (ii) 채점·게이트에서 UW 를 HOLD 와 같은 중립으로 분류한다.
  → **PM 권고**: (i). (ii) 는 약세군 표본이 101 → 22 로 줄어 약세 쪽도 "표본 부족"이 되고, 결과를 본 뒤 분류를 바꾸는 것이라 기준 신뢰가 깨진다. (ii) 를 택하더라도 앞으로 쌓일 표본에만, 결과 보기 전에 결정.

- **[OPEN QUESTION] OQ-3 — 예약 분석 처리량(주 N건)과 종목군**
  → **PM 권고**: 주 30건(평일 6건), 종목군 = KOSPI200 + KOSDAQ150 중 직전 20일 거래대금 상위 200, 날짜 시드 무작위 추출. 같은 종목은 2주 안에 다시 뽑지 않는다(중복 재분석으로 유효 표본이 부풀지 않게). 첫 2주는 주 15건으로 시작해 `ai_agent_usage` 실측 비용 확인 후 증량.

- **[OPEN QUESTION] OQ-4 — 자동 분석 결과를 사용자 화면에 보여줄 것인가?**
  `ai_analysis_decisions` 는 (종목, 요청자) 단위 upsert 라 자동 분석이 기존 사용자 카드를 덮을 수 있다.
  → **PM 권고**: 전용 요청자 버킷(예: `requested_by='__scheduled__'`)에 저장하고 사용자 `/analyze` 목록에는 노출하지 않는다. 운영자 성적표에만 반영. 노출은 오픈베타 기준 통과 후 별도 결정.

- **[OPEN QUESTION] OQ-5 — 로컬 워커 의존을 받아들일 것인가?**
  분석은 운영자 PC 의 CLI 워커가 돌린다. 7/27 ~ 10/18 채점 정지처럼 "아무도 모르게 멈춤"이 재발할 수 있다.
  → **PM 권고**: Phase 2 는 로컬 워커 그대로 시작하고, 주간 처리량 < 50% 가 2주 이어지면 알림(워크플로 실패)으로 드러낸다. 상시 서버 이전은 이 PRD 범위 밖.

- **[OPEN QUESTION] OQ-6 — 게이트의 찍기 점수를 "진입 주 기준"으로 바꿀 것인가?**
  현행은 전 기간 풀링이라 급락 주·급반등 주가 섞이면 왜곡된다(코드 `ponytail:` 주석).
  → **PM 권고**: Phase 1 에서 진입 주 기준을 **병기만** 하고, 게이트 교체 여부는 Phase 1 결과를 보기 **전에** 사용자가 결정한다. 결과를 보고 유리한 쪽을 고르면 안 된다.

- **[OPEN QUESTION] OQ-7 — "방향별 50건"에 진입 주 분산 조건을 붙일 것인가?**
  50건이 2 ~ 3주에 몰리면 사실상 2 ~ 3개 관측이다. 찍기 AI 의 우연 통과 확률이 커진다.
  → **PM 권고**: 게이트에 "방향별 고유 진입 주 ≥ 8" 조건 추가를 권고. 단 이는 10/18 확정 기준의 변경이므로 사용자 결정 사항이며, 결정 전까지는 패널·리포트에 진입 주 수를 표시만 한다.

- **[OPEN QUESTION] OQ-8 — 노-고 시 오픈베타 조건을 어떻게 할 것인가?**
  E-1·E-2 가 모두 불통과면 "현재 입력으로는 2주 기조 적중이 찍기를 넘지 못한다"가 결론이 된다(선행 결론과 같은 방향).
  → **PM 권고**: 그 경우 AI 종합분석을 "방향 예측"이 아니라 "근거 정리·레벨 안내" 도구로 포지셔닝을 바꾸고(판정 문구는 유지하되 적중 주장 금지), 오픈베타 조건을 "판정 정직성(무효화 라인·채점 공개)" 중심으로 재정의할지 사용자와 논의한다. 일정상 최소 11주가 걸리므로 이 결정 시점(Phase 1 결과 직후)을 미리 잡아 둔다.

- **[OPEN QUESTION] OQ-9 — 기존 130행 진단을 Phase 0 머지 전에 먼저 돌릴 것인가?**
  → **PM 권고**: 예. 기존 행은 새 컬럼 없이도 H-A1·A3·A4·A5·B1·B2·B3·C1 을 잴 수 있다(H-A2 만 Phase 0 이후 데이터 필요). 사전 등록 문서만 먼저 커밋하면 바로 실행 가능.

---

## 10. 결정 기록 (2026-10-18, Phase 1 결과 직후)

Phase 1 진단(`docs/analysis/ai-direction-diagnosis-2026-10-18.md`) 결과: H-B1 지지(방향 판정과 진입 주 demean 2주 초과수익의 ρ = −0.003), H-B2 지지(베타 착시 +12.4%p), H-B3 지지(약세 판정 종목의 직전 20일 수익률 중앙값 −15.4% vs 비약세 +2.4% — 과거 하락을 미래로 연장). lib/signal 4축 무예측력에 이어 **네 번째 같은 방향 결론**.

사용자 결정 — PM 권고 3안 채택:

1. **OQ-8 확정 — 포지셔닝 전환**: AI 종합분석은 "방향 예측"이 아니라 **근거 정리·가격 레벨 안내** 도구. 사용자 노출 문구에서 적중·수익 주장 금지(판정 등급 표시는 유지).
2. **오픈베타 조건 재정의 — 판정 정직성** (아래 §10-1, 2026-10-18 사용자 확정). 방향 적중 게이트(`DirectionGatePanel`)는 **참고 지표로 강등**(계속 표시, 조건 아님).
3. **E-2 만 진행**: 4축 외 새 입력(수급·업종 상대강도·공시)의 2주 횡단면 예측력을 과거 일봉으로 오프라인 감사. 사전 등록 `docs/analysis/new-input-audit-preregistration.md` 먼저 커밋. 통과 입력이 나오면 그때 방향 예측 재시도를 별도로 논의.
4. **보류**: Phase 0(관측 배선)·Phase 2(예약 자동 분석)·E-1(판정 정의 대칭화). E-2 통과 시 재개 여부를 다시 결정.

### 10-1. 오픈베타 조건 — 판정 정직성 (확정 2026-10-18)

| # | 조건 | 측정 |
|---|---|---|
| 1 | 강세·약세 판정의 무효화 라인 보유율 ≥ 95% | `signal_scorecard.stop_loss_pct` 가 있는 비율 (최근 4주 진입분) |
| 2 | 판정이 인용한 가격 레벨이 실측과 일치, 창작 0 | 최근 분석 10건 표본 감사 (#375 라이브 검증 방식) |
| 3 | 채점 연속성 — 최근 4주 `score-decisions` 워크플로 실패 0 | `gh run list --workflow score-decisions.yml` |
| 4 | 채점 시점(2주)이 지난 카드의 채점 배지 부착률 ≥ 95% | `/analyze` 카드 ↔ 원장 매칭 (`resolveDecisionOutcome`) |
| 5 | 사용자 노출 카피에 적중률·수익 보장 문구 0 | `lib/copy/**` 검토 |

### 10-2. E-2 결과 (2026-10-18)

`docs/analysis/new-input-audit-result.md` — 발견 구간(2024-01~2025-12) 통과 **0/8**. 외국인·기관·합 수급 강도, 업종 상대강도(최근접: 역방향 t −3.80 이나 일자 안정성 53% 탈락, 4축 상관 0.685), 공시 4종. 홀드아웃 미계산(규칙). → 현 데이터 종류로는 2주 방향 예측력 없음(다섯 번째 같은 결론). 방향 예측 재시도는 **새 종류의 데이터**가 생길 때만 별도 PRD 로. Phase 0·Phase 2·E-1 은 보류 유지.
