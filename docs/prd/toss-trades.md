# PRD — toss-trades (토스 체결: 틱룰 체결강도 파생 + 체결 테이프 UI, /intraday·/stock 배선)

- 슬러그: `toss-trades`
- 상태: 기획 (impl 전)
- 작성: 2026-07-05 (PM 역할)
- 브랜치: `feature/toss-trades`
- 시리즈: 토스 Open API 배선 ③ (① `toss-orderbook` #243 머지 완료 · ② `toss-market-calendar` 진행)
- 관련:
  - `docs/prd/toss-orderbook.md` — 시리즈 ①. 본 PRD 는 그 형식·톤·"토스 전용·never-throw·`isTossConfigured` 게이트·single-flight·성공 3s 캐시" 패턴을 그대로 답습한다. `OrderbookPanel` 과 **시각 정합**을 맞춘다.
  - `docs/prd/toss-market-calendar.md` — 시리즈 ②. `useMarketStatus().isRegularOpen` 폴링 게이트 후속 통합 정책 공유.
  - `docs/prd/toss-market-data-adapter.md` — 토스 어댑터 기반(`tossGet`·`isTossConfigured`·토큰 인프라)
  - `docs/prd/stock-warnings.md` — "토스 전용(KIS 폴백 없음) 조회 API" 선례
  - `docs/prd/intraday-scalping-agent.md` / `project_intraday-paper-watch` — 단타 판단품질 백로그(체결강도는 그 보강 입력)
- **UI 포함: yes** (신규 공용 컴포넌트 `TradeStrengthPanel`(체결강도 게이지 + 체결 테이프) + 두 지면 배선. UX/UI 디자이너 합류 트리거)

## 1. 배경 / 문제

토스 Open API 에 `GET /api/v1/trades`(최근 체결 배열)가 있는데 현재 레포는 미사용이다. 우리 제품은 조회·분석 전용(주문 API 영구 미구현 — `project_read-only-analysis-scope`)이라 체결을 **주문용이 아니라 판단·조회 정보**로 쓴다:

- **단타 판단품질(우선순위 높음)**: 단타워치는 586틱 전부 HOLD·매수 0 이라는 캘리브레이션 백로그를 안고 있다(거래량 과대추정·목표 천장이 신고가 추격). 체결강도(매수 체결 vs 매도 체결 비중)와 체결 흐름(테이프)은 순간 수급 압력을 읽는 직접 신호인데, 현재 단타 화면엔 시그널·레벨·경보·호가(#243)만 있고 **체결 흐름이 없다**.
- **종목 상세 정보 확충**: `/stock/[ticker]` 는 현재가·일봉·수급·경보·호가(#243)를 보여주지만 **체결이 어느 쪽으로 밀리는지**(매수 우위 / 매도 우위)를 못 본다. 토스 앱 사용자에게 익숙한 체결강도·체결 테이프가 빠져 있다.

기존 토스 어댑터(`lib/api/toss/`)는 `warnings.ts`·`orderbook.ts` 로 "토스 전용·never-throw·캐시·single-flight" 조회 패턴이 정착됐다. 체결은 그 패턴 위에 새 `trades.ts` 하나를 추가하면 자연스럽게 붙는다(호가와 실시간성이 동일 → 성공 TTL 3s 공유).

⚠️ **결정적 한계(선반영)**: 토스 `trades` 응답에는 **매수/매도 방향(side/direction) 필드가 없다**(§6 AC-0 실측 확정). 따라서 "체결강도"는 직접 못 구하고 **틱룰(Lee-Ready 간이)로 파생**한다 — 근사치다. 이 근사 성격을 타입·주석·UI 카피·§9 에 정직하게 명시하는 것이 본 PRD 의 핵심 제약이다(§9 q1).

## 2. 목표 (측정 가능)

1. `GET /api/stock/trades?ticker=` BFF 가 최근 체결 배열 + 틱룰 파생 체결강도(`buyVolume`·`sellVolume`·`strength`)를 정규화 스키마로 반환한다 (`X-Data-Source: toss|none`).
2. 순수 함수 `deriveTradeStrength(trades)` 가 각 체결을 직전 체결가 대비 상승틱=매수·하락틱=매도·동일가=직전분류 상속으로 분류·집계한다 — **유닛 테스트로 상승/하락/동일틱·빈배열·단일체결 경계를 고정**(`npx vitest run lib/api/toss` or 배치 위치 통과).
3. 공용 `TradeStrengthPanel` 이 `/intraday`(compact)와 `/stock/[ticker]`(full) **양쪽에서 동일 컴포넌트로** 렌더된다 (재사용 1개, 지면별 variant/props 만 차이).
4. 체결강도 게이지(매수 vs 매도 비중, 등락색 관례 재사용)와 체결 테이프(최근 N건 가격·수량·시각, 상승/하락틱 색)가 표시되고, **강도가 근사임을 UI 가 과신 없이 안내**한다(§9 q1).
5. **토스 키 없는 로컬(동료 머신)에서 동작 무변경**: 패널 미표시(또는 "미지원" 안내), 폴링 무발생, 에러·로그 소음 0.
6. 장 마감·미지원 종목(빈 체결·직전 세션 스냅샷)에서 크래시 없이 디그레이드.

## 3. 범위 (In scope)

### 3-1. 토스 어댑터 `lib/api/toss/trades.ts` (신규)

- `fetchTrades(symbol, { count? }): Promise<Trade[]>` — **never-throw**. `warnings.ts`/`orderbook.ts` 패턴 그대로:
  - `isTossConfigured()` false → 즉시 빈 배열(`[]`, 키 없음 신호).
  - 404(종목 없음)·5xx·네트워크·빈 응답 전부 빈 배열로 수렴(실패 캐시).
  - 심볼 검증은 orderbook 과 동일 규칙(`^[A-Za-z0-9.\-]{1,20}$` + 영숫자 1자↑) 공유 유틸/동형 함수.
- **파라미터 함정(실측 확정)**: 단수 `?symbol=<sym>` 만 유효 — `?symbols=`(복수)는 **400**. `count=` 파라미터 수용.
- 캐시 TTL **성공 3s**(체결은 초 단위 변동 → orderbook 과 동일)·**실패 짧게(≤10s)** + single-flight. 캐시 상한 512·오래된 키 축출(`warnings.ts` `setCache` 답습). 캐시 키 = `symbol`(+`count`).
- `tossGet<TossTrade[]>` 재사용(`{result}` 언래핑·단일 진입·429/401 재시도 무료 상속). KIS 폴백 **없음**(대응 KIS 체결 TR 미사용) — 모듈 주석에 "토스 전용, side 필드 부재 → 강도는 틱룰 파생" 명시.
- 정규화: 토스 원본 `{ price: string, volume: string, timestamp: string, currency }` → 앱 표준 `Trade`(§6). `price`·`volume` 는 문자열 → `Number` 파싱(NaN 방어). **최신순 가정하되 `timestamp` 로 방어정렬**(§9 q2).

### 3-2. 틱룰 파생(핵심, 순수함수) `deriveTradeStrength(trades)` — `lib/api/toss/tradeStrength.ts` (신규), 유닛 테스트 대상

- 입력: 시간 오름차순으로 정규화된 `Trade[]`(직전 대비 비교 위해 정렬 후 처리). 출력: `TradeStrength`(§6).
- 규칙(Lee-Ready 간이):
  - 각 체결 `t[i]` 를 직전 체결가 `t[i-1].price` 와 비교 — **상승틱(price↑)=매수(buy)·하락틱(price↓)=매도(sell)·동일가(zero-tick)=직전 분류 상속**.
  - 첫 체결(직전 없음)은 중립 처리(강도 집계에서 제외 또는 seed 규칙 — 유닛으로 고정). 전부 동일가 스트림(상속할 직전 분류 없음)은 `strength=null`(불명) 로 방어.
  - 집계: `buyVolume = Σ buy volume`·`sellVolume = Σ sell volume`·`strength = buyVolume / (buyVolume + sellVolume)`(0~1, 1=매수 우위, 분모 0 → `null`).
- **근사치임을 타입/주석에 명시**: 반환 타입에 `isApproximation: true`(또는 `method: "tick-rule"`) 를 포함해 소비처가 "정확한 수급이 아님"을 코드 레벨에서 인지하게 한다. side 필드 부재 사유를 주석·§7 에 기술.
- 각 체결의 파생 분류(`side: "buy"|"sell"|"neutral"`)는 테이프 색칠에 재사용하도록 정규화 `Trade` 에 부착(순수함수가 분류 배열도 반환).
- **유닛 테스트 필수**: 상승만·하락만·동일틱 상속·상승↔하락 혼합·빈배열(`strength=null`, vol 0)·단일체결(분류 seed)·전부 동일가(불명) 경계 고정.

### 3-3. 앱 표준 타입 `lib/types/stock/trade.ts` (신규)

```ts
type TradeSide = "buy" | "sell" | "neutral";
type Trade = {
  price: number;
  volume: number;
  timestamp: string;   // ISO +09:00 (원본 유지)
  currency: "KRW" | "USD" | string;
  side: TradeSide;     // 틱룰 파생 분류(근사)
};
type TradeStrength = {
  buyVolume: number;
  sellVolume: number;
  strength: number | null;   // buyVol/(buyVol+sellVol), 0~1, 분모 0/불명 → null
  method: "tick-rule";       // 파생 방식 표식(근사 명시)
  isApproximation: true;
  sampleCount: number;       // 강도 산출에 쓰인 체결 수
};
type StockTrades = {
  trades: Trade[];           // 표시용(최신순 정렬)
  strength: TradeStrength;
  isEmpty: boolean;
};
```
- 토스 원본 타입 `TossTrade` 는 `lib/api/toss/types.ts` 에 추가(§6 실측 확정 스키마).

### 3-3b. 카피 `lib/copy/stock/trades.ts` (신규)

- 한글 카피 단일 위치: "체결강도"·"매수 우위 %"·"매도 우위 %"·근사 안내 문구("체결 방향 추정치 · 실제 수급과 다를 수 있어요" 톤, §9 q1)·"체결 없음(장 마감)"·"미지원" 등. i18n 여지 유지(`lib/copy/<domain>/`).

### 3-4. BFF route `app/api/stock/trades/route.ts` (신규)

- `GET ?ticker=[&count=]` → `{ trades: Trade[]; strength: TradeStrength; isEmpty: boolean }`, `X-Data-Source: toss|none`(`warnings`/`orderbook` route 헤더 관례·`jsonWithDataSource` 재사용).
- ticker 형식 검증 실패 **400**. `isTossConfigured` false → 200 + 빈 체결(`isEmpty:true`, `strength.strength=null`) + `X-Data-Source: none`. 토스 실패(404·5xx)도 200 + 빈 체결(fail-soft). `withTimeout` 가드 → 초과 시 빈 체결 디그레이드.
- **파생은 서버에서 수행**: route 가 `fetchTrades` → `deriveTradeStrength` 를 호출해 완성 페이로드를 반환(클라 파생 부담 제거·순수함수 서버 테스트 용이). orderbook route 선례.

### 3-5. 클라이언트 + 훅 `lib/api/stock/trades.ts` · `hooks/query/useQueryStockTrades.ts` (신규)

- `getStockTrades(ticker, count?)` — axios(`lib/api/client.ts`, baseURL `/api`). 클라 `fetch(` 직접호출 0.
- `useQueryStockTrades(ticker, { enabled, refetchInterval })` — TanStack Query. (orderbook 쿼리 훅 선례 = `hooks/query/useQueryStockOrderbook.ts` 와 **동일 위치·형태**. 도메인 폴더가 아니라 `hooks/query/` 에 둔다.)
  - queryKey: `queryKeys.stock.trades(ticker)` (`hooks/query/queryKeys.ts` 단일 위치에 추가 — orderbook 바로 옆).
  - `staleTime`·`refetchInterval` 은 **지면별 주입**: 단타(compact) 촘촘·상세(full) 느슨. staleTime 기본값은 `queryConfig.stock.trades`(`lib/query/queryConfig.ts` 단일 위치, orderbook 옆).
  - 폴링은 문서 가시성(`document.hidden`) 시 자동 멈춤 — TanStack `refetchIntervalInBackground` 기본 false 로 자연 해결.
- **폴링 게이팅**: orderbook 훅과 **동일 정책**을 따른다 — 현재 호가 폴링이 `kstMarketHours` 휴리스틱(공휴일 미인지)을 쓰므로 체결도 동일 게이트로 시작하고, `useMarketStatus().isRegularOpen`(캘린더 기반) 통합은 **호가와 함께 후속 일괄**(§8·§9 q3). 방금 머지된 훅을 여기서 갈아타지 않는다(회귀면 회피).

### 3-6. 공용 UI `components/stock/TradeStrengthPanel.tsx` (신규) + 카피

- props: `ticker`, `variant?: "compact" | "full"`(단타=compact·상세=full), 필요 시 `tapeLimit`.
- 내부에서 `useQueryStockTrades` 호출(자족 컴포넌트 — `StockWarningBadges`·`OrderbookPanel` 선례. 지면은 배치만).
- 렌더:
  - **(a) 체결강도 게이지/바**: 매수 vs 매도 비중을 좌우/누적 바로 시각화(매수=상승색·매도=하락색, 등락색 관례 재사용 — `OrderbookPanel` 색 정합). 강도 % 표기(예: "매수 62%"). `strength=null`(불명/빈 체결) → 중립 표기.
  - **(b) 체결 테이프**: 최근 N건 리스트(가격·수량·시각, 상승틱/하락틱 색). compact 10건·full 30건(§9 q2). 최신순 정렬(방어정렬 후).
  - **(c) 근사 안내(필수)**: 게이지에 "추정치" 톤 미세 라벨/툴팁(§9 q1). 정확한 수급으로 오독되지 않게 — 카피는 `lib/copy/stock/trades.ts`.
  - 상태: 로딩(스켈레톤)·빈 체결("체결 없음"/장 마감)·키 없음("미지원") 분기. 데이터 없으면 레이아웃 무붕괴.
- 색·간격은 디자인 토큰만(hex/px 직타 금지). `cn` 헬퍼 사용. 반응형은 Tailwind prefix + `useBreakpoint`(직접 innerWidth 금지). `OrderbookPanel` 과 카드/여백/색 시각 정합.

### 3-7. 지면 배선

- **`/stock/[ticker]`**: 종목 상세에 `TradeStrengthPanel variant="full"` 배치(호가창 `OrderbookPanel` 인접). 폴링 느슨. 배선 지점 = `components/profile/StockPageLayout.tsx`(orderbook 배선 지점 참고).
- **`/intraday`**: 단타워치에서 선택 종목의 `TradeStrengthPanel variant="compact"` 배치(워크스페이스/디테일). 폴링 촘촘. 배선 지점 = `components/intraday/IntradayWatchWorkspace.tsx`(orderbook 배선 지점 참고).
- 배선은 표시 전용 추가 — 기존 로딩/에러 분기 유지, 패널은 데이터 있을 때만 실질 렌더.

## 4. 비범위 (Out of scope)

- **호가 대조(방식 B) 정밀 분류** — 체결가를 최우선 호가와 대조해 side 를 정밀 판정(매도호가 체결=매수 등)하는 방식. 사용자 합의로 **틱룰(A)만** 채택. B 는 호가·체결 동시 스냅샷·타이밍 정합이 필요해 후속.
- **side 필드 대체 정밀 수급 지표**(체결강도 정식 지표, 순매수 추정 등) — 근사 게이지까지만. 정밀화는 B 후속.
- **체결강도 단타 LLM 판단 컨텍스트 주입** — 본 PRD 는 **조회·표시 + 데이터 계층까지만**. LLM 프롬프트/게이트 주입은 후속(호가 주입과 함께, §9 q4). 단, `deriveTradeStrength` 를 순수하게 짜서 후속 주입 PR 이 바로 얹도록 한다.
- **폴링 게이팅 캘린더(`useMarketStatus().isRegularOpen`) 통합** — 호가(#243)와 함께 후속 일괄(§9 q3). 본 PRD 는 orderbook 과 동일 게이트로 시작.
- **US/크립토 노출** — 어댑터는 심볼 무관 설계로 두되(`currency:"USD"` 응답 수용) UI 노출은 국내 한정.
- **실시간 웹소켓 스트리밍** — 폴링으로 시작(토스 REST 폴링). 웹소켓은 후속.
- **KIS 체결 폴백** — 토스 전용으로 시작(warnings/orderbook 선례). 필요 시 후속.
- **관심종목(watchlist) 행 체결강도 미니뷰** — 후속.

## 5. 수용 기준 (AC)

QA 가 표로 검증. `variant` 별·뷰포트별 재현. (AC-0 스키마·한계는 실측 완료 — §6 확정본 반영 여부만 확인.)

| # | 시나리오 | 재현 | 기대 |
|---|---|---|---|
| AC-0 | 스키마/한계 정합 | `git grep TossTrade` + 타입 확인 | §6 확정 스키마(`price/volume/timestamp/currency`, **side 필드 부재**)대로 타입 존재, `strength` 는 `method:"tick-rule"`·`isApproximation:true` 표식 포함. 추정 필드 0 |
| AC-1 | 토스 키 없음(동료 로컬) | `.env.local` 무 TOSS 키 + `/stock/[ticker]`·`/intraday` 진입 | 패널 "미지원" 또는 미표시, 폴링 0콜, 에러 로그 0, 기존 화면 무회귀 |
| AC-2 | 정상 체결(장중) | 유동 종목(005930 등) 상세 진입 | 체결강도 게이지(매수/매도 %)·체결 테이프(가격·수량·시각·상승/하락색) 표시, NaN 없음 |
| AC-3 | 틱룰 파생 유닛 | `npx vitest run`(trades 배치) | `deriveTradeStrength` 상승/하락/동일틱 상속·혼합·빈배열(`strength=null`)·단일체결·전부동일가(불명) 경계 고정 통과 |
| AC-4 | 동일가 상속 | 동일가 연속 체결 포함 입력 | zero-tick 이 직전 분류 상속(상승 뒤 동일가=매수, 하락 뒤 동일가=매도), 첫 체결 seed 규칙대로 |
| AC-5 | 강도 계산 | AC-2 화면 or 유닛 | `strength = buyVol/(buyVol+sellVol)` 값·게이지 폭 일치, 분모 0 → null → 중립 표기 |
| AC-6 | 근사 안내 노출 | AC-2 화면 | 게이지에 "추정치" 톤 안내(라벨/툴팁) 노출 — 정확 수급으로 오독 방지 카피 존재(§9 q1) |
| AC-7 | 빈 체결/장 마감 | 장외 시간 or 빈 응답 종목 | "체결 없음"(장 마감) 상태, 크래시·NaN 없음, 레이아웃 유지(주말/마감=직전 세션 스냅샷 timestamp 동일값 다수여도 안전) |
| AC-8 | 미지원/미존재 종목 | 없는 ticker / 404 / `?symbols=` 400 회피 | BFF 는 단수 `?symbol=` 사용, 200 + 빈 체결 fail-soft, 패널 빈 상태, 화면 진행 무영향 |
| AC-9 | 양 지면 렌더 | `/stock/[ticker]` + `/intraday` 각각 | 동일 `TradeStrengthPanel`(`git grep TradeStrengthPanel` = 두 지면 import), variant 만 상이 |
| AC-10 | 폴링 주기 | 두 지면 network 관찰 | 단타(compact) refetchInterval < 상세(full). 백그라운드 탭 = 폴링 멈춤 |
| AC-11 | 캐시/single-flight | 3s 내 동일 ticker 재요청 | 토스 1콜(성공 3s 캐시·동시요청 single-flight), 실패는 짧은 캐시 |
| AC-12 | 테이프 건수·정렬 | AC-2 화면 | compact 10건·full 30건, 최신순(응답 최신순 가정 + `timestamp` 방어정렬) |
| AC-13 | 반응형 두 뷰포트 | 모바일·PC | 양 뷰포트에서 게이지·테이프 정렬·색 깨짐 없음(`md:`/`lg:` + `useBreakpoint`) |
| AC-14 | 컨벤션 정합 | `git grep` | hex/px 직타 0(`components/stock/TradeStrengthPanel.tsx`), 한글 카피 `lib/copy/stock/trades.ts`, queryKey `queryKeys.ts` 단일, 클라 `fetch(` 0, 파생 순수함수 유닛 존재 |

## 6. 데이터 / API (실측 완료 — AC-0)

- `GET https://openapi.tossinvest.com/api/v1/trades?symbol=<sym>` (**단수 `symbol` 만 유효 — `symbols=` → 400**). `count=` 파라미터 수용. ratelimit **10**. `tossGet` 이 `{result}` 언래핑.
- **확정 응답 스키마**(추정 금지):
  ```ts
  type TossTrade = {
    price: string;      // Number 파싱
    volume: string;     // Number 파싱
    timestamp: string;  // ISO +09:00
    currency: "KRW" | "USD" | string;
  };
  // result: TossTrade[]  // 최근 체결 배열, 최신순 추정
  ```
- **★★ 결정적 한계**: 매수/매도 **방향(side/direction) 필드 없음**. 체결강도(매수 vs 매도 비중)를 직접 못 구함 → 틱룰(§3-2)로 **파생**. 근사치.
- 주말/장마감 시 직전 세션 체결 스냅샷 반환(timestamp 동일값 다수) — 방어정렬·빈 판정에서 크래시 없이 흡수.
- 정규화 규칙: `price`/`volume` 문자열 → Number(NaN·음수 방어), `timestamp` 로 최신순 방어정렬, 파생 분류(`side`) 부착, 강도 분모 0 → `strength=null`.

## 7. 가정 · 제약 · 참고

- 선행: 토스 어댑터(`toss-market-data-adapter`)·`tossGet`·토큰 인프라·시리즈 ①(`toss-orderbook` #243) 머지 완료(현 main 반영).
- prod 는 TOSS env 미설정이라 배포돼도 dormant(빈 체결 경로) — 활성화는 TOSS 키 등록만으로, `MARKET_DATA_SOURCE` 와 **독립**(`isTossConfigured` 게이트만).
- 단타 루프는 로컬 CLI 전용이나 단타 **화면** 자체는 prod 접근 가능 — 패널 표시는 prod 에서도 키 등록 시 동작.
- **틱룰 근사 성격(핵심 제약)**: 토스 체결에 side 가 없어 Lee-Ready 간이 틱룰로 방향을 추정한다. zero-tick 상속·시가 단일가체결(동시호가) 구간·직전 없음 첫 체결에서 편향이 생길 수 있다. **정확한 수급이 아니라 "체결 흐름 추정"** — 코드(타입 `isApproximation`)·UI 카피·§9 q1 에서 일관되게 정직하게 표기. 정밀 필요 시 호가 대조(B) 후속.
- 레이트리밋: 토스 그룹 정책(체결 헤더 10). 체결 폴링은 3s 캐시·single-flight·백그라운드 정지로 콜 억제(§8). 단타 다종목 동시 표시는 비범위(선택 1종목만).
- 참고: `lib/api/toss/orderbook.ts`·`lib/api/toss/warnings.ts`(패턴 원본), `lib/api/toss/client.ts`(`tossGet`), `components/stock/OrderbookPanel.tsx`(자족 컴포넌트·시각 정합 대상), `hooks/query/useQueryStockOrderbook.ts`(쿼리 훅 선례·동일 위치), `app/api/stock/orderbook/route.ts`(fail-soft·`jsonWithDataSource` 헤더 관례), `lib/server`(`withTimeout`·`jsonWithDataSource`), `hooks/query/queryKeys.ts`, `lib/query/queryConfig.ts`, `components/profile/StockPageLayout.tsx`·`components/intraday/IntradayWatchWorkspace.tsx`(배선 지점), `docs/rules/frontend.md`.

## 8. 영향 분석

- **변경 라인 추정**: 신규 파일 8~9개(어댑터·틱룰 파생+유닛·원본타입·앱타입·BFF·클라·쿼리훅·UI·카피) + `queryKeys`/`queryConfig`/`toss/types.ts` 소폭 추가 + 배선 2지면. 순수 add-only 성격 → 회귀면적 작음. 대략 450~650 라인(파생 순수함수·유닛·UI 상태 분기 포함).
- **커밋 분할 권고**: (a) **데이터 계층**(어댑터·틱룰 파생 + 유닛·타입·BFF·클라·쿼리훅), (b) **UI**(`TradeStrengthPanel` + 카피), (c) **배선**(두 지면). 디자이너 DESIGN.md 커밋(색 신규 시)은 (b) 앞에 선행 — 다만 등락색 관례 재사용이 원칙이라 색 신규 0 이면 DESIGN.md 무변경. orderbook PRD §8 분할 준용.
- **호가(#243)와의 실시간성 정합**: 체결·호가 모두 초 단위 변동 → 성공 캐시 TTL 3s·폴링 지면별(단타 촘촘·상세 느슨)·백그라운드 정지를 **동일 정책**으로. 두 패널이 한 지면에 나란히 놓이므로(호가 옆 체결) 폴링 주기·시각 톤을 맞춘다.
- **폴링 게이팅(캘린더 통합) — 본 PR 제외**: 현재 orderbook 폴링 게이트는 `kstMarketHours` 휴리스틱(공휴일 미인지)이다. 체결도 동일 게이트로 시작하고, `useMarketStatus().isRegularOpen`(시리즈 ② 캘린더) 통합은 **호가와 함께 얇은 후속 PR**로 일괄(§9 q3). 근거(② PRD §8 준용): 게이트가 이미 fail-soft 동작 중이고, 폴링을 네트워크 백드 캘린더에 커플링하면 "캘린더 실패 → 장중 폴링 오정지" 새 실패모드 + fail-open QA 가 필요하며, 방금 머지된 훅 재편집은 회귀면 재오픈.
- **틱룰 파생의 서버 배치**: 파생을 BFF route 에서 수행(클라 파생 부담·중복 제거). 순수함수라 서버 유닛으로 결정 고정. 후속 LLM 주입 PR 이 같은 `deriveTradeStrength` 를 재사용.
- **회귀 위험 낮음**: 기존 라우트/훅/타입 시그니처 무변경, 순수 add. 유일 공유 편집 지점 = `queryKeys.ts`·`queryConfig`·`toss/types.ts`(모두 add) + 배선 2지면(표시 전용 추가).

## 9. OPEN QUESTION

- **[OPEN QUESTION] q1. 틱룰 근사 정확도 한계 — UI 정직성** — side 부재로 zero-tick 상속·시가(동시호가) 체결 편향·첫 체결 seed 등 근사 오차가 있다. 사용자에게 이걸 어떻게 정직하게 표현할지. **PM 권고: 강도 게이지에 미세한 "추정치" 라벨/툴팁 1개 + 카피 톤을 "체결 방향 추정치 · 실제 수급과 다를 수 있어요" 수준으로.** 큰 경고 배너는 과함(정보 위축) — 게이지 옆 작은 안내로 과신만 차단. 코드 레벨은 `TradeStrength.isApproximation:true`·`method:"tick-rule"` 로 소비처가 강도를 정밀 수급으로 오용 못 하게 잠근다. 정밀 필요 시 호가 대조(B) 후속.
- **[OPEN QUESTION] q2. 체결 테이프 표시 건수·정렬** — compact/full 건수와 최신순 확정. **PM 권고: compact 10건·full 30건.** 응답을 최신순으로 가정하되 `timestamp` 방어정렬(주말 스냅샷 동일 timestamp 다수 대비 stable sort)로 안전화. `count=` 는 full 기준 넉넉히(예: 50) 요청 후 UI 에서 slice.
- **[OPEN QUESTION] q3. 폴링 게이팅을 캘린더(`isRegularOpen`)로 통합할지** — 체결·호가 폴링 게이트를 `kstMarketHours` 휴리스틱 → `useMarketStatus().isRegularOpen`(시리즈 ②) 로 갈아탈지. **PM 권고: 본 PR 제외 — 호가(#243)와 함께 후속 일괄 통합.** 근거(§8): fail-soft 이미 동작·새 실패모드(캘린더 실패→장중 오정지) 회피·머지된 훅 재편집 회귀면. 본 PR 은 orderbook 과 동일 게이트로 시작해 두 패널 정책을 일치시켜 두면, 후속 스왑이 두 훅 동시 2줄로 얇아진다.
- **[OPEN QUESTION] q4. 체결강도를 단타 LLM 판단 컨텍스트에 주입할지** — 강도·최근 체결 흐름을 단타 틱 프롬프트/게이트에 넣을지. **PM 권고: 본 PRD 는 조회·표시까지, 주입은 후속(호가 주입 PR 과 함께).** 근거: 단타 판단품질 백로그(586틱 HOLD 캘리브레이션)는 별도 튜닝 이슈이고, 근사 강도를 게이트에 바로 물리면 편향이 판단으로 전파된다 — 먼저 화면에서 사람이 근사 품질을 눈으로 검증한 뒤 주입 설계. `deriveTradeStrength` 순수함수를 재사용 가능하게 남겨 후속 주입을 얇게.
