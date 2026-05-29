# PRD — 관심종목 시세 일괄조회 전환 (`watchlist-batch-quotes`)

> **UI 포함 여부: yes (경미)** — 재시도 버튼 위치 이동(per-row 제거 → 테이블 상단 단일 "새로고침").
> 신규 토큰·신규 컴포넌트 0, 기존 디자인 토큰만 사용 → **UX/UI 디자이너 합류 트리거 아님**.

---

## 1. 배경 / 문제

관심종목 화면(`/watchlist`)은 PR `#39`(어댑터/훅)·`#40`(PR-C) 그리고 후속 `#44`/`#45` 화면 전환을 거쳐
**실데이터로 동작 중**이다. 현재 BFF(`app/api/watchlist/route.ts`)는 **종목당** 시세(`inquire-price`) +
메타(`search-stock-info`) **2콜**을 합성한다. 즉 N종목이면 **2N 콜**을 동시성 2로 풀링한다.

이 구조에서 두 가지 문제가 **재현 확정**됐다:

1. **초당 호출제한(`EGW00201` "초당 거래건수 초과")으로 일부 종목 시세 실패.**
   현재 코드는 `CONCURRENCY=2` + `withRetry`(transient 1회 재시도) + `X-Watchlist-Failed` 헤더로
   완화하고 있으나, 종목 수가 늘면 2N 콜 자체가 한도를 넘겨 행이 디그레이드(시세 누락)된다.

2. **재시도 UX 가 오해를 부른다.**
   디그레이드 행의 per-row "다시 시도" 버튼(`WatchlistRow` → `onRetry`)이 실제로는
   `query.refetch()`(**전체 재조회**)를 호출한다. 한 행만 재시도한 줄 알지만 이미 성공한 행까지
   다시 그려져 깜박인다(행 단위 개별 조회가 아님).

KIS 는 **관심종목 복수 시세 일괄조회**(`intstock_multprice`, TR_ID `FHKST11300006`)를 제공한다 —
**1콜에 최대 30종목**. 이걸 쓰면 N종목 시세를 **1~2콜**로 줄여 `EGW00201` 을 근본 회피한다.
동시에 종목명은 이미 localStorage(`store {ticker,name}`)에 저장돼 있어 **매 로드 `search-stock-info`
호출이 불필요**하다.

> **실시간 WebSocket(`H0STCNT0` push)** 은 별도 후속 트랙 **`watchlist-realtime-ws`** 의 범위이며
> **본 트랙의 비범위**다. 단, 타당성 리서치(`docs/references/watchlist-realtime-feasibility.md` §A-5,
> 권장 아키텍처 (1)·(4))가 명시하듯 WS 트랙은 **초기 스냅샷 + REST 폴백**으로 `intstock_multprice`
> 를 재사용한다. **본 트랙이 만드는 일괄조회 BFF·매퍼·도메인 모델이 곧 WS 트랙의 스냅샷/폴백
> 인프라가 된다** — 본 PRD 의 산출물 시그니처를 그 재사용을 염두에 두고 설계한다(§3.6).

---

## 2. 목표 (측정 가능)

- **G1.** 관심종목 N종목 시세 조회의 KIS 콜 수를 **2N → ⌈N/30⌉**(30종목 이하면 1콜)로 줄인다.
  로드 시 `search-stock-info` 호출은 **0콜**(종목명은 store/시드 fallback).
- **G2.** 정상 장중 로드에서 `EGW00201` 로 인한 디그레이드 행이 **0건**(테스트·dev 라운드트립으로 확인).
- **G3.** 재시도 버튼은 **테이블 상단 단일 "새로고침" 1개**만 존재한다(per-row 버튼 0개).
  새로고침 시 이전 데이터를 유지해 행이 **사라지거나 빈 스켈레톤으로 깜박이지 않는다**(`placeholderData`).
- **G4.** 기존 화면 회귀 0 — `/watchlist` 표 레이아웃·등락 컬러(한국식 red=up/blue=down)·삭제 버튼·
  좌조인 디그레이드 행·빈 상태·전체 에러 카드 동작 유지.
- **G5.** `X-Data-Source`(kis/mock/mock-timeout)·`X-KIS-Env` 헤더, mock fallback, 5s 타임아웃,
  `Cache-Control: no-store` 컨벤션 유지(기존 route 정합).

---

## 3. 범위 (In scope)

### 3.1 시세 일괄조회 KIS 클라이언트 신설 — `lib/api/kis/intstock-multprice.ts`

- `GET /uapi/domestic-stock/v1/quotations/intstock-multprice`, TR_ID `FHKST11300006`.
- 요청: 종목별 `FID_COND_MRKT_DIV_CODE_<i>`("J")/`FID_INPUT_ISCD_<i>`(6자리 ticker) 쌍을 `_1`~`_30`.
- **30종목 단위 chunk** — 30 초과 입력 시 함수 내부에서 청크 분할·호출(soft cap 30 유지 = 1콜 보장,
  §9 q3 RESOLVED; 단 코드는 30/콜 청크로 N>30 확장 가능하게 작성).
- 응답 매핑은 `mappers.ts` 의 신규 `mapIntstockMultprice`(종목별 `inter2_prpr`/`prdy_ctrt`/
  `prdy_vrss`/`prdy_vrss_sign`/`acml_vol`/`inter2_oprc|hgpr|lwpr` → 기존 `StockPrice` 친화 스키마).
  KIS 응답은 전부 문자열 → 기존 `toNumber`/`mapDirection` 재사용. `bstp_kor_isnm`(업종명) 절대 미사용.
- `price.ts`/`index-price.ts` 의 `buildAuthHeaders`·transport/business 에러 패턴(`makeKisTransportError`/
  `makeKisBusinessError`) 그대로 답습. `index.ts` 배럴에 `fetchIntstockMultprice` + 타입 export 추가.
- 응답 종목별 시세 모델에 **ticker 키**를 포함해 BFF 가 입력 순서로 좌조인할 수 있게 한다.

### 3.2 BFF route 교체 — `app/api/watchlist/route.ts`

- **시세 경로 교체**: 종목당 `fetchStockPrice` N콜(+ 동시성 풀 + `withRetry`) → `fetchIntstockMultprice`
  **1~2콜**. `runWithConcurrency`/`fetchOneQuote`/`withRetry`/`isTransientError`/`fetchWatchlistSettled`
  중 일괄조회로 불필요해지는 헬퍼는 제거(전부 성공/실패 단위가 콜 단위로 바뀜).
- **로드 시 `search-stock-info` 호출 제거**: 종목명은 **BFF 가 받지 않는다**. 종목명/메타는 클라이언트가
  store(`{ticker,name}`) + 시드(symbols.json `getSymbolName`) 로 이미 해결하므로, BFF 응답
  `WatchlistQuote` 의 `name` 은 **일괄응답의 `inter_kor_isnm`(있으면) → 없으면 ticker** 로 채운다.
  클라이언트가 store name 으로 최종 표시명을 덮으므로 BFF name 은 식별 폴백 역할(§3.4 참고).
- **게이트 결정(§9 q1 RESOLVED = 이중 게이트 보수)**: 시세 일괄조회 게이트는 메타와 동일하게
  **이중 게이트**(`isKisConfigured()` AND `resolveKisEnv() === "prod"`). `inquire-index-price`/
  `search-stock-info` 선례 답습. 모의(vts) 검증되면 단일 게이트로 완화하는 **별도 후속 chore**.
- mock fallback(`getMockWatchlist`), `X-Data-Source`/`X-KIS-Env`/`X-Watchlist-Truncated`, 5s 타임아웃,
  4xx 메시지 통과, 5xx/전체실패 한글 fallback, `no-store` — **전부 유지**.
- **soft cap 30 유지(§9 q3 RESOLVED = 1콜 보장)**. cap 위치는 BFF `SOFT_CAP` + `useWatchlistTickers`
  `MAX_TICKERS` 정합 유지. 40(2콜) 확장은 후속 — 코드는 청크 분할로 확장 가능하게 작성(§3.1).

### 3.3 BFF 응답 TTL / 캐시 — 변경 최소

- **`queryConfig.watchlist.list` staleTime 10s → 30s 상향(§9 q5 RESOLVED)**, gcTime 5min 유지.
  지수(`market.indices`)가 rate-limit 보호로 30s 인 선례. 일괄 1콜이라 30s 면 초당 한도 여유 충분.
- `queryKeys.watchlist.list(tickers)`·`queryKeys.watchlist.info` 키 시그니처 **불변**(회귀 0).

### 3.4 재시도 UX 수정 (UI)

- **per-row "다시 시도" 제거**: `WatchlistRow` 디그레이드 분기의 `onRetry` 버튼 + `onRetry` prop 제거.
  디그레이드 행은 "시세를 불러오지 못했어요" 안내 + 삭제 버튼만 남긴다(행 클릭 라우팅 차단 유지).
- **상단 단일 "새로고침"**: `WatchlistPage` 헤더(또는 표 상단)에 새로고침 버튼 1개. `query.refetch()`
  호출. 전체 재조회이므로 의미가 명확해진다(per-row 였던 오해 제거).
- **깜박임 완화**: `useQueryWatchlist` 에 `placeholderData: keepPreviousData`(TanStack v5) 추가 →
  refetch 중에도 이전 데이터 유지, 빈 스켈레톤 깜박임 제거. 새로고침 진행 표시는 버튼 비활성/스피너
  (`query.isFetching`) 로. `WatchlistContainer` 의 `showSkeleton`/`showError` 분기 정합 유지.
- copy(`lib/copy/watchlist/labels.ts`): `WATCHLIST_ROW_RETRY`/`WATCHLIST_ROW_RETRYING` 제거 또는
  신규 `WATCHLIST_REFRESH`("새로고침") 추가. 기존 한글 카피 톤 유지.

### 3.5 부분실패 / 디그레이드 행

- 일괄 1콜이면 보통 **전부 성공 or 전체 실패**. 2콜(청크 2개)이면 청크 단위 부분 성공 가능 →
  `Promise.allSettled` 로 청크별 결과를 모으고 성공 종목만 합친다(indices route 의 settled 패턴 참고).
- 일괄 응답에 **일부 ticker 누락** 가능성 대비: 기존 **좌조인 디그레이드 행 유지**(`WatchlistTable`/
  `WatchlistContainer` 가 사용자 `tickers` 기준 렌더, quote 없으면 디그레이드). 이름은 store/시드.
- **전체 실패**: 카드형 에러 + 상단 새로고침(기존 `showError` 분기 유지). `X-Watchlist-Failed` 헤더는
  유지(누락 ticker 노출) — 단 프론트의 per-row 재시도가 사라지므로 진단/로그 용도로 의미 축소.

### 3.6 WS 트랙 재사용 계약 (명시)

- 본 트랙 산출물 `fetchIntstockMultprice` + `mapIntstockMultprice` + `WatchlistQuote` 모델은
  `watchlist-realtime-ws` 트랙의 **초기 스냅샷 + REST 폴백**에 그대로 재사용된다(리서치 §C·권장
  아키텍처 (1)/(4)). 따라서 시세 모델은 WS `H0STCNT0` 필드(현재가/등락/등락률/거래량)와 **매핑 가능한
  공통 부분집합**(price/change/changePercent/direction/volume)을 정규 스키마로 유지한다.
- 본 트랙은 폴링/WS 를 도입하지 **않는다** — TanStack Query 의 staleTime 기반 재조회 + 수동 새로고침만.

---

## 4. 비범위 (Out of scope)

- **WebSocket 실시간 push**(`H0STCNT0`), 상주 중계 서버, SSE 중계, approval_key — 전부 `watchlist-realtime-ws`.
- **REST 자동 폴링**(setInterval/refetchInterval) — 본 트랙은 staleTime + 수동 새로고침까지만.
- **진짜 per-row 개별 시세 조회** — 일괄조회로 대체. 개별 조회는 WS 트랙에서.
- **거래정지/관리종목 배지** — §9 q2 RESOLVED = **일시 보류(미표시)**. 본 트랙이 로드 경로의
  `search-stock-info` 호출을 제거하므로 배지 데이터 소스가 사라진다. 배지 위해 신규 호출 추가 금지.
  배지 복원은 **별도 후속 트랙**(지연로드: 보임 종목만 per-row 조회 / or 일괄응답 동등 필드 검증). 현재
  화면 배지는 옵셔널 필드라 미표시 시 회귀 0.
- 관심종목 그룹(`intstock_grouplist`/`intstock_stocklist_by_group`), 호가창, 차트 — 미도입.
- 종목 추가 모달(`WatchlistAddModal`)·검색(`search`)·영구화(`store.ts`/`useWatchlistTickers`) 로직 변경 없음
  (저장 모델 `{ticker,name}` 그대로 소비만).
- 주문/매매 API — 영구 부재(`lib/api/kis/index.ts` 다중 게이트).

---

## 5. 수용 기준 (AC) — 검증 가능

- **AC-1 (콜 수 급감).** `app/api/watchlist/route.ts` 에서 `fetchStockPrice` 반복 호출이 사라지고
  `fetchIntstockMultprice` 를 사용한다.
  `git grep -n "fetchStockPrice" app/api/watchlist/route.ts` → **0건**.
  `git grep -n "fetchIntstockMultprice" app/api/watchlist/route.ts` → **1건 이상**.
- **AC-2 (search-stock-info 제거).** 로드 경로에서 메타 조회가 사라진다.
  `git grep -n "fetchStockInfo\|search-stock-info" app/api/watchlist/route.ts` → **0건**.
- **AC-3 (KIS 클라이언트 신설).** `lib/api/kis/intstock-multprice.ts` 가 존재하고 TR_ID `FHKST11300006`
  + 경로 `intstock-multprice` 를 사용한다.
  `find lib/api/kis -name "intstock-multprice.ts"` → 1건.
  `git grep -n "FHKST11300006" lib/api/kis/intstock-multprice.ts` → 1건 이상.
- **AC-4 (배럴 export).** `git grep -n "fetchIntstockMultprice" lib/api/kis/index.ts` → 1건 이상.
- **AC-5 (매퍼 + 업종명 회귀 차단).** `mappers.ts` 에 `mapIntstockMultprice` 가 있고 `bstp_kor_isnm`
  을 종목명으로 쓰지 않는다.
  `git grep -n "mapIntstockMultprice" lib/api/kis/mappers.ts` → 1건 이상.
  `git grep -n "bstp_kor_isnm" lib/api/kis/intstock-multprice.ts lib/api/kis/mappers.ts` 결과 중
  `mapIntstockMultprice` 가 `bstp_kor_isnm` 을 `name` 에 대입하는 라인 **0건**(코드 리뷰 + 단위 테스트).
- **AC-6 (30종목 chunk).** 31종목 이상 입력 시 `intstock_multprice` 가 30종목 단위로 분할 호출됨을
  단위 테스트로 검증(mock client 호출 횟수 = ⌈N/30⌉). `npm run test` 통과.
- **AC-7 (per-row 재시도 제거).** `WatchlistRow` 에서 per-row 재시도 버튼·`onRetry` prop 이 사라진다.
  `git grep -n "onRetry\|WATCHLIST_ROW_RETRY" components/watchlist/WatchlistRow.tsx` → **0건**.
- **AC-8 (상단 단일 새로고침).** 표 상단에 새로고침 버튼이 정확히 1개 존재하고 `query.refetch()` 를
  호출한다(컴포넌트 코드 + dev 클릭 확인). per-row 버튼 0개.
- **AC-9 (깜박임 완화).** `useQueryWatchlist` 에 `placeholderData`(keepPreviousData)가 적용된다.
  `git grep -n "placeholderData\|keepPreviousData" hooks/watchlist/useQueryWatchlist.ts` → 1건 이상.
  새로고침 중 기존 행이 사라지지 않음(dev 라운드트립 육안 확인).
- **AC-9b (TTL 30s 상향).** `queryConfig.watchlist.list` 의 staleTime 이 30s(30_000) 다(§9 q5 RESOLVED).
  `git grep -n "watchlist" lib/api/queryConfig.ts`(또는 queryConfig 정의 파일)에서 list staleTime 30s 확인.
- **AC-10 (이중 게이트·mock·헤더 유지).** 이중 게이트(`isKisConfigured() && resolveKisEnv()==="prod"`,
  §9 q1 RESOLVED) 미통과 시 `getMockWatchlist` 반환 + `X-Data-Source: mock`. 정상 시 `kis`. 타임아웃 시
  `mock-timeout`. `X-KIS-Env` 항상 존재. `app/api/watchlist/__tests__/route.test.ts` 갱신 케이스
  `npm run test` 통과.
- **AC-11 (좌조인 디그레이드 유지).** 일부 ticker 시세 누락 시 그 행은 store/시드 이름으로 디그레이드
  렌더되고 사라지지 않는다. 전체 실패 시 카드 에러 + 상단 새로고침. 단위/컴포넌트 테스트로 검증.
- **AC-12 (무회귀 게이트).** `npm run lint` && `npm run typecheck` && `npm run test` && `npm run build`
  모두 통과. `/watchlist` dev 라운드트립 양 뷰포트 HTTP 200 + 표 정상 렌더.
- **AC-13 (WS 모델 호환).** `WatchlistQuote`(또는 시세 정규 모델)가 price/change/changePercent/direction/
  volume 공통 필드를 유지해 WS 트랙이 `H0STCNT0` 델타로 갱신 가능(§3.6). PRD 본문 + 타입 주석으로 명시.

---

## 6. 가정 · 제약

- **선행 전제**: `#39`/`#40`(PR-C 어댑터·훅) + `#44`/`#45`(watchlist 화면 실데이터 전환)가 main 머지됨.
  현 코드 상태(BFF 2N콜 + per-row refetch)가 본 PRD 의 출발점.
- **BE LIVE 가정**: 현재 자체호스팅, 실전 키 + `KIS_ENV=prod`(리서치 전제). KIS REST base
  `https://openapi.koreainvestment.com:9443`(prod) / `:29443`(vts). 토큰 발급/single-flight 인프라
  (`token.ts`)·axios 클라이언트(`client.ts`, 5s timeout) 재사용.
- **종목명 소스 확정**: `inquire-price` 의 `hts_kor_isnm` 은 prod 에서도 빈 값 케이스 확인됨(2026-05-29
  SESSION_NOTES). 종목명은 **store `{ticker,name}` → 시드(symbols.json) → ticker** 폴백이 단일 진실.
  본 트랙은 그 결정을 이어받아 BFF 가 종목명 호출을 하지 않는다.
- **도구 가정**: 일괄조회 응답 필드(`inter2_*`)는 리서치 `docs/references/watchlist-realtime-feasibility.md`
  §C-2 표 기준(`chk_intstock_multprice.py` 매핑). 레퍼런스 `domestic-stock-quotations.md` 는 파라미터만
  수집(응답 미수집) → 실호출 시 키 미세차 가능성(구현 시 dev 1회 실응답 확인 권고).
- **컨벤션 제약**: `docs/rules/frontend.md` — 커스텀훅만 소비(컴포넌트 `useQuery` 직접 import 금지),
  도메인 한 뎁스(`lib/api/kis`, `lib/api/watchlist`), `cn` 헬퍼, queryKey 단일 파일, 한글 카피
  `lib/copy/`. BFF 단방향(브라우저 → route → KIS, 직접 호출 금지).
- **단일 PR 룰**: 본 트랙은 **한 브랜치 한 PR**. PRD 는 `feature/watchlist-batch-quotes` 첫 commit
  (`docs(prd): watchlist-batch-quotes`)으로 들어가 최종 PR 1회에 코드와 함께 머지된다.

---

## 7. 참고

- `docs/references/watchlist-realtime-feasibility.md` — §C `intstock_multprice` 요청/응답 표, §A-5
  스냅샷/폴백 필요성, 권장 아키텍처. **WS 트랙 재사용 계약의 근거.**
- `docs/references/kis-api/domestic-stock-quotations.md` §1-5 / §부록 — `intstock_multprice`
  TR_ID·경로·파라미터(응답 필드 미수집, 구현 시 보강).
- 현 코드(교체/제거/유지 대상):
  - 교체: `app/api/watchlist/route.ts`(시세 경로), `hooks/watchlist/useQueryWatchlist.ts`(placeholderData).
  - 신설: `lib/api/kis/intstock-multprice.ts`, `mappers.ts::mapIntstockMultprice`, `types.ts` 응답 타입.
  - UI 수정: `components/watchlist/WatchlistRow.tsx`(per-row 재시도 제거), `WatchlistContainer.tsx`/
    `WatchlistPage.tsx`/`WatchlistTable.tsx`(상단 새로고침 배선), `lib/copy/watchlist/labels.ts`.
  - 유지(무변경): `lib/api/watchlist/store.ts`, `hooks/watchlist/useWatchlistTickers.ts`,
    `WatchlistAddModal.tsx`, `lib/api/kis/search.ts`, `queryKeys.ts` 시그니처.
- 선례 패턴: `app/api/market/indices/route.ts`(일괄+부분성공 settled), `lib/api/kis/index-price.ts`
  (실전 전용 게이트 + buildAuthHeaders).

---

## 8. 영향 분석 (§8)

### 8.1 변경 라인 추정 (단일 PR 적정 규모)

| 영역 | 파일 | 추정 |
|---|---|---|
| KIS 클라이언트 신설 | `lib/api/kis/intstock-multprice.ts` | +120 |
| 응답 타입 | `lib/api/kis/types.ts` | +40 |
| 매퍼 | `lib/api/kis/mappers.ts` | +35 |
| 배럴 export | `lib/api/kis/index.ts` | +3 |
| BFF route 교체 | `app/api/watchlist/route.ts` | -90 / +60 (헬퍼 제거 → 일괄 호출) |
| 훅 placeholderData | `hooks/watchlist/useQueryWatchlist.ts` | +3 |
| UI(재시도 이동) | `WatchlistRow`/`Container`/`Page`/`Table` | -25 / +35 |
| copy | `lib/copy/watchlist/labels.ts` | +2 / -2 |
| 테스트 | route + 신규 클라이언트/매퍼 `__tests__` | +180 |
| 합계(코드+테스트) | | **≈ 450~520 라인** |

→ **단일 PR 적정**. 데이터 계층(KIS/BFF) + 경미한 UI(재시도 이동)가 한 관심사(일괄조회 전환)로 묶이고,
디자이너 의존이 없어 분할 불필요. **분할하지 않는다.**

### 8.2 커밋 분할 권고 (한 PR 내)

1. `docs(prd): watchlist-batch-quotes` — 본 PRD.
2. `feat(kis): intstock-multprice 일괄 시세 클라이언트 + 매퍼 + 타입`.
3. `feat(bff): watchlist route 일괄조회 전환 + search-stock-info 제거`.
4. `feat(watchlist): 재시도 UX 상단 단일 새로고침 + placeholderData`.
5. `test: 일괄조회 chunk / 부분실패 / mock fallback 회귀`.

### 8.3 회귀 위험

- **(중) BFF 응답 스키마 호환** — 클라이언트(`WatchlistQuote`)·테이블 좌조인이 그대로 동작해야 함.
  name/badge 필드 의미가 바뀌므로(메타 미동봉) 타입·테스트로 못박는다.
- **(중) 일괄 응답 필드 키 불일치** — 레퍼런스가 응답 필드를 미수집. 매퍼를 방어적으로(누락 시
  `toNumber` → 0) 작성 + dev 실응답 1회 확인.
- **(저) 배지 회귀** — `search-stock-info` 제거로 거래정지/관리종목 배지 데이터가 사라짐. §9 q2
  RESOLVED = **배지 미표시(보류)** 확정. 화면은 배지 없이도 정상(현재 옵셔널 필드)이라 회귀 0. 배지
  복원은 별도 후속 트랙.
- **(저) cap 정합** — soft cap 30 유지(§9 q3 RESOLVED). 향후 40 확장 시 BFF `SOFT_CAP` 와
  `useWatchlistTickers.MAX_TICKERS` 동기 필요(코드는 청크 분할로 확장 가능하게 작성).

---

## 9. OPEN QUESTION (§9) — 전부 RESOLVED (2026-05-30, PM 권고 채택)

- **[RESOLVED] q1 — `intstock_multprice` 모의(vts) 지원 여부 → 게이트(단일 vs 이중).**
  **결정: 이중 게이트(보수) 채택** — `isKisConfigured() && resolveKisEnv() === "prod"`.
  레퍼런스(`domestic-stock-quotations.md`)는 파라미터만 수집, 모의 지원 명시 없음. 리서치 §C 도 prod
  기준이므로 모의 검증 전까지 보수적으로 prod 전용. (`search-stock-info`/`inquire-index-price` 둘 다
  이중 게이트인 선례와 정합.) 모의(vts)에서 검증되면 단일 게이트(`isKisConfigured()`)로 완화하는
  **별도 후속 chore** 로 분리. → §3.2 게이트 결정 확정 반영.

- **[RESOLVED] q2 — 거래정지/관리종목 배지 처리.**
  **결정: (c) 배지 일시 보류(미표시).** 본 트랙이 로드 경로의 `search-stock-info` 호출을 제거하므로
  배지(`tr_stop_yn`/`admn_item_yn`) 데이터 소스가 사라진다. 배지를 위해 N콜을 되살리면 본 PRD 목표(G1)와
  정면 충돌하므로 미표시한다. 현재 화면 배지는 **옵셔널 필드라 미표시 시 회귀 0**. 배지 복원은
  **별도 후속 트랙**(지연로드: 보임 종목만 per-row `search-stock-info` / or 일괄응답 동등 필드 검증)
  으로 분리 명시. → §4 비범위 + §8.3 회귀 위험 확정 반영.

- **[RESOLVED] q3 — soft cap 30 유지 vs 40(2콜) 허용.**
  **결정: soft cap 30 유지(1콜 보장).** 2콜은 부분성공 복잡도·rate-limit 여지를 늘린다. 단 클라이언트
  코드는 **30/콜 청크 분할로 확장 가능하게 작성**(§3.1) — 40 수요가 실제로 생기면 2콜 + 청크 settled 로
  확장. cap 변경 시 BFF `SOFT_CAP` + `useWatchlistTickers.MAX_TICKERS` 동기 필수. → §3.1/§3.2 확정 반영.

- **[RESOLVED] q4 — 재시도 버튼: 상단 단일 새로고침으로 이동 확정?**
  **결정: 확정 — per-row 재시도 제거, 표 상단 단일 "새로고침" 1개로 이동.** per-row "다시 시도"가 실제
  전체 refetch 라 오해를 부른다(§1). per-row 개별 조회는 WS 트랙으로 분리. 깜박임은 `placeholderData`
  (keepPreviousData)로 완화. UI 변경이나 기존 디자인 토큰만 사용 → **디자이너 미합류**. → §3.4 확정 반영.

- **[RESOLVED] q5 — `queryConfig.watchlist.list` TTL 10s 유지 vs 30s 상향.**
  **결정: 30s 상향.** 일괄 1콜이라 30s 로 올려도 초당 한도 여유 충분. 지수(`market.indices` 30s) 선례 +
  본 트랙은 폴링 없음 → 불필요 재조회 절감. 실시간성은 WS 트랙이 담당. → §3.3 확정 반영.
