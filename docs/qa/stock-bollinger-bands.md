# QA — 종목 차트 볼린저밴드 오버레이 + 차트 옵션 드롭다운

- **대상 브랜치**: `feature/stock-bollinger-bands` (HEAD `9c0456e` — feat(stock): 메인 차트 볼린저밴드 오버레이 + 오버레이 옵션 드롭다운)
- **검증 방식**: PRD 없이 경량 반복 플로우로 구현. 승인 plan `luminous-inventing-sunset.md` 기준 요구사항 4개 + 파생 AC 11개.
- **검증 환경**: 로컬 dev(`next dev`, 포트 3000, 앱 비밀번호 게이트 열림) + 헤드리스 Chrome for Testing 148 (CDP). **실데이터**: 차트 도메인은 FastAPI가 아닌 **KIS 외부 API**를 route handler가 프록시 — `.env.local` `KIS_ENV=prod` 로 삼성전자(005930) 실 캔들 68봉(최근 종가 314,500) 수신. FastAPI(127.0.0.1:8000)는 다운 상태였으나 본 기능과 무관(chart route는 KIS 사용).
- **독립 재검증**: 부모 세션 스크린샷/DOM 검증을 신뢰하지 않고 모든 게이트·브라우저 플로우를 직접 재실행해 실측값 기록.
- **판정 요약**: **PASS** — 자동화 게이트 5/5 통과, 기능 AC 11/11 PASS, 에지/라운드트립 전부 PASS, 발견 이슈 0건(FAIL 없음).

---

## 1. 자동화 검증 게이트 (실측 명령·출력)

| # | 게이트 | 명령 | 실측 결과 | 판정 |
|---|---|---|---|---|
| G1 | 타입체크 | `npx tsc --noEmit` | `TSC_EXIT=0` (에러 0) | PASS |
| G2 | ESLint(변경/신규 9파일) | `npx eslint hooks/stock/useChartData.ts components/profile/StockDailyChart.tsx components/profile/chart/ChartShell.tsx components/profile/StockPageLayout.tsx components/profile/stockChartConfig.ts hooks/utils/useChartTheme.ts components/profile/chart/ChartOptionsDropdown.tsx hooks/stock/useChartOptions.ts lib/store/chart/chartOptions.ts` | `ESLINT_EXIT=0` (경고/에러 0) | PASS |
| G3 | 프로덕션 빌드 | `npm run build` | 성공(`BUILD_EXIT=0`). 라우트 테이블 정상 렌더(`ƒ /stock/[ticker]` 포함). Turbopack. | PASS |
| G4 | 단위테스트(calcBollinger) | `npx vitest run lib/signal/__tests__/indicators.test.ts` | `10 tests passed` (calcBollinger 2케이스 포함: 일정값→밴드폭0·%B null / 상승시리즈→%B>0.5) | PASS |
| G4' | 전체 테스트 스위트 | `npx vitest run --exclude '**/__live__/**'` | `Test Files 77 passed`, `Tests 633 passed` (무회귀) | PASS |
| G5 | DESIGN.md 토큰 라이브 동기화 | `npm run design:sync` 재실행 → `git status`·md5 비교 | design:sync **멱등**: 재생성 전후 `tailwind.theme.json`·`app/theme-vars.css` md5 동일, `git status` clean. `colors-dark 50키 파싱·1:1 검증 통과` 로그. | PASS |

### G5 상세 — chart-bb 토큰 정합
```
app/theme-vars.css:42:  --fs-chart-bb: #0d9488;   (light, :root)
app/theme-vars.css:95:  --fs-chart-bb: #2dd4bf;   (dark, html.dark)
tailwind.theme.json:43: "chart-bb": "#0d9488"      (light — colors 블록)
docs/design/finsight-redesign.md:44 chart-bb: "#0d9488"  (light SSOT)
docs/design/finsight-redesign.md:95 chart-bb: "#2dd4bf"  (dark SSOT)
```
- 다크 토큰(`#2dd4bf`)은 `tailwind.theme.json` colors 블록에 없는 것이 **정상** — 다크 팔레트는 `scripts/inject-color-themes.mjs` 가 `app/theme-vars.css` `html.dark` 로 주입하는 아키텍처(useChartTheme 는 런타임 `getComputedStyle` 로 `--fs-chart-bb` 를 읽어 light/dark 자동 소비). SSOT 규율 위반 없음.

### BFF/컨벤션 무회귀
- **BFF 원칙**: `git grep -nE "http://127\.0\.0\.1" -- 'app/'` → `app/api/workbench/_adapters/fastapi.ts` 2건뿐(route handler fallback, 허용). 클라이언트 `fetch(` 직접 호출 0건(변경 디렉터리 `components/profile`·`hooks/stock`·`lib/store/chart`).
- **hex/px 직타**: BB 렌더/테마 코드에 raw hex 컬러 리터럴 0건(모두 `C.bb` 토큰 경유; `useChartTheme.ts:63` 의 `#1d2630` 는 주석). 드롭다운의 `py-[3px]`·`z-[40]`·`min-w-[144px]` 는 Tailwind arbitrary 유틸리티(형제 컴포넌트 `ChartRangeDropdown` 동일 패턴).
- **한글 톤**: 사용자 노출 문구 전부 한글(`옵션`·`매물대`·`볼린저밴드`·`차트 옵션` aria-label). 영문 유출 0건.
- **콘솔**: 렌더+차트타입 토글 스트레스 중 error/warning/exception **0건**(React hydration mismatch 경고 없음 → SSR-safe swap 확인).

---

## 2. 기능 AC 표 (재현·기대·실측·판정)

측정 도구: CDP `Runtime.evaluate` 로 SVG DOM 계측. teal 판정 = `stroke`/`fill` 이 `#0d9488`(light) 또는 `#2dd4bf`(dark). 기대 teal path 구성 = **음영 밴드 1(Area fill) + 상단선 1 + 하단선 1 + 중심선 1(dash "4 3") = stroke 3 + fill 1 = 총 4**.

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC1 볼린저 밴드+상/하/중심선 (캔들) | localStorage `{volumeProfile:true,bollinger:true}` 주입 → `/stock/005930` 캔들(기본) 렌더 | teal 4 path(stroke3+fill1), 중심선 dash 1 | `tealTotal:4, tealStroke:3, tealFill:1, dashed:1, area fillOpacity:0.1`, `bbCssVar:#0d9488` | PASS |
| AC2 동일 (라인 차트) | "라인" 버튼 클릭 후 재계측 | teal 4 path, dash 1, 밴드 유지 | `tealTotal:4, tealStroke:3, tealFill:1, dashed:1`, fillOpacity 0.1 (라인은 가격 Area 포함 `recharts-area-area:2`) | PASS |
| AC3 중심선 점선·상하단 실선·음영 fillOpacity | DOM stroke-dasharray·fill-opacity 검사 | 중심선만 dash "4 3", 상하단 dash 없음, 음영 0.1 | `dashedTealCount:1`(중심선), 나머지 2 stroke 실선, `areaFillOpacity:"0.1"` | PASS |
| AC4 매물대+볼린저 동시 색 구분 | 둘 다 on 상태 스크린샷 육안 + DOM | teal 밴드 vs 회색/보라 매물대 판독 | 스크린샷: teal 밴드 envelope + 회색 매물대 히스토그램 + 보라 POC(≈22만) 명확히 구분. 둘 다 판독 가능 | PASS |
| AC5 옵션 드롭다운 상호작용 | 트리거 클릭→항목 토글→외부/재클릭 (각 tick 분리 계측) | 열림 aria-expanded=true, role=menu, 항목 role=menuitemcheckbox, 토글 시 안 닫힘·aria-checked flip, 외부/재클릭 닫힘 | open: `expanded:true, menuPresent:true, aria-label:"차트 옵션", itemCount:2, roles:[menuitemcheckbox×2]`. BB 토글: `menuStillOpen:true, checked flip`. VP 토글: `menuStillOpen:true`(다중선택). 외부클릭: `menuPresent:false, expanded:false`. 재클릭: 열림→닫힘 | PASS |
| AC6 localStorage 지속·기본 off | (a)키 삭제 후 로드 (b)토글 후 새로고침 | (a)기본 teal 0·lsRaw null (b)새로고침 후 상태 유지 | (a)`defaultOff: tealTotal:0, lsRaw:null`. (b)토글 후 `lsRaw:{"volumeProfile":true,"bollinger":true}` → 새로고침 `persistAfterReload: lsRaw 동일, tealTotal:4, dashed:1` | PASS |
| AC7 다크/라이트 토큰 teal | prefers-color-scheme light/dark 각각 로드 | light #0d9488 / dark #2dd4bf | light: `bbCssVar:#0d9488, tealStrokeColors:["#0d9488"]`. dark: `htmlClass:"...dark", bbCssVar:#2dd4bf, tealStrokeColors:["#2dd4bf"]` | PASS |
| AC8 짧은 범위/데이터 부족 | (a)일봉 "1개월"(40일) 선택 (b)무효 티커 000000 | (a)워밍업으로 첫 봉부터 밴드 (b)미표시·에러 없음 | (a)1개월: `tealStroke:3, dashed:1`, 상단밴드 path 시작 x=8.537(좌 플롯 엣지)·길이 1148(전폭) → **첫 봉부터 밴드**. (b)000000: `tealTotal:0, bars:0, noDataText:true("차트 데이터가 없어요"), hasError:false` | PASS |
| AC9 API 실패/로딩 크래시 없음 | 무효 티커 로드 + 콘솔 캡처 | 에러/로딩 UI 정상, 볼린저 크래시 없음 | 무효 티커 = "차트 데이터가 없어요" 정상 표시, `role=alert` 없음(에러 아님·빈 상태), 콘솔 error/exception 0건 | PASS |
| AC10 반응형 모바일 툴바 | 375×812 뷰포트 로드 | 툴바 줄바꿈 없이 옵션 드롭다운 동작 | 스크린샷: `캔들 라인 \| 일봉 주봉 월봉 \| 옵션·2 ▾` 1행 정렬, 범위는 `3개월 ▾` 드롭다운(모바일). 옵션 버튼 `right:305.78 < vw:375, inViewport:true`. teal 4 path 정상 | PASS |
| AC11 접근성 | 드롭다운 aria/role·아이콘 aria-hidden | 트리거 aria-haspopup=menu·aria-expanded, 항목 aria-checked, 아이콘 aria-hidden | `aria-haspopup:"menu", aria-expanded` 동적, `role="menu"`+`aria-label`, `role="menuitemcheckbox"`+`aria-checked` 동적, 아이콘 3개(SlidersHorizontal/ChevronDown/Check) 모두 `aria-hidden="true"` | PASS |

---

## 3. 라운드트립 (BE LIVE — 실 KIS 데이터)

차트 도메인은 KIS 외부 API 프록시 → 라운드트립은 실 시세로 재현. FastAPI 다운은 본 기능 무관.

| # | 시나리오 | 절차 | 실측 | 판정 |
|---|---|---|---|---|
| RT1 | 볼린저 on→off→on | 드롭다운에서 볼린저 토글 반복 (일봉 3개월) | before: `tealTotal:4` → off: `tealTotal:0`(candleBars 54 유지) → on: `tealTotal:4` | PASS |
| RT2 | 매물대와 조합 | 둘 다 on 유지 | teal 밴드 + 회색/보라 매물대 동시 렌더, 색 충돌 없음(AC4) | PASS |
| RT3 | 차트타입 전환 중 상태 유지 | 캔들↔라인 전환하며 옵션 상태 확인 | 라인 전환 후에도 `lsRaw` 유지·teal 4 path 렌더(AC1/AC2) | PASS |
| RT4 | 봉/범위 전환 유지 | 일봉 1개월→월봉 전체→일봉 3개월 | 1개월(warmup 첫봉 밴드), 월봉 전체(`monthlyAll: teal4, 30 bars`), 3개월 모두 밴드 렌더·에러 없음 | PASS |
| RT5 | 새로고침(리마운트) 후 옵션 보존 | 토글 후 페이지 reload | `persistAfterReload`: localStorage 값·teal 4 path·중심선 모두 보존 | PASS |

> 참고: 데스크탑 확대/축소 리마운트 시 상태 보존은 코드 레벨로 확인 — 옵션 상태를 부모 `StockPageLayout`(`useChartOptions`)가 소유 + localStorage write-through 이므로 `StockDailyChart` 리마운트에도 값 유지(기존 period/days/chartType 보존 메커니즘과 동일). RT5(새로고침)로 지속성 실증 완료.

---

## 4. 에지 케이스

| 케이스 | 절차 | 실측 | 판정 |
|---|---|---|---|
| 데이터 부족 종목 | 무효 티커 000000 로드 | "차트 데이터가 없어요" 빈 상태, 크래시/alert 없음, teal 0 | PASS |
| 짧은 범위(1개월/40일) 워밍업 | 렌더에서 `showBB = showBollinger && candleSeries.some(c=>c.bbMid!=null)` 게이트 | 워밍업 fetch(days+60) 덕에 20봉 룩백 충족 → 첫 표시봉부터 `bbMid≠null` → 밴드 좌 엣지부터 렌더 | PASS |
| BE(FastAPI) 다운 | `curl 127.0.0.1:8000/health` = HTTP 000 | 차트는 KIS 경유라 정상 렌더(FastAPI 무관). KIS 미설정 시엔 mock 40봉 폴백(≥20봉→밴드 가능) | PASS |
| StrictMode 더블 마운트/hydration | 콘솔 캡처 | React hydration mismatch·중복 마운트 경고 0건. `useChartOptions`/`useChartTheme` 첫 렌더 DEFAULT(off)→마운트 후 swap 패턴 | PASS |
| localStorage malformed | `chartOptions.ts` `normalize()` + try/catch | 파싱 실패/비객체/타입 불일치 시 `DEFAULT_CHART_OPTIONS`(전부 false) 폴백(단위 로직 검토). quota 실패 시 write no-op(메모리 state 유지) | PASS |
| calcBollinger 경계 | vitest | 일정값 시리즈 → 밴드폭0·%B null(0 나눗셈 회피), 데이터<20봉 → 전부 null | PASS |
| 매물대 단독(볼린저 off) | RT1 off 스냅 | `tealTotal:0` 이면서 candleBars 유지 → 매물대만 남고 밴드 미렌더, 무회귀 | PASS |

---

## 5. 스크린샷 (증적)

CDP 캡처(로컬 스크래치패드에 보관):
- `qa-desktop-light-candle.png` — 라이트 캔들: teal 음영 밴드+상/하단 실선+SMA20 점선, 회색/보라 매물대 공존, "옵션·2" 배지.
- `qa-desktop-dark-candle.png` — 다크 캔들: 밝은 teal(#2dd4bf) 밴드 시인성 양호.
- `qa-desktop-light-line.png` — 라인 차트: 가격 라인 뒤 teal 밴드+점선 중심선.
- `qa-mobile-light-candle.png` — 375 모바일: 툴바 1행(줄바꿈 없음)+범위 드롭다운, 밴드 정상.
- `qa-1month.png` / `qa-1month-explicit.png` — 1개월 범위: 좌 엣지부터 밴드(워밍업 실증).

---

## 6. 종합 판정

### PASS

- 자동화 게이트 **5/5** 통과 (tsc 0 · eslint 0 · build 0 · vitest 633/633 · design:sync 멱등).
- 기능 AC **11/11 PASS**, 라운드트립 5/5, 에지 7/7.
- BFF·한글 톤·토큰 SSOT·접근성 무회귀. 콘솔 에러 0.
- **발견 이슈: 0건** (FAIL 없음).

### 검증 중 관찰(비이슈)
- CDP 최초 실행에서 드롭다운 상호작용이 "닫힘 미동작"처럼 보였으나, 이는 `btn.click()` 과 DOM 조회를 **동일 eval tick**에서 수행해 React 리렌더 flush 전에 조회된 하니스 아티팩트였음. 클릭/조회를 별도 tick으로 분리해 재검증한 결과 열림·다중토글 유지·외부클릭 닫힘·재클릭 닫힘 전부 정상(§2 AC5). 제품 버그 아님.

### 후속(참고, 본 PR 범위 밖)
- 매물대 리디자인은 이번 범위 제외(plan 명시). 색 구분으로 공존만 보장 — 요구 충족.

---

_QA 재검증 완료: 2026-07-02. 검증자 독립 실행(부모 세션 산출물 미신뢰, 전 게이트·브라우저 플로우 직접 재실행)._
