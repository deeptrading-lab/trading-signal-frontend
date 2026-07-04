# QA 리포트 — toss-market-calendar (토스 장 상태 배지 + 장시계 유틸)

- 슬러그: `toss-market-calendar`
- PR: #244 / 브랜치 `feature/toss-market-calendar`
- 근거: `docs/prd/toss-market-calendar.md` §5 AC / `docs/design/toss-market-calendar.md`
- QA 일자: 2026-07-05 (토·휴장), QA 역할
- 검증 도구: Read/Bash/Grep (브라우저 없음). 라운드트립은 실제 토스 API(`.env.local` TOSS 키 설정됨) 대상 dev 서버(:3099) 라이브.
- **판정: qa-passed (실패 0건)**

---

## 0. 게이트 수치 (요약)

| 게이트 | 명령 | 결과 |
|---|---|---|
| 타입체크 | `npx tsc --noEmit` | **0 에러** (EXIT 0) |
| 린트 | `npm run lint` (eslint .) | **0 에러** (EXIT 0) |
| 유닛 | `npx vitest run lib/market lib/api/toss` | **99 pass / 12 files** (marketClock 13 · marketCalendar 5) |
| DESIGN 토큰 동기화 | `npm run design:sync` → `git diff tailwind.theme.json` | **diff 0** (이미 동기·재생성 무변경) |
| 클라 `fetch(` | grep `components/market` `hooks/market` `lib/api/market/calendar.ts` `lib/copy/market` | **0건** |
| BFF 무회귀 | grep `http://127.0.0.1` -- `app/` | 잔여 3건 전부 **route handler fallback**(whitelist/search·workbench adapter, 본 PR 무관) |
| hex/px 직타 | grep `MarketStatusBadge.tsx` `marketStatus.ts(copy)` | **0건** |
| `innerWidth` 직접검사 | grep `components/market` `hooks/market` | **0건** |

---

## 1. AC 별 검증 표

| # | 시나리오 | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-0 | 스키마 정합 | `lib/api/toss/types.ts` 정독 | §3-2 확정 스키마(`integrated` nullable·세션 3종·동시호가 옵셔널), 추정 필드 0 | `TossMarketSession`(startTime·singlePriceAuctionStart/EndTime·endTime 전부 옵셔널)·`TossSessions`(pre/regular/afterMarket 옵셔널)·`TossCalendarDay`(`integrated?: TossSessions \| null`)·`TossMarketCalendar`(today/prev/nextBusinessDay) 전부 존재. 주석에 "토스 전용·KIS TR 없음" 명시 | **PASS** |
| AC-1 | 토스 키 없음(동료 로컬) | `fetchMarketCalendar` 유닛 + BFF route 코드 | 200 + `phase="unknown"` + `X-Data-Source: none`, 토스 무호출, 배지 미표시, 로그 0 | 유닛 "키 미설정이면 null 이고 토스를 호출하지 않는다" PASS. route.ts: `!isTossConfigured()` → `deriveMarketStatus(null,…)`(unknown) + `jsonWithDataSource(…, "none")`. `MarketStatusBadge`: `marketStatusLabel(unknown)=null` → `return null`(자기 은닉) | **PASS** (라이브는 키 설정돼 있어 유닛+코드로 확인) |
| AC-2 | 영업일 정규장 | `deriveMarketStatus(businessDay, 10:00)` 유닛 | `phase="regular"`, `isRegularOpen=true`, `todayIsBusinessDay=true`, 배지 "장중" | 유닛 PASS(phase=regular·isRegularOpen=true·auction 15:20·nextOpen=null). 카피 `regular → {full:"장중"}` | **PASS** |
| AC-3 | 프리마켓 | `deriveMarketStatus(businessDay, 08:30)` 유닛 | `phase="pre"`, `isRegularOpen=false`, "장전 · 동시호가 08:50" | 유닛 PASS(phase=pre·pre.auction=08:50). 카피 `pre → "장전 · 동시호가 {auction}"` | **PASS** |
| AC-4 | 애프터마켓 | `deriveMarketStatus(businessDay, 16:00)` 유닛 | `phase="after"`, "시간외 · 20:00까지" | 유닛 PASS(phase=after·after.end=20:00). 카피 `after → "시간외 · {end}까지"` | **PASS** |
| AC-5 | 장외(개장 전/마감 후 영업일) | 유닛 07:00·20:30 + 라이브 `?date=2026-07-06`(개장 전 경로) | `phase="closed"`, `nextOpen` = 오늘 잔여 or 익영업일 | 유닛: 07:00 → nextOpen=오늘 09:00 / 20:30 → nextOpen=익일(2026-07-07) 09:00. 라이브 `?date=2026-07-06`(now=토): `phase=closed·todayIsBusinessDay=true·nextOpen=2026-07-06 09:00·sessionTimes 완전 채움`(pre 08:00/08:50/09:00·regular 09:00/15:20/15:30·after 15:30/15:40/20:00) | **PASS** |
| AC-6 | 휴장(주말·공휴일) | 라이브 today(2026-07-05 토) + 유닛 holiday | `phase="closed"`, `todayIsBusinessDay=false`, `nextOpen`=nextBusinessDay, 배지 "휴장 · 다음 개장 …" | **라이브 PASS**: `today.integrated=null` → `phase=closed·todayIsBusinessDay=false·isRegularOpen=false·nextOpen={2026-07-06,09:00}·sessionTimes=null`, `X-Data-Source: toss`. 카피 `closed && !todayIsBusinessDay → "휴장"` + `nextOpenText → "다음 개장 7/6(월) 09:00"` | **PASS** |
| AC-7 | 순수함수 경계 | `npx vitest run lib/market` | 6 상태 + 경계값(09:00·15:30·20:00·08:00) 결정 고정 | 마켓클록 13 유닛 PASS: 09:00=regular(정규장 inclusive/장전 exclusive)·15:30=after·20:00=closed·08:00=pre. `[start,end)` 반개구간 확정 | **PASS** |
| AC-8 | 캐시/single-flight | `fetchMarketCalendar` 유닛 | 성공 TTL 1콜, 동시요청 single-flight 1콜 | 유닛 PASS: TTL 내 재요청 1콜·`Promise.all` 동시 1콜·실패 캐시(30s) 1콜·비정형 응답 null 방어 | **PASS** |
| AC-9 | 클라 phase 재평가 | `useMarketStatus` 코드 정독 | 서버 재요청 없이 세션 경계 경과 시 phase 갱신(§9 q2 b) | `sessionBoundaries`로 다음 경계 산출 → `setTimeout(경계-now+500ms)` → `setReevalAtMs(Date.now())` → `deriveMarketStatus(calendar, reevalAtMs)` 재적용. 경계마다 재예약(useEffect dep=reevalAtMs). 첫 페인트는 서버 주입시각(reevalAtMs=null) 사용해 클라 시계오차 회피. 네트워크 콜 0 | **PASS** (코드 검증) |
| AC-10 | 반응형 두 뷰포트 | `MarketStatusBadge` + `useBreakpoint` 코드 | 모바일·PC 배지 노출·줄바꿈 깨짐 없음 | `useBreakpoint`(SSR-safe mobile-first, `isMobile<768`·`isDesktop>=1024`). 모바일=`label.short`(장중/장전/시간외/마감/휴장), 태블릿↑=`label.full`, 데스크탑만 "다음 개장" 보조. `whitespace-nowrap`(components.css)로 줄바꿈 방어. Header 배선이 `hidden lg:flex` gate 미상속(§ 아래) | **PASS** |
| AC-11 | 컨벤션 정합 | grep | hex/px 0·카피 단일·queryKey 단일·클라 fetch 0·KST 재사용 | hex/px 0(위 게이트). 카피 `lib/copy/market/marketStatus.ts` 단일. queryKey `queryKeys.market.calendar` 단일. 클라 fetch 0. KST 산술=`lib/api/toss/kst.ts` 재사용(`isoToKstHm`·`kstWeekdayKo`·`todayKstDate`), 신규 Intl 0 | **PASS** |
| AC-12 | `isRegularOpen` 노출 | `useMarketStatus` 반환 타입 | 훅이 `isRegularOpen` 반환(후속 폴링 게이트 소비 가능) | `useMarketStatus(): MarketStatus` — `MarketStatus.isRegularOpen` 포함. fail-open 규약(unknown→true) 타입 주석·유닛으로 고정 | **PASS** |

**AC 12/12 PASS.**

---

## 2. 라운드트립 (BE LIVE — 실제 토스 API)

`.env.local` 에 `TOSS_CLIENT_ID`/`TOSS_CLIENT_SECRET` 설정 확인 → dev 서버 :3099 기동(기존 :3000 미기동, 충돌 없음) → 검증 후 :3099 종료. 오늘 2026-07-05(토)=휴장.

### RT-1 today (2026-07-05 토 = 휴장)
```
$ curl -s -D- localhost:3099/api/market/calendar
HTTP/1.1 200 OK
x-data-source: toss
{"status":{"phase":"closed","isRegularOpen":false,"todayIsBusinessDay":false,
 "todayDate":"2026-07-05","nextOpen":{"date":"2026-07-06","time":"09:00"},
 "sessionTimes":null}, "calendar":{"today":{"date":"2026-07-05","integrated":null},…}}
```
- 기대: phase=closed·휴장·nextOpen 2026-07-06 09:00. **일치** → AC-6 라이브 PASS.
- `today.integrated=null` 로 토요일 휴장 정확 판정. `nextBusinessDay=2026-07-06` 세션 시각 정상 수신.

### RT-2 `?date=2026-07-06` (월, 영업일 — 세션 파생 확인)
```
$ curl -s localhost:3099/api/market/calendar?date=2026-07-06
x-data-source: toss
status.phase=closed  todayIsBusinessDay=true  nextOpen={2026-07-06,09:00}
sessionTimes: pre{08:00/08:50/09:00} regular{09:00/15:20/15:30} after{15:30/15:40/20:00}
```
- now(토) < 월요일 정규장 → 개장 전 경로: phase=closed·nextOpen=오늘 정규장(AC-5). `sessionTimes` 완전 채움(동시호가 08:50·15:20, 시간외 종료 20:00) → ISO→HH:mm 파생 정상.
- 실측 부수 확인: afterMarket `singlePriceAuctionEndTime`=15:40(실 데이터), 타입 옵셔널 방어 정상.

### RT-3 에지 (malformed/empty date param)
```
?date=notadate → phase=closed todayDate=2026-07-05  (오늘로 폴백)
?date=          → phase=closed                        (오늘로 폴백)
```
- `DATE_RE` 미매칭 시 `undefined`→오늘 KST 로 안전 폴백(route + 로더 이중). 크래시·500 없음.

> 라이브 `regular`/`pre`/`after` phase 는 QA 시각(토·휴장)에서 실시간 재현 불가 → 시각 주입 유닛(AC-2/3/4/7)으로 결정 고정. PRD §3-4(순수함수 시각 주입) 설계에 부합.
> `X-Data-Source: none` 경로는 로컬 TOSS 키 설정으로 라이브 재현 불가 → 유닛(AC-1) + route 코드로 확인.

---

## 3. 파생 순수함수 경계 케이스 (marketClock)

`npx vitest run lib/market` — 13 케이스 전부 PASS. 반개구간 `[start, end)` 결정 고정:

| 주입 시각 | 기대 phase | 근거 |
|---|---|---|
| 08:00 정각 | pre | 장전 시작 inclusive |
| 08:30 | pre | 동시호가 08:50 표기 |
| 09:00 정각 | **regular** | 정규장 시작 inclusive · 장전 끝 exclusive(경계 우선순위: regular 먼저 검사) |
| 10:00 | regular | 정규장 내부 |
| 15:30 정각 | **after** | 정규장 끝 exclusive · 시간외 시작 inclusive |
| 16:00 | after | 시간외 내부 |
| 20:00 정각 | **closed** | 시간외 끝 exclusive → nextOpen=익영업일 |
| 07:00 (개장 전) | closed | nextOpen=오늘 정규장 |
| 20:30 (마감 후) | closed | nextOpen=익영업일 |
| 휴장 today.integrated=null | closed·휴장 | nextOpen=nextBusinessDay, sessionTimes=null |
| calendar=null | unknown | isRegularOpen **fail-open(true)**, 나머지 안전 기본값 |

- `sessionBoundaries`: 영업일 [08:00,09:00,15:30,20:00] 오름차순·중복제거, 휴장/null=빈 배열 → 클라 재평가 setTimeout 예약의 정확성 담보.
- **fail-open 규약 검증**: `UNKNOWN_MARKET_STATUS.isRegularOpen=true` — 후속 폴링 게이트가 "캘린더 실패→장중 폴링 오정지" 새 실패모드를 만들지 않도록 하는 의도적 설계(PRD §8/q3, 타입 주석·유닛 고정). QA 확인.

---

## 4. UI / 색 / 모바일 / 접근성 (코드 검증)

### phase 5종 점 색 토큰 정합 (DESIGN R2)
`DOT_COLOR_BY_PHASE`: regular→`bg-market-open`(녹) · pre→`bg-warn`(amber) · after→`bg-info`(blue) · closed→`bg-text-muted`(회) · unknown→`bg-border-line`(흐린회). DESIGN Colors/R2 매핑과 **완전 일치**. hex 직타 0.

### 강조·펄스 (DESIGN R3 / Elevation)
장중만 `market-badge-open`(옅은 녹색 필 `bg-market-open-soft` + `text-market-open`) + 점에 `motion-safe:animate-pulse`. `motion-safe:` 로 `prefers-reduced-motion` 시 펄스 제거·색 유지 — DESIGN 명세 충족. 나머지 상태는 `market-badge`(배경 없는 인라인).

### 모바일 축약 (DESIGN R5)
`isMobile ? label.short : label.full`. short = 장중/장전/시간외/마감/휴장. 보조("다음 개장")는 `isDesktop` 에만. **점만 남기지 않고 축약 라벨 유지**(색+텍스트 이중 인코딩, 색맹 접근성).

### 색+텍스트 이중 인코딩 / 접근성
- 컨테이너 `role="status"` + `aria-label`(풀 라벨 + 보조 텍스트 결합) → 스크린리더가 축약/보조 생략과 무관하게 완전 정보 전달.
- 점 `aria-hidden="true"`(장식), 보조 텍스트도 `aria-hidden`(aria-label 에 이미 포함, 중복 낭독 방지). 이중 낭독 없음.
- 카피 전부 한글(ticker·API 필드 외), 톤 무회귀.

### Header 배선 — `hidden lg:flex` gate 미상속 (DESIGN R1 핵심)
`components/layout/Header.tsx`: `<MarketStatusBadge />` 가 `<HeaderMarketTicker />`(데스크탑 `hidden lg:flex`)의 **형제 독립 슬롯**(`flex items-center gap-lg ml-auto` 컨테이너 직속). gate 미상속 → **모바일에도 렌더**. unknown/미도착 시 컴포넌트 `null` 반환으로 자기 은닉(지면 조건부 렌더 불요).

### SSR / StrictMode
`useBreakpoint` SSR-safe(첫 렌더 mobile-first) → 하이드레이션 미스매치 크래시 없음. `useMarketStatus` 첫 페인트=서버 주입 status(reevalAtMs=null), setTimeout은 useEffect cleanup(`clearTimeout`)으로 StrictMode 더블 마운트 누수 방어.

---

## 5. 토큰 라이브 동기화 검증 (스타일링)

신규 색 토큰 2개 SSOT 정합 (직접편집 아님):
- `docs/design/finsight-redesign.md`(SSOT): `colors.market-open=#166534`·`market-open-soft=#dcfce7`(L63-64) + `colors-dark.market-open=#4ade80`·`market-open-soft=#14321f`(L123-124). **양쪽 정합**(한쪽만 추가 시 design:sync throw — 미발생).
- `tailwind.theme.json`(L62-63): 동일값 반영.
- `npm run design:sync` 재실행 → `git diff tailwind.theme.json` **0 diff** → SSOT→theme.json 파이프라인 무손실 동기 확인(재생성 후 `git checkout` 복원).
- `app/components.css` `.market-badge`/`.market-badge-open` = `@layer components` + `@apply`(토큰 유틸만, hex/px 0).

---

## 6. 이슈

**없음.** 기능·게이트·컨벤션·접근성·토큰 전 항목 무결. 재현된 실패·회귀 0건.

### 참고(비차단, 후속 범위 — PRD §4 Out 확인)
- 호가/시세 폴링 게이트 실제 스왑(`isKstMarketHoursWithCloseGrace`→`isRegularOpen`)은 본 PR 비범위(§9 q3 PM 권고=Out). `isRegularOpen` fail-open 노출만 완료 — 후속 얇은 PR 대상. QA 무이슈.
- 스케줄러 휴장가드·`estimateSession` 통합·US 캘린더도 비범위(§4). 컴포넌트는 US 슬롯 가로 flex 예약만 유지 — 정상.

---

## 판정

**qa-passed** — AC 12/12 PASS, 게이트(tsc/lint/vitest/design:sync) 전부 통과, 라운드트립 라이브(휴장·영업일 date 파라미터·에지) 정상, 실패 0건. PR #244 본문에 `## 다음 작업` 섹션 존재(handoff-append 게이트 충족).
