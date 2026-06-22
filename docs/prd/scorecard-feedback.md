# PRD — scorecard-feedback (채점 결과 자가교정 루프 — 캘리브레이션 표시 + PM 프롬프트 성적 주입, phase-1.5)

- **slug**: `scorecard-feedback`
- **작성일**: 2026-06-22
- **작성자**: PM 에이전트
- **저장소**: `trading-signal-frontend`
- **대상 브랜치**: `feature/scorecard-feedback`
- **UI 포함 여부**: **yes (최소 — 기존 판정 카드에 1줄 칩 추가)** — 신규 화면 없음. `FinalVerdictCard` 신뢰도 표시 지점에 "보정된 신뢰도" 칩 1개. 디자이너 합류 트리거 아님(기존 토큰·패턴 재사용).
- **상위 컨텍스트**: `signal-scorecard`(phase-1, 머지됨 PR #140 — 채점 backbone: 원장 → cron → 적중률 집계) 후속. 이번은 그 **결과를 판정으로 되먹이는(self-correction) 루프 닫기**.

---

## 1. 배경 / 문제

phase-1 `signal-scorecard` 가 AI 판정을 채점해 `signal_scorecard` 테이블에 verdict·confidence·horizon별 적중률을 쌓는다. 하지만 그 **적중률 데이터가 어디에도 되먹여지지 않는다.** 운영자(1인 MVP)는 적중률 표를 따로 열어봐야 하고, AI 판정 자체는 과거 자기 성적을 전혀 모른 채 매번 생성된다.

루프가 열려 있다: **측정(phase-1)은 하는데 교정(feedback)이 없다.** 이번 phase-1.5 는 채점 결과를 두 경로로 되먹여 루프를 닫는다.

- **(가) 신뢰도 캘리브레이션 [표시]** — 판정 카드에 모델 confidence 옆에 같은 confidence 버킷의 **실측 적중률**을 곁들여, 운영자가 "이 모델이 confidence 높다고 할 때 실제로 얼마나 맞나"를 한눈에 본다(자가점검).
- **(나) PM 프롬프트 성적 주입 [플래그 뒤, 기본 OFF]** — PM 분석 프롬프트에 과거 판정 성적(적중률)을 주입해 **모델이 자기조정**(과신 억제·재검증)하게 한다. 운영자가 표본을 신뢰한 뒤에만 켠다.

### 1-1. 현재 구조 — 코드 추적 결과 (확정 사실, 읽기 전용 조사)

| # | 사실 | 근거 위치 |
|---|---|---|
| 1 | 채점 적중률 집계 순수 함수 `summarizeScorecard(rows)` 존재 — verdict/confidence/horizon/signalScore 차원별 `{hit,miss,flat,total,hitRate}` 셀 배열. hitRate=hit/(hit+miss)(flat 분모 제외) | `lib/server/scorecard/summarize.ts` |
| 2 | 집계 BFF `GET /api/scorecard/summary` 존재(읽기 전용, Vercel 가드 없음 → prod 동작). 미설정이면 `configured:false`+빈 집계 | `app/api/scorecard/summary/route.ts` |
| 3 | 채점 원장 read `getAllScorecardRows()`·`isScorecardStoreConfigured()` 존재(fail-soft, 미설정 시 빈 배열) | `lib/server/scorecard/scorecardStore.ts` |
| 4 | `FinalDecision.confidence` ∈ HIGH/MEDIUM/LOW. 판정 화면 신뢰도 표시 = `FinalVerdictCard` L142~159 — `signal` 있으면 "신호 강도", 없으면 `COPY.verdict.confidence(data.confidence)` 노출 | `lib/types/stock/aiAnalysis.ts`, `components/stock/ai-analysis/FinalVerdictCard.tsx` |
| 5 | `FinalVerdictCard` 사용처 3곳: 라이브 분석 패널 최종 카드 + 이전 결론 카드(`AIAnalysisPanel`), 저장 결론 모달(`AIDecisionDetailSheet`) | grep `FinalVerdictCard` |
| 6 | PM 프롬프트는 `prompts.system + previousDecisionContext`(이전 결론 주입 패턴)로 조립 — `formatPreviousDecisionContext` 가 본보기. PM 만 system 프롬프트에 컨텍스트를 덧붙인다 | `app/api/stock/ai-analysis/route.ts` L182~212, L551~553 |
| 7 | 무거운 분석은 로컬 Claude/Codex CLI(`invokeAgentCliStream`) — **토큰 API 과금 아님**. 프롬프트에 글자를 더 넣어도 추가 과금 ~0 | `lib/server/ai/agentCli.ts`, AGENTS.md |
| 8 | 상수 단일 원천 `lib/server/scorecard/constants.ts`(horizon 영업일·T·배치 등). env 노출 없이 코드 1줄 조정 패턴 | `lib/server/scorecard/constants.ts` |

### 1-2. 핵심 제약 (이 PRD 설계를 좌우)

- **C1 — 작은 표본은 신뢰 불가**: 채점 표본이 적으면(예 n<20) 적중률이 통계적으로 무의미해 과신·앵커링을 유발한다 → **min-n 게이트** 필수. 표시는 "표본 부족" 폴백, 주입은 해당 버킷 제외.
- **C2 — 무회귀가 최우선**: 채점 데이터가 아직 안 쌓인(표본 0·부족) 상태에서도 기존 분석/판정 화면이 **완전히 그대로** 동작해야 한다 → 데이터 게이팅(graceful no-op): 캘리브레이션은 칩을 안 그리고, 주입은 빈 문자열로 skip.
- **C3 — 모델 판정 불변(가)**: 캘리브레이션은 **표시 전용**이다. 실측 적중률을 보여줄 뿐 모델 confidence·verdict 를 후처리로 바꾸지 않는다(혼동·과신 방지).
- **C4 — 주입은 운영자 통제(나)**: 성적 주입은 모델 행동을 바꾸므로 **플래그(기본 OFF)** 뒤에 둔다. 운영자가 표본을 신뢰한 뒤 명시적으로 켠다. OFF 면 프롬프트·비용 모두 무변경.
- **C5 — BFF 패턴**: 브라우저는 Supabase 직접 호출 금지. 캘리브레이션도 read-only BFF(`/api/scorecard/calibration`)로만 읽는다.

---

## 2. 목표

- **G1 (가 — 측정 가능)**: 판정 카드에 모델 confidence 와 같은 버킷의 실측 적중률+표본수가 노출된다(예 `실측 적중률 55% (n=25)`). n<MIN_SAMPLE_N 이면 "실측 표본 부족" 칩 + 모델 confidence 만.
- **G2 (나 — 측정 가능)**: 플래그 ON 일 때 PM 분석 프롬프트에 과거 판정 성적 요약(전체+confidence별+verdict별, n≥MIN_SAMPLE_N 버킷만)이 주입된다. 충분 표본 버킷이 없으면 주입 skip.
- **G3 (무회귀)**: 플래그 OFF(기본)면 PM 프롬프트는 한 글자도 안 바뀐다. 표본 0/부족이면 캘리브레이션 칩 미노출. 기존 분석 SSE·판정 카드·이전 결론·적중률 표 무영향.
- **G4 (단일 조정점)**: min-n·플래그 default 를 상수 모듈 한 곳에서 조정한다.

---

## 3. 범위 (In scope)

### 3-1. (가) 신뢰도 캘리브레이션 [표시 전용 — 모델 판정 안 바꿈]

**A. 캘리브레이션 산출(순수 함수, 서버 유틸).** `summarizeScorecard` 가 만든 confidence 차원 셀을 재활용한다.
- `calibrateConfidence(cells, confidence)` — 한 버킷(HIGH/MEDIUM/LOW)의 **전 horizon hit/miss 합산** → 실측 적중률 `hit/(hit+miss)`(flat 분모 제외, phase-1 D3 정합) + 표본수 `n=hit+miss`. `n<MIN_SAMPLE_N` 이면 `sufficient:false`.
- `calibrateAllConfidences(cells)` — HIGH/MEDIUM/LOW 중 표본 1건 이상 버킷만 반환.

**B. 읽기 전용 BFF.** `GET /api/scorecard/calibration` — confidence 버킷별 보정값 + `minSampleN` 반환. Vercel 가드 없음(prod 동작). 미설정/채점 0건이면 빈 배열 + 200(graceful).

**C. 판정 화면 노출.** `FinalVerdictCard` 신뢰도 표시 지점(모델 confidence 칩 아래)에 **"보정된 신뢰도" 칩**:
- `sufficient`: `실측 적중률 55% (n=25)`(emerald 톤).
- `!sufficient`: `실측 표본 부족`(slate 톤) — 모델 confidence 만 의미 있게 둠.
- 보정값 없음(미설정·표본 0): 칩 자체를 안 그린다(무회귀).
- 3개 사용처(라이브 최종 카드·이전 결론 카드·저장 결론 모달) 모두 자기 confidence 에 맞는 보정값을 도메인 훅으로 받아 전달.

### 3-2. (나) PM 프롬프트 성적 주입 [플래그 뒤, 기본 OFF]

**A. 성적 요약 문자열 빌더(순수 함수).** `buildScorecardFeedbackSummary(cells)` — 전체(충분 버킷 합산)+confidence별+verdict별 실측 적중률·n 요약 블록. **n≥MIN_SAMPLE_N 버킷만 포함**, 포함할 라인이 없으면 **빈 문자열**. 가이드 문구 동봉: "과신 말고 이번 분석가 데이터로 재검증하라. 이전 verdict 에 앵커링 금지."

**B. PM 프롬프트 주입.** `route.ts` 에서 `formatPreviousDecisionContext` 옆에 조립 — `prompts.system + previousDecisionContext + scorecardFeedbackContext`(PM 만).

**C. 플래그 게이트.** env `SCORECARD_FEEDBACK_PROMPT`(기본 OFF — "1"·"true"·"on" 만 ON). `isScorecardFeedbackPromptEnabled()` 한 함수로 판정. **OFF 면 DB 조회·문자열 조립을 아예 하지 않아** 프롬프트·비용 모두 무변경(완전 무회귀). 빌더 실패는 fail-soft(주입만 skip, 분석 계속).

**D. 비용.** 무거운 분석은 로컬 CLI 라 토큰 과금 아님(§1-1 #7) → 주입 추가 비용 ~0.

### 3-3. 공통
- 상수 모듈에 `MIN_SAMPLE_N`(기본 20) + 플래그 판정 함수. 한 곳에서 조정.
- 데이터 게이팅: 표본 0/부족이면 캘리브레이션 "표본 부족"/미노출 + 주입 skip → 기존 분석/판정 화면 **완전 무회귀**.
- 컨벤션(`docs/rules/frontend.md`): 한글 카피(`lib/copy/scorecard/`), BFF 패턴, 도메인 훅(useQuery 직접 import 금지), `cn`·토큰(hex/px 직타 금지), query key 단일 위치.

---

## 4. 비범위 (Out of scope — FOLLOWUPS)

- **능동 푸시 / 스케줄 브리핑** → 별도 슬러그 `proactive-briefing`(phase-2).
- **자동 프롬프트 재작성** — 우리는 성적 **데이터만 주입**하고 모델이 자기조정한다. 시스템이 프롬프트를 알고리즘으로 고쳐쓰지 않는다.
- **채점 로직 변경** — phase-1 적중 판정(scoring.ts)·집계(summarize.ts) 유지. 이번은 재활용만.
- **동적 배리어 채점**(target_pct/stop_loss_pct·ATR 기반 종목별 임계) — phase-1 고정 T 유지.
- **모델 confidence 후처리 보정**(실측으로 모델 출력 자체를 덮어쓰기) — C3, 표시 전용 원칙.
- **신규 화면/대시보드** — 캘리브레이션은 기존 판정 카드 칩 1줄. 적중률 표는 기존 `/dashboard/scorecard` 그대로.

---

## 5. 수용 기준 (AC — QA가 테스트 항목으로 직변환 가능)

### AC-1 (가 — 캘리브레이션 산출 정확성)
confidence 차원 셀 시드(HIGH d1 hit6/miss2, w1 hit3/miss1, m1 hit2/miss1/flat5)에서 `calibrateConfidence(cells,"HIGH")` 가 hit=11·miss=4·sample=15·hitRate≈0.733 을 반환한다(flat 분모 제외). 다른 confidence·verdict 차원 셀은 합산에 안 섞인다.
- 검증: 단위 테스트 `calibration.test.ts`.

### AC-2 (가 — min-n 게이트 경계)
`sample == MIN_SAMPLE_N` 이면 `sufficient=true`, `sample == MIN_SAMPLE_N-1` 이면 `false`(>= 경계). 표본 0 이면 hitRate=null·sufficient=false.
- 검증: 단위 테스트 경계값 전수.

### AC-3 (가 — BFF)
`GET /api/scorecard/calibration` 가 confidence 버킷별 `{confidence,hitRate,sample,hit,miss,sufficient}` 배열 + `minSampleN` 을 반환한다. 미설정이면 `configured:false`+빈 배열+200, 채점 0건이면 빈 배열+200.
- 검증(라이브): 미설정 환경 200·빈 배열, 시드 데이터 환경 버킷 노출.

### AC-4 (가 — 판정 카드 노출)
판정 카드(라이브 최종/이전 결론/저장 결론 모달)에서 모델 confidence 칩 아래 보정 칩이 보인다. 충분 표본 → `실측 적중률 N% (n=M)`, 부족 → `실측 표본 부족`, 보정값 없음 → 칩 미노출(카드 나머지 무변경).
- 검증(라이브, 두 뷰포트): 세 사용처 + 세 상태.

### AC-5 (나 — 요약 빌더: n>=min-n 만 포함)
`buildScorecardFeedbackSummary(cells, 20)` 에서 HIGH(n=24)는 포함·LOW(n=10)는 제외된다. verdict 도 전 horizon 합산 n≥20 만 포함. 충분 버킷이 하나도 없으면 빈 문자열.
- 검증: 단위 테스트.

### AC-6 (나 — 빈 데이터 시 빈 문자열 = 주입 skip)
빈 입력·전부 미달 표본이면 빌더가 `""` 반환 → 호출부가 프롬프트에 아무것도 안 붙인다.
- 검증: 단위 테스트 + 코드 리뷰(`+ scorecardFeedbackContext` 가 빈 문자열이면 무변화).

### AC-7 (나 — 플래그 기본 OFF·무회귀)
`SCORECARD_FEEDBACK_PROMPT` 미설정/그 외 값이면 `isScorecardFeedbackPromptEnabled()=false` → DB 조회·문자열 조립 자체를 skip, PM 프롬프트 무변경. "1"·"true"·"on"(대소문자·공백 무시) 만 ON.
- 검증: 단위 테스트 `feedbackFlag.test.ts` + OFF 상태 분석 1회 정상 동작(회귀 없음).

### AC-8 (무회귀 — 빌드/테스트)
`npm run lint`·`tsc --noEmit`·`npm run test`·`npm run build` 통과. 기존 분석 SSE·판정 카드·이전 결론·적중률 표·토큰 탭 무영향(채점 데이터 0건 환경에서도).

---

## 6. 가정 · 제약

- **DB 가정**: Supabase 라이브(`signal_scorecard` phase-1 적용 완료). 신규 테이블·스키마 변경 **없음**(읽기만 추가). 미설정이면 캘리브레이션 빈 배열·주입 skip(fail-soft).
- **표본 가정**: phase-1 채점이 표본을 쌓는 중이라 도입 초기엔 대부분 버킷이 표본 부족이다. **graceful no-op 가 정상 경로** — 표본이 MIN_SAMPLE_N(20) 이상 쌓이면 점진 활성화.
- **실행/환경 가정**: AI 분석 실행은 로컬 전용(`isVercelEnv` 가드, 기존). 캘리브레이션 BFF·적중률 집계는 prod 동작. 성적 주입은 로컬 분석 시 로컬에서 플래그 ON 일 때만.
- **조정 가능**: `MIN_SAMPLE_N`(기본 20)·플래그 default 는 상수 모듈에서 코드 1줄로 조정(env 노출은 플래그만 — `SCORECARD_FEEDBACK_PROMPT`).
- **표시 전용 원칙(C3)**: 캘리브레이션은 모델 출력을 후처리로 바꾸지 않는다. verdict·confidence 는 모델이 낸 그대로 카드에 남고, 보정은 별도 칩으로만 표시.

---

## 7. FOLLOWUPS — phase-2 분기 (이 PRD 비범위, 연결성 명시)

- **`proactive-briefing` (phase-2, 별도 슬러그)**: 채점 결과 능동 푸시/브리핑. 이번 캘리브레이션·성적 데이터가 브리핑 콘텐츠 소스가 된다. 푸시 채널(PWA web-push vs Slack 재사용)은 phase-2 결정.
- **운영 모니터링**: 플래그 ON 전환 시점·전환 후 적중률 추이 관찰(주입이 실제로 confidence 캘리브레이션을 개선하는지). MIN_SAMPLE_N 튜닝(20 이 적절한지).
- **동적 배리어 채점**: target_pct/stop_loss_pct·ATR 기반 종목별 임계(phase-1 고정 T → 정밀화).
- **모델 confidence 후처리 보정**(선택, 신중): 실측 적중률로 모델 confidence 를 자동 디스카운트(C3 원칙 재검토 필요 — 별도 PRD).
- **공개 대시보드**: 캘리브레이션 곡선(신뢰도 vs 실측) 시각화·종목 드릴다운·provider 비교.

---

## 8. 영향 분석

### 8.1 신규 파일
- `lib/server/scorecard/calibration.ts` — 캘리브레이션 산출 + 성적 요약 빌더(순수 함수, 단위 테스트 대상).
- `app/api/scorecard/calibration/route.ts` — 캘리브레이션 BFF(읽기 전용).
- `lib/api/scorecard/calibration.ts` — 어댑터.
- `hooks/query/useQueryScorecardCalibration.ts` · `hooks/scorecard/useConfidenceCalibration.ts` — 페칭/도메인 훅.
- `lib/server/scorecard/__tests__/calibration.test.ts` · `feedbackFlag.test.ts` — 단위 테스트.
- `docs/prd/scorecard-feedback.md`(본 문서) · `docs/qa/scorecard-feedback.md`(QA 단계).

### 8.2 수정 파일
- `lib/server/scorecard/constants.ts` — `MIN_SAMPLE_N` + `isScorecardFeedbackPromptEnabled()`.
- `lib/types/scorecard/scorecard.ts` — `ConfidenceCalibration`·`ScorecardCalibrationResponse`.
- `lib/copy/scorecard/labels.ts` — 캘리브레이션 칩 카피.
- `hooks/query/queryKeys.ts`·`lib/query/queryConfig.ts` — calibration 키/정책.
- `components/stock/ai-analysis/FinalVerdictCard.tsx` — `calibration` prop + 보정 칩.
- `components/stock/AIAnalysisPanel.tsx`·`components/analyze/AIDecisionDetailSheet.tsx` — 보정값 전달.
- `app/api/stock/ai-analysis/route.ts` — 성적 주입(플래그 뒤).
- `.env.example` — `SCORECARD_FEEDBACK_PROMPT` 안내.

### 8.3 변경 라인 추정 · 회귀 위험
- ~350-450 LOC(순수 함수·BFF·훅·칩·주입). 단일 PR(PRD+구현+테스트).
- 회귀 위험 1순위: **분석 SSE 무회귀** — 주입은 플래그 OFF 기본 + fail-soft. OFF 면 코드 경로 자체를 안 탄다.
- 회귀 위험 2순위: **판정 카드** — 보정 칩은 calibration prop 이 있을 때만 추가 렌더. prop 없으면(기본) 기존과 동일.
- 산출 정확성: 캘리브레이션·빌더는 순수 함수로 분리 → fixture 단위 테스트로 경계값(min-n) 고정.

---

## 9. 확정 결정 (RESOLVED — 사용자 승인 2026-06-22, 구현 기준)

| # | 질문 | 확정 결정 | 근거 |
|---|---|---|---|
| D1 | 스코프 | **(가) 캘리브레이션 표시 + (나) PM 프롬프트 성적 주입 한 PRD/PR** | 둘 다 채점 결과 되먹임 루프의 표시·주입 양면. min-n 게이트·데이터 게이팅 공통. |
| D2 | 캘리브레이션 표시 위치/문구 | **`FinalVerdictCard` 모델 confidence 칩 아래 "보정된 신뢰도" 칩** — `실측 적중률 N% (n=M)` / 부족 시 `실측 표본 부족` / 없으면 미노출 | 신뢰도 표시 지점에 곁들여 비교가 즉각적. 표시 전용(모델 판정 불변, C3). |
| D3 | 적중률 산식 | **전 horizon hit/miss 합산, hitRate=hit/(hit+miss)(flat 분모 제외)** | phase-1 D3 정합. 표시 1줄 요약 목적이라 표본 규모 극대화(horizon 합산). |
| D4 | 플래그 이름/기본값 | **env `SCORECARD_FEEDBACK_PROMPT`, 기본 OFF** ("1"·"true"·"on" 만 ON, 서버 전용) | 운영자가 표본 신뢰 후 켜는 통제점(C4). OFF 면 완전 무회귀. |
| D5 | MIN_SAMPLE_N | **기본 20**(상수 모듈 단일 조정점) | 작은 표본 과신·앵커링 방지(C1). 도입 초기 graceful no-op 가 정상. |
| D6 | 주입 방식 | **성적 데이터만 주입, 모델이 자기조정**(자동 프롬프트 재작성 아님) | 비범위 §4. 가이드 문구(과신·앵커링 금지)만 동봉. |
| D7 | 캘리브레이션 데이터 경로 | **신규 read-only BFF `/api/scorecard/calibration` + 도메인 훅** | BFF 패턴(C5) — 브라우저 Supabase 직접 호출 금지. summary 와 분리(카드용 경량 응답). |
