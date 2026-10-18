# QA — scorecard-direction-gate (성적표 오픈베타 전환 기준 표시)

- 실행: 2026-10-18 17:30 KST, QA 역할
- 대상: PR #392 `feature/scorecard-direction-gate` @ `4174f39`
- 근거: 경량 기능이라 PRD 없음. PR 본문의 기준과 매니저가 준 AC 1~5 로 검증.
- 방법: 손계산 시드와 실데이터로 임시 vitest 를 만들어 돌렸다 (`renderToStaticMarkup` 사용, `vi.mock` 으로 route/hook 대체). 검증 후 임시 파일은 삭제했고 커밋하지 않았다. 반응형은 `next build` 산출 CSS 와 headless Chromium 으로 실측했다.

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1a 손계산 시드 | BUY+2, OW−1, OW 0 / SELL−3, REDUCE−0.5, UW+1, UW 0 / HOLD +1,+2,−1 + 제외 대상 4행(pending BUY+5, skipped SELL null, hit BUY null, hit BUY NaN) | sample=10, 상승 4·하락 4 → base 0.4/0.4. 강세 n=3 hits=1 diff −6.67. 약세 n=4 hits=2 hitRate 0.5 diff +10.0 이지만 표본 부족이라 pass=false | 기대값과 전부 일치 | 통과 |
| AC-1b HOLD | 위 시드의 HOLD 3건 | 찍기 분모(sample)에만 포함되고 방향별 n 에는 안 들어감 | sample 10 = 방향 7 + HOLD 3. 방향 n 은 3/4 | 통과 |
| AC-1c 수익률 0 | OW 0, UW 0 | 어느 방향 적중도 아니고 상승·하락 집계에도 안 들어감 | hits 에서 빠지고 sample 에는 포함(상승 4 + 하락 4 + 0 두 건 = 10) | 통과 |
| AC-1d pending/skipped/null/NaN | 위 4행 | 제외 | sample 10 유지 | 통과 |
| AC-1e 정확히 +10%p | 강세 50건(35 상승), 약세 50건(25 하락) → 0.7−0.6 (부동소수로 0.0999…) | diffPp 10, 통과 | 강세 diffPp=10, pass=true. 약세 0.5−0.4 = 10, pass=true. 전체 pass=true | 통과 |
| AC-1f 9.9%p | 강세 100건(60 상승) + HOLD 900(441 상승) → 0.6 vs 0.501 | 미달 | diffPp=9.9, enoughSample=true, pass=false | 통과 |
| AC-1g n=49 / n=50 | 강세 50(전부 상승) + 약세 49(전부 하락) → 약세 diff 50%p 이상 | n=49 는 pass=false, n=50 은 통과 | n=49: enoughSample=false, pass=false, 전체 false. n=50: diffPp 50, pass=true, 전체 true | 통과 |
| AC-2 실데이터 | `/tmp/sc/rows.json` 130행(snake→camel 매핑) | 강세 20/8 base≈44.6% diff≈−4.6, 약세 101/58 base≈55.4% diff≈+2.0, pass=false | 강세 `n20 hits8 hitRate .40 base .4462 diff −4.615385`, 약세 `n101 hits58 hitRate .5743 base .5538 diff +2.041127`, sample 130, pass=false | 통과 |
| AC-3 API | route `GET` 에 `requireAdminApi`/store mock | 거부 시 403이 그대로 나가고 store 는 호출되지 않음. 미설정이면 `directionGate:null`, 정상이면 객체 | 403 통과, `getAllScorecardRows` 미호출. 미설정은 `configured:false, directionGate:null`. 정상은 `{horizon:"w2",sample:2,marginPp:10,minN:50,bull:{n:1,hits:1,…}}` | 통과 |
| AC-3 타입 정합 | `lib/api/scorecard/summary.ts`, `hooks/scorecard/useQueryScorecardSummary.ts` | 같은 `ScorecardSummaryResponse` 사용 | 둘 다 `@/lib/types/scorecard/scorecard` 의 `ScorecardSummaryResponse` 를 쓰고 `directionGate: DirectionGate \| null` 필드가 있음. tsc 클린 | 통과 |
| AC-4 미표시 | `ScorecardContainer` 를 hook mock 으로 SSR 렌더 | sample=0 또는 null 이면 패널 없음, >0 이면 패널 있음 | `summarizeDirectionGate([])` 와 `null` 모두 "오픈베타 전환 기준" 없음. BUY 1건이면 표시 | 통과 |
| AC-4 결과 색 | 통과 50/50 시드, 미달·표본 부족 혼합 시드 | 통과 `text-outcome-hit`, 미달 `text-warn`, 표본 부족 `text-text-muted` | 판정 셀 `[outcome-hit 통과]×2`, `[warn 미달]`, `[text-muted 표본 부족]`. 헤드라인도 통과=outcome-hit, 미달=warn | 통과 |
| AC-4 등락색 미사용 / 직타 | 렌더 HTML 을 정규식 검사 | `signal-up\|signal-down\|accent-vivid\|#hex\|Npx` 0건 | 0건. 소스(`DirectionGatePanel.tsx`)에도 hex/px 직타 없음 | 통과 |
| AC-4 한글 카피 | 소스 점검 | 문구가 전부 `lib/copy/scorecard/labels.ts` 를 거침 | GATE_* 상수, `gateCriteria`, `gateHeadline` 와 기존 `HIT_RATE_NA` 경유. 컴포넌트에 문자열 리터럴 없음 | 통과 |
| AC-4 모바일 폭 | 아래 반응형 절 참조 | 375 에서 넘침 없음 | 375 넘침 없음(table 347 = container 347). 320 은 18px 넘침, 관찰 사항으로 기록 | 통과 (관찰 1) |
| AC-5 tsc | `npx tsc --noEmit` | 0 에러 | 0 에러 | 통과 |
| AC-5 eslint | `npx eslint <변경 ts/tsx 8파일>` | 0 | 0 | 통과 |
| AC-5 vitest | `npx vitest run lib/server/scorecard components/scorecard` | 전부 통과 | 9 files / 146 tests passed | 통과 |
| AC-5 build | `npx next build` | 성공 | 성공(라우트 표 출력) | 통과 |

## 공통 AC

| 항목 | 결과 |
|---|---|
| BFF 원칙 | `git grep -nE "http://127\.0\.0\.1" -- app/` 에서 route 외 2건이 나오지만 둘 다 `app/api/workbench/_adapters/fastapi.ts`(BFF 서버 어댑터의 env fallback)이고 main 과 같은 건수. 이 PR 에서 늘어난 것 없음 |
| 한글 톤 | 신규 노출 문구는 전부 한글("오픈베타 전환 기준", "찍기 점수", "표본 부족" 등). 영문 노출 없음 |
| 접근성 | `<section aria-label>`, `<h2>`, `th scope="col"`/`scope="row"` 사용. 판정이 색만이 아니라 텍스트로도 표시됨(통과/미달/표본 부족). 인터랙티브 요소가 없어 Tab 순서 변화 없음 |
| admin 게이트 | `requireAdminApi` 가 그대로이고 거부 경로가 store 를 호출하지 않음(AC-3 실측) |

## 반응형 실측 (실데이터 130행 패널 + 빌드 CSS)

`next build` 산출 CSS 를 그대로 붙인 정적 페이지(`.main-area` 래퍼 포함)를 headless Chromium 에서 열어 측정했다.

| 뷰포트 | container | table scrollWidth | 문서 가로 넘침 | 행 높이(헤더/강세/약세) | 비고 |
|---|---|---|---|---|---|
| 1280 | 1152 | 1152 | 없음 | 37 / 42 / 42 | 한 줄 정렬 |
| 375 | 347 | 347 | 없음 | 37 / 84 / 84 | 방향 라벨이 3줄로 줄바꿈("오른다 / (매수 계 / 열)") |
| 320 | 292 | 310 | **18px 넘침** (doc 324) | 53 / 168 / 210 | 방향 라벨이 글자 단위로 꺾이고, 표에 `overflow-x-auto` 래퍼가 없어 페이지 전체가 가로로 스크롤됨 |

판단: 지정 뷰포트(375, 1280)에서는 넘침이 없다. 320(구형 소형 기기)에서는 넘치지만 운영자 전용 화면이라 머지는 막지 않는다.

## 에지 케이스

| 케이스 | 결과 |
|---|---|
| 빈 원장 (`[]`) | sample 0. bull/bear 의 hitRate·baseRate·diffPp 는 null, 패널 미표시 |
| 한 방향 n=0 (예: 약세 0건) | hitRate null → "—" 표시, `0/50`, 판정 "표본 부족", diffPp null |
| NaN 수익률 | `Number.isFinite` 로 제외(sample 미포함) |
| 수익률 0 (flat) | 분모에는 들어가고 상승·하락·적중에는 안 들어감 |
| 부동소수 경계 | 0.7−0.6, 0.6−0.5 둘 다 diffPp 가 정확히 10 → 통과. 소수 6자리 반올림이라 9.9999996%p 같은 값도 10으로 올라가지만 실제 비율로는 나오기 어려운 값이라 무시 가능 |
| Supabase 미설정 | `directionGate:null`. 컨테이너는 `!configured` 분기로 미설정 안내만 보여줌 |
| 비admin 요청 | 403, 집계 미실행 |

## 라운드트립

- FastAPI(BE) 와 무관한 기능이다(Supabase `signal_scorecard` 만 읽음). PR #11 의 AC-14 a~e 는 analyze 플로우용이라 이 PR 범위 밖이다.
- `/dashboard/scorecard` 는 Google OAuth admin 세션이 있어야 열려 QA 환경에서 dev 라이브 로그인은 하지 않았다. 대신 실데이터 130행을 실제 컴포넌트로 렌더하고 빌드 CSS 를 붙여 두 뷰포트에서 실측했다(위 절). 운영자가 prod 에서 한 번 눈으로 확인하길 권장.
- DESIGN.md 토큰 라이브 동기화는 해당 없음: 신규 토큰이 없고 기존 토큰(`outcome-hit`, `warn`, `text-muted`, `border-line`)만 썼다.

## 관찰 (머지 차단 아님)

1. **320px 가로 넘침 / 375px 라벨 3줄**: 6열 표에 `overflow-x-auto` 래퍼가 없고 방향 라벨이 줄바꿈을 허용해 375 에서 "(매수 계 / 열)" 처럼 단어 중간에서 꺾이고, 320 에서는 18px 넘친다. 고치려면 `ScorecardTable` 처럼 `overflow-x-auto` 로 감싸거나, 모바일에서 라벨을 "오른다"/"내린다"로 줄이거나, `break-keep` 을 쓰면 된다.
2. **헤드라인 톤**: 두 방향이 모두 "표본 부족"이어도 헤드라인은 `기준 미달`(warn)로 나온다. 지금 실데이터가 강세 표본 부족 + 약세 미달이라 "미달"이 틀린 말은 아니지만, 표본이 쌓이기 전에는 "판정 보류" 톤을 따로 두는 것도 고려할 만하다.
3. **표기**: 음수 차이가 하이픈 `-4.6%p` 로 나간다(유니코드 마이너스 아님). `101/50` 처럼 최소 표본을 넘은 건수도 분수 형태로 보여서 "50건 중 101건"으로 오해할 여지가 조금 있다.
4. PR 본문에 적힌 한계(찍기 점수가 전 기간 풀링이라 Simpson 왜곡 가능)는 코드 `ponytail:` 주석과 일치한다. 판정 로직 자체의 결함은 아니다.

## 판정

**qa-passed**: AC 1~5 전부 통과, 실패 0건. PR 본문에 `## 다음 작업` 섹션이 있는 것도 확인했다.
