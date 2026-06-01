# QA — bff-utils-cleanup (PR #83)

- **브랜치**: `feature/bff-utils-cleanup`
- **PR**: #83 `refactor(bff): route 공통 유틸 bffUtils 추출 + 죽은 라우트 제거 (Wave 1)`
- **트랙**: PRD 없는 리팩터 (Phase 3 순서 계획 Wave 1). 변경 의도에서 AC 직접 도출.
- **성격**: behavior-preserving 리팩터 — 응답/동작 무변경이 핵심. 라이브 라운드트립은 BE 의존이라 **정적 검증 + 기존 route 테스트**로 판정 (해당 절에 "정적 검증" 명시).
- **판정**: **qa-passed** (실패 0건)
- **검증 일시**: 2026-06-01

---

## 도출 AC

리팩터 의도 = (1) 중복 헬퍼 단일화, (2) 동작 100% 보존, (3) 의도적 미추출 항목 로컬 유지, (4) 죽은 라우트 완전 제거, (5) 빌드/타입/린트/테스트 그린. 아래로 분해.

| ID | Acceptance Criterion |
|---|---|
| AC-1 | `lib/server/bffUtils.ts` 가 `withTimeout`·`delay`·`jsonWithDataSource`·`BFF_TIMEOUT_SENTINEL` 를 기존과 동일 구현으로 export |
| AC-2 | 9개 route 가 로컬 헬퍼 정의를 삭제하고 bffUtils import 로 교체. route 내 로컬 중복 정의 0건 |
| AC-3 | 타임아웃 분기 무회귀: `BFF_TIMEOUT_SENTINEL === "__BFF_TIMEOUT__"` 이며 각 route 의 `mapErrorToResponse` 타임아웃 매칭이 여전히 동작 |
| AC-4 | 도메인 문구 보존: disclosure 계열 "OpenDART 서버…", KIS 계열 "KIS 서버…" 가 공용으로 뭉개지지 않고 각 route 로컬 유지 |
| AC-5 | 의도적 미추출 보존: chart 의 `jsonOk`·`toYyyymmdd`·`addDays`·`mapErrorToResponse`·`FALLBACK_TIMEOUT_MESSAGE` 가 로컬 유지 |
| AC-6 | 죽은 라우트 완전 제거: `app/api/stock/search/route.ts` + `lib/mock/stock/search.ts` 삭제, dangling 참조 0건 |
| AC-7 | `StockSearchResult` 타입은 제거 대상 아님 — 사용처(kis/types·kis/search·useQueryStockSearch)에서 생존 |
| AC-8 | `npx tsc --noEmit` exit 0 (빌드 후 기준) |
| AC-9 | 변경 파일 eslint clean |
| AC-10 | `npm run build` exit 0 |
| AC-11 | 기존 route 테스트 그린. 특히 auth/login `~500ms 지연 후 401` 이 import 된 `delay` 로 통과 |
| AC-12 | BFF 원칙 무회귀 (`app/` 내 직접 `127.0.0.1` 호출 — route handler fallback 제외 0건) |

---

## AC별 재현·기대·실측

| ID | 재현 절차 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| AC-1 | `Read lib/server/bffUtils.ts` 후 main 의 ticker/route.ts 원본 구현과 줄별 대조 | 4개 심볼 export, 구현이 원본과 동일(타이머 finally 정리, sentinel reject, no-store 헤더) | export 4개 확인. `withTimeout`/`delay`/`jsonWithDataSource` 본문이 원본과 문자 단위 동일. `BFF_TIMEOUT_SENTINEL = "__BFF_TIMEOUT__"` | ✅ |
| AC-2 | `git grep -nE "^(async )?function (withTimeout\|jsonWithDataSource\|delay)\b" -- app/api/` | route 내 로컬 정의 0건 | `0건 local defs (clean)` | ✅ |
| AC-3 | `git grep -nE '"__BFF_TIMEOUT__"' -- app/ lib/server/` + 각 route diff 의 `=== BFF_TIMEOUT_SENTINEL` 치환 확인 | 리터럴은 sentinel 정의(1곳)만, route 비교는 상수로 교체 | 리터럴 단 1건 = `lib/server/bffUtils.ts:12` (정의). ticker·chart·price·daily·disclosure(list/company)·indices·watchlist 의 `=== BFF_TIMEOUT_SENTINEL` 치환 diff 확인. 상수값이 리터럴과 동일하므로 런타임 매칭 불변 | ✅ |
| AC-4 | `git grep -nE "OpenDART 서버\|KIS 서버" -- app/` | disclosure→OpenDART, stock/market/watchlist→KIS 문구 로컬 유지 | disclosure/company·list = "OpenDART 서버…"(각 2건). indices·chart·daily·price·watchlist = "KIS 서버…". 공용 뭉갬 0 | ✅ |
| AC-5 | `git grep -nE "function jsonOk\|function toYyyymmdd\|function addDays\|function mapErrorToResponse\|FALLBACK_TIMEOUT_MESSAGE" -- app/api/stock/chart/route.ts` | 5개 모두 chart 로컬 잔존 | `toYyyymmdd`(37)·`addDays`(44)·`jsonOk`(129)·`mapErrorToResponse`(140) + `FALLBACK_TIMEOUT_MESSAGE`(35) 모두 잔존 | ✅ |
| AC-6 | `ls app/api/stock/search` / `ls lib/mock/stock/search.ts` + `git grep -nE "api/stock/search\|getMockStockSearch\|mock/stock/search"` (docs 제외) + build route 매니페스트 | 파일 삭제, 코드 dangling 참조 0건 | 두 파일 `DELETED`. build 매니페스트에 `/api/stock/search` 부재. 코드 참조는 `hooks/stock/useQueryStockSearch.ts:12` **주석 1건**뿐 — "BFF(`/api/stock/search`) 왕복 제거" 라는 이력 설명 주석(live 호출 아님). `getMockStockSearch`/`mock/stock/search` import 0건 | ✅ |
| AC-7 | `git grep -nE "StockSearchResult" -- ':!docs/'` | 타입 생존 | `kis/types.ts:147`(정의)·`kis/index.ts:52`(re-export)·`kis/search.ts`(3건)·`useQueryStockSearch.ts`(2건) 생존 | ✅ |
| AC-8 | `npm run build` 후 `npx tsc --noEmit` | exit 0 | `tsc exit: 0` (출력 0줄) | ✅ |
| AC-9 | `npx eslint` 변경 10파일 (bffUtils + 9 route) | clean | `eslint exit: 0` | ✅ |
| AC-10 | `npm run build` | exit 0, 전 route 컴파일 | 빌드 성공, route 매니페스트 정상(`/api/stock/search` 제외) | ✅ |
| AC-11 | `npx vitest run` | 전 그린, login 지연 테스트 통과 | `Test Files 30 passed (30) / Tests 189 passed (189)`. `[AC-19] 오답 → ~500ms 지연 후 401` = **502ms** 실측 통과(import 된 `delay` 사용). ticker route 8 tests(타임아웃→mock-timeout 경로 포함) 그린 | ✅ |
| AC-12 | `git grep -nE "http://127\.0\.0\.1" -- app/` | route handler fallback만 | hit 3건 = `whitelist/search/route.ts:11`(FASTAPI_BASE_URL fallback), `workbench/_adapters/fastapi.ts`(주석+fallback). 모두 route handler 측 env fallback(면제 대상), 본 PR 미변경 | ✅ |

---

## 헬퍼 동작 동일성 정밀 대조 (무회귀 핵심)

diff 의 `-` 블록(원본 route 로컬 구현)과 `lib/server/bffUtils.ts` 의 `+` 본문을 줄별 대조:

- **`withTimeout`**: `let timer` → `setTimeout(reject(new Error(SENTINEL)), ms)` → `Promise.race` → `finally clearTimeout`. **원본과 문자 단위 동일.** sentinel 값이 리터럴 `"__BFF_TIMEOUT__"` 과 동일하므로 race reject 메시지 불변 → 각 route 의 `error.message === BFF_TIMEOUT_SENTINEL` 분기가 기존 `=== "__BFF_TIMEOUT__"` 과 100% 동치.
- **`delay`**: `new Promise(resolve => setTimeout(resolve, ms))`. login·ticker·watchlist 원본과 동일. (login 테스트 502ms 실측이 라이브 증거.)
- **`jsonWithDataSource`**: status 200 + `X-Data-Source`/`Cache-Control: no-store` + extraHeaders 스프레드. 원본과 동일. (단일화로 `source` 타입이 route별 리터럴 유니온 → `string` 으로 넓어졌으나 호출부 인자 불변, 응답 헤더 동작 무변경. 타입 안정성은 reviewer 영역.)

---

## 에지 케이스

| 케이스 | 검증 방법 | 결과 |
|---|---|---|
| 타임아웃 sentinel 불일치 회귀 | sentinel 상수값 vs 9 route 비교문 대조 | 값 동일("__BFF_TIMEOUT__") → 불일치 위험 0. ticker route 테스트가 mock-timeout 헤더 경로 실측 통과 |
| 도메인 문구 공용 뭉갬 | OpenDART/KIS grep | 분리 유지 — 공용화 안 됨 |
| 죽은 라우트 dangling import (런타임 깨짐) | grep + build | live 참조 0(주석 1건만), build 성공 |
| 타입 과삭제(`StockSearchResult` 동반 제거) | grep | 타입 생존, tsc 0 |
| `NextResponse` import 잔존(미사용 import 린트) | ticker diff (`-import { NextResponse }`) + eslint | ticker 에서 직접 NextResponse 사용 사라져 import 제거됨, eslint clean(no-unused-vars 무경고) |
| StrictMode/번들 영향 | route handler 전용 변경 — 클라 번들·렌더 무관 | 해당 없음 |
| 타이머 누수 | `withTimeout` finally clearTimeout 보존 | 원본과 동일 |

---

## 라이브 라운드트립

본 PR 은 route handler 계층 **behavior-preserving 리팩터**로, 사용자 노출 동작 변경이 없다. 라이브 BE(`127.0.0.1:8000`) 의존 시나리오는 환경 제약상 수행하지 않고, 대신 **route 핸들러를 in-process 로 부팅해 응답을 검증하는 기존 route 테스트**(`app/api/{auth/login,market/indices,market/ticker,watchlist}/__tests__/route.test.ts`)로 대체한다 — **정적 검증**.

- auth/login: 오답 → 502ms 후 401(import delay) + 본문에 비밀번호 미포함. **통과**
- market/ticker: KIS 모킹/타임아웃 → `X-Data-Source` (kis/mixed/mock/mock-timeout) 분기. 8 tests **통과**
- market/indices: 8 tests **통과**
- watchlist: 11 tests(soft-cap·rate-limit·timeout fallback) **통과**

---

## 공통 게이트

| 항목 | 결과 |
|---|---|
| typecheck (tsc --noEmit, 빌드 후) | exit 0 |
| lint (변경 10파일) | exit 0 |
| build (`npm run build`) | exit 0 |
| test (`vitest run`) | 30 files / 189 tests 그린 |
| BFF 원칙 (`app/` 직접 127.0.0.1) | route handler fallback만(면제), 본 PR 미변경 — 무회귀 |
| 한글 톤 | 도메인 문구(OpenDART/KIS) 보존, 신규 사용자 노출 문구 0 — 무회귀 |
| 접근성 | route handler 전용 변경, UI 무변경 — 해당 없음 |

---

## 최종 판정

**qa-passed** — 도출 AC 12건 전부 통과, 실패 0건. 추출된 4개 헬퍼는 원본과 동작 동일(sentinel 값 동치로 타임아웃 분기 무회귀), 도메인 문구·의도적 미추출 항목 로컬 보존, 죽은 라우트 완전 제거(타입 생존), 빌드/타입/린트/테스트 전부 그린(189/189, login 지연 테스트 502ms 실측).

- `## 다음 작업` 섹션: PR 본문에 존재(Wave 2a/2b/3a/3b 후속) — 핸드오프 게이트 충족.
