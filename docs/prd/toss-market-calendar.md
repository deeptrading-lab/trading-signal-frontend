# PRD — toss-market-calendar (토스 국내 장 캘린더: 장시계 유틸 + 상태 배지 UI)

- 슬러그: `toss-market-calendar`
- 상태: 기획 (impl 전)
- 작성: 2026-07-05 (PM 역할)
- 브랜치: `feature/toss-market-calendar`
- 시리즈: 토스 Open API 배선 ② (① `toss-orderbook` 머지 완료 #243)
- 관련:
  - `docs/prd/toss-orderbook.md` — 시리즈 ①. 본 PRD 는 그 형식·톤·"토스 전용·never-throw·`isTossConfigured` 게이트·single-flight" 패턴을 그대로 답습한다.
  - `docs/prd/toss-market-data-adapter.md` — 토스 어댑터 기반(`tossGet`·`isTossConfigured`·토큰 인프라)
  - `docs/prd/stock-warnings.md` — "토스 전용(KIS 폴백 없음) 조회 API" 선례
  - `docs/prd/intraday-scalping-agent.md` / `project_intraday-paper-watch` — 서버 틱 스케줄러(휴장가드 후속 소비처)
- **UI 포함: yes** (신규 공용 컴포넌트 `MarketStatusBadge`. 노출 위치는 §9 q1 로 UX/UI 디자이너 결정 — 합류 트리거)

## 1. 배경 / 문제

우리 제품은 지금 **"장이 열렸는지"를 공휴일 모르는 시각 휴리스틱으로만 추정**한다. 두 군데에 하드코딩돼 있다:

- `lib/utils/kstMarketHours.ts` — `isKstMarketHours`(평일 09:00~15:30)·`isKstMarketHoursWithCloseGrace`(~15:40)·`isKstAfterMarketClose`. 주석에 "공휴일은 인지하지 못한다 — 호출측은 fail-soft 전제" 라고 명시돼 있다. 이 함수가 **호가 폴링 게이트(#243)·분봉 차트·warnings·단타 자동 틱·refreshScheduler·tickScheduler** 에서 이미 쓰인다.
- `lib/market/snapshot.ts` `estimateSession()` — `MarketSession = "pre"|"open"|"post"|"closed"` 를 KST 시각만으로 추정(휴장 정밀 판정 안 함).

결과적으로 **평일 공휴일(개천절·한글날 등 연 ~15일)에는 "장중"으로 오판**한다 — 호가·시세 폴링이 헛돌고(서버 dedup·빈 응답으로 무해하지만 콜 낭비), 화면 어디에도 "오늘 휴장 · 다음 개장 언제" 를 사용자에게 알려주지 못한다. 토스 앱은 이걸 배지로 명확히 보여준다.

토스 Open API 에 정답 소스가 있다: `GET /api/v1/market-calendar/KR` 는 **오늘이 영업일인지(휴장이면 `today.integrated === null`)·정확한 세션 경계(프리마켓/정규장/애프터마켓 + 동시호가 시각)·다음 개장일**을 그대로 준다. 캘린더는 하루 단위로 사실상 정적이라(레이트리밋 헤더 3 = 호가 10 보다 낮음) 캐시로 값싸게 붙는다.

본 PRD 는 이 캘린더를 **① 앱 표준 `MarketStatus` 로 정규화하는 어댑터·BFF, ② 세션 경계 대비 현재 phase 를 판정하는 순수 장시계 유틸(`marketClock`), ③ 상태 배지 UI, ④ 재사용 가능한 훅** 까지 제공한다. 기존 휴리스틱을 즉시 걷어내지는 않되(회귀 최소화), **공휴일 인지 진실원천을 심고** 이후 게이트·스케줄러가 얇게 갈아탈 수 있는 토대를 만든다.

## 2. 목표 (측정 가능)

1. `GET /api/market/calendar` BFF 가 오늘 영업일 여부·현재 phase·세션 시각·다음 개장을 앱 표준 `MarketStatus` 로 반환한다 (`X-Data-Source: toss|none`).
2. 순수 함수 `deriveMarketStatus(calendar, nowMs)` 가 세션 경계 vs KST 현재시각 비교로 `phase` 를 산출한다 — **유닛 테스트로 프리/정규/애프터/마감/휴장/불명 6 상태를 고정**(`npx vitest run lib/market` 통과).
3. 공휴일 인지: 토스 `today.integrated === null`(주말·공휴일) 이면 `todayIsBusinessDay=false` + `nextOpen` = 다음 개장일·시각. 평일 공휴일에서도 "휴장"으로 정확히 판정된다.
4. 공용 `MarketStatusBadge` 가 "장 마감 · 다음 개장 7/6(월) 09:00" / "장중" / "장전 · 동시호가 08:50" 등 사람이 읽는 상태를 렌더한다(노출 위치는 §9 q1).
5. **토스 키 없는 로컬(동료 머신)에서 동작 무변경**: 배지 미표시(또는 `unknown` 안내), 폴링 무발생, 에러·로그 소음 0.
6. `useMarketStatus().isRegularOpen` 이 향후 호가·시세 폴링 게이트가 갈아탈 수 있는 형태로 노출된다(실제 배선은 §4 후속 — §8·§9 q3).

## 3. 범위 (In scope)

### 3-1. 토스 어댑터 `lib/api/toss/marketCalendar.ts` (신규)

- `fetchMarketCalendar(date?): Promise<TossMarketCalendar | null>` — **never-throw**. `warnings.ts`/`orderbook.ts` 패턴 그대로:
  - `isTossConfigured()` false → 즉시 `null`(키 없음 신호).
  - 5xx·네트워크·빈 응답·파싱 실패 전부 `null` 로 수렴(실패 캐시).
  - `tossGet<TossMarketCalendar>("/api/v1/market-calendar/KR", { date })` 재사용(단일 진입·429/401 재시도 무료 상속·`{result}` 언래핑). KIS 폴백 **없음** — 모듈 주석에 "토스 전용, 대응 KIS TR 없음" 명시.
- 캐시 TTL: **캘린더는 정적** → 성공 TTL 길게, 실패 TTL 짧게(§8·§9 q4). 캐시 상한·오래된 키 축출은 `warnings.ts` `setCache` 답습. 캐시 키는 `date`(기본 = 오늘 KST) 단위. single-flight 로 동시 요청 1콜 수렴.

### 3-2. 토스 원본 타입 `lib/api/toss/types.ts` (추가) — **AC-0 실측 완료, 이대로 확정**

```ts
type TossMarketSession = {
  startTime: string;                      // ISO +09:00
  singlePriceAuctionStartTime?: string;   // preMarket·regularMarket
  singlePriceAuctionEndTime?: string;     // afterMarket
  endTime: string;
};
type TossSessions = {
  preMarket: TossMarketSession;     // 08:00~09:00 (동시호가 08:50)
  regularMarket: TossMarketSession; // 09:00~15:30 (동시호가 15:20)
  afterMarket: TossMarketSession;   // 15:30~20:00
};
type TossCalendarDay = { date: string; integrated: TossSessions | null };
type TossMarketCalendar = {
  today: TossCalendarDay;               // integrated === null ⇒ 오늘 휴장
  previousBusinessDay: TossCalendarDay; // integrated 항상 non-null
  nextBusinessDay: TossCalendarDay;     // integrated 항상 non-null
};
```
- 추정 금지 — 위 스키마는 실측(`GET /api/v1/market-calendar/KR`, 옵션 `?date=YYYY-MM-DD`) 확정본이다. 방어: `today.integrated` 는 `null` 가능, `singlePriceAuction*` 는 세션별 존재/부재 상이(옵셔널).

### 3-3. 앱 표준 타입 `lib/types/market/marketStatus.ts` (신규)

```ts
type MarketPhase = "pre" | "regular" | "after" | "closed" | "unknown";
type SessionTimes = {
  pre: { start: string; auction: string; end: string };
  regular: { start: string; auction: string; end: string };
  after: { start: string; auctionEnd: string; end: string };
};
type MarketStatus = {
  phase: MarketPhase;
  isRegularOpen: boolean;         // phase === "regular"
  todayIsBusinessDay: boolean;    // today.integrated !== null
  todayDate: string;              // YYYY-MM-DD (KST)
  nextOpen: { date: string; time: string } | null; // 휴장·장외일 때 다음 정규장 개장
  sessionTimes: SessionTimes | null; // 오늘 영업일이면 세션 시각, 휴장이면 null
};
```
- `phase="unknown"` = 키 없음/캘린더 실패(fail-soft). UI 는 unknown 을 "미표시" 또는 중립 안내로 처리.

### 3-4. 순수 장시계 유틸 `lib/market/marketClock.ts` (신규) — 서버·클라 공용, 유닛 테스트 대상

- `deriveMarketStatus(calendar: TossMarketCalendar | null, nowMs: number): MarketStatus` — **순수 함수**(부작용·`Date.now()` 내부 호출 없음, 시각 주입). phase 판정 = KST 현재시각 vs 세션 경계 비교:
  - `calendar === null` → `phase="unknown"`, 나머지 안전 기본값.
  - `today.integrated === null` → `phase="closed"`, `todayIsBusinessDay=false`, `nextOpen` = `nextBusinessDay.date` + `regularMarket.startTime`(HH:mm).
  - 영업일: 현재시각이 어느 세션 `[start, end)` 구간인지로 `pre`/`regular`/`after` 판정, 어디에도 안 들면 `closed`(개장 전/마감 후). 마감 후(`after.end` 초과) 이면 `nextOpen` = `nextBusinessDay`.
  - `isRegularOpen = phase === "regular"`.
- KST 현재시각 산출·ISO→HH:mm 포맷은 **기존 `lib/api/toss/kst.ts` 유틸 재사용/확장**(Intl `Asia/Seoul` 기반, §7·§9 q5). 새 타임존 산술 중복 금지.
- 배치: `lib/server` 가 아니라 `lib/market` 에 둔다 — 클라 훅(3-6)과 서버 BFF·스케줄러가 **모두 import** 해야 하므로(서버 전용 격리 불필요, 순수).

### 3-5. BFF route `app/api/market/calendar/route.ts` (신규)

- `GET [?date=YYYY-MM-DD]` → `{ status: MarketStatus }`, `X-Data-Source: toss|none`(`warnings/route.ts` 헤더 관례·`jsonWithDataSource` 재사용).
- 키 없으면 200 + `deriveMarketStatus(null, now)`(phase="unknown") + `X-Data-Source: none`. 토스 실패도 200 + unknown(fail-soft). `withTimeout` 가드 → 초과 시 unknown 디그레이드.
- 현재시각은 **서버에서 주입**(`deriveMarketStatus(calendar, Date.now())`) — phase 판정 기준시각을 서버로 고정(클라 시계 오차 회피). 클라 재평가는 3-6 훅이 담당.

### 3-6. 클라이언트 + 훅 `lib/api/market/calendar.ts` · `hooks/query/useQueryMarketCalendar.ts` · `hooks/market/useMarketStatus.ts` (신규)

- `getMarketCalendar()` — axios(`lib/api/client.ts`, baseURL `/api`).
- `useQueryMarketCalendar()` — TanStack Query.
  - queryKey: `queryKeys.market.calendar()` (`hooks/query/queryKeys.ts` 단일 위치에 추가).
  - `staleTime` 길게(캘린더 정적) — 기본값은 `queryConfig.market.calendar`(`lib/query/queryConfig.ts` 단일 위치). 폴링 없음(정적).
- `useMarketStatus(): MarketStatus` — **도메인 훅**. `useQueryMarketCalendar` 결과를 받아, **phase 는 시간 경과로 바뀌므로 클라에서 세션 경계에 맞춰 재평가**(예: 09:00 되면 서버 응답 없이도 `pre`→`regular`). 재평가 방식은 §9 q2 로 UX/구현 결정 — PRD 는 서버 응답의 `sessionTimes` 를 들고 `deriveMarketStatus` 를 클라에서 재적용하는 훅 형태만 규정. 데이터 없으면 `phase="unknown"` 반환.

### 3-7. 공용 UI `components/market/MarketStatusBadge.tsx` (신규) + 카피

- 내부에서 `useMarketStatus()` 호출(자족 컴포넌트 — `StockWarningBadges`/`OrderbookPanel` 선례. 지면은 배치만).
- 렌더(phase 별):
  - `regular` → "장중"(라이브 도트/강조).
  - `pre` → "장전 · 동시호가 HH:mm".
  - `after` → "장 마감(시간외) · HH:mm까지".
  - `closed`(장외/휴장) → "장 마감 · 다음 개장 M/D(요일) HH:mm"(`nextOpen` 있을 때). 휴장(주말·공휴일)도 동일 카피로 다음 개장 안내.
  - `unknown` → 미표시(또는 중립 라벨). 크래시·레이아웃 붕괴 없음.
- 한글 카피는 `lib/copy/market/marketStatus.ts` 단일 위치(요일·날짜 포맷 포함). 색·간격은 디자인 토큰만(hex/px 직타 금지). `cn` 헬퍼. 반응형은 Tailwind prefix + `useBreakpoint`(직접 innerWidth 금지).
- 노출 위치(헤더 티커 vs 마켓 홈)는 **UX 디자이너 결정**(§9 q1). 본 PRD 는 컴포넌트·데이터까지 만들고, 최종 배선 지면 1곳은 디자이너 확정 후 같은 브랜치 커밋.

## 4. 비범위 (Out of scope)

- **market-calendar / US(미국 장 캘린더)** — 별도. 국내(`/KR`) 우선. 어댑터는 경로 리터럴 분기 여지만 남기고 US 노출은 안 함.
- **주문/계좌 · ③ trades(체결 내역)** — 별도 PRD.
- **기존 휴리스틱(`kstMarketHours.ts`·`estimateSession()`) 철거/치환** — 본 PRD 는 진실원천(`marketClock`+캘린더)을 **심기만** 한다. 이미 6곳에서 쓰이는 휴리스틱을 걷어내는 건 회귀면적이 커서(스케줄러·차트·warnings·호가) **후속**. 본 PRD 산출물은 그 치환이 얇아지도록 `isRegularOpen`·`marketClock` 를 재사용 가능하게 제공한다.
- **호가/시세 폴링 게이트 실제 배선 변경(#243 `useQueryStockOrderbook` 등)** — **후속(§8·§9 q3, PM 권고 = Out)**. 현재 게이트는 이미 `isKstMarketHoursWithCloseGrace()`(휴리스틱)로 fail-soft 동작 중이라 급하지 않고, 방금 머지된 훅을 다시 건드리면 회귀면적이 생긴다. `isRegularOpen`(fail-open) 을 노출만 해 둬 후속 PR 이 2줄로 갈아타게 한다.
- **단타 서버 스케줄러 휴장가드 실제 적용**(`tickScheduler.ts`·`refreshScheduler.ts`) — 스케줄러는 로컬 CLI 전용이고 월요일 이후 defer 상태(`project_intraday-paper-watch`). 본 PRD 는 재사용 가능한 서버 유틸(`marketClock` + `todayIsBusinessDay`)까지 제공하고 배선은 후속.
- **마켓 스냅샷 `MarketSession` 통합**(`estimateSession()` → 캘린더 기반) — 후속(§7 매핑 노트). 지금은 병존.
- **공휴일 목록 자체 캐싱/DB 적재** — 토스 응답을 단일 진실원천으로 신뢰(§9 q4). 로컬 공휴일 테이블 미구축.

## 5. 수용 기준 (AC)

QA 가 표로 검증. phase 별·뷰포트별 재현. (AC-0 스키마는 실측 완료 — §3-2 확정본 반영 여부만 확인.)

| # | 시나리오 | 재현 | 기대 |
|---|---|---|---|
| AC-0 | 스키마 정합 | `git grep TossMarketCalendar` | §3-2 확정 스키마대로 타입 존재(`integrated` nullable·세션 3종·동시호가 옵셔널). 추정 필드 0 |
| AC-1 | 토스 키 없음(동료 로컬) | `.env.local` 무 TOSS 키 + `/api/market/calendar` 호출 | 200 + `phase="unknown"` + `X-Data-Source: none`, 토스 무호출(유닛), 배지 미표시, 에러 로그 0, 기존 화면 무회귀 |
| AC-2 | 영업일 정규장 | 평일 장중(09:00~15:30) 서버시각 주입 | `phase="regular"`, `isRegularOpen=true`, `todayIsBusinessDay=true`, 배지 "장중" |
| AC-3 | 프리마켓 | 평일 08:00~09:00 주입 | `phase="pre"`, `isRegularOpen=false`, 배지 "장전 · 동시호가 08:50" |
| AC-4 | 애프터마켓 | 평일 15:30~20:00 주입 | `phase="after"`, 배지 "장 마감(시간외) …" |
| AC-5 | 장외(개장 전/마감 후 영업일) | 평일 07:00 / 20:30 주입 | `phase="closed"`, `nextOpen` = 다음 정규장 개장(오늘 잔여 or 익영업일) |
| AC-6 | 휴장(주말·공휴일) | `today.integrated=null` 응답 | `phase="closed"`, `todayIsBusinessDay=false`, `nextOpen` = `nextBusinessDay` date+time, 배지 "다음 개장 M/D(요일) HH:mm" |
| AC-7 | 순수함수 경계 | `npx vitest run lib/market` | `deriveMarketStatus` 6 상태(pre/regular/after/closed/휴장/unknown) 유닛 통과, 경계값(09:00·15:30·20:00) 결정 고정 |
| AC-8 | 캐시/single-flight | 짧은 간격 동일 date 재요청 | 성공 TTL 내 토스 1콜, 동시요청 single-flight 1콜(유닛) |
| AC-9 | 클라 phase 재평가 | 훅 마운트 후 세션 경계 경과(모킹) | 서버 재요청 없이 `pre`→`regular` 등 phase 갱신(§9 q2 방식) |
| AC-10 | 반응형 두 뷰포트 | 모바일·PC 배지 노출 지면 | 양 뷰포트 배지 정렬·줄바꿈 깨짐 없음(`md:`/`lg:` + `useBreakpoint`) |
| AC-11 | 컨벤션 정합 | `git grep` | hex/px 직타 0(`MarketStatusBadge`), 한글 카피 `lib/copy/market/marketStatus.ts`, queryKey `queryKeys.ts` 단일, 클라 `fetch(` 0, KST 산술은 `lib/api/toss/kst.ts` 재사용(중복 Intl 0) |
| AC-12 | `isRegularOpen` 노출 | `git grep "useMarketStatus"` | 훅이 `isRegularOpen` 반환(후속 폴링 게이트가 소비 가능한 형태) |

## 6. 데이터 / API (실측 완료)

- `GET https://openapi.tossinvest.com/api/v1/market-calendar/KR` (옵션 `?date=YYYY-MM-DD` 기준일 변경). `tossGet` 이 `{result}` 언래핑.
- 모든 시각 ISO `+09:00`. **`today.integrated === null` = 오늘 휴장**(주말·공휴일). non-null = 영업일. `nextBusinessDay` = 다음 개장일 + 세션 시각(휴장일 "다음 개장" 표시).
- 레이트리밋 헤더 **3**(호가 10 보다 낮음) — 캐시 필수. 캘린더는 하루 단위 정적이라 성공 TTL 길게 = 사실상 하루 1~수콜.
- 정규화 규칙: 세션 `start/end` 는 HH:mm 로 포맷(요일·날짜 표기용), 동시호가 시각은 세션별 존재 필드만 채움(`pre`·`regular`=start auction, `after`=end auction). null·부재 방어.

## 7. 가정 · 제약 · 참고

- 선행: 토스 어댑터(`toss-market-data-adapter`)·`tossGet`·토큰 인프라·시리즈 ①(`toss-orderbook` #243) 머지 완료(현 main 반영).
- prod 는 TOSS env 미설정이라 배포돼도 dormant(phase=unknown 경로) — 활성화는 TOSS 키 등록만으로, `MARKET_DATA_SOURCE` 와 **독립**(`isTossConfigured` 게이트만).
- **KST 유틸 재사용**: `lib/api/toss/kst.ts` 에 Intl `Asia/Seoul` 기반 `todayKstDate`·`isoToKstDate`·`addDaysToDash` 등이 이미 있다. `marketClock` 의 KST 현재시각·ISO→HH:mm·날짜 포맷은 이 유틸을 재사용/확장한다(새 타임존 산술 금지, §9 q5).
- **기존 시각 판정 자산과의 관계(치환 아님, 병존)**:
  - `lib/utils/kstMarketHours.ts` — 공휴일 미인지 휴리스틱. 호가 폴링 게이트(#243)·분봉·warnings·단타 틱·스케줄러가 사용 중. 본 PRD 는 대체가 아니라 **상위 진실원천**을 추가.
  - `lib/market/snapshot.ts` `estimateSession()` + `MarketSession="pre"|"open"|"post"|"closed"` — 유사 시각 추정 이미 존재. 본 PRD `MarketPhase="pre"|"regular"|"after"|"closed"|"unknown"` 와 네이밍이 다르다(regular↔open, after↔post). **기존 타입 리네임 금지**(스냅샷 리더 다수) — 매핑은 후속 통합 시 문서화. 본 PRD 는 새 `MarketStatus` 를 별도로 둔다.
- 레이트리밋: 토스 그룹 정책. 캘린더 헤더 3 → 캐시로 사실상 하루 수콜. `date` 파라미터 남용 금지(기본 오늘만).
- 참고: `lib/api/toss/warnings.ts`·`lib/api/toss/orderbook.ts`(패턴 원본), `lib/api/toss/client.ts`(`tossGet`), `lib/api/toss/kst.ts`(KST 유틸), `app/api/stock/warnings/route.ts`(fail-soft·`jsonWithDataSource` 헤더 관례), `lib/server/bffUtils.ts`(`withTimeout`·`jsonWithDataSource`), `hooks/query/queryKeys.ts`, `lib/query/queryConfig.ts`, `docs/rules/frontend.md`.

## 8. 영향 분석

- **변경 라인 추정**: 신규 파일 8~9개(어댑터·원본타입·앱타입·`marketClock`·BFF·클라·쿼리훅·도메인훅·UI·카피) + `queryKeys`/`queryConfig`/`toss/types.ts` 소폭 추가 + 배지 배선 1지면. 순수 add-only 성격 → 회귀면적 작음. 대략 350~550 라인(순수함수·유닛테스트 포함).
- **커밋 분할 권고**: (a) 데이터 계층(어댑터·타입·`marketClock`+유닛·BFF·클라·쿼리훅), (b) 도메인훅 `useMarketStatus`(클라 재평가), (c) `MarketStatusBadge` UI + 카피 + 배선. 디자이너 DESIGN.md 커밋(색 신규 시)은 (c) 앞에 선행. 색 신규 0 이면 DESIGN.md 무변경.
- **① 호가 PRD 와의 연계(핵심)**: #243 호가 폴링은 이미 `isKstMarketHoursWithCloseGrace()`(휴리스틱, 공휴일 미인지)로 게이트한다. 캘린더 기반 `isRegularOpen` 으로 갈아타면 **평일 공휴일에도 폴링 중단**으로 콜을 아낀다(현재는 빈 응답·서버 dedup 에만 의존). **단, 본 PRD 는 그 배선을 하지 않는다(§4 Out, §9 q3 PM 권고=Out)** — 이유: (1) 게이트는 이미 fail-soft 동작 중이라 급하지 않고, (2) 폴링을 네트워크 백드 상태에 커플링하면 "캘린더 실패 → `isRegularOpen=false` → 장중에 폴링 오정지" 라는 새 실패모드가 생겨 **fail-open 기본값**(unknown → 휴리스틱 폴백)이라는 미묘한 규약과 전용 QA 케이스가 필요하며, (3) 방금 머지된 훅을 다시 건드리면 #243 회귀면을 재오픈한다. → `isRegularOpen` 을 fail-open 으로 노출만 해 두고, 게이트 스왑은 얇은 후속 PR(2줄 + fail-open QA).
- **스케줄러 휴장가드 연계**: `tickScheduler.ts`(로컬 CLI)가 평일 공휴일에 헛틱한다(무해하지만). `marketClock.todayIsBusinessDay` 로 가드하면 정확해지나, 스케줄러가 defer 상태라 배선은 후속(§4).
- **실시간성 / 폴링**: 캘린더는 정적 → 서버 캐시 성공 TTL 길게(수콜/일), 쿼리 폴링 없음(`staleTime` 길게). **phase 만 시간 경과로 바뀌므로** 클라 재평가(§9 q2)로 해결 — 네트워크 콜 없이 세션 경계에서 라벨 갱신.
- **회귀 위험 낮음**: 기존 라우트/훅/타입 시그니처 무변경, 순수 add. 유일 공유 편집 지점 = `queryKeys.ts`·`queryConfig`·`toss/types.ts`(모두 add). 배지 노출 지면 1곳만 실질 편집(디자이너 확정 후).

## 9. OPEN QUESTION

- **[OPEN QUESTION] q1. `MarketStatusBadge` 노출 위치** — 헤더 티커(`components/layout/HeaderMarketTicker.tsx`) 옆 vs 마켓 홈(`app/(main)/market/page.tsx`) 상단. **PM 권고: 헤더 티커 옆**(전 지면 상시 노출 = 장 상태는 전역 컨텍스트). 단 모바일 헤더 공간 협소 → 마켓 홈 상단 병행/대체 여지. **UX 디자이너 최종 결정** — 결정 전까지 컴포넌트만 만들고 배선 1곳은 확정 후 커밋.
- **[OPEN QUESTION] q2. 클라 phase 재평가 방식** — (a) `setInterval` 1분 재평가, (b) 다음 세션 경계까지 `setTimeout` 1회, (c) 리페치 의존(staleTime 만료 시 서버 재판정). **PM 권고: (b) 다음 경계 `setTimeout`** — 불필요한 1분 틱 없이 정확한 순간(09:00·15:30·20:00)에 1회 갱신, 경계 지나면 다음 경계 재예약. 구현 부담이면 (a) 1분 `setInterval` 폴백(가벼움). (c) 는 staleTime 길어 지연 → 비권장. 순수 `deriveMarketStatus` 를 클라에서 재적용하므로 어느 쪽이든 네트워크 콜 0.
- **[OPEN QUESTION] q3. 호가/시세 폴링 게이팅을 본 PR 에 포함할지** — #243 `useQueryStockOrderbook` 등의 폴링 게이트를 `isKstMarketHoursWithCloseGrace()`(휴리스틱) → `useMarketStatus().isRegularOpen`(캘린더) 로 갈아탈지. **PM 권고: 본 PR 에서 제외(Out) — 얇은 후속 PR.** 근거(§8): 현 게이트가 이미 fail-soft 동작 중이라 급하지 않고, 폴링을 네트워크 백드 상태에 커플링하면 "캘린더 실패 → 장중 폴링 오정지" 새 실패모드가 생겨 fail-open 기본값 + 전용 QA 가 필요하며, 방금 머지된 훅 재편집은 회귀면 재오픈. 본 PR 은 `isRegularOpen`(fail-open: unknown → true/휴리스틱 폴백)을 **노출만** 해 스왑을 2줄로 만든다. (사용자가 "같은 PR 내 optional 커밋" 을 원하면 fail-open 기본값 + AC 1줄 추가로 In 전환 가능 — close call.)
- **[OPEN QUESTION] q4. 공휴일 목록 신뢰도** — 토스 캘린더가 임시휴장·반차(연말 15:30 조기 마감 등)까지 반영하는지 실측 범위(현 실측은 평시만 확인). **PM 권고: 토스 응답을 단일 진실원천으로 신뢰. `today.integrated===null` 만으로 휴장 판정(날짜 파싱 최소화), 세션 경계는 응답 시각을 그대로 사용(조기 마감도 `regularMarket.endTime` 이 반영하면 자동 정확).** 별도 공휴일 테이블 미구축. 반차/조기마감 실측은 해당일 도래 시 스팟 확인(백로그).
- **[OPEN QUESTION] q5. KST 현재시각 산출** — `marketClock` 이 `Intl Asia/Seoul` 을 새로 짤지 vs 기존 `lib/api/toss/kst.ts` 재사용. **PM 권고: 기존 `kst.ts` 재사용/확장**(이미 Intl `Asia/Seoul` 기반 `todayKstDate`·`isoToKstDate`·`addDaysToDash` 존재 — §7 확인). 필요한 "KST 현재 분(minute-of-day)" 헬퍼만 `kst.ts` 에 추가(도메인 무관 위치 유지). 새 타임존 산술 중복 금지.
