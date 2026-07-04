# PRD — market-status-aware-home (시장상태 인지형 마켓 홈: 장 마감 우아한 대체 + 폴링 게이팅 통합)

- 슬러그: `market-status-aware-home`
- 상태: 기획 (impl 전)
- 작성: 2026-07-05 (PM 역할)
- 브랜치: `feature/market-status-aware-home`
- 시리즈: 토스 Open API 배선의 **소비처(consumer) PR**. ②(`toss-market-calendar`, `useMarketStatus` 원천)·①(`toss-orderbook`)·③(`toss-trades`) 머지 완료 후속.
- 관련:
  - `docs/prd/toss-market-calendar.md` — ②. 본 PRD 가 소비하는 `useMarketStatus`·`MarketStatus`·`isRegularOpen`(fail-open)·`MarketStatusBadge`·`marketClock` 의 원천. 형식·톤·"fail-soft·fail-open·add-only" 규율을 그대로 답습.
  - `docs/prd/toss-orderbook.md` / `docs/prd/toss-trades.md` — ①/③. 호가·체결 폴링 게이트(`isKstMarketHoursWithCloseGrace()` 휴리스틱)를 심었고 "캘린더 통합은 후속 일괄" 로 남겨둔 §4 Out 항목을 본 PRD 가 **회수(§3-3)**.
  - `docs/rules/frontend.md` — FE 컨벤션 8개 절(도메인 훅만 소비·`cn`·카피 단일 위치·queryKey 단일·반응형).
- **UI 포함: yes** (장 마감 공용 상태 UI — 신규 컴포넌트 vs empty-state 확장은 §9 q4 로 UX/UI 디자이너 결정. 합류 트리거)

## 1. 배경 / 문제

마켓 홈(`app/(main)/market/page.tsx` → `components/home/MarketOverviewPage.tsx`)을 **장 마감·주말·공휴일**에 열면 두 섹션이 빨간/회색 에러 카드로 깨진다(실제 스크린샷 근거):

- **실시간 순위**(`components/home/RealtimeRankingSection.tsx` — 탭: 거래량/거래대금/급상승/급하락) → "실시간 순위를 불러오지 못했어요"(`RANK_ERROR`) + "다시 시도" 에러 블록.
- **외국인·기관 순매수 Top10**(`components/flow/InvestorFlowTop10Card.tsx` — 토글: 당일/7일 누적) → "수급 정보를 불러오지 못했어요"(`FLOW_TOP10_ERROR`) 빨간 `card-critical` 카드.

원인은 명확하다. 둘 다 **KIS 실시간 랭킹 TR** 을 원천으로 한다:
- 실시간 순위 = `app/api/market/volume-rank/route.ts`(FHPST01710000)·`app/api/market/fluctuation/route.ts`.
- 순매수 당일 = `app/api/flow/top10/route.ts`(KIS 주체별 순매수 TR).

이 TR 들은 **장 마감 후 라이브 데이터가 없어** 빈 응답/실패로 떨어진다. 반면 상단 지수 스트립은 종가 스냅샷이라 정상이고, 순매수 **"7일 누적"** 탭은 KV 스냅샷(`readCumulativeSnapshots`) 기반 과거 데이터라 마감에도 정상이다. 즉 **"장이 열렸을 때만 라이브 섹션을 조회"** 하면 에러 카드 자체가 사라진다 — 사용자가 정확히 지적한 지점이다: "장 시작·마감 시간을 아는데 그때만 실시간 데이터를 보여주면 되잖아."

방금 머지된 ②(`toss-market-calendar`)가 이걸 정확히 가능케 한다. `useMarketStatus().isRegularOpen`(공휴일 인지, fail-open)으로 **KIS 호출 자체를 게이트**하고, 마감이면 에러 대신 "장 마감 · 다음 개장 안내" 로 우아하게 대체한다. 동시에 ①/③이 후속으로 남겨둔 호가·체결 폴링 게이트의 휴리스틱(`isKstMarketHoursWithCloseGrace()`, 공휴일 미인지)을 같은 `isRegularOpen` 로 얇게 스왑해 **공휴일 인지 게이팅을 한 소비처 PR 로 수렴**한다.

## 2. 목표 (측정 가능)

1. 장 마감/주말/공휴일(`!isRegularOpen`)에 마켓 홈을 열면 실시간 순위·순매수(당일) 섹션이 **빨간/회색 에러 카드 0** 으로, "장 마감 · 다음 개장 안내" 우아한 상태로 렌더된다.
2. 마감 상태에서 실시간 순위·순매수(당일)는 **KIS 랭킹 TR 을 호출하지 않는다**(네트워크 탭·유닛으로 검증) — 조회 게이트가 `isRegularOpen=false` 에서 `enabled` 를 끈다.
3. 순매수 **"7일 누적"** 탭은 마감에도 **정상 표시**(게이팅 안 함) — 과거 KV 스냅샷 데이터라 장 상태와 무관.
4. `useMarketStatus().isRegularOpen`(캘린더 기반, 공휴일 인지, fail-open)이 실시간 순위·순매수 게이트를 구동하고, **호가·체결 폴링 게이트가 휴리스틱에서 이 값으로 스왑**된다(§3-3).
5. **fail-open 무회귀**: 캘린더 실패/키 없음(`phase="unknown"` → `isRegularOpen=true`)에서 기존 동작(장중 취급, 조회·폴링 정상)을 그대로 유지 — 캘린더 백드 상태가 "장중 오정지" 새 실패모드를 만들지 않는다.
6. 정규장 개장 중(`isRegularOpen=true`) 마켓 홈 동작 **무회귀**: 실시간 순위 4탭·순매수 당일/누적 모두 기존과 동일하게 조회·표시.

## 3. 범위 (In scope)

### 3-1. 실시간 순위 섹션 마감 게이팅 — `components/home/RealtimeRankingSection.tsx`

- `useMarketStatus()` 소비(도메인 훅 — `docs/rules/frontend.md` §1: `useQuery` 직접 import 금지, 이미 준수 중). `isRegularOpen` 을 4개 랭킹 훅의 `enabled` 에 **AND 로 곱한다**:
  - 예: `useQueryVolumeRank("volume", { enabled: tab === "volume" && isRegularOpen })`. 급상승/급하락/거래대금 동일.
  - 결과: `!isRegularOpen` 이면 어떤 탭도 KIS TR 을 호출하지 않는다(마운트/탭전환 무발). `isRegularOpen` 이 `true`(정규장) 또는 `unknown→true`(fail-open)면 기존과 동일.
- 마감 시 리스트/로딩/에러 분기 **앞에** "장 마감" 상태 분기를 추가한다: `!isRegularOpen && !isLoading` 이면 리스트/스켈레톤/에러 대신 **공용 마감 안내 UI**(§3-4)를 렌더. 기존 `RANK_ERROR` 에러 블록은 마감 경로에서 도달 불가(호출 자체를 안 하므로 `isError` 안 뜸).
- **탭 UI 자체는 유지**(마감이어도 탭바 노출). 마감 상태 안내는 리스트 영역만 대체.
- `failedTabs` 로직·자동 전환 금지·관심종목 단일 소유 등 기존 구조 **무변경**.
- **q1 결정 반영 지점**: 마감 시 (a) 단순 안내만 vs (b) 직전 세션 스냅샷 표시. **본 PRD 는 (a) 단순 안내로 구현**(§9 q1 권고). 스냅샷은 데이터 가용성 불확실(volume-rank·fluctuation 은 라이브 TR, 종가 랭킹 스냅샷 소스 없음) → 후속.

### 3-2. 순매수 Top10 마감 게이팅(당일만) — `components/flow/InvestorFlowTop10Card.tsx`

- **뉘앙스(핵심)**: "당일"(`mode==="today"`)만 KIS 라이브 TR → 마감 시 게이팅. "7일 누적"(`mode==="cumulative"`)은 KV 스냅샷 과거 데이터 → **게이팅 안 함, 마감에도 정상**.
- `useMarketStatus()` 소비. `useQueryFlowTop10(mode, { enabled })` 의 `enabled` 를 모드 조건부로:
  - `today` → `isRegularOpen`(마감이면 false → KIS 무호출).
  - `cumulative` → `true`(항상, 장 상태 무관).
- 마감 + `today` 탭이면 로딩/에러/empty 분기 앞에 "장 마감" 안내(§3-4). 기존 `FLOW_TOP10_ERROR` 빨간 `card-critical` 카드는 마감 당일 경로에서 도달 불가.
- **q2 결정 반영 지점** — 마감 시 당일 탭 처리 3안((a) 안내 / (b) 직전거래일 폴백 / (c) 7일누적 자동전환) 중 **PM 권고 = (a) 안내 + 소프트 넛지**:
  - 기본: 마감 시 당일 탭은 "장 마감 · 실시간 순매수는 장중에 제공 · 다음 개장 M/D(요일) HH:mm" 안내. KIS 무호출. (실시간 순위와 톤·컴포넌트 공유 — §3-4.)
  - 소프트 넛지(권장, UX 확인): **마운트 시 `!isRegularOpen` 이면 토글 초기값을 `cumulative` 로** 설정 → 사용자가 데이터가 있는 누적 탭에 착지. **자동 강제 전환 아님**(초기 state 만; 사용자가 당일 탭 클릭 시 위 안내 노출). 세션 중 사용자가 고른 모드를 마감이 됐다고 임의로 바꾸지 않는다.
  - (b) 폴백 기각: 직전거래일 순매수 데이터 소스가 현재 없음(당일 TR 은 asof=오늘만). BE 신규 필요 → 후속.
  - (c) 강제 자동전환 기각: 사용자가 명시 선택한 모드를 마감이 되었다고 몰래 바꾸면 놀람. 지표 성격도 다름(당일 vs 7일 누적).
- 관심 사항: `cumulativeCollecting`·`buildHeaderMeta`·모바일 Top5 절단 등 기존 구조 **무변경**.

### 3-3. 폴링 게이팅 통합 — 호가·체결 훅 얇은 스왑 (①/③ 후속 회수)

- **대상 2곳만**(①/③ 산출물): `hooks/stock/useQueryStockOrderbook.ts`·`hooks/stock/useQueryStockTrades.ts` 의 `refetchInterval` 게이트.
  - 현재: `refetchIntervalMs != null && isKstMarketHoursWithCloseGrace()`(휴리스틱, 공휴일 미인지).
  - 스왑: `useMarketStatus().isRegularOpen` 기반으로. 훅은 `useQuery` 만 쓰므로 `isRegularOpen` 을 **인자로 주입**하거나 훅 내부에서 `useMarketStatus()` 를 호출(도메인 훅 소비 — 규칙 준수). 구현 형태(주입 vs 내부 호출)는 구현자 재량, AC 는 결과(공휴일에 폴링 정지·fail-open)만 고정.
- **패널 "closed" 라벨 정합**: `components/stock/OrderbookPanel.tsx`·`components/stock/TradeStrengthPanel.tsx` 의 `const closed = !isKstMarketHoursWithCloseGrace()` 도 같은 `!isRegularOpen` 기준으로 스왑(폴링 게이트와 UI 마감 표시가 어긋나지 않게).
- **fail-open 필수**: `isRegularOpen` 은 `unknown → true`(캘린더 실패/키 없음). 따라서 캘린더가 죽어도 장중 폴링이 멈추지 않는다(새 실패모드 차단). AC-8 로 고정.
- **grace 윈도우 뉘앙스(§8·§9 q5)**: 기존 휴리스틱은 15:30~15:40 마감 유예 10분을 포함(`WithCloseGrace`). `isRegularOpen` 은 엄격 정규장(09:00~15:30). 스왑 시 이 10분 유예가 사라진다 — 마감동시호가 잔량 변동을 10분 덜 폴링. **PM 판단: 수용**(경미, 마감 후 호가는 곧 정지가 정상). grace 보존이 필요하면 §9 q5 대안 참조.

### 3-4. 공용 "장 마감" 상태 UI (§9 q4 — UX 결정)

- 실시간 순위(§3-1)·순매수 당일(§3-2)이 **공유**할 마감 안내 표현. ②의 `MarketStatusBadge` 톤과 정합.
- 내용: "장 마감" + `nextOpen`(있으면) "다음 개장 M/D(요일) HH:mm" 안내. 휴장(주말·공휴일)도 동일 카피로 다음 개장 안내. `useMarketStatus()` 의 `nextOpen` 을 그대로 소비.
- **형태 결정은 UX**(§9 q4): (A) 신규 공용 컴포넌트(예 `components/market/MarketClosedNotice.tsx`, `useMarketStatus` 자족 소비) vs (B) 기존 섹션 empty-state 확장. **PM 권고: (A) 신규 공용 컴포넌트** — 두 섹션(+향후 다른 라이브 섹션)이 재사용, ②의 배지와 카피·톤 일원화.
- 한글 카피는 `lib/copy/market/marketStatus.ts`(②가 이미 생성) 확장 또는 신규 `lib/copy/` 단일 위치. hex/px 직타 금지(디자인 토큰만), `cn` 헬퍼, 반응형은 Tailwind prefix + `useBreakpoint`.

## 4. 비범위 (Out of scope)

- **미국 장(해외) 상태 처리·`market-calendar/US`** — 국내(`/KR`) `isRegularOpen` 만. 지수 스트립의 해외 지수는 무관.
- **지수 스트립**(`HeaderMarketTicker`·상단 지수) — 이미 종가 스냅샷으로 정상. 손대지 않음.
- **실시간 랭킹의 대체 데이터소스 신규 구축**(종가 랭킹 스냅샷·직전세션 캐시) — q1 스냅샷 안. 데이터 가용성 불확실 → 후속.
- **순매수 당일 직전거래일 폴백**(q2 (b)안) — BE 신규 필요. 후속.
- **나머지 폴링 소비처 스윕**: `useQueryStockWarnings`·`useQueryStockWarningsBatch`·`useQueryMinuteChart`·단타(`useIntradayPaperRefresh`)·서버 스케줄러(`tickScheduler`·`refreshScheduler`)도 `isKstMarketHoursWithCloseGrace()`/`isKstMarketHours()` 를 쓰지만 **본 PR 은 ①/③ 산출물(호가·체결)만 스왑**한다. 나머지는 회귀면적(warnings 배치·분봉·서버 스케줄러 grace/야간 로직)이 커 별도 후속 일괄. (본 PR 은 그 패턴의 레퍼런스가 된다.)
- **스케줄러 휴장가드**(`tickScheduler`·`refreshScheduler`) — 로컬 CLI 전용·defer 상태. 후속.
- **`kstMarketHours.ts` 자체 철거** — 여러 소비처가 아직 사용. 진실원천 스왑은 소비처별 점진. 본 PR 은 걷어내지 않는다.

## 5. 수용 기준 (AC)

QA 가 표로 검증. 장 상태(정규장/마감/휴장/unknown)·뷰포트별 재현. `useMarketStatus` 는 시각 주입 가능(marketClock 순수함수) 또는 `useQueryMarketCalendar` 모킹으로 상태 고정.

| # | 시나리오 | 재현 | 기대 |
|---|---|---|---|
| AC-1 | 실시간 순위 마감 | `isRegularOpen=false`(마감/주말/공휴일)에서 홈 진입 | 실시간 순위: 에러 카드 0, "장 마감 · 다음 개장 …" 안내(§3-4). 4탭 KIS TR **무호출**(네트워크/유닛). 탭바는 노출 |
| AC-2 | 실시간 순위 정규장 무회귀 | `isRegularOpen=true`(장중) | 4탭 기존대로 조회·리스트·스켈레톤·failedTabs 동작. 안내 미노출 |
| AC-3 | 순매수 당일 마감 | 마감 + `today` 탭 | 에러 카드 0, "장 마감 · 실시간 순매수는 장중 제공 · 다음 개장 …" 안내. KIS 순매수 TR 무호출 |
| AC-4 | 순매수 7일 누적 마감(게이팅 안 함) | 마감 + `cumulative` 탭 | **정상 표시**(KV 스냅샷 데이터). `enabled` 항상 true, 안내 미노출. `cumulativeCollecting` 분기 무회귀 |
| AC-5 | 순매수 소프트 넛지 | 마감 상태로 카드 마운트 | 토글 초기값 `cumulative`(데이터 착지). 사용자가 `today` 클릭 시 AC-3 안내. 세션 중 강제 전환 없음 |
| AC-6 | 순매수 정규장 무회귀 | 장중 | 당일/누적 모두 기존대로. 넛지 미발동(당일 기본 유지) |
| AC-7 | 호가·체결 폴링 공휴일 정지 | 평일 공휴일(`todayIsBusinessDay=false`, `isRegularOpen=false`) | `useQueryStockOrderbook`·`useQueryStockTrades` `refetchInterval=false`(폴링 정지). 패널 `closed=true` 라벨 |
| AC-8 | 폴링 fail-open 무회귀 | 장중 + 캘린더 실패(`phase="unknown"`→`isRegularOpen=true`) | 폴링 **정상 지속**(오정지 없음). 캘린더 백드 상태에 폴링 커플링 안 됨 |
| AC-9 | 폴링 정규장 무회귀 | 장중 영업일 | 호가·체결 기존 주기(단타 3s·상세 10s) 폴링. 패널 `closed=false` |
| AC-10 | unknown fail-open (홈) | 토스 키 없음/캘린더 실패 | 실시간 순위·순매수 당일 **조회 정상**(기존 동작). 마감 안내 미노출(장중 취급). 에러 로그 0 |
| AC-11 | 반응형 두 뷰포트 | 모바일·PC 마감 안내 | 양 뷰포트 마감 안내 정렬·줄바꿈 깨짐 없음(`md:`/`lg:` + `useBreakpoint`) |
| AC-12 | 컨벤션 정합 | `git grep` | 마감 안내 hex/px 직타 0, 한글 카피 `lib/copy/` 단일 위치, `useQuery` 직접 import 0(도메인 훅만), 클라 `fetch(` 0 |
| AC-13 | 라우트 무회귀 | `volume-rank`·`fluctuation`·`flow/top10` route | 시그니처·mock 폴백 무변경(게이팅은 클라 훅/컴포넌트 레벨). `git diff app/api/market app/api/flow` = 무변경 |

## 6. 데이터 / 게이팅 규칙

- 게이트 원천: `useMarketStatus()`(②) → `isRegularOpen`(= `phase==="regular"`, `unknown→true` fail-open).
- 라이브(게이팅 대상): 실시간 순위 4탭(volume·value·up·down), 순매수 **당일**, 호가 폴링, 체결 폴링.
- 비-라이브(게이팅 안 함): 순매수 **7일 누적**(KV 스냅샷), 지수 스트립(종가), 상세 정적 필드.
- 게이팅 레벨: **클라 훅/컴포넌트 `enabled`·`refetchInterval`**(호출 자체를 안 하게)이 1차. route handler 는 무변경(mock 폴백·시그니처 보존, AC-13).
- 마감 안내 데이터: `nextOpen: {date, time}|null`(②). null(unknown)이면 안내 최소화(장중 취급이라 애초에 안내 경로 미도달).

## 7. 가정 · 제약 · 참고

- 선행: ②(`toss-market-calendar`) 머지 완료 — `useMarketStatus`·`MarketStatus`·`isRegularOpen`(fail-open)·`marketClock`·`MarketStatusBadge`·`lib/copy/market/marketStatus.ts` 가 이미 main 에 존재(확인: `hooks/market/useMarketStatus.ts`·`lib/types/market/marketStatus.ts`·`lib/market/marketClock.ts`). ①/③(호가·체결) 머지 완료(폴링 게이트가 휴리스틱으로 동작 중).
- prod 는 TOSS env 미설정 → 캘린더 `phase="unknown"` → `isRegularOpen=true`(fail-open). **prod 배포 즉시엔 마감 게이팅이 동작 안 하고 기존 에러 카드 유지**(무회귀). 활성화는 TOSS 키 등록만으로(마감 게이팅 자동 발동) — `MARKET_DATA_SOURCE` 와 독립(`isTossConfigured` 게이트).
  - → **본 기능의 실제 효과(에러 카드 제거)는 TOSS 키 등록 후 발현**. 키 전엔 fail-open 으로 현행 유지 = 안전. 이 점을 PR 본문·HANDOFF 에 명시.
- fail-open 규약(핵심): `isRegularOpen` 은 캘린더 실패 시 `true`. 게이트를 여기 커플링해도 "캘린더 실패 → 장중 오정지" 가 발생하지 않는다. 반대로 마감 안내는 `!isRegularOpen`(명시적 false, 즉 캘린더 성공 + 실제 마감)에서만 노출되므로 unknown 에선 안 뜬다 — 의도된 비대칭(안내는 확신할 때만, 폴링은 의심스러우면 계속).
- grace 윈도우: 호가·체결 폴링을 `isRegularOpen`(엄격 15:30)로 스왑하면 기존 `WithCloseGrace`(15:40)의 10분이 사라짐. §3-3·§9 q5 참조(수용 or 대안).
- 참고 파일: `components/home/RealtimeRankingSection.tsx`·`components/flow/InvestorFlowTop10Card.tsx`(마감 게이팅 대상), `hooks/market/useQueryVolumeRank.ts`·`useQueryFluctuation.ts`·`hooks/flow/useQueryFlowTop10.ts`(`enabled` 옵션 이미 존재 — 배선만), `hooks/stock/useQueryStockOrderbook.ts`·`useQueryStockTrades.ts`·`components/stock/OrderbookPanel.tsx`·`TradeStrengthPanel.tsx`(폴링 스왑), `hooks/market/useMarketStatus.ts`·`lib/types/market/marketStatus.ts`(원천), `lib/copy/home/marketOverview.ts`·`lib/copy/flow/labels.ts`·`lib/copy/market/marketStatus.ts`(카피), `docs/rules/frontend.md`.

## 8. 영향 분석

- **변경 라인 추정**: 컴포넌트 2(순위·순매수) 게이팅 배선 + 폴링 훅 2 + 패널 2 스왑 + 공용 마감 UI 1(+카피). 대략 120~220 라인. 대부분 `enabled`/`refetchInterval` 한 줄 배선 + 안내 UI 1개 → 회귀면적 작음. route handler 무변경(AC-13).
- **커밋 분할 권고**: (a) 마감 게이팅 로직 — 실시간 순위·순매수 당일 `enabled` 배선 + 넛지, (b) 공용 마감 상태 UI + 카피(디자이너 DESIGN.md 커밋은 색 신규 시 이 앞에 선행; 재사용 토큰이면 무변경), (c) 호가·체결 폴링 스왑 + 패널 라벨 정합. 각 커밋 독립 검증 가능.
- **폴링 게이팅 In 결정(q3)**: ②/③ PM 은 "후속 일괄" 로 뒀으나, 본 PR 이 이미 `useMarketStatus` 소비처를 여는 소비처 PR 이라 **같은 맥락에서 얇게 회수(In)** 가 응집도 높다. 회귀 위험은 **fail-open 이 흡수**(AC-8). 대상을 ①/③ 산출물 2훅 + 2패널로 **한정**해 회귀면 최소화(warnings·분봉·스케줄러는 Out). 근거: (1) fail-open 으로 "캘린더 실패 → 오정지" 새 실패모드 차단, (2) 방금 머지된 훅이지만 변경이 게이트 한 줄이라 표면 작음, (3) 패널 `closed` 라벨과 폴링 게이트를 같은 기준으로 묶어 어긋남 방지.
- **grace 윈도우 회귀(경미)**: §3-3. 15:30~15:40 10분 폴링 손실. 마감 후 호가 정지는 정상 동작이라 수용. 대안(§9 q5)은 복잡도 대비 이득 낮음.
- **prod dormant(무회귀)**: TOSS 키 전엔 fail-open 으로 현행 유지 → prod 즉시 무변화. 실효는 키 등록 후. → 배포 리스크 낮음(회귀 없이 dormant), QA 는 로컬에서 캘린더 모킹으로 마감 경로 검증.
- **회귀 위험 낮음**: 라우트·타입·mock 무변경, 순수 클라 게이팅. 유일 실질 편집 = 컴포넌트 2 + 훅 2 + 패널 2 + 안내 UI 1. `enabled` 옵션은 세 훅 모두 이미 존재(배선만).

## 9. OPEN QUESTION

- **[OPEN QUESTION] q1. 실시간 순위 마감 시 — 단순 안내 vs 직전 세션 스냅샷.** **PM 권고: 단순 안내로 시작(§3-1 (a)).** 근거: `volume-rank`·`fluctuation` 은 라이브 TR 이라 "장 종료 기준 종가 랭킹 스냅샷" 데이터 소스가 현재 없다(신규 KV 적재·집계 필요 = 별 PRD). 단순 "장 마감 · 다음 개장" 안내가 즉시 에러 카드를 제거하고 정보 정직성도 유지. 스냅샷은 데이터 가용성 확인 후 후속.
- **[OPEN QUESTION] q2. 순매수 당일 마감 시 — (a) 안내 / (b) 직전거래일 폴백 / (c) 7일누적 자동전환.** **PM 권고: (a) 안내 + 소프트 넛지(§3-2).** 마감 시 당일 탭은 "장 마감 · 실시간 순매수는 장중 제공 · 다음 개장 …" 안내(KIS 무호출), 실시간 순위와 톤·컴포넌트 공유. 추가로 **마운트 시 마감이면 토글 초기값을 `cumulative` 로**(자동 강제 전환 아님 — 사용자 선택 존중, 데이터 있는 탭 착지). (b) 기각 = 직전거래일 순매수 소스 없음(BE 신규 필요). (c) 강제 전환 기각 = 명시 선택 몰래 변경은 놀람·지표 성격 상이. → **넛지의 UX 수용 여부만 디자이너 확인**(초기 state 만 바꾸는 저위험).
- **[OPEN QUESTION] q3. 호가·체결 폴링 게이팅을 본 PR 에 포함할지 + fail-open 정책.** **PM 권고: In(포함) + fail-open 유지(§3-3·§8).** 대상은 ①/③ 산출물(`useQueryStockOrderbook`·`useQueryStockTrades`)과 패널 2(`OrderbookPanel`·`TradeStrengthPanel`)로 한정. 휴리스틱 → `isRegularOpen`(공휴일 인지) 스왑, `unknown→true` fail-open 으로 "캘린더 실패 → 장중 오정지" 차단(AC-8). warnings·분봉·스케줄러는 Out(회귀면 큼, 후속). — 사용자가 "호가·체결도 이번엔 건드리지 말고 순수 홈만" 을 원하면 §3-3 을 Out 으로 빼고 순위·순매수 게이팅만 In 으로 축소 가능(close call, 이 경우 커밋 (c) 삭제).
- **[OPEN QUESTION] q4. 공용 "장 마감" 상태 UI — 신규 컴포넌트 vs 기존 empty-state 확장.** **PM 권고: 신규 공용 컴포넌트(§3-4 (A), 예 `MarketClosedNotice`).** 실시간 순위·순매수 당일(+향후 라이브 섹션)이 재사용, ②의 `MarketStatusBadge`·`nextOpen` 카피와 톤 일원화. empty-state 확장(B)은 섹션별 중복·톤 분산 우려. **UX 디자이너 최종 결정**(형태·아이콘·다음 개장 표기 밀도) — 결정 전까지 데이터 배선(`useMarketStatus().nextOpen` 소비)까지 만들고 최종 시각은 확정 후 같은 브랜치 커밋.
- **[OPEN QUESTION] q5. phase 세분(장전 pre·시간외 after) 노출 + grace 윈도우.** **PM 권고: `isRegularOpen`(정규장) 기준 단순화 — 장전·시간외도 "마감" 취급.** 근거: 실시간 순위·순매수 라이브 TR 이 장전/시간외에 유효 데이터를 주는지 미확인(실측 필요) → 정규장만 라이브로 간주가 안전. grace 윈도우(15:30~15:40 10분)는 폴링 스왑 시 사라지나 **수용**(마감 후 호가 정지는 정상). grace 보존이 꼭 필요하면 대안 = 폴링 게이트를 `isRegularOpen || phase==="after"` 로 열되 after 를 15:40 까지만 제한하는 헬퍼 추가 — **복잡도 대비 이득 낮아 비권장**. 장전/시간외 랭킹 데이터 유무는 실측 후 별도 판단(백로그).
