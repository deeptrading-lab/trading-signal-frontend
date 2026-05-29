# QA 리포트 — watchlist-partial-render (PR #45)

> 대상: PR #45 `fix/watchlist-partial-render` — (A) 부분실패 종목 누락 방지 fix + (B) UI 점검 13항목 일괄 적용
> 환경: branch `fix/watchlist-partial-render`, `.env.local` **KIS_ENV=prod** (실 KIS 키), dev `:3300`, BFF `/api/watchlist`
> 일자: 2026-05-30
> 판정: **PASS** (통과 23 / 전체 23, 비차단 관찰 1건) — **localStorage 마이그레이션 SAFE**

---

## 0. 공통 AC

| AC | 기대 | 명령 | 실측 |
|----|------|------|------|
| typecheck 0 | clean | `npm run typecheck` | PASS (`tsc --noEmit` 출력 없음) |
| lint 0 | clean | `npm run lint` | PASS (`eslint .` 출력 없음) |
| build 0 | clean | `npm run build` | PASS (전 라우트 빌드, `/watchlist` ○ static) |
| test 0 fail | 전부 통과 | `npm test` | PASS — **76 passed (16 files)**. watchlist route 11 + store 6 + search 2 포함 |
| BFF 무회귀 | route fallback 외 0건 | `git grep -nE "http://127\.0\.0\.1" -- app/` | PASS — `whitelist/search`·`workbench/_adapters/fastapi.ts`(FastAPI fallback)만, watchlist 0건 |
| 한글 톤 | 사용자 카피 영문 평문 0 | `git grep -nE "[A-Za-z]{4,}" -- lib/copy/watchlist/labels.ts` | PASS — 평문 영문 없음 |
| 신규 토큰 0 | components.css/globals.css 토큰 정의 변경 0 | `git diff 6f514e0..675c5a5 -- app/components.css app/globals.css` | PASS — diff 0줄 |
| 데드코드 제거 | `ASSET_TYPE_*` 0건 | `git grep -n "ASSET_TYPE_STOCK\|ASSET_TYPE_CRYPTO"` | PASS — 0건 |

---

## 1. (A) 부분실패 fix — AC 별 표

### A-1. 좌조인 렌더 — 담은 종목 수 = 화면 행 수 (누락 0)

- 절차: `WatchlistTable` 이 `quotes` 가 아니라 `tickers` 를 map 하여 행 생성 (`WatchlistTable.tsx:95` `tickers.map(...)`), `quoteByTicker.get(ticker)` 매칭 실패 시 `quote=undefined` → 디그레이드 행.
- 실측: 코드 검증 + 라이브 재현(아래 A-3)에서 BFF 가 1~2종만 반환해도 행은 항상 tickers 기준(3행) → drop 종목이 디그레이드 행으로 남음. **누락 0 확인 PASS**.

### A-2. 디그레이드 행 — 종목명 표시 + 재시도 동작

- 절차: `quote` 없을 때 `fallbackName`(store name → `getSymbolName` 시드 fallback)으로 "NAVER" + 보조 `005930` 표시(`WatchlistRow.tsx:62-94`). 재시도 버튼 `onRetry`=`query.refetch()`(`WatchlistContainer.tsx:105`).
- 실측: `getSymbolName` 시드 역참조 — `005930→삼성전자 / 000660→SK하이닉스 / 035420→NAVER / 999999→null`. 시드 3종 모두 종목명 식별. 디그레이드 행에 `/profile` 라우팅 없음(`router.push` 는 quote-present 분기에만 존재, `WatchlistRow.tsx:120/124`). **PASS**.

### A-3. 데이터계층 — 동시성/재시도/헤더/순서/전부실패 (라이브 + 단위)

라이브 round-trip (시드 3종, dev `:3300`, KIS prod):
```
호출1: count=2 order=[005930,000660] failed=[035420]
호출2: count=1 order=[035420]        failed=[005930,000660]
호출3: count=undefined(전부실패)      failed=[ ]
호출4: count=2 order=[005930,000660] failed=[035420]
호출5: count=1 order=[005930]        failed=[000660,035420]
```
- 부분실패 라이브 재현 ✔, 호출별 drop 대상 상이(rate-limit timing) ✔, `X-Watchlist-Failed` 헤더로 drop ticker 노출 ✔, 성공분 **종목 순서 보존**(005930,000660 순) ✔.
- 동시성 2 제한: route.test `#7` PASS (동시 in-flight 시세 콜이 풀 크기 초과 안 함).
- transient(rate-limit `EGW00201`/network) 1회 재시도: route.test `#8` PASS / 비즈니스 에러 비재시도: route.test `#9` PASS (1회 호출).
- 전부실패 한글 에러: route.test `#5` PASS (`prod 전부 시세 실패 → 502 + 한글 fallback`).
- `X-Watchlist-Failed` 순서 보존: route.test `#10` PASS (성공 `[005930,035420]`, failed `000660`).

빈 입력: `?tickers=` → 200 + `[]` + `X-Data-Source: mock` ✔. `/watchlist` 페이지 HTTP 200 ✔.

---

## 2. (B) UI 개선 + 호환성

### B-1. ⚠️ localStorage 마이그레이션 (BLOCKING 후보) — **SAFE**

실제 `lib/api/watchlist/store.ts` 모듈을 `tsx` 로 import, 옛 사용자 localStorage 시나리오 직접 read:
```
CASE1 옛 string[3] ["005930","000660","035420"]
  → [{ticker:"005930"},{ticker:"000660"},{ticker:"035420"}]  PASS(유실0, 3/3)
CASE2 혼합 ["005930", {ticker,name}]
  → string→{ticker} / 객체 유지                              PASS
CASE3 깨진 JSON "[\"005930\", broken"
  → [] (크래시 없음)                                          PASS
CASE4 더러운 배열 ["005930", null, 42, {ticker}]
  → 유효분만 [{005930},{035420}]                              PASS
```
- 구버전 `string[]` → `{ ticker }` 자동 마이그레이션, **관심목록 유실 0 · 앱 크래시 0**.
- 옛 사용자는 `stored.length > 0` 이므로 훅의 시드 분기(`stored.length===0 && !hasSeeded()`)에 **미진입** → 기존 목록 덮어쓰기/유실 위험 없음(`useWatchlistTickers.ts:57-68`).
- 마이그레이션 엔트리는 `name` 미보유 → 디그레이드 행은 `getSymbolName` 시드 fallback 으로 종목명 표시(시드 3종 커버).
- 단위 테스트: store.test 6건 PASS(마이그레이션·혼합·깨진 JSON·SSR no-op 포함).
- **판정: 마이그레이션 SAFE — blocking 해소.**

### B-2. 모달 a11y — focus trap / ESC / 복귀 포커스 / 배경 inert / listbox

- 포털(body 직속) 마운트로 inert 가 모달 자신을 가리지 않게 분리(`WatchlistAddModal.tsx:64-71,114-129`). ✔
- focus trap: 패널 `onPanelKeyDown` Tab 순환(first↔last, `:not([disabled])` 제외)(`:154-169`). ✔
- ESC 닫기(`:131-138`), 트리거 복귀 포커스(`:108-112` cleanup `prevActive.focus()`). ✔
- 배경 inert: 오픈 시 포털 제외 body 직속 형제 `aria-hidden="true"`, close 시 복원(`:116-129`). ✔
- listbox 키보드: 입력칸 ↑/↓/Enter + `aria-activedescendant`, 활성 항목 `search-result-item-focus(-meta)` 토큰(`:172-190,229-233,288-306`). ✔ (코드 검증 PASS)

### B-3. 검색 — 디바운스 / 빈결과 / 6자리 직접 추가

- 디바운스 200ms(`DEBOUNCE_MS`, 입력 value 즉시 / 쿼리 debounced, `:73-79`). ✔
- 빈결과 카피: "대표 종목 위주로만 검색돼요. 6자리 종목코드로도 추가할 수 있어요."(한글). ✔
- 6자리 직접 추가: `isRawTicker = /^\d{6}$/`, 시드 미수록(`searchSymbols("123456")→[]`) 시 raw-add 버튼/Enter 경로(`:84-86,148-151,173-176,255-267`). ✔

### B-4. 접근성 무회귀 (행/상태)

- 정상 행 `aria-label=${quote.name} 상세 보기`(`WatchlistRow.tsx:119`). ✔
- 에러 카드 `role="alert"`(`WatchlistContainer.tsx:80`). ✔
- 스켈레톤 컨테이너 `aria-busy` + `sr-only` 안내(`WatchlistTable.tsx:69-73`). ✔
- 삭제 버튼 `aria-label`, 행 클릭과 `stopPropagation` 분리. ✔

### B-5. 디테일 무회귀

- 데드코드 `ASSET_TYPE_*` 제거(grep 0건). ✔
- 스켈레톤 `key=sk-${i}` + `.skeleton-line(-medium/-narrow)` 토큰(`:74-91`). ✔
- `quoteByTicker` `useMemo`, `WatchlistRow` `React.memo`(`:54-57,180`). ✔
- 신규 토큰 0(공통 AC). ✔
- 디그레이드 행 컬럼 헤더(4/3/3/2) 정합: 이름 col-span-4 / 안내+재시도 col-span-6 / 삭제 col-span-2(`:69-105`). ✔

### B-6. 시드/회귀

- 시드 3종(삼성전자/SK하이닉스/NAVER), 재시드 금지(`hasSeeded` 플래그) — store.test `#4` PASS. ✔
- 추가(중복/cap 30 가드)·삭제·빈 상태 CTA — 코드 검증 + 빈 입력 라이브 200/[]. ✔

---

## 3. 에지 케이스

| 케이스 | 기대 | 실측 |
|--------|------|------|
| 깨진 localStorage JSON | 빈 배열, 크래시 0 | PASS (CASE3) |
| dirty 배열(null/number) | 유효분만 | PASS (CASE4) |
| 옛 `string[]` 마이그레이션 | 유실 0 | PASS (CASE1) |
| 빈 tickers BFF | 200 + [] | PASS |
| 전부실패 BFF | 5xx → ErrorCard | PASS (UI 정적 한글 카피) |
| StrictMode 더블 마운트 | 포털/inert effect cleanup 정상 | 코드상 effect cleanup(포털 removeChild·aria-hidden 복원) 존재, dev 로그 하이드레이션/런타임 에러 0 |
| SSR hydration | 초기 빈 배열 → mount 동기화 | dev 로그 hydration mismatch 0 |

---

## 4. 비차단 관찰 (Non-blocking, 머지 무방)

**[OBS-1] 전부실패가 KIS transport 5xx 일 때 BFF 응답 status/메시지**

- 현상: 라이브에서 시드 3종이 전부 KIS HTTP 500(transport)으로 실패하면 BFF 가 **HTTP 500** + 본문 `{"error":"Request failed with status code 500"}`(영문 axios 메시지)를 반환. route.ts `mapErrorToResponse` 가 `failed[0].reason`(ApiError kind=server, status 500)의 `isApiError` 분기를 타면서 `error.message`(원본 axios 문자열)와 `error.status`(500)를 그대로 통과시킴.
- 본 PR 도입 차이: #44 는 전부실패를 항상 `__ALL_FAILED__`(한글 `FALLBACK_SERVER_MESSAGE`, 502)로 처리. 본 PR 이 `failed[0]?.reason ?? __ALL_FAILED__` 로 바꿔, 전부실패 사유가 ApiError 면 그 메시지/status 가 노출됨.
- **사용자 영향 없음 → 비차단**: `/watchlist` ErrorCard 는 BFF 본문 메시지를 렌더하지 않고 **정적 한글 카피**(`WATCHLIST_ERROR_TITLE`/`WATCHLIST_ERROR_HINT`)만 표시(`WatchlistContainer.tsx:83-88`). 500/502 모두 `query.isError` → 동일 ErrorCard. 영문 메시지는 네트워크 탭/응답 본문에만 존재(사용자 비노출). 한글 톤 AC(사용자 노출 기준) 위반 아님. route.test #5(`__ALL_FAILED__` 경로)도 한글 fallback PASS.
- 후속 권고(선택, 본 PR 차단 아님): 전부실패 BFF 응답을 항상 한글 fallback + 502 로 정규화하면 응답 본문 톤도 일관. 또는 `lib/api/kis/price.ts` catch 가 원본 axios `error.message` 대신 한글 fallback 을 쓰도록(데이터계층, 별도 slug).

**[OBS-2] `WATCHLIST_ROW_RETRYING` 미사용 라벨** — 디그레이드 행 재시도 sr-only aria-live 미연결. 신규 정의 상수라 회귀 아님, 사용자 영향 없음(저순위).

---

## 5. 판정

- 공통 AC 8/8 · (A) fix 3/3 · (B) UI 12/12 — **통과 23 / 전체 23**.
- **localStorage 마이그레이션: SAFE** (유실 0 / 크래시 0 / 재시드 위험 0).
- 비차단 관찰 1건(OBS-1, 사용자 비노출 영문 메시지 — 머지 무방).
- `## 다음 작업` 섹션 존재 확인 → 라벨 게이트 충족.

**PASS** — `impl-ready` → `qa-passed`.
