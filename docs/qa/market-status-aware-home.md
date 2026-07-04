# QA — market-status-aware-home (시장상태 인지형 마켓 홈)

- 대상 PR: #247 / 브랜치 `feature/market-status-aware-home`
- 근거: `docs/prd/market-status-aware-home.md` §5 AC · `docs/design/market-status-aware-home.md` (R1~R10)
- QA 일자: 2026-07-05 (QA 역할)
- 판정: **qa-passed** (실패 0건)

## 검증 방식 · 브라우저 E2E 불가 사유

앱은 **로그인 게이트**(미인증 시 `/market`·`/` → 307 리다이렉트, `/api/*` → 401)라 헤드리스 브라우저 세션을
정당하게 발급할 수 없다(세션 토큰 위조는 보안 우회라 미수행). 따라서 마감 렌더 로직은 **① 순수함수
유닛(`deriveMarketStatus`, 캘린더/폴백 양 경로) + ② 컴포넌트 게이팅 코드 정독 + ③ dev 서버 라우트
건전성(500/컴파일에러 0) + ④ 자동화 게이트(tsc/lint/vitest/design:sync/grep)** 로 검증했다. 마감 게이팅은
전부 **클라 훅/컴포넌트 `enabled`·`refetchInterval` 레벨**이라 route handler 무변경(AC-13)이며 순수함수로
결정론 고정이 가능해 유닛이 브라우저 E2E 를 실질 대체한다.

## AC 별 검증 표

| # | 시나리오 | 재현 / 근거 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | 실시간 순위 마감 | `RealtimeRankingSection`: 4개 훅 `enabled: tab===... && isRegularOpen`, `!isRegularOpen` → `<MarketClosedNotice>` (로딩/에러/리스트 분기 **앞**). `deriveMarketStatus(holiday, 10:00).isRegularOpen=false` (유닛) | 에러카드 0, 마감 안내, 4탭 KIS TR 무호출, 탭바 유지 | `enabled` AND 곱 확인 → `false` 시 4탭 모두 미페치. 탭바(`RankTabs`)는 분기 밖 상시 렌더 | PASS |
| AC-2 | 실시간 순위 정규장 무회귀 | `isRegularOpen=true` → 기존 loading/error/list/failedTabs 경로 그대로. 게이팅 분기는 `!isRegularOpen` 에서만 | 4탭 기존대로, 안내 미노출 | 마감 분기 미진입, `failedTabs`·자동전환금지·관심종목 단일소유 무변경 | PASS |
| AC-3 | 순매수 당일 마감 | `InvestorFlowTop10Card`: `marketClosedToday = mode==="today" && !isRegularOpen`, `enabled: mode==="cumulative" \|\| isRegularOpen` → today+마감 = `false` | 에러카드 0, 안내+넛지, KIS 순매수 TR 무호출 | today+마감 `enabled=false` → 무호출. `<MarketClosedNotice nudge={<FlowClosedNudge>}>` | PASS |
| AC-4 | 순매수 7일 누적 마감(게이팅 안 함) | `enabled: mode==="cumulative" \|\| isRegularOpen` → cumulative 는 항상 `true` | 정상 표시, 안내 미노출, `cumulativeCollecting` 무회귀 | cumulative 상시 조회. `marketClosedToday=false`(mode≠today) → 안내 미노출. collecting 분기 유지 | PASS |
| AC-5 | 순매수 소프트 넛지 | `settledRef` 가드: 마운트 후 `!isRegularOpen` 이면 **초기 1회** `setMode("cumulative")`. `changeMode` 는 `settledRef=true` 선설정(사용자 조작 존중) | 초기값 cumulative 착지, 당일 클릭 시 AC-3 안내, 강제전환 없음 | `settledRef.current` 로 1회성 보장. 사용자 토글 후 넛지 억제 | PASS |
| AC-6 | 순매수 정규장 무회귀 | 장중 `isRegularOpen=true` → effect `if(!isRegularOpen)` 미진입 → 넛지 미발동, `mode` 초기값 `today` 유지 | 당일/누적 기존대로, 넛지 미발동 | 넛지 effect 는 마감에서만 발화 | PASS |
| AC-7 | 호가·체결 폴링 공휴일 정지 | `useQueryStockOrderbook`·`useQueryStockTrades`: `refetchInterval: () => refetchIntervalMs!=null && isRegularOpen ? ms : false`. 패널 `closed=!useMarketStatus().isRegularOpen` | 공휴일 `refetchInterval=false`(폴링 정지), 패널 `closed=true` | 휴리스틱→`isRegularOpen` 스왑 확인. `deriveMarketStatus(holiday).isRegularOpen=false` → 정지·closed 라벨 | PASS |
| AC-8 | 폴링 fail-open 무회귀 | 장중+캘린더 실패 → KST 폴백 `deriveMarketStatus(null, 평일 10:00).isRegularOpen=true` (유닛 명시) | 폴링 정상 지속, 오정지 없음 | 폴백 유닛 통과. 장중 시간엔 `regular`→폴링 유지. 캘린더 백드가 장중 폴링 오정지 유발 안 함 | PASS |
| AC-9 | 폴링 정규장 무회귀 | 영업일 장중 `isRegularOpen=true` → `refetchIntervalMs`(단타 3s·상세 10s) 그대로. `refetchIntervalMs` 미주입 시 폴링 없음 유지 | 기존 주기 폴링, 패널 `closed=false` | 게이트만 스왑, 주입 시그니처(`refetchIntervalMs`) 무변경 | PASS |
| AC-10 | unknown fail-open (홈) | 캘린더 실패 → KST 폴백. 장중 시간엔 `regular`→`isRegularOpen=true`→ 실시간 순위·순매수 당일 `enabled` 정상 | 조회 정상, 안내 미노출, 에러 로그 0 | 장중 시각엔 폴백이 regular 반환 → 조회·안내미노출 유지. dev 로그 에러 0 | PASS (주1) |
| AC-11 | 반응형 두 뷰포트 | `MarketClosedNotice` `flex flex-col items-center` 세로 스택. `FlowClosedNudge` `useBreakpoint().isMobile && flex-col`(모바일 링크 다음 줄). hex/px 직타 0 | 양 뷰포트 정렬·줄바꿈 깨짐 없음 | Tailwind `flex-col`+`useBreakpoint` 사용, `window.innerWidth` 직접검사 0. (시각 확인은 로그인게이트로 코드검증 대체) | PASS (코드) |
| AC-12 | 컨벤션 정합 | 아래 "게이트/그렙" 절 | hex/px 0, 카피 `lib/copy` 단일, `useQuery` 직접 import 0, 클라 `fetch(` 0 | 전부 0 | PASS |
| AC-13 | 라우트 무회귀 | `git diff main...HEAD -- app/api/market app/api/flow` | 무변경(빈 출력) | **빈 출력** 확인 | PASS |

주1) AC-10 뉘앙스(의도된 스코프 확장): 기존엔 캘린더 실패 → `phase="unknown"` → `isRegularOpen=true`(항상,
24h). 본 PR 은 사용자 확정 결정으로 `deriveMarketStatus` 에 **KST 휴리스틱 폴백**을 추가해 캘린더 없이도
주말/야간 마감을 잡는다. **AC 가 명시한 "장중" 시각에선 폴백이 `regular` 를 반환**해 fail-open(조회·폴링
정상)이 그대로 보존된다(유닛 `null + 평일 장중 10:00 → isRegularOpen=true` 통과). 야간/주말엔 이제 마감
안내가 뜨지만 이는 회귀가 아니라 PR 본문·HANDOFF 에 명시된 의도된 개선이다. fail-open 정신(의심스러운
평일 공휴일 장중 시간 → `regular` 유지)은 폴백에서도 유지된다.

## KST 폴백 유닛 근거 (핵심 · prod 가치)

`npx vitest run lib/market lib/api/toss` → **13 파일 · 121 테스트 전부 통과** (marketClock 18 tests 포함).
폴백 6종 + 캘린더 경로 무회귀 결정 고정:

| 케이스 | 입력 | 결과 |
|---|---|---|
| 폴백·평일 장중 | `deriveMarketStatus(null, 월 10:00)` | `regular` / `isRegularOpen=true`(fail-open) / `nextOpen=null` |
| 폴백·09:00 정각 | `null, 월 09:00` | `regular`(정규장 시작 inclusive) |
| 폴백·15:31 마감직후 | `null, 월 15:31` | `closed` / `isRegularOpen=false`(엄격 15:30, grace 손실 수용) / 장 마감(평일) |
| 폴백·평일 야간 | `null, 월 20:30` | `closed` / `todayIsBusinessDay=true`(장 마감) |
| 폴백·토요일 | `null, 토 10:00` | `closed` / `todayIsBusinessDay=false`(휴장) |
| 폴백·일요일 장중시각 | `null, 일 11:00` | `closed`(주말은 시간 무관 휴장) |
| 캘린더 경로 무회귀 | `businessDay`/`holiday` phase·nextOpen·경계값(09:00/15:30/20:00) | ② AC-2~AC-7 그대로 통과 |

`deriveMarketStatus` 는 진짜 예외(파싱 실패 등)만 세션 결측으로 흡수하고, `!calendar` 일 때만 폴백으로
분기한다 — 캘린더 있으면 폴백 경로 미진입(무회귀 확인).

## 3구분 시각 분리 (DESIGN R4) — 코드 확인

| 상태 | 트리거 | 렌더 | 색/액션 |
|---|---|---|---|
| (a) 장 마감 | `!isRegularOpen`(명시적 마감) | `MarketClosedNotice` (`bg-surface-muted` + 회색 점 `bg-text-muted` + `text-primary` 제목) | 무채색 muted, **재시도 버튼 없음** |
| (b) 진짜 에러 | 장중 + `isError` | 순위=`RANK_ERROR`+"다시 시도", 순매수=`card-critical`+재시도 (무변경) | 빨강 `critical`, 재시도 유지 |
| (c) 로딩 | `isLoading` | `RankSkeleton`/`SkeletonColumn` | 스켈레톤 |

- 마감 분기가 로딩/에러/리스트 **앞**에 위치 → 마감 경로에서 `isError`(에러카드) 도달 불가(호출 자체 안 함).
- 마감 안내는 `critical` 빨강 미사용(muted 만). 회색 점만 남기지 않고 제목 라벨 동반(색맹 이중 인코딩, `aria-hidden` 점 + 텍스트).
- `MarketClosedNotice` 에 `role="status"`, 넛지 링크는 `<button>`(포커스 가능). 제목=`marketStatusLabel` ("장 마감"/"휴장"), 보조=`nextOpenText`(nextOpen 있을 때만; 폴백은 null 이라 생략).

## 폴링 스왑 대상 한정 확인 (③ 후속 회수)

- 스왑 대상 = `useQueryStockOrderbook`·`useQueryStockTrades` **2훅** + `OrderbookPanel`·`TradeStrengthPanel`
  **2패널** 뿐. 각 훅 `refetchInterval` 게이트가 `isKstMarketHoursWithCloseGrace()` → `useMarketStatus().isRegularOpen`
  으로 교체, fail-open 유지. 패널 `const closed = !useMarketStatus().isRegularOpen` 로 폴링 게이트와 라벨 정합.
- 무회귀 대상 확인: `warnings`·`minute`(분봉)·단타·스케줄러는 여전히 `isKstMarketHoursWithCloseGrace()`/`isKstMarketHours()`
  사용(본 PR 미변경, PRD §4 Out 준수).

## 게이트 / 그렙 수치

| 항목 | 명령 | 결과 |
|---|---|---|
| 타입 | `npx tsc --noEmit` | exit 0 |
| 린트 | `npm run lint` | exit 0 |
| 유닛 | `npx vitest run lib/market lib/api/toss` | 121 passed (13 files) |
| 토큰 동기화 | `npm run design:sync` | no-op (theme.json/config 무변경, 신규 토큰 0, R10) |
| hex/px 직타 | `git grep -nE '#hex\|px' -- 변경 컴포넌트 5종 | MarketClosedNotice | 0건 |
| 클라 fetch( | `git grep '\bfetch(' -- components/ hooks/ lib/` (prefetch/refetch 제외) | 0건 |
| useQuery 직접 import | `git grep '@tanstack/react-query' -- 변경 컴포넌트 3종` | 0건 (도메인 훅만) |
| BFF 127.0.0.1 | `git grep 'http://127.0.0.1' -- app/` | route handler fallback(`workbench/_adapters/fastapi.ts`)만 → 위반 0 |
| 라우트 무변경 | `git diff main...HEAD -- app/api/market app/api/flow` | 빈 출력 |
| 카피 단일 위치 | 넛지 2개 `lib/copy/flow/labels.ts`, 제목 폴백 `lib/copy/market/marketStatus.ts` | 단일 위치 준수 |

## 라우트 건전성 (dev 서버 :3099)

로그인 게이트 하 라우트 건전성만 확인(마감 렌더는 유닛/코드로 검증):

| 경로 | 결과 |
|---|---|
| `/market` | 307 (login gate — 정상) |
| `/` (home) | 307 (login gate — 정상) |
| `/api/market/calendar` | 401 (gate — 정상) |
| dev 컴파일 에러 | 0건 (Ready 204ms, 로그 error/crash 0) |

500·컴파일 에러 0. 브라우저 렌더는 로그인 게이트로 미수행(위 "검증 방식" 참조).

## 에지 케이스

- **캘린더 null(TOSS 키 없음/장애)**: KST 폴백 진입 → 장중=regular(fail-open), 야간/주말=closed. `nextOpen=null` → 마감 안내에서 보조("다음 개장") 생략(방어). 유닛 통과.
- **`marketStatusLabel` null(phase="unknown")**: `MarketClosedNotice` 가 `MARKET_CLOSED_TITLE_FALLBACK`("장 마감")로 방어. 정상 경로(마감 안내는 closed 에서만)에선 미도달.
- **grace 10분(15:30~15:40) 손실**: 폴링이 엄격 15:30 로 정지(기존 15:40). PRD §3-3/§8 수용, 폴백도 동일 엄격 15:30 로 두 경로 semantic 일치. 마감 후 호가 정지는 정상.
- **StrictMode 더블 마운트 / 소프트 넛지**: `settledRef`(useRef) 는 리렌더에 안정 → 넛지 1회성 유지, 이중 setMode 없음.
- **모바일 넛지 줄바꿈**: `useBreakpoint().isMobile` 로 `flex-col`(링크 다음 줄), `window.innerWidth` 직접검사 0.

## 결론

AC-1 ~ AC-13 **전부 PASS**, 실패 0건. KST 폴백 유닛(핵심 prod 가치) 6종 + ② 캘린더 경로 무회귀 통과,
3구분 시각 분리·폴링 스왑 한정·라우트 무변경·컨벤션 정합 모두 확인. → `qa-passed`.
</content>
</invoke>
