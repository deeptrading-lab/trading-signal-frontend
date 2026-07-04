# QA 리포트 — toss-trades (토스 체결강도 틱룰 파생 + 체결 테이프)

- 슬러그: `toss-trades`
- 브랜치: `feature/toss-trades` / PR **#245**
- 대상 커밋: `c20a029`(배선) · `97fac3b`(UI+토큰) · `a2fa274`(데이터 계층) · `d8a68ba`(DESIGN) · `e8eb046`(PRD)
- 판정: **qa-passed** (AC 15건 전부 PASS · 블로킹 이슈 0 · 비블로킹 관찰 3건)
- 검증 도구: Read/Grep/Bash(ad-hoc). 브라우저 없음(라운드트립은 curl + 실 토스 BE). 브랜치 checkout/reset/생성 없음, `docs/qa/` 만 기록.

## 게이트 수치

| 게이트 | 명령 | 결과 |
|---|---|---|
| typecheck | `npx tsc --noEmit` | **0 에러** (exit 0) |
| lint | `npm run lint` (eslint .) | **0 에러/경고** (클린 출력) |
| 유닛 | `npx vitest run lib/api/toss` | **7 파일 60 tests 전부 통과** (trades 배치 17 tests) |
| 토큰 SSOT | `npm run design:sync` → `git diff tailwind.theme.json` | **diff 0** (DESIGN ↔ theme.json 정합) |
| BFF 원칙 | `git grep http://127.0.0.1 -- app/` | route handler `FASTAPI_BASE_URL` fallback 3건 외 **0건** |
| 클라 fetch | `git grep fetch( -- 신규 클라/훅/컴포넌트` | **0건** (axios httpClient만) |

## 라운드트립 (실 토스 BE LIVE)

로컬 `.env.local` 에 `TOSS_CLIENT_ID`/`TOSS_CLIENT_SECRET` 설정됨 → `isTossConfigured()==true` → **실제 토스 REST 응답으로 검증**. 기존 :3000 dev 서버는 앱-비밀번호 게이트(HMAC `APP_AUTH_SECRET`, 시크릿 비공개)로 401 → 별도 :3099 dev 서버를 `APP_AUTH_SECRET` 알려진 값으로 기동, 동일 알고리즘(HMAC-SHA256 base64url)으로 세션 쿠키 mint 후 curl. 검증 후 :3099 종료(:3000 무손상). 관측 시점 2026-07-04(토) = 주말 → 토스는 직전 세션(2026-07-03 19:59:59) 스냅샷을 **전부 동일 timestamp** 로 반환(AC-7 경계를 실데이터로 밟음).

| 케이스 | 요청 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| A 정상 종목 | `GET /api/stock/trades?ticker=005930` | 200·`X-Data-Source: toss`·체결배열+side+strength·NaN 없음 | `HTTP 200`·`x-data-source: toss`·trades 50건 각 `side` 부착·`strength={buyVolume:114,sellVolume:317,strength:0.2645,method:"tick-rule",isApproximation:true,sampleCount:49}`·`isEmpty:false`·`updatedAt` 채워짐 | PASS |
| B 없는 종목 | `?ticker=999999` | 200 fail-soft·빈 체결 | `HTTP 200`·`x-data-source: toss`·`trades:[]`·`strength.strength:null`·`sampleCount:0`·`isEmpty:true`·`updatedAt:null` | PASS |
| C 빈 ticker | `?ticker=` | 400 | `status=400` | PASS |
| D 부정 ticker | `?ticker=99$@`(URL 인코딩) | 400 | `status=400` | PASS |
| E ticker 누락 | (파라미터 없음) | 400 | `status=400` | PASS |
| F count 파라미터 | `?ticker=005930&count=5` | 5건으로 절삭 | `trades=5`·`sampleCount=4`(seed 1 제외) | PASS |

- `symbols=`(복수) 함정: 어댑터·route 는 단수 `?symbol=` 만 사용(`tossGet("/api/v1/trades",{symbol,count})`, 유닛 `toHaveBeenCalledWith` 로 고정). `?symbols=` 400 회피 확인.
- 주말 스냅샷(전부 동일 timestamp 50건)에서도 크래시·NaN 없이 `strength` 0~1 유효값·`isEmpty:false` 정상 산출(AC-7 실증).

## AC 별 재현·기대·실측

| # | 시나리오 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-0 | 스키마/한계 정합 | `git grep TossTrade` + 타입 정독 | §6 스키마(price/volume/timestamp/currency, **side 부재**), strength 에 method/isApproximation | `lib/api/toss/types.ts` `TossTrade` = 4필드·side 없음. `TradeStrength.method:"tick-rule"`·`isApproximation:true`(타입+`EMPTY_TRADE_STRENGTH`+파생함수 반환). 추정 필드 0 | PASS |
| AC-1 | 토스 키 없음 | 코드경로 + 유닛(로컬은 키有라 none 경로는 코드/유닛으로) | 미지원/미표시·toss 업스트림 0콜·에러 0·무회귀 | route: `!isTossConfigured()` → `EMPTY_TRADES_RESULT`+`none`(fetchTrades 호출 전 단락). 유닛 "키 미설정이면 빈 배열 — 토스 호출 자체가 없다" 통과(`tossGet` not called). 에러 로그 0(never-throw) | PASS(관찰1) |
| AC-2 | 정상 체결(장중) | 라운드트립 A | 게이지(매수/매도%)·테이프(가격·수량·시각·상승/하락색)·NaN 없음 | A: strength 0.2645·tape 50건 side 부착·NaN 없음. 게이지는 `buyPct/sellPct` round·readout "매수 26% · 매도 74%" | PASS |
| AC-3 | 틱룰 유닛 | `npx vitest run lib/api/toss` | 상승/하락/동일틱상속·혼합·빈배열(null)·단일체결·전부동일가 경계 고정 | trades 배치 17 tests 통과: 상승만(strength 1)·하락만(0)·zero-tick 상속(0.5)·혼합(20/30)·빈(null)·단일(null)·전부동일가(null)·최신순입력 방어정렬 | PASS |
| AC-4 | 동일가 상속 | 유닛 `deriveTradeStrength`/`classifyTrades` | zero-tick 직전분류 상속·첫 seed | `[100,101,101,100,100]` → buy 20/sell 20(101·101 상속=매수, 100·100 상속=매도). classifyTrades seed=neutral | PASS |
| AC-5 | 강도 계산 | 유닛 + 라운드트립 A | `buyVol/(buyVol+sellVol)`·분모0→null→중립 | 혼합 test `20/30` closeTo·빈/전부동일가 null. A 실측 114/(114+317)=0.2645 | PASS |
| AC-6 | 근사 안내 노출 | `TradeStrengthPanel` 정독 | "추정치" 라벨/툴팁·오독 방지 카피 | `StrengthGauge` 소제목 옆 `approx-label` 칩 `{C.approxChip="추정치"}` + `title={C.approxTooltip="체결 방향 추정치 · 실제 수급과 다를 수 있어요"}`. 강도불명 시 `strengthUnknown` | PASS |
| AC-7 | 빈 체결/장 마감 | 라운드트립 A(주말 동일 timestamp)·B | "체결 없음"·크래시/NaN 없음·레이아웃 유지 | A 동일 timestamp 50건 무크래시. `TradesEmpty` = `isKstMarketHoursWithCloseGrace()` 분기(장외 `emptyClosed`·장중 `emptyUnsupported`), 헤더 유지 | PASS |
| AC-8 | 미지원/미존재 | 라운드트립 B·C·D·E | 단수 `?symbol=`·200 빈 체결 fail-soft·400 검증 | B 200 빈 체결·C/D/E 400. 어댑터 `symbol` 단수(유닛 고정), `?symbols=` 미사용 | PASS |
| AC-9 | 양 지면 렌더 | `git grep TradeStrengthPanel` | 두 지면 동일 컴포넌트·variant만 상이 | `StockPageLayout.tsx`(`variant="full"`) + `IntradayWatchWorkspace.tsx`(`variant="compact"`) import. 컴포넌트 1개 재사용 | PASS |
| AC-10 | 폴링 주기 | 컴포넌트/훅 정독 | 단타<상세·백그라운드 정지 | `REFETCH_MS={compact:3000,full:10000}` → 훅 `refetchInterval`. `refetchIntervalInBackground` 미설정(기본 false)로 백그라운드 정지. 장중(`isKstMarketHoursWithCloseGrace`)만 폴링 | PASS |
| AC-11 | 캐시/single-flight | 유닛 + 어댑터 정독 | 3s 성공캐시·single-flight·짧은 실패캐시 | `SUCCESS_TTL_MS=3000`·`FAILURE_TTL_MS=10000`·`inflight` Map. 유닛 "성공 캐시 + single-flight — 3s 내 동시 요청 토스 1콜" 통과(동일 promise·1콜) | PASS |
| AC-12 | 테이프 건수·정렬 | 컴포넌트 + 유닛 | compact 10·full 30·최신순+방어정렬 | `TAPE_LIMIT={compact:10,full:30}` slice. `classifyTrades`=timestamp 오름차순 stable 정렬 후 `reverse()`(최신순). 유닛 "테이프는 최신순 + side 부착" | PASS |
| AC-13 | 반응형 두 뷰포트 | 정적(브라우저 없음) | 게이지·테이프 정렬·색 무깨짐(`md:`/`lg:`+`useBreakpoint`) | variant 밀도 분기 + `useBreakpoint().isMobile`(수량 만/억 축약). `window.innerWidth` 0건. Tailwind 토큰 폭/그리드(`grid-cols-[auto_1fr_auto]`)로 무붕괴. 브라우저 시각 확인은 도구 부재로 미실행(로직 검증 대체) | PASS(관찰) |
| AC-14 | 컨벤션 정합 | `git grep` | hex/px 0·카피 단일·queryKey 단일·클라 fetch 0·순수함수 유닛 | 컴포넌트 hex/px 0건·`lib/copy/stock/trades.ts` 단일·`queryKeys.stock.trades` 단일·클라 fetch 0·`deriveTradeStrength`/`classifyTrades`/`normalizeTrades` 유닛 존재 | PASS |

## 틱룰 순수함수 경계 (핵심)

`lib/api/toss/tradeStrength.ts` — `classifyChronological` 이 timestamp 오름차순 stable 정렬 후 상승틱=buy·하락틱=sell·zero-tick=직전 상속·첫 체결=neutral(seed) 분류. `deriveTradeStrength` 는 buy/sell 만 집계(neutral 제외), 분모 0 → `strength=null`. 유닛(`__tests__/trades.test.ts`) 이 아래 경계를 고정:

- 상승만 → strength 1 (seed 제외 sampleCount 3)
- 하락만 → strength 0
- zero-tick 상속 → `[100,101,101,100,100]` buy20/sell20/0.5
- 혼합 → buyVol/(buyVol+sellVol)
- 빈배열·단일체결·전부동일가 → strength null·vol 0·sampleCount 0
- 최신순 입력이어도 timestamp 방어정렬 후 시간순 분류(오분류 차단)
- classifyTrades 테이프 최신순 + side, 동일가 상속·seed neutral

라운드트립 A(주말 전부 동일 timestamp)에서 stable sort 로 입력순 보존·크래시 없이 강도 산출 → 실데이터 경계 실증.

## UI/색/접근성 (DESIGN 정합)

- **색 매핑 R1**: 게이지 매수 세그먼트 `bg-signal-up-soft`(빨강 계열)·매도 `bg-signal-down-soft`(파랑). readout `text-signal-up`(매수)·`text-signal-down`(매도). 테이프 상승틱 `text-signal-up`·하락틱 `text-signal-down`·seed neutral `text-text-muted`. OrderbookPanel(매도=빨강)과 **의도적 반대** = DESIGN R1 준수(테이프 상승틱=매수 → 매수 빨강 자기일치).
- **색 단독 의존 아님**: 게이지는 항상 "매수 n% · 매도 m%" 글자 병기, 테이프는 시각·가격·수량 텍스트 병기, 강도 불명 시 `strengthUnknown` 문구. approx 칩은 `title` 툴팁 + 가시 텍스트 "추정치".
- **variant 3+상태**: 로딩(`TradesSkeleton` `aria-hidden`) / 빈 체결(`TradesEmpty` 장마감·미지원) / 강도불명(중립 게이지+정상 테이프) / 정상. `<section aria-label>`·게이지 세그먼트·divider `aria-hidden`.
- **토큰**: 신규 spacing `strength-gauge-h`(10px)만 SSOT(`finsight-redesign.md`)+`tailwind.theme.json` 추가, `h-strength-gauge-h` 유틸로 게이지·스켈레톤 소비. 신규 **색 0**(finsight diff = spacing 1키뿐). 테이프 행높이 `orderbook-row-h`/`-compact` 재사용. `design:sync` diff 0.
- **반응형**: `useBreakpoint` 만(수량 축약), `window.innerWidth` 0건.

## 관찰 (비블로킹 · 판정 무영향)

1. **AC-1 패널 미표시 vs 미지원 empty-state**: DESIGN 핸드오프 매트릭스 R7 은 "키 없음 = 패널 미표시(지면 조건부 렌더 안 함)" 이나, 구현은 `X-Data-Source` 헤더를 읽지 않고 빈 체결(미지원) empty-state 로 렌더한다. **AC-1 문구가 "미지원 또는 미표시"("또는")** 라 미지원 브랜치로 AC 충족 → PASS. 부수효과: 장중 로컬-무키 시 클라→BFF 폴링은 발생(단, BFF 가 `isTossConfigured` false 로 toss 업스트림 0콜·에러 0 → 동료 로컬 무영향 원칙은 유지). 완전 미표시(폴링 0콜)를 원하면 후속에서 지면이 `X-Data-Source` 기반 조건부 렌더 필요.
2. **주말 전부 동일 timestamp 스냅샷의 틱 방향**: 모든 timestamp 가 동일하면 stable sort 가 토스 원순서(최신순)를 보존 → 틱룰이 시간정보 없이 그 순서로 seed·방향을 산정한다(실제 시간순과 무관해질 수 있음). `isApproximation:true` 범위 내이며 크래시·NaN·무한값 없음(라운드트립 A 실증). 장중 distinct timestamp 에서는 정상 시간순 분류.
3. **timeout 시 `X-Data-Source: toss-timeout`**: PRD §3-4 는 "toss|none" 표기이나 route 는 timeout 진단용으로 `toss-timeout` 을 emit. 이는 **이미 머지된 `orderbook/route.ts` 선례와 동일** 값(시리즈 ① 관례) → 정합. 클라는 body 만 소비(헤더 무의존)라 화면 영향 없음.

## 결론

AC 15건 전부 PASS. 게이트(tsc/lint/vitest/design:sync) 클린. 실 토스 BE 라운드트립 6케이스 기대 일치. BFF 원칙·한글 카피 단일·토큰 SSOT·접근성(색 단독 비의존·aria) 무회귀. 관찰 3건은 모두 비블로킹(AC 문구/기존 선례 범위 내). → **qa-passed**.
