# QA: scorecard-feedback — 채점 결과 자가교정 루프 (캘리브레이션 표시 + PM 프롬프트 성적 주입, phase-1.5)

- PRD: `docs/prd/scorecard-feedback.md` §5 (AC-1~8), §9 확정 결정 D1~D7
- PR: #147 (trading-signal-frontend), 브랜치 `feature/scorecard-feedback` (HEAD `a97f29c`, base `origin/main` `62f9bef`)
- 확정 스코프: **(가) 신뢰도 캘리브레이션 [표시 전용]** + **(나) PM 프롬프트 성적 주입 [플래그 `SCORECARD_FEEDBACK_PROMPT`, 기본 OFF]**. 공통 `MIN_SAMPLE_N=20` 게이트 + 데이터 게이팅(표본 0/부족 시 graceful no-op).
- **판정: qa-passed** — 자동 검증 가능 항목 전부 통과(실패 0건). prod Supabase 실데이터·브라우저 두 뷰포트가 필요한 라이브 항목(AC-3 라이브 응답, AC-4 카드 3사용처 표시, AC-7 OFF 분석 SSE 라운드트립)은 **"운영자 라이브 확인 필요"** 로 분리(자동 판정 범위 밖, 임의 pass/fail 단정 안 함). 코드 경로 + 단위 테스트로 가능한 만큼 검증해 블로커 없음.

---

## 0. 작업 안전 가드 확인

- 격리 워크트리에서 수행. `git fetch origin` 후 `git worktree add <agent-cwd>/tsf-qa feature/scorecard-feedback` 로 **에이전트 cwd 내부**에 별도 워크트리 생성 → `feature/scorecard-feedback`(a97f29c) 체크아웃.
- **메인 워킹트리(`/Applications/.../trading-signal-frontend`, 사용자 작업 공간) 미접촉**: 시작·종료 시 `main`(62f9bef) clean 유지 확인.
- **`git stash`/pop/drop 금지 준수**: stash 3건(`stash@{0}` slide-to-analyze WIP 등) 보존 — list 만 조회, 미접촉.
- 다른 브랜치 checkout/수정/삭제 없음. `node_modules` 없어 **`npm ci`** 정식 설치(심볼릭 링크 복사 안 함). QA 리포트 1파일만 추가 commit.

---

## 1. 검증 환경 · 명령 (AC-8 자동 재현)

| 항목 | 명령 | 결과 |
|------|------|------|
| eslint(전체) | `npm run lint` (`eslint .`) | **통과** (exit 0, 출력 없음 = 0 error / 0 warning) |
| 타입 체크 | `npx tsc --noEmit` | **통과** (exit 0, 출력 0줄) |
| 전체 vitest 스위트 | `npm run test` (`vitest run`) | **382 passed / 1 skipped (50 files)** (exit 0) |
| 신규 scorecard 테스트 | (위 스위트 내) | `calibration.test.ts` **12 passed** + `feedbackFlag.test.ts` **14 passed** = 26 |
| 프로덕션 빌드 | `npm run build` (`next build`) | **✓ Compiled successfully in 3.1s**, **43/43** static pages, exit 0 |

- 환경: node v20.19.6 / npm 11.7.0. `npm ci` → `added 583 packages` (정식 설치).
- 1 skipped = pre-existing live backtest(본 PR 무관).
- 빌드 경고 1건 관찰: `Turbopack build encountered 1 warnings` → import trace `./next.config.ts → lib/server/ai/agentCli.ts → app/api/stock/ai-analysis/route.ts`(NFT 파일 트레이싱). **config 레벨 사전 경고**로 본 PR 신규 캘리브레이션 코드와 무관하며 빌드를 막지 않음(exit 0). PR 본문 자가 측정값과 일치.
- 신규 라우트 빌드 등록 확인: `ƒ /api/scorecard/calibration`(동적 라우트) — build 출력 라우트 트리에 노출.

정독한 구현 파일:
- `lib/server/scorecard/calibration.ts` (산출 `calibrateConfidence`/`calibrateAllConfidences` + 빌더 `buildScorecardFeedbackSummary` 순수 함수)
- `lib/server/scorecard/constants.ts` (`MIN_SAMPLE_N=20`, `isScorecardFeedbackPromptEnabled()`)
- `lib/server/scorecard/summarize.ts` (집계 셀 — confidence 차원이 horizon별 분리됨 = 산출 함수 입력 계약)
- `app/api/scorecard/calibration/route.ts` (BFF, 읽기 전용, graceful 200)
- `app/api/stock/ai-analysis/route.ts` L411~430·L573~579 (PM 프롬프트 주입, 플래그 게이트)
- `lib/types/scorecard/scorecard.ts` (`ConfidenceCalibration`·`ScorecardCalibrationResponse`)
- `lib/copy/scorecard/labels.ts` (캘리브레이션 칩 카피)
- `components/stock/ai-analysis/FinalVerdictCard.tsx` (보정 칩)
- `components/stock/AIAnalysisPanel.tsx`·`components/analyze/AIDecisionDetailSheet.tsx` (3 사용처 전달)
- `hooks/scorecard/useConfidenceCalibration.ts`·`hooks/query/useQueryScorecardCalibration.ts`·`lib/api/scorecard/calibration.ts` (도메인·페칭·어댑터)
- `lib/server/bffUtils.ts`(`jsonWithDataSource` status=200)·`lib/server/scorecard/scorecardStore.ts`(미설정 시 `[]` fail-soft)
- 테스트: `lib/server/scorecard/__tests__/calibration.test.ts`·`feedbackFlag.test.ts`

---

## 2. 수용 기준별 판정 + 근거

### AC-1 (가 — 캘리브레이션 산출 정확성) — 통과

> confidence 차원 셀 시드(HIGH d1 6/2, w1 3/1, m1 2/1/flat5)에서 `calibrateConfidence(cells,"HIGH")` 가 hit=11·miss=4·sample=15·hitRate≈0.733(flat 분모 제외). 다른 confidence·verdict 차원은 합산에 안 섞임.

- **단위 테스트 재현**: `calibration.test.ts` `"전 horizon 합산 → hit/(hit+miss), 표본수 = hit+miss"` — `hit=11, miss=4, sample=15, hitRate≈11/15, sufficient=true` 단언 통과. `"다른 confidence·다른 차원 셀은 합산에 섞이지 않는다"` — verdict 차원 셀(BUY 9/9) 무시, HIGH 만 합산 통과.
- **코드 정합**: `calibrateConfidence`(calibration.ts L32~54) 가 `c.dimension !== "confidence"` / `c.key !== confidence` 조기 continue 로 차원·버킷 분리 후 전 horizon hit/miss 합산. `hitRate = sample>0 ? hit/sample : null`(분모=hit+miss, flat 제외) — PRD D3 정합.
- 결과: **PASS** (12/12 calibration 테스트 통과 스위트 내 포함).

### AC-2 (가 — min-n 게이트 경계) — 통과

> `sample == MIN_SAMPLE_N` → `sufficient=true`, `sample == MIN_SAMPLE_N-1` → `false`(>= 경계). 표본 0 → hitRate=null·sufficient=false.

- **단위 테스트 재현**: `"min-n 경계 — sample == minSampleN 이면 sufficient true(>=)"` — sample 10, minN 10 → true / minN 11 → false 통과. `"표본 0(셀 없음) → hitRate null, sufficient false"` 통과.
- **코드 정합**: `sufficient: sample >= minSampleN`(L52) — `>=` 경계로 동수 포함. sample 0 이면 `hitRate=null`(L51).
- **빌더 측 경계도 검증**: `buildScorecardFeedbackSummary` `"기본 인자(MIN_SAMPLE_N) 경계 — sample == MIN_SAMPLE_N 이면 포함"`(cells MEDIUM 20/0) 통과 — 같은 `>=` 게이트 일관.
- 결과: **PASS**.

### AC-3 (가 — BFF `/api/scorecard/calibration`) — 코드 통과 / 라이브 확인 필요

> confidence 버킷별 `{confidence,hitRate,sample,hit,miss,sufficient}` 배열 + `minSampleN` 반환. 미설정이면 `configured:false`+빈 배열+200, 채점 0건이면 빈 배열+200.

- **코드 경로 추적**: `app/api/scorecard/calibration/route.ts`
  - 미설정: `!isScorecardStoreConfigured()` → `{configured:false, calibrations:[], minSampleN:MIN_SAMPLE_N, generatedAt}` 를 `jsonWithDataSource(..., "supabase-unconfigured")` 로 반환. `jsonWithDataSource`(bffUtils.ts)는 `status: 200` 고정 → **미설정 200 + 빈 배열** 계약 충족.
  - 채점 0건: `getAllScorecardRows()`(미설정 아닐 때) → `summarizeScorecard([])` → `calibrateAllConfidences([])` = `[]`(테스트 `"빈 입력 → 빈 배열"` 통과) → `{configured:true, calibrations:[], minSampleN, ...}` 200. **0건 200 + 빈 배열** 충족.
  - 정상: `calibrateAllConfidences(cells)` 가 표본 1건↑ 버킷만 `ConfidenceCalibration` 형태로 반환(필드 = AC 명세 6개 + `minSampleN`).
  - 타임아웃: `withTimeout(...,5_000)` → `BFF_TIMEOUT_SENTINEL` 시 504, 그 외 502(둘 다 `no-store`). graceful 분기 정합.
- **빌드 등록**: `ƒ /api/scorecard/calibration` 라우트 트리 노출 확인(§1).
- **자동 검증 한계**: 실제 HTTP 응답 본문(미설정 환경 200·빈 배열, 시드 데이터 환경 버킷 노출)은 prod Supabase 환경에서만 라운드트립 확인 가능.
- 결과: **코드 PASS / 라이브 운영자 확인 필요**(§4).

### AC-4 (가 — 판정 카드 노출) — 코드 통과 / 라이브 확인 필요

> 판정 카드(라이브 최종/이전 결론/저장 결론 모달)에서 모델 confidence 칩 아래 보정 칩. 충분 → `실측 적중률 N% (n=M)`, 부족 → `실측 표본 부족`, 보정값 없음 → 칩 미노출(나머지 무변경).

- **3 사용처 배선 확인(코드)**:
  1. 라이브 최종 카드 — `AIAnalysisPanel.tsx` L588~592 `<FinalVerdictCard data={final} calibration={getCalibration(final.confidence)} calibrationMinSampleN={minSampleN} />`
  2. 이전 결론 카드 — `AIAnalysisPanel.tsx` L112~116 (`PreviousDecisionIntro`, `getCalibration(snapshot.decision.confidence)`)
  3. 저장 결론 모달 — `AIDecisionDetailSheet.tsx` L130~135 (`getCalibration(item.decision.confidence)`)
  세 곳 모두 `useConfidenceCalibration()` 도메인 훅에서 자기 confidence 버킷 보정값을 lookup 해 전달(BFF 패턴·도메인 훅 컨벤션 준수, useQuery 직접 import 없음).
- **3 상태 렌더 분기(코드)**: `FinalVerdictCard.tsx` L175~194
  - `calibration` falsy(null/undefined) → 칩 `{calibration && (...)}` 미렌더 = **미노출**(데이터 게이팅, 카드 나머지 무변경).
  - `sufficient` true → emerald 톤 + `calibrationHitRateText(hitRate, sample)` = `"실측 적중률 N% (n=M)"`.
  - `sufficient` false → slate 톤 + `CALIBRATION_INSUFFICIENT` = `"실측 표본 부족"`.
  - hover title: 충분 `CALIBRATION_BASIS`(표시 전용·판정 불변 안내) / 부족 `calibrationInsufficientBasis(minSampleN)`.
- **표시 전용(C3) 정합**: 칩은 모델 `data.verdict`·`data.confidence` 렌더를 일절 후처리하지 않고 별도 `<span>` 으로만 추가. 칩 외 카드 마크업 diff 없음(verdict 라벨·confidence/신호강도 줄·전략·손익비 무변경).
- **자동 검증 한계**: 실제 두 뷰포트(모바일/데스크탑) 시각 렌더·세 사용처 × 세 상태 픽셀 확인은 prod Supabase 시드 데이터 + 브라우저 필요.
- 결과: **코드 PASS / 라이브 운영자 확인 필요**(§4).

### AC-5 (나 — 요약 빌더: n>=min-n 만 포함) — 통과

> `buildScorecardFeedbackSummary(cells, 20)` 에서 HIGH(n=24)는 포함·LOW(n=10)는 제외. verdict 도 전 horizon 합산 n≥20 만 포함. 충분 버킷 없으면 빈 문자열.

- **단위 테스트 재현**: `"n>=minSampleN 버킷만 포함"`(HIGH 18/6=24 포함, LOW 5/5=10 제외) 통과 — `out` 에 `"confidence 높음(HIGH)"`·`"n=24"` 포함, `"(LOW)"` 미포함, `"- 전체: 실측 적중률"`(충분 버킷 합산) 포함. `"verdict 도 n>=minSampleN 만 포함(전 horizon 합산)"`(BUY d1 14/6 + w1 5/5 = 30 ≥20 포함, SELL 5 제외) 통과.
- **코드 정합**: confidence 루프 L105~110 `if (!c.sufficient) continue`, verdict 합산 후 L123 `if (n < minSampleN) continue`. 전체 라인은 충분 버킷 hit/miss 합산(L88~97).
- 결과: **PASS**.

### AC-6 (나 — 빈 데이터 시 빈 문자열 = 주입 skip) — 통과

> 빈 입력·전부 미달 표본이면 빌더가 `""` 반환 → 호출부가 프롬프트에 아무것도 안 붙임.

- **단위 테스트 재현**: `"충분 표본 버킷이 하나도 없으면 빈 문자열(주입 skip)"`(HIGH 10·BUY 5 전부 <20) → `""`, `"빈 입력 → 빈 문자열"` → `""` 통과.
- **코드 정합(호출부)**: `route.ts` L576 `prompts.system + previousDecisionContext + scorecardFeedbackContext`. `scorecardFeedbackContext` 가 `""` 면 PM 프롬프트는 `prompts.system + previousDecisionContext`(주입 전과 동일 문자열) — 무변화. 빌더 L128 `if (lines.length === 0) return ""`.
- 결과: **PASS**.

### AC-7 (나 — 플래그 기본 OFF · 무회귀) — 통과 (핵심) / 라이브 SSE 라운드트립 확인 필요

> `SCORECARD_FEEDBACK_PROMPT` 미설정/그 외 값 → `isScorecardFeedbackPromptEnabled()=false` → DB 조회·문자열 조립 자체 skip, PM 프롬프트 무변경. "1"·"true"·"on"(대소문자·공백 무시) 만 ON.

- **플래그 판정 단위 테스트 재현**: `feedbackFlag.test.ts` 14건 전부 통과 — 미설정 OFF / `["1","true","TRUE","on","On","  true  "]` ON(대소문자·전후 공백 trim) / `["","0","false","off","yes","enable","no"]` OFF. `constants.ts` `raw = ...?.trim().toLowerCase()` → `=== "1"||"true"||"on"` 와 정합.
- **무회귀 코드 경로(최重要) — route.ts diff 전수**:
  - `let scorecardFeedbackContext = ""`(L418) 초기화. DB 조회·빌더 호출은 **`if (isScorecardFeedbackPromptEnabled())` 블록 안에만**(L419~430) 존재 → **OFF 면 `getAllScorecardRows()` DB 조회조차 실행 안 됨**.
  - PM 프롬프트 조립(L573~576): OFF 일 때 `prompts.system + previousDecisionContext + ""` = `prompts.system + previousDecisionContext` — **base(main)와 바이트 동일**. 비-PM 에이전트는 `prompts.system` 그대로(diff 없음).
  - 주입 블록은 `try/catch` fail-soft(L426~429) — ON 이라도 조회 실패 시 주입만 skip, 분석 계속.
  - 본 파일 diff = (1) import 3줄 추가, (2) 게이트된 주입 블록 추가, (3) `+ scorecardFeedbackContext` 한 토큰 — 그 외 SSE 스트림·에이전트 루프·채점 원장 append 로직 무변경 확인.
- **무회귀 산물 검증**: AC-8 전체 스위트 382 passed(기존 분석/판정/적중률 관련 테스트 포함)·tsc 0·build 43/43 — OFF 기본 상태에서 기존 동작 회귀 신호 없음.
- **자동 검증 한계**: 실제 OFF 분석 1회(AI 멀티에이전트 SSE) 라운드트립은 로컬 CLI(`invokeAgentCliStream`)·KIS 설정 필요(로컬 전용 라우트, `isVercelEnv` 가드) → 운영자 확인 필요. 단 코드 경로상 OFF 면 신규 코드를 한 줄도 타지 않으므로 회귀 위험 = 0.
- 결과: **코드·단위 PASS / OFF 분석 SSE 라운드트립은 운영자 확인 필요**(§4).

### AC-8 (무회귀 — 빌드/테스트) — 통과

> `npm run lint`·`tsc --noEmit`·`npm run test`·`npm run build` 통과. 기존 분석 SSE·판정 카드·이전 결론·적중률 표·토큰 탭 무영향(채점 0건 환경에서도).

- §1 표 그대로: lint exit 0 · tsc exit 0 · test **382 passed/1 skipped** · build **✓ Compiled successfully, 43/43**. 전부 실측 재현.
- 채점 0건/미설정 환경 무영향: BFF·도메인 훅 모두 빈 배열 → `getCalibration()` null → 칩 미노출(데이터 게이팅). 주입은 플래그 OFF 기본 → skip. 기존 화면 코드 경로 불변.
- 결과: **PASS**.

---

## 3. 에지 케이스 / 데이터 게이팅 검증

| 케이스 | 기대 | 검증 결과 |
|--------|------|-----------|
| Supabase 미설정 | BFF 200 + `configured:false` + 빈 배열, 카드 칩 미노출, 주입 skip | **코드 PASS** — `isScorecardStoreConfigured()=false` 분기 200(jsonWithDataSource), `getAllScorecardRows()`→`[]`, 훅 null → 칩 미렌더 |
| 채점 0건(설정됐으나 표본 없음) | BFF 200 + 빈 배열, 칩 미노출, 주입 skip | **코드 PASS** — `calibrateAllConfidences([])=[]`, `buildScorecardFeedbackSummary([])=""` |
| 표본 일부 버킷만 존재(예 HIGH n=4<20) | 칩은 그리되 "실측 표본 부족"(slate), 주입에선 제외 | **코드 PASS** — `calibrateAllConfidences`(sample>0 만 반환, sufficient=false) → 칩 부족 톤; 빌더는 `!sufficient` continue |
| 전부 flat(분모 0) | hitRate null, sample 0 → 표본 부족/미노출 | **코드 PASS** — flat 은 hit/miss 합산 제외, sample=0 → `calibrateAllConfidences` 가 `sample>0` 필터로 제외(`"표본 0 버킷은 제외"` 테스트 통과) |
| BFF 응답 지연(>5s) | 504 + 한글 안내(`no-store`) | **코드 PASS** — `withTimeout(...,5_000)` + `BFF_TIMEOUT_SENTINEL` 분기 |
| BFF 5xx/네트워크 장애 | 502 + 한글 안내, 카드는 칩 없이 정상(retry:0·refetchOnWindowFocus:false) | **코드 PASS** — catch 502; 훅 `retry:0`, 에러 시 `data` undefined → `getCalibration` null → 칩 미노출(분석 화면 무영향) |
| 플래그 ON + 충분 버킷 없음 | 빌더 `""` → 주입 안 함 | **코드 PASS** — AC-6 동일 경로 |
| 플래그 ON + 성적 조회 실패 | fail-soft, 주입만 skip, 분석 계속 | **코드 PASS** — route.ts try/catch + warn 로그 |
| 잘못된 플래그 값(`"yes"`,`"enable"`,`"0"`) | OFF 유지(무회귀) | **PASS** — feedbackFlag 테스트 명시 통과 |

---

## 4. 운영자 라이브 확인 필요 항목 (자동 판정 범위 밖)

**선행조건: prod Supabase 채점 데이터 축적(특정 confidence 버킷 n≥20) + 플래그 ON 시 검증.** 아래는 prod Supabase 실데이터 + 브라우저 두 뷰포트 + 로컬 AI 분석(로컬 전용 라우트)이 있어야 라운드트립 확인 가능 — 임의 pass/fail 단정하지 않음.

1. **AC-3 라이브 응답**: 미설정 환경 `GET /api/scorecard/calibration` → 200·`configured:false`·빈 배열 / 시드(n≥20 버킷 존재) 환경 → 해당 버킷 `sufficient:true` + `hitRate`·`sample` 노출 확인.
2. **AC-4 카드 3 사용처 × 3 상태(두 뷰포트)**:
   - 사용처: 라이브 최종 결론 카드 / 이전 결론 카드 / 저장 결론 상세 모달.
   - 상태: 충분(`실측 적중률 N% (n=M)` emerald) / 부족(`실측 표본 부족` slate) / 미노출(보정값 없음).
   - 뷰포트: 모바일 + 데스크탑. 칩이 모델 confidence(또는 신호 강도) 줄 아래 위치하고 카드 나머지 레이아웃 무변경인지.
3. **AC-7 플래그 OFF 분석 SSE 무회귀(로컬)**: `SCORECARD_FEEDBACK_PROMPT` 미설정으로 로컬 분석 1회 정상 완료(기존과 동일 결과·로그에 "성적 주입" 미발생) → 기존 분석 SSE 회귀 없음.
4. **(운영 후속) 플래그 ON 전환 검증**: 표본 n≥20 축적 후 `SCORECARD_FEEDBACK_PROMPT=1` 로 로컬 분석 1회 → 서버 로그 `"PM 프롬프트에 과거 판정 성적 주입(scorecard-feedback ON)"` 출력 + PM system 프롬프트에 성적 블록 주입 확인. (모델 행동 변화는 운영 모니터링 대상 — PRD §7.)

---

## 5. 발견 결함

- **없음**(블로커·중대·경미 0건). 자동 검증 가능 AC 전부 통과. 코드-AC 정합·BFF 패턴·도메인 훅 컨벤션·표시 전용(C3)·플래그 무회귀(C4) 모두 충족. PR 본문 자가 측정값(382 passed, 43/43, 신규 12+14)과 실측 일치.

관찰(결함 아님):
- 빌드 경고 1건은 pre-existing NFT 트레이싱(`next.config.ts`) — 본 PR 무관, 빌드 비차단.

---

## 6. 최종 판정

- **qa-passed** — 실패 0건. AC-1·2·5·6·8 자동 통과, AC-7 코드·단위 통과(무회귀 핵심 검증 완료), AC-3·4 코드 통과 + 라이브는 운영자 선행조건(prod Supabase n≥20 + 두 뷰포트 + 플래그 ON) 명시.
- 머지 블로커 없음. PR 본문 `## 다음 작업` 섹션 존재 확인(handoff-append workflow 게이트 충족).
