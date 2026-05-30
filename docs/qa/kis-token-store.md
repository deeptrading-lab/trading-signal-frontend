# QA 리포트 — kis-token-store

> 대상 PR: #52 (`feature/kis-token-store`) · PRD: `docs/prd/kis-token-store.md`
> 검증일: 2026-05-31 (재검증) · 판정: **qa-passed** (8 AC 전부 통과)
> 이력: 1차(2026-05-31) **qa-failed** — AC-6 fail-soft 콜드 인스턴스 폴링 starvation(~5s mock-timeout/500). 개발자 수정(commit `f45f592`) → **재검증 PASS**.
> ⚠️ 실 Upstash 프로비저닝 없음 → `kv` 모드는 fake redis 주입 단위테스트 + 닫힌 포트(`:9999`) 라이브 시뮬레이션으로 검증. `memory` 모드는 라이브(KIS prod) 검증.

---

## 0. 판정 요약 (재검증)

| 구분 | 결과 |
|------|------|
| **AC-6 fail-soft (직전 실패, 1순위 재검증)** | ✅ **PASS (해소)** — `kv`+Upstash 다운(`:9999`) 콜드 인스턴스에서 토큰이 즉시 직접발급되고 라우트가 **5s 한참 전**에 200 응답. 직전의 폴링 starvation(~5s mock-timeout/500) **재발 안 함** |
| memory 무회귀 (최우선) | ✅ PASS — 기존 7케이스 green + KIS prod 라이브 ticker/indices 200 `kis` |
| 분산 single-flight (kv) | ✅ PASS — store hit/miss·락 1발급·직접발급 fallback·**store 정상+락 미획득 폴링 수렴(무회귀)** |
| 시크릿 안전 | ✅ PASS — appKey SHA-256 앞16자 해시, 평문/토큰 로깅 0, 서버 전용 import, NEXT_PUBLIC_ 0 |
| 품질 게이트 | ✅ PASS — typecheck/lint/build/test(**181/181**, +3 AC-6/AC-3 신규) 0에러 |

**재검증 핵심**: 직전 blocking 사유였던 "store 도달 불가 콜드 인스턴스에서 폴링 루프 40회×600ms 직렬 누적 → 라우트 5s 타임아웃 → mock-timeout/500" 이 commit `f45f592` 로 해소됨. 수정 원리 = store 의 `wasLastCallDegraded()` 신호로 "정당한 miss/락-미획득" 과 "store 도달 불가" 를 구분 → 도달 불가면 **폴링 진입 자체를 건너뛰고 즉시 직접발급**. 폴링은 store 정상+락 미획득일 때만, 총 폴링 시간 상한(`POLL_MAX_TOTAL_MS`=1.5s)·짧은 per-poll 타임아웃(150ms)·폴링 중 degrade 시 즉시 중단으로 bound.

---

## 1. ⭐ AC-6 fail-soft 재검증 상세 (직전 실패 항목)

### 1.1 수정 코드 확인

| 항목 | 실측 |
|------|------|
| degrade 신호 노출 | `store.ts:80 wasLastCallDegraded?(): boolean`(인터페이스 선택 메서드). `withTimeoutSoft` → `{value, degraded}` 반환(`:타임아웃·throw 시 degraded=true`). `UpstashKisStore.run` 이 `lastDegraded` 기록 후 `wasLastCallDegraded()`(`store.ts:221`)로 노출. memory/fake 미구현 시 false 간주(`token.ts:251 ?? false`) |
| L2 조회 직후 degrade 단락 | `token.ts:193-196 if (storeDegraded(store)) return issue()` — store 도달 불가면 락/폴링 무의미 → 즉시 직접발급 |
| acquireLock 직후 degrade 단락 | `token.ts:219-221 if (storeDegraded(store)) return issue()` — "락 미획득(남이 잡음)" vs "store 도달 불가" 구분 |
| 폴링 bound | `token.ts:59 POLL_MAX_TOTAL_MS=1_500`, `:60-62 POLL_MAX_ATTEMPTS = ceil(1500/(50+150)) = 8`. 폴링 get 전용 짧은 타임아웃 `store.ts:44 STORE_POLL_TIMEOUT_MS=150`. 폴링 중 degrade 시 `token.ts:232 break` |

→ 최악 폴링 누적 = 8 × (50ms delay + 150ms get) ≈ **1.6s** ≪ 라우트 5s 타임아웃. 직전 27s 환산 starvation 경로 제거.

### 1.2 단위테스트 — 테스트 갭 보강 확인

직전 지적: fake store 가 `0ms-즉시-null` 반환이라 폴링 40회를 돌려도 빨라서 starvation 을 못 잡음.

| 테스트 | 단언 | 실측(개별 timing) |
|--------|------|------|
| `[kv][AC-6] store 다운(degrade+지연) 시 폴링 starvation 없이 즉시 직접발급` | degrade 신호 + per-call 15ms 지연 fake → `getCalls===1`·`acquireCalls===0`(L2 조회 직후 단락 → 락 시도조차 없음)·`elapsed<500ms`·`callCount===1`(직접발급) | green, **17ms** |
| `[kv][AC-6] UpstashKisStore + redis throw → degrade 자동 감지 후 즉시 직접발급` | 실 `UpstashKisStore` + redis throw → `store.wasLastCallDegraded()===true`·즉시 직접발급·`elapsed<500ms` (token↔store degrade 배선 end-to-end) | green, **1ms** |
| `[kv][AC-3] store 정상 + 락 미획득 → 폴링 유지(2회차 store hit 수렴)` | `wasLastCallDegraded()===false` → 폴링 유지, 2회차 store hit `polled-token` 수신, `callCount===0`(직접발급 안 함 — 무회귀) | green, **52ms** |

→ 신규 테스트는 실시간 수초 지연을 타지 않도록 **per-call 지연을 15ms 로 축약**해 주입하되, 단언은 `getCalls`/`acquireCalls` 호출횟수 + `elapsed<500` 로 **폴링 루프 미진입을 실재 검증**(0ms-즉시-null 로 가렸던 경로 커버). 테스트 갭 보강 확인됨.

### 1.3 라이브 — `kv`+Upstash 다운(`:9999`) 콜드 인스턴스

> dev 서버 본인 기동(`KIS_TOKEN_STORE=kv KV_REST_API_URL=http://127.0.0.1:9999 KV_REST_API_TOKEN=dummy`). 각 측정은 KIS EGW00133(토큰 발급 1분당 1회) 윈도우를 비운 뒤 단발 콜드로 수행. 검증 후 종료.

| 시나리오 | 기대 | 실측 | 판정 |
|----------|------|------|------|
| **콜드 indices-first**(L1 토큰 캐시 빈 첫 발급) | 200 `kis`, 5s 한참 전 | **200 `X-Data-Source: kis`, 2.28s** | ✅ (직전 500/5.16s → 해소) |
| **콜드 ticker-first** | 200 `kis`(또는 mixed) | **200 `X-Data-Source: kis`, 2.33s** — KOSPI/KOSDAQ/S&P/NASDAQ/BTC 5종 실값 | ✅ (직전 mock-timeout/5.02s → 해소) |
| ticker(warm L1 토큰) | 200 `kis` 빠름 | **200 `kis`, 1.44s** (실값) | ✅ |
| indices(warm 라우트 캐시) | 200 `kis` cache hit | **200 `kis` `X-Cache: hit`, 0.01s** | ✅ |

직전 리포트의 `mock-timeout`(5.02s)·`500`(5.16s) **모두 재발 없음**. 응답 시간 2.2~2.3s 는 store starvation 이 아니라 **실 KIS 네트워크 왕복(토큰 발급 + 지수/시세 호출)** 시간 — 폴링 누적 0(즉시 직접발급으로 단락).

> **검증 중 관찰(코드 결함 아님)**: 콜드 dev 서버를 60초 내 여러 번 재기동하면 매 콜드 인스턴스가 store 다운으로 **직접 토큰 발급**을 하므로 실 KIS prod 계좌의 EGW00133(1분당 1회)에 닿아 일시적으로 indices 502/ticker mixed 가 났다. 60s 쿨다운 후 단발 콜드는 위 표대로 200 `kis`. 이는 store 다운 fail-soft 의 **정의대로의 동작**(store 없으면 인스턴스별 직접 발급 → KIS 자체 제한에 종속) — 폴링 starvation 이나 본 PR 회귀가 아님. 라우트는 전부 실패 시 한글 안내 502(크래시 아님)로 graceful degrade. store **정상** 시엔 분산 락이 발급을 1회로 수렴해 이 조건 자체가 발생하지 않음(본 PR 의 목적).

---

## 2. AC 별 검증표

### AC-1 (store 추상화 존재) — ✅ PASS

| 절차 | 명령 | 실측 |
|------|------|------|
| KisStore 인터페이스 + 락 메서드 | `git grep -nE "KisStore\|acquireLock\|releaseLock" lib/api/kis/store.ts` | `store.ts:52 export interface KisStore`, `acquireLock`/`releaseLock` 존재. `token.ts:36-41` 가 store 모듈에서 `getKisStore/hashAppKey/STORE_POLL_TIMEOUT_MS/type KisStore` import — `@upstash/redis` 직접 import 없음 |
| KIS_TOKEN_STORE 분기(코드) | `git grep -n "KIS_TOKEN_STORE" lib/api/kis/` | `store.ts:297 if (process.env.KIS_TOKEN_STORE === "kv")` — 주석 아닌 실코드. else → `MemoryKisStore` |

### AC-2 (memory 무회귀, G4) — ✅ PASS

| 절차 | 실측 |
|------|------|
| token.test.ts 기존 7케이스(#1~#7) green | `lib/api/kis/__tests__/token.test.ts (15 tests)` 전부 green (기존 7 + kv 8). #1~#7 회귀 0 |
| indices/ticker 라우트 테스트 green | `app/api/market/indices/__tests__/route.test.ts (8)`·`ticker (8)` green |
| `resetTokenCacheForTest`·`GetTokenOptions` 보존 | `token.ts:96 GetTokenOptions`, `resetTokenCacheForTest` 존재. fetcher/now/store 주입 유지 |
| **라이브 — memory(KIS_TOKEN_STORE 미설정)** | dev(PORT 3468, KIS prod, store 미설정) → `GET /api/market/ticker` **200 `mixed` 0.56s**(`mixed`=한 소스 간헐 mock, 정상 steady-state), `GET /api/market/indices` **200 `kis` `X-Cache: miss` 0.21s**(0001/1001 실데이터). store 미설정 = MemoryKisStore = L2 no-op → 현행 경로 동일 |

### AC-3 (분산 single-flight, G1) — ✅ PASS

| 절차 | 실측 |
|------|------|
| 여러 동시 요청 발급 1회 단언 | `[kv][AC-3] 락 잡은 인스턴스만 발급` green(`issued===1`) |
| store hit 시 추가 발급 0 | `[kv] 첫 발급→SET, 둘째 store hit→fetcher 0회` green |
| SET NX PX 락 패턴 | `store.ts:262 redis.set(key, token, { nx: true, px: ttlMs })`. 락 TTL `token.ts LOCK_TTL_MS=10_000` |
| 락 미획득+폴링 만료 → 직접발급 fallback | `[kv][AC-3] 락 미획득 + 폴링 만료 + store 비면 → 직접발급 fallback` green |
| **store 정상+락 미획득 폴링 수렴(무회귀)** | `[kv][AC-3] store 정상 + 락 미획득 → 폴링 유지(2회차 store hit 수렴)` green(`polled-token`, `callCount===0`) — 수정이 폴링을 안 깸 |
| compare-and-del(내 락만) | `store.test.ts 다른 토큰으로는 락 해제 안 됨` + `RELEASE_LOCK_LUA` |

### AC-4 (토큰 키 해시·env 분리, G5) — ✅ PASS

| 절차 | 실측 |
|------|------|
| 키 형태 `kis:token:{env}:{hash}` | `token.ts:184 storeKey = kis:token:${env}:${hashAppKey(appKey)}` |
| appKey 평문 미노출(SHA-256 앞16자) | `store.ts hashAppKey = createHash("sha256")...slice(0,16)`. `store.test.ts [AC-4]` 16자 hex·평문 미포함 green |
| vts/prod 키 분리 | `token.test.ts [#5]` green |

### AC-5 (지수 store dedup, G2 — 부수) — ✅ PASS (본 PR 포함됨)

| 절차 | 실측 |
|------|------|
| 국내 store 키 존재 | `index-store.ts:31 SHARED_INDEX_CODES = new Set(["0001","1001"])`, `:34 kis:index:${code}` |
| 30s TTL cross-route 공유 | `index-store.test.ts [AC-5] miss→fetch 1회+SET(30s)`·`hit→0회`·`다른 라우트 dedup` green |
| L1 라우트 인메모리 + L2 store 병행(제거 0) | indices/ticker 라우트는 L1 miss 시에만 `fetchIndexPriceShared` 호출. 라우트 Map 캐시 그대로 |
| 비국내 store 미경유 | `index-store.ts:55 if (!isSharedIndexCode(code)) return fetchIndexPrice(code)`. `비국내(2001/SPX) store 미터치` green |
| fail-soft(store 다운) | store.get null(degrade) → `fetchIndexPrice` 직접 호출 fallthrough. 라이브 kv-down 콜드 indices 200 `kis` 로 입증(§1.3) |

### AC-6 (fail-soft, G3) — ✅ **PASS (해소)**

§1 전체 참조. 요약:
- 단위: degrade 신호 short-circuit 으로 폴링 미진입(`getCalls===1`/`acquireCalls===0`/`elapsed<500`) + 실 UpstashKisStore throw → degrade 자동 감지 즉시 직접발급. green.
- 라이브(`kv`+`:9999` 다운, 콜드): indices 200 `kis` 2.28s / ticker 200 `kis` 2.33s — 직전 mock-timeout(5.02s)/500(5.16s) **재발 없음**.
- 폴링/타임아웃/degrade 코드: `store.ts:75 withTimeoutSoft`(degraded 반환), `:221 wasLastCallDegraded`, `token.ts:193·219·232 storeDegraded 분기·break`.

### AC-7 (env 문서, G5) — ✅ PASS (변동 없음)

| 절차 | 실측 |
|------|------|
| `.env.local.example` KIS_TOKEN_STORE 실구현 안내 | memory/kv 설명 + "kv 인데 연결변수 없거나 에러 시 memory 폴백(fail-soft)" 주석 |
| Upstash 변수 두 네이밍 | `KV_REST_API_URL/TOKEN` + `UPSTASH_REDIS_REST_URL/TOKEN`(대체). NEXT_PUBLIC_ 금지 명시 |
| 코드 명시 생성 패턴 | `store.ts KV_REST_API_URL ?? UPSTASH_REDIS_REST_URL`, `KV_REST_API_TOKEN ?? UPSTASH_REDIS_REST_TOKEN` |
| README 표 | `lib/api/kis/README.md:50` KIS_TOKEN_STORE 표 + 토큰 2단 캐시 절 |

### AC-8 (품질·의존, G6) — ✅ PASS

| 절차 | 명령 | 실측 |
|------|------|------|
| typecheck | `npm run typecheck` | `tsc --noEmit` 0에러 |
| lint | `npm run lint` | `eslint .` 0에러 |
| test | `npm run test` | **181 passed (28 files)** (+3 AC-6/AC-3 신규) |
| build | `npm run build` | 성공(22 라우트, 0에러) |
| `@upstash/redis` 의존 1건 | `git grep -n "@upstash/redis" package.json` | `package.json:18 "@upstash/redis": "^1.38.0"` |
| 서버 전용 import(브라우저 0) | `git grep -n "@upstash/redis" *.ts *.tsx \| grep import` | 실 import `store.ts:29` 1곳. `.tsx`/`'use client'` 0건 |

---

## 3. 에지 케이스 (재확인)

| 케이스 | 절차 | 실측 |
|--------|------|------|
| **BE 다운(ECONNREFUSED)** | `curl http://127.0.0.1:8000/health` | `000`. **본 PR FastAPI 의존 0**(KIS/서버인프라 only) → 무관 |
| **store 닫힌 포트(`:9999`) 콜드** | kv 모드 dev + 비도달 Upstash | §1.3 — 즉시 직접발급, 200 `kis` 2.2~2.3s(starvation 해소) |
| **store throw** | `store.test.ts [AC-6]` + `[kv][AC-6] UpstashKisStore throw` | redis throw → degrade=true·get null·즉시 직접발급 green |
| **malformed JSON in store** | `UpstashKisStore.get` | 문자열이면 `JSON.parse` try/catch → 실패 시 raw 반환(throw 0) |
| **TTL 만료** | `store.test.ts MemoryKisStore TTL 만료 시 null` | green |
| **음수 TTL 방지** | `token.ts:204 Math.max(1, ...)` | 음수 시 최소 1s |
| **폴링 도중 store degrade** | `token.ts:232 if (storeDegraded) break` | 폴링 중 장애 시 즉시 중단→직접발급(누적 지연 방지) |
| **시크릿 로깅** | `git grep console.*(token\|appKey\|appSecret) lib/api/kis/` | 0건 |
| **BFF 원칙** | `git grep -nE "http://127\.0\.0\.1" -- app/` | whitelist/workbench fallback 3건(허용 예외, 본 PR 미변경). 신규 위반 0 |
| **한글 톤** | store/index-store/token 사용자 노출 문구 | 토큰 에러 한글 유지. store 모듈 사용자 노출 문구 0(인프라). 라이브 kv-down 전부실패 시 indices 한글 502("지수 정보를 불러오지 못했어요…") |

---

## 4. 라운드트립 (라이브)

> BE(FastAPI) 무관 트랙 → KIS prod 라이브. dev 서버 본인 기동·검증 후 종료. UI 변경 0(PRD §4) → 뷰포트 2분할 불요.

### 시나리오 A — memory 모드(기본, store 미설정 = 머지 직후 prod 실상태)
- dev(PORT 3468, KIS prod). ticker **200 `mixed` 0.56s**, indices **200 `kis` `X-Cache: miss` 0.21s**. **memory 무회귀 라이브 확인 ✅**

### 시나리오 B — kv 모드 + Upstash 다운(`:9999`, fail-soft, **직전 실패 시나리오 재현**)
- dev(PORT 3467, `KIS_TOKEN_STORE=kv KV_REST_API_URL=http://127.0.0.1:9999`).
- 콜드 indices-first **200 `kis` 2.28s** ✅ (직전 500/5.16s → 해소)
- 콜드 ticker-first **200 `kis` 2.33s** (5종 실값) ✅ (직전 mock-timeout/5.02s → 해소)
- warm ticker **200 `kis` 1.44s**, warm indices **200 `kis` cache hit 0.01s** ✅
- 앱 크래시 0, mock-timeout/500 0. 판정: **fail-soft 해소 — AC-6 PASS**

---

## 5. 결론

- **PASS**: AC-1·2·3·4·5·6·7·8 (8건 전부). 직전 blocking 이던 AC-6 fail-soft starvation 이 commit `f45f592`(degrade 신호 short-circuit + 폴링 bound)로 해소.
- memory 무회귀(라이브 200 `kis`)·분산 single-flight(폴링 무회귀 포함)·시크릿 안전·품질 게이트(181/181·build·typecheck·lint) 전부 충족.
- **판정: qa-passed** — 머지 가능. (실 Upstash 프로비저닝은 PR `## 다음 작업` 의 사용자 작업; 미설정 머지여도 memory 폴백으로 정상.)

---

산출물: docs/qa/kis-token-store.md | 판정: qa-passed | 실패 0건 (직전 AC-6 해소)
