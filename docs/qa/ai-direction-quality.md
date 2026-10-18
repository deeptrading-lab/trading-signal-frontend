# QA — ai-direction-quality (Phase 1 진단 + E-2 새 입력 감사)

- 실행: 2026-10-18 19:46~19:55 KST, QA 역할 (KIS 야간 점검 21:45~ 이전이라 라이브 재실행 함)
- 대상: PR #393 `feature/ai-direction-quality-diagnosis` @ `a949db7`
- 근거: `docs/prd/ai-direction-quality.md` §5 Phase 1 AC-1.1~1.6, §10 결정 기록. 사전 등록 2개(`ai-direction-diagnosis-preregistration.md`, `new-input-audit-preregistration.md`)
- 성격: 앱 런타임 변경이 없는 분석 PR 이다. UI·BFF·반응형·DESIGN.md 동기화 항목은 해당 없음(아래 "해당 없음" 절).
- QA 는 문서·스크립트를 고치지 않았다. `.mts` 타입체크용 임시 tsconfig 는 `/tmp` 에 만들었고 저장소에 남기지 않았다.

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1.1 진단 사전 등록 순서 | `git log --diff-filter=A --format='%ct %h' -- <파일>` | 사전 등록 첫 커밋 < 결과 첫 커밋, 사전 등록 커밋 1개 | 사전 등록 `fb5b885` 1792314779 (18:12:59) < 결과 `71f6f6f` 1792315305 (18:21:45). `git log --oneline -- docs/analysis/ai-direction-diagnosis-preregistration.md \| wc -l` = **1** | 통과 |
| AC-1.1 E-2 사전 등록 순서 (§10 결정 3, AC-3.1 방식) | 위와 같음 | 같음 | 사전 등록 `dfe573e` 1792315737 (18:28:57) < 스크립트 `0c7aaba` 1792316285 (18:38:05) < 결과 `c2644e5` 1792320156 (19:42:36). 사전 등록 커밋 수 = **1** | 통과 |
| AC-1.2 읽기 전용 (PRD grep) | `git grep -nE "method: *\"(POST\|PATCH\|PUT\|DELETE)\"" scripts/scorecard/direction-diagnosis.mts` | 0건 | **0건** | 통과 |
| AC-1.2 확장 — 스크립트 3개 + 순수 모듈 | `git grep -nEi "method\|POST\|PATCH\|PUT\|DELETE\|upsert\|insert\(\|\.update\(\|\.delete\("` | 쓰기 0 | `direction-diagnosis.mts:107` `method: "GET"`(ai_analysis_queue 조회) 1건뿐. import 하는 store 함수는 `getAllScorecardRows`(scorecardStore.ts:358 GET)·`getAllAIDecisions`(decisionStore.ts:226 GET) 둘뿐이고 쓰기 함수(POST/PATCH/DELETE)는 import 안 함 | 통과 |
| AC-1.2 확장 — KIS 주문 경로 | `git grep -nEi "order\|trading\|TTTC\|VTTC"` | 주문 엔드포인트 0 | 매칭 1건은 Supabase 쿼리 `order=created_at.asc`(정렬 파라미터). KIS 호출은 `/uapi/domestic-stock/v1/quotations/inquire-price`(FHKST01010100)·`/quotations/investor-trade-by-stock-daily`(FHPTJ04160001) 조회 TR 과 `fetchIndexDailyChunked`·`fetchDailyChunked`(일봉 조회)뿐. `/trading/` 경로 0 | 통과 |
| AC-1.3 게이트 재사용 | `git grep -n summarizeDirectionGate scripts/scorecard/direction-diagnosis.mts` | ≥ 1 | 3건(L8 주석, L18 import, L82 `summarizeDirectionGate(allRows)`). 진입 주 병기도 `directionDiagnosis.ts:207` 에서 같은 함수를 주별로 호출. `OPEN_BETA_*`·`BULL_VERDICTS` 재정의 없음 | 통과 |
| AC-1.4 (a) 게이트 수치 | 진단 스크립트 실행 (아래 재현성 절) | 패널 값과 일치 | 강세 n=20 적중 8 (40.0%) 찍기 44.6% −4.6%p / 약세 n=101 적중 58 (57.4%) 찍기 55.4% +2.0%p / 표본 130 pass=false. 결과 문서 §4 와 일치. 패널(`app/api/scorecard/summary/route.ts:52,59`)도 `summarizeDirectionGate(getAllScorecardRows())` 로 같은 함수·같은 입력이라 구조상 같은 값이다 | 통과 (관찰 2) |
| AC-1.4 (b) 가설 9개 측정값 | 같은 실행 | 9개 각각 출력 | H-A1~H-C1 9줄 + `[라벨]` 9줄 + JSON 출력 | 통과 |
| AC-1.5 라벨 9개 | `grep -cE "^\| *H-(A[1-5]\|B[1-3]\|C1) .*(지지\|기각\|판정 불가)" docs/analysis/ai-direction-diagnosis-2*.md` | 9 | **9** | 통과 |
| AC-1.6 유효 표본·분포 | 결과 문서 §2·§3 확인 | 고유 종목·고유 진입 주·중복 재분석·강세/약세 진입 주 분포 + verdict 6종 비율·강세군 비율·UW 비율 | §2 표: 고유 종목 66 · 고유 진입 주 10 · 중복 재분석 64 · 진입 주별 전체/강세/약세 10행. §3 표: verdict 6종 n·비율·평균·중앙, 강세군 15.4% · UW 60.8% | 통과 |

## 재현성

### 진단 스크립트 (`MARKET_DATA_SOURCE=kis node --env-file=.env.local --import tsx scripts/scorecard/direction-diagnosis.mts`)

시각 19:47 KST (야간 점검 전). 약 6초. 세 번 돌렸다.

| 실행 | 결과 |
|---|---|
| 1회 (19:47) | 결과 문서와 **전부 일치**. preReturn20d 캐시 109 · KIS 21 · 결측 0 |
| 2회 (1회 직후 연달아) | `458870 일봉 실패: [object Object]` → KIS 18 · 결측 3. **H-B3 가 `지지` → `판정 불가` 로 바뀜**(하위 분위 약세 n 41→40, 적중 50.0% vs 분위 하락 50.0%, 조건 2 불충족). 나머지 8개 라벨·게이트는 같음 |
| 3회 (20초 뒤) | 1회와 `generatedAt` 빼고 **완전 일치** (`diff` 출력 없음) |

1회 결과와 결과 문서 비교 (발췌):

| 항목 | 결과 문서 | 1회·3회 실측 | 일치 |
|---|---|---|---|
| H-A1 | 34건 중 1건 2.9% → 기각 | `UW 본문 34건 중 유지/관망 1 (2.9%)` → 기각 | O |
| H-A3 | 14.0/15.9/16.3%, +2.3%p → 기각 | 같음 | O |
| H-A4 | 16.5% (16/97) / 12.1% → 기각 | `n=97 16.5% · n=33 12.1%` → 기각 | O |
| H-A5 | 11.6% → 28.6%, +17.0%p → 지지 | `Δ 17.0%p` → 지지 | O |
| H-B1 | ρ −0.003, [−0.157, +0.297], 2000/2000 → 지지 | `ρ=-0.003 95% [-0.157, 0.297] (2000/2000)` → 지지 | O |
| H-B1 병기 | 강세 40.0 vs 48.4 (−8.4), 약세 57.4 vs 57.5 (−0.1) | 같음 | O |
| H-B2 | 54.5 − 42.1 = +12.4%p → 지지 | 같음 | O |
| H-B3 | −15.4 vs +2.4, −17.7%p, 20/41 vs 21/43 → 지지 | 같음 (bottomBear 0.48780 < bottomDownShare 0.48837) | O |
| H-C1 | 43/79/7/1/0, 종목 66, 주 10, 큐 117 | 같음 | O |
| 분포 | OW 20 · HOLD 9 · UW 79 · REDUCE 22, 강세 15.4%, UW 60.8% | 같음 | O |

### E-2 감사 (`npx tsx scripts/signal/new-input-audit.mts`)

캐시만 읽음, 6.6초. 두 번 돌려 출력이 바이트 단위로 같다.

| 항목 | 결과 문서 | 실측 | 일치 |
|---|---|---|---|
| 표본 | 관측 125,407 · 종목 599 · 거래일 466 | 같음 | O |
| 수급·업종·DART | 수급 655 빈응답 0 · 결측 관측 2 · 업종 828 중 빈 값 9 · DART 4,395 | `수급 파일 655(빈응답 0) · 수급 결측 관측 2 · 업종 819종목 · DART 행 4395` (819 = 828 − 9) | O |
| F1~F5d 표 (IC·NW t·naive t·스프레드·±날·연도 IC) | §2 표 | 8행 전부 같은 값 | O |
| 기준 O/x | §3 표 | 스크립트 판정 열과 8행 전부 같음 | O |
| 4축 중복 | +0.128 / +0.355 / +0.402 / +0.685 / −0.025 / +0.004 / −0.007 / +0.031 | 같음 | O |
| 결론 | 발견 통과 없음 → 홀드아웃 계산 안 함 | `발견 판정: 통과 (피처 × 방향) 없음 → 홀드아웃 계산 안 함` | O |

## 사전 등록 규칙대로 판정했는지 (손으로 다시 판정)

진단 (`ai-direction-diagnosis-preregistration.md` §2):

| 가설 | 규칙 | 측정값 | 손 판정 | 문서 |
|---|---|---|---|---|
| H-A1 | 본문 ≥ 10, 비율 ≤ 30% → 기각 | 34건, 2.9% | 기각 | 기각 |
| H-A3 | 분위당 n ≥ 15, 차이 < 5%p → 기각 | 43/44/43, +2.3%p | 기각 | 기각 |
| H-A4 | 이전 비율 ≤ 20% → 기각 | 16.5% | 기각 | 기각 |
| H-A5 | 이후 n ≥ 15, +10%p 이상 → 지지 | n=28, +17.0%p | 지지 | 지지 |
| H-B1 | 주 ≥ 6, 구간이 0 포함 → 지지 | 주 10, [−0.157, +0.297] | 지지 | 지지 |
| H-B2 | ≥ 10%p → 지지 | +12.4%p | 지지 | 지지 |
| H-B3 | 하위 약세 n ≥ 15, 조건 1 ≤ −5%p, 조건 2 적중 < 찍기 → 지지 | 41, −17.7%p, 0.4878 < 0.4884 | 지지 | 지지 |

코드 임계도 사전 등록과 같다: `MIN_GROUP_N = 15`, H-A1 정규식 `HOLD_ADVICE_RE`/`SELL_ADVICE_RE` 가 사전 등록 문자열 그대로(`directionDiagnosis.ts:184-185`), H-A1 0.6/0.3, H-A3 15/5, H-A4 0.2·10, H-A5 10/3, H-B1 주 < 6, H-B2 10/3, H-B3 −5/−2, 부트스트랩 2000회·시드 20261018.

E-2 (`new-input-audit-preregistration.md` §4, s = 방향):

| 피처·방향 | ① sign·\|NW t\| ≥ 2.73 | ② s×스프레드 ≥ 0.28 | ③ 안정성 ≥ 60% | ④ 2024·2025 부호 | 손 판정 | 문서 |
|---|---|---|---|---|---|---|
| F1 정 | x (1.53) | O (0.675) | x (59%) | x (2024 −0.0010) | 불통과 xOxx | xOxx |
| F4 역 | O (−3.80) | O (0.747) | x (53%) | O (둘 다 음) | 불통과 OOxO | OOxO |
| F5a 역 | x (−0.94) | O (1.740) | x (59%) | O | 불통과 xOxO | xOxO |
| F5c 정 | x (1.12) | O (0.731) | x (47%) | O | 불통과 xOxO | xOxO |
| F5d | 발견 이벤트 26 < 30 | | | | 판정 불가 | 판정 불가 |

코드 임계: `T_CRIT = 2.73`, `COST_PCT = 0.28`, `NW_LAG = H − 1 = 9`, 발견 안정성 0.6, 홀드아웃 0.55, 구간 2024-01-02~2025-12-31 / 2026-01-01~2026-08-10, 유동성 1,000원·30억 — 사전 등록과 같다.

## 정적 검사

| 항목 | 명령 | 결과 |
|---|---|---|
| tsc | `npx tsc --noEmit` | exit 0 |
| `.mts` 타입체크 | tsconfig `include` 가 `**/*.ts`·`**/*.tsx` 라 `.mts` 는 빠진다. 저장소 tsconfig 를 extends 하고 스크립트 3개만 include 한 임시 설정(`/tmp/qa-tsconfig-mts.json`, `baseUrl` = 저장소 루트)으로 `npx tsc -p /tmp/qa-tsconfig-mts.json` | exit 0 |
| eslint (변경 .ts) | `npx eslint lib/server/scorecard/directionDiagnosis.ts lib/server/scorecard/__tests__/directionDiagnosis.test.ts` | exit 0, 출력 없음 |
| eslint (변경 .mts) | `npx eslint scripts/scorecard/direction-diagnosis.mts scripts/signal/collect-flow.mts scripts/signal/new-input-audit.mts` (`--print-config` 로 `.mts` 파서 적용 확인) | exit 0, 출력 없음 |
| `npm run lint` (전체) | `eslint .` JSON 출력을 디렉터리별로 집계 | 오류 2,007건이 **전부 `.claude/worktrees/`**(로컬 미추적 워크트리). 이 PR 변경 5파일은 오류 0 · 경고 0 |
| vitest | `npx vitest run lib/server/scorecard` | 10 files / 166 tests passed (`directionDiagnosis.test.ts` 20 tests 포함) |
| build | `npx next build` | 성공 (`✓ Compiled successfully`, 76/76 정적 페이지) |

## 런타임 무변경

| 항목 | 명령 | 결과 |
|---|---|---|
| app·components·hooks | `git diff --stat main...HEAD -- app components hooks` | **빈 출력** |
| lib | `git diff --name-status main...HEAD -- lib` | `A lib/server/scorecard/directionDiagnosis.ts`, `A .../__tests__/directionDiagnosis.test.ts` 두 개(신규)뿐 |
| 신규 모듈 사용처 | `git grep -ln directionDiagnosis -- app components hooks lib` (테스트 제외) | 0 — 앱 코드에서 import 안 함. 스크립트만 씀 |
| 순수성 | 모듈 안 `fetch`·`process.env`·`fs.`·`console.` grep | 0. import 는 타입 2개 + `summarizeDirectionGate` |
| 사용자 카피 | `git diff --stat main...HEAD -- lib/copy` | 빈 출력 |
| 캐시 커밋 방지 | `git check-ignore -v scripts/signal/__flow__/x` | `scripts/signal/.gitignore:4:__flow__/` 로 무시됨 |

## 문서 정합

| 항목 | 결과 |
|---|---|
| PRD §10-1 확정 표기 | 제목 `### 10-1. 오픈베타 조건 — 판정 정직성 (확정 2026-10-18)` (L327) |
| PRD §10 첫 문단 수치 | H-B1 ρ −0.003, H-B2 +12.4%p, H-B3 −15.4% vs +2.4% — 진단 결과 문서·실측과 같음 |
| PRD §10-2 E-2 수치 | 발견 통과 0/8, F4 역방향 t −3.80 · 안정성 53% · 4축 상관 0.685, 홀드아웃 미계산 — E-2 결과 문서·실측과 같음 |
| 사전 등록 무수정 | 두 문서 모두 커밋 1개, 첫 커밋 이후 diff 없음 |
| 사전 등록과 다른 점 기재 | 진단 결과 §5 (7개 세부), E-2 결과 §6 (업종 빈 값 9종목·828 vs 829·4축 중복 전수 기재) — 둘 다 판정 규칙 변경은 없다고 적었고, 실측도 규칙대로 나온다 |

## 공통 AC

| 항목 | 결과 |
|---|---|
| typecheck/lint/build | 위 정적 검사 절 — 0 에러 (전체 lint 의 오류는 저장소 밖 로컬 워크트리) |
| BFF 원칙 | `app/` 변경 0줄. `git diff main...HEAD -- app \| grep -c 127.0.0.1` = 0 |
| 한글 톤 | 사용자 노출 문구 변경 0 (`lib/copy`·`app`·`components` 무변경). 스크립트 콘솔 출력은 운영자용이고 한글 |
| 접근성 | UI 변경 없음 — 해당 없음 |

## 에지 케이스

| 케이스 | 확인 | 결과 |
|---|---|---|
| KIS 일시 실패 (진단) | 2회차에 실제로 발생 (`458870 일봉 실패: [object Object]`) | 스크립트가 멈추지 않고 그 종목 3행을 결측으로 빼고 계속 계산 → **H-B3 라벨이 바뀜**. 결측 수는 `preReturn20d: … 결측 3` 줄에 찍히지만 경고·종료 코드는 없음. 관찰 1 |
| KIS 야간 점검 (수집) | `collect-flow.mts:37-41` `inKisMaintenance()` = KST 21:45 이상 또는 07:00 미만 | 사전 등록 §5 의 21:45~07:00 과 같음. 진입 시 `process.exit(0)` 후 재실행 시 캐시 스킵. 결과 문서상 실제 수집은 18:30~19:42 로 중단 없음 |
| Supabase env 없음 (진단) | `direction-diagnosis.mts:83` | 0행이면 `throw new Error("채점 원장 조회 0행 — Supabase env 확인")` — 빈 결과로 라벨을 내지 않음 |
| MARKET_DATA_SOURCE ≠ kis | `direction-diagnosis.mts:75-77` | 경고 출력 후 진행 |
| 부트스트랩 결정성 | 1회·3회 실행 비교 | ρ·구간·2000/2000 동일 (시드 고정) |
| E-2 결정성 | 2회 실행 `diff` | 출력 동일 |

## 해당 없음

UI·반응형 두 뷰포트·SSR hydration·DESIGN.md 토큰 동기화·BE 라운드트립(AC-14 a~e): 이 PR 은 `app/`·`components/`·`hooks/`·스타일·토큰을 건드리지 않는다. dev 서버를 띄워 확인할 화면 변화가 없다.

## 관찰 (머지 차단 아님)

1. **진단 스크립트가 KIS 일시 실패를 조용히 결측으로 처리해 라벨이 바뀔 수 있다.** 재현: 진단 스크립트를 두 번 연달아 실행 → 2회차에 `458870` 일봉 조회 실패(`fetchDailyChunked(...).catch(() => [])`, `direction-diagnosis.mts:149-152`, 재시도 없음) → 결측 3 → H-B3 `지지` → `판정 불가`. 20초 뒤 3회차는 다시 결과 문서와 일치. 결과 문서의 값은 결측 0 실행 기준이라 맞다. 다만 H-B3 조건 2 는 0.06%p 차이(결과 문서도 "간신히"라고 적음)라 행 몇 개로 뒤집힌다. 재측정할 때는 `결측 0` 줄을 확인하거나, 다음에 이 스크립트를 손볼 때 결측 > 0 이면 0 이 아닌 코드로 끝나게 하는 것을 권고. 에러 메시지도 `[object Object]` 로 찍혀 원인을 알 수 없다(axios 에러 객체가 `Error` 인스턴스가 아님).
2. **AC-1.4 (a) 는 패널 화면을 직접 캡처해 비교하지 않았다.** 결과 문서는 사전 등록 §0·PRD §1-2 의 값(패널에서 읽은 값)과 비교했고, QA 는 패널 route 가 같은 함수·같은 store 호출(`summarizeDirectionGate(getAllScorecardRows())`)임을 코드로 확인했다. 관리자 로그인이 필요한 화면이라 캡처는 생략.
3. **E-2 수집 시작(18:30, 결과 문서 §1)이 스크립트 커밋(18:38)보다 앞선다.** 사전 등록(18:28:57)은 수집보다 먼저라 규칙(사전 등록 → 결과) 위반은 아니다. 수집 스크립트가 커밋 전 작업본으로 돌았다는 뜻이라, 커밋본과 실행본이 같은지는 QA 가 확인할 수 없다. 감사 스크립트는 커밋본으로 다시 돌려 같은 값이 나왔다.
4. **진단 스크립트의 KIS 토큰 발급은 POST 다.** `getAccessToken()` → `POST /oauth2/tokenP`(`lib/api/kis/token.ts:87`), `.env.local` 의 `KIS_TOKEN_STORE=kv` 라 Upstash KV 토큰 캐시에 쓸 수 있다. 인증 경로이고 Supabase 쓰기·주문이 아니라 AC-1.2 범위 밖이지만, "쓰기 0" 이라는 표현의 실제 범위는 "Supabase·주문 0"이다.
5. **H-A1 은 규칙상 기각이지만 측정 도구가 문구 구조와 맞지 않았다** (결과 문서가 스스로 적음: 보유 계열 33 · 매도 계열 32 매칭). 라벨을 규칙대로 둔 것은 맞다. 후속 재측정 때 새 사전 등록으로 다룰 일.
6. 로컬 `npm run lint` 가 `.claude/worktrees/` 때문에 오류 2,007건으로 실패한다. 이 PR 과 무관한 작업 환경 문제다(eslint ignore 에 추가하거나 워크트리 정리).

## 판정

**qa-passed** — AC-1.1~1.6 전부 통과, 실패 0건. 결과 문서 두 개는 커밋본 스크립트로 재현되고, 표본으로 다시 판정한 가설 7개·피처 5개가 사전 등록 규칙과 맞는다. PR 본문에 `## 다음 작업` 절이 있음을 라벨 부여 전에 확인했다.
