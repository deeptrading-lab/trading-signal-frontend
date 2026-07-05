# PRD — market-status-aware-home (가용성 인지형 마켓 홈: KIS 점검/실패 우아한 대체 + 관리자 재시도)

- 슬러그: `market-status-aware-home`
- 상태: 기획 개정 (impl 재작업 중 — #247 전제 오류 정정)
- 작성: 2026-07-05 (PM) · **개정: 2026-07-05 (근본 원인 재진단 반영)**
- 브랜치: `feature/market-status-aware-home` (#247 진행 중 — 코드는 재작업, 본 PRD 는 방향 정정)
- 시리즈: 토스 Open API 배선의 **소비처(consumer) PR**. ②(`toss-market-calendar`, `useMarketStatus` 원천)·①(`toss-orderbook`)·③(`toss-trades`) 머지 완료 후속.
- 관련:
  - `app/api/market/volume-rank/route.ts`·`app/api/market/fluctuation/route.ts`·`app/api/flow/top10/route.ts` — 가용성 판정의 근거(X-Data-Source·HTTP 상태). §6 에 실동작 명세.
  - `lib/auth/session.ts` — `readSession`(HMAC 검증 후 role). 관리자 재시도 게이트의 서버측 진실. `lib/types/auth/profile.ts`(`ProfileRole`).
  - `docs/prd/toss-market-calendar.md` — ②. `useMarketStatus`·`isRegularOpen`(fail-open)·`marketClock` 의 원천. **본 PRD 에서 실시간 순위/순매수 섹션은 더 이상 이걸로 게이팅하지 않는다**(§1 방향 전환). 폴링(호가·체결)만 소비.
  - `docs/prd/toss-orderbook.md` / `docs/prd/toss-trades.md` — ①/③. 호가·체결 폴링 게이트.
  - `docs/rules/frontend.md` — FE 컨벤션 8개 절(도메인 훅만 소비·`cn`·카피 단일 위치·queryKey 단일·반응형).
- **UI 포함: yes** ("점검 중" 안내 UI + 탭 숨김/노출 · 관리자 전용 재시도 버튼. UX/UI 디자이너 합류 트리거 — §9 q6)

---

## 1. 배경 / 문제 (방향 전환 — 근본 원인 재진단)

기존 PRD(초판, 2026-07-05 오전)는 마켓 홈 "실시간 순위"·"순매수 당일"의 에러 카드 원인을 **장 마감**으로 진단하고, `useMarketStatus().isRegularOpen`(정규장 여부)으로 **KIS 호출을 하드 게이팅**해 마감이면 조회 자체를 막는 설계였다. **이 전제가 틀렸다.**

**사용자 실측(2026-07-05):**
- 에러 카드는 **장 마감이 아니라 KIS 야간점검**(~21:50~23시대, 전 TR 500) 때문이었다.
- 점검이 끝나면 KIS 는 **장중이 아니어도(주말 포함) 랭킹을 정상 제공**한다 — 일요일 12:41 에 거래량/거래대금/급상승/급하락 랭킹이 정상 표시됨을 확인.

**따라서 "정규장일 때만 표시" 하드 게이팅은 역효과다.** 멀쩡히 나오는 주말·장외 랭킹을 숨긴다. 올바른 축은 **"장이 열렸나"가 아니라 "데이터를 실제로 받을 수 있나(가용성)"** 다.

새 원칙:
- **가용성 기반 렌더** — 각 실시간 섹션/탭을 "데이터를 받을 수 있으면 표시, 못 받으면 숨김/점검 안내"로 전환. 시장 시각(`isRegularOpen`)에 의존하지 않는다.
- 판정 근거는 라우트가 이미 내려주는 **`X-Data-Source` 헤더 + HTTP 상태**(§6). 라우트는 실패 시 200+mock 으로 graceful degrade 하거나 502 를 준다 — 이 소스 값으로 "실 KIS 데이터(available)" vs "KIS 시도 후 실패(unavailable)"를 구분한다.
- **dev 함정 방지**: 로컬(KIS 미설정)은 이중 게이트 미통과로 **항상 `mock`(200)** 이다. 이건 "점검 중"이 아니라 개발 편의 mock 이므로 **정상 표시**해야 한다. `mock`(미설정) 과 `mock-timeout`/`mock-error`/`mock-empty`/502(KIS 시도 후 실패)를 구분하는 것이 설계의 핵심(§6, q1).

`useMarketStatus`(②)·KST 폴백·호가/체결 폴링 최적화 스왑은 **유지**하되, 이제 실시간 순위·순매수 섹션은 여기에 의존하지 않는다. `isRegularOpen` 은 **호가·체결 폴링(§3-4)** 에서만 쓰인다.

## 2. 목표 (측정 가능)

1. **가용성 기반 탭 렌더** — 실시간 순위 4탭(거래량·거래대금·급상승·급하락) 중 **실 데이터를 받은 탭(available)만 노출**, 못 받은 탭(unavailable)은 **탭 버튼 자체를 숨긴다**. (장 시각 무관.)
2. **전탭 실패 시 점검 안내** — 4탭 모두 unavailable 이면 리스트 대신 **"현재 점검 중이에요" 안내**. 일반 사용자에겐 **재시도 버튼 비노출**.
3. **관리자 전용 재시도** — 세션 role 이 `admin` 인 경우에만 점검 안내에 "다시 시도" 노출(에러/점검 구분·수동 복구용). 위조 불가(서버 HMAC 검증).
4. **dev mock 정상 표시** — 로컬(KIS 미설정, `X-Data-Source: mock`)에서는 4탭 모두 mock 데이터를 **정상 표시**(영구 "점검중" 회귀 없음).
5. **순매수 당일 일관 적용** — 순매수 "당일"도 시각 게이팅 폐기. 데이터 받아지면(장외여도) 표시, 못 받으면 실시간 순위와 동일 원칙(점검 안내·관리자만 재시도). **"7일 누적"(KV 스냅샷)은 항상 정상**(무변경).
6. **주말·장외 정상 랭킹 노출(회귀 정정)** — KIS 가 랭킹을 주는 주말/장외 시각에 랭킹이 **에러/숨김 없이 표시**된다(기존 하드 게이팅이 숨기던 것을 회복).
7. **prod 점검 시각 에러 카드 0** — KIS 야간점검 중 홈 진입 시 빨간/회색 에러 카드 대신 "점검 중" 안내로 우아하게 대체.

## 3. 범위 (In scope)

### 3-0. 데이터 소스 표면화 (인프라 — 판정의 전제)

- 현재 클라 어댑터(`lib/api/market/volumeRank.ts`·`fluctuation.ts`·`lib/api/flow/top10.ts`)는 `response.data` 만 반환하고 **`X-Data-Source` 헤더를 버린다**. 가용성 판정을 위해 **헤더를 표면화**한다.
  - 어댑터 반환을 소스 포함 형태로(예: `{ data, source }` envelope, 또는 훅이 `response.headers["x-data-source"]` 를 읽어 `dataSource` 로 노출). 형태는 구현 재량, **AC 는 훅이 `dataSource` 를 노출한다는 결과만 고정**.
  - `lib/types/` 에 소스 union 타입 신설(예: `"kis" | "mock" | "mock-timeout" | "mock-empty" | "mock-error" | "kv"`). 라우트가 내리는 값과 정합(§6 표 근거).
- **라우트 핸들러(`app/api/market/**`·`app/api/flow/top10`)는 무변경**(mock 폴백·시그니처·소스 헤더 값 보존). 소스 값이 이미 충분히 세분(§6, q1 결론) → **본 PR 은 라우트를 건드리지 않는다**. (선택적 일관성 정리는 q1 참조, 비필수.)

### 3-1. 실시간 순위 섹션 가용성 전환 — `components/home/RealtimeRankingSection.tsx`

- **`useMarketStatus`/`isRegularOpen` 게이팅 제거.** `!isRegularOpen ? <MarketClosedNotice/>` 분기와 `enabled: … && isRegularOpen` 곱을 **모두 걷어낸다**.
- **4탭 모두 프로브** — 가용성을 알려면 활성 탭만이 아니라 **4탭 전부 조회**해야 한다(현재는 활성 탭만 `enabled`). 4개 훅을 `enabled` 로 켠다. 레이트리밋 전략은 §8·q2(순차/딜레이 or staleTime 캐시).
- **탭별 가용성 판정**(§6 규칙): 각 탭 결과에서
  - `available` = `isError=false` **AND** `dataSource ∈ {kis, mock}`.
  - `unavailable` = `isError=true`(502 등) **OR** `dataSource ∈ {mock-timeout, mock-empty, mock-error}`.
- **탭 노출/숨김** — `RANK_TABS` 를 available 탭만으로 필터해 탭바 렌더. unavailable 탭 버튼은 **숨긴다**(기존 `failedTabs` opacity 흐림 로직을 대체). 활성 탭 기본값 = **첫 available 탭**(현재 활성 탭이 unavailable 로 바뀌면 첫 available 로 이동).
- **전탭 unavailable** → 리스트/탭바 대신 **"점검 중" 안내**(§3-3). 일반 사용자 재시도 버튼 비노출, 관리자만 노출.
- **로딩/부분 가용** — 프로브 진행 중(4탭 중 일부 `isLoading`)에는 스켈레톤. 일부만 available 이면 available 탭만 노출(점검 안내는 전탭 실패에서만).
- 기존 유지: `useWatchlistTickers` 단일 소유·행 렌더·`useStockPeek`·산업 컬럼 graceful omit·자동 탭 전환 금지(사용자 클릭 존중, 단 초기 활성 탭 선택은 available 기준).

### 3-2. 순매수 Top10 가용성 전환(당일만) — `components/flow/InvestorFlowTop10Card.tsx`

- **당일 시각 게이팅 폐기.** `enabled: mode === "cumulative" || isRegularOpen` → **`enabled: true`**(당일도 항상 조회). `!isRegularOpen` 초기 넛지(`settledRef`)·`MarketClosedNotice` 마감 분기 제거.
- **당일 가용성 판정**(§6): today 쿼리의 `isError`(502) 또는 `dataSource ∈ {mock-timeout, mock-error}` 면 unavailable.
  - available(`kis`/`mock`) → 기존대로 외국인|기관 Top10 표시.
  - unavailable → **"점검 중" 안내**(§3-3, 실시간 순위와 공유) + **7일 누적 넛지**(항상 데이터 있는 탭으로 유도). 일반 사용자 재시도 비노출, 관리자만.
- **"7일 누적"(cumulative) 무변경** — KV 스냅샷(`dataSource: kv`, 실패해도 mock degrade). 항상 조회·표시. `cumulativeCollecting`("모으는 중") 분기 유지.
- 기존 유지: `ModeToggle`·`buildHeaderMeta`·모바일 Top5 절단·`FlowColumn` 컬럼 단위 재시도.

### 3-3. 공용 "점검 중" 상태 UI + 관리자 재시도 (§9 q6 — UX 결정)

- 실시간 순위(§3-1)·순매수 당일(§3-2)이 **공유**할 점검 안내. **장 마감이 아니라 데이터 점검/일시 장애** 톤(기존 `MarketClosedNotice` 의 "장 마감·다음 개장" 카피는 **폐기·대체**).
- 내용: "현재 점검 중이에요 · 잠시 후 다시 확인해 주세요" 류 중립 안내(한글, `lib/copy/` 단일 위치). 다음 개장 시각 안내는 **하지 않는다**(마감이 아니므로).
- **관리자 재시도**: `useIsAdmin()`(§3-5) 가 true 일 때만 "다시 시도"(전 프로브 refetch) 버튼 노출. 일반 사용자는 안내만.
- 순매수 당일 버전은 하단에 **"7일 누적 보기" 넛지** 링크 부착(실시간 순위 버전은 넛지 없음).
- 형태(신규 컴포넌트 vs 기존 확장)는 q6. **PM 권고: 신규 공용 `MaintenanceNotice`**(예 `components/market/MaintenanceNotice.tsx`) — 두 섹션 재사용, `isAdmin`·`onRetry`·`nudge` props. 기존 `MarketClosedNotice`(#247 산출)는 시각 게이팅 폐기로 **소비처가 사라지므로 제거**(또는 이 컴포넌트로 대체).

### 3-4. 호가·체결 폴링 게이팅 — **유지(무변경, 커밋3 기존)**

- `hooks/stock/useQueryStockOrderbook.ts`·`useQueryStockTrades.ts` 의 `refetchInterval` 게이트 + `OrderbookPanel`·`TradeStrengthPanel` 의 `closed` 라벨을 `useMarketStatus().isRegularOpen` 기준으로 스왑한 **커밋3 는 유지**. 폴링은 실제로 "장중에만 갱신"이 맞으므로 시각 게이팅이 적절(랭킹과 성격 다름).
- **본 개정에서 신규 변경 없음.** `useMarketStatus` 는 이제 **폴링에서만** 소비된다(랭킹/순매수는 §3-1·§3-2 로 가용성 기반 전환). fail-open(`unknown→true`) 무회귀 유지.

### 3-5. 관리자 감지 인프라 (신설 — §9 q3)

- **현황**: `hooks/auth` 에 `useLogin`/`useLogout` 만 있고 **클라에 role/isAdmin 노출 없음**. #246 은 role 을 HMAC 세션 쿠키(`readSession`, 서버측)만 담았다. `app/(main)/profile/page.tsx` 는 서버 컴포넌트로 `identity.role` 직접 읽음(클라 훅 아님).
- **신설**:
  - `GET /api/auth/me` route handler — 쿠키에서 `readSession`(HMAC 검증 후 role) → **읽기전용** `{ role }`(또는 `{ isAdmin }`) 반환. 위조 role 쿠키는 서명 검증에서 걸러짐. 미인증/시크릿 부재 → `{ role: null }`(안전 실패), 401 아님(무한 리다이렉트 회피 — 게이트는 이미 통과한 세션).
  - `useMe()` (또는 `useIsAdmin()`) 도메인 훅 — TanStack Query, `/api/auth/me` 소비. `queryKeys.auth.me()` 단일 위치. staleTime 길게(role 변동 드묾). **표시용 전용** — 특권 동작 없음.
- **보안(§8)**: role 판정은 **서버(HMAC 검증)에서만**. 클라 `isAdmin` 은 "다시 시도" 버튼 표시 여부만 결정 — 재시도는 **공개 랭킹 refetch**(특권 아님)라 위조돼도 실질 위험 0. `/api/auth/me` 는 role 을 **읽기만**(변경 불가).
- **In/Out 판단(q3)**: **PM 권고 = 본 PR In(포함)**. "관리자만 재시도" AC 가 이 인프라 없이는 성립 불가 + 한 브랜치 한 PR 룰. 표면 최소(읽기전용 1 라우트 + 훅 1). 리뷰어가 인증 인프라 격리를 강하게 원하면 선행 PR 로 분리 가능(그 경우 본 PR 은 인프라 머지 전제로 대기).

## 4. 비범위 (Out of scope)

- **시장 시각으로 랭킹/순매수를 숨기는 로직(폐기)** — 초판의 `isRegularOpen` 하드 게이팅. 완전 제거.
- **미국 장(해외)·`market-calendar/US`** — 무관.
- **서버 스케줄러 휴장 가드**(`tickScheduler`·`refreshScheduler`) — 로컬 CLI 전용·defer.
- **지수 스트립**(`HeaderMarketTicker`·상단 지수) — 종가 스냅샷, 정상. 손대지 않음.
- **호가·체결 폴링 게이트 신규 변경** — 커밋3 로 이미 완료(§3-4 유지, 무변경).
- **라우트 핸들러 로직 변경** — 소스 값 표면화는 클라 어댑터/훅 레벨. 라우트 무변경(q1 선택적 정리는 비채택 권고).
- **관리자 인증 강화·per-role UI 확장** — `/api/auth/me` 는 role 읽기 최소만. 다른 관리자 기능은 별도.
- **"점검 중" 실시간 헬스체크/모니터링** — 프론트 가용성 판정만(요청별 결과). 별도 헬스 엔드포인트 없음.

## 5. 수용 기준 (AC)

QA 가 표로 검증. **소스별 시나리오**는 라우트 응답을 모킹(또는 로컬 무키=mock / prod 야간점검=실패)해 고정. 관리자 시나리오는 세션 role 모킹(`/api/auth/me` 응답).

| # | 시나리오 | 재현 | 기대 |
|---|---|---|---|
| AC-1 | 전탭 available(prod KIS 정상) | 4탭 모두 `dataSource=kis` | 4탭 모두 노출, 리스트 정상. 점검 안내 미노출 |
| AC-2 | dev mock 정상 표시 | 로컬 무키(`isKisConfigured=false`) → 4탭 `dataSource=mock` | **4탭 모두 노출 + mock 데이터 표시**. 점검 안내 미노출("영구 점검중" 회귀 없음) |
| AC-3 | 일부 탭 unavailable | 예: fluctuation up/down `mock-error`, volume/value `kis` | 급상승·급하락 **탭 버튼 숨김**, 거래량·거래대금만 노출. 활성 탭이 숨겨지면 첫 available 로 이동. 점검 안내 미노출 |
| AC-4 | 전탭 unavailable — 일반 사용자 | 4탭 모두 실패(volume-rank 502, fluctuation `mock-timeout`/`mock-error`) + role≠admin | 리스트/탭바 대신 **"점검 중" 안내**. **"다시 시도" 버튼 비노출** |
| AC-5 | 전탭 unavailable — 관리자 | 위 + role=admin(`/api/auth/me` → admin) | "점검 중" 안내 + **"다시 시도" 버튼 노출**. 클릭 시 4탭 refetch |
| AC-6 | 순매수 당일 available | today `dataSource=kis`(또는 dev `mock`) | 외국인\|기관 Top10 정상 표시(장외여도). 점검 안내 미노출 |
| AC-7 | 순매수 당일 unavailable | today 502 또는 `mock-timeout`/`mock-error` | "점검 중" 안내 + **"7일 누적 보기" 넛지**. 재시도 관리자만. KIS 무한재조회 없음 |
| AC-8 | 순매수 7일 누적 무변경 | cumulative 탭 | **항상 정상 표시**(`dataSource=kv`, 실패 시 mock degrade). `cumulativeCollecting` 분기 유지. 점검 안내 미노출 |
| AC-9 | 관리자 감지 훅 | `/api/auth/me` role=admin / user / null | `useIsAdmin()` 각각 true / false / false. 재시도 버튼 노출은 admin 만 |
| AC-10 | 세션 role 위조 방어 | 위조 `role=admin` 쿠키(서명 불일치) | `/api/auth/me` → role null(`readSession` HMAC 검증 실패). 재시도 버튼 미노출 |
| AC-11 | 호가·체결 폴링 무회귀 | 장중/공휴일/unknown | 커밋3 동작 그대로(공휴일 정지·fail-open 지속·패널 `closed` 라벨). 본 PR 무변경 |
| AC-12 | 데이터 소스 표면화 | 훅 반환 | `useQueryVolumeRank`/`useQueryFluctuation`/`useQueryFlowTop10` 가 `dataSource` 를 노출. 라우트 `git diff app/api/market app/api/flow` = **무변경** |
| AC-13 | 반응형 두 뷰포트 | 모바일·PC — 부분 탭 숨김/점검 안내 | 양 뷰포트 탭바 정렬·점검 안내 줄바꿈 깨짐 없음(`md:`/`lg:` + `useBreakpoint`) |
| AC-14 | 컨벤션 정합 | `git grep` | 점검 안내 hex/px 직타 0, 한글 카피 `lib/copy/` 단일 위치, `useQuery` 직접 import 0(도메인 훅만), 클라 `fetch(` 0(route handler 안 예외), queryKey 단일 위치(`queryKeys.auth.me`) |

## 6. 데이터 / 가용성 판정 규칙 (라우트 실동작 근거)

라우트를 실제로 읽어 확정한 소스 매트릭스(q5·q4·q1 의 근거):

| 라우트 | 미설정/비-prod (dev) | KIS 성공 | 빈결과 | 타임아웃 | 기타 오류 |
|---|---|---|---|---|---|
| `volume-rank` | 200 `mock` | 200 `kis` | **502**(throw) | 200 `mock-timeout` | **502**(apiError/generic) |
| `fluctuation` | 200 `mock` | 200 `kis` | 200 `mock-empty` | 200 `mock-timeout` | 200 `mock-error` (never-throw) |
| `flow/top10` today | 200 `mock` | 200 `kis` | **502**(`__ALL_FAILED__`) | 200 `mock-timeout` | **502**(apiError/generic) |
| `flow/top10` cumulative | 200 `mock` | 200 `kv` | (행 0 → `cumulativeDays=0`, 200 `kv`) | — | 200 `mock`(KV degrade) |

**핵심(q5 확정): 세 라우트 구조가 다르다.** `fluctuation` 은 never-throw(실패도 200+mock-* 소스), `volume-rank`·`flow today` 는 빈결과/오류에 **502 throw**. 따라서 판정은 **HTTP 상태 + X-Data-Source 둘 다** 봐야 한다(q4 확정):

- **available** = `isError=false` **AND** `dataSource ∈ {kis, mock}`
- **unavailable** = `isError=true`(502 → axios throw → `isError`) **OR** `dataSource ∈ {mock-timeout, mock-empty, mock-error}`

**dev vs prod 점검 구분(q1 확정):** 라우트가 내리는 소스 값이 **이미 세분돼 있어 라우트 수정 불필요**. 미설정 dev 는 plain `mock`(200) → available 로 처리(정상 표시). KIS 시도 후 실패는 `mock-timeout`/`mock-empty`/`mock-error`/502 → unavailable. 두 mock 계열이 라우트에서 이미 구분되므로 소스 세분 추가 불필요.

- cumulative(`kv`)는 판정 대상 아님 — 항상 표시(KV 스냅샷, 마감·점검 무관).
- 게이팅 레벨: **클라 훅/컴포넌트**(`dataSource` 표면화 + 컴포넌트 분기). 라우트 무변경(AC-12).

## 7. 가정 · 제약 · 참고

- 선행: ②(`toss-market-calendar`) 머지 완료(`useMarketStatus` 등 main 존재). #246(신원 세션·`readSession`·role) 머지 완료 — `lib/auth/session.ts` 에 `readSession`/`ProfileRole` 존재.
- **prod KIS 는 라이브 설정**(메모리) → `volume-rank`/`fluctuation`/`flow today` 가 실 KIS 경로. 야간점검(~21:50~23시대, 전 TR 500) 시 502/mock-* → unavailable → 점검 안내. 점검 외 시각(주말·장외 포함)엔 `kis` → available → 정상 표시.
- **dev(로컬 무키)**: 이중 게이트 미통과 → 항상 `mock` → available → mock 정상 표시. **로컬에서 "점검 중" 을 보려면** 라우트 응답 소스를 모킹하거나 강제 실패 주입 필요(QA 노트).
- 보안: `/api/auth/me` 의 role 은 `readSession`(HMAC 검증) 결과만. 클라 `isAdmin` 은 표시용. 재시도는 공개 랭킹 refetch(특권 아님)라 위조 시 실질 위험 없음. role 판정 서버 단일.
- 참고 파일: `components/home/RealtimeRankingSection.tsx`·`components/flow/InvestorFlowTop10Card.tsx`(가용성 전환), `hooks/market/useQueryVolumeRank.ts`·`useQueryFluctuation.ts`·`hooks/flow/useQueryFlowTop10.ts`(`dataSource` 표면화), `lib/api/market/volumeRank.ts`·`fluctuation.ts`·`lib/api/flow/top10.ts`(어댑터 헤더 표면화), `app/api/market/volume-rank/route.ts`·`fluctuation/route.ts`·`app/api/flow/top10/route.ts`(소스 값 근거, 무변경), `lib/auth/session.ts`(`readSession`), `hooks/auth/`(신설 `useMe`/`useIsAdmin`), `docs/rules/frontend.md`.

## 8. 영향 분석

- **변경 라인 추정**: (a) 소스 표면화 — 어댑터 3 + 훅 3 + 타입 1(~60~90 라인), (b) 실시간 순위 가용성 로직 — 컴포넌트 1(탭 필터·판정·전탭 점검, ~80~130 라인), (c) 순매수 당일 가용성 — 컴포넌트 1(~40~60), (d) 점검 안내 UI + 카피(~40~70), (e) 관리자 인프라 — 라우트 1 + 훅 1 + queryKey(~50~80). 대략 **270~430 라인**. 초판(120~220)보다 큼 — 소스 표면화·관리자 인프라 신설 때문.
- **커밋 분할 권고**:
  1. `feat(auth)`: `/api/auth/me` + `useMe`/`useIsAdmin` + queryKey (관리자 감지 인프라, 독립 검증 가능).
  2. `feat(market)`: 데이터 소스 표면화(어댑터·훅·타입) — 라우트 무변경.
  3. `feat(home)`: 실시간 순위 가용성 전환 + 순매수 당일 전환 + 점검 안내 UI + 카피(디자이너 DESIGN.md 색 신규 시 선행).
  4. `refactor`: `MarketClosedNotice`(#247) 제거/대체 정리(시각 게이팅 폐기 잔여).
- **레이트리밋(q2)**: 4탭 전부 프로브 = KIS TR 4콜(volume/value=FHPST01710000 2콜, up/down=FHPST01700000 2콜) + 순매수 2콜(순차)이 홈 진입에 몰린다 → EGW00201(초당 건수) 위험. **PM 권고**: (1) 각 라우트가 이미 `fetchWithTransientRetry`(EGW00201 backoff 1회)를 함 + (2) 훅 `staleTime`(volumeRank/fluctuation queryConfig) 로 재프로브 억제 + (3) 필요 시 **탭 프로브를 순차 활성화**(flow/top10 의 `delay(150ms)` 순차 2콜 선례). 초판은 활성 탭만 켰으나 가용성 판정에 4탭 필요 → **staleTime 캐시 우선, EGW00201 실측 시 순차 활성화 폴백**. 실측 검증은 주간(KIS 정상) + 야간(점검 502) 양쪽.
- **판정 상관성**: KIS 야간점검은 전 TR 동시 500 → 실무상 4탭이 함께 unavailable. per-탭 숨김은 "일부 TR 만 장애"(드묾)에 대응. 상관 높아도 per-탭 설계가 안전(과숨김 없음).
- **보안 영향(관리자)**: role 서버 판정(HMAC). 클라 위조 무의미(공개 refetch). `/api/auth/me` 읽기전용. 게이트 401 리다이렉트와 무관(이미 통과한 세션의 role 조회) — `readSession` 실패 시 role null 반환(401 아님)으로 `client.ts` 리다이렉트 인터셉터 오발동 회피.
- **회귀 위험**: 초판 대비 표면 크나 라우트·타입 무변경(소스는 표면화만), 순수 클라 판정 + 신규 읽기전용 라우트. 최대 리스크 = (1) dev mock 을 unavailable 로 오판(→ AC-2 로 방어), (2) 4탭 프로브 EGW00201(→ §8 q2 전략). prod dormant 아님(즉시 발현) — 배포 후 야간점검 시각 실검증 필요.

## 9. OPEN QUESTION

- **[RESOLVED] q1. dev mock vs prod 점검 구분 — 라우트 수정 필요?** **결론: 라우트 수정 불필요.** 라우트가 내리는 `X-Data-Source` 가 이미 `mock`(미설정 dev) 과 `mock-timeout`/`mock-empty`/`mock-error`(KIS 시도 후 실패)를 구분(§6). 클라가 헤더를 **표면화**(§3-0)해 `{kis, mock}`=available, `{mock-timeout, mock-empty, mock-error}`+502=unavailable 로 판정하면 됨. (선택: `volume-rank` 빈결과 502 vs `fluctuation` mock-empty 의 표기 비대칭을 통일하는 라우트 정리는 **비필수·비채택 권고** — 판정이 HTTP+헤더 조합으로 이미 견고.)
- **[OPEN QUESTION] q2. 4탭 전체 프로브 레이트리밋 전략(순차 vs 캐시).** **PM 권고: staleTime 캐시 우선 + EGW00201 실측 시 순차 활성화 폴백.** 4탭 동시 프로브가 홈 진입 KIS 콜 폭주(§8)를 유발할 수 있음. 각 라우트 transient 재시도 + 훅 staleTime 으로 1차 흡수, 실측(주간 정상 + 야간 점검)에서 EGW00201 관측되면 flow/top10 의 `delay` 순차 패턴을 탭 프로브에 적용. → **구현 후 실측 필요(주간+야간).**
- **[OPEN QUESTION] q3. `/api/auth/me` + `useMe`/`useIsAdmin` 를 본 PR In vs 선행 PR.** **PM 권고: 본 PR In.** "관리자만 재시도" AC(AC-5/9/10)가 이 인프라 없이 성립 불가 + 한 브랜치 한 PR 룰. 표면 최소(읽기전용 라우트 1 + 훅 1). 위조 위험 실질 0(공개 refetch). — 리뷰어가 인증 인프라 격리를 원하면 선행 PR 로 분리(그 경우 본 PR 은 머지 전제로 대기, close call).
- **[RESOLVED] q4. "점검중" 판정을 X-Data-Source 로만 vs HTTP 상태도.** **결론: 둘 다 본다.** `fluctuation` 은 never-throw(실패도 200+mock-*) → 헤더 필수. `volume-rank`·`flow today` 는 빈결과/오류에 502 throw → `isError` 필수. 한쪽만으론 불충분(§6). available = `!isError && dataSource∈{kis,mock}`.
- **[RESOLVED] q5. 급상승/급하락 라우트가 volume-rank 와 동일 구조인지 실측.** **결론: 다르다.** `fluctuation`(up/down)=never-throw(`mock-empty`/`mock-error`/`mock-timeout`), `volume-rank`=빈결과/오류에 502 throw(§6 표). 판정 로직이 이 차이를 흡수(q4). 라우트 실독으로 확정.
- **[OPEN QUESTION] q6. 공용 "점검 중" UI — 신규 컴포넌트 vs 기존 확장 + 카피 톤.** **PM 권고: 신규 공용 `MaintenanceNotice`**(`isAdmin`·`onRetry`·`nudge` props). 기존 `MarketClosedNotice`(#247, 시각 게이팅 폐기로 소비처 소멸)는 제거/대체. 카피 톤 = "점검 중 · 잠시 후 다시 확인"(마감 아님 → 다음 개장 시각 표기 안 함). **UX 디자이너 최종 결정**(형태·아이콘·관리자 재시도 버튼 위계·순매수 넛지 배치) — 데이터 배선(`isAdmin`·refetch·nudge)까지 만들고 최종 시각은 확정 후 같은 브랜치 커밋.
