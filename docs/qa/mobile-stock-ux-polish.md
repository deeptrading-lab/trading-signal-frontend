# QA 리포트 — mobile-stock-ux-polish (PR #63)

- **브랜치**: `feature/mobile-stock-ux-polish`
- **PR**: #63 — `feat(stock-ux): 모바일 종목분석 UX 개선 — 스크롤바·네비·접기카드`
- **PRD**: 없음 (사용자 반복 피드백 누적 "모바일/차트 UX 개선" 묶음). AC 는 작업 의뢰서 기준.
- **검증 방식**: (1) 자동 게이트 명령 직접 실행, (2) 변경 컴포넌트 코드 정독으로 로직·반응형 분기·상태흐름 추적, (3) dev 서버 기동 후 라우트 응답/HTML + 프로덕션 CSS 번들 스모크. 브라우저 자동화 도구 없음 → 시각 동작은 코드+컴파일 산출물 근거로 대체.
- **판정 요약**: AC-1 ~ AC-15 **전 항목 PASS**, 추가 점검 4종 PASS. 실패 0건.

---

## 0. 공통 자동 게이트

| 항목 | 명령 | 실측 | 판정 |
|---|---|---|---|
| typecheck | `npm run typecheck` (`tsc --noEmit`) | 출력 없음 (0 에러) | PASS |
| lint | `npm run lint` (`eslint .`) | 출력 없음 (0 경고/0 에러). PR 본문이 언급한 StockDailyChart 경고는 본 실행에서 미재현 — 현 트리 lint 클린 | PASS |
| build | `npm run build` | `✓ Generating static pages (29/29)`. 라우트 트리 정상. `/stock` 이 `○ (Static)` 로 표기 → redirect 제거(AC-2) 부수 확인 | PASS |
| BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` | route handler 어댑터(`app/api/workbench/_adapters/fastapi.ts`, env fallback) 2건만 — 클라/컴포넌트 0건 | PASS |
| 클라 직접 fetch | `git grep -n "fetch(" -- components/profile components/layout components/home/StockSearchContainer.tsx components/ui hooks/layout` | 0건 (모두 axios/BFF 훅 경유) | PASS |
| `window.innerWidth` 직접 검사 | 변경 파일 grep | 0건 (BottomNav 의 1건은 "금지" 주석) | PASS |
| 한글 톤 | navCopy/신규 카피 grep | 사용자 노출 문구 모두 한글·정중("~요/~에요") 톤. 비한글은 ticker/`KRW`/API 필드뿐 | PASS |
| hex 직타 (변경 TSX) | 변경 TSX grep (StockDailyChart `C` 상수 제외) | 0건. `C` recharts 색 상수(16종)는 **기존 기술부채**(별도 후속 W2), 본 PR 신규 아님 | PASS(범위 외 명시) |
| px 직타 | 변경 TSX grep | `py-[3px]`·`py-[2px]`·`mb-[2px]`·`min-w-[88px]`·`h-[480px]`·`z-[40]` 등 발견되나 **모두 main 베이스라인에 이미 존재**(`git show main:…StockDailyChart.tsx` 에 `py-[3px]` 3건 확인). 본 PR 신규 회귀 아님 | PASS(무회귀) |

---

## 1. AC 별 검증표

### AC-1 — 모바일 스크롤바 숨김

| 구분 | 내용 |
|---|---|
| 재현 | 모바일(<768px)에서 `.main-area` 세로 스크롤 / 검색 드롭다운 내부 스크롤. 데스크탑은 정상 노출 기대. |
| 기대 | `.scrollbar-hide-mobile` 유틸이 `@media (max-width:767px)` 에서만 스크롤바 숨김. 데스크탑 무회귀. |
| 실측 | (코드) `app/components.css` L606–616 `@layer utilities` 안 `@media (max-width:767px){ .scrollbar-hide-mobile{ scrollbar-width:none; -ms-overflow-style:none } .scrollbar-hide-mobile::-webkit-scrollbar{ display:none } }`. 적용 위치: `app/(main)/layout.tsx` L51 `<main … main-area scrollbar-hide-mobile>`, `StockSearchContainer.tsx` L149·L200 (검색 결과 + 탭 패널 두 스크롤 영역). (컴파일) 프로덕션 CSS 번들에 `@media (max-width:767px){.scrollbar-hide-mobile{scrollbar-width:none;-ms-overflow-style:none}.scrollbar-hide-mobile::-webkit-scrollbar{display:none}}` 그대로 출현. (HTML) dev `/` 응답의 `<main>` className 에 `main-area scrollbar-hide-mobile` 동시 적용 확인. 768px 이상에는 룰 없음 → 데스크탑 무회귀. |
| 판정 | **PASS** |

### AC-2 — 네비 정합성 + 종목분석 버그 + `/stock` 랜딩

| 구분 | 내용 |
|---|---|
| 재현 | Sidebar/BottomNav "종목 분석" 클릭. (a) 최근검색 있음 (b) 없음. `/stock` 직접 진입. |
| 기대 | 공유 훅 `useStockNavClick` 사용(중복 제거). 최근 있으면 `/stock/<ticker>?q=<종목명>`, 없으면 `/stock`. 어느 경우도 홈(`/`) 미이동. `/stock` 은 redirect 제거 후 `StockSearchLanding` 렌더. |
| 실측 | (코드) `hooks/layout/useStockNavClick.ts` — `active` 시 no-op, `readRecentSearches().length>0` 이면 `router.push(/stock/${ticker}?q=${encodeURIComponent(name)})`, else `router.push('/stock')`. 홈 분기 없음. Sidebar L58 / BottomNav L51 모두 `item.path==='/stock'` 일 때만 이 핸들러 바인딩 — byte-for-byte 복제 제거 확인. `app/(main)/stock/page.tsx` 는 `redirect` import 없이 `<StockSearchLanding/>` 렌더. `app/(main)/stock/[ticker]/page.tsx` 가 `searchParams.q` → `StockProfilePage initialKeyword` → `StockSearchContainer initialKeyword`(L38) → 검색창 프리필. `StockSearchContainer` L42–43 `initialKeyword=""` 기본, `useState(initialKeyword)`, `open` 기본 false → 드롭다운은 닫힌 채 종목명만 채움. (빌드) `/stock` 이 `○ (Static)` 으로 표기 → redirect 라우트 아님. (HTML) dev `/stock` 응답에 LANDING_HINT("종목명·코드로 검색하면 차트·기업개황·최근 공시를 한눈에 볼 수 있어요.") + "종목 분석" 헤더 + placeholder("종목명·코드로 검색… (예: 삼성전자, 005930)") 모두 SSR 렌더 확인(홈 리다이렉트 흔적 없음). |
| 판정 | **PASS** |

### AC-3 — AI분석 말풍선

| 구분 | 내용 |
|---|---|
| 재현 | 데스크탑 호버 / 모바일 탭 → 말풍선. ~2.5s 자동 닫힘 + 외부클릭 닫힘. Sidebar/BottomNav 카피 통일. |
| 기대 | "AI 분석 기능은 준비 중이에요" 노출, 자동/외부클릭 닫힘. 카피 `NAV_MENU_COMING_SOON_BADGE`/`_TOOLTIP` 공용. |
| 실측 | (코드) `components/layout/ComingSoonNavItem.tsx` — `onMouseEnter`→show=true(데스크탑 호버), `onMouseLeave`→false. `handleClick`(탭) → show=true + `setTimeout(…AUTO_DISMISS_MS=2500)` 후 false. `useEffect` 가 `mousedown` 외부클릭 리스너 등록 + cleanup 에서 `removeEventListener` + `clearTimeout`(StrictMode 안전). 말풍선 문구 = `NAV_MENU_COMING_SOON_TOOLTIP="AI 분석 기능은 준비 중이에요"`, 배지 = `NAV_MENU_COMING_SOON_BADGE="준비 중"` (둘 다 `lib/copy/layout/navCopy.ts`). Sidebar(`variant="sidebar"`)·BottomNav(`variant="bottom"`) 모두 같은 컴포넌트 호출 → 카피·마크업 단일 소스(이전 BottomNav 하드코딩 해소). `aria-disabled="true"`, `role="menuitem"`, `aria-label="AI 분석 (준비 중)"`, 말풍선 `role="tooltip"`. (컴파일) CSS 번들에 `.nav-tooltip{…color:#fff;background-color:#0f1419;…position:absolute}` + `.nav-tooltip:after{content:"";…rotate:45deg}`(아래 꼬리▼) 출현. |
| 판정 | **PASS** |

### AC-4 — 모바일 종목 순서

| 구분 | 내용 |
|---|---|
| 재현 | 모바일 `/stock/<ticker>` 진입 시 위→아래 순서 확인. |
| 기대 | 제목 → 검색 → 종목명·현재가(StockHeader) → 차트 → 기업개황 → 최근공시. |
| 실측 | (코드) `StockProfilePage.tsx` L33–41: `<header>제목` → `<StockSearchContainer>` → `<StockPageLayout>`. `StockPageLayout.tsx` L57–66 `if(isMobile)` 분기: `<StockHeader>` → `<StockDailyChart>` → `<CompanyOverview collapsible>` → `<DisclosureList collapsible>`. 합산 순서 = 제목→검색→헤더→차트→기업개황→최근공시. AC 정합. |
| 판정 | **PASS** |

### AC-5 — 모바일 차트/접기카드

| 구분 | 내용 |
|---|---|
| 재현 | 모바일 차트 확대 버튼 유무 / 기업개황·최근공시 기본 접힘·chevron 회전. 데스크탑은 항상 펼침 + 확대/축소. |
| 기대 | 모바일 차트 `onExpand` 미전달 → 확대 버튼 미렌더. CollapsibleCard 기본 접힘 + chevron 180°. 데스크탑 무회귀. |
| 실측 | (코드) `StockPageLayout` 모바일 분기는 `<StockDailyChart … {...chartControls}/>` 만 전달 — `onExpand`/`onCollapse` 없음. `StockDailyChart`→`ChartShell` L432 `hasToggle = onExpand||onCollapse` → 모바일 false → L440 버튼 미렌더. 데스크탑 기본 분기는 `onExpand={()=>transition(true)}`, 확대 분기는 `onCollapse` 전달 → 버튼 유지. `CollapsibleCard.tsx` `defaultOpen=false`(기본 접힘), 헤더 버튼 `aria-expanded={open}`, chevron `cn("…transition-transform duration-300", open && "rotate-180")`, `{open && children}`. `CompanyOverview`/`DisclosureList` 는 `collapsible` prop true 일 때만 `CollapsibleCard` 래핑, 미지정(데스크탑) 시 기존 `.card` 항상 펼침. (컴파일) `.rotate-180{rotate:180deg}` 번들 출현. |
| 판정 | **PASS** |

### AC-6 — 하단 여백

| 구분 | 내용 |
|---|---|
| 재현 | 모바일 `main` 하단 padding = navbar-h + safe-area-bottom + spacing.lg(14px). |
| 기대 | 마지막 카드와 BottomNav 사이 14px 여백. md+ 에선 BottomNav 미렌더 → pb 0. |
| 실측 | (코드) `layout.tsx` L51 `pb-[calc(theme(spacing.navbar-h)+env(safe-area-inset-bottom)+theme(spacing.lg))] md:pb-0`. (토큰) `tailwind.theme.json` spacing 블록 `"navbar-h":"60px"`, `"lg":"14px"` → calc = 60px + safe-area + 14px. md+ 에서 `md:pb-0` 로 BottomNav 미렌더 대응. (HTML) dev `/` 응답 `<main>` className 에 해당 calc 클래스 + `md:pb-0` 그대로 적용 확인. |
| 판정 | **PASS** |

### AC-7 — 캔들 디폴트

| 구분 | 내용 |
|---|---|
| 기대 | `DEFAULT_CHART_TYPE="candle"`, `CHART_TYPES` 순서 [캔들, 라인]. |
| 실측 | (코드) `stockChartConfig.ts` L50 `DEFAULT_CHART_TYPE: ChartType = "candle"`. L15–18 `CHART_TYPES = [{label:"캔들",type:"candle"},{label:"라인",type:"line"}]`. `StockPageLayout` L28 `useState<ChartType>(DEFAULT_CHART_TYPE)` → 초기 캔들. |
| 판정 | **PASS** |

### AC-8 — 확대/축소 상태유지

| 구분 | 내용 |
|---|---|
| 재현 | 데스크탑 차트 확대↔축소 토글 시 라인/캔들·일·주·월봉·기간 선택값 유지. |
| 기대 | 컨트롤 상태를 `StockPageLayout`(부모)이 소유(controlled) → 리마운트해도 리셋 없음. |
| 실측 | (코드) `StockPageLayout` L26–28 `period/days/chartType` state 부모 소유 + `chartControls` 객체로 양 분기(확대/축소)에 동일 전달. `StockDailyChart`/`ChartShell` 은 controlled — 내부 차트 컨트롤 state 0. 토글은 `transition()`이 `chartExpanded` 만 바꾸고 컨트롤 state 미변경 → 차트가 그리드 안↔밖으로 리마운트돼도 부모 state 보존. 봉 변경 시 `handlePeriodChange` 가 `setDays(defaultDaysForPeriod(p))` 로 해당 봉 첫 범위 동기화(의도된 동작). |
| 판정 | **PASS** |

### AC-9 — 메인 날짜축

| 구분 | 내용 |
|---|---|
| 기대 | 가격(캔들/라인) 하단 날짜축 표시(`interval="preserveStartEnd"`, `minTickGap={40}`). RSI 날짜축 제거(hide). 거래량·MACD hide 유지. |
| 실측 | (코드) `StockDailyChart` 캔들 XAxis L312 `interval="preserveStartEnd" minTickGap={40}`(hide 없음), 라인 XAxis L326 동일. 거래량 XAxis L341 `hide`, MACD XAxis L361 `hide`, RSI XAxis L390 `hide` → 가격축만 노출, 나머지 모두 숨김. AC 정합. |
| 판정 | **PASS** |

### AC-10 — 보조지표 구분

| 구분 | 내용 |
|---|---|
| 기대 | `SubLabel` 상단 구분선(border-t) + 타이틀 강조(font-semibold text-text-strong). |
| 실측 | (코드) `StockDailyChart` L524–530 `SubLabel`: 래퍼 `mt-md mb-xs pt-md border-t border-border-line`, 내부 `<p className="text-caption font-semibold text-text-strong px-xs">`. 메인↔보조·보조↔보조 경계 구분선 + 진한 타이틀 적용. AC 정합. |
| 판정 | **PASS** |

### AC-11 — 모바일 기간 드롭다운

| 구분 | 내용 |
|---|---|
| 기대 | 모바일에서 기간 선택이 `ChartRangeDropdown`(버튼+떠있는 패널·외부클릭 닫힘·chevron 회전), 데스크탑은 버튼 목록. ChartShell `useBreakpoint` 분기. |
| 실측 | (코드) `ChartShell` L431 `const { isMobile } = useBreakpoint()`, L495 `isMobile ? <ChartRangeDropdown .../> : <버튼 목록>`. `ChartRangeDropdown.tsx` — 버튼(현재 기간 + chevron) → `.dropdown-panel absolute` 패널, `useEffect` mousedown 외부클릭 닫힘, chevron `cn("…transition-transform duration-200", open && "rotate-180")`, 옵션 선택 시 `onChange + setOpen(false)`. `aria-haspopup="listbox"`/`aria-expanded`/`role="listbox"`/`role="option"`/`aria-selected` 부여. |
| 판정 | **PASS** |

### AC-12 — 툴팁 투명도

| 구분 | 내용 |
|---|---|
| 기대 | `tooltipStyle.backgroundColor` rgba(255,255,255,0.82) + backdrop-blur(3px) + 옅은 border. 라인/캔들/거래량/MACD/RSI 일괄. |
| 실측 | (코드) `StockDailyChart` L72 `C.tooltipBg="rgba(255,255,255,0.82)"`. L184–193 `tooltipStyle`: `backgroundColor: C.tooltipBg`, `backdropFilter:"blur(3px)"` + `WebkitBackdropFilter:"blur(3px)"`, `border:"1px solid rgba(15,20,25,0.08)"`(옅은 border). 적용처: 라인 L328·거래량 L343·MACD L364·RSI L395 모두 `contentStyle={tooltipStyle}`, 캔들 `CandleTooltip` L170 `style={{...tooltipStyle,…}}` 스프레드 → 5종 일괄. |
| 판정 | **PASS** |

### AC-13 — 데이터 부족 문구

| 구분 | 내용 |
|---|---|
| 기대 | MACD 부족 시 "데이터 부족 (최소 26{일\|주\|월})", RSI "(최소 15{…})". 봉 종류 따라 단위 변경(`PERIOD_UNIT`). "봉 수 부족" 잔존 없음. |
| 실측 | (코드) `StockDailyChart` L274 `periodUnit = PERIOD_UNIT[period]`, L379 `MACD — 데이터 부족 (최소 26${periodUnit})`, L402 `RSI — 데이터 부족 (최소 15${periodUnit})`. `PERIOD_UNIT = {D:"일",W:"주",M:"월"}`(stockChartConfig L64). (grep) `git grep "봉 수 부족" -- components/ lib/` → **0건**(구 문구 잔존 없음). |
| 판정 | **PASS** |

### AC-14 — PC 헤더

| 구분 | 내용 |
|---|---|
| 기대 | 아바타 제거, 데스크탑(lg) 한 줄(좌 종목명+번호 / 우 가격+KRW+등락), 모바일 2줄 스택. 데스크탑 헤더가 2-col 그리드 밖 전폭 → 기업개황·차트 카드 시작 높이선 일치. |
| 실측 | (코드) `StockHeader.tsx` — 원형 아바타 마크업 없음(L90 루트 div 가 바로 h1+가격 블록). 루트 `flex flex-col gap-sm lg:flex-row lg:items-center lg:justify-between`(모바일 2줄 스택 → lg 한 줄). 좌 `<h1>{displayName}<span ticker badge>`, 우 가격 블록 `{price} KRW {등락}`. `StockPageLayout` 기본(축소) 분기 L93–108: `<StockHeader/>` 가 그리드 밖 전폭 → 아래 `grid lg:grid-cols-[2fr_3fr] items-start`(좌 기업개황/공시, 우 차트). `items-start` + 헤더 전폭 → 좌·우 카드 시작선 정렬. 이름 우선순위(watchlist→recent→API) 유지. |
| 판정 | **PASS** |

### AC-15 — 보조지표 워밍업

| 구분 | 내용 |
|---|---|
| 기대 | 보기 구간보다 과거까지 더 fetch(WARMUP D60/W280/M1100, MAX 3000 클램프) 후 표준 파라미터(MACD 12/26/9, RSI 14) 계산 → 표시는 선택 구간 슬라이스. 짧은 구간에서도 지표 표시. 봉수 축소 근사 아님. |
| 실측 | (코드) `StockDailyChart` L64 `WARMUP_DAYS={D:60,W:280,M:1100}`, L65 `MAX_FETCH_DAYS=3000`, L214 `fetchDays=Math.min(days+WARMUP_DAYS[period], MAX_FETCH_DAYS)` → 워밍업 가산 + 3000 클램프. 라우트 `MAX_DAYS=3_000` 와 정합. useMemo: ① 전체(워밍업 포함) 오름차순 정렬 후 `calcMACD(closes)`/`calcRSI(closes)` 표준 파라미터로 계산(근사·축소 없음) → ② 마지막 봉 −days 캘린더 컷오프로 `visibleStart` 산출 → ③ 전 시리즈 빌드 후 `.slice(visibleStart)`. 워밍업 덕에 슬라이스 후 첫 봉부터 지표값 존재 → 주봉 3개월·월봉 1년 등 짧은 보기에서도 MACD/RSI 표시. `technicalIndicators.ts` calcMACD 기본 12/26/9, calcRSI 기본 14 확인. |
| 판정 | **PASS** |

---

## 2. 두 뷰포트 동작 (코드 분기 추적)

브라우저 자동화 없음 → 분기 로직으로 양 뷰포트 동작 추적. 경계: `useBreakpoint().isMobile = viewport < 768px`(JS), Tailwind `lg = ≥1024px`(CSS).

### 모바일 (<768px, `isMobile=true`)

| # | 시나리오 | 코드 근거 / 기대 동작 | 판정 |
|---|---|---|---|
| M1 | 종목 상세 진입 순서 | `StockPageLayout` isMobile 분기 → 제목→검색→헤더→차트→기업개황→공시 (AC-4) | PASS |
| M2 | 차트 확대 버튼 | `onExpand` 미전달 → `hasToggle=false` → 버튼 미렌더 (AC-5) | PASS |
| M3 | 기업개황·공시 접힘 | `collapsible` → `CollapsibleCard` 기본 접힘, chevron 회전 (AC-5) | PASS |
| M4 | 기간 선택 | `ChartShell` isMobile → `ChartRangeDropdown`(드롭다운) (AC-11) | PASS |
| M5 | 스크롤바 | `.main-area`/드롭다운 `scrollbar-hide-mobile` + `@media(max-width:767px)` 숨김 (AC-1) | PASS |
| M6 | 하단 여백 | `pb-calc(navbar-h+safe-area+lg)` (AC-6) | PASS |
| M7 | BottomNav "종목분석" 폴백 | `useStockNavClick` — 최근 없으면 `/stock`, 홈 미이동 (AC-2) | PASS |

### 데스크탑 (≥1024px, `isMobile=false`, `isDesktop=true`)

| # | 시나리오 | 코드 근거 / 기대 동작 | 판정 |
|---|---|---|---|
| D1 | 2-col 그리드 항상 펼침 | isMobile=false 분기 → `lg:grid-cols-[2fr_3fr] items-start`, 카드 항상 `.card`(접힘 없음) | PASS |
| D2 | 차트 확대/축소 | `onExpand`/`onCollapse` 전달 → 토글 버튼 유지, `transition()` fade | PASS |
| D3 | 상태유지 | 컨트롤 부모 소유 → 확대↔축소 값 보존 (AC-8) | PASS |
| D4 | 기간 선택 | isMobile=false → 버튼 목록 (AC-11) | PASS |
| D5 | 스크롤바 | `@media(max-width:767px)` 미적용 → 데스크탑 스크롤바 정상 (AC-1 무회귀) | PASS |
| D6 | PC 헤더 한 줄 정렬 | `lg:flex-row` 한 줄 + 헤더 전폭 + `items-start` 시작선 정렬 (AC-14) | PASS |

---

## 3. 반응형 경계 — 태블릿 (768~1023px) 회귀 점검

- `useBreakpoint`: 768~1023 구간은 `isMobile=false, isTablet=true, isDesktop=false`.
- 본 PR 의 JS 분기는 **`isMobile` 기준만** 사용(`StockPageLayout`·`ChartShell`·`BottomNav`). 태블릿은 `isMobile=false` → **데스크탑 분기로 동작**(2-col 그리드·확대버튼·기간 버튼 목록·BottomNav 미렌더).
- CSS 그리드는 `lg:`(≥1024) prefix라 768~1023 에서 1-col 로 폴백되나, 이는 본 PR 신규 도입 아님(기존 `grid-cols-1 lg:…` 패턴 유지) → 무회귀.
- 결론: 태블릿 구간 신규 회귀 없음. **PASS**

---

## 4. 에지 케이스

| # | 케이스 | 분석 / 실측 | 판정 |
|---|---|---|---|
| E1 | 신규 상장 — 총 이력 < 워밍업 (AC-13×AC-15) | fetch 가 `days+WARMUP` 요청해도 KIS 가 짧은 이력만 반환 → `calcMACD`/`calcRSI` 가 룩백 미달 구간 전부 `null`(calcRSI `length<=period` 시 전부 null, calcMACD ema 미달 시 null). `macdSeries.some(m=>m.macd!==null)` false → L379 "MACD — 데이터 부족 (최소 26{단위})", RSI L402 동일 노출. `periodUnit` 봉 따라 일/주/월. → 정상 폴백 | PASS |
| E2 | 빈 차트 데이터 | useMemo `if(!data\|\|data.length===0)` → 전 시리즈 `[]` → `priceSeries.length===0` → "차트 데이터가 없어요" (L296–302) | PASS |
| E3 | BE 다운 / API 에러 | `isError` 분기: StockHeader `card-critical role=alert`, StockDailyChart `card-critical`, CompanyOverview/DisclosureList `card-critical role=alert`. 차트 라우트는 BFF timeout 시 mock 폴백(route `mapErrorToResponse`). 카피 무회귀 | PASS |
| E4 | NaN/비유한 값 툴팁 | `fmtTooltipPrice/Vol/MACD/RSI` 모두 `Number.isFinite(n)` 가드 → 비유한 시 `0`/`-` 표기. `CandleBar` `width<=0\|\|height<=0` / `high<low` 가드로 렌더 스킵 | PASS |
| E5 | StrictMode 더블 마운트 | `ComingSoonNavItem`·`ChartRangeDropdown`·`StockSearchContainer` 모두 useEffect cleanup 에서 `removeEventListener` + `clearTimeout`. `useBreakpoint` 도 listener 제거 → 누수 없음 | PASS |
| E6 | localStorage 미가용/오염 (최근검색) | `recentSearch.ts` `hasWindow()` 가드 + try/catch + 배열·필드 타입 필터링. 오염 시 `[]` 폴백 → `useStockNavClick` 가 `/stock` 으로(홈 미이동) | PASS |
| E7 | `?q=` 미전달 종목 직접 진입 | `searchParams.q` undefined → `initialKeyword=""` → 검색창 빈 채, 드롭다운 닫힘. 정상 | PASS |
| E8 | SSR hydration (반응형) | `useBreakpoint` 초기값 모바일 퍼스트(`isMobile:true`) 서버·첫 클라 일치 → mismatch 0. 마운트 후 matchMedia swap. dev `/stock` SSR 응답 정상 렌더 확인 | PASS |
| E9 | Tailwind preflight 잔여물 | scrollbar 유틸이 `@layer utilities` 안 — preflight 와 충돌 없음. 빌드 클린 | PASS |

---

## 5. 라운드트립 (BE LIVE) 메모

- 본 환경의 dev 서버는 **앱 비밀번호 게이트**(미들웨어)가 클라이언트단에서 동작 — 미인증 상태에서도 라우트는 200 으로 응답하고 게이트 UI 가 클라에서 렌더되는 구조라, KIS/DART 실데이터 라운드트립(6블록 등 PR#11 시나리오)은 본 PR 범위(모바일/차트 UX)와 직접 관련 없어 생략.
- 대신 라우트 SSR HTML + 프로덕션 CSS 번들 + 차트 BFF 라우트(`/api/stock/chart` MAX_DAYS=3000 클램프, mock/timeout 폴백) 코드로 데이터 경로 정합을 확인. AC-1~15 는 모두 클라이언트 UI/로직 항목이라 코드+컴파일 근거로 완결.
- DESIGN.md 토큰 라이브 동기화 검증: 본 PR 은 신규 디자인 토큰 추가가 없고(기존 spacing/color 토큰만 cascade), `tailwind.theme.json` 의 `lg=14px`·`navbar-h=60px` 값이 빌드 산출물에 그대로 반영됨을 calc/번들로 확인. 토큰 임시변경 라운드트립은 토큰 신설 PR 아님 → 비해당.

---

## 6. 종합

- **AC-1 ~ AC-15: 전부 PASS.** 추가 점검(반응형 경계·신규상장 에지·API 상태 카피·BFF/토큰) 전부 PASS.
- 자동 게이트(typecheck/lint/build/BFF/한글톤) 전부 통과. 실패 0건.
- 비차단 관찰(본 PR 범위 외, 후속 참고):
  - StockDailyChart 의 recharts 색 상수 `C`(hex 16종)는 기존 기술부채(별도 후속 W2). 본 PR 신규 아님.
  - `py-[3px]`·`min-w-[88px]` 등 일회성 px 유틸은 main 베이스라인에 이미 존재 — 회귀 아님. DESIGN.md 토큰화는 차트 컨트롤 리팩터 후속에서 일괄 검토 권장.
- **최종 판정: qa-passed.**
