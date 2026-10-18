# QA — scorecard-section-hierarchy (성적표 섹션 구분·정보 위계)

- 실행: 2026-10-18 23:07 KST, QA 역할
- 대상: PR #396 `feature/scorecard-section-hierarchy` @ `7591306` (1차), `5c9994b` (재QA)
- 근거: PR 본문 (사용자 피드백 "섹션 구분감 부족, 중요/부가 정보 구분 안 됨", 카드 UI 는 원하지 않음), 매니저가 준 AC 1~5. 별도 PRD 없음 (경량 UX 폴리시).
- 방법: `.env.local` 로 Supabase·KV 를 **GET 만** 해서 실데이터 summary 를 만들었다 (`/tmp/qa396/live.json`, 원장 130행). 실제 `ScorecardContainer` 를 `renderToStaticMarkup` 으로 SSR 하고, `next build` CSS 두 청크를 실제 앱과 같은 순서(`08j4-82y0jq1w.css` → `0dkkqyqcjhd07.css`, `page_client-reference-manifest.js` 기준)로 붙여 headless Chromium(Playwright)에서 쟀다. 필터 상태(집계 기준·평가 시점)는 임시 vitest 하니스에서 `react` 의 `useState` 초기값을 바꿔 렌더했다. 다크 모드는 `<html class="dark">`.
  - 로컬 `next start` + 관리자 세션 렌더는 하지 않았다. 로컬 서버를 띄우면 서버 스케줄러(단타 자동틱 등)가 공유 Supabase 에 쓰기를 할 수 있어서 "GET 만" 조건을 지키려고 정적 렌더를 썼다. 관리자 세션을 쓰려면 세션 쿠키를 직접 서명해야 하는 점도 피했다.
  - 임시 파일(`qa-tmp396/`)은 삭제했고 커밋하지 않았다.

## 최종 판정: qa-passed (재QA @ `5c9994b`, 실패 0건)

1차(`7591306`)는 qa-failed 였고, 수정 커밋 `5c9994b` 에서 실패 2건(AC-3e/3f)이 해소됐다. 아래 "재QA (5c9994b)" 절 참고. 1차 기록은 그 아래에 그대로 둔다.

## 재QA (5c9994b)

- 실행: 2026-10-18 23:13 KST. 1차와 같은 방법 — 실제 `ScorecardContainer` 를 `renderToStaticMarkup` 으로 SSR(훅 mock + `useState` 초기값으로 필터 상태 지정), 새 `next build` CSS 두 청크를 `page_client-reference-manifest.js` 순서(`0biu4.gmyj3~7.css` → `0dkkqyqcjhd07.css`)로 붙여 headless Chromium 에서 측정. 페이지 머리글은 `page.tsx` 의 새 마크업(`gap-2xl`)을 그대로 옮겼다.
- 데이터: 1차에 Supabase GET 으로 받아 둔 실데이터 스냅샷 `/tmp/qa396/live.json`(원장 130행)을 다시 썼다. 실패를 같은 데이터로 재확인하기 위해서이며, 이번에는 Supabase 를 새로 조회하지 않았다(쓰기 0).
- 임시 하니스(`qa-tmp396/`)는 삭제했고 커밋하지 않았다.

### 수정 내용 (검증 대상)

| 항목 | 변경 |
|---|---|
| 상세 표 정렬 | 순수 함수 `lib/scorecard/orderDetailCells.ts`. 그룹 순서 = 그 구분 셀들의 최대 표본(내림차순) → key → 그룹 안 `d1, w1, w2, m1`. 평가 시점별 차원은 key 를 시점 순으로 |
| 섹션 구분 | 부모 `divide-y divide-border-line`, 각 섹션 `py-2xl first:pt-0 last:pb-0` (O-5 대응) |
| 제목 | 섹션 h2 3개 모두 `text-h2` |
| 머리글 간격 | `page.tsx` `gap-lg` → `gap-2xl` |
| 구분 칸 | `whitespace-nowrap` (O-2), 그룹 2번째 행부터 `sr-only` 라벨 (O-3) |

### 결과

| # | 항목 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| R-1 | 1차 실패 AC-3e: 시장 국면별 · 전체 (실데이터) | regime · all, 1280 다크 | 국면마다 한 덩어리, 그룹 안 +1일→+1주→+2주→+1달 | `약세장(52/83/75/79) → 횡보장(54/6/12/5) → 강세장(24/41/43/46)`. 그룹 최대 표본 83 > 54 > 46 순. 각 그룹 시점 순서 정확, 같은 라벨 재등장 0, 행 위 선은 그룹 첫 행(첫 그룹 제외)만 | 통과 |
| R-2 | 1차 실패 AC-3f: 성숙도 혼재 시드 | verdict · all, BUY d1/w1/w2/m1 = 12/8/5/3, HOLD 전부 9 | BUY 4행 한 그룹 | `적극 매수 +1일, +1주, +2주, +1달` → `중립 +1일, +1주, +2주, +1달`. 갈라짐 0 | 통과 |
| R-3 | 평가 시점별 순서 (1차 O-1) | horizon · all | +1일→+1주→+2주→+1달 | `+1일, +1주, +2주, +1달` | 통과 |
| R-4 | 그룹화 회귀 (다른 차원·필터) | verdict·all / regime·+1달 / confidence·all / signalScore·all | 갈라짐 0 | 4가지 모두 갈라짐 0, 그룹 안 시점 순서 정확. regime·+1달 은 3행 각 1행 그룹, 모든 행에 라벨·선. confidence "높음" 표본 5건 미만 힌트는 그룹 첫 행에만 | 통과 |
| R-5 | 섹션 구분선 (기본) | 실데이터, 1280·375, 다크·라이트 | 섹션 사이에만 선, 첫 섹션 위 없음 | 오픈베타 `border-bottom 1px`, pt 0 / pb 24. 방향 적중 `border-bottom 1px`, pt 24 / pb 24. 판정별 상세 선 없음, pt 24 / pb 0. 모든 섹션 `border-top 0`. 선 색 다크 `rgb(42,51,62)`, 라이트 `rgb(236,239,243)` | 통과 |
| R-6 | 섹션 구분선 (`openBeta: null`) | openBeta 만 null / openBeta·directionGate 둘 다 null | 첫 섹션 위 선 없음 | openBeta null: 방향 적중이 첫 섹션 — pt 0, `border-top 0`, 아래에만 선. 둘 다 null: 판정별 상세 하나 — 선 0, pt 0 / pb 0. 1차 O-5 해소 | 통과 |
| R-7 | 빌드 CSS 에 새 클래스 존재 | `.next/static/chunks/0biu4.gmyj3~7.css` grep | 존재 | `:where(.divide-y>:not(:last-child)){…border-bottom-width:calc(1px * calc(1 - var(--tw-divide-y-reverse)))}`, `:where(.divide-border-line>:not(:last-child)){border-color:var(--fs-border-line)}`, `.py-2xl{padding-block:24px}`, `.first\:pt-0:first-child{padding-top:…0}`, `.last\:pb-0:last-child{padding-bottom:…0}`, `.gap-2xl{gap:24px}`, `.sr-only{…position:absolute…}`, `.text-h2{font-size:17px;…700}`, `.whitespace-nowrap`. 순서: `.py-2xl`(offset 64168) 뒤에 `first:pt-0`(85318)·`last:pb-0`(85707) — 변형이 이김 (R-5 실측과 일치) | 통과 |
| R-8 | 섹션 제목 위계 | computed style | h2 3개 `text-h2` | h1 `20px/700`, h2 3개 모두 `17px/700`. 머리글 하단 → 첫 섹션 24px (1차 `gap-lg` 보다 넓어짐) | 통과 |
| R-9 | 375 구분 라벨 줄바꿈 (1차 O-2) | 375, 다크·라이트 | 글자 단위 세로 꺾임 없음 | 구분 칸 `white-space: nowrap`. 상세 표 16행 높이 모두 33~34px(1차는 그룹 첫 행만 5줄 높이). `신규 진입 주의` 한 줄 | 통과 |
| R-10 | 375 페이지 가로 스크롤 | 375, 다크·라이트, 기본 + openBeta null | 0 | doc scrollWidth/clientWidth `375/375` (4가지 모두). 표 wrap: 오픈베타 `347/347`, 방향 `347/347`, 상세 `347/455` (내부 overflow-x, 1차 `347/387` 보다 넓어짐 — 관찰 V-2) | 통과 |
| R-11 | sr-only 라벨 (1차 O-3) | DOM | 그룹 2번째 행부터 구분 칸에 sr-only 라벨 | 12행(기본 화면 4그룹×3) 모두 `<span class="sr-only">` 에 그룹 라벨. 시각 출력 없음, 레이아웃 영향 없음(doc 폭 그대로) | 통과 |
| R-12 | tsc | `npx tsc --noEmit` | 0 | exit 0 | 통과 |
| R-13 | eslint | `git diff --name-only -z main...HEAD -- '*.ts' '*.tsx' \| xargs -0 npx eslint` (8개 파일) | 0 | exit 0, 출력 없음 | 통과 |
| R-14 | vitest | `npx vitest run lib/scorecard components/scorecard lib/server/scorecard` | 전부 통과 | 13 files / 185 passed (1차 12/182 + `orderDetailCells.test.ts` 3건) | 통과 |
| R-15 | build | `npx next build` | 성공 | exit 0 | 통과 |
| R-16 | 토큰·카피 | 변경 파일 hex/px/arbitrary 값 grep, 주석 외 한글 | 0 | 0건 (`#396` 주석이 hex 패턴에 걸린 오탐 1건 제외). 새 카피 없음 | 통과 |
| R-17 | BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` (route.ts 제외) | main 과 동일 | 2건, 1차와 같음 | 통과 |

### 스크린샷 (커밋하지 않음)

| 파일 | 내용 |
|---|---|
| `/tmp/qa396/v2-dark-1280.png` | 실데이터, 판정별 · 전체 |
| `/tmp/qa396/v2-light-1280.png` | 같은 화면, 라이트 |
| `/tmp/qa396/v2-dark-375.png` | 375, 다크 |
| `/tmp/qa396/v2-light-375.png` | 375, 라이트 |
| `/tmp/qa396/v2-regime-dark-1280.png` | 1차 실패 재현 화면(시장 국면별 · 전체) — 이제 3그룹 정상 |
| `/tmp/qa396/v2-mixed-light-1280.png` | 성숙도 혼재 시드 — BUY 한 그룹 |

### 관찰 (머지를 막지 않음)

- V-1 섹션 h2 3개가 이제 모두 `17px/700` 으로 같다. 1차 O-4 의 "1px 차이" 문제는 없어졌지만, 대신 "오픈베타 조건"과 "방향 적중 (참고 지표)"가 글자 크기로는 구분되지 않는다. 중요/참고 구분은 순서, 제목의 "(참고 지표)" 문구, 오른쪽 상태 문구 색이 맡는다. 실제 화면에서는 섹션 사이 선 + 24px 여백이 분명해서 덩어리 구분은 잘 보인다.
- V-2 375 에서 상세 표가 `whitespace-nowrap` 때문에 455px 로 넓어져, 가장 중요한 `적중률(초과)` 열이 첫 화면에서 잘려 보이지 않는다(가로로 밀어야 보임). 스크롤 힌트(그림자·페이드)는 없다. 1차의 세로 꺾임보다는 낫지만, 모바일에서 핵심 열을 먼저 보이게 하려면 열 순서나 숨김을 따로 고민해야 한다.
- V-3 라이트 모드 헤어라인(`rgb(236,239,243)` on 흰 배경)은 여전히 옅다. 스크린샷에서 겨우 보이는 정도이고, 구분은 주로 여백이 맡는다 (1차 O-4 와 같음).
- V-4 그룹 사이 선(상세 표)과 섹션 사이 선이 같은 색·같은 두께라, 상세 표 안에서는 "그룹 경계"와 "섹션 경계"가 같은 무게로 보인다. 섹션 경계는 위아래 24px 여백이 있어 구분은 된다.

## 1차 판정: qa-failed (실패 1건) — 재QA 에서 해소

"판정별 상세" 표의 그룹화가 **그룹 안에서 평가 시점마다 표본수가 다르면** 깨진다 (AC-3). 실데이터에서도 집계 기준을 "시장 국면별"로 바꾸면 바로 재현된다. 나머지 항목은 통과다.

## AC 별 결과

| AC | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1a 섹션 분리 | 실데이터 SSR, 1280·375, 다크·라이트 | 3섹션 사이 헤어라인 + 여백 | 컨테이너 `row-gap 24px`. 섹션 2·3 `border-top 1px` + `padding-top 24px`, 섹션 1 은 선 없음. 선 색: 라이트 `rgb(236,239,243)`, 다크 `rgb(42,51,62)` | 통과 |
| AC-1b 상세 섹션 제목 | 같은 렌더 | "판정별 상세" h2 | h2 순서 `오픈베타 조건 (판정 정직성)` 17px/700 → `방향 적중 (참고 지표)` 16px/700 → `판정별 상세` 16px/700. `section aria-labelledby="scorecard-detail-title"` | 통과 |
| AC-2a 판정 칸 | 오픈베타 표 5행 computed style | 아이콘 + 굵게 | 5행 모두 `font-weight 700` + `svg[aria-hidden=true]`. 통과 `rgb(22,101,52)`(라이트)/`rgb(74,222,128)`(다크), 보류·수동 muted | 통과 |
| AC-2b 수동 항목 "현재" 칸 | 2·5번 행 | "—" | 둘 다 `—` (muted, weight 400) | 통과 |
| AC-2c 점검 안내 보조 줄 | 2·5번 행 첫 칸 | 설명 아래 보조 줄 | `· 최근 분석 10건을 표본으로 실제 차트와 대조해 확인`, `· 최근 점검: PR #394 (2026-10-18)` (caption, muted, `mt-xs`) | 통과 |
| AC-2d 자동 항목 실측값 강조 | 1·3·4번 행 값 칸 | 굵게, strong 색 | `최근 표본 없음`·`오늘 실행 성공`·`100% (67/67)` 모두 700 + text-strong. `cn` 이 `text-body-sm` → `text-body-sm-strong` 로 정상 병합(색 클래스 유실 없음) | 통과 |
| AC-3a 기본 상태 그룹화 | 판정(verdict)별 · 전체 | 라벨은 그룹 첫 행만, 선은 그룹 사이만, 1일→1주→2주→1달 | 4그룹 × 4행. 라벨은 첫 행만, `border-top 1px` 은 그룹 첫 행(첫 그룹 제외)만, 시점 순서 정확 | 통과 |
| AC-3b 평가 시점 필터 | 판정별 · +1주 / 국면별 · +1달 | 그룹 1행씩 | 4행·3행, 모든 행에 라벨 + 행 사이 선 | 통과 |
| AC-3c 집계 기준 "평가 시점별" | horizon · 전체 | 그룹 1행씩 | 4행, 모두 라벨 + 선. 다만 순서가 `+1일, +1달, +1주, +2주` (관찰 O-1) | 통과 |
| AC-3d 신뢰도별·신호 강도별 | confidence · 전체 / signalScore · 전체 | 그룹화 정상 | 둘 다 그룹 정상, 시점 순서 정확 | 통과 |
| **AC-3e 시장 국면별 (실데이터)** | regime · 전체 | 국면별 3그룹, 그룹 안 1일→1주→2주→1달 | **약세장·횡보장이 두 번씩 나오고 그룹 안 시점 순서가 섞임** (아래 실패 상세) | **실패** |
| **AC-3f 성숙도 혼재 (시드)** | 판정별 · 전체, BUY d1/w1/w2/m1 표본 12/8/5/3, HOLD 전부 9 | BUY 4행 한 그룹 | **BUY 가 1행 + 3행으로 갈라지고 사이에 HOLD 그룹이 끼임** | **실패** |
| AC-4a 375 가로 넘침 | 375 viewport, 다크·라이트 | 페이지 스크롤 0, 표는 내부 스크롤 허용 | doc `375/375`. 표 wrap clientWidth/scrollWidth: 오픈베타 `347/347`, 방향 `347/347`, 상세 `347/387` (내부 overflow-x) | 통과 |
| AC-4b 다크·라이트 대비 | computed color | 문제 없음 | 본문 muted: 라이트 `rgb(91,100,112)` on `rgb(246,248,250)` 약 5.9:1, 다크 `rgb(154,166,178)` on `rgb(14,20,27)` 약 8:1. 헤어라인은 장식이라 대비 기준 대상 아님 (라이트에서는 옅음 — 관찰 O-4) | 통과 |
| AC-4c 등락색·hex/px 직타 | `git grep -nE "#[0-9a-fA-F]{3,6}\b\|[0-9]+px\|signal-up\|signal-down\|text-up\|text-down\|text-red\|text-green\|-\[[0-9]"` (변경 컴포넌트 3개) | 0 | 0건. 아이콘 크기는 `h-4 w-4` 토큰 | 통과 |
| AC-4d 카피 lib/copy 경유 | 변경 컴포넌트 3개에서 주석 아닌 줄의 한글 (perl `\p{Hangul}`) | 0 | 0줄. 새 문구 `DETAIL_TITLE`·수동 안내 2개는 `lib/copy/scorecard/labels.ts` | 통과 |
| AC-4e 표 접근성 | 렌더 HTML | scope·aria-labelledby 유지 | `scope="col"` 17, `scope="row"` 7 (오픈베타 5 + 방향 2), `aria-labelledby` 3개 모두 짝이 되는 `id` 존재. 아이콘 `aria-hidden`. 다만 그룹 2번째 행부터 "구분" 칸이 비어 스크린리더가 행 라벨을 못 읽음 (관찰 O-3) | 통과 |
| AC-5a tsc | `npx tsc --noEmit` | 0 | exit 0 | 통과 |
| AC-5b eslint | `npx eslint $(git diff --name-only main...HEAD -- '*.ts' '*.tsx')` (4개 파일) | 0 | exit 0, 출력 없음 | 통과 |
| AC-5c vitest | `npx vitest run components/scorecard lib/server/scorecard` | 전부 통과 | 12 files / 182 passed. `components/scorecard` 에는 테스트 파일이 없음 | 통과 |
| AC-5d build | `npx next build` | 성공 | exit 0 | 통과 |
| AC-5e 빌드 CSS | `.next/static/chunks/*.css` grep | 새 클래스 존재 | `.gap-2xl{gap:24px}`, `.pt-2xl{padding-top:24px}`, `.text-h2{font-size:17px;…}`, `border-t`, `mt-xs`, `py-sm`, `gap-sm`, `align-top`, `flex-shrink-0`, `inline-flex`, `font-bold`, `text-body-sm-strong`, `h-4`, `w-4`, `hover:bg-surface-muted` 모두 있음 | 통과 |

## 실패 상세 — AC-3e/3f 그룹이 갈라지고 시점 순서가 섞임

- 재현 조건: 같은 구분(key) 안에서 평가 시점마다 `total` 이 다를 때. 지금 실데이터에서는 "시장 국면별"에서 항상 생긴다 (국면은 시점별로 따로 매겨지므로). 판정별·신뢰도별에서도 새 분석이 들어와 1일만 채점되고 1달은 아직 pending 이면 생긴다. PR "다음 작업"의 오픈베타 감사(분석 10건)가 들어가면 판정별 기본 화면에서도 재현될 가능성이 높다.
- 원인: `ScorecardContainer.tsx` 정렬의 1순위가 셀 하나의 `total` 이다. `total` 은 (key, horizon) 셀마다 다르므로, 한 key 의 셀이 다른 key 셀 사이로 흩어진다. key·시점 정렬은 `total` 이 같을 때만 쓰인다.
  ```ts
  if (b.total !== a.total) return b.total - a.total;   // 셀 단위 total
  if (a.key !== b.key) return a.key.localeCompare(b.key);
  return HORIZON_ORDER.indexOf(a.horizon) - HORIZON_ORDER.indexOf(b.horizon);
  ```
- 실측 (실데이터, 국면별 · 전체, 구분|평가 시점|행 위 선):
  ```
  약세장|+1주|0px      ← 약세장 그룹 1 (83)
  ·|+1달|0px            (79)
  ·|+2주|0px            (75)
  횡보장|+1일|1px      ← 횡보장 그룹 1 (54)
  약세장|+1일|1px      ← 약세장이 다시 나옴 (52)
  강세장|+1달|1px      ← 강세장: 1달→2주→1주→1일 역순
  ·|+2주|0px
  ·|+1주|0px
  ·|+1일|0px
  횡보장|+2주|1px      ← 횡보장이 다시 나옴
  ·|+1주|0px
  ·|+1달|0px
  ```
- 실측 (시드, 판정별 · 전체): `적극 매수|+1일` → `중립|+1일, +1주, +2주, +1달` → `적극 매수|+1주, +2주, +1달`.
- 기대: 각 구분이 한 덩어리로 한 번만 나오고, 덩어리 안은 +1일 → +1주 → +2주 → +1달.
- 스크린샷: `/tmp/qa396/p-regime-all-dark-1280.png` (실데이터 국면별), `/tmp/qa396/p-mixed-light-1280.png` (시드).
- 수정 방향 (참고, 개발자 판단): 그룹 순서를 key 단위 값(예: 그 key 셀들의 `total` 최댓값 또는 합)으로 먼저 정하고, 같으면 key, 그다음 `HORIZON_ORDER`. "평가 시점별"(dimension=horizon)일 때는 key 가 곧 시점이므로 key 를 `HORIZON_ORDER` 로 정렬하면 O-1 도 같이 해결된다. 정렬을 순수 함수로 빼서 위 두 데이터 모양으로 단위 테스트를 두길 권한다.

## 스크린샷 (커밋하지 않음)

실데이터, 판정(verdict)별 · 전체, full page.

| 파일 | 비고 |
|---|---|
| `/tmp/qa396/dark-1280.png` | PR |
| `/tmp/qa396/light-1280.png` | PR |
| `/tmp/qa396/dark-375.png` | PR |
| `/tmp/qa396/light-375.png` | PR |
| `/tmp/qa396/main-dark-1280.png` | main 기준 비교 (main 컴포넌트 4개 + main 카피를 같은 데이터로 렌더, 이 PR 빌드 CSS 사용. main 이 쓰는 클래스는 모두 이 CSS 에 있음을 확인) |
| `/tmp/qa396/p-regime-all-dark-1280.png` | 실패 재현 (국면별) |
| `/tmp/qa396/p-mixed-light-1280.png` | 실패 재현 (시드) |

main 대비 개선은 분명하다. main 은 오픈베타 표 바로 아래에 방향 적중 제목이 붙어 있고, 필터가 제목 없이 이어지며, 상세 표는 같은 판정명이 4번씩 반복되고 시점이 `+1주, +1달, +2주, +1일` 처럼 섞여 있다. PR 은 섹션 사이에 선과 여백이 생겼고, 판정 열 아이콘과 굵기로 결과가 먼저 눈에 들어오며, 수동 항목의 긴 안내가 값 칸에서 빠졌다.

## 에지 케이스

| 케이스 | 결과 |
|---|---|
| 평가 시점 필터 특정 시점 | 그룹 1행씩, 모든 행에 라벨·선 (AC-3b) |
| 집계 기준 "평가 시점별" (평가 시점 select disabled) | 그룹 1행씩. 순서 관찰 O-1 |
| 표본 5건 미만 그룹 (신뢰도 "높음" 4건) | 힌트 `표본 5건 미만 — 참고용` 은 그룹 첫 행에만, 그룹 전 행 muted. 의도대로 |
| 방향 게이트 표본 0 | 기존 조건 `directionGate.sample > 0` 유지 → 섹션 2 가 없으면 섹션 3 이 바로 선 + 여백으로 이어짐 (코드 확인) |
| `openBeta: null` (Supabase 미설정) | 패널 미렌더. 그 경우 첫 섹션이 방향 적중이 되는데도 위에 선이 그어진다 (관찰 O-5) |
| 빈 집계 / 필터 결과 0 | `StatusBlock` 이 "판정별 상세" 섹션 안에서 렌더 (제목·필터 유지) |
| 로딩·에러·미설정 | 분기 무변경 |
| BE(FastAPI) 다운 | 해당 없음. 이 화면은 FastAPI 를 쓰지 않음 |

## 공통 AC

| 항목 | 결과 |
|---|---|
| typecheck/lint/build | 0 에러 (AC-5) |
| BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` (route.ts 제외) 2건, main 과 같은 서버 측 fallback. 이 PR 은 `app/` 을 바꾸지 않음 |
| 한글 톤 | 새 문구 3개 모두 한글, `lib/copy` 경유 |
| 접근성 | 섹션 3개 모두 `aria-labelledby` + h2. 인터랙티브 요소 추가 없음, Tab 순서 변화 없음 (필터·새로고침 순서 유지). O-3 참고 |

## 라운드트립

- FastAPI 와 무관한 화면이라 PR #11 의 AC-14 a~e 는 범위 밖이다.
- 라이브 앱 대신 실데이터 SSR + 빌드 CSS 로 두 뷰포트 × 두 테마를 쟀다 (방법 절 참고). 필터 조작은 상태 초기값을 바꾼 렌더 7가지(판정별 전체/+1주, 평가 시점별, 국면별 전체/+1달, 신뢰도별, 신호 강도별)로 대신했다. 실제 select 조작·hover 는 확인하지 않았다.
- DESIGN.md 토큰 라이브 동기화: 해당 없음. 새 토큰 없이 기존 토큰(`2xl`, `h2`, `body-sm-strong`, `border-line`)만 사용.

## 관찰 (머지를 막지 않음)

- O-1 "평가 시점별"의 행 순서가 `+1일, +1달, +1주, +2주` 다. 표본이 모두 130 이라 key 문자열 순(`d1 < m1 < w1 < w2`)으로 정렬된다. main 도 시간 순은 아니었지만, 이번 PR 이 "시점 순서"를 내세운 만큼 같이 맞추는 게 자연스럽다.
- O-2 375 에서 "구분" 열이 글자 단위로 세로로 꺾인다 (`신/규/진/입/주/의`). main 부터 있던 문제(#395 O-3)인데, 이번 PR 에서 라벨이 그룹 첫 행에만 남고 `align-top` 이 붙으면서 첫 행만 5줄 높이가 되고 `+1일` 이 그 가운데에 떠서 그룹 안 행 간격이 고르지 않게 보인다. 가장 눈에 띄는 모바일 흠이다. 구분 열에 `whitespace-nowrap` 이나 최소 폭을 주고 표 내부 가로 스크롤에 맡기는 쪽을 검토할 만하다.
- O-3 그룹 2번째 행부터 "구분" 칸이 비어 있어 스크린리더로 행을 읽으면 무엇에 대한 행인지 알 수 없다. 구분 칸을 `th scope="rowgroup"` + `rowSpan` 으로 바꾸거나, 빈 칸에 `sr-only` 로 라벨을 남기면 된다.
- O-4 위계 차이가 작다. 오픈베타 h2 `17px` 대 나머지 h2 `16px` 로 1px 차이라 "가장 중요한 섹션"이 크기로는 거의 구분되지 않는다. 페이지 h1 과 첫 섹션 사이는 `gap-lg` 라 섹션 사이(24px + 선)보다 좁아서 머리글과 오픈베타 섹션이 붙어 보인다. 라이트 모드 헤어라인(`rgb(236,239,243)` on `rgb(246,248,250)`)은 화면에 따라 거의 안 보일 수 있다 — 구분은 주로 여백이 맡는다.
- O-5 `openBeta` 가 없을 때 방향 적중 섹션이 첫 섹션이 되는데 `SECTION_DIVIDER` 가 무조건 붙어 맨 위에 선이 생긴다. 현재 prod 는 Supabase 가 설정돼 있어 보이지 않는 경로다.
