# 인스턴스 간 공유 store 옵션 — KIS 토큰 + 지수 시세 캐시

> **목적**: Vercel serverless(Hobby) 다중 인스턴스 환경에서 KIS access token을 1개로 공유하고,
> `fetchIndexPrice` 결과를 짧은 TTL로 크로스-라우트 공유 캐시하기 위한 영속 store 옵션 리서치.
> **결론 우선**: 추천 = **Upstash Redis (Vercel Marketplace 통합)**. 무료 티어로 우리 규모는 충분. 분산 single-flight는 `SET NX PX` 락.
>
> - 갱신일: **2026-05-30**
> - 범위: 리서치/설계 스케치만. **코드 구현 없음** (의사코드 수준).
> - 관련 코드: `lib/api/kis/token.ts` (현재 per-instance 메모리 + single-flight, `KIS_TOKEN_STORE` 토글 placeholder)

---

## 1. 배경 — 왜 공유 store가 필요한가

현재 `lib/api/kis/token.ts`:

- 캐시 위치 = **인스턴스 메모리 only** (`Map<key, CacheEntry>` + `inflight: Map<key, Promise>`).
- key = `${env}:${appKey}`. single-flight = 인스턴스 내부 Promise dedupe.
- `KIS_TOKEN_STORE` ("memory" | "kv") 환경변수 토글만 박혀 있고 실 구현은 memory.

문제:

1. **토큰 발급제한**: Vercel serverless는 트래픽에 따라 인스턴스가 여러 개 뜬다(cold start마다 새 메모리). 각 인스턴스가 독립적으로 `/oauth2/tokenP`를 호출 → KIS는 동일 appkey에 대해 **토큰 발급 분당 제한(1분 1회 권장)**이 있어, 다중 사용자/다중 인스턴스 시 `EGW00133`류 발급 제한 오류 위험.
2. **single-flight가 인스턴스 경계를 못 넘음**: 현재 Promise dedupe는 같은 인스턴스 안에서만 유효. 인스턴스 A·B·C가 동시에 cache miss면 각자 1번씩 발급 → 합산 3번.
3. **지수 시세 중복 조회**(A 트랙 q1/q2 후속): `/api/market/ticker`와 `/api/market/indices`가 각각 코스피·코스닥을 조회 → 같은 코드를 라우트별로 중복 호출. 짧은 TTL 공유 캐시로 dedup 가능.

목표 B: **인스턴스 간 공유 영속 store**에 토큰 1개 + 지수 결과(짧은 TTL)를 둔다.

---

## 2. 옵션 비교

### 2.1 Vercel KV는 더 이상 없다 (확정 사실)

- Vercel은 자체 KV(`@vercel/kv`)를 **종료**했고, 기존 KV store는 **2024년 12월 Upstash Redis로 자동 이전**됨.
- 신규 프로젝트는 **Marketplace에서 Redis 통합을 설치**하는 것이 2026 현재 유일한 공식 경로.
  - Vercel 대시보드 → Storage / Marketplace(category=storage, search=redis) → 제공자 선택 → 프로비저닝 → 자격증명이 프로젝트 env로 자동 주입.
- 즉 "Vercel KV"라는 별도 제품을 새로 켤 수 없고, **외부 제공자(Upstash, Redis Cloud 등)를 Marketplace로 연결**하는 구조.

### 2.2 옵션 비교표

| 항목 | **Upstash Redis** (추천) | Redis Cloud (Marketplace) | self-host Redis (직접) | (참고) 메모리 only 현행 |
|---|---|---|---|---|
| 무료 한도 | **500K commands/월**(~16K/일), **256MB** 데이터, 요청 최대 10MB | 무료 **30MB** 티어 | 인프라 비용만 | 무료(공유 X) |
| serverless/Edge 호환 | **HTTP/REST 기반 → 완전 호환** (Edge, Node, Workers, Lambda) | 기본 RESP/TCP — serverless에서 connection pooling 이슈, Edge 부적합 | TCP → Vercel serverless에서 연결 관리 부담 | N/A |
| Vercel 연동 | Marketplace **native 통합**, env 자동 주입, 통합 빌링 | Marketplace 통합 제공 | 없음(수동 env) | 없음 |
| 한국 리전 | **Seoul 없음**. 최근접 = **Tokyo `ap-northeast-1`** (확인 필요: Global DB로 read region 추가 가능) | (확인 필요) Tokyo 가능 추정 | 원하는 곳에 직접 | N/A |
| 운영 부담 | 매우 낮음(완전 관리형) | 낮음(관리형) | **높음**(직접 운영·HA·백업) | 없음 |
| Edge middleware 접근 | 가능(fetch 기반) | 어려움 | 어려움 | N/A |

> 비고: `@upstash/redis`는 RESP가 아니라 **HTTPS REST**로 통신 → `fetch` 가능한 모든 런타임에서 동작. Vercel Edge Function/Middleware, Cloudflare Workers(`@upstash/redis/cloudflare`), Node route handler 모두 OK. 우리는 토큰/지수 캐시를 **Node route handler**에서 주로 읽지만, 추후 Edge middleware에서도 접근 가능하다는 점이 장점.

### 2.3 추천: **Upstash Redis (Vercel Marketplace 통합)** — 이유

1. **Vercel KV의 사실상 후계**이자 Vercel이 마이그레이션 대상으로 지정한 공식 경로. 마찰 최소.
2. **REST/HTTP 기반**이라 serverless·Edge에 네이티브 적합(TCP 연결 풀 문제 없음). KIS 호출이 일어나는 route handler에서 그대로 사용.
3. **무료 티어가 우리 규모에 충분**(아래 §3 계산).
4. **운영 부담 0**(완전 관리형) + Vercel 대시보드에서 클릭 몇 번으로 env 자동 주입.
5. self-host(일반 Redis)도 가능하지만, 현재 read-only/조회 전용 + Vercel Hobby 배포 컨텍스트에서 운영 부담 대비 이득 없음. 자체호스팅 전환 시에는 `UPSTASH_REDIS_REST_*` 대신 일반 Redis URL로 어댑터를 바꾸면 됨(설계상 store 추상화로 흡수).

---

## 3. 무료 티어 충분성 검토

Upstash Free: **500K commands/월** (≈ 16,000~17,000 commands/일), 256MB, 최대 10K commands/초.

우리 사용량 추정:

- **토큰**: 정상 동작 시 store는 거의 **읽기(GET)만** 일어남. 24h TTL이므로 발급(SET)은 하루 ~1회. 라우트 핸들러가 매 요청 토큰 GET을 한다 해도, 캐시 전략에 따라 인스턴스 메모리 L1 + store L2 2계층으로 두면 store GET은 인스턴스당 토큰 만료/콜드스타트 시에만 발생 → 매우 적음.
- **지수 캐시**: TTL ~30s. 코스피·코스닥 2종 기준 최악의 경우라도 30초마다 SET ~2회 + 요청마다 GET. 분당 GET이 트래픽에 비례하지만, 30s 캐시 hit이 대부분이라 KIS 호출은 분당 ~4회로 수렴(2종 × 2라우트가 1종 1콜로 dedup).

결론: **개인/소규모 다중 사용자 수준에서 500K/월은 넉넉**. 트래픽이 폭증해 GET이 분당 수천 건이 되면 그때 유료 검토. (확인 필요: 실제 동시 사용자 규모 — PRD OPEN QUESTION.)

---

## 4. 추천 조합 설계 스케치 (의사코드 — 구현 X)

### 4.1 필요한 env

Marketplace Upstash 통합 시 Vercel이 자동 주입하는 변수는 **`KV_REST_API_URL` / `KV_REST_API_TOKEN`** (Vercel KV 호환 네이밍). `@upstash/redis`의 `Redis.fromEnv()`는 기본적으로 **`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`**을 읽으므로, 둘 중 하나로 정렬 필요:

- 방법 A: `Redis.fromEnv()` 대신 명시 생성 — `new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })`.
- 방법 B: Vercel 프로젝트 env에 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`를 별도로 추가(자동 주입된 값 복사).

기존 토글과의 정합:

```
KIS_TOKEN_STORE = "memory" | "kv"   # 기존 placeholder 유지
# "kv" 일 때 아래를 사용
UPSTASH_REDIS_REST_URL    (또는 KV_REST_API_URL)
UPSTASH_REDIS_REST_TOKEN  (또는 KV_REST_API_TOKEN)
```

> (확인 필요) 자동 주입 변수명이 프로젝트/통합 버전에 따라 `KV_REST_API_*`인지 `UPSTASH_REDIS_REST_*`인지 — 실제 연결 후 Vercel 대시보드 env 목록에서 확정. PRD에서 "방법 A vs B 중 택1"을 결정.

### 4.2 키 네이밍 + TTL

| 용도 | 키 | TTL | 값 |
|---|---|---|---|
| 토큰 | `kis:token:{env}:{appkeyhash}` | KIS `expires_in` − grace(60s) ≈ 24h−60s | `{ token, expiresAt }` (JSON) |
| 토큰 발급 락 | `kis:token:lock:{env}:{appkeyhash}` | 짧게(예: 10s, PX) | 락 소유자 토큰(랜덤 uuid) |
| 지수 시세 | `kis:index:{code}` (예: `kis:index:0001`=코스피, `kis:index:1001`=코스닥) | ~30s | `{ price, change, ... , cachedAt }` |

- `{appkeyhash}` = appKey를 그대로 키에 넣지 않고 **해시**(SHA-256 prefix 등)해서 키에 노출/로깅 위험 줄임. (현행 메모리 키는 `${env}:${appKey}`였음 → store로 갈 때 해시 권장.)
- `{env}` = `vts`(모의) / `prod`(실전) 분리 — cross-contamination 차단(현행 설계 유지).
- 지수 코드 매핑값은 KIS 업종 코드 컨벤션 따름(확인 필요: 0001/1001 매핑 — `reference_kis-api-conventions` 참조).

### 4.3 2계층 캐시 + 분산 single-flight (토큰)

핵심: 여러 인스턴스가 동시에 miss여도 **발급 1회로 수렴**. `SET NX PX` 락 + 짧은 재시도(폴링).

```
async function getAccessToken():
  # L1: 인스턴스 메모리 (현행 cache Map 그대로 유지 — store 왕복 절약)
  if memoryCache fresh: return memoryCache.token

  # L2: 공유 store
  entry = redis.get("kis:token:{env}:{hash}")
  if entry and entry.expiresAt - GRACE > now:
      memoryCache = entry            # L1 갱신
      return entry.token

  # MISS → 분산 락 시도
  lockKey   = "kis:token:lock:{env}:{hash}"
  lockToken = uuid()
  got = redis.set(lockKey, lockToken, { nx: true, px: 10_000 })   # 10s 락

  if got == "OK":
      try:
          token = issueToken()                 # 실제 /oauth2/tokenP 호출 (1회)
          entry = { token, expiresAt }
          redis.set("kis:token:{env}:{hash}", JSON, { ex: ttlSeconds - graceSeconds })
          memoryCache = entry
          return token
      finally:
          # 안전 해제: 내가 잡은 락일 때만 DEL (Lua compare-and-del)
          releaseLockIfOwner(lockKey, lockToken)
  else:
      # 락 못 잡음 = 다른 인스턴스가 발급 중 → 짧게 폴링하며 store 재조회
      for i in range(maxRetries):       # 예: 50ms 간격 × 최대 ~2s
          sleep(50ms)
          entry = redis.get("kis:token:{env}:{hash}")
          if entry fresh: memoryCache = entry; return entry.token
      # 끝까지 못 받으면: (정책 결정 필요) 직접 발급 fallback or 에러
```

- **single-flight 본질**: 락을 잡은 1개 인스턴스만 KIS 호출, 나머지는 store가 채워질 때까지 대기 후 같은 토큰 사용.
- **락 안전 해제**: TTL(PX 10s)로 데드락 방지 + 해제 시 Lua `if get==owner then del`로 내 락만 삭제(다른 인스턴스 락 오삭제 방지).
- **인스턴스 내부 dedupe**(현행 `inflight` Promise Map)는 **그대로 유지** → 같은 인스턴스의 동시 요청은 store/락 왕복도 1번으로 묶음. (분산 락은 인스턴스 "간" 수렴, inflight는 인스턴스 "내" 수렴 — 2단.)

> Redlock(멀티 노드) 까지는 불필요. 단일 Upstash DB + 단일 락 키로 충분(토큰 발급은 가끔 발생하고, 중복 발급이 드물게 1~2회 새도 치명적이지 않음 — 락은 "줄이기"가 목표). (확인 필요: KIS 발급 제한이 정확히 분당 몇 회 허용인지 → 락 TTL/재시도 파라미터 튜닝 근거.)

### 4.4 지수 캐시 (크로스-라우트 dedup)

```
async function fetchIndexPriceCached(code):
  hit = redis.get("kis:index:{code}")
  if hit: return hit                              # 30s 내 다른 라우트가 채운 값 재사용

  data = fetchIndexPrice(code)                    # 실제 KIS 호출
  redis.set("kis:index:{code}", JSON, { ex: 30 }) # 짧은 TTL
  return data
```

- 지수는 **stampede가 토큰만큼 치명적이지 않음**(살짝 중복 호출돼도 데이터는 동일) → 락 없이 TTL만으로 시작, 필요 시 토큰과 같은 락 패턴 추가.
- `/api/market/ticker`·`/api/market/indices`가 동일 `kis:index:{code}` 키를 공유 → 30s 윈도우 안에서 코스피/코스닥 1콜로 수렴(A 트랙 q1/q2 후속 목표 달성).
- (확인 필요) 30s가 적정 TTL인지 — 헤더 티커 갱신 주기 vs 신선도 trade-off. PRD에서 결정.

### 4.5 store 추상화 (기존 토글과의 맞물림)

`KIS_TOKEN_STORE`로 분기되는 얇은 인터페이스를 두고, `token.ts`는 인터페이스에만 의존:

```
interface TokenStore {
  get(key): Promise<Entry|null>
  set(key, entry, ttlSec): Promise<void>
  acquireLock(key, ttlMs): Promise<lockToken|null>
  releaseLock(key, lockToken): Promise<void>
}

KIS_TOKEN_STORE == "memory" → 현행 Map 구현(락은 inflight Promise로 대체, no-op 분산락)
KIS_TOKEN_STORE == "kv"     → Upstash 구현(@upstash/redis, 위 SET NX 락)
```

- 장점: 로컬/테스트는 `memory`, prod는 `kv`. 현행 `resetTokenCacheForTest()`·fetcher 주입 테스트 구조 유지.
- self-host Redis 전환 시 `kv` 구현만 일반 Redis 클라이언트로 교체(인터페이스 불변).
- L1 메모리 캐시는 어느 모드든 유지(store 왕복 절감) — `kv` 모드에서 메모리는 "store의 단기 미러".

---

## 5. 프로비저닝 절차 (사용자 대시보드 작업)

1. Vercel 대시보드 → 해당 프로젝트(`trading-signal-frontend`) → **Storage** 탭(또는 Marketplace, category=storage & search=redis).
2. **Upstash for Redis** 선택 → Install/Connect.
3. DB 생성: **리전 = Tokyo `ap-northeast-1`**(한국 최근접), 타입 = (단일 리전이면 Regional; 글로벌 필요 시 Global) 선택. (확인 필요: Global DB로 read region 추가가 레이턴시에 의미 있는지 — 우리는 서버사이드 단일 호출이라 Regional Tokyo로 충분할 가능성 높음.)
4. 프로젝트에 **Connect** → Vercel이 env 자동 주입(`KV_REST_API_URL`/`KV_REST_API_TOKEN` 또는 `UPSTASH_REDIS_REST_*`). Production/Preview 환경 선택.
5. **로컬 연동**: `vercel env pull .env.local` 로 주입된 변수를 로컬에 내려받음. (또는 Upstash 콘솔에서 REST URL/TOKEN 복사해 `.env.local`에 수동 기입.)
6. 재배포 → route handler에서 `Redis.fromEnv()` 또는 명시 생성으로 접근.
7. `KIS_TOKEN_STORE=kv`를 Production env에 설정(로컬은 `memory` 유지 가능).

---

## 6. OPEN QUESTION 후보 (PRD가 결정)

1. **실제 동시 사용자/트래픽 규모** → 무료 티어(500K/월) 충분성 최종 판정 근거. (현재는 충분 추정.)
2. **자동 주입 env 변수명** = `KV_REST_API_*` vs `UPSTASH_REDIS_REST_*` → §4.1 방법 A/B 택1.
3. **KIS 토큰 발급 제한 정확 수치**(분당 허용 횟수/오류코드) → 락 TTL(10s?)·재시도(50ms×?) 파라미터 + "락 실패 시 fallback 발급 허용 여부".
4. **지수 캐시 TTL 30s 적정성** → 헤더 티커 갱신 주기와 신선도 trade-off.
5. **리전 Regional(Tokyo) vs Global** → 우리 호출 패턴(서버사이드 단일)에서 Global의 이점 여부.
6. **지수 캐시에도 분산 락이 필요한가** → 우선 TTL만, 중복 호출이 KIS 제한에 닿으면 락 추가.
7. **store 장애 시 degrade 정책** → Upstash 다운 시 메모리 fallback(=현행 동작)으로 graceful degrade 할지.
8. **appKey 해싱 방식**(키 노출/로깅 안전) → SHA-256 prefix 길이 등.

---

## 출처 (2026-05-30 확인)

- [Redis on Vercel — Vercel Docs](https://vercel.com/docs/redis) (Vercel KV 종료·2024-12 Upstash 이전·Marketplace 경로, last_updated 2026-01-13)
- [Upstash for Vercel — Marketplace](https://vercel.com/marketplace/upstash)
- [Vercel - Upstash Redis Integration — Upstash Docs](https://upstash.com/docs/redis/howto/vercelintegration) (env 주입 `KV_REST_API_URL`/`KV_REST_API_TOKEN`, `Redis.fromEnv()`)
- [Pricing & Limits — Upstash Docs](https://upstash.com/docs/redis/overall/pricing) (Free 500K cmd/월, 256MB, 요청 10MB, 10K cmd/s)
- [New Pricing and Increased Limits for Upstash Redis — Upstash Blog](https://upstash.com/blog/redis-new-pricing) (500K/월로 상향)
- [Deployment — Upstash TS SDK Docs](https://upstash.com/docs/redis/sdks/ts/deployment) (Edge/Workers/Node/Lambda HTTP 호환)
- [Distributed Locks with Redis — Redis Docs](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) (SET NX PX + Lua compare-and-del)
- [Cache Stampede Prevention — antirez/Redis](https://redis.antirez.com/fundamental/cache-stampede-prevention.html) (thundering herd 락 패턴)
- [Storage on Vercel Marketplace — Vercel Docs](https://vercel.com/docs/marketplace-storage) (Redis Cloud 등 대안)
- 리전: Upstash 리전 목록에 `ap-northeast-1`(Tokyo) 포함, **Seoul 미지원** — [Upstash regions / Fly.io 문서](https://fly.io/docs/upstash/redis/)
