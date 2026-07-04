# PRD — toss-orderbook (토스 호가창: 공용 OrderbookPanel + BFF 프록시, /intraday·/stock 배선)

- 슬러그: `toss-orderbook`
- 상태: 기획 (impl 전)
- 작성: 2026-07-04 (PM 역할)
- 브랜치: `feature/toss-orderbook`
- 관련:
  - `docs/prd/toss-market-data-adapter.md` — 토스 어댑터 기반(`tossGet`·`isTossConfigured`·토큰 인프라)
  - `docs/prd/stock-warnings.md` / `docs/prd/intraday-warnings.md` — "토스 전용(KIS 폴백 없음) 조회 API" 선례. 본 PRD 는 이 패턴을 그대로 답습한다.
  - `docs/prd/intraday-scalping-agent.md` — 단타 판단품질 백로그(호가는 그 보강 입력)
- **UI 포함: yes** (신규 공용 컴포넌트 `OrderbookPanel` + 두 지면 배선. UX/UI 디자이너 합류 트리거)

## 1. 배경 / 문제

토스 Open API 에 `GET /api/v1/orderbook`(호가창, 매수/매도 잔량)이 있는데 현재 레포는 미사용이다. 우리 제품은 조회·분석 전용(주문 API 영구 미구현 — `project_read-only-analysis-scope`)이라 호가를 **주문용이 아니라 판단·조회 정보**로 쓴다:

- **단타 판단품질(우선순위 높음)**: 단타워치는 586틱 전부 HOLD·매수 0 이라는 캘리브레이션 백로그를 안고 있다(거래량 과대추정·목표 천장이 신고가 추격). 호가 잔량 불균형(매수벽/매도벽)과 스프레드는 진입·이탈 타이밍의 직접 신호인데, 현재 단타 컨텍스트엔 시그널·레벨·경보만 있고 **호가가 없다**.
- **종목 상세 정보 확충**: `/stock/[ticker]` 는 현재가·일봉·수급·경보를 보여주지만 매수/매도 잔량(수급의 순간 압력)을 못 본다. 토스 앱 사용자에게 익숙한 호가창이 빠져 있다.

기존 토스 어댑터(`lib/api/toss/`)는 `warnings.ts` 로 "토스 전용·never-throw·캐시" 조회 패턴이 정착됐다. 호가는 그 패턴 위에 새 `orderbook.ts` 하나를 추가하면 자연스럽게 붙는다.

⚠️ **미확인 사실**: 토스 orderbook 응답 스키마(호가 단계 수·잔량/건수 필드명·국내/미국 공통 여부)를 아직 실측하지 않았다 — §9 OPEN QUESTION 참조. 본 PRD 는 "10단계·매수/매도 잔량·총잔량" 이라는 국내 관행을 가정하되, 구현 착수 전 스모크 실측으로 타입을 확정하는 것을 AC 에 포함한다.

## 2. 목표 (측정 가능)

1. `GET /api/stock/orderbook?ticker=` BFF 가 매수/매도 호가 단계 배열·총잔량·스프레드를 정규화 스키마로 반환한다 (`X-Data-Source: toss|none`).
2. 공용 `OrderbookPanel` 컴포넌트가 `/intraday`(단타워치)와 `/stock/[ticker]`(종목 상세) **양쪽에서 동일 컴포넌트로** 렌더된다 (재사용 1개, 지면별 props 만 차이).
3. 호가 10단계가 매수/매도 잔량 바로 시각화되고, 스프레드·총잔량 요약이 표시된다.
4. **토스 키 없는 로컬(동료 머신)에서 동작 무변경**: 패널 미표시(또는 "미지원" 안내), 폴링 무발생, 에러·로그 소음 0.
5. 장 마감·미지원 종목(빈 호가)에서 크래시 없이 "호가 없음" 상태로 디그레이드.

## 3. 범위 (In scope)

### 3-1. 토스 어댑터 `lib/api/toss/orderbook.ts` (신규)

- `fetchOrderbook(symbol): Promise<Orderbook>` — **never-throw**. `warnings.ts` 패턴 그대로:
  - `isTossConfigured()` false → 즉시 빈 호가(`{ bids: [], asks: [], ... }`).
  - 404(종목 없음)·5xx·네트워크·빈 응답 전부 빈 호가로 수렴(실패 캐시).
  - 심볼 검증은 `isValidWarningsSymbol` 와 동일 규칙(`^[A-Za-z0-9.\-]{1,20}$` + 영숫자 1자↑)을 공유 유틸로 추출하거나 동형 함수로 둔다.
- 캐시 TTL **성공 3s·실패 10s + single-flight**(호가는 warnings 의 60s 보다 훨씬 빨리 변함 — §8 참조). 캐시 상한 512·오래된 키 축출(`warnings.ts` `setCache` 답습).
- `tossGet<TossOrderbook>` 재사용(단일 진입·429/401 재시도 무료 상속). KIS 폴백 **없음**(대응 KIS TR 미사용) — 모듈 주석에 "토스 전용 두 번째 사례" 명시.
- 정규화: 토스 원본 → 앱 표준 `Orderbook`(§6 스키마). 잔량 0 단계·null 필드 방어.

### 3-2. 타입 `lib/types/stock/orderbook.ts` (신규)

- 앱 표준 `Orderbook` = `{ bids: OrderbookLevel[]; asks: OrderbookLevel[]; totalBidQty: number; totalAskQty: number; spread: number | null; spreadPct: number | null; updatedAt: string | null; isEmpty: boolean }`.
- `OrderbookLevel` = `{ price: number; qty: number; count?: number | null }`(건수는 스키마에 있으면 채우고 없으면 omit).
- 토스 원본 타입 `TossOrderbook` 는 `lib/api/toss/types.ts` 에 추가(실측 후 필드 확정).

### 3-3. BFF route `app/api/stock/orderbook/route.ts` (신규)

- `GET ?ticker=` → `{ orderbook: Orderbook }`, `X-Data-Source: toss|none`(`warnings/route.ts` 헤더 관례).
- ticker 형식 검증 실패 400. 그 외 실패(토스 장애·404)는 200 + 빈 호가(fail-soft). 키 없으면 200 + 빈 호가 + `X-Data-Source: none`.
- 서버 유틸(`jsonWithDataSource` 등 기존 `lib/server`) 재사용.

### 3-4. 클라이언트 + 훅 `lib/api/stock/orderbook.ts` · `hooks/query/useQueryStockOrderbook.ts` (신규)

- `getStockOrderbook(ticker)` — axios(`lib/api/client.ts`, baseURL `/api`).
- `useQueryStockOrderbook(ticker, { enabled, refetchInterval })` — TanStack Query.
  - queryKey: `queryKeys.stock.orderbook(ticker)` (`hooks/query/queryKeys.ts` 단일 위치에 추가).
  - `staleTime`·`refetchInterval` 은 **지면별 주입**(폴링 주기 결정 = §9 q3): 단타 짧게·종목상세 길게. staleTime 기본값은 `queryConfig.stock.orderbook` 단일 위치.
- 폴링은 문서 가시성(`document.hidden`) 시 자동 멈춤 — TanStack `refetchIntervalInBackground` 기본 false 로 자연 해결.

### 3-5. 공용 UI `components/stock/OrderbookPanel.tsx` (신규)

- props: `ticker`, `variant?: "compact" | "full"`(단타=compact·상세=full), 필요 시 `maxLevels`.
- 내부에서 `useQueryStockOrderbook` 호출(자족 컴포넌트 — `StockWarningBadges` 처럼 지면은 배치만).
- 렌더:
  - 매도 호가(위, 빨강 계열)·매수 호가(아래, 파랑 계열) 각 최대 10단계. 각 단계 = 가격 + 잔량 + **잔량 비례 배경 바**(max 잔량 기준 정규화 폭).
  - 헤더/푸터 요약: 총매수잔량·총매도잔량, 스프레드(호가·%).
  - 상태: 로딩(스켈레톤)·빈 호가("호가 없음"/장 마감)·키 없음("미지원") 분기. 데이터 없으면 레이아웃 무붕괴.
- 색·간격은 디자인 토큰만(hex/px 직타 금지). 한글 카피는 `lib/copy/stock/orderbook.ts` 단일 위치. `cn` 헬퍼 사용. 반응형은 Tailwind prefix + `useBreakpoint`(직접 innerWidth 금지).

### 3-6. 지면 배선

- **`/stock/[ticker]`**: 종목 상세에 `OrderbookPanel variant="full"` 배치(차트·수급 인접). 폴링 느슨(§9 q3 권고).
- **`/intraday`**: 단타워치에서 선택 종목의 `OrderbookPanel variant="compact"` 배치(워크스페이스/디테일 시트). 폴링 촘촘.
- 배선은 표시 전용 추가 — 기존 로딩/에러 분기 유지, 패널은 데이터 있을 때만 실질 렌더.

## 4. 비범위 (Out of scope)

- **② market-calendar / KR(장 개폐·휴장일)** — 별도 PRD. 본 PRD 는 장 마감 판정을 "빈 호가 응답"으로만 처리하고 캘린더로 사전 판정하지 않는다.
- **③ trades(체결 내역·틱)** — 별도 PRD.
- **호가 기반 단타 판단 컨텍스트 주입**(호가를 LLM 프롬프트/게이트에 넣어 매수벽 판단) — 후속 PRD. 본 PRD 는 **조회·표시 + 데이터 계층까지만**. (단, `fetchOrderbook` 을 재사용 가능하게 순수하게 짜서 후속 주입 PR 이 바로 얹도록 한다.)
- **KIS 호가 폴백**(대응 TR: 실시간호가 `FHKST01010200` 등) — 토스 전용으로 시작(§8). 필요 시 후속.
- **미국/크립토 호가** — 어댑터는 심볼 무관 설계로 두되 UI 노출은 국내에 한정.
- **실시간 웹소켓 스트리밍** — 폴링으로 시작(토스 REST 폴링). 웹소켓은 후속.
- **관심종목(watchlist) 행 호가 미니뷰** — 후속.

## 5. 수용 기준 (AC)

QA 가 표로 검증. `variant` 별·뷰포트별 재현.

| # | 시나리오 | 재현 | 기대 |
|---|---|---|---|
| AC-0 | 응답 스키마 실측 | 스모크 스크립트로 실 종목 orderbook 1콜 | 필드명·단계 수·국내/미국 스키마를 `TossOrderbook` 타입/§6 에 반영(추정으로 머지 금지) |
| AC-1 | 토스 키 없음(동료 로컬) | `.env.local` 무 TOSS 키 + `/stock/[ticker]`·`/intraday` 진입 | 패널 "미지원" 또는 미표시, 폴링 0콜, 에러 로그 0, 기존 화면 무회귀 |
| AC-2 | 정상 호가(장중) | 유동 종목(005930 등) 상세 진입 | 매도 10 + 매수 10 단계, 각 가격·잔량·잔량 비례 바, 총잔량·스프레드 표시 |
| AC-3 | 잔량 바 시각화 | AC-2 화면 | 최대 잔량 단계 = 최장 바, 잔량 0 단계 = 바 없음(가격만), 폭이 잔량 비례 |
| AC-4 | 스프레드/총잔량 | AC-2 화면 | 스프레드 = 최우선 매도−최우선 매수(호가·%), 총매수/총매도잔량 합 표기 |
| AC-5 | 장 마감/빈 호가 | 장외 시간 or 빈 응답 종목 | "호가 없음"(장 마감) 상태, 크래시·NaN 없음, 레이아웃 유지 |
| AC-6 | 미지원/미존재 종목 | 없는 ticker / 404 | 200 + 빈 호가 fail-soft, 패널 빈 상태, 화면 진행 무영향 |
| AC-7 | 양 지면 렌더 | `/stock/[ticker]` + `/intraday` 각각 | 동일 `OrderbookPanel` 컴포넌트(`git grep OrderbookPanel` = 두 지면 import), variant 만 상이 |
| AC-8 | 폴링 주기 | 두 지면에서 network 관찰 | 단타(compact) refetchInterval < 상세(full). 백그라운드 탭 = 폴링 멈춤 |
| AC-9 | 캐시/single-flight | 3s 내 동일 ticker 재요청 | 토스 1콜(성공 3s 캐시·동시요청 single-flight) |
| AC-10 | 반응형 두 뷰포트 | 모바일·PC | 양 뷰포트에서 호가 표 정렬·바 폭·요약 깨짐 없음(`md:`/`lg:` + `useBreakpoint`) |
| AC-11 | 컨벤션 정합 | `git grep` | hex/px 직타 0(`components/stock/OrderbookPanel.tsx`), 한글 카피는 `lib/copy/stock/orderbook.ts`, queryKey 는 `queryKeys.ts` 단일 위치, 클라 `fetch(` 직접호출 0 |

## 6. 데이터 / API (실측 전 가정 — AC-0 로 확정)

- `GET https://openapi.tossinvest.com/api/v1/orderbook` (파라미터·경로형 `?symbol=` vs `/{symbol}` 미확인 — 실측). `tossGet` 이 `{result}` 언래핑.
- **가정 스키마**(실측으로 교체): 매수/매도 각 10단계 `{ price, quantity, orderCount? }` 배열 + 총잔량 필드. 국내 관행 10단계. 미국은 스키마 상이·null 가능성(warnings/`/stocks` 선례상 미국은 일부 필드 null).
- 정규화 규칙: 잔량 0·null 방어, 가격 오름/내림차순 정렬 보장, 스프레드 = 최우선호가 차(양쪽 존재 시만, 아니면 null), 총잔량은 응답값 우선·없으면 단계 합산.

## 7. 가정 · 제약 · 참고

- 선행: 토스 어댑터(`toss-market-data-adapter`)·`tossGet`·토큰 인프라 머지 완료(현 main 반영됨).
- prod 는 TOSS env 미설정이라 배포돼도 dormant(빈 호가 경로) — 활성화는 TOSS 키 등록만으로 가능, `MARKET_DATA_SOURCE` 와 **독립**(`isTossConfigured` 게이트만).
- 단타 루프는 로컬 CLI 전용(Vercel 서버리스 미지원)이나, 단타 **화면** 자체는 prod 접근 가능 — 패널 표시는 prod 에서도 키 등록 시 동작.
- 레이트리밋: 토스 그룹 정책(warnings=`STOCK` 5/s 선례). 호가 폴링은 캐시로 콜 수 억제(§8).
- 참고: `lib/api/toss/warnings.ts`(패턴 원본), `lib/api/toss/client.ts`(`tossGet`), `components/stock/StockWarningBadges.tsx`(자족 컴포넌트 선례), `hooks/query/queryKeys.ts`, `docs/rules/frontend.md`.

## 8. 영향 분석

- **변경 라인 추정**: 신규 파일 6~7개(어댑터·타입·BFF·클라·훅·UI·카피) + 배선 2지면 + queryKeys/queryConfig/types 소폭 추가. 순수 add-only 성격이 강해 회귀면적 작음. 대략 400~600 라인(UI 상태 분기·정규화 로직 포함).
- **커밋 분할 권고**: (a) 어댑터+타입+BFF+클라+훅(데이터 계층), (b) `OrderbookPanel` UI + 카피, (c) 두 지면 배선. 디자이너 DESIGN.md 커밋이 (b) 앞에 선행.
- **MARKET_DATA_SOURCE 토글과의 관계**: warnings 선례대로 **토스 전용·`isTossConfigured` 게이트만** 사용(토글 무관). KIS 폴백은 두지 않음 — 이유: KIS 실시간호가 TR 은 야간점검 500·prod 전용 제약(`reference_kis-api-conventions`)이 있어 fail-soft 부가정보 경로에 이중비용. 필요 시 후속에서 폴백 추가.
- **실시간성 / 폴링 주기**: 호가는 초 단위로 변한다. warnings(60s)와 달리 캐시 TTL 을 **성공 3s**로 짧게. 폴링은 지면별 refetchInterval(단타 촘촘·상세 느슨, §9 q3). 백그라운드 탭은 폴링 정지(비용·레이트 보호).
- **장 마감 처리**: 캘린더 없이 "빈 호가 응답 = 마감/비활성"으로 표시 처리(별도 PRD 의존 회피). 오탐(장중 일시 빈 응답)은 fail-soft 상태로 흡수.
- **성능**: prices 대비 페이로드 큼(20단계 × 필드). 3s 캐시 + single-flight + 백그라운드 정지로 콜 수 억제. 단타 다종목 동시 표시 시 콜 폭주 우려 → 초기엔 **선택 1종목만** 패널 렌더(다종목 미니 호가는 비범위).
- **회귀 위험 낮음**: 기존 라우트/훅 시그니처 무변경, 순수 add. 유일 공유 편집 지점 = `queryKeys.ts`·`queryConfig`·`lib/types/stock`·`lib/api/toss/types.ts`(모두 add).

## 9. OPEN QUESTION

- **[OPEN QUESTION] q1. 토스 orderbook 응답 스키마 미실측** — 호가 단계 수(10단계 여부), 잔량/건수 필드명(quantity/remainQty·orderCount 유무), 국내/미국 공통 스키마 여부, 총잔량·스프레드 제공 여부, 경로형(`/{symbol}` vs `?symbol=`). **PM 권고: 구현 착수 전 스모크 스크립트(`scripts/tossSmokeTest.mjs` 확장 or 신규)로 실 종목 1콜 실측 후 `TossOrderbook` 타입·§6 확정(AC-0). 추정 타입으로 머지 금지.** 미국은 `/stocks`·prices 선례상 필드 null 가능성 높음 — null 방어를 기본값으로.
- **[OPEN QUESTION] q2. KIS 폴백 유무** — 토스 전용 vs KIS 실시간호가 TR 폴백. **PM 권고: 토스 전용으로 시작(warnings 선례·`isTossConfigured` 게이트). KIS 호가 TR 은 야간점검·prod 전용 제약으로 fail-soft 부가정보에 부적합. 후속에서 필요 시 폴백 추가.**
- **[OPEN QUESTION] q3. 폴링 주기 값** — 단타(compact)·상세(full) refetchInterval 구체값. **PM 권고: 단타 3s(캐시 TTL 과 정렬), 상세 10s. 백그라운드 탭 정지. 실사용·레이트 관찰 후 조정.**
- **[OPEN QUESTION] q4. 단타 화면 다종목 동시 호가** — 워치표 여러 종목 미니 호가를 동시 표시할지. **PM 권고: 본 PRD 는 선택 1종목만. 다종목 동시는 콜 폭주·레이트 리스크로 비범위(후속에서 배치·간헐 폴링 설계).**
- **[OPEN QUESTION] q5. 잔량 바 정규화 기준** — 매수·매도 통합 max 로 정규화 vs 각각 독립 max. **PM 권고: 매수/매도 통합 최대 잔량 기준(양쪽 벽 크기 비교가 판단에 유익 — 매수벽 vs 매도벽 시각 대비).**
