# PRD — 홈 시장 종합 재기획 + 계좌 정보 마이페이지 이전 (`home-market-redesign`)

> **slug**: `home-market-redesign`
> **작성**: PM 에이전트 · 2026-05-30
> **UI 포함 여부**: **yes** — `/`(홈) 을 개별종목 분석 mock 에서 "시장 종합" 대시보드로 전면 교체, 계좌 위젯을 `/profile` 로 이전, 사이드바 재배치(AI 분석 하단+준비중). 신규 레이아웃·신규 화면 다수.
> **UX/UI 디자이너 합류**: **yes (확정, 2026-05-30 / §9 q6=a)** — 홈 신규 레이아웃 + 마이페이지 "내 자산" 섹션 + 사이드바 "준비 중" 버튼 디자인. 다음 단계 = UX/UI 디자이너 → 구현.
> **단일 PR 룰**: **2-PR 분할 확정**(PR1 계좌 이전 / PR2 홈+nav·사이드바) — §8.2 (§9 q5=a).

---

## 0. 한눈에

`/`(홈) 을 현재 **개별종목 분석 mock**(`HomeDashboard`, 9 컴포넌트) 에서 **"시장 종합" 대시보드**로 전면 교체한다. 동시에 `/dashboard`(포트폴리오 mock) 의 계좌 위젯을 `/profile`(마이페이지) "내 자산" 섹션으로 이전하고, **중복·미정착 라우트를 정리**한다 — `/dashboard` 제거, `/market`(지수) 는 홈으로 흡수 후 제거, **`/analyze`(AI 분석) 는 향후 엔진 레포 연동 예정이라 제거하지 않고 사이드바 하단 + "준비 중" 버튼 디자인으로 살려둔다.** nav 6 → 4(홈·관심종목·마이페이지 + 하단 AI분석).

**조회·분석 전용 스코프 준수** — 주문/자동매매 영구 미구현. 계좌 데이터는 실계좌 연동 전까지 mock 유지(스코프 정책과 무충돌).

---

## 1. 배경 / 문제

### 1.1 사용자 의도 (verbatim)

> "대시보드에 지금 있는 내용들은 아직 mock data이지만 내 계좌 관련 정보야(총 자산, 보유 주식 종목 등). 그래서 주식 관련 dashboard는 이런 역할이 아닌 것 같아서 해당 정보들은 마이페이지로 우선 옮기고 dashboard 구성은 다시 해보고싶어. 보통 어떤 데이터나 그래프들을 보여주는게 일반적인지 다른 주식 매매, 분석 프로그램이나 웹사이트 들을 참고해서 재 기획해보자."

### 1.1.1 대화 중 확정된 결정 (사용자, 2026-05-30 — 인용이 아닌 결정 요약)

- 계좌 정보(총자산/보유종목 등) → 마이페이지(`/profile`) **인라인 "내 자산" 섹션**(별도 서브탭 아님).
- 관심종목은 이미 전용 탭(`/watchlist`)이 있으니 대시보드에 **중복 노출하지 않음**. 홈에 둘 지수는 기존 `/market` 의 IndexGrid 와 동일 데이터 → **통합**(중복 제거).
- **통합형 IA**: 홈(`/`)을 "시장 종합" 대시보드로 **교체**. 기존 홈(개별종목분석 mock)·`/dashboard`(포트폴리오)·`/market` 을 정리.
- **AI 분석(`/analyze`)**: 향후 별도 **엔진 레포와 연동 예정**(현재 미완성). nav 에서 제거하지 않고 **사이드바 하단으로 이동 + "준비 중" 느낌의 버튼 디자인**으로 살려둠.
- **수급(외국인/기관 투자자 매매동향)**: 사용자가 특히 관심 — 최근 **7일 누적 외국인/기관 순매수 상위 ~10**, 가능하면 **개인 순매도(−)** 종목. 단 신규 KIS 연동·스펙 확인 필요 → **즉시가능 위젯부터 출시하고 수급은 후속 트랙**(별도 페이지).
- 1차는 **이미 연동된 데이터로 가능한 위젯 우선**, 신규 KIS 연동(수급·Top Movers) 0건.

### 1.2 현재 상태 (main, finsight-redesign 9 PR + 실데이터 트랙 머지 직후)

- **nav 6 항목**(`components/layout/navItems.ts` `NAV_ITEMS:46`, 라벨 `lib/copy/layout/navCopy.ts`): 대시보드 `/dashboard` · 홈 `/` · AI 분석 `/analyze` · 시장 동향 `/market` · 관심 종목 `/watchlist` · 마이페이지 `/profile`. Sidebar(`components/layout/Sidebar.tsx`)/BottomNav(`components/layout/BottomNav.tsx`) 공유, `isNavItemActive` 로 활성 판별.
- **`/`(홈, `app/(main)/page.tsx`)** = 개별종목 분석 **mock** — `HomeDashboard`(`components/home/*` 9 컴포넌트: SearchToggle/SearchBar/AssetHeader/TimeframeChips/PriceChart/AiAnalysisCard/MarketStatsCard/TechnicalIndicatorsCard/NewsCard), mock `lib/mock/home/*`, BFF 호출 0.
- **`/dashboard`(`app/(main)/dashboard/page.tsx`)** = 포트폴리오 **mock** — `DashboardPage`(PortfolioHero + HoldingsTop3 + MarketSnapshotCard), mock `lib/mock/dashboard/*`, server component, BFF 호출 0.
  - 계좌 위젯: PortfolioHero(총자산 `components/dashboard/PortfolioHero.tsx:56-59`, 투자원금 `:72-76`, 평가손익 `:77-81`, 손익률 `:61-68`, 주식/코인 비중 `:82-92`) + HoldingsTop3(`components/dashboard/HoldingsTop3.tsx:32-56`).
  - 시장 위젯: MarketSnapshotCard(Fear&Greed `components/dashboard/MarketSnapshotCard.tsx:85-101`, 상승/하락 종목수 `:104-121`) — 둘 다 mock.
- **`/analyze`(`app/(main)/analyze/page.tsx`)** = 실동작 AI 분석 워크벤치(FastAPI) — `components/workbench/*`, `hooks/workbench/*`. useTickerSearch→`/api/whitelist/search`→FastAPI, useAnalyzeRun→`/api/workbench/analyze`→FastAPI. **단, 사용자는 이를 별도 엔진 레포 연동 전까지 "준비 중" 으로 취급하기로 결정(§1.1.1).**
- **`/market`(`app/(main)/market/page.tsx`)** = `MarketPage`(ThemesCard mock + IndicesCardContainer 실데이터). 지수 `useQueryIndices`→`/api/market/indices`(KIS `inquire-index-price` FHPUP02100000, prod 전용, KOSPI 0001/KOSDAQ 1001/KOSPI200 2001). PRD 선례 `docs/prd/market-real-data.md`.
- **`/watchlist`(`app/(main)/watchlist/page.tsx`)** = `WatchlistContainer`(client), localStorage + `/api/watchlist`(KIS intstock-multprice). PRD `watchlist-real-data`/`watchlist-batch-quotes`.
- **`/profile`(`app/(main)/profile/page.tsx`)** = `components/profile/{ProfilePage,ProfileCard,ConnectedExchangesCard,SettingsMenuCard}`. 자산 위젯 0. `/profile/[ticker]` 동적 = 종목 상세(별개, 충돌 없음).

### 1.3 문제

1. **IA 모순** — `/dashboard` 가 "대시보드" 라벨로 실제로는 개인 계좌(포트폴리오) 화면. "조회·분석 전용" 정체성과 어긋나고, 계좌 데이터는 100% mock(KIS/DART 호출 0).
2. **분석 화면 중복** — `/`(홈, 개별종목분석 mock) 과 `/analyze`(실동작 워크벤치) 가 기능적으로 겹침. 홈은 mock 이라 실동작 안 함.
3. **시장 데이터 미노출** — 이미 연동된 지수 실데이터(`/market`) 등이 첫 화면(홈)에 없어, 앱을 열었을 때 "시장이 지금 어떤지" 한눈에 못 봄.
4. **빈 랜딩** — 홈이 mock 개별종목분석이라 종목 선택 전엔 의미가 약함.

### 1.4 컨텍스트 메모

- 조회·분석 전용 스코프(주문/자동매매 영구 미구현, 실전 prod 키 read-only) — `project_read-only-analysis-scope`.
- 단일 PR 룰 복귀 상태(finsight-redesign 9 PR·stock-api-integration 3 PR 분할은 종료된 예외).
- 한국식 색: 상승=빨강(signal-up) / 하락=파랑(signal-down). 디자인 토큰 `docs/design/<slug>.md`→`npm run design:sync`(hex/px 직타 금지).
- Vercel 미연동(배포 별도).

---

## 2. 목표 (측정 가능)

- `/`(홈) 진입 시 **시장 종합 화면**이 렌더된다: 주요 지수(KOSPI/KOSDAQ/KOSPI200 실데이터) + 종목 검색 + 공포·탐욕 지수(간이) + 최신 공시. 개별종목분석 mock(`HomeDashboard`) 은 제거된다.
- 계좌 위젯(총자산·투자원금·평가손익·손익률·자산비중·**보유종목 전체 테이블**) 이 `/profile` "내 자산" 섹션에서 렌더된다. `/dashboard` 라우트 제거 + 리다이렉트(§9 q4).
- nav 가 6 → 4(홈·관심종목·마이페이지 + 하단 AI분석)로 정리되고, **AI 분석은 사이드바 하단 + "준비 중" 시각 처리**로 노출된다. `/market`→`/`·`/dashboard`→`/profile` 리다이렉트.
- 1차 위젯은 **이미 연동된 데이터(🟢/🟡)만** — 신규 KIS 연동(수급/Top Movers) 0건. `npm run typecheck && lint && build` 0 에러.

---

## 3. 범위 (In Scope)

> 실현가능성: 🟢 즉시가능(연동완료) / 🟡 소규모추가 / 🟠 신규연동 / 🔴 스코프밖.

### 3.1 계좌 위젯 → 마이페이지 이전

- `components/dashboard/PortfolioHero.tsx` + `HoldingsTop3.tsx` 를 `/profile` 로 이전. "내 자산" 섹션 신설(`components/profile/` 하위).
- **보유종목은 전체 테이블로 확장(§9 q—검토 확정)** — 종목명·평가액·수익률·비중, 정렬 가능 테이블. 기존 Top3 요약 형태가 아니라 마이페이지에 맞는 "전체 자산" 뷰. (mock 데이터는 3종이라 1차 시각은 작지만 구조는 전체 테이블.)
- 자산비중(주식/코인) 은 현 바 → **도넛 차트** 재시각화 권장(디자이너 합류 시 확정).
- mock 데이터(`lib/mock/dashboard/{portfolio,holdings}.ts`) 는 `lib/mock/profile/` 로 이동/재참조. 타입 `lib/types/dashboard/*` → `lib/types/profile/*` 정리.
- 예수금·주문가능금액·실현손익·입출금은 **미구현/비활성**(조회·분석 전용 스코프).

### 3.2 홈(`/`) → 시장 종합 대시보드 교체

- 기존 `HomeDashboard`(`components/home/*` 9 컴포넌트) 제거. `app/(main)/page.tsx` 를 시장 종합 셸로 재작성.
- **설계 원칙(PM)**: 정보 과밀 지양 — 1차는 "이미 연동된 데이터로 가능한" 핵심 위젯 위주(최종 레이아웃·위젯 수는 디자이너 확정).
- 1차 위젯:
  - **종목 검색바**(상단) 🟢 — `/api/stock/search`(`lib/api/kis/search.ts`, symbols.json substring). 검색 선택 시 종목 상세(`/profile/[ticker]`) 등으로 라우팅.
  - **주요 지수 카드**(KOSPI/KOSDAQ/KOSPI200) 🟢 — `/market` 의 `IndicesCardContainer` + `useQueryIndices`(→ `/api/market/indices`) 를 홈으로 이전. 로딩/에러/부분성공 패턴은 `market-real-data` 선례 그대로.
  - **공포·탐욕 지수 카드(간이)** 🟡 — §9 q1=(c) 확정. 외부 F&G 공개 API 부재라 **지수 응답의 등락종목수(`ascn_issu_cnt`/`down_issu_cnt`)로 0~100 자체 산출**(신규 연동 0). 명칭은 "공포·탐욕 지수" 사용하되 **간이 자체산출(CNN 정본 아님) 디스클레이머 + 구간별 매매 추천 해석을 강하게 노출**. 상세는 §3.5.
  - **최신 공시 피드** 🟡 — §9 q2=(a) **포함 확정**. `/api/disclosure/list`(OpenDART), 관심종목 기준. 상세는 §3.6.
  - **(선택) 수급 진입/예고** — 수급 페이지(후속)로의 진입 또는 "준비 중" 예고. 사용자 관심이 큰 기능이라 디자이너가 적절한 비중으로 배치(필수 아님 — §3.4).
- AI 분석으로의 진입은 **사이드바**(§3.3) 가 담당 — 홈 본문에 AI분석을 "동작하는 핵심 카드"로 배치하지 않는다(현재 준비 중 취급).
- 홈은 `useQueryIndices` 등 **커스텀훅만 소비**(frontend.md §1). 데이터 위젯 client 경계만 분리, 나머지 server 우선.

### 3.3 nav / 사이드바 정리 (6 → 4 + AI분석 하단 준비중)

- `navItems.ts` `NAV_ITEMS` 에서 **대시보드(`/dashboard`)·시장 동향(`/market`) 제거**. 남는 메인 메뉴: 홈(`/`)·관심 종목(`/watchlist`)·마이페이지(`/profile`).
- **AI 분석(`/analyze`)**: nav 에서 제거하지 않고 **사이드바 하단 영역으로 이동** + **"준비 중" 버튼 디자인**(예: dimmed + "준비 중" 배지, 또는 비활성/툴팁). "엔진 레포 연동 후 정식화" 의도(§1.1.1). 페이지 자체(`/analyze`)·`components/workbench/*` 는 **무변경으로 살려둠**.
  - 구현 옵션(검토 확정 방향): NavItem 에 `status: "ready" | "comingSoon"` + `placement: "main" | "bottom"` 플래그 추가. Sidebar/BottomNav 렌더가 main 그룹(상단)·bottom 그룹(하단, comingSoon 스타일)을 분리 렌더. 엔진 연동 완료 시 플래그만 바꿔 정식 승격. 최종 시각은 디자이너 + dev.
- 라벨 상수(`navCopy.ts`) 정리: NAV_MENU_DASHBOARD/NAV_MENU_MARKET 제거. 홈 라벨 **"홈" 유지** + 수급 메뉴는 **페이지 구현 시 노출**(§9 q3=a).
- BottomNav(모바일)에서도 AI분석 "준비 중" 처리 일관 적용.

### 3.4 수급 페이지 — 본 PRD 는 진입 동선/예고만, 페이지는 후속

- 수급(외국인/기관 투자자 매매동향) 페이지는 **신규 KIS 연동·스펙 확인이 선행**돼야 하므로 본 PRD 범위가 아니다(§4 비범위 + §8.4 후속 트랙 `investor-flow-page` 가칭).
- 본 PRD 는 홈/사이드바에 **수급으로의 진입 또는 "준비 중" 예고**만 둘 수 있다(디자이너 판단). 수급 페이지 본구현·정식 nav 노출은 후속.

### 3.5 공포·탐욕 지수(간이) 위젯 설계 — §9 q1=(c)

- **데이터**: 지수 응답 `ascn_issu_cnt`(상승)/`down_issu_cnt`(하락)/`stnr_issu_cnt`(보합). `market-real-data` §3.1 타입에 이미 존재 — **신규 연동 0**. ⚠️ 해당 TR(`FHPUP02100000`)은 실전 전용·모의 미지원 → **구현 AC 에 실전키 1회 응답 검증 포함**(필드가 실제로 채워지는지).
- **산출(1차 최소안)**: `breadth = ascn / (ascn + down)` → `score = round(100 * breadth)`. 0=극공포, 100=극탐욕. (2차 확장: 지수 모멘텀·거래량 가중 — 후속.)
- **명칭(검토 확정)**: 위젯명 **"공포·탐욕 지수"** 사용(직관적). 단 **간이 자체산출임을 명시** — "CNN 공식 지수가 아닌 KIS 등락종목수 기반 간이 산출" 디스클레이머 필수. CNN 로고/브랜딩 도용 금지.
- **구간 라벨 + 매매 추천 해석(사용자 요구: "추천을 잘 표시" — 뜻 모르는 사람도 지금 매매 좋/나쁨 알게)**: 각 구간에 **추천 톤 배지**(예: 분할매수 관점 / 관망 / 주의)와 한 줄 해석을 함께 노출. 역발상 통념 반영(극공포=기회 거론, 극탐욕=과열 주의) + 리스크 고지.
  | 점수 | 라벨 | 추천 톤 | 한 줄 해석 |
  |---|---|---|---|
  | 0–24 | 극단적 공포 | 🔵 분할매수 관점 거론 | "시장이 과도하게 공포에 빠져 있어요 — 역사적으로 분할매수 관점이 거론되는 구간. 단, 지표일 뿐 신중히." |
  | 25–44 | 공포 | 🔵 신중한 분할·분산 | "투자심리가 위축돼 있어요. 변동성 큰 구간 — 분할·분산 관점이 자주 언급돼요." |
  | 45–55 | 중립 | ⚪ 관망·추세 확인 | "한쪽으로 치우치지 않은 중립 구간이에요. 추세 확인이 필요해요." |
  | 56–75 | 탐욕 | 🟠 추격매수 주의 | "투자심리가 달아오르고 있어요. 추격매수는 신중히, 리스크 관리를 함께." |
  | 76–100 | 극단적 탐욕 | 🔴 과열·조정 주의 | "과열·탐욕 구간이에요 — 역사적으로 조정 위험이 거론돼요. 단, 지표일 뿐 신중히." |
- **디스클레이머(상시 노출, 필수)**: "이 점수는 KIS 등락종목수 기반의 참고용 간이 지표(CNN 공식 지수 아님)이며, 투자 판단의 단독 근거가 아닙니다."
- 시각화는 반원 게이지(디자이너 확정). 카피는 `lib/copy/home/labels.ts`.

### 3.6 최신 공시 피드 위젯 설계 — §9 q2=(a) 포함

- **데이터**: `/api/disclosure/list`(OpenDART `list.json`, `lib/api/dart/disclosure.ts`). 현재 **종목 지정 조회**라 "전체 시장 최신 공시" 피드는 다종목 fan-out 필요(🟡).
- **1차 현실안**: 관심종목(`/watchlist` localStorage tickers) 또는 고정 대표종목 풀에 대해 최근 공시 N건 취합 — "전체 시장 스캔"은 비범위(별도). **DART 일일 쿼터 가드**(`counter.ts`) 준수, 캐싱(staleTime) 적용.
- 헤드라인 리스트 + 타임스탬프 + 종목 태그. 클릭 시 종목 상세/DART 원문. 로딩/에러/빈 카피 `lib/copy/home/labels.ts`.

### 3.7 로딩 / 에러 / 빈 상태

- 지수 카드: `/market` 의 IndicesCardContainer 로딩/에러/부분성공(`Promise.allSettled`) 패턴 그대로 이전.
- 공포·탐욕/공시: 스켈레톤 + 한글 에러 카피(`lib/copy/home/labels.ts` 신설).

---

## 4. 비범위 (Out of Scope)

- **수급(외국인/기관 투자자 매매동향) 페이지 구현** — 별도 트랙(`investor-flow-page` 가칭). KIS 신규 연동·스펙 확인 선행(§8.4). 본 PRD 는 진입/예고만.
- **Top Movers(등락률/거래량 순위)** — KIS `/ranking/fluctuation`(FHPST01700000)·`volume-rank`(FHPST01710000) 실전전용·최대30·다음조회불가. 후속.
- **지수 스파크라인** — 지수 시계열 API 별도 확인(현 `inquire-daily-price` 는 개별종목용). 후속.
- **`/analyze` 워크벤치 내부 변경 / 엔진 레포 연동** — 본 PRD 는 사이드바 배치·"준비 중" 표시만. 엔진 연동은 별도.
- **실계좌 연동**(계좌 실데이터) — 조회·분석 전용 스코프, 별도 요청 영역. 마이페이지 자산은 mock 유지.
- **정식 Fear & Greed 지수(외부 소스/7요소 자체산출)** — 한국 증시 F&G 공개 API 부재(리서치), VIX/Put-Call/채권 4요소 현 스택 불가. 1차는 §3.5 간이 breadth 점수로 대체.
- **공시 전체 시장 스캔** — 1차는 관심종목/대표풀 한정. 전체 시장 피드는 별도(쿼터·인프라).
- **디자인 토큰 신규 추가** — 기존 v8 토큰 재사용 우선(신규 필요 시 DESIGN.md 경유).

---

## 5. 수용 기준 (AC)

> 검증 명령은 저장소 루트에서 실행.

### AC-1 홈 시장 종합 교체
- `git grep -rn "HomeDashboard" app components` → 0건(기존 개별종목분석 셸 제거).
- `git grep -rn "useQueryIndices" app/\(main\)/page.tsx components/home` → 1건 이상(홈이 지수 소비).
- `git grep -rn "useQuery(" components/home` → 0건(커스텀훅만 소비).

### AC-2 계좌 위젯 마이페이지 이전 + 전체 테이블
- `git grep -rn "내 자산" components/profile lib/copy` → 1건 이상.
- 보유종목이 **전체 테이블**(종목명·평가액·수익률·비중) 로 렌더(시각 확인). 기존 Top3 요약 형태 미사용.
- `git grep -rn "PortfolioHero\|HoldingsTop3" components/dashboard app/\(main\)/dashboard` → 0건(원위치 제거).

### AC-3 nav 정리 + AI분석 하단/준비중
- `git grep -n "NAV_ITEMS" -A 20 components/layout/navItems.ts` → 메인 메뉴에 `/dashboard`·`/market` 없음. 홈·관심종목·마이페이지 존재.
- AI 분석(`/analyze`) 은 사이드바 **하단**에 "준비 중" 시각 처리로 노출(시각 확인). `/analyze` 페이지·`components/workbench/*` 유지.
- BottomNav(모바일)에도 동일 정책 반영(시각 확인).

### AC-4 라우트 리다이렉트
- `/market`→`/`, `/dashboard`→`/profile` 리다이렉트 동작(수동 또는 redirect 코드 확인). `/`·`/analyze`·`/watchlist`·`/profile` 정상 동작.

### AC-5 지수 실데이터 홈 노출
- 홈에서 KOSPI/KOSDAQ/KOSPI200 카드 렌더. DevTools Network `/api/market/indices` + `X-Data-Source` 헤더(prod 키 시 kis, 그외 mock) 확인.

### AC-6 공포·탐욕 지수(간이) 위젯 (§3.5)
- 홈에 공포·탐욕 지수 카드 + **구간별 추천 톤 + 디스클레이머** 렌더. `git grep -rn "참고용 간이 지표\|CNN 공식 지수 아님\|분할매수 관점" lib/copy/home` → 1건 이상.
- 점수 산출 유틸(breadth) 존재 + 구간 경계(0–24/25–44/45–55/56–75/76–100) 매핑. `git grep -rn "ascn_issu_cnt\|breadth\|공포.*탐욕" lib hooks components/home` → 1건 이상.
- (수동, prod 키) 지수 응답 `ascn_issu_cnt`/`down_issu_cnt` 가 실제 채워져 점수 렌더 — 1회 검증.

### AC-7 최신 공시 피드 (§3.6)
- 홈에 공시 피드 렌더. `git grep -rn "disclosure" components/home hooks` → 1건 이상(커스텀훅 경유). DART 쿼터 가드(`counter.ts`) 경유 확인.

### AC-8 빌드/품질 게이트
- `npm run typecheck` 0 / `npm run lint` 0 / `npm run build` 0(Turbopack). 신규 mock/매퍼 단위 테스트 통과(있는 경우).

### AC-9 조회 전용 스코프 무위반
- `git grep -rn "order\|주문\|매수\|매도" app/api` → 주문 엔드포인트 0건.
- 마이페이지에 예수금/주문가능금액/실현손익/입출금 활성 기능 0(비활성/미구현).

### AC-10 화면 회귀 0 (수동, 양 뷰포트)
- 모바일/데스크탑에서 홈/마이페이지/관심종목/AI분석 레이아웃 정상. 한국식 색(상승빨강/하락파랑) 유지.

---

## 6. 가정 · 제약

- **선행 전제**: market-real-data(지수 실데이터)·watchlist 트랙 머지 완료(main 정합). `/api/market/indices`·`useQueryIndices`·`queryConfig.market.indices` 인프라 재사용.
- 지수는 prod 전용(모의 미지원) — 홈에서도 `KIS_ENV=prod`+키 설정 시만 실데이터, 그외 mock fallback(이중 게이트 유지). 공포·탐욕 지수도 같은 응답 의존이라 동일 게이트.
- 공포·탐욕 지수는 간이 breadth — CNN 정본/백테스트 없음. "참고용" 디스클레이머 필수.
- 수급/Top Movers 는 KIS 신규 연동 필요(실전전용·최대30 제약) — 후속.
- 도구: `npm run typecheck/lint/build/test` 동작. Turbopack 일상 build.

---

## 7. 참고

- 현행 화면: `app/(main)/{page,dashboard/page,market/page,analyze/page,profile/page}.tsx` · `components/{home,dashboard,market,workbench,profile}/*`.
- nav: `components/layout/{navItems.ts,Sidebar.tsx,BottomNav.tsx}` · `lib/copy/layout/navCopy.ts`.
- 재사용 인프라: `hooks/market/useQueryIndices.ts` · `lib/api/market/indices.ts` · `lib/query/{queryConfig,queryKeys}` · `/api/market/indices`·`/api/stock/search`·`/api/disclosure/list`.
- 선례 PRD: `docs/prd/market-real-data.md`(지수 BFF+mock fallback+헤더) · `watchlist-real-data.md` · `finsight-redesign.md`(IA·nav 원형).
- KIS 수급/순위 조사(후속용): `docs/references/kis-api/domestic-stock-analysis.md`(투자자 매매동향 §2-3 `inquire-investor` FHKST01010900 / §2-6 `investor-trade-by-stock-daily` FHPTJ04160001 / 외국인기관 가집계 `foreign-institution-total` FHPTJ04400000 :46) · `domestic-stock-rankings.md`(등락률/거래량 순위).
- F&G 데이터 리서치(2026-05-30): 한국 증시 F&G 공개 API 부재(개인 대시보드는 KIS 스크래핑·약관 리스크), CNN 미국 전용+비공식 API, 코인 F&G 무관 → 간이 breadth 자체산출 결론.
- 룰: `docs/rules/frontend.md`(§1 커스텀훅 · §3 copy · §7 queryKeys · 도메인 한 뎁스).

---

## 8. 영향 분석

### 8.1 변경 라인 추정

| 영역 | 파일 | 추정 라인 | 성격 |
|---|---|---|---|
| 홈 셸 재작성 | `app/(main)/page.tsx` + `components/home/*`(시장종합 신규) | ~220 | 교체(기존 9컴포넌트 제거 + 신규) |
| 공포·탐욕 지수 위젯 | `components/home/*` + breadth 유틸 + copy | ~80 | 신규 |
| 공시 피드 위젯 | `components/home/*` + 훅 | ~70 | 신규(기존 disclosure API 재사용) |
| 계좌 이전 + 전체 테이블 | `components/profile/*` + `app/(main)/profile/page.tsx` | ~180 | 이동+재구성(Top3→테이블) |
| 지수 카드 이전 | 홈에서 IndicesCard 재사용 | ~40 | 재배치 |
| nav/사이드바 정리 | `navItems.ts` · `navCopy.ts` · `Sidebar.tsx` · `BottomNav.tsx`(status/placement 플래그) | ~90 | 수정 |
| 라우트 제거/리다이렉트 | `app/(main)/{dashboard,market}/` | ~-50 | 삭제(+redirect) |
| mock/타입 이동 | `lib/mock/{dashboard→profile}` · `lib/types/*` | ~60 | 이동 |
| copy 신설 | `lib/copy/home/labels.ts` | ~50 | 신규 |
| **합계** | | **~740(순증 ~690)** | |

### 8.2 PR 분할 권고 (§9 q5=a 확정)

- **2-PR 분할 확정**:
  - **PR1 — 계좌 이전**: 계좌 위젯 `/dashboard`→`/profile`(보유종목 전체 테이블), `/dashboard` 제거+리다이렉트, mock/타입 이동. 홈 무관, 독립 머지 가능.
  - **PR2 — 홈 시장종합 + nav/사이드바 정리**: 홈 교체(지수·공포탐욕·공시·검색), `/market` 흡수+리다이렉트, AI분석 하단+준비중, 진입 동선.
- 사유: 회귀 영역 분리(자산 정보 vs 라우팅/사이드바). PR2 의 디자이너 왕복이 PR1 을 막지 않게.

### 8.3 회귀 위험

- **중** — nav 라우트 제거 시 기존 `/dashboard`·`/market` 북마크/링크 깨짐 → redirect(§9 q4=b)로 완화.
- **중** — 홈 전면 교체. 기존 `components/home/*`·`lib/mock/home/*` 제거 시 import 잔존 점검(typecheck 차단).
- **중** — 사이드바에 nav 상태(준비중/배치) 플래그 도입 → Sidebar/BottomNav 렌더 로직·활성 판별 회귀. 시각 + typecheck 점검.
- **저** — 계좌 mock 이동 경로 변경 import 누락(typecheck 차단).
- **저** — 공포·탐욕 지수: 지수 응답에 등락종목수 필드가 비어있을 가능성 → AC-6 1회 검증으로 차단(비면 위젯 보류 fallback).

### 8.4 후속 PR 자연 연결

- **수급 페이지(`investor-flow-page` 가칭) — 우선 후속(사용자 관심 큼).** 외국인/기관 투자자 매매동향. KIS `foreign-institution-total`(FHPTJ04400000, 레퍼런스에 응답스펙 없음 → 영업/GitHub examples 확인 선행) 또는 `investor-trade-by-stock-daily`(FHPTJ04160001, 실전전용, 7일누적은 종목별 일별 합산) 다단 파이프라인. 사용자 요구: **최근 7일 누적 외국인/기관 순매수 상위 10 + 개인 순매도(−) 필터**. 별도 PRD 로 (1) KIS 수급 API 스펙 확정 → (2) BFF/집계 → (3) 전용 화면.
- **AI 분석 엔진 레포 연동** — `/analyze` 를 "준비 중" → 정식화(사이드바 플래그만 변경). 엔진 레포 연결 후 별도 트랙.
- **Top Movers 위젯** — 등락률/거래량 순위 API 연동 후 홈/시장.
- **공포·탐욕 지수 2차 확장** — 모멘텀·거래량 가중 / 지수 스파크라인.
- **보유종목 실계좌 연동·총자산 추이 차트** — 마이페이지 자산 섹션 확장. 실계좌 연동 시 mock→실데이터.

---

## 9. OPEN QUESTION → 전부 RESOLVED (2026-05-30)

> q1~q6 + 검토(①②④) 전부 사용자 확정. 본문(§3.1/§3.2/§3.3/§3.5/§3.6/§8) 에 반영됨.

- **[RESOLVED] q1 — 홈 시장심리 1차 처리 → (c) 등락종목수 기반 간이 공포·탐욕 지수 자체 산출.**
  F&G 데이터 확보 리서치(2026-05-30): 한국 증시 F&G 공개 API **없음**(개인 대시보드는 KIS 스크래핑 기반·약관 리스크, CNN 은 미국 전용+비공식 API, 코인 F&G 는 무관), 정식 7요소(VIX/Put-Call/채권) 현 스택 불가 → 외부 연동·정식 자체산출 모두 탈락. **지수 응답 `ascn_issu_cnt`/`down_issu_cnt` 로 breadth 0~100 자체 산출**(신규 연동 0). **검토 확정**: 명칭은 "공포·탐욕 지수" 사용(직관적), 단 "간이 자체산출(CNN 정본 아님)" 디스클레이머 + **구간별 매매 추천 해석을 강하게 노출**(사용자: "추천을 잘 표시"). 반영: §3.2, §3.5, §4, AC-6.
- **[RESOLVED] q2 — 최신 공시 피드 → (a) 1차 포함.** OpenDART `/api/disclosure/list`, 관심종목 기준 + DART 쿼터 가드(전체 시장 스캔은 별도). 반영: §3.2, §3.6, §4, AC-7.
- **[RESOLVED] q3 — 홈 라벨 + 수급 메뉴 → (a) 라벨 "홈" 유지 + 수급은 페이지 구현 시 nav 노출(1차 미노출).** 빈 메뉴 노출 지양, 홈 카드 동선으로 진입. 반영: §3.3, §3.4.
- **[RESOLVED] q4 — `/dashboard`·`/market` 제거 방식 → (b) 리다이렉트.** `/market`→`/`, `/dashboard`→`/profile`(기존 북마크 보존). 반영: §2, §3.3, AC-4.
- **[RESOLVED] q5 — PR 분할 → (a) 2-PR.** PR1 계좌 이전 / PR2 홈+nav·사이드바. 반영: §8.2, 헤더.
- **[RESOLVED] q6 — UX/UI 디자이너 합류 → (a) 합류.** 다음 단계 = 디자이너 DESIGN.md → 구현. 반영: 헤더.
- **[RESOLVED] 검토① — 마이페이지 보유종목 → 전체 테이블**(Top3 아님). 반영: §3.1, AC-2.
- **[RESOLVED] 검토② — 공포·탐욕 지수 명칭 → "공포·탐욕 지수" 사용 + 추천 해석 강조**(위 q1 에 통합).
- **[RESOLVED] 검토④ — PR 분할 → 2-PR**(위 q5 와 동일).

---

산출물: `docs/prd/home-market-redesign.md`
