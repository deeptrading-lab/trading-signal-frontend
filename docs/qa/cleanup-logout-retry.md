# QA 리포트 — cleanup-logout-retry

- **대상 PR**: #88 `fix(cleanup): logout 버튼 동작 연결 + watchlist 이중재시도 제거`
- **브랜치**: `feature/cleanup-logout-retry` (`a131d99`)
- **PRD**: 없음 (cleanup 배치 — 변경 의도에서 AC 직접 도출).
- **성격**: 2건 — (1) 죽은 logout 버튼 동작 연결, (2) watchlist RQ 이중 재시도 제거(`retry:1→0`). 시각·동작 표면 무변경 지향.
- **QA 일시**: 2026-06-01
- **판정**: **qa-passed** (실패 0건)
- **검증 환경**: BE down(`127.0.0.1:8000` /health=000=ECONNREFUSED), 게이트 비활성(`.env.local` APP_PASSWORD 미설정). 로그아웃 **클릭→이동** 실제 브라우저 흐름은 게이트+세션 의존이라 불가 → 코드 정적 검증 + 라우트 라이브 호출 + `/profile` SSR 렌더로 판정.

---

## 0. 변경 범위 (diff stat, main..HEAD)

```
 components/profile/LogoutMenuButton.tsx | 33 +  (신규)
 components/profile/SettingsMenuCard.tsx |  4 +- (danger 항목 → LogoutMenuButton 교체)
 hooks/auth/useLogout.ts                 | 37 +  (신규)
 hooks/watchlist/useQueryWatchlist.ts    |  5 +- (retry:1→0)
 lib/api/auth/logout.ts                  | 17 +  (신규)
 5 files changed, 94 insertions(+), 2 deletions(-)
```

신규 4 + 변경 2. 단일 커밋 `a131d99`.

---

## 1. AC 별 재현·기대·실측

변경 의도에서 도출한 AC. 검증 명령을 QA 가 직접 재실행해 첨부.

| AC | 항목 | 재현 절차 | 기대 | 실측 | 결과 |
|---|---|---|---|---|---|
| AC-1 | **logout 어댑터 BFF 정합** | `logout.ts` 본문 + `git grep fetch(` | `httpClient.post("/auth/logout")` (axios baseURL `/api`), fetch 직접호출 0 | `logout()` = `httpClient.post<LogoutResponse>("/auth/logout")`. login.ts 패턴 동일. 변경 3파일 fetch 0건 | ✅ |
| AC-2 | **useLogout — 쿠키삭제→/login full nav** | `useLogout.ts` 본문 | 성공/실패 무관 `window.location.assign("/login")`(SPA push 아님), isPending 중복클릭 가드 | `submit`: `isPending` 가드 → `setIsPending(true)` → `logout().catch(noop).finally(()=>window.location.assign("/login"))`. useLogin 성공이동(`window.location.assign`)과 정합 — 서버가 쿠키 재검증 | ✅ |
| AC-3 | **client/server 경계** | 각 파일 `"use client"` 지시자 + SettingsMenuCard 헤더 | useLogout·LogoutMenuButton = client / SettingsMenuCard = server 유지, 서버 컴포넌트가 client 자식 렌더 | `useLogout.ts` L11 `"use client"`, `LogoutMenuButton.tsx` L8 `"use client"`. `SettingsMenuCard.tsx` 지시자 없음(server). 서버 카드가 `<LogoutMenuButton/>` 렌더 — 정상 RSC 경계 | ✅ |
| AC-4 | **시각 무변경 (resting)** | LogoutMenuButton vs SettingsMenuCard MenuButton(danger) className 대조 | 아이콘 `h-5 w-5 text-critical aria-hidden`, 라벨 `text-body-strong text-critical`, 버튼 `w-full flex items-center gap-md p-md rounded-md text-left transition-colors` + `text-critical hover:bg-critical-soft` | resting state 토큰 전부 동일. pending 시에만 `opacity-[0.65] cursor-not-allowed` 조건 추가(기존엔 없던 상태지만 비활성 시각 피드백, 신규 표면 아님) | ✅ |
| AC-5 | **기존 default 4항목 무영향** | SettingsMenuCard L60~64 | 알림/보안/결제/다크모드 = MenuButton 유지 | `defaults = items.filter(variant!=="danger")` → 그대로 `<MenuButton/>`. danger 1건만 분리 | ✅ |
| AC-6 | **watchlist retry:0** | `useQueryWatchlist.ts` L47 | `retry: 0`, 다른 설정(staleTime/gcTime/placeholderData/refetchOnWindowFocus) 무변경 | `retry: 0` + 주석. 그 외 옵션 동일. 다른 훅 retry 설정 무영향(변경 파일 단일) | ✅ |
| AC-7 | **typecheck 0** | `npx tsc --noEmit` | exit 0 | exit 0, 출력 없음 | ✅ |
| AC-8 | **lint clean (신규4+변경2)** | `npx eslint <6파일>` | exit 0 | exit 0, 경고 0 | ✅ |
| AC-9 | **build 0** | `npm run build` | exit 0 | exit 0, `✓ Compiled successfully in 1961ms`, `/profile` ○(static) 포함 라우트 테이블 정상 | ✅ |
| AC-10 | **전체 테스트 그린** | `npx vitest run` | 189 그린 | **30 files / 189 passed**. watchlist route 11·auth login route 6 포함 무회귀 | ✅ |

---

## 2. 공통 AC (AGENTS.md / frontend.md)

| 항목 | 명령 | 결과 |
|---|---|---|
| BFF 무회귀 | `git grep -nE "http://127\.0\.0\.1" -- app/` (route handler fallback 제외) | route handler fallback 2건만(`workbench/_adapters/fastapi.ts` `FASTAPI_BASE_URL ?? "http://127.0.0.1:8000"`) = 문서화된 예외. 변경 표면 0건 ✅ |
| fetch 직접호출 | `grep fetch( <변경 client/adapter 3파일>` | 0건 (httpClient 경유) ✅ |
| 한글 톤 | LogoutMenuButton 사용자노출 문구 | 하드코딩 0. 라벨은 `MENU_LOGOUT="로그아웃"` copy 상수 경유 ✅ |
| hex/px 직타 | `grep -E "#hex\|[Npx]"` LogoutMenuButton | 0건 (토큰 클래스만; `opacity-[0.65]`=비율 arbitrary, px 아님) ✅ |
| 접근성 | aria/버튼 타입 점검 | `type="button"`(submit 아님), `disabled={isPending}`, 장식 아이콘 `aria-hidden="true"`, 가시 한글 라벨이 접근가능 이름 제공 ✅ |

---

## 3. 라운드트립 — 라이브 검증 (dev 서버 + 라우트 호출)

dev 서버 본인 기동(`/tmp/dev.log`, `✓ Ready in 244ms`) → 검증 후 종료(`pkill next dev` → `/profile`=000 확인).

### (s1) `/profile` SSR 200 + 로그아웃 버튼 노출
```
GET /profile → 200 (next.js 50ms, proxy.ts 76ms, app 188ms)
HTML grep: 로그아웃 ×1, text-critical ×3 (LogOut 아이콘+라벨+버튼색)
```
→ 게이트 비활성이라 `/profile` 통과, 로그아웃 항목이 critical 톤으로 렌더됨. ✅

### (s2) `POST /api/auth/logout` 라이브 — 미인증 통과 + 쿠키 삭제
```
$ curl -i -X POST http://127.0.0.1:3000/api/auth/logout
HTTP/1.1 200 OK
cache-control: no-store
set-cookie: app_auth=; Path=/; Max-Age=0; HttpOnly; SameSite=lax
{"ok":true}
```
→ proxy `/api/auth/*` 예외라 미인증에서도 통과. `Max-Age=0` 으로 세션쿠키 즉시 삭제, 본문 `{ok:true}`. useLogout 의 `logout()` 호출 대상 라우트가 의도대로 동작. ✅

### (s3) logout 클릭→이동 흐름 (정적 검증 — 게이트+세션 의존이라 브라우저 자동화 불가)
코드 경로: `LogoutMenuButton.onClick=submit` → `useLogout.submit` → `logout()`(s2 라우트, 쿠키삭제) → `.finally` 무조건 `window.location.assign("/login")`. full navigation 이라 서버(proxy 게이트)가 삭제된 쿠키를 즉시 재검증. 실패해도 `/login` 으로 보냄(catch noop). isPending 가드로 중복 클릭 시 2번째 호출 무시. → **흐름 정합 확인(정적)**. ✅

### (s4) watchlist `retry:0` 회귀 — BFF degrade 자립
```
$ curl -i "http://127.0.0.1:3000/api/watchlist?tickers=AAPL"
HTTP/1.1 200 OK
x-data-source: kis | x-kis-env: prod
[{"ticker":"AAPL","name":"AAPL","price":0,...,"direction":"flat",...}]   ← 비어있지 않은 행
$ curl ".../api/watchlist?tickers=  (빈입력)" → 200 [] x-data-source:mock  (빈입력 경로)
```
→ BFF route 가 `withRetry`(transient 1회) + mock/mock-timeout graceful degrade 를 자체 수행해 항상 200 + 데이터(또는 명시적 한글 X-Error)로 응답. 클라이언트로 unhandled throw 가 가지 않으므로 RQ `retry:0` 가 빈 화면을 만들지 않음. 이중 재시도(RQ retry + BFF withRetry) 제거로 EGW00201 시 KIS 일괄콜 최대 4회 증폭 차단. ✅
> 주: route 의 transient 재시도(`withRetry`)는 그대로 유지 — 제거된 건 RQ 레이어 중복분뿐. 정상.

---

## 4. 에지 케이스

| 케이스 | 분석 | 결과 |
|---|---|---|
| **BE 다운 (ECONNREFUSED)** | logout 라우트는 BE 무관(쿠키만 조작) → s2 에서 BE down 상태로도 200 정상. watchlist 는 BFF degrade 로 mock/한글 X-Error 응답 | ✅ 무영향 |
| **logout 응답 실패/malformed** | useLogout 가 `.catch(noop)` 후 `.finally` 로 무조건 `/login` 이동 — 응답 본문 파싱 의존 없음(success/fail 분기 없음) | ✅ 안전 |
| **중복 클릭 (더블 탭)** | `if (isPending) return` 가드 + `disabled={isPending}` — 2번째 클릭 시 logout 재호출 안 됨 | ✅ 가드됨 |
| **StrictMode 더블 마운트** | useLogout 는 effect 없이 useState/useCallback 만 — 마운트 부작용 0. 더블 마운트 무해 | ✅ |
| **navigation 레이스** | `window.location.assign` 은 finally 단일 호출. logout 성공이 늦어도 isPending 가드로 그 사이 추가 호출 차단 | ✅ |

---

## 5. DESIGN.md 토큰 라이브 동기화

해당 없음 — 본 PR 은 신규 토큰/스타일 도입 0(기존 danger MenuButton 토큰 재사용, hex/px 직타 0). `design:sync` 영향 표면 없음.

---

## 6. 판정

- AC 10건 + 공통 5건 + 라운드트립 4건 + 에지 5건 **전부 통과, 실패 0건**.
- typecheck/lint/build exit 0, vitest 189 그린(watchlist route 11·login route 6 무회귀).
- logout: 라우트 라이브 호출로 쿠키 `Max-Age=0` 삭제 + 미인증 통과 확인, 클릭→이동 흐름은 정적 검증(게이트+세션 의존으로 브라우저 자동화 불가 — 본 리포트에 "정적 검증" 명기).
- watchlist `retry:0`: BFF degrade 자립으로 빈 화면 회귀 없음 확인.
- **판정: qa-passed**.

---

## 산출물

- `docs/qa/cleanup-logout-retry.md` (본 리포트)
