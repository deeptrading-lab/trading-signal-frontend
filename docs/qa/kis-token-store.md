# QA 리포트 — kis-token-store

> 대상 PR: #52 (`feature/kis-token-store`) · PRD: `docs/prd/kis-token-store.md`
> 검증일: 2026-05-31 · 판정: **qa-failed** (8 AC 중 7 통과, 1 blocking 부분 실패)
> ⚠️ 실 Upstash 프로비저닝 없음 → `kv` 모드는 fake redis 주입 단위테스트 + 닫힌 포트(`:9999`) 라이브 시뮬레이션으로 검증. `memory` 모드는 라이브(KIS prod) 검증.

---

## 0. 판정 요약

| 구분 | 결과 |
|------|------|
| memory 무회귀 (최우선) | ✅ PASS — 기존 7케이스 green + KIS prod 라이브 `/api/market/ticker`·`/api/market/indices` 200 (`X-Data-Source: kis`) |
| fail-soft (최상위) | ⚠️ **부분 FAIL (blocking)** — `kv` + Upstash 다운 시 **단일 store 호출은 600ms 폴백 정상**이나, **토큰 폴링 루프가 40회 store.get(각 600ms)를 직렬 누적 → 콜드 인스턴스에서 ~5s+ 지연 → 라우트 5s 타임아웃 → mock-timeout/500**. §3.4 "store 지연이 토큰/지수 응답을 늘어지게 하지 않는다" + G3 "KIS 호출은 계속됨" 위반 |
| 시크릿 안전 | ✅ PASS — appKey SHA-256 앞16자 해시, 평문/토큰 로깅 0, `@upstash/redis` 서버 전용(클라 번들 0건), `NEXT_PUBLIC_` 0건 |
| 품질 게이트 | ✅ PASS — typecheck/lint/build/test(178/178) 0에러 |

**blocking 사유**: 본 QA 의 fail-soft 중점 검증 항목("fake store 가 throw/**지연**해도 토큰 발급되고 200")과 PRD §3.4 명문("store 호출 자체에 짧은 타임아웃을 둬, **store 지연이 토큰/지수 응답을 늘어지게 하지 않는다**")을 `kv`+다운 조합의 콜드 인스턴스에서 충족하지 못함. 단위테스트는 0ms 반환 fake 로 폴링 지연을 시뮬레이션하지 않아 이 경로를 통과시킴(테스트 갭).

---

## 1. AC 별 검증표

### AC-1 (store 추상화 존재) — ✅ PASS

| 절차 | 명령 | 실측 |
|------|------|------|
| KisStore 인터페이스 + 락 메서드 | `git grep -nE "KisStore\|acquireLock\|releaseLock" lib/api/kis/` | `store.ts:39 export interface KisStore`, `:51 acquireLock`, `:53 releaseLock` 존재. `token.ts` 는 `import { getKisStore, hashAppKey, type KisStore } from "./store"`(`:36`)로 인터페이스 경유 — `@upstash/redis` 직접 import 없음 |
| KIS_TOKEN_STORE 분기(코드) | `git grep -n "KIS_TOKEN_STORE" lib/api/kis/` | `store.ts:237 if (process.env.KIS_TOKEN_STORE === "kv")` — 주석 아닌 실코드 분기. else → `MemoryKisStore`(`:253`) |

### AC-2 (memory 무회귀, G4) — ✅ PASS

| 절차 | 실측 |
|------|------|
| `npm run test` — token.test.ts 7케이스(#1~#7) green | `lib/api/kis/__tests__/token.test.ts (12 tests)` 전부 green (기존 7 + kv 5). #1 첫발급1회·#2 캐시hit·#3 만료갱신·#4 동시5건 single-flight·#5 env분리·#6 missing creds·#7 error_code 통과 |
| indices/ticker 라우트 테스트 green | `app/api/market/indices/__tests__/route.test.ts (8 tests)`·`ticker (8 tests)` green. mock 이 `fetchIndexPriceShared`→기존 `fetchIndexPrice` mock 으로 재매핑되어 단언 호환(라우트 회귀 0) |
| `resetTokenCacheForTest`·`GetTokenOptions` 보존 | `token.ts:79 export type GetTokenOptions`, `:248 export function resetTokenCacheForTest` 존재. fetcher/now 주입 인터페이스 유지 |
| **라이브 — memory(KIS_TOKEN_STORE 미설정)** | dev 서버(PORT 3457, `.env.local` KIS prod, store 미설정) → `GET /api/market/ticker` **200 `X-Data-Source: kis`**(KOSPI/KOSDAQ 실값), `GET /api/market/indices` **200 `X-Cache: miss` `X-Data-Source: kis`**(0001/1001 실데이터). store 미설정 = MemoryKisStore = L2 no-op → 현행 L1 경로 동일, KIS 호출 정상 |

> 참고: `/api/stock/price?ticker=005930` 은 500 이나 **이 PR 미변경 파일**(`git diff main...HEAD -- lib/api/kis/price.ts app/api/stock/price/route.ts` = 0건). 토큰 경로는 ticker 로 정상 입증됨 → KIS 종목현재가 엔드포인트 측 사전존재 이슈, 본 트랙 비관련.

### AC-3 (분산 single-flight, G1) — ✅ PASS

| 절차 | 실측 |
|------|------|
| 여러 동시 요청 발급 1회 단언 | `token.test.ts [kv] 락 잡은 인스턴스만 발급` — A/B 두 인스턴스(L1 reset 으로 경계 흉내) 동시 → `issued === 1`, 둘 다 `locked-token` 수신 green |
| store hit 시 추가 발급 0 | `[kv] 첫 인스턴스 발급→store SET, 둘째 store hit→fetcher 0회` green. SET 키 `/^kis:token:prod:[0-9a-f]{16}$/` 매치 |
| SET NX PX 락 패턴 | `store.ts:202 this.redis.set(key, token, { nx: true, px: ttlMs })`. 락 TTL `token.ts:42 LOCK_TTL_MS = 10_000`, 폴링 `:44 POLL_INTERVAL_MS = 50` × `:45 POLL_MAX_ATTEMPTS = 40`(=2s) |
| 락 미획득+폴링 만료 → 직접 발급 fallback | `[kv][AC-3] 락 미획득 + 폴링 만료 + store 비면 → 직접 발급 fallback` green (`fallback-token`, fetcher 1회) |
| compare-and-del(내 락만) | `store.test.ts 다른 토큰으로는 락이 해제되지 않는다` + `RELEASE_LOCK_LUA`(`store.ts:138`) |

### AC-4 (토큰 키 해시·env 분리, G5) — ✅ PASS

| 절차 | 실측 |
|------|------|
| 키 형태 `kis:token:{env}:{hash}` | `token.ts:167 const storeKey = \`kis:token:${env}:${hashAppKey(appKey)}\`` |
| appKey 평문 미노출(SHA-256 앞16자) | `store.ts:60-62 hashAppKey = createHash("sha256").update(appKey).digest("hex").slice(0,16)`. `store.test.ts [AC-4]` — 결정적, 16자, `/^[0-9a-f]{16}$/`, 평문 미포함 green |
| vts/prod 키 분리 | `token.test.ts [#5]` green(env 다르면 캐시 키 분리, callCount 2) |

### AC-5 (지수 store dedup, G2 — 부수) — ✅ PASS (본 PR 포함됨)

| 절차 | 실측 |
|------|------|
| 국내 store 키 존재 | `index-store.ts:31 SHARED_INDEX_CODES = new Set(["0001","1001"])`, `:34 \`kis:index:${code}\`` |
| 30s TTL 윈도우 cross-route 공유 | `index-store.test.ts [AC-5] 국내 store miss→fetchIndexPrice 1회+SET(TTL 30s)`·`store hit→0회`·`같은 store 공유 시 다른 라우트도 dedup` green |
| L1 라우트 인메모리 + L2 store 병행(캐시 제거 0) | indices/ticker 라우트는 L1 miss 시에만 `fetchIndexPriceShared` 호출(`indices/route.ts:122`, `ticker/route.ts:151`). 라우트 인메모리 Map 캐시 그대로(제거 0건) |
| 비국내 store 미경유 | `index-store.ts:55-57 if (!isSharedIndexCode(code)) return fetchIndexPrice(code)`. `index-store.test.ts 비국내(2001/SPX)는 store 미터치` green |

### AC-6 (fail-soft, G3) — ⚠️ **부분 FAIL (blocking)**

| 절차 | 기대 | 실측 |
|------|------|------|
| store throw/null → 인메모리 직접 발급 성공(단위) | 토큰 발급 200 | `token.test.ts [kv][AC-6] store 가 throw/null 만 줘도 fail-soft` green / `store.test.ts [AC-6] redis throw 해도 get null·set/del/acquire/release throw 안함` green ✅ |
| **단일 store 호출 타임아웃 600ms** | store 지연이 응답 안 늘림 | **probe**: 닫힌 포트(`:9999`) Upstash 에 `withTimeoutSoft(redis.get)` → **반환 null, 소요 600ms** ✅ (단일 호출은 정상 폴백) |
| **`kv`+Upstash 다운, 콜드 인스턴스 라이브** | store 다운이어도 KIS 호출 계속·200 | dev(PORT 3458, `KIS_TOKEN_STORE=kv` + `KV_REST_API_URL=http://127.0.0.1:9999`) → `GET /api/market/ticker` **200 but `X-Data-Source: mock-timeout`, time=5.02s** / `GET /api/market/indices` **500, 5.16s** ❌ |
| 폴백/타임아웃 코드 존재 | — | `store.ts:75 withTimeoutSoft`, `:86 catch`, `:82 setTimeout(...fallback)` ✅ |

**재현 조건·로그·기대 대비 실제**:
- 재현: `KIS_TOKEN_STORE=kv` + 닿지 않는 Upstash(`:9999`) + **L1 캐시 비어있는 콜드 인스턴스의 첫 토큰 발급**.
- 메커니즘: 토큰 경로(`token.ts:resolveTokenViaStore`)에서
  1. `store.get`(`:171`) → 600ms 타임아웃 → null(miss)
  2. `store.acquireLock`(`:177`) → 600ms 타임아웃 → **null**(닿지 않으므로 락 미획득과 구분 불가)
  3. 폴링 루프(`:194-200`) **40회 × (50ms delay + store.get 600ms 타임아웃)** 직렬 누적 → probe 측정 **폴링 5회만 4.46s, 40회 환산 ≈ 27s**
  4. 직접발급 fallback(`:203`)은 라우트 5s 타임아웃에 걸려 **도달 못 함**
- 기대(§3.4·G3·본 QA 중점): "store 지연이 토큰/지수 응답을 늘어지게 하지 않는다" + "KIS 호출은 계속됨" + "fake store 가 **지연**해도 토큰 발급되고 200".
- 실제: 콜드 인스턴스가 ~5s 폴링 starvation 후 mock-timeout/500 으로 degrade. **앱 크래시는 없음**(mock 응답 + dev 프로세스 생존 확인)이나 KIS 호출이 계속되지 못하고 mock 으로 떨어짐.
- 단위테스트가 막지 못한 이유: `[kv][AC-6]`·`[kv][AC-3] 폴링 만료` 의 fake store 가 `acquireLock`/`get` 을 **0ms 즉시 null** 반환 → 폴링 40×50ms=2s 만에 직접발급 도달. **실 store 호출당 600ms 지연을 시뮬레이션하지 않아** 누적 starvation 경로가 테스트에 노출 안 됨(테스트 갭).

> 참고(완화 정황): ① 머지 직후 현실 상태 = Upstash **미설정**(§3.7) → `MemoryKisStore`(네트워크 0, 즉시) → 완전 fail-soft(AC-2 라이브로 입증). ② **warm 인스턴스**(L1 토큰 캐시 보유)는 store 미접촉으로 영향 0 — kv 2회차 ticker 200 `X-Data-Source: kis` 1.44s 확인. ③ 영향은 `kv`+다운 조합의 **콜드 인스턴스 첫 발급**에 국한. 그럼에도 §3.4 명문·G3·본 QA fail-soft 중점("지연해도 200")을 위반하므로 blocking 으로 판정.

**제안 수정 방향(개발자 영역 — 참고)**: `acquireLock` 의 "다른 인스턴스가 락 보유(폴링해야 함)" 와 "store 도달 불가(폴링 무의미)" 를 구분해, store 불가 신호 시 폴링을 건너뛰고 즉시 직접발급 fallback 으로 가게 하거나, 폴링 내부 `store.get` 타임아웃을 더 짧게/총 폴링 시간 상한(예: 누적 1.5s)을 두어 라우트 타임아웃 전에 직접발급에 도달하게 함.

### AC-7 (env 문서, G5) — ✅ PASS

| 절차 | 실측 |
|------|------|
| `.env.local.example` KIS_TOKEN_STORE 실구현 안내 | `:56-60` memory/kv 설명 + "kv 인데 연결변수 없거나 에러 시 memory 폴백(fail-soft)" 주석. `KIS_TOKEN_STORE=memory` |
| Upstash 연결 변수 두 네이밍 안내 | `:70-71 KV_REST_API_URL/TOKEN` + `:73-74 # UPSTASH_REDIS_REST_URL/TOKEN`(대체). "미설정 시 memory 폴백 무해", NEXT_PUBLIC_ 금지 명시 |
| `.env.example` 갱신 | `:62-70` 동일 안내(상세는 .env.local.example 참고) |
| 코드 명시 생성 패턴 | `store.ts:220 KV_REST_API_URL ?? UPSTASH_REDIS_REST_URL`, `:222 KV_REST_API_TOKEN ?? UPSTASH_REDIS_REST_TOKEN` |
| README 표 | `lib/api/kis/README.md:50-51` KIS_TOKEN_STORE/KV_REST 표 + 토큰 2단 캐시 절 갱신 |

### AC-8 (품질·의존, G6) — ✅ PASS

| 절차 | 명령 | 실측 |
|------|------|------|
| typecheck | `npm run typecheck` | `tsc --noEmit` 0에러 |
| lint | `npm run lint` | `eslint .` 0에러 |
| test | `npm run test` | **178 passed (28 files)** |
| build | `npm run build` | 성공(22 라우트 prerender/dynamic, 0에러) |
| `@upstash/redis` 의존 1건 | `git grep -n "@upstash/redis" package.json` | `package.json:18 "@upstash/redis": "^1.38.0"`. lockfile 등록 확인 |
| 서버 전용 import(브라우저 0) | `git grep -rn "@upstash/redis" *.ts *.tsx` | 실 import 은 `store.ts:29 import { Redis } from "@upstash/redis"` 1곳(나머지는 주석). `.tsx`/`'use client'` import 0건. `.next/static` 에 `upstash` 0건, redis token env 0건 |

---

## 2. 에지 케이스

| 케이스 | 절차 | 실측 |
|--------|------|------|
| **BE 다운(ECONNREFUSED)** | `curl http://127.0.0.1:8000/health` | `000`(FastAPI 미기동). **본 PR 은 FastAPI 의존 0**(KIS/서버인프라 only) → 무관. 비범위 |
| **store 닫힌 포트(`:9999`)** | kv 모드 dev + 비도달 Upstash | AC-6 참조 — 단일 호출 600ms 폴백 OK, 폴링 누적 starvation 으로 콜드 인스턴스 degrade(blocking) |
| **store throw** | `store.test.ts [AC-6]` | redis.get/set/del/eval mockRejectedValue → get null, 나머지 무throw green |
| **malformed JSON in store** | `UpstashKisStore.get` | `store.ts:174-180` 문자열이면 `JSON.parse` try/catch → 실패 시 raw 반환(throw 0) |
| **TTL 만료** | `store.test.ts MemoryKisStore TTL 만료 시 null` | fakeTimers 1.5s 진행 후 null green |
| **음수 TTL 방지** | `token.ts:182 Math.max(1, ...)` | 만료-grace-now 음수 시 최소 1s |
| **시크릿 로깅** | `git grep console.*token/appKey lib/api/kis/` | 0건. store 에러는 "조용히 degrade"(`store.ts:87`) — 토큰값/appKey 로그 노출 0 |
| **BFF 원칙** | `git grep -nE "http://127\.0\.0\.1" -- app/` | whitelist/workbench 라우트 핸들러 `?? "http://127.0.0.1:8000"` fallback 2건(허용 예외, 본 PR 미변경). 신규 위반 0 |
| **한글 톤** | store/index-store/token 사용자 노출 문구 | 토큰 에러 한글 유지(`token.test.ts #6/#7` green). store 모듈은 사용자 노출 문구 0(인프라) |

---

## 3. 라운드트립 (라이브)

> BE(FastAPI) 무관 트랙 → KIS prod 라이브로 대체. dev 서버 본인 기동·검증 후 종료. UI 변경 0(PRD §4) → 뷰포트 2분할 불요.

### 시나리오 A — memory 모드(기본, KIS_TOKEN_STORE 미설정)
1. dev(PORT 3457, `.env.local` KIS prod) 기동 → `Ready in 257ms`.
2. `GET /api/market/ticker` → **200 `X-Data-Source: kis` `X-KIS-Env: prod`** — KOSPI/KOSDAQ/S&P/NASDAQ/BTC 5종 실값.
3. `GET /api/market/indices` → **200 `X-Cache: miss` `X-Data-Source: kis`** — 0001/1001 실데이터(value/change/volume…).
4. 판정: store 미설정 = MemoryKisStore = L2 no-op → 현행 동일, KIS 호출 정상. **memory 무회귀 라이브 확인 ✅**

### 시나리오 B — kv 모드 + Upstash 다운(`:9999`, fail-soft 시뮬레이션)
1. dev(PORT 3458, `KIS_TOKEN_STORE=kv KV_REST_API_URL=http://127.0.0.1:9999`) 기동.
2. `GET /api/market/ticker`(콜드) → **200 but `X-Data-Source: mock-timeout`, 5.02s** ❌(KIS 발급 starvation → 라우트 타임아웃 → mock).
3. `GET /api/market/indices`(콜드) → **500, 5.16s** ❌.
4. `GET /api/market/ticker`(2회차, warm L1) → **200 `X-Data-Source: kis`, 1.44s** ✅(warm 인스턴스 영향 0).
5. dev 프로세스 생존 → 앱 크래시 0(degrade 는 mock). 판정: **부분 fail-soft 위반(콜드 인스턴스) — AC-6 blocking**.

---

## 4. 결론

- **PASS**: AC-1·2·3·4·5·7·8 (7건). memory 무회귀·시크릿 안전·품질 게이트 전부 충족.
- **FAIL(blocking)**: AC-6 — `kv`+Upstash 다운 시 콜드 인스턴스에서 토큰 폴링 루프 누적 지연(~5s)이 §3.4("store 지연이 응답 안 늘림")·G3("KIS 호출 계속")·본 QA fail-soft 중점("지연해도 200")을 위반. 단위테스트 0ms fake 가 이 경로를 가려 green 통과(테스트 갭).
- **판정: qa-failed** — 머지 금지. fail-soft 는 본 트랙 최상위 안전장치이자 블로킹 기준이므로, 폴링 루프가 store 불가 신호에 대해 라우트 타임아웃 전에 직접발급 fallback 으로 수렴하도록 보정 후 재검 요청.

---

산출물: docs/qa/kis-token-store.md | 판정: qa-failed | 실패 1건(AC-6, blocking)
