# QA 리포트 — 실시간 순위 값 컬럼 (거래량/거래대금)

- 대상 PR: #256 `feature/ranking-value-column`
- 커밋: `4ad3301` (base `066d326`)
- 성격: 경량 UX 폴리시 (PRD 없음) — 수용 기준은 PR 본문/위임 지시로 대체
- 검증 환경: 로컬 dev(`http://127.0.0.1:3099`), 실측 `x-data-source: kis` / `x-kis-env: prod` (주말 KIS 캐시 데이터 응답) + dev mock 정적 검증
- 판정: **qa-passed** (실패 0건)

---

## 1. AC 별 재현·기대·실측

| AC | 재현 절차 | 기대 | 실측 | 결과 |
|---|---|---|---|---|
| AC1 값 정확성·정렬 일관 | 거래량 탭 `GET /api/market/volume-rank?by=volume` + 거래대금 탭 `?by=value` 응답을 포맷터에 통과 | 각 행 값이 컴팩트 표기, 상위 행이 큰 값(내림차순) | 거래량: 진흥기업 74,206,571→`7,420만주`, 금호전기 26,108,953→`2,610만주` … 내림차순. 거래대금: SK하이닉스 18,076,083,052,500→`18.1조`, 주성엔지니어링 611,859,259,000→`6,119억`, HPSP 353,056,699,750→`3,531억` … 내림차순. 실측 정렬과 값 표기 일관 | PASS |
| AC2 급상승/급하락 값 컬럼 없음 | `GET /api/market/fluctuation?dir=up` 응답 필드 확인 + `valueColumnForTab("surge")` | FluctuationRow 에 volume/tradingValue 없음 → 값 컬럼·헤더 미표시(등락률만) | surge 행 keys=`ticker,name,price,changePercent,direction,marketCap,sector` (volume/tradingValue 부재). `valueColumnForTab` 은 surge/plunge 에 `null` 반환 → 헤더·셀 렌더 분기(`{valueColumn && …}`) 미방출 | PASS |
| AC3 그리드 정합(헤더=바디) | 빌드 CSS(`.next/static/chunks/0wqb9c.7nl8mw.css`)에서 grid-template-columns 트랙 추출 | 값없음 `…4rem 96px`, 값있음 `…4rem 104px 96px` 두 트랙 방출. 헤더·바디 동일 리터럴(`rankGridClass`) 공유 | 두 트랙 모두 방출 확인: `1.5rem 1.25rem 1fr 128px 5.5rem 4rem 96px` / `… 4rem 104px 96px`. `RankHeaderRow`·`RankRow` 모두 `rankGridClass(valueColumn !== null)` 동일 호출 | PASS |
| AC4 반응형(md+ only) | 컴포넌트 grid 리터럴·셀 클래스 검토 | 모바일 5트랙(♥·순위·종목·현재가·등락률), 값·산업·시총 셀은 `hidden md:block` → 트랙 미점유. 한글 세로 깨짐 없음(명명 max-w 미사용) | 모바일 base 리터럴 `grid-cols-[1.5rem_1.25rem_1fr_5.5rem_4rem]`, 값 셀 `hidden text-right … md:block` — 산업·시총과 동일 패턴. `<md` 에서 값 컬럼 DOM 은 남되 트랙 밖(`hidden`). 폭 제한 명명 max-w 없음 → 한글 세로 깨짐 리스크 없음 | PASS |
| AC5 fail-soft | `formatWonCompact`/`formatShareVolume` 에 null/0/NaN 투입 | 미보유·0·NaN → `"-"`, 크래시 없음 | `formatWonCompact(null|0|NaN)="-"`, `formatShareVolume(null|undefined|0|-1|NaN)="-"` 실측. 거래대금 탭 셀은 `formatWonCompact(r.tradingValue)` — 없는 행도 `"-"` (throw 없음) | PASS |
| AC6 무회귀 | 컴포넌트 diff 검토(가산 변경) + 홈 SSR | 경고배지·위험숨기기·가용성·관심종목 토글·행클릭/peek 그대로 | 값 컬럼은 헤더/행에 조건부 셀 1개씩 가산만. `StockWarningBadges`·`RiskHideToggle`·`resolveAvailability`·`useWatchlistTickers`·`useStockPeek`·`go()` 라우팅 전부 원형 유지. 홈 SSR `HTTP 200` | PASS |
| AC7 게이트 | 아래 §2 명령 | tsc/eslint/build/vitest 0 에러 | 전부 통과(§2) | PASS |

---

## 2. 자동화 게이트 (명령·출력)

```
$ npx vitest run lib/utils/__tests__/formatShareVolume.test.ts lib/utils/__tests__/formatMarketCap.test.ts
 ✓ lib/utils/__tests__/formatShareVolume.test.ts (4 tests)
 ✓ lib/utils/__tests__/formatMarketCap.test.ts (5 tests)
 Test Files  2 passed (2)   Tests  9 passed (9)

$ npx tsc --noEmit
TSC_EXIT=0

$ npx eslint components/home/RealtimeRankingSection.tsx lib/utils/formatMarketCap.ts \
    lib/utils/formatShareVolume.ts lib/copy/home/marketOverview.ts \
    lib/utils/__tests__/formatShareVolume.test.ts
ESLINT_EXIT=0

$ npm run build
✓ 빌드 성공 (라우트 테이블 정상 출력, BUILD_EXIT 0)
```

### 공통 AC 무회귀
- BFF 원칙: `git grep -nE "http://127\.0\.0\.1" -- app/` → `app/api/workbench/_adapters/fastapi.ts` 2건 뿐(route handler FASTAPI_BASE_URL fallback, 허용). 클라 직접 호출 0건.
- 한글 톤: 신규 노출 문구 `RANK_COL_VOLUME="거래량"`, `RANK_COL_TURNOVER="거래대금"` — 한글. ticker/API 필드 외 영문 노출 없음.
- 접근성: 값 셀은 순수 표시 span(인터랙션 없음). 기존 `role="list"/listitem`·♥ `aria-pressed`·`aria-label`·탭 `role="tab"/aria-selected` 무변경. Tab 순서 무영향.

---

## 3. 에지 케이스

| 케이스 | 처리 | 실측 |
|---|---|---|
| tradingValue 없는 행이 거래대금 탭에 | `formatWonCompact(undefined)` → `"-"` | PASS (throw 없음) |
| 0 / 음수 / NaN 값 | 세 포맷터 공통 `value <= 0 \|\| !Number.isFinite` 가드 → `"-"` | PASS |
| 급상승/급하락 탭에 volume/tradingValue 부재 | `valueColumnForTab` `null` → 값 컬럼 미방출 | PASS (실 API 필드 부재 확인) |
| Tailwind JIT 미방출 함정 | 두 그리드 변형을 완전 리터럴 상수로 두고 `hasValue` 선택(런타임 `grid-cols-[${x}]` 조합 없음) | PASS (빌드 CSS 두 트랙 실방출) |
| 100조↑ 정수 반올림 | `formatWonCompact(173,400,000,000,000)` → `173조` (jo>=100 정수) | 동작 정상 (아래 참고 노트) |

**참고(비차단)**: `formatMarketCap.ts` JSDoc 예시가 `173_400_000_000_000 → "173.4조"` 로 적혀 있으나 실제는 `jo>=100 ? digits 0` 규칙으로 `173조` 렌더된다. 이는 **이번 PR 이전부터 존재한 주석-로직 드리프트**(로직/예시 모두 diff 무변경)이며 표시값 정확(조 단위 정수)에는 문제 없음. AC 범위 밖 — 후속 주석 정정 권고만.

---

## 4. 라운드트립 (dev + 실 KIS)

- `x-data-source: kis` / `x-kis-env: prod` — 주말이라 KIS 캐시 데이터가 실제로 응답됨(mock 아님, 실값 검증 가능).
- 거래량 탭: 상위 9행 volume 내림차순 → `7,420만주` … `2,610만주` 순 표기 일관.
- 거래대금 탭: 상위 8행 tradingValue 내림차순 → `18.1조` … `3,531억` 순 표기 일관.
- 급상승 탭: 값 컬럼/헤더 미방출(FluctuationRow 필드 부재로 구조상 보장).
- 홈 페이지 SSR `HTTP 200` — hydration 크래시 없음.
- 값은 `VolumeRankRow` 기존 필드에서 파생 → 신규 페치 0 확인(route 무변경, enrich 무변경).

## 5. DESIGN.md 토큰 라이브 동기화 검증

- 신규 토큰 `col-value: 104px` 가 `docs/design/finsight-redesign.md`(SSOT) → `tailwind.theme.json` → 빌드 CSS(`… 104px 96px`)까지 전달됨.
- `npm run design:sync` 재실행 → theme.json diff 0 (멱등, 토큰이 DESIGN.md 에서 정상 파생).
- 라이브 변경 검증: DESIGN.md `col-value: 104px → 137px` 임시 변경 → `npm run design:sync` → theme.json `"col-value": "137px"` 반영 확인 → `git checkout` 복원(104px 원복 확인). hex/px 직타 없음.

---

## 판정

- AC1~AC7 + 에지 + 라운드트립 + 토큰 동기화 **전부 PASS**. 실패 0건.
- `qa-passed` 라벨 부여. PR 본문 `## 다음 작업` 섹션 존재 확인(handoff append 게이트 충족).
