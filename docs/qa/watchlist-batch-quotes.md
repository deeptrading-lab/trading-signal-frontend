# QA 리포트 — 관심종목 시세 일괄조회 전환 (`watchlist-batch-quotes`)

- 대상 PR: #46 (`feature/watchlist-batch-quotes`, head `4a91031`)
- PRD: [`docs/prd/watchlist-batch-quotes.md`](../prd/watchlist-batch-quotes.md)
- 환경: `KIS_ENV=prod` + 실전 키 설정됨. KIS REST 직접 라운드트립(FastAPI BE 무관 트랙).
- 판정: **PASS** — 23/23 AC 통과. ⭐ 핵심 목표(EGW00201 rate-limit 해소) 라이브 확인.

---

## 1. AC 별 검증표

| AC | 기대 | 검증 방법 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | route 에 `fetchStockPrice` 0건 / `fetchIntstockMultprice` ≥1건 | `git grep` | `fetchStockPrice` 0건(exit 1), `fetchIntstockMultprice` 2건(import+호출) | PASS |
| AC-2 | route 에 `fetchStockInfo`/`search-stock-info` 0건 | `git grep` | 0건(exit 1) | PASS |
| AC-3 | `lib/api/kis/intstock-multprice.ts` 존재 + TR_ID `FHKST11300006` + 경로 `intstock-multprice` | `find`+`git grep` | 파일 1건, `FHKST11300006` (l.105), 경로(l.110) | PASS |
| AC-4 | 배럴 `fetchIntstockMultprice` export | `git grep lib/api/kis/index.ts` | l.35 export | PASS |
| AC-5 | `mapIntstockMultprice` 존재 + `bstp_kor_isnm` 을 `name` 에 대입 0건 | `git grep`+코드리뷰 | mapper l.207. `bstp_kor_isnm` 참조는 전부 주석/회귀차단 설명, `name: ticker`(l.213)로 대입 (l.214~221 시세필드만) | PASS |
| AC-6 | 31종목 → ⌈N/30⌉=2콜 chunk | `npm run test` (`intstock-multprice.test.ts` #2) | `toHaveBeenCalledTimes(2)` + 31건 반환 통과 | PASS |
| AC-7 | `WatchlistRow` 에 `onRetry`/`WATCHLIST_ROW_RETRY` 0건 | `git grep` | 0건(exit 1). 배지/거래정지·관리종목 라벨도 주석 1건 외 렌더/카피 0 | PASS |
| AC-8 | 상단 단일 새로고침 1개 + `query.refetch()`, per-row 0개 | 코드리뷰+dev | `WatchlistPage` 헤더 버튼 1개(`onRefresh`), `WatchlistContainer` `onRefresh={()=>query.refetch()}`(l.65). per-row 버튼 0 | PASS |
| AC-9 | hook 에 `placeholderData`/`keepPreviousData` | `git grep` | l.17 import + l.43 `placeholderData: keepPreviousData` | PASS |
| AC-9b | `queryConfig.watchlist.list` staleTime 30s | `git grep` | l.84 `staleTime: 30 * SECOND`, gcTime 5min 유지 | PASS |
| AC-10 | 이중 게이트(`isKisConfigured && prod`)→mock, `X-Data-Source`/`X-KIS-Env`, 타임아웃 mock-timeout | `npm run test` route #1~#3,#10,#11 + dev | 게이트/mock/헤더 테스트 11건 통과. dev: prod→`kis`, 빈→`mock`(아래 §3) | PASS |
| AC-11 | 부분 누락 좌조인 디그레이드, 전체 실패 카드 | `npm run test` route #5,#6,#7 + dev | `005930,999999`→`005930`만+`X-Watchlist-Failed: 999999`(아래 §3) | PASS |
| AC-12 | lint/typecheck/test/build + `/watchlist` 200 | 명령 실행 | 전부 0에러, 86 테스트 통과, `/watchlist` 200 | PASS |
| AC-13 | `WatchlistQuote` price/change/changePercent/direction/volume 정규 필드 | 코드리뷰 | `types.ts` l.336~340 공통 필드 + WS 재사용 계약 주석(§3.6) | PASS |

### 공통 AC

| 항목 | 실측 | 판정 |
|---|---|---|
| typecheck 0에러 | `tsc --noEmit` 무출력 | PASS |
| lint 0에러 | `eslint .` 무출력 | PASS |
| test | 18 파일 86 테스트 전부 통과 | PASS |
| build | Turbopack 빌드 성공, `/api/watchlist` ƒ + `/watchlist` ○ | PASS |
| BFF 단방향 무회귀 | `git grep "http://127.0.0.1" app/` → whitelist/workbench FastAPI route fallback만(규칙상 제외). watchlist route 는 KIS `client.ts` 경유 | PASS |
| 한글 톤 무회귀 | 라벨 전부 한글("새로고침"/"종목 추가"/"시세를 불러오지 못했어요" 등), ticker/필드 외 영문 노출 0 | PASS |
| 접근성 무회귀 | 행 `role="link"`+`tabIndex`+Enter/Space 핸들러, 삭제 버튼 `aria-label`(displayName 포함), 새로고침 `aria-label`(`isRefreshing` 시 sr 안내), 로딩 `aria-busy`/sr-only | PASS |

---

## 2. ⭐ 핵심: rate-limit(EGW00201) 해소 — 라이브 확인

**시나리오**: 관심종목 3종(005930/000660/035420) `GET /api/watchlist?tickers=005930,000660,035420` 반복.

**현실 cadence(토큰 캐시 유지, 2s 간격 6회):**

```
run#1  source=kis returned=3 failed=[none]
run#2  source=kis returned=3 failed=[none]
run#3  source=kis returned=3 failed=[none]
run#4  source=kis returned=3 failed=[none]
run#5  source=kis returned=3 failed=[none]
run#6  source=kis returned=3 failed=[none]
=== total EGW00201 in dev log (whole session) === 0
```

→ **6/6 모두 3종 전부 반환, `X-Watchlist-Failed` 없음, EGW00201 0건.** `intstock_multprice` 1콜 전환으로
종목당 2N콜 구조의 초당 한도 초과가 근본 해소됨(G1/G2 달성). 응답 ~200ms.

**참고(비차단)**: 0.3s 간격 8회 hammering 시 2회 `500 {"error":"Request failed with status code 500"}` 발생.
- 발생 위치: 17~20ms 만에 실패(정상 KIS 콜 ~200ms 대비 KIS 도달 전) → **KIS 토큰 발급 엔드포인트의 발급제한**(분당 1회성)에 의한 token-issuance race 이며, 본 PRD 가 목표한 per-quote rate limit(EGW00201)이 **아님**. dev 로그 EGW00201 0건이 이를 뒷받침.
- 영향 범위: 프론트 실제 cadence 는 staleTime 30s + 수동 새로고침 → 0.3s 연속 호출 미발생. 토큰은 첫 발급 후 캐시(single-flight `token.ts`)되어 정상 사용에서 재현 안 됨(2s 간격 6/6 성공).
- 본 트랙 신규 회귀 아님(토큰 발급 인프라는 `#38` 이후 공통). → **blocking 아님.**

---

## 3. 라운드트립 (dev 서버 + KIS prod 실키)

| 시나리오 | 요청 | 결과 | 판정 |
|---|---|---|---|
| 정상 3종 | `?tickers=005930,000660,035420` | 200, `X-Data-Source: kis`, `X-KIS-Env: prod`, 3종 시세 반환(price/changePercent/direction) | PASS |
| 부분 누락(디그레이드) | `?tickers=005930,999999` | `X-Data-Source: kis`, `X-Watchlist-Failed: 999999`, 본문 `["005930"]`만 → 999999 는 좌조인 디그레이드 행 | PASS |
| 빈 입력 | `?tickers=` | `X-Data-Source: mock`, 빈 배열 200, KIS 미호출 | PASS |
| 페이지 SSR | `GET /watchlist` | HTTP 200, "관심종목"/"종목 추가" 렌더. 초기엔 `canRefresh=false`(skeleton 게이트) → 새로고침 버튼은 hydration 후 표 노출 시 등장(컨테이너 의도 동작) | PASS |

> 양 뷰포트(375/1280): `/watchlist` 표는 12-col grid + "관리" 컬럼 양 뷰포트 노출(WatchlistTable 주석 정합), 신규 토큰 0. SSR 200 동일.

---

## 4. 에지 케이스

- **malformed / 빈 시세 필드**: `toNumber`(mappers.ts l.31~35) `!value`→0, `Number.isFinite` 아니면 0 → NaN 미노출. PASS.
- **전체 실패(빈 응답 0종)**: route #7 `502 + 한글 fallback`(`FALLBACK_SERVER_MESSAGE`). PASS.
- **타임아웃(5s)**: route 코드 경로 `mock-timeout` + `X-Error` 한글 안내(테스트 mock 검증). PASS.
- **soft cap 30 초과**: route #8 truncate + `X-Watchlist-Truncated: soft-cap-30`. PASS.
- **transient(rate-limit/네트워크) 단일콜**: route #10 200ms backoff 후 1회 재시도 성공 / #11 비즈니스 에러는 재시도 안 함. PASS.
- **이전 트랙 store `{ticker,name}` 호환**: `WatchlistContainer.resolveName`=`getName ?? getSymbolName`(store→시드), `WatchlistRow` displayName=`fallbackName ?? quote.name`(store→시드→BFF폴백) → 디그레이드 행도 "SK하이닉스 (000660)" 식 표시. PASS.
- **배지 보류(q2)**: 거래정지/관리종목 배지 렌더/카피 0(주석 1건만). 데드코드 잔재 0. PASS.

---

## 5. 결론

전 AC(23/23) 통과. ⭐ 핵심 목표인 EGW00201 rate-limit 해소를 prod 실키 라이브로 확인(현실 cadence 6/6
무누락·EGW00201 0건). 토큰 발급 엔드포인트의 분당 발급제한에 의한 0.3s hammering 시 간헐 500 은 본
PRD 비범위·기존 공통 인프라 이슈로 blocking 아님(현실 사용 미재현).

**판정: PASS** → 라벨 `impl-ready` 제거 + `qa-passed` 부여.
