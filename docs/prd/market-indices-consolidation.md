# PRD — 시장 종합 홈 국내지수 중복 호출 통합·중복제거 (market-indices-consolidation)

> 상태: impl-ready (OPEN QUESTION 전부 RESOLVED 2026-05-30) · 작성 2026-05-30
> UI 변경: **거의 없음** (데이터 계층/훅 위주, 화면 출력 동일성 유지). UX/UI 디자이너 합류 **불요**.
> 단일 PR.

---

## 1. 배경 / 문제

시장 종합 홈(`/`) 랜딩(`MarketOverviewPage`)이 **국내 지수를 세 경로로 따로 호출**한다. 콜드 진입 시 KIS 초당 호출 제한(EGW00201)에 근접하고, 같은 데이터(코스피/코스닥)를 중복으로 긁는다.

코드로 확인한 현황(2026-05-30, rate-limit 재점검 결과 본 트랙 활성 최우선):

| # | 경로 | 훅 / 라우트 | KIS 호출 | 보호 장치 |
|---|------|------------|----------|-----------|
| 1 | 헤더 티커 | `useQueryMarketTicker` → `/api/market/ticker` | 코스피·코스닥·SPX·COMP (4) | **있음** — 2개씩 청크 + 청크 지연 120ms + 소스별 in-memory TTL(국내 30s/해외 10분/BTC 3분) |
| 2 | 주요지수 카드 | `IndicesCardContainer`(codes 미지정 → `DEFAULT_INDEX_CODES`) → `useQueryIndices(['0001','1001','2001'])` → `/api/market/indices` | 코스피·코스닥·코스피200 (3) | **없음** — `Promise.allSettled` 동시 난사, 청크/서버캐시 0 |
| 3 | 공포·탐욕 | `FearGreedContainer` → `useQueryIndices(['0001'])` → `/api/market/indices?codes=0001` | 코스피 (1) — breadth `advances/declines` 산출 | (2)와 동일 라우트, 무보호 |

문제의 두 축:

- **클라 dedup 부재**: `queryKeys.market.indices(codes)` 는 `normalizeTickers(codes)`(`sort().join(",")`) 로 키를 만든다. 따라서 `['0001']` → `"market,indices,0001"` 와 `['0001','1001','2001']` → `"market,indices,0001,1001,2001"` 는 **서로 다른 캐시 키**다. 홈에서 카드(2)와 공포·탐욕(3)이 동시에 마운트되지만 React Query dedup이 일어나지 않아 코스피를 **카드용 1콜 + 공포탐욕용 1콜** 두 번 받는다.
- **indices 라우트 무보호**: `/api/market/indices` 는 `app/api/market/ticker/route.ts` 가 이미 정착시킨 청크+서버 TTL 캐시 패턴을 안 쓴다. codes 전부를 동시 난사한다.

결과적으로 콜드 진입 시 **코스피 ×3**(헤더+카드+공포탐욕), **코스닥 ×2**(헤더+카드)가 거의 동시에 KIS로 나간다. 세 경로가 queryKey/서버캐시를 공유하지 않는다.

> 비즈니스 가치: prod 단일 실전계좌(72245021) 토큰으로 모든 KIS 호출이 나가므로, EGW00201 1회 발생 시 홈 전체가 mock degrade로 떨어진다(콜드스타트 SPX drop 사례 기록 있음). 호출 수 절감은 가장 눈에 띄는 콜드 진입 품질 개선이며, 추가 인프라(토큰 store 등) 없이 클라/라우트 레이어만으로 큰 폭 절감이 가능하다.

---

## 2. 목표 (측정 가능)

- G1 — 홈(`/`) 콜드 진입 시 `/api/market/indices` 로의 **브라우저 요청이 1건**으로 수렴(현재 카드 1 + 공포탐욕 1 = 2건). 공포·탐욕이 카드와 동일 쿼리를 공유.
- G2 — `/api/market/indices` 라우트가 단일 인스턴스 warm 상태에서 같은 codes 재요청 시 **TTL(30s) 내 KIS 실호출 0건**(서버 in-memory 캐시 적중).
- G3 — `/api/market/indices` 라우트가 codes 다수일 때 **2개씩 청크 + 청크 간 지연**으로 호출(동시 난사 제거). `/api/market/ticker` 와 동일한 EGW00201 회피 패턴.
- G4 — 공포·탐욕 게이지·snapshot, 주요지수 카드의 **화면 출력이 무회귀**(값·등락·breadth 동일). mock fallback 경로도 동일.
- G5 — 기존 테스트(`app/api/market/indices/__tests__/route.test.ts`, `lib/api/market/__tests__/indices.test.ts`, `lib/api/kis/__tests__/index-price.mappers.test.ts`) `npm run test` green + `npm run lint` + `npm run typecheck` 통과.

---

## 3. 범위 (In scope)

### 3.1 클라 dedup — 공포·탐욕 ↔ 지수카드 쿼리 공유 (G1, 핵심)

- `FearGreedContainer` 가 `useQueryIndices(['0001'])` 대신 **지수카드와 동일한 쿼리**(`useQueryIndices(DEFAULT_INDEX_CODES)`, 즉 `['0001','1001','2001']`)를 구독하도록 변경한다. queryKey가 동일해지므로 React Query가 홈 마운트 시 단일 fetch로 dedup한다(결정적).
- 공포·탐욕은 결과 배열에서 **컨테이너 내부에서 KOSPI(`data?.find(q => q.code === '0001')`)를 골라** breadth(`advances`/`declines`)를 산출한다. 현재 `data?.[0]` 로 첫 원소를 쓰는 가정을 **code 기준 명시적 선택**으로 바꾼다(공유 쿼리에서는 순서가 0001 보장이 약하므로 안전하게 code 매칭). `useQueryIndices`에 selector 옵션을 추가하지 않는다 — queryKey 동일/select만 다른 경우 dedup이 깨지지 않게 신경 쓸 부담을 피하고 인터페이스를 좁게 유지(§9 q5 RESOLVED). 재사용 수요가 생기면 후속에서 훅 selector로 승격.
  - breadth 공식·label 매핑은 현행 유지: `total = advances + declines; value = total>0 ? round(100*advances/total) : 50`, 0-24 EXTREME_FEAR / 25-44 FEAR / 45-55 NEUTRAL / 56-75 GREED / 76-100 EXTREME_GREED.
  - KOSPI 미존재(부분 실패) 시 현행과 동일하게 기본값(value=50, NEUTRAL, snapshot up/down=0)으로 fallback.
- 컨벤션 준수(`docs/rules/frontend.md` §1): 화면 컴포넌트는 `useQuery` 직접 import 금지, `useQueryIndices` 도메인 훅만 소비. KOSPI 선택(`find`) 로직은 **컨테이너 내부**에 둔다(§9 q5 RESOLVED).

### 3.2 indices 라우트 하드닝 — 청크 + 서버 TTL 캐시 (G2, G3)

- `app/api/market/indices/route.ts` 에 `app/api/market/ticker/route.ts` 가 검증한 패턴을 이식한다:
  - **2개씩 청크 + 청크 간 지연**으로 `fetchIndexPrice(code)` 호출(EGW00201 회피). `KIS_CHUNK_SIZE=2`, 청크 지연 상수는 ticker 라우트(`120ms`)와 정합.
  - **모듈 레벨 in-memory TTL 캐시**(`Map<code, {value, expiresAt}>`). 캐시 적중 code는 실호출 없이 즉시 반영, 미스 code만 청크 대상. TTL은 국내 지수 **30s 확정**(ticker 라우트 국내분·`queryConfig.market.indices.staleTime` 정합, §9 q3 RESOLVED).
  - **테스트 전용 캐시 리셋** 함수(`resetIndicesCacheForTest`) 노출(ticker 라우트의 `resetTickerCacheForTest` 선례).
- 기존 동작은 보존한다: 이중 게이트(`isKisConfigured()` AND `resolveKisEnv()==='prod'`), `Promise.allSettled` 부분 성공, 5s 타임아웃, `X-Data-Source`/`X-KIS-Env` 헤더, `Cache-Control: no-store`(브라우저 캐시는 그대로 막고 서버 in-memory만 캐시), 전부 실패 시 `__ALL_FAILED__` 502, 타임아웃 시 mock-timeout fallback.
- 헤더 응답은 그대로 둔다. 서버캐시 적중 여부를 알리는 디버깅 헤더(`X-Cache: hit/miss`)는 **선택(필수 아님)** — 추가하더라도 `X-Data-Source` 의미는 불변(§9 q3 RESOLVED).

### 3.3 회귀 가드

- 공포·탐욕 breadth 계산이 공유 쿼리에서도 동일 결과를 내는지 컨테이너/유닛 레벨로 검증(KOSPI 선택 selector + 부분 실패 fallback).
- indices 라우트 신규 동작(청크/캐시/캐시리셋)에 대한 테스트를 기존 `route.test.ts` 에 보강. 기존 단언(이중 게이트, 부분 성공, 타임아웃, 502)을 깨지 않는다.

### 3.4 문서

- `lib/query/queryConfig.ts` 의 `market.indices` 코멘트(단일 진실 원천)와 어긋나지 않게, 라우트 서버캐시 TTL 30s의 근거를 라우트 파일 헤더 주석에 명시(코드 hex/px 직타 룰과 무관, 주석만).

---

## 4. 비범위 (Out of scope)

- **헤더 티커(`/api/market/ticker`)와 indices 라우트의 국내지수 통합**(§9 q1 RESOLVED — 후속 별도 PRD). 응답 shape(`MarketTicker` 표시 문자열 vs `MarketIndexQuote` 수치 모델)과 용도(거시 표시 vs breadth/카드)가 달라 통합 비용이 크다. 본 트랙은 **클라 dedup + indices 라우트 하드닝만** 수행하고, 헤더↔indices 국내지수 통합은 별도 PRD로 분리한다.
- **소스 레벨 `fetchIndexPrice` 인메모리 캐시(+single-flight)**(§9 q2 RESOLVED — B(KIS 토큰 store) 트랙과 함께, 후속). 헤더 라우트와 indices 라우트가 같은 인스턴스일 때만 완전 dedup이며, serverless 인스턴스 분산 시 한계는 토큰 store와 동일 → 같은 분산 캐시/store 인프라로 한 번에 푸는 게 합리적. 본 트랙은 **라우트 단위 in-memory 캐시까지만**.
- 폴링/실시간 갱신 도입(현행 staleTime 30s + 수동 새로고침 유지).
- 공포·탐욕 게이지/지수카드의 **시각 디자인 변경**(레이아웃·색·카피 0건). 데이터 소스만 바꾼다.
- `queryKeys` 구조 개편(정규화 방식·factory 시그니처 변경). 본 트랙은 기존 키 factory를 그대로 쓰되 **호출 인자(codes)만 통일**한다.
- Redis/외부 KV 등 분산 캐시 도입.

---

## 5. 수용 기준 (AC)

각 항목은 재현 가능한 명령/검증 단위로 떨어진다.

- **AC-1 (G1·클라 dedup)** — `git grep -n "useQueryIndices" components/home/FearGreedContainer.tsx` 결과, 공포·탐욕이 `['0001']` 단독이 아니라 **지수카드와 동일한 codes**(`DEFAULT_INDEX_CODES`)를 인자로 호출한다. `git grep -n "KOSPI_CODE\|\['0001'\]" components/home/FearGreedContainer.tsx` 가 **0건**(단독 KOSPI 쿼리 제거됨).
- **AC-2 (G1·dedup 동작)** — 홈(`/`) 콜드 로드 시 브라우저 Network 탭에서 `/api/market/indices` 요청이 **정확히 1건**(공포탐욕+카드 합산). 동일 codes·동일 queryKey이므로 React Query가 in-flight를 dedup. (검증: dev 서버 + 네트워크 패널, 또는 `useQueryIndices` queryKey가 두 컨테이너에서 동일함을 코드 리뷰로 확인.)
- **AC-3 (G3·청크)** — `git grep -n "CHUNK\|allSettled\|delay" app/api/market/indices/route.ts` 결과, 청크 크기 상수(2)와 청크 간 지연이 존재. codes 4개 이상 시 동시 호출이 2개로 제한됨이 코드/테스트로 검증.
- **AC-4 (G2·서버캐시)** — `git grep -n "Map\|expiresAt\|TTL\|Cache" app/api/market/indices/route.ts` 결과, 모듈 레벨 in-memory TTL 캐시 존재. route.test.ts에 "동일 codes 재요청 시 TTL 내 `fetchIndexPrice` 호출 횟수가 증가하지 않는다"는 단언이 있고 `npm run test` green. `resetIndicesCacheForTest` export 존재(`git grep -n "resetIndicesCacheForTest" app/api/market/indices/route.ts`).
- **AC-5 (G4·breadth 무회귀)** — 공포·탐욕이 KOSPI(`code==='0001'`)를 명시적으로 선택해 breadth를 산출한다(`git grep -n "0001\|advances\|declines" components/home/FearGreedContainer.tsx`). 동일 mock/실데이터 입력에서 value·label·snapshot이 변경 전과 동일(유닛/컴포넌트 테스트 또는 수동 확인).
- **AC-6 (G4·fallback)** — KOSPI 부분 실패(공유 쿼리에서 0001 누락) 시 공포·탐욕이 기본값(value=50, NEUTRAL, up/down=0)으로 fallback. mock 게이트(`resolveKisEnv()!=='prod'`) 경로에서도 화면이 끊기지 않음.
- **AC-7 (회귀·기존 동작)** — indices 라우트의 이중 게이트·부분 성공·5s 타임아웃·`X-Data-Source`/`X-KIS-Env`·502 `__ALL_FAILED__`·mock-timeout 동작이 기존 `route.test.ts` 단언을 모두 통과(`npm run test`).
- **AC-8 (품질 게이트)** — `npm run lint`, `npm run typecheck`, `npm run test` 모두 통과. 화면 컴포넌트가 `@tanstack/react-query` 를 직접 import 하지 않음(`git grep -n "@tanstack/react-query" components/home/FearGreedContainer.tsx components/market/IndicesCardContainer.tsx` 0건).

---

## 6. 가정 · 제약

- **BE LIVE 가정**: KIS `inquire-index-price`(FHPUP02100000)는 prod 전용(모의 vts 미지원). 이중 게이트는 현행 그대로 유지. mock fallback 경로 동작 전제.
- **서버 in-memory 캐시 한계**: Vercel serverless 인스턴스가 분산되면 모듈 레벨 캐시가 인스턴스마다 따로 산다. ticker 라우트도 같은 한계를 안고 있으며, 본 트랙은 단일 warm 인스턴스 기준 절감을 목표로 한다(완전 dedup이 필요하면 B 토큰 store 트랙). 이 한계는 G2 측정 시 "단일 인스턴스 warm 상태"로 한정.
- **선행 전제**: `home-market-redesign` PR2(시장 종합 홈 + nav 재편) 머지됨(현 main 26ca5e8). 본 트랙은 그 위에서 시작.
- **queryKey 정규화 가정**: `queryKeys.market.indices` 의 `normalizeTickers`(sort+join)는 그대로 유지. 두 컨테이너가 **동일 codes 배열**을 넘기면 키가 일치한다는 사실에 의존.
- **breadth 데이터 가정**: `advances`/`declines`/`unchanged` 는 KOSPI(0001) output에만 의미 있게 채워진다(`mappers.ts mapIndexPrice`). 코스닥/코스피200도 공유 쿼리로 받지만 공포·탐욕은 0001만 사용 → 잉여 필드 수신은 미미(같은 응답 배열 안, 추가 호출 0).
- **도구 가정**: Next.js App Router, TanStack Query v5, axios httpClient, vitest. ticker 라우트(`app/api/market/ticker/route.ts`)가 청크+TTL 캐시의 참조 구현.
- **TTL 정합**: 라우트 서버캐시 30s는 `queryConfig.market.indices.staleTime`(30s) 및 ticker 라우트 국내분(30s)과 동일. 단일 진실 원천 충돌 없음.

---

## 7. 참고

- 라우트: `app/api/market/indices/route.ts`(대상), `app/api/market/ticker/route.ts`(청크+TTL 캐시 참조 구현 — 청크 2/지연 120ms/소스별 TTL/`resetTickerCacheForTest`).
- 훅·어댑터: `hooks/market/useQueryIndices.ts`, `lib/api/market/indices.ts`(`DEFAULT_INDEX_CODES` 단일 진실), `hooks/query/queryKeys.ts`(`market.indices` factory + `normalizeTickers`), `lib/query/queryConfig.ts`(`market.indices` TTL 30s 코멘트).
- 컴포넌트: `components/home/FearGreedContainer.tsx`(대상), `components/market/IndicesCardContainer.tsx`(공유 쿼리 상대), `components/home/MarketOverviewPage.tsx`(홈 마운트 트리), `app/(main)/page.tsx`(루트 → MarketOverviewPage).
- 소스·매핑: `lib/api/kis/index-price.ts`(`fetchIndexPrice`), `lib/api/kis/mappers.ts`(`mapIndexPrice` — breadth 필드 `ascn_issu_cnt`/`down_issu_cnt`/`stnr_issu_cnt`).
- 테스트: `app/api/market/indices/__tests__/route.test.ts`, `lib/api/market/__tests__/indices.test.ts`, `lib/api/kis/__tests__/index-price.mappers.test.ts`.
- 컨벤션: `docs/rules/frontend.md` §1(커스텀훅 의무화) / §7(queryKey 단일 위치). `AGENTS.md` BFF 원칙.
- 기억: KIS API 컨벤션(EGW00201 회피, prod 안전장치), 미룬 후속(intstock_multprice 일괄 최적화 — watchlist는 이미 처리, 본 트랙은 indices 차례).

---

## 8. 영향 분석 (Impact)

### 변경 라인 추정

| 파일 | 성격 | 추정 |
|------|------|------|
| `app/api/market/indices/route.ts` | 청크 헬퍼 + 모듈 캐시 + 캐시리셋 추가 (ticker 라우트 패턴 이식) | +60~90 |
| `components/home/FearGreedContainer.tsx` | codes 통일 + KOSPI code-매칭 `find` (컨테이너 내부) | ~15~25 (순증 미미) |
| `hooks/market/useQueryIndices.ts` | **변경 없음** (§9 q5 RESOLVED — selector 옵션 미추가) | 0 |
| `app/api/market/indices/__tests__/route.test.ts` | 청크/캐시/캐시리셋 단언 보강 | +40~70 |
| 공포·탐욕 유닛/컴포넌트 테스트(신규 또는 보강) | breadth 선택·fallback | +30~50 |

→ 합계 대략 +150~250 라인. **단일 PR 적정**(디자이너 의존 없음, 한 도메인 응집).

### 커밋 분할 권고 (단일 PR 내부)

1. `refactor(market): indices 라우트 청크+서버 TTL 캐시 이식 (ticker 패턴 정합)` — 라우트 + route.test.ts.
2. `refactor(home): 공포·탐욕 지수카드 공유 쿼리로 통일 + KOSPI code-매칭 selector` — FearGreedContainer + 테스트.
3. (선택) `chore(market): indices TTL 근거 주석 정합` — 주석/코멘트.

> 클라 dedup(2)과 라우트 하드닝(1)은 독립적으로 가치가 있다. 리뷰 부담을 줄이려 커밋을 분리하되 PR은 하나로 묶는다(한 브랜치 한 PR 룰).

### 회귀 위험

- **(중) 공포·탐욕 breadth 출력 변동**: `data?.[0]` → code-매칭으로 바꿀 때 KOSPI를 못 고르면 항상 NEUTRAL로 떨어질 수 있다. 공유 쿼리에서 0001이 부분 실패로 누락되는 케이스를 AC-6에서 명시 검증.
- **(중) 라우트 캐시 staleness**: 30s TTL 동안 같은 인스턴스가 옛 지수를 반환. queryConfig staleTime과 동일하므로 체감 일관성은 유지되나, 장 마감/급변 시 최대 30s 지연 — 허용 범위로 가정(§6).
- **(저) 테스트 캐시 오염**: 모듈 레벨 캐시가 테스트 간 누수되면 거짓 통과. `resetIndicesCacheForTest`를 `beforeEach`에서 호출(ticker 선례)로 차단 — AC-4.
- **(저) 부분 성공 순서 의존**: assemble 순서가 codes 순서에 의존하지 않는지(카드 grid는 받은 것만 렌더) 기존 단언 유지로 커버.

### 분할 vs 단일 결정

UI 변경 0건 + 단일 도메인(market/home 데이터 계층) + 250라인 이내 → **단일 PR**. 디자이너 합류 트리거 없음.

---

## 9. OPEN QUESTION

> 전 항목 RESOLVED (2026-05-30, 사용자 결정 — PM 권고 전부 채택). 결정 내용은 §3/§4 본문에 반영됨.

- **[RESOLVED] q1 — 헤더 티커 ↔ indices 라우트 국내지수 통합을 이번 트랙에 포함할지?**
  - 결정: **이번 비범위(후속 별도 PRD)**. 응답 shape/용도가 달라(표시 문자열 vs 수치 모델) 통합 비용이 크고, 본 트랙의 클라 dedup + 라우트 하드닝만으로 코스피 ×3→(헤더1 + 홈1), 코스닥 ×2→(헤더1 + 홈1)로 이미 큰 폭 절감. 헤더↔indices 국내지수 통합은 별도 PRD로 분리. (반영: §4)

- **[RESOLVED] q2 — 소스 레벨 `fetchIndexPrice` 캐시(+single-flight)를 이번에 넣을지, B(KIS 토큰 store) 트랙과 함께 묶을지?**
  - 결정: **B(KIS 토큰 store) 트랙과 함께(이번 비범위)**. 소스 캐시는 헤더·indices 라우트를 가로질러 dedup하나 serverless 인스턴스 분산 한계가 토큰 store와 동일해, 둘을 같은 분산 캐시(또는 store) 인프라로 한 번에 푸는 게 합리적. 이번엔 **라우트 단위 in-memory 캐시까지만**. (반영: §4)

- **[RESOLVED] q3 — indices 라우트 서버캐시 TTL을 30s로 확정?(국내 정합)**
  - 결정: **30s 확정**. ticker 라우트 국내분(30s) + `queryConfig.market.indices.staleTime`(30s)와 정합 → 체감 일관성·단일 진실 원천 유지. 부속: 캐시 적중 디버깅 헤더(`X-Cache: hit/miss`)는 **선택(필수 아님)**, 노출 시에도 `X-Data-Source` 의미는 불변. (반영: §3.2)

- **[RESOLVED] q4 — 공포·탐욕이 코스피200/코스닥까지 포함된 공유 쿼리를 받아 잉여 필드를 수신하는데 OK인가?**
  - 결정: **OK(잉여 수신 허용, 추가 KIS 호출 0)**. 같은 응답 배열에 이미 포함되어 추가 KIS 호출 0, 페이로드 증가도 무시 가능. 공포·탐욕은 0001만 selector로 사용. dedup 이득(코스피 추가 1콜 제거)이 잉여 수신 비용을 압도. (반영: §3.1, §6 breadth 데이터 가정)

- **[RESOLVED] q5 — KOSPI selector 로직을 컨테이너에 둘지, `useQueryIndices`에 selector 옵션을 추가할지?**
  - 결정: **컨테이너 내부 단순 find(`data?.find(q => q.code === '0001')`)**. 도메인 훅에 selector 옵션을 추가하면 dedup이 깨지지 않게(queryKey 동일, select만 다름) 신경 써야 하고 인터페이스가 커진다. 컨테이너 find로 단순하게 가고, 재사용 수요가 생기면 후속에서 훅 selector로 승격. (반영: §3.1)

---

산출물: docs/prd/market-indices-consolidation.md | UI: no(거의 없음, 데이터 계층/훅) | OPEN QUESTION: 전부 RESOLVED (5/5)
