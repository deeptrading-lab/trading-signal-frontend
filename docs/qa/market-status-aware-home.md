# QA — market-status-aware-home (가용성 인지형 마켓 홈) · 재QA (가용성 기반)

- 대상 PR: #247 / 브랜치 `feature/market-status-aware-home`
- 근거: `docs/prd/market-status-aware-home.md` §5 AC-1~AC-14 · §6 가용성 규칙 · `docs/design/market-status-aware-home.md` (R1~R12)
- QA 일자: 2026-07-05 (재QA — 초판 QA 는 시각 게이팅 전제라 stale, 구현이 **가용성 기반**으로 전면 재작업됨)
- 판정: **qa-passed** (실패 0건)

## 개정 요지 — 무엇이 바뀌어 재QA 했나

초판(#247)은 "정규장일 때만 표시"하는 **시각 게이팅**(`isRegularOpen` 하드 게이팅 + `MarketClosedNotice`
"장 마감·다음 개장")이었다. 사용자 실측으로 에러 원인이 **장 마감이 아니라 KIS 야간점검**(주말·장외에도 랭킹
정상 제공)임이 확인돼, 축이 **"장이 열렸나" → "데이터를 받을 수 있나(가용성)"** 로 전환됐다. 초판 QA 리포트의
AC 표(마감 게이팅·`MarketClosedNotice`·소프트 넛지)는 전부 폐기됐고 본 리포트가 이를 대체한다.

## 검증 방식 · 브라우저 E2E 불가 사유

앱은 **로그인 게이트**(미인증 시 `/market`·`/` → 307, `/api/market`·`/api/flow` → 401)라 헤드리스 브라우저
세션을 정당하게 발급할 수 없다(세션 토큰 위조는 보안 우회라 미수행). 가용성 판정·탭 파생은 **순수함수로 추출**돼
있어(`lib/market/availability.ts`·`rankingView.ts`) 유닛이 브라우저 E2E 를 실질 대체한다. 따라서
① 순수함수 유닛 + ② 컴포넌트 분기 코드 정독 + ③ dev 서버(:3099) 라우트 건전성/`/api/auth/me` curl +
④ 자동화 게이트(tsc/lint/vitest/design:sync/grep) 로 검증했다.

**로컬 관측 한계(명시):** 로컬은 KIS 가 설정돼 `volume-rank`/`fluctuation`/`flow today` 가 실 KIS 경로(=대체로
`kis`=available)만 관측된다. 점검(`mock-*`/502)·전탭 unavailable 시각 렌더는 **prod 야간점검 시각 실검증
필요**(PR 본문 §다음 작업 · §8 q2 EGW00201 레이트리밋도 야간 실측 대상). 판정 로직 자체는 유닛으로 소스별
경계를 결정론 고정했다.

## AC 별 검증 표

| # | 시나리오 | 재현 / 근거 | 기대 | 실측 | 판정 |
|---|---|---|---|---|---|
| AC-1 | 전탭 available(prod KIS 정상) | `resolveAvailability({isError:false, dataSource:"kis"})="available"` (유닛) → `deriveRankingView` 전탭 available → `availableTabs=4`, `view="list"`, activeTab 유지 (유닛 "전탭 available") | 4탭 모두 노출, 리스트 정상, 점검 안내 미노출 | 유닛 통과. 컴포넌트: `availableTabDefs`=4 → `hasTabBar`(≥2) 탭바 렌더, `RankingContent view="list"` | PASS (유닛/코드) |
| AC-2 | dev mock 정상 표시 | `resolveAvailability(settled("mock"))="available"` (유닛 "dev mock = available — 영구 점검중 회귀 방지") | 4탭 모두 노출 + mock 표시, 점검 안내 미노출 | `AVAILABLE_SOURCES={kis,mock}` → mock available. 유닛 통과 | PASS |
| AC-3 | 일부 탭 unavailable | `deriveRankingView(map(available,available,unavailable,unavailable),"surge")` → `availableTabs=[volume,turnover]`, `effectiveTab="volume"` (유닛 "활성 탭 소실 → 첫 available 이동") | 급상승·급하락 탭 **숨김**, 활성 탭 소실 시 첫 available 이동, 점검 안내 미노출 | 유닛 통과. `availableTabDefs` DOM 필터(흐림 아님). `useEffect(effectiveTab!==tab → setTab)` 자동 이동 | PASS |
| AC-4 | 전탭 unavailable — 일반 사용자 | `deriveRankingView` 전탭 unavailable+settled → `view="maintenance"` (유닛 "available 0 → maintenance"). `MaintenanceNotice isAdmin={false}` | 리스트/탭바 대신 점검 안내, **재시도 버튼 비노출** | `view==="maintenance"` → `<MaintenanceNotice isAdmin=false>`; `{isAdmin && <button>}` → 버튼 미렌더 | PASS |
| AC-5 | 전탭 unavailable — 관리자 | `isAdmin=true` → 버튼 렌더. `retryAll()` = volume/turnover/surge/plunge `.refetch()` 4콜 | 점검 안내 + "다시 시도" 노출, 클릭 시 4탭 refetch | `RealtimeRankingSection.retryAll` 4쿼리 refetch 확인. `MaintenanceNotice` 버튼 `onClick={onRetry}` | PASS (코드) |
| AC-6 | 순매수 당일 available | `todayUnavailable = mode==="today" && resolveAvailability(...)="unavailable"` → available 이면 false → 기존 리스트 | 외국인\|기관 Top10 정상(장외여도), 점검 안내 미노출 | `todayUnavailable=false` → loading/collecting/list 기존 경로. 시각 게이팅 0 | PASS |
| AC-7 | 순매수 당일 unavailable | today 502/`mock-timeout`/`mock-error` → `todayUnavailable=true` → `<MaintenanceNotice nudge={<FlowCumulativeNudge>}>` | 점검 안내 + "7일 누적 보기" 넛지, 재시도 관리자만, 무한재조회 없음 | `todayUnavailable` 분기 최상단 → 넛지 슬롯 주입. `useQueryFlowTop10 retry:0`(무한재조회 방지) | PASS |
| AC-8 | 순매수 7일 누적 무변경 | `todayUnavailable` 은 `mode==="today"` 게이트 → cumulative 는 판정 대상 아님. `cumulativeCollecting` 분기 유지 | 항상 정상 표시, 점검 안내 미노출, collecting 무회귀 | cumulative 모드 → `todayUnavailable=false` → 점검 미노출. `cumulativeCollecting` 코드 유지 | PASS |
| AC-9 | 관리자 감지 훅 | `/api/auth/me` role=admin/user/null → `isAdmin` true/false/false. dev curl(무쿠키) | `useIsAdmin()` 각각 true/false/false, 버튼 admin 만 | curl 무쿠키 → `{"role":null,"isAdmin":false}` (200). admin/user 는 서버 `isAdmin=role==="admin"` 코드 확정 | PASS (curl+코드) |
| AC-10 | 세션 role 위조 방어 | 위조 `app_auth` 쿠키(서명 불일치) dev curl | `/api/auth/me` → role null, 버튼 미노출 | curl 위조쿠키 → `{"role":null,"isAdmin":false}`. `readSession` HMAC constant-time 검증 실패 → null | PASS (curl) |
| AC-11 | 호가·체결 폴링 무회귀 | 커밋3: `useQueryStockOrderbook`·`Trades` `refetchInterval: …&&isRegularOpen`, 패널 `closed=!isRegularOpen` | 커밋3 동작 그대로, fail-open 유지, 본 PR 무변경 | 4파일 `isRegularOpen` 게이트 유지. `useMarketStatus` 는 이제 **폴링·MarketStatusBadge 만** 소비 | PASS |
| AC-12 | 데이터 소스 표면화 | `useQueryVolumeRank`/`useQueryFluctuation`/`useQueryFlowTop10` 가 `dataSource` 노출. `git diff main -- app/api/market app/api/flow` | 훅이 dataSource 노출, 라우트 무변경 | 3훅 `data:.data / dataSource:.dataSource` envelope unwrap 확인. **라우트 diff 빈 출력** | PASS |
| AC-13 | 반응형 두 뷰포트 | `MaintenanceNotice` `flex flex-col items-center`, `RankTabs` `hidden sm:inline-flex`/`sm:hidden` 이중, `FlowCumulativeNudge` `useBreakpoint().isMobile && flex-col`. `window.innerWidth` 직접검사 0 | 양 뷰포트 탭바 정렬·점검 안내 줄바꿈 깨짐 없음 | Tailwind `sm:`/`md:`/`lg:` + `useBreakpoint`. 시각 확인은 로그인 게이트로 코드검증 대체 | PASS (코드) |
| AC-14 | 컨벤션 정합 | 아래 게이트/그렙 절 | hex/px 0, 카피 단일, `@tanstack` 컴포넌트 import 0, 클라 `fetch(` 0, queryKey 단일 | 전부 0/단일 | PASS |

## 가용성 판정 유닛 근거 (핵심 · 재작업의 심장)

`npx vitest run lib/market lib/utils lib/api` → **51 파일 · 364 테스트 전부 통과**.

### `resolveAvailability` (§6 소스 매트릭스, `availability.test.ts` 7 tests)

| 케이스 | 입력 | 결과 |
|---|---|---|
| loading 최우선 | `isLoading=true`(isError/소스 무관) | `loading` (settled 전 점검 오판 방지) |
| KIS 성공 | `settled("kis")` | `available` |
| **dev mock(미설정)** | `settled("mock")` | **`available`** (영구 점검중 회귀 방지, §6 q1·R10) |
| never-throw 실패 | `settled("mock-timeout"/"mock-empty"/"mock-error")` | `unavailable` (fluctuation 계열) |
| 502 throw | `settled(undefined, isError=true)` / `settled("kis", true)` | `unavailable` (HTTP 상태만으로도, volume-rank·flow today) |
| 소스 미지 + 에러 아님 | `settled(undefined)` | `unavailable` (안전 실패) |

→ PRD §6 q4(HTTP+헤더 둘 다)·q5(세 라우트 구조 상이) 결론 그대로 고정. dev mock=available, KIS 시도 후 실패
(`mock-*`/502)=unavailable 의 핵심 경계가 유닛으로 잠김.

### `deriveRankingView` (탭 가변·자동이동·전탭 점검, `rankingView.test.ts` 7 tests)

| 케이스 | 결과 |
|---|---|
| 전탭 available | `availableTabs`=4, activeTab 유지, `view="list"` |
| 활성 탭 소실(surge→unavailable) | `effectiveTab` 첫 available(volume) 자동 이동, `view="list"` |
| available 1개 | `availableTabs`=[turnover], `view="list"`(컴포넌트가 정적 라벨로 강등) |
| 전탭 unavailable+settled | `availableTabs`=[], `effectiveTab=undefined`, `allSettled=true`, `view="maintenance"` |
| 아무 탭도 settled 전 | `settledCount=0`, `view="loading"` |
| available 0 이나 일부 로딩 | `allSettled=false` → `view="loading"`(성급한 점검 안내 금지) |
| 일부 available·일부 로딩 | available 즉시 `view="list"` |

### `readDataSource` (헤더 표면화, `dataSource.test.ts` 3 tests)

- 알려진 소스(`kis`/`mock`/`mock-timeout`/`mock-empty`/`mock-error`/`kv`) 그대로 union 반환.
- 배열 헤더 첫 값 사용. 미지/부재/비문자열/`42` → `undefined`(판정 측 안전 실패). axios 소문자 키(`x-data-source`) 정합.

## 데이터 소스 표면화 · 라우트 무변경 (AC-12)

- 어댑터 3(`volumeRank.ts`·`fluctuation.ts`·`flow/top10.ts`)가 `{ data, dataSource: readDataSource(headers) }`
  envelope 반환. 훅 3 이 `data:query.data?.data / dataSource:query.data?.dataSource` 로 unwrap 해 컨슈머가
  `.data.rows` 는 그대로, `dataSource` 는 추가로 읽는다(무회귀).
- 라우트가 방출하는 `X-Data-Source` 값 실독 확인(무변경): `volume-rank`=kis/mock/mock-timeout,
  `fluctuation`=kis/mock/mock-empty/mock-error/mock-timeout(never-throw), `flow/top10`=kis/mock/kv/mock-timeout.
  → 타입 union(`lib/types/market/dataSource.ts`)·판정 규칙과 정합.
- **`git diff main -- app/api/market app/api/flow` = 빈 출력** (라우트 로직·헤더 값 무변경).

## 관리자 재시도 인프라 (AC-9·AC-10) — dev 서버 :3099 curl

`/api/auth/me` 는 **읽기전용**(`readSession` HMAC 검증만), 로그인 게이트 **예외**(무쿠키도 200 — market 라우트는 401):

| 요청 | 응답 | 판정 |
|---|---|---|
| 무쿠키 GET | `200 {"role":null,"isAdmin":false}` (`cache-control: no-store`) | 401 아님 → 인터셉터 `/login` 무한 리다이렉트 회피(§8) |
| 위조 `app_auth` 쿠키(서명 불일치) | `200 {"role":null,"isAdmin":false}` | HMAC constant-time 검증 실패 → role null(AC-10) |
| `/api/market/volume-rank` (대조) | `401` | 게이트 적용됨(=`/api/auth/me` 만 예외 확인) |

- `useIsAdmin()` = `useQueryAuthMe().data?.isAdmin ?? false`(로딩/미인증/에러 모두 false 안전 기본).
- queryKey 단일(`queryKeys.auth.me = ["auth","me"]`), queryConfig 단일(`queryConfig.auth.me`), `retry:0`·`refetchOnWindowFocus:false`.
- "다시 시도"는 `MaintenanceNotice` 의 `{isAdmin && <button onClick={onRetry}>}` — 비관리자 슬롯 자체를 비움(placeholder 없음). 재시도는 공개 랭킹 refetch(특권 아님).

## 회귀 / 제거 확인

| 항목 | 결과 |
|---|---|
| `MarketClosedNotice.tsx` 삭제 | 파일 없음(`No such file`), 코드 참조 0(문서만 잔존) |
| 시각 게이팅 폐기(랭킹/순매수) | `RealtimeRankingSection`·`InvestorFlowTop10Card` `isRegularOpen` 실사용 0(주석 1건만) |
| `useMarketStatus` 소비 축소 | 이제 폴링(orderbook/trades 훅·패널)·`MarketStatusBadge` 만 소비(랭킹/순매수 제거) |
| 커밋1(marketClock KST 폴백) | `lib/market/marketClock.ts` 무손상, `marketClock.test.ts` 통과 |
| 커밋3(폴링 스왑) | orderbook/trades 훅 `refetchInterval&&isRegularOpen`·패널 `closed=!isRegularOpen` 유지, fail-open 지속 |
| 7일 누적(kv) 무변경 | cumulative 판정 대상 제외, `cumulativeCollecting` 분기 유지. 초판 강제 cumulative·소프트 넛지 제거 |
| 라우트 무변경 | `git diff main -- app/api/market app/api/flow` 빈 출력 |

## 게이트 / 그렙 수치

| 항목 | 명령 | 결과 |
|---|---|---|
| 타입 | `npx tsc --noEmit` | exit 0 |
| 린트 | `npm run lint` (eslint .) | exit 0 |
| 유닛 | `npx vitest run lib/market lib/utils lib/api` | **364 passed (51 files)** |
| 토큰 동기화 | `npm run design:sync` | no-op(theme.json/config git clean, 신규 토큰 0 — R11) |
| DESIGN.md lint | `npx @google/design.md lint docs/design/market-status-aware-home.md` | **errors=0** warnings=0 |
| hex/px 직타 | `git grep -nE '#hex\|px' -- MaintenanceNotice·RealtimeRankingSection·InvestorFlowTop10Card` | 0건(토큰만, `min-h-[calc(theme(spacing.table-row-h)*3)]`) |
| `@tanstack` 컴포넌트 import | 변경 컴포넌트 3종 | 0건(도메인 훅만 소비) |
| 클라 `fetch(` | `git grep '\bfetch(' -- components/ hooks/ lib/`(prefetch/refetch/fetchWith 제외) | 0건 |
| BFF 127.0.0.1 | `git grep 'http://127.0.0.1' -- app/` | route handler `FASTAPI_BASE_URL` fallback 3건만(허용 예외) → 위반 0 |
| `window.innerWidth` | 변경 파일 | 0건(`useBreakpoint`·`md:`/`sm:` 사용) |
| 카피 단일 위치 | 점검 안내 `lib/copy/market/maintenance.ts`, 넛지 `lib/copy/flow/labels.ts` | 각 단일 위치 |
| 합성 클래스 존재 | `button-secondary`·`signal-up-text`·`netbuy-amount-up` @ `app/components.css` | 정의 확인(silent 실패 없음) |

## 라우트 건전성 (dev 서버 :3099, 기존 3000 무접촉)

| 경로 | 결과 |
|---|---|
| `/api/auth/me` (무쿠키) | 200 `{role:null,isAdmin:false}` (게이트 예외 — 정상) |
| `/api/market/volume-rank` | 401 (게이트 — 정상) |
| `/api/market/fluctuation` | 401 (게이트 — 정상) |
| `/api/flow/top10` | 401 (게이트 — 정상) |
| dev 컴파일 에러 | 0건 (500·crash 0) |

## 에지 케이스

- **dev mock 오판 방지(최중요)**: `X-Data-Source: mock`(미설정 dev) → available. `resolveAvailability(settled("mock"))="available"` 유닛 고정. "영구 점검중" 회귀 없음.
- **성급한 점검 안내 방지**: available 0 이지만 일부 탭 `loading` → `allSettled=false` → `view="loading"`(스켈레톤). 전탭 settled 이후에만 maintenance.
- **활성 탭 소실 자동 이동**: 활성 탭이 unavailable 로 바뀌면 `effectiveTab` 첫 available 로 재설정 → `useEffect` setTab. 빈 콘텐츠 방지. available 탭 간 전환은 사용자 클릭 존중.
- **502 소스 헤더 부재**: 502 에러 응답은 `x-data-source` 없을 수 있으나 `isError=true` 만으로 unavailable(유닛 `settled(undefined, true)`).
- **위조 role 쿠키**: HMAC 서명 불일치 → `readSession` null → isAdmin false(curl 실증). 재시도 버튼 미노출.
- **미인증 무한 리다이렉트 회피**: `/api/auth/me` 는 401 대신 200 `{role:null}` → axios 인터셉터 `/login` 오발동 없음(curl 200 확인).
- **StrictMode 더블 마운트**: `deriveRankingView`·`resolveAvailability` 순수함수(부수효과 없음), `useIsAdmin` staleTime 캐시 → 이중 마운트 안전.
- **넛지 모바일 줄바꿈**: `FlowCumulativeNudge` `useBreakpoint().isMobile && flex-col`(링크 다음 줄), `window.innerWidth` 직접검사 0.
- **레이트리밋(EGW00201)**: 4탭 동시 프로브 → 훅 staleTime 60s 캐시로 반복 마운트 흡수. **주간 정상·야간 점검 실측은 prod 야간 QA 로 이월**(§8 q2, PR 본문 다음 작업).

## 로컬 QA 한계 (prod 야간 실검증 이월)

- 로컬 KIS 설정돼 랭킹/순매수 라우트가 대체로 `kis`=available 만 관측 → **전탭 unavailable·부분 탭 숨김·점검 안내·관리자 재시도의 실브라우저 렌더는 미관측**. 판정 로직은 유닛으로 결정론 고정했으나, prod **야간점검(평일 21:50~23시대, 전 TR 500)** 시각 홈 진입 실검증이 남는다(§다음 작업).
- 로그인 게이트로 헤드리스 브라우저 시각 QA(반응형 두 뷰포트 5건씩) 미수행 → `md:`/`sm:`/`lg:` + `useBreakpoint` 코드검증으로 대체.
- EGW00201 레이트리밋(4탭 프로브 폭주) 주간/야간 양쪽 실측은 이월(PM §8 q2 OPEN).

## 결론

PRD AC-1 ~ AC-14 **전부 PASS**, 실패 0건. 가용성 판정(`resolveAvailability` 6경계)·탭 가변 파생
(`deriveRankingView` 7케이스)·헤더 표면화(`readDataSource`)·관리자 재시도(`/api/auth/me` 200·위조 방어)·dev
mock 정상 표시·7일 누적 무변경·라우트 무변경(diff 빈 출력)·`MarketClosedNotice` 제거·컨벤션 정합 모두 확인.
게이트: tsc 0 · lint 0 · vitest 364 passed · design.md errors 0 · design:sync no-op. **prod 야간점검 시각
실브라우저 렌더 + EGW00201 실측은 배포 후 야간 QA 로 이월**(PR 본문 §다음 작업 명시). → `qa-passed`.
</content>
