# PRD — KIS 토큰·지수 인스턴스 간 공유 store (kis-token-store)

> 상태: ready (OPEN QUESTION 8건 전부 RESOLVED) · 작성 2026-05-30 · 결정 반영 2026-05-30
> UI 변경: **없음** (서버 측 데이터/인프라 계층 only). UX/UI 디자이너 합류 **불요**.
> 단일 PR. 외부 의존 `@upstash/redis` 1건 추가.
> **트랙 중심: token store(robustness 핵심).** 지수 store 는 부수 — PR 라인 과대 시 후속 분리 가능(§3.6).

---

## 1. 배경 / 문제

`lib/api/kis/token.ts` 의 access token 캐시는 **인스턴스 메모리 only** 다. `KIS_TOKEN_STORE = "memory" | "kv"` 토글 인터페이스만 박혀 있고 `kv` 는 미구현(placeholder). Vercel serverless 는 트래픽에 따라 인스턴스가 여러 개 뜨고(콜드 스타트마다 새 메모리), 각 인스턴스가 독립적으로 `/oauth2/tokenP` 를 호출한다.

코드로 확인한 현황(2026-05-30, rate-limit 재점검 B 항목):

| # | 대상 | 현 구조 | 한계 |
|---|------|---------|------|
| 1 | 토큰 캐시 | `cache: Map<key, {token, expiresAt}>` + `inflight: Map<key, Promise>` (`lib/api/kis/token.ts:46-47`) | **인스턴스 메모리 only**. key = `${env}:${appKey}` (`:101`). single-flight = 인스턴스 내부 Promise dedupe(`:110-126`) — **인스턴스 경계를 못 넘음** |
| 2 | 지수 라우트 캐시 | `app/api/market/ticker/route.ts` (소스별 TTL 30s/10분/3분) + `app/api/market/indices/route.ts` (국내 30s). 둘 다 모듈 레벨 `Map` | **인스턴스 메모리 only**. 두 라우트가 같은 `0001`/`1001`(코스피/코스닥)을 각자 캐시 → **크로스-라우트/크로스-인스턴스 dedup 없음** |

문제의 두 축:

- **토큰 발급제한**: KIS 는 동일 appkey 에 대해 토큰 발급 횟수 제한(분당 권장 1회, 초과 시 `EGW00133` 류)이 있다. 인스턴스 A·B·C 가 동시에 cache miss 면 각자 1번씩 발급 → 합산 3번. 다중 사용자/콜드 스타트 다발 시 발급 제한에 걸려 토큰 발급이 막히면 KIS 호출 전체가 실패하고 홈이 mock degrade 로 떨어진다(콜드스타트 SPX drop 사례 기록 있음).
- **지수 중복 조회**(A 트랙 `market-indices-consolidation` §9 q2 이연분): 헤더 티커(`/api/market/ticker`)와 주요지수 카드(`/api/market/indices`)가 같은 코스피/코스닥을 라우트별·인스턴스별로 중복 호출. 라우트 단위 in-memory 캐시는 같은 warm 인스턴스 안에서만 dedup 한다.

> 비즈니스 가치: prod 단일 실전계좌(72245021) 토큰으로 모든 KIS 호출이 나가므로, 토큰 발급 제한 1회 발생 시 앱 전체가 mock 으로 떨어진다. 인스턴스 간 공유 store 는 **토큰 발급을 인스턴스 수와 무관하게 사실상 1회로 수렴**시키고 지수 호출을 크로스-라우트/크로스-인스턴스로 dedup 한다. 추가 인프라(Upstash 무료 티어)만으로 콜드 진입 안정성을 크게 끌어올린다. 리서치(`docs/references/token-store-options.md`)는 추가 비용 0(무료 티어)으로 판단.

리서치 결론(`docs/references/token-store-options.md`): Vercel 자체 KV 는 2024-12 종료·Upstash Redis 로 자동 이전됨. 신규 프로젝트의 공식 경로는 **Marketplace Redis 통합**. 추천 = **Upstash Redis** — REST/HTTP 기반이라 serverless/Edge 네이티브(TCP 연결 풀 문제 없음), Vercel Marketplace native 통합(env 자동 주입), 무료 티어(500K cmd/월·256MB)가 우리 규모에 충분, 운영 부담 0.

---

## 2. 목표 (측정 가능)

- G1 — `KIS_TOKEN_STORE=kv` + Upstash env 설정 시, 여러 인스턴스가 동시에 토큰 cache miss 여도 **KIS `/oauth2/tokenP` 발급이 사실상 1회로 수렴**한다(분산 single-flight = `SET NX PX` 락 1인스턴스 발급 + 나머지 폴링). 인스턴스 내부 `inflight` dedupe 는 유지 → **2단(인스턴스 내 + 인스턴스 간) 수렴**.
- G2 — `fetchIndexPrice`/`fetchOverseasIndex` 결과가 `kv` 모드에서 **store 공유 캐시**(TTL ~30s)를 거쳐, 헤더 티커 라우트와 indices 라우트가 같은 `0001`/`1001` 을 **크로스-라우트/크로스-인스턴스로 dedup** 한다(같은 TTL 윈도우 안에서 코드당 KIS 호출 1회로 수렴).
- G3 — **store 장애 fail-soft**: Upstash 미설정·타임아웃·에러 시 **현행 인메모리 동작으로 graceful degrade**(앱이 안 깨지고 KIS 호출은 계속됨). store 는 최적화일 뿐 SPOF 아님.
- G4 — `KIS_TOKEN_STORE=memory`(기본/로컬·store 미설정 시) 일 때 **현행 동작 무회귀** — 기존 `lib/api/kis/__tests__/token.test.ts` 7 케이스 + indices/ticker 라우트 테스트가 그대로 green.
- G5 — appKey 가 store 키·로그에 **평문 노출 0건**(키는 appKey 해시). prod/vts env 분리는 키에 보존(cross-contamination 차단).
- G6 — `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` 모두 통과. `@upstash/redis` 의존이 `package.json`/lockfile 에 1건 추가되고 서버 측에서만 import(브라우저 번들 0).

---

## 3. 범위 (In scope)

> **트랙 우선순위**: **§3.2 token store(2단 공유 캐시 + 분산 single-flight)가 본 트랙의 핵심**(robustness — 토큰 발급 제한 회피로 앱 전체 mock degrade 방지). §3.3 지수 store 는 부수 가치(크로스-라우트 dedup)로, 본 PR 에 함께 넣되 PR 라인이 과대해지면 후속 PRD 로 분리 가능(§3.6, q7 RESOLVED). §3.4 fail-soft 는 token·지수 양쪽을 덮는 **최상위 안전장치**.

### 3.1 store 추상화 — `KIS_TOKEN_STORE` 토글 (G1·G3·G4)

- 얇은 store 인터페이스를 두고 `token.ts`(및 지수 캐시)가 인터페이스에만 의존하게 한다. 위치는 `docs/rules/frontend.md` §폴더(도메인 한 뎁스)에 맞춰 `lib/api/kis/` 하위에 둔다(예: `lib/api/kis/store.ts` — 인프라성 단일 모듈, barrel 미사용).
- 최소 인터페이스(리서치 §4.5):
  ```
  interface KisStore {
    get<T>(key): Promise<T | null>
    set<T>(key, value, ttlSec): Promise<void>
    del(key): Promise<void>
    acquireLock(key, ttlMs): Promise<string | null>   // SET NX PX → 락 토큰(uuid) or null
    releaseLock(key, lockToken): Promise<void>          // Lua compare-and-del(내 락만 삭제)
  }
  ```
- `KIS_TOKEN_STORE` 분기:
  - `"memory"`(기본, 미설정 시 폴백) → 현행 `Map` 기반. 분산 락은 no-op(인스턴스 내 `inflight` Promise 가 single-flight 담당). **로컬·테스트 기본 경로**.
  - `"kv"` → Upstash 구현(`@upstash/redis` REST SDK, serverless/Edge 호환). `SET NX PX` 락 + Lua compare-and-del.
- `@upstash/redis` 는 **서버 측에서만** import(KIS client.ts 와 동일 경계 — 브라우저 import 금지, route handler/서버 모듈에서만).
- 현행 테스트 가능성 구조 유지: `getAccessToken` 의 fetcher/now 옵션 주입, `resetTokenCacheForTest()`. store 모드 테스트를 위해 fake store 주입 또는 `memory` 모드 고정이 가능해야 한다.

### 3.2 토큰 2단 공유 캐시 + 분산 single-flight (G1)

- 키: `kis:token:{env}:{appkeyhash}`. `{appkeyhash}` = appKey 해시(평문 금지, G5). `{env}` = `vts`/`prod` 분리(현행 키 설계 보존).
- TTL = KIS `expires_in` − grace(현행 `GRACE_PERIOD_MS=60_000` 정합) → 만료 직전 갱신.
- 조회 흐름(리서치 §4.3):
  1. **L1 인스턴스 메모리**(현행 `cache` Map) fresh → 즉시 반환(store 왕복 절약).
  2. **L2 store** `get` → fresh 면 L1 갱신 후 반환.
  3. MISS → 분산 락(`SET NX PX`, **락 TTL = 10s**, q5) 시도. 잡으면 해당 인스턴스만 `/oauth2/tokenP` 발급 → store `set` + L1 갱신 + 락 해제(finally, compare-and-del). 못 잡으면 짧게 폴링(**50ms 간격 × 최대 ~2s**, q5)하며 store 재조회, 끝까지 못 받으면 **직접 발급 fallback**(q3 RESOLVED — 가용성 우선, fail-soft 정합. 드물게 중복 발급 1회는 허용).
- **인스턴스 내부 `inflight` Promise dedupe 유지** → 같은 인스턴스의 동시 요청은 store/락 왕복도 1번으로 묶음(2단 수렴).

### 3.3 지수 공유 캐시 — 크로스-라우트 dedup (G2, 부수 — 분리 가능)

> 부수 트랙. 본 PR 에 포함하되 PR 라인 과대 시 후속 PRD 로 분리 가능(§3.6, q7 RESOLVED ③). token store 가 본 트랙 핵심.

- **store 캐시 범위 = 우선 국내(`0001` 코스피 / `1001` 코스닥)부터**(q7 RESOLVED ① — 중복이 가장 잦은 코드). 해외/BTC 는 현행 라우트 인메모리 TTL 유지(store 캐시는 국내 우선, 전 소스 확대는 후속).
- 키: `kis:index:{code}`(예 `0001`/`1001`). **국내 store TTL = 30s 확정**(q4 RESOLVED — `queryConfig.market.indices.staleTime`·ticker 국내분·`market-indices-consolidation` 정합. **단일 진실 원천**). 해외 10분/BTC 3분은 현행 라우트 값 유지(store 캐시 미적용 범위).
- `fetchIndexPrice` 결과를 store 에 캐시(국내) → 헤더 티커·indices 라우트가 같은 키를 공유해 크로스-라우트/크로스-인스턴스 dedup.
- **A 트랙 라우트단 인메모리 캐시와의 관계 = L1 라우트 인메모리 + L2 store 병행**(q7 RESOLVED ② — 토큰 2단 캐시와 동일 패턴으로 store 왕복을 줄이고, store 장애 시에도 라우트 캐시가 살아 fail-soft 와 정합. store 승격/라우트 캐시 제거 안 함).
- 지수는 stampede 가 토큰만큼 치명적이지 않음(중복돼도 데이터 동일) → **TTL 만, 분산 락 없음**(q6 RESOLVED). EGW00201(초당 제한) 관찰 시 토큰과 같은 락 패턴 추가 — 후속.

### 3.4 store 장애 fail-soft (G3, 최상위 안전장치)

> **token·지수 양쪽을 덮는 최상위 안전장치.** store 는 최적화일 뿐 SPOF 가 아니다 — store 가 죽어도 앱은 인메모리로 정상 동작한다(재확인).

- Upstash 미설정/타임아웃/에러 시 **현행 인메모리 폴백**으로 graceful degrade. 앱이 안 깨지고 KIS 호출은 계속된다.
- store 호출 자체에 **짧은 타임아웃**(예: 수백 ms — 정확값 구현 시 결정)을 둬, store 지연이 토큰/지수 응답을 늘어지게 하지 않는다. 타임아웃·에러는 락 미획득과 동일하게 처리(인메모리 single-flight + **직접 발급 fallback**, q3 RESOLVED 정책 따름).
- store 에러는 throw 가 아니라 폴백 신호로 흡수(로그만 남기고 진행).
- 리전 = **Regional Tokyo**(`ap-northeast-1`, q5 RESOLVED) — 서버사이드 단일 호출이라 Global 이점 미미.

### 3.5 시크릿 / env (G5, G6)

- Upstash 연결 env(서버 전용, `NEXT_PUBLIC_` 금지). **변수명 규약 = 방법 A 명시 생성**(q2 RESOLVED): `new Redis({ url: KV_REST_API_URL ?? UPSTASH_REDIS_REST_URL, token: KV_REST_API_TOKEN ?? UPSTASH_REDIS_REST_TOKEN })` 로 두 네이밍(Vercel Marketplace 통합 버전별 `KV_REST_API_*` / `UPSTASH_REDIS_REST_*`) **모두 흡수**. `Redis.fromEnv()` 의 변수명 가정에 묶이지 않아 통합 버전 변동에 강함. 실제 주입 변수명은 연결 후 Vercel env 목록에서 확정해 `.env.local.example` 에 반영.
- `.env.local.example` 갱신: 기존 `KIS_TOKEN_STORE=memory`(56-57행) placeholder 주석을 실 구현 안내로 바꾸고, Upstash 연결 변수(두 네이밍 모두 안내) + "미설정 시 memory 폴백" 을 명시.
- appKey 는 키·로그에 평문 금지(해시). **해싱 방식 = SHA-256 hex 앞 16자**(q8 RESOLVED): `crypto.createHash('sha256').update(appKey).digest('hex').slice(0,16)`. 충돌 무시 가능 + 키 길이 단축 + 평문 노출 0 + 같은 appKey → 같은 해시(키 안정성).

### 3.6 분할 vs 단일 — 토큰 store 와 지수 store 묶음 여부

- 본 PRD 는 **단일 트랙**으로 토큰 store + 지수 store 를 함께 다룬다(둘 다 같은 store 추상화/fail-soft 인프라 위, q7 RESOLVED ③ — 본 PR 에 포함). **단 토큰 store 가 본 트랙 핵심**(robustness)이고 지수 store 는 부수이므로, **구현 중 PR 라인이 과대해지면 지수 store(§3.3·커밋 3)를 후속 PRD 로 분리**한다(토큰 store 만으로도 트랙 목표 달성). 지수 store 범위는 국내(`0001`/`1001`) 우선, L1 라우트 인메모리 + L2 store 병행(§3.3).

### 3.7 인프라 티어 (q1 RESOLVED)

- **Upstash 무료 티어(Free, 500K cmd/월·256MB)로 시작**(q1 RESOLVED — 개인/소규모, 앱 비밀번호 게이트로 접근 제한된 소수). L1 메모리 캐시가 store GET 대부분을 흡수해 한도 여유 큼. 초과 신호(429/한도 경고) 관찰 시 유료 검토 — 본 PRD 비범위(§4).
- **프로비저닝은 사용자 작업**: 구현 머지 후 Vercel Marketplace 에서 Upstash Redis 통합(Regional Tokyo) 연결 + env 주입. 미설정 상태로 머지돼도 `memory` 폴백으로 정상(G3·G4).

---

## 4. 비범위 (Out of scope)

- **UI 변경 0건** — 본 트랙은 서버 측 데이터/인프라 계층만. 화면·컴포넌트·카피·디자인 토큰 무변경.
- **주문/매매 API** — 영구 미구현 정책 유지(`lib/api/kis/index.ts` 안전 경계). 토큰 store 는 조회 토큰에만 적용.
- **Redlock(멀티 노드 분산 락)** — 단일 Upstash DB + 단일 락 키로 충분(토큰 발급은 가끔 발생, 드물게 1~2회 중복 발급돼도 치명적이지 않음 — 락은 "줄이기"가 목표). 리서치 §4.3.
- **헤더 티커 ↔ indices 라우트의 응답 shape 통합**(`MarketTicker` 표시 문자열 vs `MarketIndexQuote` 수치 모델) — `market-indices-consolidation` §4 와 동일하게 비범위. 본 트랙은 **소스 함수 결과를 store 로 dedup** 할 뿐 라우트 통합은 안 한다.
- **폴링/실시간 갱신·웹소켓** — 현행 staleTime + 수동 새로고침 유지.
- **self-host Redis 전환** — store 추상화로 흡수 가능하나 본 트랙은 Upstash(`kv`)만 구현. 전환은 `kv` 구현 교체로 후속.
- **무료 티어 초과 시 유료 전환·모니터링 대시보드 구축** — 트래픽 폭증 시 별도 검토(q1 RESOLVED — 무료 티어로 시작, 초과 관찰 시 후속).
- **Vercel Edge runtime 으로 이전** — store 는 Edge 호환이지만 현행 Node route handler 유지(이전은 별도 트랙).

---

## 5. 수용 기준 (AC)

각 항목은 재현 가능한 명령/검증 단위로 떨어진다.

- **AC-1 (store 추상화 존재)** — `git grep -n "KisStore\|acquireLock\|releaseLock" lib/api/kis/` 결과, store 인터페이스 + 락 메서드가 존재하고 `token.ts` 가 인터페이스에 의존(직접 `@upstash/redis` import 없이 store 모듈 경유). `git grep -n "KIS_TOKEN_STORE" lib/api/kis/` 에 `memory`/`kv` 분기가 코드(주석 아님)로 존재.
- **AC-2 (memory 무회귀, G4)** — `KIS_TOKEN_STORE=memory`(또는 store env 미설정) 에서 `npm run test` 시 `lib/api/kis/__tests__/token.test.ts` 7 케이스(#1~#7) + indices/ticker 라우트 테스트가 전부 green. 현행 `resetTokenCacheForTest`·fetcher/now 주입 인터페이스 보존(`git grep -n "resetTokenCacheForTest\|GetTokenOptions" lib/api/kis/token.ts`).
- **AC-3 (분산 single-flight, G1)** — `kv` 모드 테스트(fake store 주입)에서 **여러 동시 요청이 토큰 발급(fetcher)을 1회만** 트리거하고 나머지는 store 에서 같은 토큰을 받는다는 단언이 있고 `npm run test` green. `git grep -n "nx\|NX\|SET.*PX\|px:" lib/api/kis/` 로 `SET NX PX` 락 패턴 확인(락 TTL 10s·폴링 50ms×~2s, q5). 락 미획득·폴링 만료 시 **직접 발급 fallback** 으로 토큰을 받는다는 단언 포함(q3).
- **AC-4 (토큰 키 해시·env 분리, G5)** — `git grep -n "kis:token:" lib/api/kis/` 결과 키가 `kis:token:{env}:{hash}` 형태이고, appKey 가 평문으로 키/로그에 들어가지 않음(`git grep -n "createHash\|sha256\|appKey" lib/api/kis/store.ts` 류에 **SHA-256 hex 앞 16자** 해시 거쳐 사용, q8). vts/prod 키가 분리됨이 테스트로 검증(현행 token.test.ts #5 정합).
- **AC-5 (지수 store dedup, G2 — 부수, 분리 가능)** — 지수 store 가 본 PR 에 포함된 경우: `git grep -n "kis:index:" lib/api/kis/` 또는 라우트/소스에 **국내(`0001`/`1001`) 지수 store 키**가 존재(q7 ①). `kv` 모드에서 두 라우트 경로가 같은 코드를 30s TTL 윈도우 안에서 store hit 으로 공유(q4) — 테스트 또는 코드 리뷰로 검증. **L1 라우트 인메모리 + L2 store 병행**(q7 ② — 라우트 캐시 제거 0건). 지수 store 가 후속 분리된 경우 본 AC 는 후속 PRD 로 이월(token store AC-1~4·6~8 만으로 트랙 종료 가능).
- **AC-6 (fail-soft, G3)** — store 가 미설정/에러/타임아웃일 때 토큰·지수 조회가 **인메모리 폴백으로 성공**한다는 단언이 테스트에 있고 green(store throw → 앱 비정상 종료 0). `git grep -n "catch\|fallback\|timeout" lib/api/kis/store.ts` 류에 폴백/타임아웃 처리 존재.
- **AC-7 (env 문서, G5)** — `git grep -n "KIS_TOKEN_STORE\|UPSTASH\|KV_REST" .env.local.example` 결과, `KIS_TOKEN_STORE` 가 실 구현 안내로 갱신되고 Upstash 연결 변수(**방법 A — `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` 두 네이밍 모두 안내**, q2) + "미설정 시 memory 폴백" 주석 존재. 코드에 `new Redis({ url: ... ?? ..., token: ... ?? ... })` 명시 생성 패턴 존재(`git grep -n "?? .*UPSTASH\|?? .*KV_REST" lib/api/kis/`).
- **AC-8 (품질·의존, G6)** — `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` 모두 통과. `@upstash/redis` 가 `package.json` dependencies + lockfile 에 1건 추가(`git grep -n "@upstash/redis" package.json`). `@upstash/redis` import 가 서버 측 모듈에만 존재(브라우저 컴포넌트·`NEXT_PUBLIC_` 0건 — 코드 리뷰).

---

## 6. 가정 · 제약

- **선행 전제**: `home-market-redesign` PR2(시장 종합 홈, 현 main `26ca5e8`) + `market-indices-consolidation`(라우트 청크/인메모리 TTL 캐시) 머지됨. 본 트랙은 그 라우트 캐시 위에 store 계층을 얹는다(병행 또는 승격, q7).
- **BE LIVE / KIS 가정**: KIS 지수 API 는 prod 전용(이중 게이트 유지). 토큰 발급 제한 정확 수치(분당 허용·오류코드)는 미확정 → 락 TTL 10s/폴링 50ms×~2s 로 보수적 시작(q5 RESOLVED), 운영 관찰 후 튜닝.
- **store 는 최적화이지 정합성 보증이 아님**: 분산 락은 발급 중복을 "줄이기" 목표이고 드물게 1~2회 중복 발급은 허용(Redlock 불요). store 장애 시 인메모리로 degrade 하므로 store 다운이 기능 중단을 일으키지 않는다(G3).
- **무료 티어 충분 가정**: Upstash Free 500K cmd/월·256MB(q1 RESOLVED — 무료 티어로 시작). 토큰은 24h TTL 로 발급(SET) 하루 ~1회, 읽기는 L1 캐시로 흡수. 지수는 30s TTL 로 분당 소수 SET + 트래픽 비례 GET. 개인/소규모 다중 사용자 규모에서 넉넉(리서치 §3). 초과 신호 관찰 시 유료 검토(후속).
- **도구 가정**: Next.js App Router(Node route handler), `@upstash/redis` REST SDK(fetch 기반, Edge/Node 호환), axios(KIS), vitest. `@upstash/redis` 는 서버 전용 — `lib/api/kis/client.ts` 와 동일하게 브라우저 import 금지(ESLint 미감지 → reviewer 검토).
- **리전 가정**: Upstash Seoul 미지원, 최근접 Tokyo `ap-northeast-1`. **Regional Tokyo 확정**(q5 RESOLVED — 서버사이드 단일 호출이라 Global 이점 미미).
- **프로비저닝은 사용자 작업**(§3.7) — 구현 머지 후 안내. 미설정 상태로 머지돼도 `memory` 폴백으로 정상(G3·G4).

---

## 7. 참고

- 리서치(단일 진실): `docs/references/token-store-options.md` — 옵션 비교(§2)·무료 티어(§3)·2계층 캐시+분산 락 의사코드(§4.3)·지수 캐시(§4.4)·store 추상화(§4.5)·프로비저닝(§5)·OPEN Q 8건(§6)·출처.
- 대상 코드: `lib/api/kis/token.ts`(현 L1 캐시 + `inflight` single-flight — 확장 지점), `lib/api/kis/index-price.ts`·`overseas-index.ts`(지수 소스 함수 — store 캐시 래핑 대상), `lib/api/kis/client.ts`(`resolveKisEnv`·서버 전용 경계).
- 라우트(지수 캐시 병행/승격 대상): `app/api/market/ticker/route.ts`(소스별 TTL 캐시), `app/api/market/indices/route.ts`(국내 30s 캐시 + `resetIndicesCacheForTest`).
- env/문서: `.env.local.example`(56-57행 `KIS_TOKEN_STORE` placeholder), `lib/api/kis/README.md`(KIS_TOKEN_STORE 표).
- 테스트: `lib/api/kis/__tests__/token.test.ts`(7 케이스 — store 모드 추가 후에도 green 의무).
- 이연 출처: `docs/prd/market-indices-consolidation.md` §4·§9 q2(소스 레벨 캐시 + single-flight 를 B 트랙=본 PRD 로 이연).
- 컨벤션: `docs/rules/frontend.md`(폴더 도메인 한 뎁스 — `lib/api/kis/` 인프라 모듈, barrel 미사용), `AGENTS.md` BFF 원칙·라벨 흐름.
- 기억: KIS API 컨벤션(EGW00133 발급제한/EGW00201 초당제한/prod 안전장치), Vercel 연동 완료(앱 비밀번호 게이트 #48), 미룬 후속(intstock_multprice·소스 캐시).

---

## 8. 영향 분석 (Impact)

### 변경 라인 추정

| 파일 | 성격 | 추정 |
|------|------|------|
| `lib/api/kis/store.ts` (신규) | store 인터페이스 + memory/upstash 구현 + 락 + fail-soft 타임아웃 | +120~180 |
| `lib/api/kis/token.ts` | L2 store 조회 + 분산 락 single-flight 추가(L1·inflight 유지) | +50~90 |
| `lib/api/kis/index-price.ts`·`overseas-index.ts`(또는 래퍼) | store 캐시 래핑(국내 우선, 전 소스는 q7) | +30~60 |
| `app/api/market/ticker`·`indices/route.ts` | 라우트 캐시 ↔ store 병행/승격(q7 따라 가감) | +0~40 |
| `.env.local.example` + `README.md` | env 안내 갱신 | +15~25 |
| `lib/api/kis/__tests__/store.test.ts`·`token.test.ts` 보강 | fake store 분산 single-flight + fail-soft + 키 해시 단언 | +80~140 |
| `package.json`/lockfile | `@upstash/redis` 추가 | +의존 1 |

→ 합계 대략 +300~530 라인 + 외부 의존 1. 단일 도메인(`lib/api/kis/`) 응집, UI/디자이너 의존 0 → **단일 PR 적정**. **지수 store(부수)를 후속 PRD 로 분리하면** 토큰 store 만으로 ~+250~390 라인으로 축소(§3.6 — 구현 중 라인 과대 판단 시 분리).

### 커밋 분할 권고 (단일 PR 내부)

1. `feat(kis): store 추상화 + memory/upstash 구현 + fail-soft` — `store.ts` + `@upstash/redis` 의존 + store.test.ts.
2. `feat(kis): 토큰 2단 캐시 + 분산 single-flight(SET NX PX)` — `token.ts` + token.test.ts 보강.
3. `feat(kis): 지수 store 공유 캐시(국내 0001/1001 크로스-라우트 dedup)` — 소스/라우트(L1+L2 병행) + 테스트. **부수 — PR 라인 과대 시 후속 PRD 로 분리(생략)**.
4. `docs(kis): KIS_TOKEN_STORE 실구현 + Upstash env 안내(방법 A)` — `.env.local.example` + README.

> store 추상화(1) + 토큰 2단 캐시/분산 single-flight(2) 가 **본 트랙 핵심**(robustness). 지수(3)는 독립 가치의 부수로 커밋 분리하되 PR 은 하나(한 브랜치 한 PR 룰). 지수 store 를 후속 분리하면 커밋 3 은 생략되고 후속 PRD 로 이월.

### 회귀 위험

- **(상) 토큰 발급 회귀 — store 도입으로 발급이 막히거나 stale 토큰 반환**: 분산 락 데드락(락 잡고 발급 실패 후 미해제) → 다른 인스턴스 무한 폴링. 락 TTL(PX)로 데드락 방지 + finally compare-and-del 로 내 락만 해제(AC-3). 폴링 끝까지 실패 시 fallback 정책(q3).
- **(상) store 장애가 앱 전체 중단으로 전파**: G3 fail-soft 가 핵심 완화. store 호출 throw 를 폴백 신호로 흡수 + 짧은 타임아웃. AC-6 으로 단언.
- **(중) memory 모드 회귀**: store 분기 도입이 현행 `memory` 경로를 깨면 로컬·테스트 전부 실패. AC-2 로 기존 7 케이스 green 강제 + `memory` 가 기본값.
- **(중) 시크릿 노출**: appKey 평문이 store 키·로그에 들어가면 누설. 해시 강제(AC-4, q8). `@upstash/redis` 토큰이 브라우저 번들에 들어가지 않게 서버 전용 경계 유지(AC-8).
- **(저) 지수 store TTL staleness**: store TTL 동안 옛 지수 반환 — 라우트 인메모리 TTL 과 동일 값이라 체감 변화 미미. 라우트 캐시 ↔ store 2계층 시 TTL 정합 주의(q7).
- **(저) 무료 티어 초과**: 트래픽 폭증 시 cmd 한도 초과 → store 실패 → fail-soft 로 degrade(앱은 동작). q1 으로 규모 확인.

### 분할 vs 단일 결정

단일 도메인(`lib/api/kis/`) + UI 0건 + 디자이너 트리거 없음 + 외부 의존 1건 → **단일 PR**. token store 가 본 트랙 핵심이고 지수 store 는 부수이므로, **구현 중 PR 라인이 과대해지면 지수 store(커밋 3)를 후속 PRD 로 분리**(q7 RESOLVED ③ 단서). 분리 시 본 PR 은 token store(커밋 1·2·4)로 완결되고 모든 AC(1~4·6~8) 충족.

---

## 9. OPEN QUESTION

> 리서치(`docs/references/token-store-options.md` §6) 8건을 PRD 기준으로 재정렬. **2026-05-30 사용자 결정 — 8건 전부 PM 권고 채택. 전부 `[RESOLVED]`. §3/§4·§5·§6·§8 본문 반영 완료.**

- **[RESOLVED] q1 — 실제 동시 사용자/트래픽 규모는? (무료 티어 500K cmd/월 충분성 최종 판정)**
  - 결정: **무료 티어로 시작**(개인/소규모, 앱 비밀번호 게이트로 접근 제한된 소수). L1 메모리 캐시가 store GET 대부분을 흡수하므로 한도 여유 큼. 초과 신호(429/한도 경고) 관찰 시 유료 검토 — 본 PRD 비범위. (§3.7·§4·§6 반영)

- **[RESOLVED] q2 — Upstash 자동 주입 env 변수명 규약?** (`KV_REST_API_URL`/`KV_REST_API_TOKEN` vs `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`)
  - 결정: **방법 A — 명시 생성**(`new Redis({ url: KV_REST_API_URL ?? UPSTASH_REDIS_REST_URL, token: KV_REST_API_TOKEN ?? UPSTASH_REDIS_REST_TOKEN })`)으로 두 네이밍 모두 흡수. `Redis.fromEnv()` 의 변수명 가정에 묶이지 않아 통합 버전 변동에 강함. 실제 주입 변수명은 연결 후 Vercel env 목록에서 확정해 `.env.local.example` 에 반영. (§3.5·AC-7 반영)

- **[RESOLVED] q3 — 락 미획득·폴링 끝까지 토큰 못 받을 때 fallback 정책?** (직접 발급 허용 vs 에러)
  - 결정: **직접 발급 fallback 허용**(가용성 우선). 드물게 중복 발급 1회는 KIS 제한에 치명적이지 않고(락은 "줄이기" 목표), 토큰을 못 받아 앱이 막히는 것보다 낫다. fail-soft(G3) 와 일관. (§3.2·§3.4·AC-3 반영)

- **[RESOLVED] q4 — 지수 공유 캐시 TTL 30s 적정성?** (헤더 티커 갱신 주기 vs 신선도)
  - 결정: **국내 store TTL 30s 확정**(`queryConfig.market.indices.staleTime`·ticker 국내분·`market-indices-consolidation` 정합 — **단일 진실 원천**). 해외 10분/BTC 3분은 현행 라우트 값 유지(store 캐시 미적용 범위). (§3.3·AC-5 반영)

- **[RESOLVED] q5 — 락 TTL / 폴링 파라미터 + 리전(Regional vs Global)?**
  - 결정: **락 TTL 10s(PX), 폴링 50ms 간격 × 최대 ~2s**. KIS 발급 제한 정확 수치 확인 전 보수적 시작, 운영 관찰 후 튜닝. 리전 = **Regional Tokyo**(`ap-northeast-1`, 서버사이드 단일 호출이라 Global 이점 미미). (§3.2·§3.4·§6·AC-3 반영)

- **[RESOLVED] q6 — 지수 캐시에도 분산 락이 필요한가?**
  - 결정: **TTL 만(분산 락 없음)**. 지수는 중복 호출돼도 데이터 동일이라 stampede 가 토큰만큼 치명적이지 않음. 중복 호출이 EGW00201(초당 제한)에 닿는 게 관찰되면 토큰과 같은 락 패턴 추가 — 후속. (§3.3 반영)

- **[RESOLVED] q7 — 지수 store 범위와 라우트 캐시 관계?** (① store 캐시를 국내만 vs 전 소스 / ② 라우트 인메모리 캐시를 store 로 승격 vs L1+L2 병행 / ③ 토큰 store 만 먼저, 지수 store 는 후속 분리)
  - 결정: **① 우선 국내(`0001`/`1001`)부터**(중복이 가장 잦은 코스피/코스닥), **② L1 라우트 인메모리 + L2 store 병행**(토큰 2단 캐시와 동일 패턴, store 장애 시 fail-soft 정합), **③ 본 PRD 에 함께 포함**(같은 store 인프라) — **단, token store 가 본 트랙 핵심이므로 구현 중 PR 라인이 과대해지면 지수 store 를 후속 PRD 로 분리**. (§3.3·§3.6·§8·AC-5 반영)

- **[RESOLVED] q8 — appKey 해싱 방식?** (키 노출/로깅 안전)
  - 결정: **SHA-256 hex 앞 16자**(`crypto.createHash('sha256').update(appKey).digest('hex').slice(0,16)`). 충돌 확률 무시 가능 + 키 길이 단축 + 평문 노출 0. 같은 appKey → 같은 해시(키 안정성) 보장. (§3.5·AC-4 반영)

---

## 10. 다음 단계 (참고 — 최종 PR 본문에서 다룸)

- **구현(frontend-dev)**: 외부 의존 `@upstash/redis` 1건 추가. **UI 없음** — UX/UI 디자이너 불요. 커밋 분할 §8 권고 따름(store 추상화 → 토큰 2단 캐시/분산 락 → 지수 store(부수, 분리 가능) → env 문서).
- **프로비저닝(사용자 작업)**: 구현 머지 후 안내. Vercel Marketplace 에서 Upstash Redis(무료 티어·Regional Tokyo) 연결 + env 주입. 미설정 머지여도 `memory` 폴백으로 정상(G3·G4).

---

산출물: docs/prd/kis-token-store.md | UI: no | OPEN QUESTION: 8건 전부 RESOLVED (2026-05-30 결정 반영)
