# QA 리포트 — toss-orderbook (토스 호가창 OrderbookPanel + BFF 프록시)

- 슬러그: `toss-orderbook`
- PR: #243 · 브랜치: `feature/toss-orderbook`
- QA 일시: 2026-07-05 (QA 역할)
- 검증 환경: 로컬 dev(`PORT=3099 npm run dev`, 기존 3000 프로세스 미가동 확인 후 신규 기동·검증 후 종료), TOSS 키 `.env.local` 설정됨(라이브 라운드트립 가능). ⚠️ 주말(장 마감)이라 005930 응답은 직전 세션(2026-07-03T20:00) 스냅샷 — asks/bids 배열 도착으로 AC-2 충족 처리.
- 도구: Read / Bash(curl·grep·tsc·lint·vitest). 브라우저 없음 → UI/반응형/색/빈상태는 컴포넌트 코드 정독 + 토큰 정합 grep 으로 검증.

## 판정: qa-passed (실패 0건)

전 AC PASS. 게이트(tsc·lint·vitest) 0 에러, BFF·컨벤션 무회귀, 라이브 라운드트립 4케이스 기대 일치.

---

## 1. 게이트 (자동화)

| 게이트 | 명령 | 결과 |
|---|---|---|
| 타입체크 | `npx tsc --noEmit` | **exit 0** (에러 0) |
| 린트 | `npm run lint` (`eslint .`) | **에러 0** (출력 없음) |
| 유닛 테스트 | `npx vitest run lib/api/toss` | **5 files / 38 tests passed** (orderbook.test.ts 8건 신규 포함) |

---

## 2. AC 별 검증표 (PRD §5)

| # | 시나리오 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-0 | 응답 스키마 실측 | `curl .../orderbook?ticker=005930` + `lib/api/toss/types.ts` 확인 | 필드명·단계 수를 타입/§6 에 반영 | `TossOrderbook={timestamp,currency,asks/bids:[{price,volume}](문자열)}`, `?symbol=` 단수, asks 오름·bids 내림 — 타입 주석에 "실측 2026-07-04" 명시. 라이브 응답이 스키마와 일치(문자열 price/volume 파싱) | PASS |
| AC-1 | 토스 키 없음(동료 로컬) | `isTossConfigured()` false 경로 코드 정독 + route/로더 게이트 | 패널 미표시·폴링 0콜·에러 0·무회귀 | route: `!isTossConfigured()` → 200 `{orderbook:EMPTY}` + `X-Data-Source: none`. 로더: false → `EMPTY_ORDERBOOK` 즉시 반환(`tossGet` 미호출, 유닛 테스트 "토스 무호출" 통과). never-throw → 로그 소음 0 | PASS |
| AC-2 | 정상 호가(장중/직전세션) | `curl .../orderbook?ticker=005930` | asks 10 + bids 10, 가격·잔량·바, 총잔량·스프레드 | `X-Data-Source: toss`, asks 10(315000→319500 오름차순)·bids 10(314500→310000 내림차순), 각 `{price,qty}`, `spread:500`, `spreadPct:0.1589`, `totalAskQty:313048`, `totalBidQty:319595`, `isEmpty:false`, `updatedAt:2026-07-03T20:00` | PASS |
| AC-3 | 잔량 바 시각화 | `OrderbookBody`/`OrderbookRow` 코드 정독 | 통합 max 정규화, 잔량 0 = 바 없음, 폭 비례 | `unifiedMax=Math.max(1,...asks.qty,...bids.qty)` 매수·매도 통합(DESIGN R2). `pct=min(100, qty/unifiedMax*100)`, `width:${pct}%`. `level.qty>0` 일 때만 바 렌더(0=가격만). 매도 `right-0`·매수 `left-0` 성장(R3) | PASS |
| AC-4 | 스프레드/총잔량 | AC-2 응답 + `normalizeOrderbook`/`SpreadBand`/`TotalFooter` | 스프레드=최우선 매도−매수(호가·%), 총매수/매도 합 | `spread=bestAsk−bestBid=315000−314500=500`, `spreadPct=spread/mid*100=0.159%`(중간가 기준). 총잔량=각 존 단계 합. 한쪽 존만 있으면 spread=null(유닛 테스트) | PASS |
| AC-5 | 장 마감/빈 호가 | `normalizeOrderbook({asks:[],bids:[]})` 유닛 + `OrderbookEmpty` | "호가 없음" 상태, 크래시·NaN 없음, 레이아웃 유지 | 빈 배열 → `EMPTY_ORDERBOOK`(`isEmpty:true, spread:null`). 유닛 "빈 배열→빈 호가"·"NaN 안 만듦" 통과. `OrderbookEmpty` 는 `isKstMarketHoursWithCloseGrace()` 로 장외=`emptyClosed`/장중=`emptyUnsupported` 분기, 제목 공통 | PASS |
| AC-6 | 미지원/미존재 종목 | `curl .../orderbook?ticker=000000` | 200 + 빈 호가 fail-soft, 화면 무영향 | HTTP **200**, `X-Data-Source: toss`, `isEmpty:true` fail-soft. 로더 catch → `EMPTY_ORDERBOOK`+실패 캐시(유닛 "조회 실패→빈 호가 throw 없음" 통과) | PASS |
| AC-7 | 양 지면 렌더 | `grep OrderbookPanel` | 동일 컴포넌트, variant 만 상이 | `StockPageLayout.tsx:98` `variant="full"` + `IntradayWatchWorkspace.tsx:239` `variant="compact"` — 동일 `@/components/stock/OrderbookPanel` import, 차이는 variant(+internal enabled) | PASS |
| AC-8 | 폴링 주기 | `OrderbookPanel`/`useQueryStockOrderbook` 코드 | compact < full, 백그라운드 정지 | `REFETCH_MS={compact:3000, full:10000}`. 훅 `refetchInterval`= 장중(`isKstMarketHoursWithCloseGrace`)일 때만 값, 아니면 false. `refetchIntervalInBackground` 미설정=기본 false → 백그라운드 탭 정지 | PASS |
| AC-9 | 캐시/single-flight | 유닛 + `curl` 3연속 타이밍 | 3s 내 재요청 토스 1콜 | 유닛 "성공 캐시+single-flight" 통과(동일 promise, `tossGet` 1회). 라이브: req1 133ms(미캐시)→req2 7ms·req3 8ms(3s TTL 캐시 히트) | PASS |
| AC-10 | 반응형 두 뷰포트 | `OrderbookPanel` 반응형 코드 | 양 뷰포트 정렬·바·요약 무붕괴 | `useBreakpoint().isMobile` 로 잔량 만/억 축약(`formatQty`), `window.innerWidth` 직접검사 0. 행높이 토큰 `h-orderbook-row-h`(30)/`-compact`(24)로 10+10 노스크롤 설계. 지면 배선은 `lg:max-w-[22rem]` 등 Tailwind prefix. (브라우저 렌더 미검증 — 코드/토큰 정합으로 PASS) | PASS |
| AC-11 | 컨벤션 정합 | `grep` | hex/px 0, 카피·queryKey 단일, 클라 fetch 0 | `OrderbookPanel.tsx` hex 0·px 직타 0(임의값은 `min-w-[4.5rem]` rem 만, 코드베이스 선례 허용). 카피 `lib/copy/stock/orderbook.ts` 단일. queryKey `queryKeys.stock.orderbook` `queryKeys.ts:45` 단일. 클라 직접 `fetch(` 0 | PASS |

---

## 3. 라운드트립 로그 (로컬 dev, TOSS LIVE)

```
A) ticker=005930 →
   HTTP/1.1 200 OK · x-data-source: toss · cache-control: no-store
   asks 10(315000..319500 오름) · bids 10(314500..310000 내림)
   spread:500 · spreadPct:0.15885... · totalAskQty:313048 · totalBidQty:319595
   updatedAt:2026-07-03T20:00:00.000+09:00 · isEmpty:false

B) ticker=000000(미존재) →
   HTTP/1.1 200 OK · x-data-source: toss
   {bids:[],asks:[],totalBidQty:0,totalAskQty:0,spread:null,spreadPct:null,updatedAt:null,isEmpty:true}

C) ticker=(빈값) → status=400 · {"error":"ticker query parameter 가 필요합니다."}

D) ticker=@@@(부정) → status=400

AC-9 캐시 타이밍(035720 3연속): req1 0.133s → req2 0.007s → req3 0.009s (3s TTL 히트)
```

---

## 4. 에지 케이스

| 케이스 | 확인 | 결과 |
|---|---|---|
| malformed 잔량("abc") | 유닛 `toQty` → 0 | NaN 미발생, 총잔량 0 |
| 가격 결측/0 단계 | `normalizeLevels` price 없음/0 → 단계 제외 | asks/bids 에서 배제, 총잔량 오염 없음 |
| 잔량 0 단계 | 가격만 유지, 바 미렌더(`level.qty>0` 가드) | PASS |
| 한쪽 존만 존재 | spread=null(mid 계산 안 함) | 유닛 통과 |
| BE(토스) 장애/404/타임아웃 | 로더 catch→EMPTY+실패캐시(10s), route `withTimeout(5s)` 초과→`X-Data-Source: toss-timeout`+EMPTY | never-throw, 화면 무붕괴 |
| 빈/부정 ticker | `.trim()` 후 `isValidOrderbookSymbol` 실패 → 400 | route 검증 통과 |
| StrictMode/폴링 백그라운드 | `refetchIntervalInBackground` 기본 false | 탭 비활성 시 폴링 정지 |
| 캐시 상한 | `MAX_CACHE_ENTRIES=512` 초과 시 최오래 키 축출 | 무한 성장 방지 |

---

## 5. DESIGN.md 토큰 정합 (스타일링 검증)

- 색 신규 0 — 매도=`signal-up`(#c81e1e)/`signal-up-soft`(#fee2e2), 매수=`signal-down`(#1d4ed8)/`signal-down-soft`(#dbeafe), `accent-soft`(#eaf0f6)·`surface-muted`(#f6f8fa) 모두 `tailwind.theme.json` 에 존재하고 DESIGN.md front matter 와 일치.
- `OrderbookPanel` 소비 유틸이 DESIGN R1 매핑 준수: ask bar `bg-signal-up-soft`·ask price `text-signal-up`, bid bar `bg-signal-down-soft`·bid price `text-signal-down`, 중앙 밴드 `bg-accent-soft`·`text-primary`, 총잔량 칩 `bg-surface-muted`.
- 신규 spacing 토큰 2키(`orderbook-row-h`:30px, `orderbook-row-h-compact`:24px)만 도입 — `tailwind.theme.json:283-284` 존재, 컴포넌트가 `h-orderbook-row-h`/`-compact` 로 소비.
- 빈상태 카피 정합: `emptyTitle`/`emptyClosed`/`emptyUnsupported` = DESIGN 상태 매트릭스 R6 문구와 일치, 단일 위치(`lib/copy/stock/orderbook.ts`).

> 라이브 토큰 변경→`design:sync`→build 재검증은 본 PR 이 `finsight-redesign.md` SSOT 재사용 색(신규 색 0)이라 생략. 신규 spacing 2키는 theme.json 반영 확인으로 대체.

---

## 6. 공통 AC 무회귀

- BFF 원칙: `components/hooks/lib/api/stock`·`toss/orderbook.ts` 에서 `http://127.0.0.1` 직접 호출 **0건**, 클라 직접 `fetch(` **0건**. 브라우저→BFF(`/api/stock/orderbook`)→토스 단방향.
- 한글 톤: 사용자 노출 문구(호가·총매도·총매수·스프레드·빈상태) 전부 한글, ticker/필드명 외 영문 노출 없음.
- 접근성: 패널 `aria-label={C.title}`, 잔량 바 `aria-hidden`(장식), 스켈레톤 `aria-hidden`. h2 제목 존재.

---

## 7. 발견 이슈

없음(블로킹·경미 모두 0). 참고 관찰: `OrderbookPanel.tsx:185` `min-w-[4.5rem]` 는 px/hex 직타가 아닌 rem 임의값으로 코드베이스 선례(`lg:max-w-[22rem]`)와 정합 — AC-11 위반 아님.

---

## 8. 다음 작업 (본 PR 머지 후 후속)

- 호가 기반 단타 컨텍스트 주입(후속 PRD): `fetchOrderbook`/`normalizeOrderbook` 순수 재사용해 매수벽/매도벽·스프레드를 LLM 프롬프트·결정론 게이트 입력으로 확장.
- prod 활성화 검증: prod 는 TOSS env 미설정 dormant — 키 등록 후 장중 라이브 호가·폴링(3s/10s)·레이트 관찰.
</content>
</invoke>
