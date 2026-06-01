# QA 리포트 — stock-chart-split (PR #85, Wave 3a)

- 브랜치: `feature/stock-chart-split`
- 대상 커밋: `bf54064 refactor(chart): StockDailyChart 책임별 구조 분리 (Wave 3a)`
- 비교 기준: `HEAD~1` (= main 직전 `01848e3`)
- PRD: 없음 (리팩터). **변경 의도에서 AC 직접 도출.**
- 핵심 합격 기준: **behavior-preserving — 동작·시각 무변경**. `const C` 색상·px 직타 미변경은 의도된 것(W2/W5 = Wave 3b 후속).
- 판정: **qa-passed** (실패 0건). 단, 픽셀 단위 시각 회귀는 사람 눈 확인이 필요함을 한계로 명기.

## 검증 방법론

자동 시각 테스트가 불가하므로 **git 정적 대조(원본 verbatim 동일성)** 를 1차 근거로,
빌드/타입/린트/테스트 + dev 서버 SSR 렌더 스모크를 보강 근거로 삼는다.
BE(`127.0.0.1:8000`)는 DOWN(`curl …/health` → `000`)이라 실데이터 라운드트립은 불가 →
**정적 대조 + SSR 렌더 스모크(200)** 로 판정. (라운드트립 시나리오는 본 PR 무관 — 데이터 흐름 무변경.)

---

## AC 별 검증 표

| # | AC (의도에서 도출) | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | 차트 본문 4개 subplot JSX 무변경 | 원본 333–433 vs 신규 122–222 `diff` | diff 0 (byte-identical) | **`SUBPLOT JSX IDENTICAL`** | ✅ |
| AC-2 | ChartShell 컨트롤(버튼·`py-[3px]`·className) 무변경 | 원본 463–549 vs `ChartShell.tsx` 50–136 `diff` | diff 0 | **`CHARTSHELL JSX IDENTICAL`** | ✅ |
| AC-3 | CandleBar 좌표 수학(scale/bodyTop/bodyH/wickX/barW) 무변경 | 원본 137–158 vs `CandleBar.tsx` 18–39 `diff` | diff 0 | **`IDENTICAL`** | ✅ |
| AC-4 | CandleTooltip 로직(OHLC·등락 색) 무변경 | 원본 170–198 vs `CandleTooltip.tsx` 17–45 `diff` | diff 0 | **`IDENTICAL`** | ✅ |
| AC-5 | useChartData transform(sort·cutoff·slice·등락률) 원본 useMemo와 동일 | 원본 232–297 vs `useChartData.ts` 60–142 정규화 `diff` | 로직 동일(형식·타입주석만 차이) | 잔여 diff = 줄바꿈 + 타입주석(`as PriceDatum[]`)뿐. sort/closes/calcMACD/calcRSI/cutoff/findIndex/slice·`useMemo` deps `[data, days]` 동일 | ✅ |
| AC-6 | chartTheme `C`(16색)·tooltipStyle·labelStyle·axisProps·SYNC_ID 값 동일 | `chartTheme.ts` vs 원본 57·68–85·203–218 | 값 동일 | 16색 hex·rgba·blur·fontSize·SYNC_ID="stock-chart" 전부 일치 | ✅ |
| AC-7 | 포맷터 6종(fmtYAxis/fmtVolAxis/fmtTooltip{Price,Vol,MACD,RSI}) 로직 동일 | `chartFormat.ts` vs 원본 103–126 | 로직 동일 | 분기·toFixed 자릿수·라벨 문자열 전부 일치 | ✅ |
| AC-8 | StockDailyChart import 무결성·순환참조 없음·미사용 import 0 | `git grep` 소비처 + 역참조 탐색 | 소비처=StockDailyChart 1곳, 역import 0, 미사용 0 | 조각 import는 StockDailyChart에서만. 조각이 StockDailyChart 역import 0(=cycle 없음). 제거 대상 import(useMemo·useBreakpoint·lucide·calcMACD·formatMoney·ChartRangeDropdown) `NONE remaining`. chartTheme 5심볼 전부 사용(C×19·SYNC_ID×6·tooltipStyle×5·labelStyle×5·axisProps×11) | ✅ |
| AC-9 | `tsc --noEmit` exit 0 | `npm run typecheck` | exit 0 | **`EXIT=0`** | ✅ |
| AC-10 | eslint 변경/신규 8파일 clean | `npx eslint <8파일>` | exit 0, 0 error | **`LINT_EXIT=0`** | ✅ |
| AC-11 | `npm run build` exit 0 | `npm run build` | exit 0 | **`✓ Compiled successfully in 2.2s` / `28/28` static / EXIT=0** | ✅ |
| AC-12 | `vitest run` 그린 | `npm run test` | 전부 pass | **`Test Files 30 passed (30)` / `Tests 189 passed (189)`** | ✅ |
| AC-13 | `/stock/[ticker]` SSR 렌더 200(차트 청크 컴파일·런타임 오류 0) | dev 서버 + `curl /stock/005930` | 200, 오류 0 | **`status=200`** (`/stock`도 200). dev 로그 `Module not found`/`Failed to compile` `NONE` | ✅ |

### AC-5 보충 — transform 정규화 diff 잔여물(전부 무해)

원본의 한 줄짜리 객체 리터럴이 추출본에서 여러 줄로 풀리고, 빈 배열 반환에 `as PriceDatum[]`
타입 단언이 붙은 것이 전부다. 연산(정렬 비교자 `localeCompare`, 컷오프 `setDate(-days)`,
`padStart`, `findIndex(c.date >= cutoffStr)`, `slice(visibleStart)`, 등락률
`((c.close-prevClose)/prevClose)*100`)은 원본과 1:1 동일. `useMemo` 의존성도 `[data, days]` 동일.

---

## 공통 AC 무회귀

| 항목 | 명령/근거 | 결과 |
|---|---|---|
| typecheck/lint/build 0 에러 | 위 AC-9~11 | ✅ |
| BFF 무회귀(`http://127.0.0.1` 직타) | 변경 8파일 `grep -E "http://127\.0\.0\.1"` | `NONE` ✅ |
| 클라 직접 `fetch(` 0건 | 변경 파일 `grep -E "\bfetch\("` | 코드상 0(주석 1건만) ✅ |
| 한글 톤 무회귀 | 사용자 노출 문구(거래량/MACD/RSI/등락/데이터 부족/차트 데이터가 없어요) | 원본과 문자열 동일, 신규 영문 카피 0 ✅ |
| 접근성 무회귀 | ChartShell `aria-label`(차트 확대/축소·차트 제목)·`role="alert"`·`aria-busy`·`aria-hidden` | 원본과 동일하게 ChartShell/StockDailyChart로 이동, 속성 무변경 ✅ |

---

## 에지 케이스

| 케이스 | 분석 | 결과 |
|---|---|---|
| 데이터 빈 응답(`data.length===0`) | useChartData가 5개 빈 시리즈 반환(원본 동일) → `priceSeries.length===0` 분기 "차트 데이터가 없어요" | ✅ 무변경 |
| isError(BE/네트워크 오류) | `error?.message ?? STOCK_DETAIL_NOT_FOUND` `role="alert"` (원본 동일) | ✅ |
| isLoading | `h-[480px]` `aria-busy` 로딩 문구(원본 동일) | ✅ |
| MACD 데이터 부족(`macd === null`) | `macdSeries.some(macd!==null)` false → `MACD — 데이터 부족 (최소 26${periodUnit})` (원본 동일) | ✅ |
| RSI 데이터 부족 | 동일 패턴, `최소 15${periodUnit}` (원본 동일) | ✅ |
| CandleBar 비정상 입력(`width<=0`·`height<=0`·`high<low`·payload 없음) | early `return null` 가드 3종 verbatim 이동 | ✅ |
| 등락률 NaN 회피(`prevClose===0`) | `prevClose !== 0 ? … : null` 가드 유지 | ✅ |
| 포맷터 NaN 입력 | `Number.isFinite(n) ? … : "0"/"-"` 폴백 verbatim | ✅ |
| StrictMode 더블 마운트 | 순수 컴포넌트 분리만, 부수효과 추가 0 → 영향 없음 | ✅ |
| 순환 import | 조각→StockDailyChart 역참조 0(정적 확인) | ✅ |

---

## 라운드트립 / 시각 스모크

- **BE DOWN** (`curl 127.0.0.1:8000/health` → `000`) → 실데이터 차트 라운드트립 불가.
  본 PR은 데이터 흐름·BFF 라우트 무변경(순수 FE 구조 분리)이라 라운드트립 비대상.
- **SSR 렌더 스모크(BE 무관)**: 자체 `next dev`(:3737) 기동 → `/stock/005930` **200**, `/stock` **200**,
  dev 로그 컴파일 오류 `NONE`. 검증 후 dev 서버 종료(잔류 프로세스 0 확인).
- 라인↔캔들 토글·기간/봉 변경·확대축소·모바일/데스크탑 차트의 **픽셀 단위 시각 동일성**은
  실데이터 없이 자동 확인 불가. **단, 차트 본문 subplot JSX·ChartShell 컨트롤·CandleBar 수학이
  원본과 byte-identical 임을 정적으로 증명**했으므로 동일 데이터 입력 시 렌더 결과는 동일하다(behavior-preserving).

### 한계 (리포트 명기)

- **픽셀 단위 시각 회귀는 사람 눈 확인 필요**. 본 QA는 "정적 대조(verbatim 동일) + SSR 렌더 스모크"로
  behavior-preserving 을 강하게 보증하나, 실 브라우저 BE-LIVE 환경의 캔들 wick/툴팁/호버싱크 픽셀 검증은
  머지 전 작성자/리뷰어의 육안 1회 권장.

---

## 판정

- AC-1~13 + 공통 AC + 에지 케이스 전부 통과. **실패 0건.**
- 핵심 기준(behavior-preserving): 차트 본문 JSX·ChartShell·CandleBar·CandleTooltip = byte-identical,
  useChartData transform = 로직 동일(형식·타입주석 차이뿐), chartTheme/포맷터 값 동일. **무변경 보장 충족.**
- PR 본문에 `## 다음 작업`(Wave 3b) 존재 → handoff 게이트 충족.
- **결론: qa-passed.** (라벨 변경은 본 QA 범위 밖 — 판정만 반환.)
