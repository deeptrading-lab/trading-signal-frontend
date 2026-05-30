# QA 리포트 — market-indices-consolidation

> 대상 PR: #51 (`feature/market-indices-consolidation`) · PRD: `docs/prd/market-indices-consolidation.md`
> QA 일자: 2026-05-30 · 판정: **PASS** (8/8 AC 통과) · 환경: prod KIS 키 설정(`KIS_ENV=prod`, `.env.local`)
> UI 변경 거의 없음(데이터 계층/훅). 디자이너 산출물 없음 → DESIGN.md 토큰 동기화 검증 비대상.

---

## 1. AC 별 검증

| AC | 내용 | 재현 절차 | 기대 | 실측 | 판정 |
|----|------|-----------|------|------|------|
| AC-1 | 클라 dedup — 공포·탐욕이 `DEFAULT_INDEX_CODES` 사용, 단독 `['0001']` 제거 | `git grep -n "useQueryIndices" / "KOSPI_CODE\|['0001']" components/home/FearGreedContainer.tsx` | useQueryIndices 가 DEFAULT_INDEX_CODES 인자, 단독 KOSPI 0건 | `useQueryIndices(DEFAULT_INDEX_CODES)` (L45), `KOSPI_CODE`/`['0001']` grep **0건**(exit 1) | PASS |
| AC-2 | dedup 동작 — 홈에서 `/api/market/indices` 1건 | queryKey 정규화 동등성 + 코드 리뷰(PRD 인정 경로) | 두 컨테이너 queryKey 동일 → 단일 in-flight | `FearGreed key = ["market","indices","0001,1001,2001"]` = `IndicesCard key`. **DEDUP MATCH: true**. 변경 전 `['0001']` 키는 불일치(별도 2콜) | PASS |
| AC-3 | 청크 — 2개씩 + 청크 지연, in-flight ≤ 2 | `git grep CHUNK\|allSettled\|delay` + 유닛 테스트 | `KIS_CHUNK_SIZE=2`/`KIS_CHUNK_DELAY_MS=120` 존재, 동시 ≤2 | 상수 존재(L39-40), 테스트 `[AC-3] 동시 in-flight 청크(2) 미초과` green (`maxInFlight ≤ 2`, 4콜) | PASS |
| AC-4 | 서버 TTL 캐시 — 동일 codes 재요청 KIS 재호출 0 + `resetIndicesCacheForTest` | `git grep Map\|expiresAt\|TTL\|Cache\|resetIndicesCacheForTest` + 유닛 + 라이브 | 모듈 캐시 존재, hit 시 추가 호출 0, reset export | `indexCache = new Map`(L52), `expiresAt`/`CACHE_TTL_MS=30_000` 존재, `resetIndicesCacheForTest` export(L217). 테스트 `[AC-4] TTL 내 추가 호출 0` + `[AC-4] reset 후 재호출` green | PASS |
| AC-5 | breadth 무회귀 — KOSPI(0001) 명시 선택 | `git grep 0001\|advances\|declines` + 라이브 + 무회귀 대조 | code 매칭 find, value/label/snapshot 동일 | `data?.find(q => q.code === '0001')`(L59). 변경 전 `data?.[0]` 과 결과 동일(0001 이 배열 첫 요소) — 무회귀 확정 | PASS |
| AC-6 | fallback — KOSPI 누락/mock 게이트 시 기본값 | 코드 분기 검토 | value=50/NEUTRAL, up·down=0 | `total>0 ? snapshot : DEFAULT_SNAPSHOT{up:0,down:0}`(L72), `kospi?.advances ?? 0`. KOSPI 누락 시 total=0 → value=50/NEUTRAL fallback. mock 게이트 `resolveKisEnv()!=='prod'` 경로 정상 | PASS |
| AC-7 | 기존 동작 무회귀 — 이중 게이트·부분 성공·5s 타임아웃·헤더·502·mock-timeout | `npm run test` (route.test.ts) | 기존 단언 전부 통과 | route.test.ts 8건 green(기존 4 + 신규 4). `X-Data-Source`/`X-KIS-Env`/502 한글/codes 순서 보존 단언 통과 | PASS |
| AC-8 | 품질 게이트 — lint/typecheck/test + react-query 직접 import 0 | `npm run lint/typecheck/test` + grep | 0 에러, 직접 import 0 | typecheck 0, lint 0, test **153 passed (26 files)**. `@tanstack/react-query` grep 두 컨테이너 **0건** | PASS |

### 자동화 명령·출력 발췌

```
# AC-1
$ git grep -n "KOSPI_CODE\|\['0001'\]" components/home/FearGreedContainer.tsx
(0건, exit 1)

# AC-2 queryKey 정규화 동등성 (normalizeTickers = sort().join(","))
FearGreed key : ["market","indices","0001,1001,2001"]
IndicesCard key: ["market","indices","0001,1001,2001"]
DEDUP MATCH    : true
OLD FearGreed key: ["market","indices","0001"]   (변경 전엔 dedup 안 됨 = 별도 2콜)

# AC-8 품질 게이트
$ npm run typecheck   → 0 에러
$ npm run lint        → 0 에러 (출력 없음)
$ npm run test        → Test Files 26 passed (26) / Tests 153 passed (153)
$ npm run build       → 22/22 페이지 생성, 0 에러
$ git grep -n "@tanstack/react-query" components/home/FearGreedContainer.tsx components/market/IndicesCardContainer.tsx
(0건, exit 1)

# PRD 지정 테스트 3종 (G5)
$ npx vitest run app/api/market/indices lib/api/market lib/api/kis/__tests__/index-price.mappers.test.ts
 ✓ lib/api/market/__tests__/indices.test.ts (3)
 ✓ lib/api/kis/__tests__/index-price.mappers.test.ts (7)
 ✓ app/api/market/indices/__tests__/route.test.ts (8)
 Test Files 3 passed / Tests 18 passed
```

---

## 2. 중점 검증 결과

### dedup (queryKey 정규화 일치) — 확인됨

`queryKeys.market.indices(codes)` 는 `normalizeTickers(codes)`(`slice().sort().join(",")`) 로 키를 만든다.
- `FearGreedContainer`(변경 후) = `useQueryIndices(DEFAULT_INDEX_CODES)` → `["market","indices","0001,1001,2001"]`
- `IndicesCardContainer` = `useQueryIndices(DEFAULT_INDEX_CODES)` → `["market","indices","0001,1001,2001"]`
- 두 키 **완전 일치** → 홈(`MarketOverviewPage` L44/L48 동시 마운트)에서 React Query 가 단일 in-flight 로 dedup.
- 변경 전 공포·탐욕 단독 `['0001']` → `["market","indices","0001"]` 은 카드 키와 불일치(별도 코스피 1콜). 이 별도 호출이 제거됨.

### breadth 무회귀 — 확인됨

`data?.[0]`(변경 전) → `data?.find(q => q.code === '0001')`(변경 후). `DEFAULT_INDEX_CODES = ['0001','1001','2001']` 이고 BFF 가 codes 순서를 보존(route.test.ts 순서보존 단언)하므로 0001 이 배열 첫 요소 = 두 방식 결과 동일. breadth 공식(`value = total>0 ? round(100*advances/total) : 50`)·label 매핑·snapshot fallback 전부 코드 변경 없음.

- 라이브(prod) KOSPI: advances=206, declines=688 → total=894 → value=round(100*206/894)=round(23.04)=23 → EXTREME_FEAR. 게이지·snapshot 정상 산출.
- mock(게이트 미통과): KOSPI advances=612/declines=268 → total=880 → value=70 → GREED. 두 경로 모두 정상.

### indices 라우트 하드닝 — 확인됨

- 청크: `KIS_CHUNK_SIZE=2`, 청크 간 `delay(120ms)`. 마지막 청크 뒤 지연 생략(`i + KIS_CHUNK_SIZE < misses.length` 가드). 유닛 `maxInFlight ≤ 2`.
- 서버 TTL 캐시: code 단위 `Map<code,{value,expiresAt}>`, `CACHE_TTL_MS=30_000`(국내 30s, `queryConfig.market.indices.staleTime`/ticker 국내분 정합). 캐시 적중 code 는 청크 대상에서 제외 → 미스 code 만 실호출.
- `resetIndicesCacheForTest()` export → `beforeEach` 에서 호출로 테스트 간 캐시 격리.

---

## 3. 라이브 라운드트립 (BE LIVE, `KIS_ENV=prod`, dev `localhost:3000`)

> 헤더 티커(`/api/market/ticker`) 200 OK 로 prod KIS 도달 확인 후 진행. 검증 후 dev 서버 종료.

| # | 시나리오 | 명령 | 실측 | 판정 |
|---|---------|------|------|------|
| a | 콜드 호출 (miss) | `GET /api/market/indices?codes=0001,1001,2001` | `200` · `X-Data-Source: kis` · `X-KIS-Env: prod` · `X-Cache: miss` · codes `[0001,1001,2001]` · KOSPI value 8476.15 (advances 206/declines 688). 응답 222ms | PASS |
| b | 즉시 재요청 (hit) | 동일 codes 재호출 | `200` · `X-Cache: hit` · KOSPI value 8476.15 **동일 스냅샷** · 응답 9ms(application-code 3ms) — KIS 재호출 0 | PASS |
| c | 다른 codes 캐시 격리 | `?codes=2002` ×2 | 1차 `X-Cache: miss`, 2차 `X-Cache: hit` — code 단위 캐싱 정상 | PASS |
| d | 부분/혼합 codes | `?codes=0001,9999` | `200` · 0001 cache-hit + 9999 수신. 9999 는 KIS 가 0-fill quote 반환(upstream mapper 동작, 본 PR 범위 밖) | PASS(주의) |
| e | mock fallback 경로 | route.test.ts `키 미설정`/`env!=prod` | `X-Data-Source: mock`, `fetchIndexPrice` 미호출 | PASS |

**dev 서버 로그 대조** — 동일 codes 1차 222ms(실 KIS) → 2차 9ms(캐시, application-code 3ms). G2(TTL 내 KIS 실호출 0) 라이브 확정.

> 참고(d): 화이트리스트 외/존재하지 않는 지수코드(`9999`,`ZZZZ`)는 KIS 가 reject 가 아니라 0-fill 응답을 주므로 `Promise.allSettled` 가 fulfilled 로 누적한다. 이는 `fetchIndexPrice`/`mapIndexPrice`(본 PR 미변경)의 기존 동작이며 회귀 아님. 진짜 reject(부분 실패) 케이스는 route.test.ts `[AC-12] 부분 실패 → 성공분만`(1001 reject → [0001,2001] 반환)으로 커버.

---

## 4. 에지 케이스

| 케이스 | 절차 | 결과 | 판정 |
|--------|------|------|------|
| KOSPI 누락(공유 쿼리 0001 부분 실패) | `find` 미스 → kospi undefined | advances/declines `?? 0` → total=0 → value=50/NEUTRAL, snapshot up/down=0 | PASS |
| 전부 실패 | route.test.ts `전부 실패 → 502` | `502` + 한글 `지수 정보를 불러오지 못했어요...` | PASS |
| 5s 타임아웃 | `withTimeout` + `__BFF_TIMEOUT__` → `mock-timeout` | mock fallback + 한글 안내, `X-Data-Source: mock-timeout` | PASS |
| 빈 codes / 미입력 | `parseCodes` 빈값 → `DEFAULT_INDEX_CODES` | 국내 3종 기본, mock codes `[0001,1001,2001]` | PASS |
| 테스트 캐시 누수 | `resetIndicesCacheForTest()` `beforeEach` | reset 후 재호출 단언 green — 거짓 통과 차단 | PASS |
| StrictMode 더블 마운트 | dev 서버 빌드·로드 200 | 콘솔 에러 없음, hydration 정상 | PASS |

---

## 5. 공통 AC 무회귀

| 항목 | 명령 | 결과 | 판정 |
|------|------|------|------|
| typecheck/lint/build 0 에러 | `npm run typecheck/lint/build` | 전부 0 에러, build 22/22 | PASS |
| BFF 원칙(브라우저 직접 호출 0) | `git grep -nE "http://127\.0\.0\.1" -- app/` | whitelist/search·workbench adapter route handler **fallback 2건만**(허용 예외, 본 PR 미변경). 신규 위반 0 | PASS |
| 한글 톤 무회귀 | 변경 파일 사용자 노출 문구 | sr-only `공포·탐욕 지표 로딩 중`, 502 한글 fallback — 식별자(코드/필드) 외 톤 유지 | PASS |
| 접근성 무회귀 | aria/role/sr-only | `aria-busy="true"`, `sr-only` 라벨, `role="alert"`(카드) 변경 없음 | PASS |
| 커스텀훅만 소비 | react-query 직접 import grep | 두 컨테이너 0건 | PASS |

---

## 6. 판정

- 8/8 AC PASS · 라이브 라운드트립 5/5 · 에지 6/6 · 공통 무회귀 5/5.
- dedup(queryKey 정규화 일치 MATCH:true) · breadth 무회귀(0001 명시 선택 = `[0]` 동일 결과) · 서버캐시(miss→hit, KIS 재호출 0) 모두 확인.
- 회귀·신규 위반 없음. **머지 가능**.

후속(본 PR 머지 후, PRD §4): 헤더 티커↔indices 국내지수 통합(별도 PRD), 소스 레벨 `fetchIndexPrice` 캐시+single-flight(KIS 토큰 store B 트랙과 함께).
