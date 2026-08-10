# QA — intraday-history-live-refresh (PR #382)

- 실행일: 2026-08-10 (월) KST
- 브랜치: `feature/hylee/intraday-history-pagination` @ `e2235d5`
- 기준: `origin/main` `112cd55` (PR #381 반영, 이 브랜치에 병합 완료)
- 검증 시각: 09:48~10:00 KST (**장중**, 월요일 — 시각 의존 항목은 `now` 주입으로 별도 고정)
- 판정: **PASS** (실패 0 / 비차단 관찰 8건, 그중 브라우저 육안 잔여 3건)
- **재실행: 1,487 통과·실패 0 @ `26c4daa`** — QA 본 실행 이후 리뷰 지적 2건(offset 상한 무한 "더 보기" 픽스 + 커밋 혼입 제거)이 들어와 게이트를 다시 돌렸다. 아래 관찰 항목 중 "offset 상한 도달 시 더 보기가 끝나지 않음"은 이 커밋에서 **해소**됐고 회귀 테스트가 추가됐다.

---

## 0. 공통 게이트

| 항목 | 명령 | 결과 | 판정 |
|---|---|---|---|
| 테스트 | `npm run test` | `Test Files 167 passed \| 3 skipped (170)` · `Tests 1486 passed \| 3 skipped (1489)` · 실패 0 | PASS |
| 타입 | `npm run typecheck` | 출력 없음(오류 0) | PASS |
| 린트(변경 파일) | `npx eslint <변경 .ts/.tsx 32개>` | exit 0, 출력 0 | PASS |
| 린트(소스 전역) | `npx eslint app components hooks lib packages scripts` | `0 errors, 2 warnings` (기존 `scripts/intraday/analysis/stop-{cf,sweep}.mts` 의 `dm` 미사용 — 본 PR 무관) | PASS |
| 빌드 | `npm run build` | `✓ Compiled successfully in 3.8s`, 신규 라우트 `ƒ /api/paper-trading/sessions/history` 등록 | PASS |
| BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` | 3건 전부 route handler 의 `FASTAPI_BASE_URL` 폴백(`app/api/whitelist/search/route.ts`, `app/api/workbench/_adapters/fastapi.ts`) — 허용 예외, 신규 0건 | PASS |
| 클라 직접 fetch | `git grep -nE "\bfetch\(" -- components/intraday hooks/intraday hooks/query lib/api/paperTrading` | 0건 (신규 클라 경로 전부 `httpClient` 경유) | PASS |
| 한글 톤 | 신규 문구 위치 확인 | 신규 카피 전량 `lib/copy/stock/intradayRead.ts`(`INTRADAY_PAPER_COPY.past`, `table.nextTick*`) + 서버 에러 문구 한글. **기존에 인라인 하드코딩이던 "과거 모의투자 내역"·"오늘 목록에는 영향을 주지 않아요" 도 copy SSOT 로 이동**(개선) | PASS |
| 접근성 | 변경 컴포넌트 diff | `section aria-label={PAST.title}` · 에러 `role="alert"` · 모든 신규 버튼 `type="button"` · 기존 `aria-expanded`/`role="tab"`/`aria-selected` 유지. 신규 폼 컨트롤 0(label 연결 대상 없음) | PASS |
| 토큰 정합 | 변경 컴포넌트 hex/px 직타 | 신규 0건(`h-[220px]` 은 이전 커밋의 차트 스켈레톤) | PASS |

### D1 근거 — main 이 실제로 red 였는가

`origin/main`(112cd55) 를 별도 워크트리로 체크아웃해 같은 범위를 실행:

```
$ npx vitest run packages/intraday-mistake-note \
    lib/server/paperTrading/decisionProviders/__tests__/intradayConviction.test.ts
 Test Files  2 failed | 1 passed (3)
      Tests  5 failed | 21 passed (26)
```

실패 지점 예: `intradayConviction.test.ts:243` — `userPrompt` 에 `AI-7563C592` 규칙이 주입되지
않음(= `UNTIL:2026-08-04` 만료로 런타임 문맥이 빈 값). 본 브랜치에서 동일 범위 **0 실패**. ✅

---

## A. 과거 모의투자 내역 페이지네이션

### A1 — `GET /api/paper-trading/sessions/history`

| # | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| A1-1 | 무인자 GET | `limit+1=41`, `offset=0`, `decisionProvider=cli-agent`, `startedBefore=오늘 00:00 KST` 로 로더 호출 | 라이브: `startedBefore = 2026-08-09T15:00:00.000Z` (오늘=2026-08-10 KST), `decisionProvider=cli-agent` | PASS |
| A1-2 | `?limit=999` | 상한 100 → 로더 101, 응답 100건 | 단위: 로더 `limit:101` / 라이브: 응답 **100건** | PASS |
| A1-3 | `?limit=100` (상한 정확값) | 로더 101 | 로더 `limit:101` | PASS |
| A1-4 | `?limit=0` / `?limit=-1` | 하한 1 → 로더 2 | 둘 다 `limit:2` | PASS |
| A1-5 | `?limit=abc` / `?limit=` | 기본 40 → 로더 41 | 둘 다 `limit:41, offset:0` | PASS |
| A1-6 | `?limit=10.9&offset=3.7` | 절삭 | `limit:11(=10+1), offset:3` | PASS |
| A1-7 | `?offset=99999` / `?offset=1e9` | 상한 5000 | 둘 다 `offset:5000` / 라이브 `offset=999999` → 200, 0건, `nextOffset=5000` | PASS |
| A1-8 | 로더가 41건 반환 | 응답 40건 + `hasMore:true` + `nextOffset:40` (count 쿼리 0회) | 라이브 1페이지 = 40건 / `hasMore:true` / `nextOffset:40` | PASS |
| A1-9 | 로더가 **정확히 40건** 반환 | `hasMore:false` (오버페치 1건이 없으므로) | `hasMore:false`, `sessions:40`, `nextOffset:40` | PASS |
| A1-10 | 마지막 페이지(7건, offset=40) | `hasMore:false`, `nextOffset:47` (짧은 페이지에 커서 과주행 없음) | 동일 | PASS |
| A1-11 | Supabase 미설정(`status:disabled`) | **200** + `configured:false` + 빈 배열 (장애로 위장 안 함) | 200 / `{sessions:[],hasMore:false,nextOffset:20,configured:false}` | PASS |
| A1-12 | 로드 실패(`status:error`) | 502 + 한글 에러 | 502 / `"과거 모의투자 내역을 불러오지 못했어요."` | PASS |
| A1-13 | 모든 분기 캐시 헤더 | `no-store` | ok / disabled / error **3분기 모두** `Cache-Control: no-store` | PASS |
| A1-14 | Supabase 쿼리 형태 | `limit/offset/decision_provider/payload->>startedAt` 포함, 틱 테이블 미조회, 전순서 정렬 | `order=updated_at.desc,id.desc` · `payload-%3E%3EstartedAt=lt....` · `paper_trading_ticks` 미포함 | PASS |
| A1-15 | 무인자 호출 URL 무회귀 | 기존 동작(최신 20건, provider 필터 없음, offset 없음) 유지 | `limit=20`, `offset=` 없음, `decision_provider=` 없음 | PASS |

**라이브 전수 순회** (실제 Supabase 원장, 읽기 전용):

```
오늘(KST) = 2026-08-10 | 경계 startedBefore = 2026-08-09T15:00:00.000Z
 1페이지 status/cache/configured = 200 no-store true
 1페이지 건수 = 40  hasMore = true  nextOffset = 40
 총 페이지 = 13 | 총 행 = 484 | 고유 세션 = 484 | 중복 = 0
 오늘 세션 혼입 = 0
 날짜 그룹 수 = 23
 날짜별 건수 = 08-07:12, 08-06:2, 08-05:33, 08-04:17, 08-03:14,
              07-31:19, 07-30:38, 07-29:47, 07-28:2, 07-27:14,
              07-24:5, 07-23:14, 07-22:44, 07-21:30, 07-20:39 ...
```

- **중복 0 / 오늘 혼입 0 / 23개 날짜** — 기존 인메모리 창(20건·사실상 1일치) 대비 확장 확인.
- 서버 측 오늘 제외가 실제로 동작(`오늘 세션 혼입 = 0`). PR 본문의 "20칸 중 14칸 → 0칸" 주장과 정합.

### A2 — 행 정체성(같은 종목 × 여러 날짜) / 오늘 표 무회귀

| # | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| A2-1 | `buildPastSessionRows([old-1(005930), old-0(005930, 하루 전), old-2(000660)])` | 3행 유지, `rowKey` = 세션 id | `rows.ticker = [005930, 005930, 000660]`, `rowKey = [old-1, old-0, old-2]` | PASS |
| A2-2 | 같은 날 같은 종목 세션 2건 | 둘 다 남음(날짜 그룹 합산 손익 누락 방지) | `rows.length=2`, `sessionByRowKey.size=2` | PASS |
| A2-3 | `groupWatchItemsByDate` 에 rowKey 전달 | 같은 종목이 두 날짜 그룹에 각각 1행 | `["2026-07-08","2026-07-07"]`, 각 그룹 1행 | PASS |
| A2-4 | **오늘 표 무회귀** — `rowKey` 미전달 | `watchRowKey` 가 ticker 폴백, 표 동작 동일 | `watchRowKey({ticker:"005930"}) === "005930"` / 워크스페이스는 오늘 표에 `sessionByRowKey={sessionByTicker}`(ticker 키 맵) 그대로 전달 | PASS |
| A2-5 | localStorage 라운드트립 | `rowKey` 가 오늘 워치 저장을 오염시키지 않음 | `loadStoredWatch` 는 `ticker`/`name` 만 검사, 과거 행은 `watch` state 에 들어가지 않음(`onRemove={()=>undefined}`, 추가 경로 없음) | PASS |
| A2-6 | **라이브** 같은 종목 다일자 | 1페이지(limit=100) 안에서 다일자 종목이 실제로 복수 행 | 2일 이상 등장 종목 **10개** (005930 3일, 009830·017900·006360·010170 각 2일) — main 로직이면 최신 1건만 남았을 행들 | PASS |
| A2-7 | 페이지 경계 중복 | `mergeHistoryPages` 가 세션 id 로 dedup + `startedAt` 내림차순 | 중복 1건→1행, 도착 순서 무관 정렬, 빈 페이지 안전, 동률 startedAt 은 입력 순 안정 | PASS |

### A3 — 메모리 창 밖 과거 세션 상세 복원

라이브(실제 Supabase):

```
 인메모리 세션 수(before) = 20
 메모리 창 밖 과거 세션 후보 = 469
 대상 8b66ee36-11b4-4bd3-a462-d32fe9bb0c14
   getPaperTradingSessionDetail       = null      ← 기존이라면 404 (BUG-3 재현)
   getArchivedPaperTradingSessionDetail = ok       (틱 7건 · 자산곡선 8점 · latestDecision 있음 · status completed) 88ms
   2회차(TTL 캐시)                     = 0ms
```

| # | 항목 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| A3-1 | 창 밖 세션 상세 | 저장본에서 복원 | 틱 7건·곡선 8점 복원, 라우트 GET 이 404 대신 200 경로 진입 | PASS |
| A3-2 | 틱 정렬·곡선 시드 | tickIndex 오름차순, 곡선 첫 점 = `{tickIndex:-1, value:initialCash}` | 단위 테스트 통과 | PASS |
| A3-3 | 틱 로드 실패 | 세션 헤더는 살리고 `ticks: []` | 통과 | PASS |
| A3-4 | 저장본 없음 / 로드 실패 | `null` → 라우트 404 | 통과 / 라이브 `존재하지 않는 uuid → null` | PASS |
| A3-5 | id 형태 가드 | `"history"` 는 REST 호출 자체를 하지 않음 | 라이브 `null`, 단위 테스트에서 `loadPersistedPaperTradingSessionById` 미호출 확인 | PASS |
| A3-6 | TTL 캐시(5분) | 재조회 없이 응답, 5분 후 재로드 | 라이브 88ms → 0ms / 단위: TTL 내 1회, 6분 후 2회 | PASS |
| A3-7 | 라우팅 충돌 | 정적 `history` 가 `[sessionId]` 보다 우선 | 빌드 산출에 `ƒ /api/paper-trading/sessions/history` 독립 등록, 세션 id 는 UUID 라 충돌 없음 | PASS |

### A4 — ★ 불변식: 아카이브 조회가 인메모리 스토어를 오염시키지 않는가

**라이브 실측** (완료 세션 1건을 아카이브 경로로 조회한 직후):

```
 인메모리 세션 수(after) = 20   | 대상 id 포함? = false
 스케줄 후보 수 = 3            | 대상 id 포함? = false
 스케줄 후보 id = [125a46c9…, bc4b7211…, 7dbe82a4…]   ← 오늘 running 세션 3건뿐
```

**테스트가 실제로 잠그고 있는가**: `lib/server/paperTrading/__tests__/archivedDetail.test.ts` 의
`"★ 복원해도 인메모리 스토어를 오염시키지 않는다"` 케이스가

1. 픽스처 세션을 **`status:"running"` + `decisionProvider:"cli-agent"`** 로 잡고 (= 스케줄 후보가 될 수 있는 최악 조건),
2. 복원 후 `listPaperTradingSessions()` 에 id 부재를 확인하고,
3. **`selectSchedulableSessions(listed)` 가 `[]` 임을 직접 단언**한다.

→ "스토어에 없다"에서 멈추지 않고 **스케줄러 입력까지 내려가 검사**한다. 불변식 잠금 유효. **PASS**

구조적 근거(코드 리딩): `getArchivedPaperTradingSessionDetail` 은 `store.sessions` 를 건드리지 않고
전용 `archivedDetails` Map(TTL 5분 · FIFO 50) 에만 기록한다. 라우트도 `history/route.ts` 가
`sessionStore` 를 아예 import 하지 않는다. 상태 변경 경로(`PATCH`)는 `patchPaperTradingSession` 만
호출하므로 아카이브 세션은 **계속 404** — 완료 세션이 running 으로 부활해 스케줄러에 재진입하는 경로가
구조적으로 없다.

---

## B. 실시간 갱신

| # | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| B1-1 | `paperSessionsRefetchInterval(now)` — 장중/장 마감 후/주말 | 30초 / 2분 / 2분, **절대 false 아님** | 30_000 / 120_000 / 120_000 | PASS |
| B1-2 | 0~23시 24개 시각 전수 | 모두 `number > 0` | 24/24 `number>0` | PASS |
| B1-3 | 시그니처 | 세션 데이터를 **인자로 받지 않음**(교착 구조 차단) | `paperSessionsRefetchInterval(now: Date = new Date()): number` — 세션 인자 없음, 반환 타입에 `false` 없음 | PASS |
| B1-4 | 훅 배선 | 목록 훅이 위 함수만 사용 | `useQueryPaperTradingSessions`: `refetchInterval: () => paperSessionsRefetchInterval()` + `refetchOnMount:"always"` + `refetchOnWindowFocus:true` | PASS |
| B2-1 | 상세 — `completed`/`failed` | 장중이어도 정지 | 둘 다 `false` | PASS |
| B2-2 | 상세 — `running` 장중 | 30초 | 30_000 | PASS |
| B2-3 | 상세 — **`paused` 장중** | **계속 폴링**(타 탭 재개 복구) | 30_000 | PASS |
| B2-4 | 상세 — 장외·주말 | 정지 | `false` | PASS |
| B2-5 | 데이터 없음 | 정지 | `false` (관찰 4 참고) | PASS |
| B2-6 | 팬아웃 훅 | 단건과 같은 규칙·같은 쿼리 키(세션당 스케줄 1개) | `useQueryPaperTradingSessionDetails` 가 동일 `paperSessionRefetchInterval` + `queryKeys.paperTrading.session(id)` 사용 | PASS |
| B3-1 | 쿼리 키 prefix | `sessionHistory` 가 `paperTrading.sessions` 에 안 걸림 | `["paper-trading","sessions"]` vs `["paper-trading","session-history"]` — 2번째 세그먼트가 달라 prefix 매칭 불성립 | PASS |
| B3-2 | 광범위 무효화 부재 | `["paper-trading"]` 단독 invalidate 0건 | `git grep '\["paper-trading"\]'` → 0건. 실제 invalidate 는 `.sessions` / `.session(id)` / `.autopilot` 3종뿐 | PASS |
| B3-3 | 오토파일럿 시작 비대칭 | stop 과 대칭으로 `sessions` 무효화 | `useMutationStartAutopilotRun.onSuccess` 에 `invalidateQueries({queryKey: paperTrading.sessions})` 추가 확인 | PASS |
| B4 | `useIntradayPaperRefresh` 제거 | 코드 참조 0(주석·문서 제외) | 파일 삭제됨. 잔존 매치는 `docs/HANDOFF.md`, `docs/qa/intraday-watchlist-softcap.md`(과거 문서) + 3개 **주석**뿐. 실행 코드 참조 0건 | PASS |

교착 재발 방지 테스트(`lib/query/__tests__/paperTradingPolling.test.ts`)가
`"★ 어떤 시각에도 false(정지)를 반환하지 않는다"` 로 명시적으로 잠금 — 회귀 시 즉시 red.

---

## C. 다음 판단 예정

### C1 — 서버 규칙 미러 정확성

`nextPaperTickWindowStart(session)` 를 **서버 함수(`floorToTickWindow` + `addTickWindow`) 로 계산한
기대값과 직접 대조**(6조합, 전부 일치):

| lastTickWindowStart | interval | 서버식 `floor+1주기` | 미러 출력 | 비고 |
|---|---|---|---|---|
| 04:55:00 | 5 | 05:00:00 | 05:00:00 | 정렬된 경우 |
| **04:52:30** | 5 | 04:55:00 | 04:55:00 | 리스크 스윕 창(초=30) |
| 04:02:00 | 5 | 04:05:00 | 04:05:00 | 비정렬 |
| 04:55:00 | 15 | 05:00:00 | 05:00:00 | 주기 변경 |
| 04:55:00 | 1 | 04:56:00 | 04:56:00 | |
| 04:55:00 | 3 | 04:57:00 | 04:57:00 | |

- **`last + interval` 이 아님을 명시적으로 확인**: `last=04:52:30, interval=5` 에서 naive
  `addTickWindow(last)` = **04:57:30** 인데 미러는 **04:55:00** 을 낸다. ✅
- 서버 dedup 실물 대조(`runTick.ts:52`): `existingTicks.find(t => t.tickWindowStart === input.tickWindowStart)`
  — **기존 틱 전체와의 동일성** 비교이고 `resolveNextTickWindow` 는 cli-agent 에서
  `floorToTickWindow(now, interval)` 를 쓴다. 따라서 다음 신규 창 = "기존 틱에 없는 첫 경계"
  = `floor(last, interval) + interval` (지배 경로). ✅
- 깨진 `lastTickWindowStart` 문자열 → `null` → `due` 로 안전 강등. PASS

### C2 — AI 판단 컷오프 15:30 (폴링 게이트 15:40 과 분리)

| # | 시각(KST) | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| C2-1 | 15:25, last 15:25 → 다음 15:30 | `scheduled 15:30` (경계 포함) | `{kind:"scheduled", hhmm:"15:30"}` | PASS |
| C2-2 | 15:31, last 15:30 → 다음 15:35 | `closed` | `closed` | PASS |
| C2-3 | 15:30 정각, 다음 창 15:35 | `closed` | `closed` | PASS |
| C2-4 | **15:35** | 판단은 `closed` **인데 목록 폴링은 30초(장중)** — 두 게이트가 다름을 동시 확인 | `paperNextTickState → closed` **AND** `paperSessionsRefetchInterval → 30_000` | PASS |
| C2-5 | 09:00 정각 | 개장 포함 | `{kind:"scheduled", hhmm:"09:05"}` | PASS |

소스 대조: `isKstMarketHours` = `mins >= 540 && mins <= 930`(09:00~**15:30 포함**),
`isKstMarketHoursWithCloseGrace` = `mins < 940`(<15:40). `paperTradingTick.ts` 는 전자 + 자체
`kstJudgeCutoffMs`(15:30) 를 쓴다. **정확히 AC 대로.** PASS

### C3 — 상태 6종 경계

| kind | 조건 | 실측 | 판정 |
|---|---|---|---|
| `none` | 세션 없음 / `completed` / `failed` | 3케이스 모두 `none` | PASS |
| `paused` | **장 마감·주말보다 먼저 판정** | 장중/장외(21:00)/주말 **3시각 모두 `paused`** — `closed` 로 새지 않음 | PASS |
| `paused` vs `stalled` | 2주기 초과여도 paused 우선 | last 3시간 전 + paused → `paused` | PASS |
| `closed` | 장외·주말·15:30 이후 | 주말/15:35/08:59 프리마켓 → `closed` (관찰 2) | PASS |
| `due` | 예정 시각 경과 / 틱 기록 없음(시작 직후) | 둘 다 `due` | PASS |
| `stalled` | 2주기+2분 초과 | `stalled`, UI 라벨 비움(StatusPill 중복 방지) | PASS |

코드 순서 확인: `none → paused → closed → stalled → (due/scheduled)`.
`paused` 가 `isKstMarketHours` 검사보다 **위**에 있음(`paperTradingTick.ts` 본체). ✅

---

## D. 테스트 결정론화

| # | 재현 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| D1-1 | `npm run test` (본 브랜치) | 실패 0 | 1486 passed / 3 skipped / **0 failed** | PASS |
| D1-2 | `origin/main` 워크트리에서 동일 범위 | 5건 red 재현 | `2 files failed / 5 tests failed` (`memory.test.ts` + `intradayConviction.test.ts`) | PASS |
| D2-1 | `buildRuntimeMemorySnapshot(md, scopes, 1, 400)` — **인자 생략** | 실제 오늘(KST) 기준 UNTIL 판정 | UNTIL=오늘+1 → 규칙 포함 / UNTIL=오늘-1 → 제외 / **UNTIL=오늘 → 포함(`>=` 경계)** | PASS |
| D2-2 | 프로덕션 호출부 | `today` 를 넘기지 않음 | `lib/server/paperTrading/mistakeNoteContext.ts:24,35` 둘 다 4인자 호출 = 기본값(실제 오늘) | PASS |
| D2-3 | `buildRuntimeContext` | 동일 | 기본값 `todayKst()` 유지, 위임만 추가 | PASS |
| D2-4 | `buildMemory(sources, generatedAt)` | `generatedAt` 은 **기존 파라미터**(본 PR 신설 아님), 프로덕션 무변경 | `mistakeNoteDashboard.ts:37` 은 이미 `loadedAt` 전달, CLI 4곳은 기본값 — diff 에 시그니처 변경 없음 | PASS |
| D3-1 | 변경 테스트 파일 벽시계 의존 | 없음 | 10개 파일 중 `new Date()`/`Date.now()` 0건. `history/route.test.ts` 만 `todayKstDate()` 를 **코드와 동일 함수로** 사용(자기정합, 썩지 않음) | PASS |
| D3-2 | 실제 `CM.md` 파일 의존 | 없음 | `intradayConviction.test.ts` 가 `mistakeNoteContext` 를 모듈 모킹 + `vi.hoisted` 고정 픽스처(UNTIL 2026-08-04, today 2026-07-22 주입). 파일 읽기 0 | PASS |
| D3-3 | 다른 테스트의 만료 썩음 | `mistakeNoteContext.test.ts` 도 안전한가 | `FUTURE` 를 **계산된 미래 날짜**로 사용(기존 코드) — 썩지 않음 | PASS |
| D3-4 | 만료 회귀 잠금 | UNTIL 경과 시 제외되는지 테스트가 잡는가 | `memory.test.ts` 신규 케이스 `"UNTIL 이 지난 규칙은 런타임 주입에서 제외된다"`(기준일 2026-08-05 주입) 존재 | PASS |

---

## 라운드트립 (라이브)

### 환경

- `/api/*` 는 **로그인 미들웨어가 라우팅보다 앞**에서 차단한다 — 존재하지 않는 경로
  (`/api/paper-trading/nope-zzz`) 도 401 을 준다. 즉 401 = 게이트 정상 동작이며, HTTP 레이어로는
  인증 없이 어떤 응답 본문도 볼 수 없다.

  ```
  /api/paper-trading/sessions                                 401
  /api/paper-trading/sessions/history                         401
  /api/paper-trading/sessions/history?limit=999&offset=99999  401
  /api/paper-trading/sessions/does-not-exist-zzz              401
  /api/paper-trading/nope-zzz                                 401
  ```

- 사용자 dev 서버가 이미 `:3000` 에 떠 있어(PID 2755) **QA 가 별도 서버를 띄우지 않았다** — 장중
  월요일에 두 번째 인스턴스를 띄우면 틱 스케줄러가 중복 기동해 실제 세션에 부수효과가 생긴다.
- 대신 **route handler + 실제 Supabase 원장을 서버 측에서 직접 구동**해 라운드트립을 검증했다
  (`node --env-file=.env.local --import tsx`). **읽기 전용** — `PATCH`·틱·persist 경로는 호출하지 않음.
- 이 PR 은 FastAPI(`127.0.0.1:8000`) 경로를 쓰지 않는다(단타 도메인 = Supabase + KIS/Toss).
  따라서 표준 5건(AAPL/BTC-USD/…) 시나리오는 범위 밖이며, 아래 도메인 시나리오로 대체한다.

### 시나리오 결과

| # | 시나리오 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| RT-1 | 1페이지 로드 | 200 · no-store · 40건 · hasMore | 200 / `no-store` / 40건 / `hasMore:true` / `configured:true` | PASS |
| RT-2 | "더 보기" 끝까지 | 중복 없이 원장 소진 | 13페이지 · **484행 · 고유 484 · 중복 0** · `hasMore:false` 로 종료 | PASS |
| RT-3 | 오늘 세션 제외 | 1페이지에 오늘 0건 | 전 페이지 통틀어 **오늘 혼입 0** | PASS |
| RT-4 | 날짜 그룹 복원 | 하루치 이상 | **23개 날짜** (기존 인메모리 20건 상한 대비) | PASS |
| RT-5 | 창 밖 과거 상세 | 404 대신 복원 | `getPaperTradingSessionDetail=null` → 아카이브 복원 성공(틱 7 · 곡선 8 · 88ms) | PASS |
| RT-6 | 스토어 무오염 | 조회 후 인메모리·스케줄러 후보 불변 | 20건 → 20건, 대상 id 부재, 스케줄 후보 3건(오늘 running)에 대상 없음 | PASS |
| RT-7 | 서버 clamp | 과대 요청 흡수 | `limit=999` → 100건, `offset=999999` → 200/0건 | PASS |
| RT-8 | 잘못된 세션 id | REST 왕복 없이 null | `"history"` → null, 미존재 uuid → null | PASS |

### 미검증(브라우저 육안 필요) — 도구 부재

| 항목 | 사유 | 권고 |
|---|---|---|
| BUG-1 표 컬럼 폭 고정(`w-0 min-w-full`) | 렌더 레이아웃은 실제 브라우저에서만 확인 가능. 정적으로는 `colSpan={13}` 셀 내부 래퍼가 고유 폭 기여 0 으로 바뀐 것 확인 | 종목 펼쳤을 때 "무포지션"·"5분" 줄바꿈 여부 육안 |
| 네트워크 탭 폴링 | 실행 세션 0건일 때도 30초/2분 주기 발화 | PR 본문 "다음 작업" 에 이미 기재됨 |
| 오토파일럿 시작 → 새로고침 없이 자식 세션 행 등장 | 서버 스윕 60초 대기 필요 | 동상 |
| 반응형 2뷰포트(375/1280) | 본 PR 은 반응형 PR 이 아니며 신규 반응형 분기 0(추가된 것은 `whitespace-nowrap` 3곳 + 래퍼 1개). 표 자체는 기존 가로 스크롤 셸 정책을 그대로 상속 | 모바일에서 「최근 판단」 둘째 줄이 행 높이를 밀어내는지 정도만 |

---

## 에지 케이스

| 케이스 | 처리 | 실측 | 판정 |
|---|---|---|---|
| Supabase 미설정(로컬 무DB) | 200 `configured:false` → 클라가 "저장소 꺼짐" 안내(`PAST.disabled`), 재시도 유도 안 함 | 통과 | PASS |
| Supabase 로드 실패(HTTP !ok) | 502 + 한글 메시지 → 클라 인라인 에러 + "다시 시도" | 통과 | PASS |
| 네트워크 끊김/타임아웃 | `AbortSignal.timeout(FETCH_TIMEOUT_MS)` → catch → `status:error` → 502 | 코드 확인 | PASS |
| malformed JSON 응답 | `res.json()` 이 try 블록 안 → catch → `error` (요약 로더·단건 로더 **둘 다**) | 코드 확인 | PASS |
| 빈 본문 / 0행 | `rows[0]` undefined → `session:null` → "정상 조회했으나 없음"(error 와 구분) → 404 | 단위 테스트 통과 | PASS |
| NaN·음수·지수표기·소수 쿼리 | `clampInt` 가 `Number.isFinite` + `Math.trunc` + min/max | A1-4~A1-7 전부 통과 | PASS |
| 전역 에러 토스트 중복 | 쿼리는 전역 토스트 대상 아님(`MutationCache.onError` 만 존재) → 인라인 에러 1회 | 코드 확인 | PASS |
| 재시도 폭주 | 전역 `retry: 1` | `app/providers.tsx` 확인 | PASS |
| 페이지 경계 정렬 드리프트 | `order=updated_at.desc,id.desc` 전순서 + 클라 id dedup 이중 방어 | 라이브 중복 0 | PASS |
| 자정 롤오버 | 서버가 오늘 제외를 이미 했지만 `todayKey` 는 마운트 고정 → 클라가 `filterPastSessions` 로 한 번 더 방어 | 코드 확인(잔여 이슈는 PR "다음 작업" 에 기재됨) | PASS |
| "내 세션만" 이 한 페이지를 통째 필터링 | `hasMore` 기준으로 "더 보기" 노출(렌더 행 수 무관) | 코드 확인 | PASS |
| 접힌 과거 행의 상세 팬아웃 | `historyMode && !expanded → sessionId=""` 로 쿼리 비활성 → 창 밖 세션 N행 × Supabase 왕복 방지, 동시 펼침 1행 상한 | 코드 확인 | PASS |
| 새 페이지가 펼쳐진 채 도착 | 최근 날짜 그룹 1개만 기본 펼침 → 시세·경보 배치가 페이징으로 늘지 않음 | 코드 확인 | PASS |
| `<details open>` 재렌더 | 비제어라 폴링 재렌더가 사용자가 접은 패널을 다시 열지 않음(React 는 `open` prop 변경 시에만 DOM 갱신) | 코드 확인 | PASS |
| SSR/hydration | `/intraday` 는 정적 셸 + 쿼리 프리패치 없음 → SSR 시 `current=null` → 「다음 판단」 라벨 미출력 → 서버/클라 초기 마크업 동일. `<details open>` 도 결정론적 | 빌드 산출 `○ /intraday` 확인 | PASS |

---

## 발견 사항 (전부 **비차단** — 코드 수정하지 않음)

1. **offset 상한(5000) 도달 시 "더 보기" 가 끝나지 않는다** — 재현: 로더가 어떤 offset 에도 41건을
   주는 상태에서 `?offset=5000` → `hasMore:true, nextOffset:5040` → 클라가 5040 요청 → 서버가
   5000 으로 clamp → **같은 페이지 반복**(merge 가 dedup 하므로 새 행 0) → 버튼은 계속 표시.
   임시 테스트로 실제 재현 확인. 현재 원장 484행이고 하루 ~30건이라 도달까지 약 5개월.
   권고: 응답 `page.length < limit` 이 아니라 `offset === MAX_OFFSET` 도 `hasMore:false` 로.
2. **프리마켓(09:00 이전) 세션에 "장 마감" 표시** — `paperNextTickState(…, 08:59)` → `closed` →
   `T.nextTickClosed = "장 마감"`. 개장 전인데 "장 마감" 문구. 문구만의 문제(동작 정상).
3. **C1 미러의 아주 좁은 발산** — 서버 dedup 은 `lastTickWindowStart` 가 아니라 **기존 틱 전체**와
   비교하므로, 세션 중 주기를 **늘렸는데** 새 주기의 직전 경계에 해당하는 틱이 없으면 서버가
   표시된 예정 시각보다 **먼저** 발화할 수 있다(예: 5→15분 변경, 04:45 틱 부재). 표시 전용이라
   무해하며, 지배 경로 6조합은 전부 일치.
4. **상세 첫 로드 실패 시 자동 재개 없음** — `paperSessionRefetchInterval(undefined)` 이 `false` 라
   `data` 가 한 번도 안 들어오면 폴링이 시작되지 않는다. `retry:1` + `refetchOnWindowFocus:true` 로
   회복 가능하지만 탭을 계속 보고 있으면 멈춘 채로 남는다.
5. **장외에도 목록 폴링 상시화 비용** — 탭을 열어두면 2분마다 `/api/paper-trading/sessions` 호출,
   내부에서 `refreshForeignSessions`(TTL 20초)가 Supabase 최근 20행을 읽는다. 하루 열어두면
   대략 수 MB~10MB 대 egress. admin 1인 운영 전제라 수용 가능하나 관측 대상.
   (prod 에서 전 세션이 foreign 판정되는 건은 PR "다음 작업" 에 이미 기재됨.)
6. **과거 표 기본 펼침 그룹이 최대 40행** — 이전엔 과거 전체가 20건 상한이라 배치 시세 조회가
   최대 20종목이었는데, 이제 최근 과거 날짜 그룹 하나가 40행일 수 있다(라이브 최대 47행/일).
   배치 1회라 요청 **수**는 불변, 페이로드만 증가.
7. **"더 보기" 버튼 disabled 시각 피드백 없음** — `button-secondary` 에 `disabled:` 스타일이 없어
   로딩 중에도 클릭 가능해 보인다(문구는 "불러오는 중…" + 스피너로 바뀜).
8. **에러 후 "다시 시도" 는 적재된 전 페이지를 재요청** — `useInfiniteQuery.refetch()` 특성.
   13페이지 적재 후 재시도하면 13회 왕복.

---

## 판정

**PASS** — 검증한 수용 기준 A1~A4 / B1~B4 / C1~C3 / D1~D3 **전부 통과, 실패 0건**.

- 공통 게이트(test·typecheck·lint·build·BFF·한글·접근성) 전부 통과.
- ★ 핵심 불변식(A4: 아카이브 조회 → 스케줄러 재틱 없음)은 테스트가 `selectSchedulableSessions`
  까지 내려가 잠그고 있고, 실제 Supabase 원장으로도 재확인했다.
- ★ 교착 재발 방지(B1)는 타입(`number` 반환) + 시그니처(세션 인자 없음) + 전수 시각 테스트의
  3중 잠금.
- 발견 8건은 전부 비차단(그중 1건은 원장 5,000행 초과라는 미래 조건, 나머지는 문구/비용/UX 미세).
- 브라우저 육안 3건은 QA 도구 범위 밖이며, PR 본문 "다음 작업" 에 이미 명시돼 있다.
