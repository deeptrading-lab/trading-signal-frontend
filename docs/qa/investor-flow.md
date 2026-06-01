# QA 리포트 — 수급(외국인·기관 순매수) 2표면 통합 (investor-flow)

> 대상 브랜치: `feature/investor-flow` · 커밋 `9269d30` · 판정일 2026-06-02
> PRD: `docs/prd/investor-flow.md`(AC-1~12) · DESIGN: `docs/design/investor-flow.md`
> 환경: dev(Next 16.2.6 Turbopack, `:3100`) · KIS `.env.local` 설정(`KIS_ENV=prod`, APP_KEY/SECRET set) → **표면 A·B 라이브 KIS 응답 확인됨**
> 판정: **qa-passed** (실패 0건 · 마이너 관찰 2건 비차단)

---

## 1. 공통 품질 게이트 (실측)

| 항목 | 명령 | 결과 |
|---|---|---|
| typecheck | `npx tsc --noEmit` | **exit 0** · `error TS` 0건(.next 제외) |
| lint | `npx eslint`(신규/수정 12 경로) | **exit 0** · 0 warning |
| test | `npx vitest run` | **exit 0** · Test Files 30 passed / **Tests 189 passed** |
| build | `npm run build` | **exit 0** · `ƒ /api/flow/top10` · `ƒ /api/stock/investors` 라우트 등록 확인 |
| design:sync 멱등 | `npm run design:sync` → `git diff tailwind.theme.json` | **drift 0**(재생성 후 diff 없음) |

### BFF 단일진입 무회귀

- `git grep -nE "http://127\.0\.0\.1" -- app/ components/ hooks/ lib/` → 신규 파일 0건. 검출된 3건은 모두 기존 route handler fallback(`app/api/whitelist/search/route.ts`, `app/api/workbench/_adapters/fastapi.ts`)으로 예외 허용 대상.
- 신규 클라이언트 코드 직접 `fetch(` **0건**. `components/flow/InvestorFlowTop10Card.tsx:72`의 `prefetch(row.ticker)`는 `usePrefetchStockDetail` 훅 함수 호출(=`fetch`가 아님).
- KIS 직접 호출은 `lib/api/kis/investor-flow.ts` + route handler 내부로 격리.
- 화면 컴포넌트 `useQuery` 직접 import **0건**(도메인 훅 `useQueryFlowTop10`/`useQueryStockInvestors`만 소비).

### 한글 톤 무회귀

- `lib/copy/flow/labels.ts`·`lib/copy/stock/investors.ts` 사용자 노출 문구 중 영문 0건(고유 라벨 "Top10" 외). ticker·종목명·API 필드는 데이터, 단위("억원"·"주")는 포맷터 책임.

### 접근성 무회귀

- 표면 A 행: `role="row"` + `tabIndex={0}` + `aria-label="<종목명> 상세 보기"` + `onKeyDown`(Enter/Space → 이동). 리스트 `role="list"`, 더보기 토글 `aria-expanded`, 에러 `role="alert"`, 로딩 `aria-busy`/`sr-only`.
- 표면 B: `<thead>/<th>` 시맨틱 표, 로딩 `aria-busy`, 에러 `role="alert"`, 섹션 `aria-label`.

---

## 2. AC별 검증 표

| AC | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| **AC-1** 표면 A 렌더 | `git grep "InvestorFlowTop10\|순매수" components/home components/flow` + `/api/flow/top10` 호출 | 홈에 외인·기관 Top10, 거래대금 정렬 최대 10행, 종목명·현재가·전일대비·순매수금액+수량 | `MarketOverviewPage.tsx:48`에 `<InvestorFlowTop10Card/>` 마운트. 라이브 응답 외국인 10행·기관 10행, `netBuyAmount` 내림차순 정렬 True, 각 행 종목명/코드/현재가/등락/금액+수량 정상 | ✅ |
| **AC-2** 표면 B 렌더 | `git grep "prsn_ntby\|frgn_ntby\|orgn_ntby" lib/api/kis/investor-flow.ts` + `/api/stock/investors?ticker=005930` | 개인/외국인/기관 3주체 일자별 순매수 최근 N일 | 3주체 매핑(`personNetBuyAmount/Qty`·`foreign*`·`org*`) 모두 존재. 라이브 응답 15일, 각 일자 3주체 금액·수량 정상 | ✅ |
| **AC-3** BFF 단일진입 | `find app/api -path '*flow*/route.ts' -o -path '*investors*/route.ts'` + 클라 `fetch(` grep | route 2개 존재, 클라 직접 `fetch(` 0 | `app/api/flow/top10/route.ts`·`app/api/stock/investors/route.ts` 존재. 클라 직접 fetch 0건 | ✅ |
| **AC-4** 표면 A mock 이중게이트 | `KIS_ENV=demo`로 dev 기동 → `/api/flow/top10` | `isKisConfigured()&&prod` 미충족 시 `X-Data-Source: mock` | demo(vts) env → `HTTP 200` + `x-data-source: mock` + `x-kis-env: vts`, mock 10행(삼성전자). prod env → `x-data-source: kis` | ✅ |
| **AC-5** 표면 B mock fallback | `?ticker=`(빈) + `KIS_ENV=demo` | 미설정 시 mock, 설정 시 실호출, 빈 화면 방지 | 빈 ticker → `x-data-source: mock`. demo env(isKisConfigured 충족) → `x-data-source: kis`(느슨 게이트, env 무관 실호출) | ✅ |
| **AC-6** 상태 분기 | 코드 분기 + malformed ticker 호출 | loading/empty/error(/mock) 4상태, 흰 화면 없음 | 두 컴포넌트 모두 isLoading/isError/empty 분기 보유. `?ticker=ZZZ999`·`999999` → `{days:[]}` → empty 카피(`STOCK_INVESTORS_EMPTY`) 렌더 | ✅ |
| **AC-7** 반응형·한글 | `git grep "innerWidth\|matchMedia"` + Tailwind prefix 확인 | `lg:grid-cols-2`/세로 스택, innerWidth 0건, 한글 카피 격리 | 신규 컴포넌트 `innerWidth`/`matchMedia` 0건. 표면 A `lg:grid-cols-2` + 모바일 `hidden md:block` Top5 절단. 카피 `lib/copy/`에 격리 | ✅ |
| **AC-8** 종목 이동 | `git grep "usePrefetchStockDetail" components/flow` | 행 클릭 → `/stock/[ticker]` + prefetch | `InvestorFlowTop10Card.tsx:69` `usePrefetchStockDetail` 소비. `go()`에서 `prefetch()`+`router.push("/stock/<ticker>")`. hover/focus `onIntent` | ✅ |
| **AC-9** 당일/최근 N일 명시 | `git grep "당일\|기준\|최근" lib/copy/flow lib/copy/stock/investors.ts` | 표면 A "당일"+"기준 시각", 표면 B "최근 N일" | A: `FLOW_TOP10_TODAY_LABEL="당일"` + `asOfLabel`("기준 HH:MM"). B: `recentDaysLabel(n)="최근 N일(영업일) · 당일치는 장 종료 후 반영"` | ✅ |
| **AC-10** BFF 하드닝 | route 코드 검토 | `withTimeout`/`jsonWithDataSource`/`BFF_TIMEOUT_SENTINEL`/`delay` 재사용 + 주체 2콜 청크/지연 | 두 route 모두 `bffUtils` 재사용. 표면 A 주체 2콜 순차 + `delay(SUBJECT_DELAY_MS=150)`로 EGW00201 회피, 부분성공 degrade(`safeFetch`), timeout→mock-timeout fallback | ✅ |
| **AC-11** 품질 게이트 | typecheck/lint/test + queryKey/Config 단일위치 | 통과 + 단일 위치 | 게이트 통과(§1). `queryKeys.flow.top10()`·`queryKeys.stock.investors(ticker)` 단일 위치. `queryConfig.flow.top10`(60s)·`queryConfig.stock.investors`(5min) 매직넘버 없음 | ✅ |
| **AC-12** 비목표 가드 | `find "app/(main)/supply-demand"` + `git grep navItems` | 독립 페이지 0, nav 0 | `app/(main)/supply-demand` 0건, `navItems.ts` `supply-demand`/`supplyDemand` 0건 | ✅ |

---

## 3. 라운드트립 (BE/KIS LIVE)

> `KIS_ENV=prod` + KIS 키 설정 → 표면 A 이중게이트·표면 B 느슨게이트 모두 라이브 실호출 경로 통과.
> FastAPI(`127.0.0.1:8000`)는 본 기능과 무관(KIS 직접 도메인) — health 미응답은 본 PR 시나리오에 영향 없음.

### 표면 A — `/api/flow/top10` (prod, LIVE)

```
HTTP/1.1 200 OK
x-data-source: kis
x-kis-env: prod
```
- foreign 10행 / institution 10행, `asOf` ISO 세팅됨.
- `foreign[0]`: 삼성전자(005930) 가 350,000원대, 등락 +10.09%, netBuyAmount 383,551(백만원), netBuyQty 1,099,000주.
- 거래대금 내림차순 정렬 검증 **True** `[383551, 303952, 133002, 79695, 79660]`.

### 표면 B — `/api/stock/investors?ticker=005930` (prod, LIVE)

```
HTTP/1.1 200 OK
x-data-source: kis
x-kis-env: prod
```
- `days` 15건(MAX_DAYS=15 절단 검증), 최신 [0] = 2026-06-01, [-1] = 2026-05-11.
- `days[0]` 개인 -1,087,601 / 외국인 -41,530 / 기관 +1,289,918(백만원) — **음수(순매도) 부호 보존 확인**, 15일 모두 음수 포함 일자 존재.

### 게이트 분기 (demo env 시뮬, `KIS_ENV=demo`)

- 표면 A → `x-data-source: mock` + `x-kis-env: vts` (이중게이트 prod 미충족 → mock 10행). 정상.
- 표면 B → `x-data-source: kis` + `x-kis-env: vts` (느슨게이트 — isKisConfigured만 충족하면 env 무관 실호출). 정상.

### SSR 렌더 스모크

- `/` HTML → "시장 종합" + "외국인·기관 순매수 Top10" 텍스트 노출(표면 A 카드 마운트).
- `/stock/005930` HTML → "수급 (개인·외국인·기관)" 텍스트 노출(표면 B 섹션 마운트).

### 단위 환산 정확성 (formatNetBuy, ad-hoc tsx)

| 입력(백만원) | 출력 | 비고 |
|---|---|---|
| 383,551 | `+3,836억원` | 라이브 외국인 삼성값, /100 반올림 정확 |
| 874,310 | `+8,743억원` | 라이브 기관값 |
| -41,530 | `-415억원` | 음수 부호 보존(파랑 토큰) |
| 50 | `+0.5억원` | 1억 미만 소수 1자리 |
| 0 | `0.0억원` | 부호 없음, `text-muted` |
| NaN | `-` | NaN 방어 |

수량: `+1,099,000주` / `-180,865주` / `0주` / `-`(NaN). 부호·천단위 콤마 정확.

---

## 4. 반응형 2뷰포트

> 두 표면 모두 Tailwind 반응형 prefix 1차(`lg:grid-cols-2`, `md:hidden`/`hidden md:block`) + JS는 `useBreakpoint`(StockPageLayout). `window.innerWidth`/`matchMedia` 직접 검사 0건.

### 데스크탑(1280)

1. 표면 A 카드 내부 `lg:grid-cols-2` — 좌 외국인 / 우 기관 병치, 각 Top10 전체 노출.
2. 표면 A 행 `grid-cols-[auto_1fr_auto]` — [순위배지][종목명+코드+현재가][금액+수량+등락] 정렬.
3. 표면 A "더보기" 토글 `md:hidden` → 데스크탑 미노출(Top10 항상 전체).
4. 표면 B 합계 3칸 `grid-cols-3` + 일자별 표 `min-w-[520px]` 카드 폭 내 표시. StockPageLayout 데스크탑은 수급 섹션을 2-col 밖 전폭 배치(`StockPageLayout.tsx:91,112`).
5. 표면 B 표 헤더 `flow-table-header`, 종가 부호색(`closeClass`) 적용.

### 모바일(375)

1. 표면 A `grid-cols-1` 세로 스택(외국인 → 기관 순). DESIGN R3 정합.
2. 표면 A 각 주체 Top5 절단(`MOBILE_TRUNCATE=5`) + Top5 초과 행 `hidden md:block` → 모바일에서 숨김.
3. 표면 A "더보기"(`FLOW_TOP10_SHOW_MORE`) 토글 → `expanded` state로 Top10 확장, "접기"로 복귀. `aria-expanded` 동기화.
4. 표면 B 일자별 표 `overflow-x-auto` + `min-w-[520px]` → 가로 스크롤(컬럼 압축 없음, 정확도 유지).
5. 모바일 StockPageLayout(`isMobile`)은 표면 B를 `collapsible` 카드로 마운트(기본 접힘) — SSR hydration 시 hydration 불일치 없음(typecheck/build 0 에러).

---

## 5. 에지 케이스

| 케이스 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| malformed ticker | `?ticker=ZZZ999` | 빈 화면 방지 | KIS rt_cd 0 + 빈 output → `{days:[]}` → empty 카피 | ✅ |
| 존재하지 않는 종목 | `?ticker=999999` | 빈 화면 방지 | `{days:[]}` → empty 분기 | ✅ |
| 빈 ticker | `?ticker=` | mock fallback | `x-data-source: mock` | ✅ |
| NaN 금액 입력 | `formatNetBuyAmount(NaN)` | "-" 방어 | "-" 반환, throw 없음 | ✅ |
| 비-prod env | `KIS_ENV=demo` | 표면 A mock 게이트 | mock 분기 정상 | ✅ |
| 음수(순매도) | 라이브 days[0] 개인/외국인 음수 | 부호 보존 + 파랑 토큰 | 음수 보존, `netbuy-amount-down`(signal-down) 적용 | ✅ |
| 타임아웃 degrade | 코드 분기 | mock-timeout fallback | 두 route `BFF_TIMEOUT_SENTINEL` → mock-timeout + 한글 안내 | ✅(코드 검증) |
| collapsible 접힘 쿼리 미실행 | `CollapsibleCard` defaultOpen=false | 접힘 시 Content 미마운트 → 쿼리 0 | `{open && children}`로 접힘 시 `StockInvestorTrendContent`(쿼리 보유) 미마운트 → `useQueryStockInvestors` 미실행. #79 패턴 정합 | ✅ |
| StrictMode 더블 마운트 | dev 기동 | 중복 KIS 호출 폭주 없음 | `retry:0` + `refetchOnWindowFocus:false`로 호출 증폭 방지 | ✅ |
| Tailwind preflight 잔여 | 신규 합성 토큰 | hex/px 직타 0 | `app/components.css` 신규 토큰 모두 `@apply` 기존 토큰 참조. `min-w-[520px]`·`w-6`는 일회성 one-off(토큰 미신설로 design:sync drift 회피, DESIGN.md 주석 명시) | ✅ |

---

## 6. DESIGN.md 토큰 라이브 동기화 검증

> investor-flow.md 는 "신규 색·spacing 토큰 0"으로 finsight-redesign 토큰 셋을 재사용하는 가이드 문서(front matter 명시). `design:sync` 단일 진실 원천은 `docs/design/finsight-redesign.md`. 따라서 라이브 토큰 검증은 finsight-redesign.md 의 `signal-up`(신규 컴포넌트 `netbuy-amount-up`/`signal-up-text`가 소비)로 수행.

1. `docs/design/finsight-redesign.md` `signal-up: "#c81e1e"` → `"#00ff00"` 임시 변경.
2. `npm run design:sync`(exit 0) → `tailwind.theme.json` `"signal-up": "#00ff00"` 반영 확인.
3. `npm run build`(exit 0) → 산출 CSS `.next/static/chunks/08i_z9c_3s3~d.css`에 `#00ff00` 검출 — 신규 수급 컴포넌트의 부호색 토큰이 라이브 반영됨.
4. `git checkout docs/design/finsight-redesign.md` → `npm run design:sync` → `"signal-up": "#c81e1e"` 복원. **잔여 변경 0**(완전 복원).

> 참고: 처음 investor-flow.md 의 signal-up 을 변경했을 때 theme.json 미반영을 확인 → sync source 가 finsight-redesign.md 임을 확인하고 올바른 source 로 재검증. investor-flow.md 도 git checkout 으로 복원 완료(잔여 0).

---

## 7. 마이너 관찰 (비차단)

- **M1** — `formatNetBuyAmount(0)` → `"0.0억원"`(소수 1자리). 0은 부호 없이 `text-muted`로 처리되어 기능·시각 문제 없음. 정수 "0억원"이 더 깔끔할 여지(선택).
- **M2** — mock(`lib/mock/flow/top10.ts`)의 `netBuyQty = netBuyAmount * 1_000_000 / price` 환산은 도메인 단위(백만원)와 1:1 정합은 아니나, mock은 개발·preview 레이아웃 검증용 가짜 데이터이고 라이브 경로(prod)에선 미사용 → 사용자 영향 0. (reviewer 영역 — 참고만.)

이 둘은 AC 위반이 아니며 판정에 영향 없음.

---

## 8. 판정

- 공통 게이트(typecheck/lint/test/build/design:sync 멱등) 전부 통과.
- BFF 단일진입·한글 톤·접근성 무회귀.
- AC-1~12 전부 통과. 라이브 KIS(표면 A·B 모두 `x-data-source: kis`) 라운드트립 성공.
- 에지 8건·반응형 2뷰포트·DESIGN 토큰 라이브 동기화 통과.

**결과: qa-passed (실패 0건)**
